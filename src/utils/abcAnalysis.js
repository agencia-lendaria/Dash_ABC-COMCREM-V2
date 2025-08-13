// ABC Analysis utility functions

// Helper function to validate and convert quantity to number
const validateQuantity = (quantity) => {
  if (quantity === null || quantity === undefined || quantity === '') {
    return 0;
  }
  
  // Convert to string first to handle various formats
  const quantityStr = String(quantity).trim();
  
  // Remove common non-numeric characters except decimal points and commas
  const cleanQuantity = quantityStr.replace(/[^\d.,]/g, '');
  
  // Handle Brazilian number format (comma as decimal separator)
  const normalizedQuantity = cleanQuantity.replace(',', '.');
  
  const parsedQuantity = parseFloat(normalizedQuantity);
  
  // Return 0 if parsing fails or result is NaN
  return isNaN(parsedQuantity) ? 0 : parsedQuantity;
};

// Helper function to validate and convert unit value to number
const validateUnitValue = (unitValue) => {
  if (unitValue === null || unitValue === undefined || unitValue === '') {
    return 0;
  }
  
  // Convert to string first to handle various formats
  const unitValueStr = String(unitValue).trim();
  
  // Remove common non-numeric characters except decimal points and commas
  const cleanUnitValue = unitValueStr.replace(/[^\d.,]/g, '');
  
  // Handle Brazilian number format (comma as decimal separator)
  const normalizedUnitValue = cleanUnitValue.replace(',', '.');
  
  const parsedUnitValue = parseFloat(normalizedUnitValue);
  
  // Return 0 if parsing fails or result is NaN
  return isNaN(parsedUnitValue) ? 0 : parsedUnitValue;
};

// Helper function to calculate LINE_AMOUNT if not present or invalid
const calculateLineAmount = (item) => {
  // If LINE_AMOUNT exists and is valid, use it
  if (item.LINE_AMOUNT !== null && item.LINE_AMOUNT !== undefined && !isNaN(Number(item.LINE_AMOUNT))) {
    return Number(item.LINE_AMOUNT);
  }
  
  // Calculate VLRUNIT * QUANTIDADE
  const quantity = validateQuantity(item.QUANTIDADE);
  const unitValue = validateUnitValue(item.VRLUNIT);
  
  const calculatedAmount = quantity * unitValue;
  
  // If we have QUANTIDADE_NUM and VRLUNIT_NUM, use those as backup
  if (calculatedAmount === 0 && item.QUANTIDADE_NUM && item.VRLUNIT_NUM) {
    return Number(item.QUANTIDADE_NUM) * Number(item.VRLUNIT_NUM);
  }
  
  return calculatedAmount;
};

export const calculateABCAnalysis = (data, groupBy, valueField = 'LINE_AMOUNT') => {
  // Process data to ensure proper calculations
  const processedData = data.map(item => {
    const lineAmount = calculateLineAmount(item);
    
    return {
      ...item,
      LINE_AMOUNT: lineAmount,
      QUANTIDADE_NUM: validateQuantity(item.QUANTIDADE),
      VRLUNIT_NUM: validateUnitValue(item.VRLUNIT)
    };
  });

  // Group data by the specified field
  const groupedData = processedData.reduce((acc, item) => {
    const key = item[groupBy] || 'Sem Classificação'
    if (!acc[key]) {
      acc[key] = {
        name: key,
        totalValue: 0,
        count: 0,
        items: [],
        totalQuantity: 0,
        averageUnitValue: 0
      }
    }
    
    const lineAmount = Number(item.LINE_AMOUNT) || 0;
    const quantity = Number(item.QUANTIDADE_NUM) || 0;
    
    acc[key].totalValue += lineAmount;
    acc[key].totalQuantity += quantity;
    acc[key].count += 1;
    acc[key].items.push(item);
    
    // Calculate average unit value
    if (acc[key].count > 0) {
      acc[key].averageUnitValue = acc[key].totalValue / acc[key].totalQuantity || 0;
    }
    
    return acc;
  }, {});

  // Convert to array and sort by total value
  const sortedData = Object.values(groupedData)
    .sort((a, b) => b.totalValue - a.totalValue);

  // Calculate total value
  const totalValue = sortedData.reduce((sum, item) => sum + item.totalValue, 0);

  // Calculate percentages and classifications
  let cumulativePercentage = 0;
  const result = sortedData.map((item, index) => {
    const percentage = totalValue > 0 ? (item.totalValue / totalValue) * 100 : 0;
    cumulativePercentage += percentage;

    let classification = 'C';
    if (cumulativePercentage <= 80) {
      classification = 'A';
    } else if (cumulativePercentage <= 95) {
      classification = 'B';
    }

    return {
      ...item,
      percentage: percentage.toFixed(2),
      cumulativePercentage: cumulativePercentage.toFixed(2),
      classification,
      rank: index + 1
    };
  });

  return {
    data: result,
    totalValue,
    summary: {
      classA: result.filter(item => item.classification === 'A'),
      classB: result.filter(item => item.classification === 'B'),
      classC: result.filter(item => item.classification === 'C')
    }
  };
};

