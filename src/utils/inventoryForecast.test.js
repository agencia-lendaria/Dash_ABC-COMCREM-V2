// Test file for inventory forecast logic
// This verifies the implementation matches the spreadsheet requirements

import { testHelpers } from './inventoryForecast';

// Test data that matches the acceptance criteria example
const testData = {
  // SKU with only Dezembro=6 and other four months = 0
  dezembroOnly: {
    sku: 'TEST-SKU-1',
    monthlyData: [
      { DTEMISSAO: '2024-12-01', QUANTIDADE: '6' },
      // Other months will be treated as 0
    ]
  },
  
  // Multiple SKUs for ABC testing
  multipleSKUs: [
    {
      sku: 'SKU-A',
      monthlyData: [
        { DTEMISSAO: '2024-08-01', QUANTIDADE: '100' },
        { DTEMISSAO: '2024-09-01', QUANTIDADE: '120' },
        { DTEMISSAO: '2024-10-01', QUANTIDADE: '110' },
        { DTEMISSAO: '2024-11-01', QUANTIDADE: '130' },
        { DTEMISSAO: '2024-12-01', QUANTIDADE: '125' }
      ]
    },
    {
      sku: 'SKU-B',
      monthlyData: [
        { DTEMISSAO: '2024-08-01', QUANTIDADE: '50' },
        { DTEMISSAO: '2024-09-01', QUANTIDADE: '60' },
        { DTEMISSAO: '2024-10-01', QUANTIDADE: '55' },
        { DTEMISSAO: '2024-11-01', QUANTIDADE: '65' },
        { DTEMISSAO: '2024-12-01', QUANTIDADE: '62' }
      ]
    },
    {
      sku: 'SKU-C',
      monthlyData: [
        { DTEMISSAO: '2024-08-01', QUANTIDADE: '10' },
        { DTEMISSAO: '2024-09-01', QUANTIDADE: '12' },
        { DTEMISSAO: '2024-10-01', QUANTIDADE: '11' },
        { DTEMISSAO: '2024-11-01', QUANTIDADE: '13' },
        { DTEMISSAO: '2024-12-01', QUANTIDADE: '12' }
      ]
    }
  ]
};

// Test the specific acceptance criteria case
export const testDezembroOnlyCase = () => {
  console.log('🧪 Testing Dezembro-only case...');
  
  const result = testHelpers.calculateBaseMetrics(testData.dezembroOnly, 5);
  
  console.log('Result:', result);
  
  // Verify the expected values
  const expected = {
    totalGeral: 6,
    vendaMinima: 6,
    vendaMaxima: 6,
    mediaTotal: 6.00,
    mediaMensal: 1.2 // 6/5
  };
  
  const actual = {
    totalGeral: result.totalGeral,
    vendaMinima: result.vendaMinima,
    vendaMaxima: result.vendaMaxima,
    mediaTotal: result.mediaTotal,
    mediaMensal: result.mediaMensal
  };
  
  console.log('Expected:', expected);
  console.log('Actual:', actual);
  
  // Check if values match (with small tolerance for floating point)
  const tolerance = 0.01;
  const isCorrect = 
    Math.abs(actual.totalGeral - expected.totalGeral) < tolerance &&
    Math.abs(actual.vendaMinima - expected.vendaMinima) < tolerance &&
    Math.abs(actual.vendaMaxima - expected.vendaMaxima) < tolerance &&
    Math.abs(actual.mediaTotal - expected.mediaTotal) < tolerance &&
    Math.abs(actual.mediaMensal - expected.mediaMensal) < tolerance;
  
  console.log('✅ Test passed:', isCorrect);
  return isCorrect;
};

// Test ABC analysis
export const testABCAnalysis = () => {
  console.log('🧪 Testing ABC analysis...');
  
  const baseMetrics = testData.multipleSKUs.map(sku => 
    testHelpers.calculateBaseMetrics(sku, 5)
  );
  
  const abcResult = testHelpers.calculateABCAnalysis(baseMetrics, { a: 20, b: 30, c: 50 });
  
  console.log('ABC Results:', abcResult.map(sku => ({
    sku: sku.sku,
    totalGeral: sku.totalGeral,
    classification: sku.classification,
    cumulativePercentage: sku.cumulativePercentage
  })));
  
  // Verify that classifications are assigned correctly
  const hasClassA = abcResult.some(sku => sku.classification === 'A');
  const hasClassB = abcResult.some(sku => sku.classification === 'B');
  const hasClassC = abcResult.some(sku => sku.classification === 'C');
  
  console.log('✅ ABC Test passed:', hasClassA && hasClassB && hasClassC);
  return hasClassA && hasClassB && hasClassC;
};

// Test correlation calculation
export const testCorrelation = () => {
  console.log('🧪 Testing correlation calculation...');
  
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 6, 8, 10]; // Perfect positive correlation
  
  const correlation = testHelpers.calculatePearsonCorrelation(x, y);
  
  console.log('Perfect positive correlation:', correlation);
  
  const isCorrect = Math.abs(correlation - 1.0) < 0.01;
  console.log('✅ Correlation Test passed:', isCorrect);
  return isCorrect;
};

// Run all tests
export const runAllTests = () => {
  console.log('🚀 Running all inventory forecast tests...\n');
  
  const results = {
    dezembroOnly: testDezembroOnlyCase(),
    abcAnalysis: testABCAnalysis(),
    correlation: testCorrelation()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('Dezembro-only case:', results.dezembroOnly ? '✅ PASS' : '❌ FAIL');
  console.log('ABC Analysis:', results.abcAnalysis ? '✅ PASS' : '❌ FAIL');
  console.log('Correlation:', results.correlation ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result);
  console.log('\n🎯 All tests passed:', allPassed);
  
  return allPassed;
};

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testInventoryForecast = runAllTests;
}
