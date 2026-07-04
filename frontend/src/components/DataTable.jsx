import React, { useState, useMemo, useCallback } from 'react';

const DataTable = ({ 
  columns = [], 
  data = [], 
  searchField, 
  filterField, 
  filterOptions = [], 
  rowKey = 'id' // Enforcing a stable unique key identifier
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortConfig, setSortConfig] = useState(null);

  // 1. Memoized and Secured CSV Export
  const handleExportCSV = useCallback(() => {
    if (!data || data.length === 0) return;

    const headers = columns.map(col => col.header).join(',');
    
    const rows = data.map(row => 
      columns.map(col => {
        let cellValue = String(row[col.accessor] ?? '');
        
        // Security: Mitigate CSV Injection (CWE-123) by escaping executable prefixes
        if (/^[=+\-@]/.test(cellValue)) {
          cellValue = `'${cellValue}`; 
        }
        
        // Escape double quotes inside the string
        return `"${cellValue.replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    
    // Performance: Use Blob instead of data URI to handle large CRM datasets
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", blobUrl);
    link.setAttribute("download", `Mayzax_Export_${new Date().toISOString().split('T')[0]}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl); // Prevent memory leaks
  }, [data, columns]);

  // 2. Memoized Sort Handler
  const handleSort = useCallback((accessor) => {
    setSortConfig(prevConfig => {
      let direction = 'ascending';
      if (prevConfig?.key === accessor && prevConfig.direction === 'ascending') {
        direction = 'descending';
      }
      return { key: accessor, direction };
    });
  }, []);

  // 3. Memoized Processing Pipeline (Prevents UI stuttering on re-renders)
  const processedData = useMemo(() => {
    let result = [...data];

    if (searchTerm && searchField) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(row => {
        const targetValue = String(row[searchField] ?? '').toLowerCase();
        return targetValue.includes(lowerSearch);
      });
    }

    if (filterValue && filterField) {
      result = result.filter(row => String(row[filterField]) === filterValue);
    }

    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aVal = a[key] ?? '';
        const bVal = b[key] ?? '';
        
        if (aVal < bVal) return direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchField, searchTerm, filterField, filterValue, sortConfig]);

  return (
    <div className="space-y-4">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-1 items-center space-x-3">
          {searchField && (
            <input
              type="text"
              placeholder={`Search by ${searchField}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none w-full max-w-xs"
              aria-label={`Search table by ${searchField}`}
            />
          )}
          
          {filterField && filterOptions.length > 0 && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
              aria-label={`Filter table by ${filterField}`}
            >
              <option value="">All Statuses</option>
              {filterOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
        
        <button
          onClick={handleExportCSV}
          disabled={!data || data.length === 0}
          className="px-4 py-1.5 bg-brand-accent text-brand-dark hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-lg text-xs tracking-wide uppercase shadow-sm transition-colors"
        >
          Export Data Ledger
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {columns.map(col => (
                <th key={col.accessor || col.header} className="p-0">
                  <button
                    type="button"
                    onClick={() => handleSort(col.accessor)}
                    className="w-full px-6 py-3 text-left flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary"
                    aria-sort={sortConfig?.key === col.accessor ? sortConfig.direction : 'none'}
                  >
                    <span>{col.header}</span>
                    {sortConfig?.key === col.accessor && (
                      <span aria-hidden="true" className="text-brand-primary">
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  No operational metrics matched your criteria.
                </td>
              </tr>
            ) : (
              processedData.map((row) => (
                <tr key={row[rowKey]} className="hover:bg-slate-50 transition-colors">
                  {columns.map(col => (
                    <td key={`${row[rowKey]}-${col.accessor}`} className="px-6 py-3.5 whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;