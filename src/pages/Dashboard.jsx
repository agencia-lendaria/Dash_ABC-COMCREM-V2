import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, MapPin, BarChart3, TrendingUp, DollarSign, ArrowUpRight } from 'lucide-react';
import { fetchConcremData } from '../lib/supabase';
import { calculateCustomerAnalysis, calculateProductAnalysis, calculateCityAnalysis, calculateAcabamentoAnalysis, formatCurrency } from '../utils/abcAnalysis';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch actual data
        const rawData = await fetchConcremData();
        setData(rawData);
        
        console.log(`🔍 Data Summary:`);
        console.log(`   - Fetched rows: ${rawData?.length || 0}`);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="section">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <span style={{ marginLeft: 'var(--spacing-md)', fontSize: '1.125rem' }}>Carregando dados...</span>
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
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calculate all analyses
  const customerAnalysis = calculateCustomerAnalysis(data);
  const productAnalysis = calculateProductAnalysis(data);
  const cityAnalysis = calculateCityAnalysis(data);
  const acabamentoAnalysis = calculateAcabamentoAnalysis(data);

  const totalRevenue = data.reduce((sum, item) => sum + (Number(item.LINE_AMOUNT) || 0), 0);
  const totalCustomers = new Set(data.map(item => item.NOME)).size;
  const totalProducts = new Set(data.map(item => item.DESCRICAO)).size;
  const totalCities = new Set(data.map(item => item.CIDADE)).size;

  const metrics = [
    {
      title: 'Receita Total',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'var(--forest-green)',
      link: '/clientes'
    },
    {
      title: 'Total de Clientes',
      value: totalCustomers.toLocaleString('pt-BR'),
      icon: Users,
      color: 'var(--blue)',
      link: '/clientes'
    },
    {
      title: 'Total de Produtos',
      value: totalProducts.toLocaleString('pt-BR'),
      icon: Package,
      color: 'var(--orange)',
      link: '/produtos'
    },
    {
      title: 'Total de Cidades',
      value: totalCities.toLocaleString('pt-BR'),
      icon: MapPin,
      color: 'var(--purple)',
      link: '/cidades'
    }
  ];

  const analysisCards = [
    {
      title: 'Curva Cliente',
      description: 'Análise ABC por cliente',
      icon: Users,
      color: 'var(--blue)',
      link: '/clientes',
      stats: {
        classA: customerAnalysis.summary.classA.length,
        classB: customerAnalysis.summary.classB.length,
        classC: customerAnalysis.summary.classC.length
      }
    },
    {
      title: 'Curva SKU',
      description: 'Análise ABC por produto',
      icon: Package,
      color: 'var(--orange)',
      link: '/produtos',
      stats: {
        classA: productAnalysis.summary.classA.length,
        classB: productAnalysis.summary.classB.length,
        classC: productAnalysis.summary.classC.length
      }
    },
    {
      title: 'Curva Cidade',
      description: 'Análise ABC por cidade',
      icon: MapPin,
      color: 'var(--purple)',
      link: '/cidades',
      stats: {
        classA: cityAnalysis.summary.classA.length,
        classB: cityAnalysis.summary.classB.length,
        classC: cityAnalysis.summary.classC.length
      }
    },
    {
      title: 'Curva Acabamento',
      description: 'Análise ABC por acabamento',
      icon: BarChart3,
      color: 'var(--teal)',
      link: '/acabamento',
      stats: {
        classA: acabamentoAnalysis.summary.classA.length,
        classB: acabamentoAnalysis.summary.classB.length,
        classC: acabamentoAnalysis.summary.classC.length
      }
    }
  ];

  return (
    <div className="section" style={{ padding: 'var(--spacing-2xl) 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ 
          marginBottom: 'var(--spacing-2xl)',
          textAlign: 'center',
          padding: 'var(--spacing-xl)',
          backgroundColor: '#fafafa',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #e5e7eb'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: '700', 
            color: 'var(--charcoal-black)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            Dashboard ABC
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#6B7280',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Visão geral da análise ABC da Concrem. Monitore o desempenho de clientes, produtos, cidades e acabamentos.
          </p>
        </div>

        

                 {/* Metrics */}
         <div style={{ 
           display: 'grid', 
           gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
           gap: 'var(--spacing-xl)',
           marginBottom: 'var(--spacing-2xl)'
         }}>
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="card" style={{ 
                position: 'relative',
                padding: 'var(--spacing-xl)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                ':hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }
              }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div style={{ flex: 1, minWidth: 0 }}>
                     <p style={{ 
                       fontSize: '1rem', 
                       color: '#6B7280',
                       marginBottom: 'var(--spacing-sm)',
                       fontWeight: '500'
                     }}>
                       {metric.title}
                     </p>
                                           <h3 style={{ 
                        fontSize: '2rem', 
                        fontWeight: '700',
                        color: 'var(--charcoal-black)',
                        margin: 0,
                        lineHeight: '1.1',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      }}>
                        {metric.value}
                      </h3>
                   </div>
                                     <div style={{
                     width: '60px',
                     height: '60px',
                     borderRadius: 'var(--radius-lg)',
                     backgroundColor: metric.color,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                     flexShrink: 0,
                     marginLeft: 'var(--spacing-md)'
                   }}>
                     <Icon size={28} color="white" />
                   </div>
                </div>
                {metric.link && (
                  <Link 
                    to={metric.link}
                    style={{
                      position: 'absolute',
                      top: 'var(--spacing-lg)',
                      right: 'var(--spacing-lg)',
                      color: metric.color,
                      textDecoration: 'none',
                      opacity: '0.7',
                      transition: 'opacity 0.2s ease',
                      ':hover': { opacity: '1' }
                    }}
                  >
                    <ArrowUpRight size={20} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

                 {/* Analysis Cards */}
         <div style={{ 
           display: 'grid', 
           gridTemplateColumns: 'repeat(auto-fit, minmax(550px, 1fr))',
           gap: 'var(--spacing-xl)',
           marginBottom: 'var(--spacing-2xl)'
         }}>
          {analysisCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Link 
                key={index} 
                to={card.link}
                style={{ textDecoration: 'none' }}
              >
                <div className="card" style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 'var(--spacing-xl)',
                  backgroundColor: 'white',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                  ':hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                  }
                }}>
                                     <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                     <div style={{
                       width: '50px',
                       height: '50px',
                       borderRadius: 'var(--radius-lg)',
                       backgroundColor: card.color,
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       marginRight: 'var(--spacing-lg)',
                       boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                       flexShrink: 0
                     }}>
                       <Icon size={24} color="white" />
                     </div>
                     <div style={{ flex: 1, minWidth: 0 }}>
                       <h3 style={{ 
                         fontSize: '1.5rem', 
                         fontWeight: '600',
                         color: 'var(--charcoal-black)',
                         margin: 0,
                         marginBottom: 'var(--spacing-xs)',
                         wordBreak: 'break-word'
                       }}>
                         {card.title}
                       </h3>
                       <p style={{ 
                         fontSize: '1rem', 
                         color: '#6B7280',
                         margin: 0,
                         wordBreak: 'break-word'
                       }}>
                         {card.description}
                       </p>
                     </div>
                   </div>

                                     <div style={{ 
                     display: 'grid', 
                     gridTemplateColumns: 'repeat(3, 1fr)',
                     gap: 'var(--spacing-md)',
                     padding: 'var(--spacing-lg)',
                     backgroundColor: '#fafafa',
                     borderRadius: 'var(--radius-lg)',
                     border: '1px solid #e5e7eb'
                   }}>
                                         <div style={{ textAlign: 'center' }}>
                       <div style={{
                         fontSize: '1.75rem',
                         fontWeight: '700',
                         color: '#2D5A3D',
                         marginBottom: 'var(--spacing-xs)',
                         lineHeight: '1.1'
                       }}>
                         {card.stats.classA}
                       </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                      }}>
                        Classe A
                      </div>
                    </div>
                                         <div style={{ textAlign: 'center' }}>
                       <div style={{
                         fontSize: '1.75rem',
                         fontWeight: '700',
                         color: '#D2691E',
                         marginBottom: 'var(--spacing-xs)',
                         lineHeight: '1.1'
                       }}>
                         {card.stats.classB}
                       </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                      }}>
                        Classe B
                      </div>
                    </div>
                                         <div style={{ textAlign: 'center' }}>
                       <div style={{
                         fontSize: '1.75rem',
                         fontWeight: '700',
                         color: '#B8336A',
                         marginBottom: 'var(--spacing-xs)',
                         lineHeight: '1.1'
                       }}>
                         {card.stats.classC}
                       </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                      }}>
                        Classe C
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div style={{ 
          marginTop: 'var(--spacing-2xl)',
          padding: 'var(--spacing-xl)',
          backgroundColor: '#fafafa',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: '600',
            color: 'var(--charcoal-black)',
            marginBottom: 'var(--spacing-xl)',
            textAlign: 'center'
          }}>
            Ações Rápidas
          </h2>
                     <div style={{ 
             display: 'grid', 
             gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
             gap: 'var(--spacing-lg)',
             maxWidth: '800px',
             margin: '0 auto'
           }}>
            <Link to="/estoque" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ 
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                padding: 'var(--spacing-xl)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                ':hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }
              }}>
                <TrendingUp size={48} color="var(--magenta)" style={{ marginBottom: 'var(--spacing-lg)' }} />
                <h4 style={{ 
                  margin: '0 0 var(--spacing-sm) 0', 
                  color: 'var(--charcoal-black)',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  Previsão de Estoque
                </h4>
                <p style={{ 
                  margin: '0', 
                  fontSize: '1rem', 
                  color: '#6B7280',
                  lineHeight: '1.5'
                }}>
                  Análise de estoque e previsões
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;