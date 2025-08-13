import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ABCAnalysisChart = ({ data, title, type = 'bar' }) => {
  const colors = {
    A: '#2D5A3D', // Moss Green
    B: '#D2691E', // Sand Orange
    C: '#B8336A'  // Magenta
  };

  const pieData = [
    { name: 'Classe A', value: data.summary.classA.length, color: colors.A },
    { name: 'Classe B', value: data.summary.classB.length, color: colors.B },
    { name: 'Classe C', value: data.summary.classC.length, color: colors.C }
  ];

  const barData = data.data.slice(0, 15).map(item => ({
    name: item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name,
    value: item.totalValue,
    classification: item.classification,
    percentage: parseFloat(item.percentage),
    fullName: item.name
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontSize: '14px',
          maxWidth: '300px'
        }}>
          <p style={{ 
            margin: '0 0 8px 0', 
            fontWeight: '600', 
            color: 'var(--charcoal-black)',
            fontSize: '16px'
          }}>
            {data.fullName}
          </p>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ fontWeight: '500', color: '#6B7280' }}>Valor: </span>
            <span style={{ fontWeight: '600', color: 'var(--forest-green)' }}>
              R$ {data.value.toLocaleString('pt-BR')}
            </span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ fontWeight: '500', color: '#6B7280' }}>Percentual: </span>
            <span style={{ fontWeight: '600' }}>{data.percentage}%</span>
          </div>
          <div>
            <span style={{ fontWeight: '500', color: '#6B7280' }}>Classificação: </span>
            <span style={{ 
              fontWeight: '600',
              color: 'white',
              backgroundColor: colors[data.classification],
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px'
            }}>
              {data.classification}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontSize: '14px'
        }}>
          <p style={{ 
            margin: '0 0 6px 0', 
            fontWeight: '600', 
            color: 'var(--charcoal-black)'
          }}>
            {data.name}
          </p>
          <p style={{ 
            margin: '0', 
            fontWeight: '500',
            color: 'var(--forest-green)'
          }}>
            {data.value} itens ({(data.payload.percent * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
      <h3 style={{ 
        marginBottom: 'var(--spacing-xl)', 
        color: 'var(--charcoal-black)',
        fontSize: '1.75rem',
        fontWeight: '600',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 350px', 
        gap: 'var(--spacing-xl)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        {/* Bar Chart */}
        <div style={{ 
          height: '500px',
          backgroundColor: '#fafafa',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ 
            margin: '0 0 var(--spacing-md) 0',
            color: 'var(--charcoal-black)',
            fontSize: '1.25rem',
            fontWeight: '500'
          }}>
            Top 15 Itens por Valor
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={11}
                tick={{ fill: '#6B7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="var(--forest-green)"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div style={{ 
          height: '500px',
          backgroundColor: '#fafafa',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ 
            margin: '0 0 var(--spacing-md) 0',
            color: 'var(--charcoal-black)',
            fontSize: '1.25rem',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            Distribuição por Classe
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--spacing-lg)'
      }}>
        <div style={{
          padding: 'var(--spacing-xl)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#86EFAC',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #65A30D'
        }}>
          <h4 style={{ 
            margin: '0 0 var(--spacing-sm) 0', 
            fontSize: '2.5rem',
            fontWeight: '700'
          }}>
            {data.summary.classA.length}
          </h4>
          <p style={{ 
            margin: '0', 
            fontSize: '1.125rem',
            fontWeight: '500',
            opacity: '0.9'
          }}>
            Classe A
          </p>
          <p style={{ 
            margin: 'var(--spacing-sm) 0 0 0', 
            fontSize: '0.875rem',
            opacity: '0.8'
          }}>
            Alta Prioridade
          </p>
        </div>
        
        <div style={{
          padding: 'var(--spacing-xl)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#FDE68A',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #F59E0B'
        }}>
          <h4 style={{ 
            margin: '0 0 var(--spacing-sm) 0', 
            fontSize: '2.5rem',
            fontWeight: '700'
          }}>
            {data.summary.classB.length}
          </h4>
          <p style={{ 
            margin: '0', 
            fontSize: '1.125rem',
            fontWeight: '500',
            opacity: '0.9'
          }}>
            Classe B
          </p>
          <p style={{ 
            margin: 'var(--spacing-sm) 0 0 0', 
            fontSize: '0.875rem',
            opacity: '0.8'
          }}>
            Média Prioridade
          </p>
        </div>
        
        <div style={{
          padding: 'var(--spacing-xl)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#FCA5A5',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #EF4444'
        }}>
          <h4 style={{ 
            margin: '0 0 var(--spacing-sm) 0', 
            fontSize: '2.5rem',
            fontWeight: '700'
          }}>
            {data.summary.classC.length}
          </h4>
          <p style={{ 
            margin: '0', 
            fontSize: '1.125rem',
            fontWeight: '500',
            opacity: '0.9'
          }}>
            Classe C
          </p>
          <p style={{ 
            margin: 'var(--spacing-sm) 0 0 0', 
            fontSize: '0.875rem',
            opacity: '0.8'
          }}>
            Baixa Prioridade
          </p>
        </div>
      </div>
    </div>
  );
};

export default ABCAnalysisChart;
