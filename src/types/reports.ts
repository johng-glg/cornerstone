// Report type definitions

export interface ReportFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface ReportDateRange {
  field: string;
  start: string;
  end: string;
}

export interface ReportConfig {
  columns: string[];
  filters: ReportFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateRange?: ReportDateRange;
  groupBy?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
}

export interface ReportTemplate {
  id: string;
  company_id: string | null;
  created_by: string | null;
  name: string;
  description: string | null;
  module: string;
  config: ReportConfig;
  is_preset: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportMetrics {
  totalRows: number;
  aggregations?: Record<string, number>;
}
