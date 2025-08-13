import React, { useState } from 'react';
import { formatCurrency } from '../utils/abcAnalysis';

const DataTable = ({ data, title }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [sortField, setSortField] = useState('totalValue');
  const [sortDirection, setSortDirection] = useState('desc');

  // Sorting function
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'A': return '#2D5A3D';
      case 'B': return '#D2691E';
      case 'C': return '#B8336A';
      default: return '#6B7280';
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
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
        overflowX: 'auto',
        backgroundColor: '#fafafa',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #e5e7eb'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '1rem'
        }}>
          <thead>
            <tr style={{ 
              backgroundColor: 'var(--forest-green)',
              color: 'white'
            }}>
              <th style={{
                padding: 'var(--spacing-md)',
                textAlign: 'left',
                borderBottom: '2px solid #059669',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }} onClick={() => handleSort('rank')}>
                Rank {getSortIcon('rank')}
              </th>
              <th style={{
                padding: 'var(--spacing-md)',
                textAlign: 'left',
                borderBottom: '2px solid #059669',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }} onClick={() => handleSort('name')}>
                Nome {getSortIcon('name')}
              </th>
              <th style={{
                padding: 'var(--spacing-md)',
                textAlign: 'right',
                borderBottom: '2px solid #059669',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }} onClick={() => handleSort('totalValue')}>
                Valor Total {getSortIcon('totalValue')}
              </th>
              <th style={{
                padding: 'var(--spacing-md)',
                textAlign: 'right',
                borderBottom: '2px solid #059669',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }} onClick={() => handleSort('percentage')}>
                Percentual {getSortIcon('percentage')}
              </th>
              <th style={{
                padding: 'var(--spacing-md)',
                textAlign: 'right',
                borderBottom: '2px solid #059669',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }} onClick={() => handleSort('cumulativePercentage')}>
                Percentual Acumulado {getSortIcon('cumulativePercentage')}
              </th>
              <th style={{
                padding: 'var(--spacing-md)',
                textAlign: 'center',
                borderBottom: '2px solid #059669',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }} onClick={() => handleSort('classification')}>
                Classificação {getSortIcon('classification')}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index) => (
              <tr key={index} style={{
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                transition: 'background-color 0.2s ease',
                cursor: 'pointer',
                ':hover': { backgroundColor: '#f3f4f6' }
              }}
              onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb'}>
                <td style={{ 
                  padding: 'var(--spacing-md)', 
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: 'var(--charcoal-black)'
                }}>
                  #{item.rank}
                </td>
                <td style={{ 
                  padding: 'var(--spacing-md)',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: 'var(--charcoal-black)',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.name}
                </td>
                <td style={{ 
                  padding: 'var(--spacing-md)', 
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--forest-green)'
                }}>
                  {formatCurrency(item.totalValue)}
                </td>
                <td style={{ 
                  padding: 'var(--spacing-md)', 
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#6B7280'
                }}>
                  {item.percentage}%
                </td>
                <td style={{ 
                  padding: 'var(--spacing-md)', 
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#6B7280'
                }}>
                  {item.cumulativePercentage}%
                </td>
                <td style={{ 
                  padding: 'var(--spacing-md)', 
                  textAlign: 'center'
                }}>
                  <span style={{
                    backgroundColor: getClassificationColor(item.classification),
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    {item.classification}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'var(--spacing-xl)',
          paddingTop: 'var(--spacing-lg)',
          borderTop: '2px solid #e5e7eb',
          backgroundColor: '#fafafa',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ 
            fontSize: '1rem', 
            color: '#6B7280',
            fontWeight: '500'
          }}>
            Mostrando {startIndex + 1} a {Math.min(endIndex, sortedData.length)} de {sortedData.length} resultados
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                border: '1px solid #d1d5db',
                borderRadius: 'var(--radius-md)',
                backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                color: currentPage === 1 ? '#9ca3af' : 'var(--charcoal-black)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                ':hover': currentPage !== 1 ? {
                  backgroundColor: '#f9fafb',
                  borderColor: '#9ca3af'
                } : {}
              }}
            >
              ← Anterior
            </button>
            
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    border: '1px solid #d1d5db',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: currentPage === pageNum ? 'var(--forest-green)' : 'white',
                    color: currentPage === pageNum ? 'white' : 'var(--charcoal-black)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    ':hover': currentPage !== pageNum ? {
                      backgroundColor: '#f9fafb',
                      borderColor: 'var(--forest-green)'
                    } : {}
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                border: '1px solid #d1d5db',
                borderRadius: 'var(--radius-md)',
                backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                color: currentPage === totalPages ? '#9ca3af' : 'var(--charcoal-black)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                ':hover': currentPage !== totalPages ? {
                  backgroundColor: '#f9fafb',
                  borderColor: '#9ca3af'
                } : {}
              }}
            >
              Próximo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
