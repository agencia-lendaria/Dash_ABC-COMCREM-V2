// Inventory Forecast utility functions
// Implements the exact spreadsheet logic for inventory forecasting

// Helper function to validate and convert quantity to number
const validateQuantity = (quantity) => {
  if (quantity === null || quantity === undefined || quantity === '') {
    return 0;
  }
  
  const quantityStr = String(quantity).trim();
  const cleanQuantity = quantityStr.replace(/[^\d.,]/g, '');
  const normalizedQuantity = cleanQuantity.replace(',', '.');
  const parsedQuantity = parseFloat(normalizedQuantity);
  
  return isNaN(parsedQuantity) ? 0 : parsedQuantity;
};

// Helper function to get month key from date
const getMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Helper function to get month name from month key
const getMonthName = (monthKey) => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

// Calculate base metrics for each SKU according to spreadsheet logic
const calculateBaseMetrics = (skuData, analysisWindow = 5) => {
  const { sku, monthlyData } = skuData;
  
  // Create a map of all months in the analysis window
  const now = new Date();
  const monthMap = {};
  for (let i = 0; i < analysisWindow; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = getMonthKey(monthDate);
    monthMap[monthKey] = 0;
  }
  
  // Fill in actual sales data
  monthlyData.forEach(item => {
    const monthKey = getMonthKey(item.DTEMISSAO);
    if (monthMap.hasOwnProperty(monthKey)) {
      monthMap[monthKey] += validateQuantity(item.QUANTIDADE);
    }
  });
  
  const monthlyValues = Object.values(monthMap);
  const nonZeroValues = monthlyValues.filter(val => val > 0);
  
  // Calculate metrics according to spreadsheet logic
  const totalGeral = monthlyValues.reduce((sum, val) => sum + val, 0);
  const vendaMinima = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0;
  const vendaMaxima = nonZeroValues.length > 0 ? Math.max(...nonZeroValues) : 0;
  const mediaTotal = nonZeroValues.length > 0 ? nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length : 0;
  const mediaMensal = totalGeral / analysisWindow;
  
  return {
    sku,
    totalGeral,
    vendaMinima,
    vendaMaxima,
    mediaTotal,
    mediaMensal,
    monthlyData: Object.entries(monthMap).map(([monthKey, value]) => ({
      month: monthKey,
      monthName: getMonthName(monthKey),
      value
    })).sort((a, b) => a.month.localeCompare(b.month))
  };
};

// Calculate ABC classification according to spreadsheet logic
const calculateABCAnalysis = (skuMetrics, thresholds = { a: 20, b: 30, c: 50 }) => {
  // Sort by Total_Geral descending
  const sortedSKUs = [...skuMetrics].sort((a, b) => b.totalGeral - a.totalGeral);
  
  // Calculate total sum
  const totalSum = sortedSKUs.reduce((sum, sku) => sum + sku.totalGeral, 0);
  
  // Calculate cumulative percentages and assign classifications
  let cumulativePercentage = 0;
  const result = sortedSKUs.map((sku, index) => {
    const percentage = totalSum > 0 ? (sku.totalGeral / totalSum) * 100 : 0;
    cumulativePercentage += percentage;
    
    let classification = 'C';
    if (cumulativePercentage <= thresholds.a) {
      classification = 'A';
    } else if (cumulativePercentage <= thresholds.a + thresholds.b) {
      classification = 'B';
    }
    
    return {
      ...sku,
      percentage: percentage.toFixed(2),
      cumulativePercentage: cumulativePercentage.toFixed(2),
      classification,
      rank: index + 1
    };
  });
  
  return result;
};

// Calculate inventory recommendations based on ABC classification
const calculateInventoryRecommendations = (skuMetrics, coberturaConfig = { A: 2, B: 6, C: 6 }) => {
  return skuMetrics.map(sku => {
    const cobertura = coberturaConfig[sku.classification] || 6;
    const recomendacaoEstoque = sku.mediaMensal * cobertura;
    
    return {
      ...sku,
      cobertura,
      recomendacaoEstoque: Math.round(recomendacaoEstoque)
    };
  });
};

// Calculate association patterns (combinações padrão)
const calculateAssociationPatterns = (orderData, skuMetrics, config = {}) => {
  const {
    minSupport = 0.02,
    minConfidence = 0.25,
    minLift = 1.2,
    correlationThreshold = 0.6,
    topK = 5
  } = config;
  
  // Check if we have order/basket-level data (order_id field)
  const hasOrderData = orderData.length > 0 && orderData[0].hasOwnProperty('PEDIDO');
  
  if (hasOrderData) {
    console.log('🛒 Using basket-based association mining...');
    return calculateBasketAssociations(orderData, skuMetrics, { minSupport, minConfidence, minLift, topK });
  } else {
    console.log('📊 Using correlation-based association analysis...');
    return calculateCorrelationAssociations(orderData, skuMetrics, { correlationThreshold, topK });
  }
};

