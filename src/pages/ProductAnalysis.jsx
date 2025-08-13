import React, { useState, useEffect } from 'react';
import { Package, Download, Search } from 'lucide-react';
import { fetchConcremData } from '../lib/supabase';
import { calculateProductAnalysis, formatCurrency } from '../utils/abcAnalysis';
import ABCAnalysisChart from '../components/ABCAnalysisChart';
import DataTable from '../components/DataTable';

const ProductAnalysis = () => {

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const rawData = await fetchConcremData();
        const productAnalysis = calculateProductAnalysis(rawData);
        setAnalysis(productAnalysis);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredData = analysis?.data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const exportToCSV = () => {
    if (!analysis) return;

    const headers = ['Rank', 'Produto', 'Valor Total', 'Percentual', 'Percentual Acumulado', 'Classificação'];
    const csvContent = [
      headers.join(','),
      ...analysis.data.map(item => [
        item.rank,
        `"${item.name}"`,
        item.totalValue,
        item.percentage,
        item.cumulativePercentage,
        item.classification
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'analise_abc_produtos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="section">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <span style={{ marginLeft: 'var(--spacing-md)' }}>Carregando análise de produtos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section">
        <div className="container">
          <div className="card" style={{ textAlign: 'center', color: '#EF4444' }}>
            <h3>Erro ao carregar dados</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'var(--orange)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 'var(--spacing-md)'
            }}>
              <Package size={24} color="white" />
            </div>
            <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '700', 
                color: 'var(--charcoal-black)',
                margin: 0
              }}>
                Curva SKU
              </h1>
              <p style={{ 
                fontSize: '1.125rem', 
                color: '#6B7280',
                margin: 0
              }}>
                Análise ABC por produto
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ 
                fontSize: '2rem', 
                fontWeight: '700',
                color: '#2D5A3D',
                margin: '0 0 var(--spacing-xs) 0'
              }}>
                {analysis.summary.classA.length}
              </h3>
              <p style={{ margin: 0, color: '#6B7280' }}>Produtos Classe A</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ 
                fontSize: '2rem', 
                fontWeight: '700',
                color: '#D2691E',
                margin: '0 0 var(--spacing-xs) 0'
              }}>
                {analysis.summary.classB.length}
              </h3>
              <p style={{ margin: 0, color: '#6B7280' }}>Produtos Classe B</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ 
                fontSize: '2rem', 
                fontWeight: '700',
                color: '#B8336A',
                margin: '0 0 var(--spacing-xs) 0'
              }}>
                {analysis.summary.classC.length}
              </h3>
              <p style={{ margin: 0, color: '#6B7280' }}>Produtos Classe C</p>
            </div>
            <div className="card" style={{ 
              textAlign: 'center',
              minWidth: '280px'
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700',
                color: 'var(--forest-green)',
                margin: '0 0 var(--spacing-xs) 0'
              }}>
                {formatCurrency(analysis.totalValue)}
              </h3>
              <p style={{ margin: 0, color: '#6B7280' }}>Valor Total</p>
            </div>
          </div>

          {/* Search and Export */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={20} style={{
                position: 'absolute',
                left: 'var(--spacing-sm)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF'
              }} />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 2.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={exportToCSV}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
            >
              <Download size={16} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Charts */}
        <ABCAnalysisChart 
          data={analysis} 
          title="Análise ABC - Produtos"
        />

        {/* Data Table */}
        <div style={{ marginTop: 'var(--spacing-2xl)' }}>
          <DataTable 
            data={filteredData} 
            title="Dados Detalhados - Produtos"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductAnalysis;
