import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Search, Download, Settings, X, Eye, EyeOff, Package, Target, Zap, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { fetchMonthlySalesBySKU, fetchOrderLevelData } from '../lib/supabase';
import { calculateInventoryForecast } from '../utils/inventoryForecast';
import { formatNumber } from '../utils/abcAnalysis';

const InventoryForecast = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showPatternAdjustments, setShowPatternAdjustments] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'totalGeral', direction: 'desc' });

  const [config, setConfig] = useState({
    analysisWindow: 5,
    abcThresholds: { a: 20, b: 30, c: 50 },
    coberturaConfig: { A: 2, B: 6, C: 6 },
    associationConfig: {
      correlationThreshold: 0.6,
      topK: 5,
      alpha: 0.15
    }
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading inventory forecast data...');
      
      const [monthlyData, orderData] = await Promise.all([
        fetchMonthlySalesBySKU(config.analysisWindow),
        fetchOrderLevelData(config.analysisWindow)
      ]);
      
      const forecastResult = await calculateInventoryForecast(monthlyData, orderData, config);
      setForecast(forecastResult);
      
      console.log('✅ Inventory forecast data loaded successfully');
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleRowExpansion = (sku) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sku)) {
      newExpanded.delete(sku);
    } else {
      newExpanded.add(sku);
    }
    setExpandedRows(newExpanded);
  };

  const filteredAndSortedData = () => {
    if (!forecast?.skuMetrics) return [];
    
    let filtered = forecast.skuMetrics.filter(sku => {
      const matchesSearch = sku.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClassification = selectedClassification === 'all' || sku.classification === selectedClassification;
      return matchesSearch && matchesClassification;
    });

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

  // Calculate additional metrics for each SKU
  const calculateSKUMetrics = (sku) => {
    // Demand & Sales metrics
    const turnoverRatio = sku.totalGeral / (sku.recomendacaoEstoque || 1);
    const dsi = 365 / (turnoverRatio || 1);
    const demandVariation = sku.monthlyData ? 
      Math.sqrt(sku.monthlyData.reduce((sum, month) => sum + Math.pow(month.value - sku.mediaMensal, 2), 0) / sku.monthlyData.length) / sku.mediaMensal : 0;
    const salesTrend = sku.monthlyData && sku.monthlyData.length >= 2 ? 
      ((sku.monthlyData[sku.monthlyData.length - 1].value - sku.monthlyData[0].value) / sku.monthlyData[0].value) * 100 : 0;

    // Profitability metrics (mock data - replace with actual data)
    const grossMargin = 0.25 + (Math.random() * 0.3); // 25-55% margin
    const gmroii = (sku.totalGeral * grossMargin) / (sku.recomendacaoEstoque * 100); // Mock calculation
    const contributionMargin = sku.totalGeral * grossMargin;

    // Inventory Risk metrics
    const stockoutRate = Math.max(0, 1 - (sku.recomendacaoEstoque / (sku.mediaMensal * 2))); // Mock calculation
    const serviceLevel = Math.max(0, 1 - stockoutRate);
    const reorderPoint = sku.mediaMensal * 1.5; // 1.5 months of average demand
    const safetyStock = sku.mediaMensal * 0.5; // 0.5 months as safety stock

    // Classification alternatives
    const xyzClassification = demandVariation < 0.2 ? 'X' : demandVariation < 0.5 ? 'Y' : 'Z';
    const fsnClassification = turnoverRatio > 3 ? 'F' : turnoverRatio > 1 ? 'S' : 'N';
    const vedClassification = sku.totalGeral > 5000 ? 'V' : sku.totalGeral > 2000 ? 'E' : 'D';

    return {
      turnoverRatio: turnoverRatio.toFixed(2),
      dsi: dsi.toFixed(1),
      demandVariation: (demandVariation * 100).toFixed(1),
      salesTrend: salesTrend.toFixed(1),
      grossMargin: (grossMargin * 100).toFixed(1),
      gmroii: gmroii.toFixed(2),
      contributionMargin: contributionMargin.toFixed(0),
      stockoutRate: (stockoutRate * 100).toFixed(1),
      serviceLevel: (serviceLevel * 100).toFixed(1),
      reorderPoint: reorderPoint.toFixed(0),
      safetyStock: safetyStock.toFixed(0),
      xyzClassification,
      fsnClassification,
      vedClassification
    };
  };

  const exportToCSV = () => {
    if (!forecast?.skuMetrics) return;
    
    const headers = [
      'SKU', 'Classificacao', 'Total_Geral', 'Venda_Minima', 'Venda_Maxima',
      'Media_Total', 'Media_Mensal', 'Cobertura', 'Recomendacao_Base',
      'Previsao_Ajustada', 'Rank', 'Taxa_Rotacao', 'Dias_Estoque', 'Variacao_Demanda',
      'Tendencia_Vendas', 'Margem_Bruta', 'GMROII', 'Margem_Contribuicao',
      'Taxa_Ruptura', 'Nivel_Servico', 'Ponto_Reposicao', 'Estoque_Seguranca',
      'Classificacao_XYZ', 'Classificacao_FSN', 'Classificacao_VED'
    ];
    
    // Helper function to properly escape CSV values with UTF-8 BOM
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // If the value contains comma, semicolon, quote, or newline, wrap it in quotes
      if (stringValue.includes(',') || stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
        // Escape any existing quotes by doubling them
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    const csvContent = [
      headers.map(escapeCSV).join(';'),
      ...forecast.skuMetrics.map(sku => {
        const metrics = calculateSKUMetrics(sku);
        return [
          escapeCSV(sku.sku),
          escapeCSV(sku.classification),
          escapeCSV(sku.totalGeral),
          escapeCSV(sku.vendaMinima),
          escapeCSV(sku.vendaMaxima),
          escapeCSV(sku.mediaTotal.toFixed(2)),
          escapeCSV(sku.mediaMensal.toFixed(2)),
          escapeCSV(sku.cobertura),
          escapeCSV(sku.recomendacaoEstoque),
          escapeCSV(sku.forecastAjustada),
          escapeCSV(sku.rank),
          escapeCSV(metrics.turnoverRatio),
          escapeCSV(metrics.dsi),
          escapeCSV(metrics.demandVariation),
          escapeCSV(metrics.salesTrend),
          escapeCSV(metrics.grossMargin),
          escapeCSV(metrics.gmroii),
          escapeCSV(metrics.contributionMargin),
          escapeCSV(metrics.stockoutRate),
          escapeCSV(metrics.serviceLevel),
          escapeCSV(metrics.reorderPoint),
          escapeCSV(metrics.safetyStock),
          escapeCSV(metrics.xyzClassification),
          escapeCSV(metrics.fsnClassification),
          escapeCSV(metrics.vedClassification)
        ].join(';');
      })
    ].join('\n');
    
    // Add UTF-8 BOM to ensure proper encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_forecast_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        padding: '32px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '400px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                border: '4px solid #3b82f6',
                borderTop: '4px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 24px'
              }}></div>
              <p style={{ fontSize: '18px', color: '#374151', fontWeight: '500' }}>
                Carregando dados de previsão de estoque...
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Isso pode levar alguns segundos
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #fef2f2 0%, #fce7f3 100%)',
        padding: '32px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <X style={{ width: '32px', height: '32px', color: '#dc2626' }} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
                Erro ao carregar dados
              </h3>
              <p style={{ color: '#dc2626', marginBottom: '24px' }}>{error}</p>
              <button
                onClick={loadData}
                className="btn btn-primary"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredData = filteredAndSortedData();
  const summary = forecast?.summary;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '80px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}>
                <TrendingUp style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                  Previsão de Estoque
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  Análise ABC com indicadores avançados
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Settings style={{ width: '16px', height: '16px' }} />
                Configurações
              </button>
              <button
                onClick={exportToCSV}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Download style={{ width: '16px', height: '16px' }} />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Settings Panel */}
        {showSettings && (
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                Configurações de Análise
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                style={{ color: '#9ca3af', cursor: 'pointer' }}
              >
                <X style={{ width: '24px', height: '24px' }} />
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Janela de Análise (meses)
                </label>
                <input
                  type="number"
                  min="3"
                  max="12"
                  value={config.analysisWindow}
                  onChange={(e) => setConfig(prev => ({ ...prev, analysisWindow: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Limite Correlação
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={config.associationConfig.correlationThreshold}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    associationConfig: {
                      ...prev.associationConfig,
                      correlationThreshold: parseFloat(e.target.value)
                    }
                  }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Fator de Ajuste (α)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={config.associationConfig.alpha}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    associationConfig: {
                      ...prev.associationConfig,
                      alpha: parseFloat(e.target.value)
                    }
                  }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setShowPatternAdjustments(!showPatternAdjustments)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    ...(showPatternAdjustments ? {
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      borderColor: '#93c5fd'
                    } : {
                      background: '#f3f4f6',
                      color: '#374151',
                      borderColor: '#d1d5db'
                    })
                  }}
                >
                  {showPatternAdjustments ? <Eye style={{ width: '16px', height: '16px' }} /> : <EyeOff style={{ width: '16px', height: '16px' }} />}
                  Ajustes de Padrão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Package style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total SKUs</p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{summary.totalSKUs}</p>
            </div>
            
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Target style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Classe A</p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{summary.classA}</p>
            </div>
            
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Target style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Classe B</p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{summary.classB}</p>
            </div>
            
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Target style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Classe C</p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{summary.classC}</p>
            </div>
            
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Zap style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Média Recomendação</p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{Math.round(summary.averageRecommendation)}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        {forecast && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '32px',
            marginBottom: '32px'
          }}>
            <div className="card">
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>
                Distribuição ABC
              </h3>
              <ResponsiveContainer width="100%" height={350}>
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>
                Top 10 SKUs por Vendas Totais
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={filteredData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="sku" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="totalGeral" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af'
              }} />
              <input
                type="text"
                placeholder="Buscar por SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="all">Todas as Classes</option>
                <option value="A">Classe A</option>
                <option value="B">Classe B</option>
                <option value="C">Classe C</option>
              </select>
              
              <select
                value={sortConfig.key}
                onChange={(e) => handleSort(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="totalGeral">Ordenar por Total Geral</option>
                <option value="recomendacaoEstoque">Ordenar por Recomendação</option>
                <option value="forecastAjustada">Ordenar por Previsão Ajustada</option>
                <option value="rank">Ordenar por Rank</option>
              </select>
            </div>
          </div>
        </div>

        {/* SKU Indicators Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {filteredData.map((sku) => {
            const metrics = calculateSKUMetrics(sku);
            return (
              <div key={sku.sku} className="card" style={{ position: 'relative' }}>
                {/* SKU Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '20px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                      {sku.sku}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: getClassificationBgColor(sku.classification),
                        color: getClassificationColor(sku.classification)
                      }}>
                        Classe {sku.classification}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Rank #{sku.rank}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRowExpansion(sku.sku)}
                    style={{
                      color: '#3b82f6',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      fontSize: '14px',
                      padding: '8px'
                    }}
                  >
                    {expandedRows.has(sku.sku) ? 'Ocultar' : 'Detalhes'}
                  </button>
                </div>

                {/* Indicators Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px'
                }}>
                  {/* Demand & Sales Section */}
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    borderRadius: '12px',
                    border: '1px solid #bae6fd'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <TrendingUp style={{ width: '16px', height: '16px', color: '#0ea5e9' }} />
                                             <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>Demanda e Vendas</h4>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#0c4a6e' }}>Taxa de Rotação:</span>
                         <span style={{ fontWeight: '600', color: '#111827' }}>{metrics.turnoverRatio}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#0c4a6e' }}>Dias de Estoque:</span>
                         <span style={{ fontWeight: '600', color: '#111827' }}>{metrics.dsi} dias</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#0c4a6e' }}>Variação da Demanda:</span>
                         <span style={{ fontWeight: '600', color: '#111827' }}>{metrics.demandVariation}%</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#0c4a6e' }}>Tendência de Vendas:</span>
                         <span style={{ 
                           fontWeight: '600', 
                           color: parseFloat(metrics.salesTrend) > 0 ? '#10b981' : '#ef4444' 
                         }}>
                           {metrics.salesTrend}%
                         </span>
                       </div>
                    </div>
                  </div>

                  {/* Profitability Section */}
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderRadius: '12px',
                    border: '1px solid #86efac'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <DollarSign style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                                             <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#15803d' }}>Rentabilidade</h4>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#15803d' }}>Margem Bruta:</span>
                         <span style={{ fontWeight: '600', color: '#111827' }}>{metrics.grossMargin}%</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#15803d' }}>GMROII:</span>
                         <span style={{ fontWeight: '600', color: '#111827' }}>{metrics.gmroii}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#15803d' }}>Margem de Contribuição:</span>
                         <span style={{ fontWeight: '600', color: '#111827' }}>R$ {formatNumber(metrics.contributionMargin)}</span>
                       </div>
                    </div>
                  </div>

                  {/* Inventory Risk Section */}
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                    borderRadius: '12px',
                    border: '1px solid #fca5a5'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                                             <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>Risco de Estoque</h4>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#991b1b' }}>Taxa de Ruptura:</span>
                         <span style={{ 
                           fontWeight: '600', 
                           color: parseFloat(metrics.stockoutRate) > 10 ? '#ef4444' : '#111827' 
                         }}>{metrics.stockoutRate}%</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#991b1b' }}>Nível de Serviço:</span>
                         <span style={{ 
                           fontWeight: '600', 
                           color: parseFloat(metrics.serviceLevel) > 90 ? '#10b981' : '#111827' 
                         }}>{metrics.serviceLevel}%</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#991b1b' }}>Ponto de Reposição:</span>
                         <span style={{ fontWeight: '600', color: '#111827' }}>{metrics.reorderPoint}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#991b1b' }}>Estoque de Segurança:</span>
                         <span style={{ fontWeight: '600', color: '#111827' }}>{metrics.safetyStock}</span>
                       </div>
                    </div>
                  </div>

                  {/* Classification Alternatives Section */}
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                    borderRadius: '12px',
                    border: '1px solid #c4b5fd'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <BarChart3 style={{ width: '16px', height: '16px', color: '#7c3aed' }} />
                                             <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#6b21a8' }}>Classificações</h4>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#6b21a8' }}>XYZ (Previsibilidade):</span>
                         <span style={{ 
                           fontWeight: '600', 
                           color: metrics.xyzClassification === 'X' ? '#10b981' : 
                                  metrics.xyzClassification === 'Y' ? '#f59e0b' : '#ef4444' 
                         }}>{metrics.xyzClassification}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#6b21a8' }}>FSN (Movimentação):</span>
                         <span style={{ 
                           fontWeight: '600', 
                           color: metrics.fsnClassification === 'F' ? '#10b981' : 
                                  metrics.fsnClassification === 'S' ? '#f59e0b' : '#ef4444' 
                         }}>{metrics.fsnClassification}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                         <span style={{ color: '#6b21a8' }}>VED (Criticidade):</span>
                         <span style={{ 
                           fontWeight: '600', 
                           color: metrics.vedClassification === 'V' ? '#ef4444' : 
                                  metrics.vedClassification === 'E' ? '#f59e0b' : '#10b981' 
                         }}>{metrics.vedClassification}</span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRows.has(sku.sku) && (
                  <div style={{
                    marginTop: '20px',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #f9fafb 0%, #e0f2fe 100%)',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '24px'
                    }}>
                      <div className="card">
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                          Vendas Mensais
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={sku.monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="monthName" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="card">
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                          Métricas Detalhadas
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>Total Geral:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{formatNumber(sku.totalGeral)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>Média Mensal:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{sku.mediaMensal.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>Recomendação:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{formatNumber(sku.recomendacaoEstoque)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>Cobertura:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{sku.cobertura} meses</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>% do Total:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{sku.percentage}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {showPatternAdjustments && sku.drivers.length > 0 && (
                        <div className="card">
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                            Drivers de Ajuste
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sku.drivers.slice(0, 3).map((driver, index) => (
                              <div key={index} style={{
                                padding: '8px 12px',
                                background: '#f9fafb',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                  <span style={{ fontWeight: '500', color: '#374151' }}>{driver.sku}</span>
                                  <span style={{
                                    fontWeight: '600',
                                    color: driver.impact > 0 ? '#10b981' : '#ef4444'
                                  }}>
                                    {driver.impact > 0 ? '+' : ''}{driver.impact.toFixed(1)}%
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  Força: {(driver.strength * 100).toFixed(0)}% | Tipo: {driver.type === 'basket' ? 'Cesta' : 'Correlação'}
                                </div>
                              </div>
                            ))}
                            <div style={{
                              padding: '6px 10px',
                              background: '#e0f2fe',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#0c4a6e',
                              textAlign: 'center'
                            }}>
                              <strong>Ajuste Total:</strong> {(sku.adjustment * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredData.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
            <Package style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>
              Nenhum SKU encontrado
            </h3>
            <p style={{ color: '#6b7280' }}>
              Tente ajustar os filtros de busca.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryForecast;
