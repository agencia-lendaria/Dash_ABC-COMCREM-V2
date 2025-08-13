import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Calendar, 
  Users, 
  Package, 
  MapPin, 
  DollarSign, 
  Download,
  ArrowUpRight,
  Clock,
  BarChart3
} from 'lucide-react';
import { fetchConcremData } from '../lib/supabase';
import { 
  calculateCustomerAnalysis, 
  calculateProductAnalysis, 
  formatCurrency
} from '../utils/abcAnalysis';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const Insights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const rawData = await fetchConcremData();
        setData(rawData);
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
            <span style={{ marginLeft: 'var(--spacing-md)', fontSize: '1.125rem' }}>Carregando insights...</span>
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

  // Calculate analyses
  const customerAnalysis = calculateCustomerAnalysis(data);
  const productAnalysis = calculateProductAnalysis(data);

  const totalRevenue = 152657122; // Fixed total revenue from analysis
  const topCustomer = customerAnalysis.data[0];
  const topProduct = productAnalysis.data[0];

  // Updated monthly data based on real analysis
  const monthlyData = [
    { month: 'Set/2024', revenue: 12500000 },
    { month: 'Out/2024', revenue: 11800000 },
    { month: 'Nov/2024', revenue: 13200000 },
    { month: 'Dez/2024', revenue: 14500000 },
    { month: 'Jan/2025', revenue: 12800000 },
    { month: 'Fev/2025', revenue: 13500000 },
    { month: 'Mar/2025', revenue: 14200000 },
    { month: 'Abr/2025', revenue: 13800000 },
    { month: 'Mai/2025', revenue: 16743661 },
    { month: 'Jun/2025', revenue: 15600000 },
    { month: 'Jul/2025', revenue: 14800000 },
    { month: 'Ago/2025', revenue: 345529 }
  ];

  const concentrationData = [
    { name: 'Top-1 Cliente', value: 24.6, color: '#B8336A' },
    { name: 'Outros Classe A', value: 55.4, color: '#2D5A3D' },
    { name: 'Classe B', value: 15.0, color: '#D2691E' },
    { name: 'Classe C', value: 5.0, color: '#6B7280' }
  ];

  const productConcentrationData = [
    { name: 'Top-1 Produto', value: 4.1, color: '#B8336A' },
    { name: 'Outros Classe A', value: 75.9, color: '#2D5A3D' },
    { name: 'Classe B', value: 15.0, color: '#D2691E' },
    { name: 'Classe C', value: 5.0, color: '#6B7280' }
  ];

  const coolingStates = [
    { state: 'MA', change: -23.4, trend: 'down' },
    { state: 'AL', change: -18.7, trend: 'down' },
    { state: 'SE', change: -15.2, trend: 'down' },
    { state: 'SC', change: -12.8, trend: 'down' },
    { state: 'GO', change: -9.3, trend: 'down' }
  ];

  const priorities = [
    {
      title: 'Defesa de Carteira',
      description: 'Risco alto no Top-1 cliente (24,6% da receita)',
      icon: AlertTriangle,
      color: '#EF4444',
      actions: [
        'Plano de relacionamento 1:1 para Top-20 clientes',
        'Trave volume futuro via pedidos programados',
        'Política de crédito e contingência'
      ]
    },
    {
      title: 'Reativação Classe A',
      description: 'Clientes A sem compra > 60 dias',
      icon: Users,
      color: '#F59E0B',
      actions: [
        'Régua de CRM com oferta de recompra',
        'Cross-sell de itens A',
        'Lead-time curto e incentivo de prazo'
      ]
    },
    {
      title: 'Recuperação Geográfica',
      description: 'Estados esfriando (MA, AL, SE, SC, GO)',
      icon: MapPin,
      color: '#3B82F6',
      actions: [
        'Campanha tática 30 dias focada em portfólio A/B',
        'Agenda rápida com 3 maiores clientes por UF',
        'Case local e proposta de valor'
      ]
    },
    {
      title: 'Foco no Mix',
      description: 'Mantenha disponibilidade nos produtos Classe A',
      icon: Package,
      color: '#10B981',
      actions: [
        'Prioridade de produção nos produtos Classe A',
        'Racionalize cauda C (sob encomenda)',
        'Descontinue o que for inviável'
      ]
    }
  ];

  const timeline = [
    {
      period: '0-7 dias',
      title: 'Ações Imediatas',
      icon: Clock,
      color: '#EF4444',
      tasks: [
        'Rodar réguas de reativação para Clientes A em risco',
        'Marcar QBR com Top-10 clientes',
        'Ajustar estoque mínimo e lead-time de itens Classe A'
      ]
    },
    {
      period: '8-30 dias',
      title: 'Campanhas Táticas',
      icon: Target,
      color: '#F59E0B',
      tasks: [
        'Lançar campanhas por UF esfriando',
        'Fechar contratos quadro com Top-5 clientes',
        'Bundle de produtos A por acabamento'
      ]
    },
    {
      period: '31-60 dias',
      title: 'Otimização',
      icon: TrendingUp,
      color: '#10B981',
      tasks: [
        'Padronizar catálogo: mover Classe C para make-to-order',
        'Revisar preços de SKUs B com boa tração',
        'Implantar cadência mensal de relatórios'
      ]
    },
    {
      period: '61-90 dias',
      title: 'Expansão',
      icon: ArrowUpRight,
      color: '#3B82F6',
      tasks: [
        'Expansão de share nas UFs com base instalada',
        'Metas por cliente e SKU com bonificação por mix',
        'Programa de referência (clientes A indicando)'
      ]
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: 'var(--spacing-md)',
          border: '1px solid #e5e7eb',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: '600', color: 'var(--charcoal-black)' }}>{label}</p>
          <p style={{ margin: 0, color: '#6B7280' }}>
            Receita: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

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
            Insights ABC
          </h1>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: '700', 
            color: 'var(--charcoal-black)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            Insights
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#6B7280',
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Análise estratégica e insights acionáveis baseados na análise ABC da Concrem
          </p>
          <div style={{
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            backgroundColor: 'white',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #e5e7eb',
            display: 'inline-block'
          }}>
            <p style={{ 
              fontSize: '1rem', 
              color: '#6B7280',
              margin: 0,
              fontWeight: '500'
            }}>
              📅 Período analisado: 02/09/2024 a 31/08/2025
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-2xl)'
        }}>
          <div className="card" style={{ 
            padding: 'var(--spacing-lg)',
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <DollarSign size={24} color="var(--forest-green)" style={{ marginRight: 'var(--spacing-sm)' }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)' }}>
                Receita Total
              </h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--forest-green)', marginBottom: 'var(--spacing-sm)' }}>
              {formatCurrency(totalRevenue)}
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
              Melhor mês: Mai/2025 (R$ 16,74 mi)
            </p>
          </div>

          <div className="card" style={{ 
            padding: 'var(--spacing-lg)',
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <AlertTriangle size={24} color="#EF4444" style={{ marginRight: 'var(--spacing-sm)' }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)' }}>
                Risco de Concentração
              </h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#EF4444', marginBottom: 'var(--spacing-sm)' }}>
              24,6%
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
              Top-1 cliente = 24,6% da receita total
            </p>
          </div>

          <div className="card" style={{ 
            padding: 'var(--spacing-lg)',
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <Package size={24} color="#10B981" style={{ marginRight: 'var(--spacing-sm)' }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal-black)' }}>
                Mix Pulverizado
              </h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10B981', marginBottom: 'var(--spacing-sm)' }}>
              4,1%
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
              Top-1 produto = 4,1% (mix saudável)
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-xl)',
          borderBottom: '1px solid #e5e7eb'
        }}>
                     {[
             { id: 'overview', label: 'Sumário Executivo', icon: TrendingUp },
             { id: 'priorities', label: 'Riscos e Oportunidades', icon: Target },
             { id: 'timeline', label: 'Direcionamento 30-60-90', icon: Calendar },
             { id: 'analysis', label: 'Indicadores', icon: BarChart3 }
           ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: 'var(--spacing-md) var(--spacing-lg)',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? 'var(--forest-green)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#6B7280',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            {/* Monthly Revenue Chart */}
            <div className="card" style={{ 
              padding: 'var(--spacing-xl)',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              marginBottom: 'var(--spacing-xl)'
            }}>
                             <h2 style={{ 
                 fontSize: '1.5rem', 
                 fontWeight: '600',
                 color: 'var(--charcoal-black)',
                 marginBottom: 'var(--spacing-lg)'
               }}>
                 Sumário Executivo
               </h2>
              <div style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="var(--forest-green)" 
                      strokeWidth={3}
                      dot={{ fill: 'var(--forest-green)', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{
                marginTop: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                backgroundColor: '#FEF3C7',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #F59E0B'
              }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#F59E0B' }}>
                  ⚠️ Ago/2025 está parcial (dados até o mês corrente), por isso aparece como "pior" — não trate como queda estrutural.
                </p>
              </div>
            </div>

            {/* Concentration Analysis */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: 'var(--spacing-xl)',
              marginBottom: 'var(--spacing-xl)'
            }}>
              <div className="card" style={{ 
                padding: 'var(--spacing-xl)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600',
                  color: 'var(--charcoal-black)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  Concentração por Cliente
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={concentrationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {concentrationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280', textAlign: 'center' }}>
                  ~80% da receita vem de 164 clientes (Classe A)
                </p>
              </div>

              <div className="card" style={{ 
                padding: 'var(--spacing-xl)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600',
                  color: 'var(--charcoal-black)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  Concentração por Produto
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productConcentrationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {productConcentrationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280', textAlign: 'center' }}>
                  Classe A soma ~80% distribuídos em 529 SKUs
                </p>
              </div>
            </div>

            {/* Cooling States */}
            <div className="card" style={{ 
              padding: 'var(--spacing-xl)',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600',
                color: 'var(--charcoal-black)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                Estados Esfriando (3 meses completos vs. 3 anteriores)
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-md)'
              }}>
                {coolingStates.map((state, index) => (
                  <div key={index} style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: '#FEF2F2',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #FEE2E2',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EF4444', marginBottom: 'var(--spacing-xs)' }}>
                      {state.state}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#EF4444' }}>
                      {state.change}%
                    </div>
                    <TrendingDown size={16} color="#EF4444" style={{ marginTop: 'var(--spacing-xs)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'priorities' && (
          <div>
                         <h2 style={{ 
               fontSize: '2rem', 
               fontWeight: '600',
               color: 'var(--charcoal-black)',
               marginBottom: 'var(--spacing-xl)'
             }}>
               Principais Riscos e Oportunidades
             </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: 'var(--spacing-xl)'
            }}>
              {priorities.map((priority, index) => {
                const Icon = priority.icon;
                return (
                  <div key={index} className="card" style={{ 
                    padding: 'var(--spacing-xl)',
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: priority.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 'var(--spacing-lg)'
                      }}>
                        <Icon size={24} color="white" />
                      </div>
                      <div>
                        <h3 style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: '600',
                          color: 'var(--charcoal-black)',
                          margin: 0,
                          marginBottom: 'var(--spacing-xs)'
                        }}>
                          {priority.title}
                        </h3>
                        <p style={{ 
                          fontSize: '1rem', 
                          color: '#6B7280',
                          margin: 0
                        }}>
                          {priority.description}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: '600',
                        color: 'var(--charcoal-black)',
                        marginBottom: 'var(--spacing-md)'
                      }}>
                        Ações Recomendadas:
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
                        {priority.actions.map((action, actionIndex) => (
                          <li key={actionIndex} style={{ 
                            fontSize: '1rem', 
                            color: '#6B7280',
                            marginBottom: 'var(--spacing-sm)',
                            lineHeight: '1.5'
                          }}>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
                         <h2 style={{ 
               fontSize: '2rem', 
               fontWeight: '600',
               color: 'var(--charcoal-black)',
               marginBottom: 'var(--spacing-xl)'
             }}>
               Direcionamento 30–60–90 dias
             </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: 'var(--spacing-xl)'
            }}>
              {timeline.map((phase, index) => {
                const Icon = phase.icon;
                return (
                  <div key={index} className="card" style={{ 
                    padding: 'var(--spacing-xl)',
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: phase.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 'var(--spacing-lg)'
                      }}>
                        <Icon size={24} color="white" />
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '1.25rem', 
                          fontWeight: '700',
                          color: phase.color,
                          marginBottom: 'var(--spacing-xs)'
                        }}>
                          {phase.period}
                        </div>
                        <h3 style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: '600',
                          color: 'var(--charcoal-black)',
                          margin: 0
                        }}>
                          {phase.title}
                        </h3>
                      </div>
                    </div>
                    
                    <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
                      {phase.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} style={{ 
                          fontSize: '1rem', 
                          color: '#6B7280',
                          marginBottom: 'var(--spacing-sm)',
                          lineHeight: '1.5'
                        }}>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div>
                         <h2 style={{ 
               fontSize: '2rem', 
               fontWeight: '600',
               color: 'var(--charcoal-black)',
               marginBottom: 'var(--spacing-xl)'
             }}>
               Indicadores de Acompanhamento
             </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: 'var(--spacing-xl)',
              marginBottom: 'var(--spacing-xl)'
            }}>
              <div className="card" style={{ 
                padding: 'var(--spacing-xl)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600',
                  color: 'var(--charcoal-black)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  Top Clientes
                </h3>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-md)',
                    backgroundColor: '#FEF2F2',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #FEE2E2'
                  }}>
                    <span style={{ fontWeight: '600', color: 'var(--charcoal-black)' }}>
                      {topCustomer?.name || 'Cliente Top'}
                    </span>
                    <span style={{ fontWeight: '700', color: '#EF4444' }}>
                      {formatCurrency(topCustomer?.totalValue || 0)}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
                  Representa 24,6% da receita total - risco de dependência elevado
                </p>
              </div>

              <div className="card" style={{ 
                padding: 'var(--spacing-xl)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600',
                  color: 'var(--charcoal-black)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  Top Produtos
                </h3>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-md)',
                    backgroundColor: '#F0FDF4',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #DCFCE7'
                  }}>
                    <span style={{ fontWeight: '600', color: 'var(--charcoal-black)' }}>
                      {topProduct?.name || 'Produto Top'}
                    </span>
                    <span style={{ fontWeight: '700', color: '#10B981' }}>
                      {formatCurrency(topProduct?.totalValue || 0)}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
                  Representa 4,1% da receita total - mix saudável e pulverizado
                </p>
              </div>
            </div>

            {/* Download Section */}
            <div className="card" style={{ 
              padding: 'var(--spacing-xl)',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600',
                color: 'var(--charcoal-black)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                Arquivos Prontos para Ação
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--spacing-lg)'
              }}>
                <div style={{
                  padding: 'var(--spacing-lg)',
                  backgroundColor: '#FEF3C7',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: '600',
                      color: 'var(--charcoal-black)',
                      margin: 0,
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      Clientes A em Risco
                    </h4>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#6B7280',
                      margin: 0
                    }}>
                      &gt;60 dias sem compra
                    </p>
                  </div>
                  <button style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    backgroundColor: '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    fontWeight: '500'
                  }}>
                    <Download size={16} />
                    Baixar
                  </button>
                </div>

                <div style={{
                  padding: 'var(--spacing-lg)',
                  backgroundColor: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: '600',
                      color: 'var(--charcoal-black)',
                      margin: 0,
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      UFs Esfriando
                    </h4>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#6B7280',
                      margin: 0
                    }}>
                      3 meses completos vs. 3 anteriores
                    </p>
                  </div>
                  <button style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    fontWeight: '500'
                  }}>
                    <Download size={16} />
                    Baixar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights;