export const calculateAcabamentoAnalysis = (data) => {
  return calculateABCAnalysis(data, 'ACABAMENTO');
};

export const calculateCustomerAnalysis = (data) => {
  return calculateABCAnalysis(data, 'NOME');
};

export const calculateProductAnalysis = (data) => {
  return calculateABCAnalysis(data, 'DESCRICAO');
};

export const calculateCityAnalysis = (data) => {
  return calculateABCAnalysis(data, 'CIDADE');
};

export const calculateInventoryForecast = (data, productFilter = null) => {
  // Process data to ensure proper calculations
  const processedData = data.map(item => {
    const lineAmount = calculateLineAmount(item);
    
    return {
      ...item,
      LINE_AMOUNT: lineAmount,
      QUANTIDADE_NUM: validateQuantity(item.QUANTIDADE),
      VRLUNIT_NUM: validateUnitValue(item.VRLUNIT)
    };
  });

  // Filter data by product if specified
  let filteredData = processedData;
  if (productFilter) {
    filteredData = processedData.filter(item => 
      item.DESCRICAO?.toLowerCase().includes(productFilter.toLowerCase())
    );
  }

  // Group by month and calculate monthly sales
  const monthlySales = filteredData.reduce((acc, item) => {
    if (!item.DTEMISSAO) return acc;
    
    const date = new Date(item.DTEMISSAO);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = 0;
    }
    
    const quantity = Number(item.QUANTIDADE_NUM) || 0;
    acc[monthKey] += quantity;
    return acc;
  }, {});

  const salesValues = Object.values(monthlySales);
  
  if (salesValues.length === 0) {
    return {
      minSales: 0,
      maxSales: 0,
      averageTotal: 0,
      averageMonthly: 0,
      recommendation: 0,
      safetyMargins: {
        low: 0,
        medium: 0,
        critical: 0
      },
      monthlyData: []
    };
  }

  const minSales = Math.min(...salesValues);
  const maxSales = Math.max(...salesValues);
  const averageTotal = salesValues.reduce((sum, val) => sum + val, 0) / salesValues.length;
  const averageMonthly = salesValues.reduce((sum, val) => sum + val, 0) / salesValues.length;

  const recommendation = averageTotal * 1.2;

  return {
    minSales: Math.round(minSales),
    maxSales: Math.round(maxSales),
    averageTotal: Math.round(averageTotal),
    averageMonthly: Math.round(averageMonthly),
    recommendation: Math.round(recommendation),
    safetyMargins: {
      low: Math.round(averageTotal * 1.1),
      medium: Math.round(averageTotal * 1.3),
      critical: Math.round(averageTotal * 1.5)
    },
    monthlyData: Object.entries(monthlySales).map(([month, sales]) => ({
      month,
      sales: Math.round(sales)
    })).sort((a, b) => a.month.localeCompare(b.month))
  };
};

// Function to validate data quality
export const validateDataQuality = (data) => {
  const validation = {
    totalRecords: data.length,
    recordsWithValidQuantity: 0,
    recordsWithValidUnitValue: 0,
    recordsWithValidLineAmount: 0,
    recordsWithCalculatedLineAmount: 0,
    totalCalculatedValue: 0,
    issues: []
  };

  data.forEach((item, index) => {
    const quantity = validateQuantity(item.QUANTIDADE);
    const unitValue = validateUnitValue(item.VRLUNIT);
    const originalLineAmount = Number(item.LINE_AMOUNT) || 0;
    const calculatedLineAmount = calculateLineAmount(item);

    if (quantity > 0) validation.recordsWithValidQuantity++;
    if (unitValue > 0) validation.recordsWithValidUnitValue++;
    if (originalLineAmount > 0) validation.recordsWithValidLineAmount++;
    if (calculatedLineAmount > 0) {
      validation.recordsWithCalculatedLineAmount++;
      validation.totalCalculatedValue += calculatedLineAmount;
    }

    // Check for potential issues
    if (quantity === 0 && item.QUANTIDADE) {
      validation.issues.push(`Record ${index + 1}: Invalid quantity format - "${item.QUANTIDADE}"`);
    }
    if (unitValue === 0 && item.VRLUNIT) {
      validation.issues.push(`Record ${index + 1}: Invalid unit value format - "${item.VRLUNIT}"`);
    }
    if (originalLineAmount === 0 && calculatedLineAmount > 0) {
      validation.issues.push(`Record ${index + 1}: LINE_AMOUNT was 0, calculated as ${calculatedLineAmount.toFixed(2)}`);
    }
  });

  return validation;
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatNumber = (value) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};
