// Export utilities for CSV
import type { ColumnConfig } from './reportModules';

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Check if value needs escaping (contains comma, quote, or newline)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

function formatCellValue(value: unknown, type: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'currency':
      return typeof value === 'number' ? value.toFixed(2) : String(value);
    case 'date':
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      return String(value).split('T')[0];
    case 'datetime':
      if (value instanceof Date) {
        return value.toISOString();
      }
      return String(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
}

export function exportToCSV(
  data: Record<string, unknown>[],
  columns: ColumnConfig[],
  filename: string
): void {
  // Create header row
  const headers = columns.map(col => escapeCSVValue(col.label));
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return columns
      .map(col => {
        const value = row[col.key];
        const formattedValue = formatCellValue(value, col.type);
        return escapeCSVValue(formattedValue);
      })
      .join(',');
  });
  
  // Combine all rows
  const csvContent = [headerRow, ...dataRows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function generateReportSummary(
  reportName: string,
  filters: { field: string; operator: string; value: unknown }[],
  dateRange?: { field: string; start: string; end: string }
): string {
  const parts: string[] = [reportName];
  
  if (dateRange) {
    parts.push(`Date Range: ${dateRange.start} to ${dateRange.end}`);
  }
  
  if (filters.length > 0) {
    const filterStr = filters
      .map(f => `${f.field} ${f.operator} ${f.value}`)
      .join(', ');
    parts.push(`Filters: ${filterStr}`);
  }
  
  return parts.join(' | ');
}