// Calculate basket-based associations using association rule mining
const calculateBasketAssociations = (orderData, skuMetrics, config) => {
  const { minSupport, minConfidence, minLift, topK } = config;
  
  // Group items by order (basket)
  const baskets = {};
  orderData.forEach(item => {
    if (item.PEDIDO && item.DESCRICAO) {
      if (!baskets[item.PEDIDO]) {
        baskets[item.PEDIDO] = new Set();
      }
      baskets[item.PEDIDO].add(item.DESCRICAO);
    }
  });
  
  const basketList = Object.values(baskets).map(basket => Array.from(basket));
  const totalBaskets = basketList.length;
  
  // Calculate support for individual items
  const itemSupport = {};
  basketList.forEach(basket => {
    basket.forEach(item => {
      itemSupport[item] = (itemSupport[item] || 0) + 1;
    });
  });
  
  // Calculate support percentages
  Object.keys(itemSupport).forEach(item => {
    itemSupport[item] = itemSupport[item] / totalBaskets;
  });
  
  // Find frequent pairs and calculate association rules
  const associations = {};
  const skuSet = new Set(skuMetrics.map(sku => sku.sku));
  
  skuSet.forEach(sku1 => {
    associations[sku1] = [];
    
    skuSet.forEach(sku2 => {
      if (sku1 === sku2) return;
      
      // Count baskets containing both items
      let bothCount = 0;
      let sku1Count = 0;
      
      basketList.forEach(basket => {
        const hasSku1 = basket.includes(sku1);
        const hasSku2 = basket.includes(sku2);
        
        if (hasSku1) sku1Count++;
        if (hasSku1 && hasSku2) bothCount++;
      });
      
      const support = bothCount / totalBaskets;
      const confidence = sku1Count > 0 ? bothCount / sku1Count : 0;
      const lift = confidence > 0 && itemSupport[sku2] > 0 ? confidence / itemSupport[sku2] : 0;
      
      // Check if rule meets thresholds
      if (support >= minSupport && confidence >= minConfidence && lift >= minLift) {
        associations[sku1].push({
          sku: sku2,
          strength: confidence, // Use confidence as strength
          support,
          confidence,
          lift,
          type: 'basket'
        });
      }
    });
    
    // Sort by confidence and take top K
    associations[sku1].sort((a, b) => b.confidence - a.confidence);
    associations[sku1] = associations[sku1].slice(0, topK);
  });
  
  return associations;
};

// Calculate correlation-based associations
const calculateCorrelationAssociations = (orderData, skuMetrics, config) => {
  const { correlationThreshold, topK } = config;
  
  // Create SKU x month matrix
  const skuMonthMatrix = {};
  const monthSet = new Set();
  
  orderData.forEach(item => {
    if (item.DESCRICAO && item.DTEMISSAO) {
      const monthKey = getMonthKey(item.DTEMISSAO);
      monthSet.add(monthKey);
      
      if (!skuMonthMatrix[item.DESCRICAO]) {
        skuMonthMatrix[item.DESCRICAO] = {};
      }
      
      if (!skuMonthMatrix[item.DESCRICAO][monthKey]) {
        skuMonthMatrix[item.DESCRICAO][monthKey] = 0;
      }
      
      skuMonthMatrix[item.DESCRICAO][monthKey] += validateQuantity(item.QUANTIDADE);
    }
  });
  
  const months = Array.from(monthSet).sort();
  
  // Calculate correlation for each pair of SKUs
  const skuAssociations = {};
  
  skuMetrics.forEach(sku1 => {
    skuAssociations[sku1.sku] = [];
    
    skuMetrics.forEach(sku2 => {
      if (sku1.sku === sku2.sku) return;
      
      const values1 = months.map(month => skuMonthMatrix[sku1.sku]?.[month] || 0);
      const values2 = months.map(month => skuMonthMatrix[sku2.sku]?.[month] || 0);
      
      const correlation = calculatePearsonCorrelation(values1, values2);
      
      if (Math.abs(correlation) >= correlationThreshold) {
        skuAssociations[sku1.sku].push({
          sku: sku2.sku,
          strength: Math.abs(correlation),
          correlation,
          type: 'correlation'
        });
      }
    });
    
    // Sort by strength and take top K
    skuAssociations[sku1.sku].sort((a, b) => b.strength - a.strength);
    skuAssociations[sku1.sku] = skuAssociations[sku1.sku].slice(0, topK);
  });
  
  return skuAssociations;
};

// Calculate Pearson correlation coefficient
const calculatePearsonCorrelation = (x, y) => {
  const n = x.length;
  if (n !== y.length) return 0;
  
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
};

