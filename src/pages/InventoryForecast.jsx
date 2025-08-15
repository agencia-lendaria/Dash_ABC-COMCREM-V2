import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Search, Download, Filter, BarChart3, Target, Eye, EyeOff, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchConcremData } from '../lib/supabase';
import { calculateProductAnalysis, validateDataQuality } from '../utils/abcAnalysis';

const InventoryForecast = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showOnlyVisible, setShowOnlyVisible] = useState(true);
  const [showBestSellers, setShowBestSellers] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'totalGeral', direction: 'desc' });
  const [kitFilter, setKitFilter] = useState('all');
  const [validationFilter, setValidationFilter] = useState('all');
  const [seasonalityFilter, setSeasonalityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [correlationFilter, setCorrelationFilter] = useState('all');
  const [kitRecommendations, setKitRecommendations] = useState([]);
  const [selectedKit, setSelectedKit] = useState(null);
  const [productRecommendations, setProductRecommendations] = useState([]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Helper function for safe calculations
  const safeCalculation = (calculationFn, fallbackValue) => {
    try {
      return calculationFn();
    } catch (error) {
      console.error('Calculation error:', error);
      return fallbackValue;
    }
  };

  // Calculate percentile for auto-thresholds
  const calculatePercentile = (values, percentile) => {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  };

  // Calculate demand variability
  const calculateDemandVariability = (salesArray) => {
    const mean = salesArray.reduce((sum, val) => sum + val, 0) / salesArray.length;
    const variance = salesArray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / salesArray.length;
    return mean > 0 ? Math.sqrt(variance) / mean : 0;
  };

  // Validate product data for suspicious patterns (NEW - MEDIUM PRIORITY)
  const validateProductData = (sku, salesArray) => {
    const issues = [];
    
    // Check for extreme spikes
    const maxSale = Math.max(...salesArray);
    const avgSale = salesArray.reduce((sum, val) => sum + val, 0) / 12;
    if (maxSale > avgSale * 20 && avgSale > 0) {
      issues.push('extreme_spike');
    }
    
    // Check for very low activity
    const activeMonths = salesArray.filter(x => x > 0).length;
    if (activeMonths <= 2) {
      issues.push('very_low_activity');
    }
    
    // Check for negative values
    if (salesArray.some(x => x < 0)) {
      issues.push('negative_sales');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      needsReview: issues.includes('extreme_spike') || issues.includes('very_low_activity')
    };
  };

  // Calculate Pearson correlation coefficient between two product sales arrays
  const calculateCorrelation = (productA, productB) => {
    const salesA = [
      productA.janeiro, productA.fevereiro, productA.março, productA.abril,
      productA.maio, productA.junho, productA.julho, productA.agosto,
      productA.setembro, productA.outubro, productA.novembro, productA.dezembro
    ];
    const salesB = [
      productB.janeiro, productB.fevereiro, productB.março, productB.abril,
      productB.maio, productB.junho, productB.julho, productB.agosto,
      productB.setembro, productB.outubro, productB.novembro, productB.dezembro
    ];

    const n = salesA.length;
    const sumA = salesA.reduce((sum, val) => sum + val, 0);
    const sumB = salesB.reduce((sum, val) => sum + val, 0);
    const sumAB = salesA.reduce((sum, val, i) => sum + val * salesB[i], 0);
    const sumA2 = salesA.reduce((sum, val) => sum + val * val, 0);
    const sumB2 = salesB.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumAB - sumA * sumB;
    const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Generate kit recommendations based on product correlations
  const generateKitRecommendations = useCallback((skuData) => {
    const recommendations = [];
    const processedPairs = new Set();

    // Only analyze top performers to reduce computation and focus on valuable kits
    const topPerformers = skuData
      .filter(sku => sku.isBestSeller || sku.curva === 'A')
      .slice(0, Math.min(30, Math.ceil(skuData.length * 0.1))); // Max 30 or 10% of products

    // Limit combinations to prevent performance issues
    const maxCombinations = 500;
    let combinationCount = 0;

    for (let i = 0; i < topPerformers.length && combinationCount < maxCombinations; i++) {
      for (let j = i + 1; j < topPerformers.length && combinationCount < maxCombinations; j++) {
        combinationCount++;
        const productA = topPerformers[i];
        const productB = topPerformers[j];
        
        const pairKey = [productA.sku, productB.sku].sort().join('|');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const correlation = calculateCorrelation(productA, productB);
        
        // Auto-calculate threshold based on statistical significance
        const minCorrelationForSignificance = 0.576; // p<0.05 for n=12 months
        if (correlation >= minCorrelationForSignificance) {
          const kitTotalSales = productA.totalGeral + productB.totalGeral;
          const kitAvgMonthly = (productA.mediaMensal + productB.mediaMensal) / 2;
          
          // Calculate recommended stock based on individual product performance and correlation
          // Use the higher performing product as base and apply correlation factor
          const higherProduct = productA.mediaMensal > productB.mediaMensal ? productA : productB;
          const lowerProduct = productA.mediaMensal > productB.mediaMensal ? productB : productA;
          
          // Recommended stock should be based on the higher performing product
          // but consider correlation to adjust for kit synergy
          const baseStock = higherProduct.mediaMensal * 2.5; // Standard recommendation
          const correlationBonus = correlation >= 0.8 ? 1.3 : correlation >= 0.7 ? 1.2 : 1.1;
          const kitRecommendedStock = Math.round(baseStock * correlationBonus);
          
          // Calculate potential impact based on correlation and individual product performance
          // Potential = (Average monthly sales of both products) * (Correlation strength) * (12 months) * (Impact multiplier)
          const impactMultiplier = correlation >= 0.8 ? 1.5 : correlation >= 0.7 ? 1.3 : 1.1;
          const potential = kitAvgMonthly * correlation * 12 * impactMultiplier;
          
          recommendations.push({
            id: `kit_${recommendations.length + 1}`,
            products: [
              { sku: productA.sku, sales: productA.totalGeral, classification: productA.curva },
              { sku: productB.sku, sales: productB.totalGeral, classification: productB.curva }
            ],
            correlation: correlation,
            totalSales: kitTotalSales,
            avgMonthlySales: kitAvgMonthly,
            recommendedStock: kitRecommendedStock,
            potential: Math.round(potential), // Potential annual impact considering correlation and monthly performance
            type: 'duo'
          });
        }
      }
    }

    // Sort by potential and return top recommendations
    const sortedRecommendations = recommendations
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 20); // Top 20 kit recommendations

    // Generate product recommendations for products that appear in multiple kits
    const productUsage = new Map();
    
    sortedRecommendations.forEach(kit => {
      kit.products.forEach(product => {
        if (!productUsage.has(product.sku)) {
          productUsage.set(product.sku, {
            sku: product.sku,
            classification: product.classification,
            totalSales: product.sales,
            kitCount: 0,
            kits: []
          });
        }
        const productData = productUsage.get(product.sku);
        productData.kitCount++;
        productData.kits.push(kit.id);
      });
    });

    // Create product recommendations for products used in multiple kits
    const productRecommendations = Array.from(productUsage.values())
      .filter(product => product.kitCount > 1)
      .sort((a, b) => b.kitCount - a.kitCount)
      .slice(0, 15); // Top 15 most used products

    return { kits: sortedRecommendations, products: productRecommendations };
  }, []);

  // Calculate safe margin based on last 6 months average
  const calculateSafeMargin = (sku, autoThreshold) => {
    const last6Months = [
      sku.julho, sku.agosto, sku.setembro, sku.outubro, sku.novembro, sku.dezembro
    ];
    const avgLast6Months = last6Months.reduce((sum, val) => sum + val, 0) / 6;
    
    // Prevent division by zero and handle edge cases (FIXED - MEDIUM PRIORITY)
    if (avgLast6Months === 0 || isNaN(avgLast6Months)) {
      return {
        avgLast6Months: 0,
        isAboveThreshold: false,
        safeMargin: 0,
        recommendation: 'Sem vendas nos últimos 6 meses',
        marginType: 'none',
        threshold: autoThreshold
      };
    }
    
    // Rule: If average of last 6 months >= auto-calculated threshold, use safe margin
    const isAboveThreshold = avgLast6Months >= autoThreshold;
    
    // Calculate safety margin based on the rule
    let safetyMargin;
    let recommendation;
    let marginType;
    
    if (isAboveThreshold) {
      // Safe margin: Use 2 months of average sales as safety stock
      safetyMargin = avgLast6Months * 2;
      recommendation = `Margem Segura (2 meses de vendas)`;
      marginType = 'safe';
    } else {
      // Conservative margin: Use 1.5 months of average sales as safety stock
      safetyMargin = avgLast6Months * 1.5;
      recommendation = `Margem Conservadora (1.5 meses)`;
      marginType = 'conservative';
    }
    
    return {
      avgLast6Months: avgLast6Months,
      isAboveThreshold: isAboveThreshold,
      safeMargin: safetyMargin,
      recommendation: recommendation,
      marginType: marginType,
      threshold: autoThreshold
    };
  };

  // Calculate ABC classification based on cumulative sales
  const calculateABCClassification = (skuData) => {
    // Sort by total sales descending
    const sortedData = [...skuData].sort((a, b) => b.totalGeral - a.totalGeral);
    
    const totalSales = sortedData.reduce((sum, item) => sum + item.totalGeral, 0);
    let cumulativePercent = 0;
    
    return sortedData.map(item => {
      cumulativePercent += (item.totalGeral / totalSales) * 100;
      
      let classification;
      if (cumulativePercent <= 80) classification = 'A';
      else if (cumulativePercent <= 95) classification = 'B';
      else classification = 'C';
      
      return {
        ...item,
        curva: classification,
        cumulativePercent: cumulativePercent
      };
    });
  };

  // Process raw data into comprehensive monthly format
  const processInventoryData = useCallback((rawData) => {
    try {
      console.log('🔄 Processing inventory data for all months...');
      console.log('📊 Raw data sample:', rawData?.slice(0, 3));
      
      // Group monthly data by SKU
      const skuMap = new Map();
      
      // First, process the data using the same validation as other pages
      const processedRawData = rawData.map(item => {
        // Use the same validation logic as the utility functions
        const quantity = item.QUANTIDADE;
        let validatedQuantity = 0;
        
        if (quantity !== null && quantity !== undefined && quantity !== '') {
          const quantityStr = String(quantity).trim();
          const cleanQuantity = quantityStr.replace(/[^\d.,]/g, '');
          const normalizedQuantity = cleanQuantity.replace(',', '.');
          const parsedQuantity = parseFloat(normalizedQuantity);
          validatedQuantity = isNaN(parsedQuantity) ? 0 : parsedQuantity;
        }
        
        return {
          ...item,
          QUANTIDADE_NUM: validatedQuantity
        };
      });
      
      processedRawData.forEach(record => {
        // Map database fields to expected format
        const sku = record.DESCRICAO;
        const date = new Date(record.DTEMISSAO);
        const quantity = record.QUANTIDADE_NUM || 0;
        
        // Validate date
        if (isNaN(date.getTime())) {
          console.warn(`⚠️ Invalid date for SKU ${sku}: ${record.DTEMISSAO}`);
          return; // Skip this record
        }
        
        if (!skuMap.has(sku)) {
          // Initialize with all 12 months
          skuMap.set(sku, {
            sku: sku,
            janeiro: 0, fevereiro: 0, março: 0, abril: 0, maio: 0, junho: 0,
            julho: 0, agosto: 0, setembro: 0, outubro: 0, novembro: 0, dezembro: 0
          });
        }
        
        const skuData = skuMap.get(sku);
        const month = date.getMonth() + 1; // 1-based month
        const year = date.getFullYear();
        
        // Process all data regardless of year to see what we have
        console.log(`📅 Processing record: SKU=${sku}, Year=${year}, Month=${month}, Quantity=${quantity}`);
        
        // Map months to Portuguese names
        switch (month) {
          case 1: skuData.janeiro += quantity; break;
          case 2: skuData.fevereiro += quantity; break;
          case 3: skuData.março += quantity; break;
          case 4: skuData.abril += quantity; break;
          case 5: skuData.maio += quantity; break;
          case 6: skuData.junho += quantity; break;
          case 7: skuData.julho += quantity; break;
          case 8: skuData.agosto += quantity; break;
          case 9: skuData.setembro += quantity; break;
          case 10: skuData.outubro += quantity; break;
          case 11: skuData.novembro += quantity; break;
          case 12: skuData.dezembro += quantity; break;
          default: break;
        }
      });

      // Calculate metrics for each SKU
      const processedData = Array.from(skuMap.values()).map(sku => {
        const salesArray = [
          sku.janeiro, sku.fevereiro, sku.março, sku.abril, sku.maio, sku.junho,
          sku.julho, sku.agosto, sku.setembro, sku.outubro, sku.novembro, sku.dezembro
        ];
        const nonZeroSales = salesArray.filter(x => x > 0);
        
        const totalGeral = salesArray.reduce((sum, val) => sum + val, 0);
        const vendaMinima = Math.min(...salesArray); // FIXED - Include all months, including zeros
        const vendaMaxima = Math.max(...salesArray);
        const mediaTotal = totalGeral / 12; // Fixed average calculation
        const mediaMensal = totalGeral / 12; // Average across 12 months
        
        // Calculate demand variability for stock multiplier
        const demandVariability = calculateDemandVariability(salesArray);
        
        // Validate product data (NEW - MEDIUM PRIORITY)
        const validation = validateProductData(sku, salesArray);
        
        // Get stock multiplier based on product class (FIXED - HIGH PRIORITY)
        const getStockMultiplier = (classification, variability, seasonality) => {
          const baseMultiplier = {
            'A': 3.5,  // Higher stock for critical items
            'B': 2.5,  // Standard stock
            'C': 1.8   // Lower stock for less important items
          };
          
          // Adjust for demand variability
          const variabilityAdjustment = variability > 0.5 ? 0.5 : 0;
          
          // Adjust for seasonality (few active months)
          const monthsActive = salesArray.filter(x => x > 0).length;
          const seasonalityAdjustment = monthsActive <= 6 ? 0.3 : 0;
          
          return baseMultiplier[classification] + variabilityAdjustment + seasonalityAdjustment;
        };
        
        // Temporary stock recommendation (will be updated after ABC classification)
        const recomendacaoEstoque = mediaMensal * 2.5;
        
        // Calculate safe margin based on last 6 months
        const safeMargin = calculateSafeMargin(sku);
        
                  return {
            ...sku,
            totalGeral,
            vendaMinima,
            vendaMaxima,
            mediaTotal,
            mediaMensal,
            recomendacaoEstoque,
            safeMargin,
            validation,
            isVisible: totalGeral > 0, // Show all SKUs with sales
            monthsWithSales: nonZeroSales.length
          };
      });

      console.log(`📊 Processed ${processedData.length} SKUs`);
      console.log(`📈 Sample SKU data:`, processedData.slice(0, 3).map(sku => ({
        sku: sku.sku,
        totalGeral: sku.totalGeral,
        monthsWithSales: sku.monthsWithSales,
        sampleMonths: {
          janeiro: sku.janeiro,
          fevereiro: sku.fevereiro,
          março: sku.março
        }
      })));
      
      // Check if any SKUs have sales
      const skusWithSales = processedData.filter(sku => sku.totalGeral > 0);
      console.log(`📊 SKUs with sales: ${skusWithSales.length} out of ${processedData.length}`);
      
      if (skusWithSales.length === 0) {
        console.error('❌ No SKUs with sales found!');
        console.log('🔍 First few processed SKUs:', processedData.slice(0, 5));
        
        // Let's check the raw data quantities
        const totalQuantity = processedRawData.reduce((sum, record) => sum + (record.QUANTIDADE_NUM || 0), 0);
        console.log(`🔍 Total quantity in raw data: ${totalQuantity}`);
        console.log(`🔍 Sample quantities:`, processedRawData.slice(0, 10).map(r => ({ sku: r.DESCRICAO, quantity: r.QUANTIDADE_NUM, original: r.QUANTIDADE })));
      }

      // Filter out SKUs with no sales and use shared ABC analysis
      const activeSkus = processedData.filter(sku => sku.totalGeral > 0);
      
      // Use shared utility for ABC classification (FIXED - CRITICAL)
      const productAnalysis = calculateProductAnalysis(rawData);
      const abcMap = new Map();
      productAnalysis.data.forEach(item => {
        abcMap.set(item.name, item.classification);
      });
      
      // Apply ABC classification from shared utility
      const classifiedData = activeSkus.map(sku => ({
        ...sku,
        curva: abcMap.get(sku.sku) || 'C' // Get from shared utility
      }));
      
      // Auto-calculate safe margin threshold as 75th percentile
      const allProductAverages = activeSkus.map(sku => {
        const last6Months = [sku.julho, sku.agosto, sku.setembro, sku.outubro, sku.novembro, sku.dezembro];
        return last6Months.reduce((sum, val) => sum + val, 0) / 6;
      });
      const autoThreshold = calculatePercentile(allProductAverages, 75);
      
      // Update stock recommendations based on ABC classification and demand variability
      const updatedData = classifiedData.map(sku => {
        const salesArray = [
          sku.janeiro, sku.fevereiro, sku.março, sku.abril, sku.maio, sku.junho,
          sku.julho, sku.agosto, sku.setembro, sku.outubro, sku.novembro, sku.dezembro
        ];
        const demandVariability = calculateDemandVariability(salesArray);
        
        const getStockMultiplier = (classification, variability, seasonality) => {
          const baseMultiplier = {
            'A': 3.5,  // Higher stock for critical items
            'B': 2.5,  // Standard stock
            'C': 1.8   // Lower stock for less important items
          };
          
          // Adjust for demand variability
          const variabilityAdjustment = variability > 0.5 ? 0.5 : 0;
          
          // Adjust for seasonality (few active months)
          const monthsActive = salesArray.filter(x => x > 0).length;
          const seasonalityAdjustment = monthsActive <= 6 ? 0.3 : 0;
          
          return baseMultiplier[classification] + variabilityAdjustment + seasonalityAdjustment;
        };
        
        const stockMultiplier = getStockMultiplier(sku.curva, demandVariability);
        const recomendacaoEstoque = sku.mediaMensal * stockMultiplier;
        
        // Calculate safe margin with auto threshold
        const safeMargin = calculateSafeMargin(sku, autoThreshold);
        
        return {
          ...sku,
          recomendacaoEstoque,
          safeMargin,
          demandVariability
        };
      });
      
      // Auto-determine best seller percentage using Pareto principle (FIXED - CRITICAL)
      const findNaturalBreak = (sortedData) => {
        const totalSales = sortedData.reduce((sum, item) => sum + item.totalGeral, 0);
        let cumulativePercent = 0;
        
        for (let i = 0; i < sortedData.length; i++) {
          cumulativePercent += (sortedData[i].totalGeral / totalSales) * 100;
          if (cumulativePercent >= 80) { // 80% of sales
            return i + 1;
          }
        }
        return Math.ceil(sortedData.length * 0.2); // Fallback to 20%
      };
      
      const sortedByTotal = [...updatedData].sort((a, b) => b.totalGeral - a.totalGeral);
      const bestSellerThreshold = findNaturalBreak(sortedByTotal);
      const visibleThreshold = Math.ceil(sortedByTotal.length * 0.3); // Top 30% are visible by default
      
      // Apply best seller and ranking AFTER ABC classification (FIXED - CRITICAL)
      sortedByTotal.forEach((item, index) => {
        item.isBestSeller = index < bestSellerThreshold;
        item.isVisible = index < visibleThreshold;
        item.rank = index + 1;
      });

      // Log ABC distribution for verification (FIXED - CRITICAL)
      const abcDistribution = {
        A: updatedData.filter(item => item.curva === 'A').length,
        B: updatedData.filter(item => item.curva === 'B').length,
        C: updatedData.filter(item => item.curva === 'C').length
      };
      console.log(`📊 ABC Distribution: A=${abcDistribution.A}, B=${abcDistribution.B}, C=${abcDistribution.C}`);
      console.log(`📊 ABC Percentages: A=${((abcDistribution.A/updatedData.length)*100).toFixed(1)}%, B=${((abcDistribution.B/updatedData.length)*100).toFixed(1)}%, C=${((abcDistribution.C/updatedData.length)*100).toFixed(1)}%`);
      
      // Log validation results
      const validationResults = {
        valid: updatedData.filter(item => item.validation?.isValid).length,
        needsReview: updatedData.filter(item => item.validation?.needsReview).length,
        total: updatedData.length
      };
      console.log(`🔍 Validation Results: Valid=${validationResults.valid}, Needs Review=${validationResults.needsReview}, Total=${validationResults.total}`);
      
      console.log(`✅ Processed ${updatedData.length} SKUs, ${bestSellerThreshold} best sellers, ${visibleThreshold} visible`);
      console.log(`📊 Auto-calculated threshold: ${autoThreshold.toFixed(0)} units/month`);
      
      // Generate kit recommendations based on correlations
      const recommendations = generateKitRecommendations(updatedData);
      setKitRecommendations(recommendations.kits);
      setProductRecommendations(recommendations.products);
      console.log(`🎯 Generated ${recommendations.kits.length} kit recommendations and ${recommendations.products.length} product recommendations`);
      
      return updatedData;
      
    } catch (err) {
      console.error('❌ Error processing data:', err);
      throw new Error('Erro ao processar dados de estoque');
    }
  }, [generateKitRecommendations]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading inventory analysis data...');
      
      const rawData = await fetchConcremData();
      
      console.log(`📊 Raw data received: ${rawData?.length || 0} records`);
      
      if (!rawData || rawData.length === 0) {
        throw new Error('Nenhum dado de vendas encontrado no banco de dados');
      }
      
      // Validate data quality first
      const dataQuality = validateDataQuality(rawData);
      console.log('📊 Data quality report:', dataQuality);
      
      // Use the same approach as other pages - get product analysis first
      const productAnalysis = calculateProductAnalysis(rawData);
      console.log('📊 Product analysis:', productAnalysis);
      
      if (!productAnalysis.data || productAnalysis.data.length === 0) {
        throw new Error('Nenhum produto com vendas encontrado');
      }
      
      // Now process the data for inventory analysis using the validated data
      const processedData = processInventoryData(rawData);
      
      if (processedData.length === 0) {
        throw new Error('Nenhum SKU com vendas encontrado após processamento');
      }
      
      setData(processedData);
      
      console.log('✅ Inventory analysis data loaded successfully');
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [processInventoryData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Regenerate kit recommendations when data changes
  useEffect(() => {
    if (data.length > 0) {
      const recommendations = generateKitRecommendations(data);
      setKitRecommendations(recommendations.kits);
      setProductRecommendations(recommendations.products);
      console.log(`🎯 Regenerated ${recommendations.kits.length} kit recommendations and ${recommendations.products.length} product recommendations`);
    }
  }, [data, generateKitRecommendations]);

  const filteredData = useMemo(() => {
    let filtered = data.filter(item => {
      // Search filter
      const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      // ABC Class filter
      const matchesClass = selectedClass === 'all' || item.curva === selectedClass;
      
      // Visibility filter
      const matchesVisibility = !showOnlyVisible || item.isVisible;
      
      // Best sellers filter
      const matchesBestSellers = !showBestSellers || item.isBestSeller;
      
      // Kit participation filter
      const matchesKitFilter = (() => {
        if (kitFilter === 'all') return true;
        if (kitFilter === 'in_kits') {
          const isInKits = productRecommendations.some(product => product.sku === item.sku);
          return isInKits;
        }
        if (kitFilter === 'not_in_kits') {
          const isInKits = productRecommendations.some(product => product.sku === item.sku);
          return !isInKits;
        }
        return true;
      })();
      
      // Validation filter
      const matchesValidationFilter = (() => {
        if (validationFilter === 'all') return true;
        if (validationFilter === 'valid') return item.validation?.isValid === true;
        if (validationFilter === 'needs_review') return item.validation?.needsReview === true;
        if (validationFilter === 'has_issues') return item.validation?.isValid === false;
        return true;
      })();
      
      // Seasonality filter
      const matchesSeasonalityFilter = (() => {
        if (seasonalityFilter === 'all') return true;
        if (seasonalityFilter === 'seasonal') return (item.monthsWithSales || 0) <= 3;
        if (seasonalityFilter === 'low_activity') return (item.monthsWithSales || 0) <= 6;
        if (seasonalityFilter === 'year_round') return (item.monthsWithSales || 0) > 6;
        return true;
      })();
      
      const allMatch = matchesSearch && matchesClass && matchesVisibility && matchesBestSellers && 
             matchesKitFilter && matchesValidationFilter && matchesSeasonalityFilter;
      
      return allMatch;
    });

    // Sort data
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [data, searchTerm, selectedClass, showOnlyVisible, showBestSellers, sortConfig, 
      kitFilter, validationFilter, seasonalityFilter, productRecommendations]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass, showOnlyVisible, showBestSellers, kitFilter, validationFilter, seasonalityFilter]);

  const summary = useMemo(() => {
    const visibleData = data.filter(item => (!showOnlyVisible || item.isVisible) && (!showBestSellers || item.isBestSeller));
    const bestSellersData = data.filter(item => item.isBestSeller);
    
    // Calculate safety margin statistics
    const safeMarginData = visibleData.filter(item => item.safeMargin?.marginType === 'safe');
    const conservativeMarginData = visibleData.filter(item => item.safeMargin?.marginType === 'conservative');
    
    return {
      totalSKUs: data.length,
      visibleSKUs: visibleData.length,
      bestSellers: bestSellersData.length,
      classA: visibleData.filter(item => item.curva === 'A').length,
      classB: visibleData.filter(item => item.curva === 'B').length,
      classC: visibleData.filter(item => item.curva === 'C').length,
      totalSales: visibleData.reduce((sum, item) => sum + item.totalGeral, 0),
      averageRecommendation: visibleData.reduce((sum, item) => sum + item.recomendacaoEstoque, 0) / (visibleData.length || 1),
      safeMarginCount: safeMarginData.length,
      conservativeMarginCount: conservativeMarginData.length,
      averageSafeMargin: safeMarginData.reduce((sum, item) => sum + item.safeMargin.safeMargin, 0) / (safeMarginData.length || 1),
      averageConservativeMargin: conservativeMarginData.reduce((sum, item) => sum + item.safeMargin.safeMargin, 0) / (conservativeMarginData.length || 1)
    };
  }, [data, showOnlyVisible, showBestSellers]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'A': return '#ef4444';
      case 'B': return '#f59e0b';
      case 'C': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getClassificationBgColor = (classification) => {
    switch (classification) {
      case 'A': return '#fef2f2';
      case 'B': return '#fffbeb';
      case 'C': return '#ecfdf5';
      default: return '#f9fafb';
    }
  };

  const exportToCSV = () => {
    // Main inventory data
    const headers = [
      'SKU', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
      'Total_Geral', 'Venda_Minima', 'Venda_Maxima', 'Media_Total', 
      'Media_Mensal', 'Recomendacao_Estoque', 'Margem_Segura_6Meses', 'Recomendacao_Margem', 'Media_6Meses', 'Curva', 'Rank', 'Meses_Com_Vendas', 'Best_Seller'
    ];
    
    const csvContent = [
      '=== ANÁLISE DE ESTOQUE ===',
      headers.join(';'),
      ...filteredData.map(item => [
        `"${item.sku}"`,
        item.janeiro, item.fevereiro, item.março, item.abril, item.maio, item.junho,
        item.julho, item.agosto, item.setembro, item.outubro, item.novembro, item.dezembro,
        item.totalGeral,
        item.vendaMinima,
        item.vendaMaxima,
        item.mediaTotal.toFixed(2),
        item.mediaMensal.toFixed(2),
        item.recomendacaoEstoque.toFixed(0),
        Math.round(item.safeMargin.safeMargin),
        item.safeMargin.recommendation,
        item.safeMargin.avgLast6Months.toFixed(0),
        item.curva,
        item.rank,
        item.monthsWithSales,
        item.isBestSeller ? 'Sim' : 'Não'
      ].join(';')),
      '',
      '=== RECOMENDAÇÕES DE KITS ===',
      'Kit_ID;Produto_1;Produto_2;Correlacao;Vendas_Combinadas;Estoque_Recomendado;Potencial_Vendas',
      ...kitRecommendations.map(kit => [
        kit.id,
        `"${kit.products[0].sku}"`,
        `"${kit.products[1].sku}"`,
        (kit.correlation * 100).toFixed(1) + '%',
        kit.totalSales,
        Math.round(kit.recommendedStock),
        Math.round(kit.potential)
      ].join(';')),

    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_analise_com_kits_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="section">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <span style={{ marginLeft: 'var(--spacing-md)' }}>Carregando análise de estoque...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section">
        <div className="container">
          <div className="card" style={{ textAlign: 'center', color: '#EF4444', padding: 'var(--spacing-xl)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-md)' }}>Erro ao carregar dados</h3>
            <p style={{ fontSize: '1rem' }}>{error}</p>
            <button
              onClick={loadData}
              className="btn btn-primary"
              style={{ marginTop: 'var(--spacing-md)' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'var(--forest-green)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 'var(--spacing-md)'
            }}>
              <BarChart3 style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-xs)' }}>
                Análise de Estoque
              </h1>
              <p style={{ fontSize: '1rem', color: '#6b7280' }}>
                Análise completa de vendas mensais com recomendações de kits
              </p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>

            <button
              onClick={() => setShowBestSellers(!showBestSellers)}
              className="btn"
              style={{
                backgroundColor: showBestSellers ? 'var(--orange)' : '#f3f4f6',
                color: showBestSellers ? 'white' : 'var(--charcoal-black)'
              }}
            >
              <Star style={{ width: '16px', height: '16px', marginRight: 'var(--spacing-xs)' }} />
              {showBestSellers ? 'Best Sellers' : 'Todos Produtos'}
            </button>

            <button
              onClick={() => setShowOnlyVisible(!showOnlyVisible)}
              className="btn"
              style={{
                backgroundColor: showOnlyVisible ? 'var(--blue)' : '#f3f4f6',
                color: showOnlyVisible ? 'white' : 'var(--charcoal-black)'
              }}
            >
              {showOnlyVisible ? <Eye style={{ width: '16px', height: '16px', marginRight: 'var(--spacing-xs)' }} /> : <EyeOff style={{ width: '16px', height: '16px', marginRight: 'var(--spacing-xs)' }} />}
              Top Performers
            </button>

            <button
              onClick={exportToCSV}
              className="btn btn-primary"
            >
              <Download style={{ width: '16px', height: '16px', marginRight: 'var(--spacing-xs)' }} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-2xl)'
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'var(--blue)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)'
            }}>
              <Package style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Total de Produtos</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--charcoal-black)' }}>{summary.totalSKUs}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>({summary.visibleSKUs} visíveis)</p>
            <p style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: 'var(--spacing-xs)' }}>
              Todos os produtos no sistema
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'var(--orange)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)'
            }}>
              <Star style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Produtos Estrela</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--orange)' }}>{summary.bestSellers}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Top 20% em vendas</p>
            <p style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: 'var(--spacing-xs)' }}>
              Produtos com maior volume
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'var(--teal)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)'
            }}>
              <Package style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Kits Recomendados</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--teal)' }}>{kitRecommendations.length}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>≥57.6% correlação</p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#ef4444',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)'
            }}>
              <Target style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Classe A - Críticos</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{summary.classA}</p>
            <p style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: 'var(--spacing-xs)' }}>
              Produtos mais importantes
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#f59e0b',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)'
            }}>
              <Target style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Classe B</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{summary.classB}</p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#10b981',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)'
            }}>
              <Target style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Classe C</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{summary.classC}</p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#10b981',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)'
            }}>
              <Target style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Margem Segura</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{summary.safeMarginCount}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Auto-calculado</p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#f59e0b',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)'
            }}>
              <Target style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Margem Conservadora</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{summary.conservativeMarginCount}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Auto-calculado</p>
          </div>
        </div>

        {/* Charts */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 'var(--spacing-2xl)',
          marginBottom: 'var(--spacing-2xl)'
        }}>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-lg)' }}>
              Distribuição ABC {showBestSellers ? '(Best Sellers)' : '(Todos)'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Classe A', value: summary.classA, color: '#ef4444' },
                    { name: 'Classe B', value: summary.classB, color: '#f59e0b' },
                    { name: 'Classe C', value: summary.classC, color: '#10b981' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { name: 'Classe A', value: summary.classA, color: '#ef4444' },
                    { name: 'Classe B', value: summary.classB, color: '#f59e0b' },
                    { name: 'Classe C', value: summary.classC, color: '#10b981' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-lg)' }}>
              Top 8 SKUs por Vendas Totais
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="sku" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100} 
                  tick={{ fontSize: 9 }}
                  tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString(), 'Total Geral']}
                  labelFormatter={(label) => `SKU: ${label}`}
                />
                <Bar dataKey="totalGeral" fill="var(--forest-green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ marginBottom: 'var(--spacing-sm)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-xs)' }}>
                🔍 Filtros de Análise
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Use os filtros abaixo para encontrar produtos específicos e analisar diferentes cenários
              </p>
            </div>
            
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: 'var(--spacing-md)',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af'
              }} />
              <input
                type="text"
                placeholder="🔍 Buscar por nome do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md) var(--spacing-md) var(--spacing-md) calc(var(--spacing-md) * 3)',
                  border: '1px solid #d1d5db',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '1rem',
                  background: '#ffffff'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
              {/* ABC Class Filter */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                  📊 Classificação ABC
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                  title="A = Produtos mais importantes (20%), B = Produtos médios (30%), C = Produtos menos importantes (50%)"
                >
                  <option value="all">Todas as Classes</option>
                  <option value="A">Classe A - Produtos Críticos</option>
                  <option value="B">Classe B - Produtos Médios</option>
                  <option value="C">Classe C - Produtos Menos Importantes</option>
                </select>
              </div>
              
              {/* Kit Participation Filter */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                  📦 Participação em Kits
                </label>
                <select
                  value={kitFilter}
                  onChange={(e) => setKitFilter(e.target.value)}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                  title="Produtos que aparecem em múltiplos kits promocionais"
                >
                  <option value="all">Todos os Produtos</option>
                  <option value="in_kits">Produtos em Kits</option>
                  <option value="not_in_kits">Produtos Fora de Kits</option>
                </select>
              </div>
              
              {/* Validation Filter */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                  ✅ Qualidade dos Dados
                </label>
                <select
                  value={validationFilter}
                  onChange={(e) => setValidationFilter(e.target.value)}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                  title="Produtos que precisam de revisão devido a padrões suspeitos"
                >
                  <option value="all">Todos os Produtos</option>
                  <option value="valid">Dados Válidos</option>
                  <option value="needs_review">Precisam Revisão</option>
                  <option value="has_issues">Com Problemas</option>
                </select>
              </div>
              
              {/* Seasonality Filter */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                  📅 Sazonalidade
                </label>
                <select
                  value={seasonalityFilter}
                  onChange={(e) => setSeasonalityFilter(e.target.value)}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                  title="Produtos sazonais vs produtos vendidos o ano todo"
                >
                  <option value="all">Todos os Produtos</option>
                  <option value="seasonal">Produtos Sazonais (&lt;=3 meses)</option>
                  <option value="low_activity">Baixa Atividade (&lt;=6 meses)</option>
                  <option value="year_round">Ano Todo (&gt;6 meses)</option>
                </select>
              </div>
              
              {/* Sort Options */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                  📈 Ordenação
                </label>
                <select
                  value={sortConfig.key}
                  onChange={(e) => handleSort(e.target.value)}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                >
                  <option value="totalGeral">Maior Venda Total</option>
                  <option value="recomendacaoEstoque">Maior Estoque Recomendado</option>
                  <option value="mediaTotal">Maior Média Mensal</option>
                  <option value="rank">Melhor Ranking</option>
                  <option value="sku">Ordem Alfabética</option>
                </select>
              </div>

              {/* Items Per Page */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                  📄 Itens por Página
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                >
                  <option value={25}>25 produtos</option>
                  <option value={50}>50 produtos</option>
                  <option value={100}>100 produtos</option>
                  <option value={200}>200 produtos</option>
                </select>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--spacing-md)',
              background: '#f8fafc',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.875rem',
              color: '#64748b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Filter style={{ width: '16px', height: '16px' }} />
                <span><strong>{filteredData.length}</strong> produtos encontrados</span>
                <span>•</span>
                <span>Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                <span>•</span>
                <span>Mostrando <strong>{startIndex + 1}</strong>-<strong>{Math.min(endIndex, filteredData.length)}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                {showBestSellers && <span style={{ color: 'var(--orange)', fontWeight: '500' }}>⭐ Best Sellers</span>}
                {showOnlyVisible && <span style={{ color: 'var(--blue)', fontWeight: '500' }}>👁️ Top Performers</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Kit Recommendations */}
        <div className="card" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-xs)' }}>
                  🎯 Recomendações de Kits
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Produtos com alta correlação de vendas - ideais para kits promocionais
                </p>
              </div>
              <div style={{ 
                padding: 'var(--spacing-sm) var(--spacing-md)', 
                background: '#f1f5f9', 
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.875rem',
                color: '#64748b'
              }}>
                <strong>Auto-calculado:</strong> Correlação ≥57.6% (p&lt;0.05)
              </div>
            </div>

          {kitRecommendations.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: 'var(--spacing-lg)'
            }}>
              {kitRecommendations.slice(0, 12).map((kit, index) => (
                <div 
                  key={kit.id} 
                  className="card"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => setSelectedKit(kit)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{
                      background: 'var(--forest-green)',
                      color: 'white',
                      padding: 'var(--spacing-xs) var(--spacing-md)',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Kit #{index + 1}
                    </div>
                    <div style={{
                      background: kit.correlation >= 0.8 ? '#dcfce7' : kit.correlation >= 0.7 ? '#fef3c7' : '#fee2e2',
                      color: kit.correlation >= 0.8 ? '#166534' : kit.correlation >= 0.7 ? '#92400e' : '#991b1b',
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {(kit.correlation * 100).toFixed(0)}% correlação
                    </div>
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    {kit.products.map((product, productIndex) => (
                      <div key={productIndex} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--spacing-sm) 0',
                        borderBottom: productIndex < kit.products.length - 1 ? '1px solid #f1f5f9' : 'none'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div 
                            style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: '500', 
                              color: 'var(--charcoal-black)', 
                              marginBottom: 'var(--spacing-xs)',
                              cursor: product.sku.length > 50 ? 'help' : 'default',
                              position: 'relative'
                            }}
                            title={product.sku.length > 50 ? product.sku : ''}
                          >
                            {product.sku.length > 50 ? product.sku.substring(0, 50) + '...' : product.sku}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {product.sales.toLocaleString()} vendas
                          </div>
                        </div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: getClassificationBgColor(product.classification),
                          color: getClassificationColor(product.classification)
                        }}>
                          {product.classification}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-lg)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Vendas Combinadas</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--charcoal-black)' }}>
                        {kit.totalSales.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Estoque Recomendado</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--purple)' }}>
                        {Math.round(kit.recommendedStock).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: 'var(--spacing-xs)' }}>
                        Baseado no produto principal
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: 'var(--spacing-md)',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'var(--blue)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'white', fontWeight: '500' }}>
                      Potencial de Vendas: {Math.round(kit.potential).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <Package style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto var(--spacing-md)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-xs)' }}>
                Nenhuma correlação encontrada
              </h4>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Tente reduzir o limite de correlação ou aguarde mais dados de vendas.
              </p>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="card">
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-xs)' }}>
              📊 Análise Completa de Estoque
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Dados detalhados de vendas mensais, recomendações de estoque e classificação ABC para todos os produtos
            </p>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{
                    padding: 'var(--spacing-md) var(--spacing-sm)',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #cbd5e1',
                    position: 'sticky',
                    left: 0,
                    background: '#f1f5f9',
                    zIndex: 1
                  }} title="Nome do produto">PRODUTO</th>
                  {monthNames.map(month => (
                    <th key={month} style={{
                      padding: 'var(--spacing-md) var(--spacing-sm)',
                      textAlign: 'right',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '2px solid #cbd5e1',
                      minWidth: '80px'
                    }}>{month.substring(0, 3)}</th>
                  ))}
                  <th style={{
                    padding: 'var(--spacing-md) var(--spacing-sm)',
                    textAlign: 'right',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #cbd5e1'
                  }} title="Total de vendas no ano">Total</th>
                  <th style={{
                    padding: 'var(--spacing-md) var(--spacing-sm)',
                    textAlign: 'right',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #cbd5e1'
                  }} title="Média mensal de vendas">Média</th>
                  <th style={{
                    padding: 'var(--spacing-md) var(--spacing-sm)',
                    textAlign: 'right',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #cbd5e1'
                  }} title="Estoque recomendado baseado na classe ABC e variabilidade">Rec. Est.</th>
                  <th style={{
                    padding: 'var(--spacing-md) var(--spacing-sm)',
                    textAlign: 'right',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #cbd5e1'
                  }}>Margem Segura</th>
                  <th style={{
                    padding: 'var(--spacing-md) var(--spacing-sm)',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #cbd5e1'
                  }} title="Classificação ABC: A=Crítico, B=Médio, C=Menos importante">Curva</th>
                  <th style={{
                    padding: 'var(--spacing-md) var(--spacing-sm)',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #cbd5e1'
                  }}>Rank</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, index) => (
                  <tr key={item.sku} style={{
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc'
                  }}>
                    <td style={{ 
                      padding: 'var(--spacing-md) var(--spacing-sm)', 
                      fontSize: '0.875rem', 
                      fontWeight: '500', 
                      color: 'var(--charcoal-black)',
                      maxWidth: '250px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      left: 0,
                      background: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                      zIndex: 1
                    }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 'var(--spacing-xs)',
                          cursor: item.sku.length > 30 ? 'help' : 'default'
                        }}
                        title={item.sku.length > 30 ? item.sku : ''}
                      >
                        {item.isBestSeller && <Star style={{ width: '14px', height: '14px', color: 'var(--orange)' }} />}
                        <span>{item.sku}</span>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.janeiro.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.fevereiro.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.março.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.abril.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.maio.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.junho.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.julho.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.agosto.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.setembro.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.outubro.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.novembro.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.dezembro.toLocaleString()}
                    </td>
                    <td style={{ 
                      padding: 'var(--spacing-md) var(--spacing-sm)', 
                      textAlign: 'right', 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: 'var(--charcoal-black)' 
                    }}>
                      {item.totalGeral.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'right', fontSize: '1rem', color: '#374151' }}>
                      {item.mediaMensal.toFixed(1)}
                    </td>
                    <td style={{ 
                      padding: 'var(--spacing-md) var(--spacing-sm)', 
                      textAlign: 'right', 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: 'var(--purple)' 
                    }}>
                      {Math.round(item.recomendacaoEstoque).toLocaleString()}
                    </td>
                    <td style={{ 
                      padding: 'var(--spacing-md) var(--spacing-sm)', 
                      textAlign: 'right', 
                      fontSize: '0.875rem', 
                      color: item.safeMargin.marginType === 'safe' ? '#10b981' : '#f59e0b'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: '600' }}>
                          {Math.round(item.safeMargin.safeMargin).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {item.safeMargin.avgLast6Months.toFixed(0)}/mês
                        </span>
                        <span style={{ 
                          fontSize: '0.625rem', 
                          color: item.safeMargin.marginType === 'safe' ? '#10b981' : '#f59e0b',
                          fontWeight: '500'
                        }}>
                          {item.safeMargin.marginType === 'safe' ? '✓ 2 meses' : '⚠ 1.5 meses'}
                        </span>
                        {item.validation?.needsReview && (
                          <span style={{ 
                            fontSize: '0.5rem', 
                            color: '#ef4444',
                            fontWeight: '500'
                          }}>
                            ⚠ Revisar
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--spacing-md) var(--spacing-sm)', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: getClassificationBgColor(item.curva),
                        color: getClassificationColor(item.curva)
                      }}>
                        {item.curva}
                      </span>
                    </td>
                    <td style={{ 
                      padding: 'var(--spacing-md) var(--spacing-sm)', 
                      textAlign: 'center', 
                      fontSize: '1rem', 
                      fontWeight: '600',
                      color: item.rank <= 10 ? '#10b981' : '#6b7280'
                    }}>
                      #{item.rank}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredData.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <Package style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto var(--spacing-md)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-xs)' }}>
                Nenhum SKU encontrado
              </h3>
              <p style={{ color: '#6b7280' }}>
                Tente ajustar os filtros de busca ou alterar a janela de análise.
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredData.length > 0 && totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--spacing-lg)',
              background: '#f8fafc',
              borderRadius: 'var(--radius-lg)',
              marginTop: 'var(--spacing-lg)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Mostrando <strong>{startIndex + 1}</strong> a <strong>{Math.min(endIndex, filteredData.length)}</strong> de <strong>{filteredData.length}</strong> produtos
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: '0.75rem',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  ⏮️ Primeira
                </button>
                
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: '0.75rem',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  ◀️ Anterior
                </button>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #d1d5db'
                }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--charcoal-black)' }}>
                    Página {currentPage} de {totalPages}
                  </span>
                </div>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: '0.75rem',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  Próxima ▶️
                </button>
                
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: '0.75rem',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  Última ⏭️
                </button>
              </div>
            </div>
          )}
        </div>



        {/* Modal de Detalhes do Kit */}
        {selectedKit && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-lg)'
          }}
          onClick={() => setSelectedKit(null)}
          >
            <div 
              className="card"
              style={{
                maxWidth: '600px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)' }}>
                  📦 Detalhes do Kit #{selectedKit.id.split('_')[1]}
                </h3>
                <button
                  onClick={() => setSelectedKit(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: 'var(--spacing-xs)'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{
                  background: selectedKit.correlation >= 0.8 ? '#dcfce7' : selectedKit.correlation >= 0.7 ? '#fef3c7' : '#fee2e2',
                  color: selectedKit.correlation >= 0.8 ? '#166534' : selectedKit.correlation >= 0.7 ? '#92400e' : '#991b1b',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 'var(--spacing-md)'
                }}>
                  Correlação de Vendas: {(selectedKit.correlation * 100).toFixed(1)}%
                </div>

                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-md)' }}>
                    Produtos do Kit:
                  </h4>
                  {selectedKit.products.map((product, index) => (
                    <div key={index} style={{
                      padding: 'var(--spacing-md)',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: 'var(--spacing-sm)',
                      background: '#f8fafc'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          backgroundColor: getClassificationBgColor(product.classification),
                          color: getClassificationColor(product.classification)
                        }}>
                          {product.classification}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                          {product.sales.toLocaleString()} vendas
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--charcoal-black)', lineHeight: '1.4' }}>
                        {product.sku}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: '#f1f5f9', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Vendas Combinadas</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)' }}>
                      {selectedKit.totalSales.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: '#f1f5f9', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Estoque Recomendado</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--purple)' }}>
                      {Math.round(selectedKit.recommendedStock).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: '#f1f5f9', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 'var(--spacing-xs)' }}>Potencial de Vendas</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--blue)' }}>
                      {Math.round(selectedKit.potential).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: 'var(--spacing-xs)' }}>
                      (Impacto Anual)
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--forest-green)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: 'var(--spacing-xs)' }}>
                    💡 Recomendação
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    Este kit apresenta alta correlação de vendas, indicando que os produtos são frequentemente comprados juntos. 
                    O "Potencial de Vendas" representa o impacto anual estimado considerando a correlação e performance mensal.
                    O "Estoque Recomendado" é baseado no produto principal com bônus pela correlação.
                    Considere criar promoções combinadas ou posicioná-los próximos no estoque.
                  </div>
                  <div style={{ 
                    fontSize: '0.625rem', 
                    opacity: 0.8, 
                    marginTop: 'var(--spacing-sm)',
                    padding: 'var(--spacing-xs)',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                      <strong>Potencial:</strong> (Média Mensal × Correlação × 12 × Multiplicador de Impacto)
                    </div>
                    <div>
                      <strong>Estoque:</strong> (Produto Principal × 2.5 × Bônus de Correlação)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="card" style={{ marginTop: 'var(--spacing-2xl)' }}>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-md)' }}>
            💡 Guia de Símbolos e Significados
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
            <div>
              <h5 style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-sm)' }}>
                📊 Classificação ABC
              </h5>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>A</span> - Produtos críticos (20% dos produtos, 80% das vendas)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                  <span style={{ color: '#f59e0b', fontWeight: '600' }}>B</span> - Produtos médios (30% dos produtos, 15% das vendas)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <span style={{ color: '#10b981', fontWeight: '600' }}>C</span> - Produtos menos importantes (50% dos produtos, 5% das vendas)
                </div>
              </div>
            </div>
            
            <div>
              <h5 style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-sm)' }}>
                ⚠️ Indicadores de Qualidade
              </h5>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                  <span style={{ color: '#10b981' }}>✓</span> - Margem Segura (2 meses de vendas)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                  <span style={{ color: '#f59e0b' }}>⚠</span> - Margem Conservadora (1.5 meses)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <span style={{ color: '#ef4444' }}>⚠ Revisar</span> - Produto precisa de análise
                </div>
              </div>
            </div>
            
            <div>
              <h5 style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--charcoal-black)', marginBottom: 'var(--spacing-sm)' }}>
                📦 Kits e Correlações
              </h5>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                  <span style={{ color: 'var(--teal)' }}>📦</span> - Produto aparece em kits promocionais
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                  <span style={{ color: 'var(--orange)' }}>⭐</span> - Produto estrela (top 20%)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <span style={{ color: 'var(--blue)' }}>👁️</span> - Top performer (visível por padrão)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryForecast;