// Calculate pattern-aware adjustments with demand signal detection
const calculatePatternAdjustments = (skuMetrics, associations, config = {}) => {
  const { alpha = 0.15 } = config;
  
  return skuMetrics.map(sku => {
    const skuAssociations = associations[sku.sku] || [];
    
    if (skuAssociations.length === 0) {
      return {
        ...sku,
        forecastAjustada: sku.recomendacaoEstoque,
        drivers: []
      };
    }
    
    // Calculate demand signals for each associated SKU
    let totalWeightedMomentum = 0;
    let totalWeight = 0;
    const drivers = [];
    
    skuAssociations.forEach(association => {
      const associatedSKU = skuMetrics.find(s => s.sku === association.sku);
      if (!associatedSKU || associatedSKU.monthlyData.length === 0) return;
      
      // Calculate momentum (z-score) for the associated SKU
      const monthlyValues = associatedSKU.monthlyData.map(d => d.value);
      const lastMonth = monthlyValues[monthlyValues.length - 1];
      const mean = associatedSKU.mediaTotal;
      const stdDev = calculateStandardDeviation(monthlyValues);
      
      // Calculate momentum as z-score: (last_month - mean) / std_dev
      const momentum = stdDev > 0 ? (lastMonth - mean) / stdDev : 0;
      
      // Weight by association strength
      const weightedMomentum = momentum * association.strength;
      totalWeightedMomentum += weightedMomentum;
      totalWeight += association.strength;
      
      drivers.push({
        sku: association.sku,
        momentum: momentum,
        strength: association.strength,
        weightedMomentum: weightedMomentum,
        type: association.type,
        lastMonth: lastMonth,
        mean: mean,
        stdDev: stdDev
      });
    });
    
    // Calculate average weighted momentum
    const averageWeightedMomentum = totalWeight > 0 ? totalWeightedMomentum / totalWeight : 0;
    
    // Apply the dynamic adjustment formula
    // Previsão Ajustada = Recomendação Base × (1 + α × Ajuste)
    const adjustment = alpha * averageWeightedMomentum;
    const adjustmentFactor = 1 + adjustment;
    const forecastAjustada = Math.max(0, Math.round(sku.recomendacaoEstoque * adjustmentFactor));
    
    // Prepare drivers for display (top 3 by absolute weighted momentum)
    const sortedDrivers = drivers
      .sort((a, b) => Math.abs(b.weightedMomentum) - Math.abs(a.weightedMomentum))
      .slice(0, 3)
      .map(driver => ({
        sku: driver.sku,
        impact: driver.weightedMomentum * alpha * 100, // Convert to percentage
        strength: driver.strength,
        momentum: driver.momentum,
        type: driver.type
      }));
    
    return {
      ...sku,
      forecastAjustada,
      drivers: sortedDrivers,
      adjustment: adjustment,
      averageWeightedMomentum: averageWeightedMomentum
    };
  });
};

// Helper function to calculate standard deviation
const calculateStandardDeviation = (values) => {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
};

// Main function to calculate inventory forecast
export const calculateInventoryForecast = async (monthlySalesData, orderData, config = {}) => {
  const {
    analysisWindow = 5,
    abcThresholds = { a: 20, b: 30, c: 50 },
    coberturaConfig = { A: 2, B: 6, C: 6 },
    associationConfig = {
      minSupport: 0.02,
      minConfidence: 0.25,
      minLift: 1.2,
      correlationThreshold: 0.6,
      topK: 5,
      alpha: 0.15
    }
  } = config;
  
  console.log('🔍 Starting inventory forecast analysis...');
  console.log('📊 Analysis window:', analysisWindow, 'months');
  console.log('🎯 ABC thresholds:', abcThresholds);
  console.log('📦 Coverage config:', coberturaConfig);
  console.log('🔗 Association config:', associationConfig);
  
  // Group data by SKU
  const skuGroups = {};
  monthlySalesData.forEach(item => {
    if (item.DESCRICAO) {
      if (!skuGroups[item.DESCRICAO]) {
        skuGroups[item.DESCRICAO] = [];
      }
      skuGroups[item.DESCRICAO].push(item);
    }
  });
  
  // Calculate base metrics for each SKU
  const skuMetrics = Object.entries(skuGroups).map(([sku, data]) => 
    calculateBaseMetrics({ sku, monthlyData: data }, analysisWindow)
  );
  
  // Calculate ABC analysis
  const abcResults = calculateABCAnalysis(skuMetrics, abcThresholds);
  
  // Calculate inventory recommendations
  const recommendations = calculateInventoryRecommendations(abcResults, coberturaConfig);
  
  // Calculate association patterns
  const associations = calculateAssociationPatterns(orderData, recommendations, associationConfig);
  
  // Calculate pattern-aware adjustments
  const finalResults = calculatePatternAdjustments(recommendations, associations, associationConfig);
  
  return {
    skuMetrics: finalResults,
    summary: {
      totalSKUs: finalResults.length,
      classA: finalResults.filter(sku => sku.classification === 'A').length,
      classB: finalResults.filter(sku => sku.classification === 'B').length,
      classC: finalResults.filter(sku => sku.classification === 'C').length,
      totalValue: finalResults.reduce((sum, sku) => sum + sku.totalGeral, 0),
      averageRecommendation: finalResults.reduce((sum, sku) => sum + sku.recomendacaoEstoque, 0) / finalResults.length
    },
    config: {
      analysisWindow,
      abcThresholds,
      coberturaConfig,
      associationConfig
    }
  };
};

// Export helper functions for testing
export const testHelpers = {
  validateQuantity,
  calculateBaseMetrics,
  calculateABCAnalysis,
  calculatePearsonCorrelation
};
