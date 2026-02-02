import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportConfig, ReportMetrics } from '@/types/reports';
import { getModuleConfig } from '@/lib/reportModules';

interface UseReportDataOptions {
  module: string;
  config: ReportConfig;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

interface ReportDataResult {
  data: Record<string, unknown>[];
  metrics: ReportMetrics;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

type ValidTableName = 'leads' | 'clients' | 'client_services' | 'liabilities' | 'settlements' | 'transactions' | 'litigation_matters';

const TABLE_MAP: Record<string, ValidTableName> = {
  leads: 'leads',
  clients: 'clients',
  services: 'client_services',
  client_services: 'client_services',
  liabilities: 'liabilities',
  settlements: 'settlements',
  transactions: 'transactions',
  litigation: 'litigation_matters',
  litigation_matters: 'litigation_matters',
};

// Apply filters to a query
function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: { field: string; operator: string; value: unknown }[]
) {
  let q = query;
  for (const filter of filters) {
    const { field, operator, value } = filter;
    
    switch (operator) {
      case 'eq':
        q = q.eq(field, value);
        break;
      case 'neq':
        q = q.neq(field, value);
        break;
      case 'gt':
        q = q.gt(field, value);
        break;
      case 'gte':
        q = q.gte(field, value);
        break;
      case 'lt':
        q = q.lt(field, value);
        break;
      case 'lte':
        q = q.lte(field, value);
        break;
      case 'ilike':
        q = q.ilike(field, `%${value}%`);
        break;
      case 'in':
        if (Array.isArray(value)) {
          q = q.in(field, value);
        }
        break;
      case 'is':
        q = q.is(field, null);
        break;
    }
  }
  return q;
}

export function useReportData({
  module,
  config,
  page = 0,
  pageSize = 50,
  enabled = true,
}: UseReportDataOptions): ReportDataResult {
  const moduleConfig = getModuleConfig(module);
  const tableName = TABLE_MAP[moduleConfig?.table || module] || 'leads';

  const query = useQuery({
    queryKey: ['report-data', module, config, page, pageSize],
    queryFn: async () => {
      // Build select columns - always include all selected columns
      const selectColumns = config.columns.length > 0 
        ? config.columns.join(',') 
        : '*';
      
      // Start building the query
      let dbQuery = supabase
        .from(tableName)
        .select(selectColumns, { count: 'exact' });
      
      // Apply filters
      dbQuery = applyFilters(dbQuery, config.filters);
      
      // Apply date range
      if (config.dateRange) {
        const { field, start, end } = config.dateRange;
        if (start) {
          dbQuery = dbQuery.gte(field, start);
        }
        if (end) {
          dbQuery = dbQuery.lte(field, end);
        }
      }
      
      // Apply sorting
      if (config.sortBy) {
        dbQuery = dbQuery.order(config.sortBy, { 
          ascending: config.sortOrder === 'asc' 
        });
      }
      
      // Apply pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      dbQuery = dbQuery.range(from, to);
      
      const { data, error, count } = await dbQuery;
      
      if (error) throw error;
      
      return {
        data: data as unknown as Record<string, unknown>[],
        count: count || 0,
      };
    },
    enabled: enabled && !!module,
  });

  return {
    data: query.data?.data || [],
    metrics: {
      totalRows: query.data?.count || 0,
    },
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

// Get aggregated data for charts
export function useReportChartData({
  module,
  config,
  enabled = true,
}: {
  module: string;
  config: ReportConfig;
  enabled?: boolean;
}) {
  const moduleConfig = getModuleConfig(module);
  const tableName = TABLE_MAP[moduleConfig?.table || module] || 'leads';

  return useQuery({
    queryKey: ['report-chart-data', module, config.groupBy, config.filters, config.dateRange],
    queryFn: async () => {
      if (!config.groupBy) return [];
      
      // Fetch all data for the groupBy field
      let dbQuery = supabase
        .from(tableName)
        .select(config.groupBy);
      
      // Apply filters
      dbQuery = applyFilters(dbQuery, config.filters);
      
      // Apply date range
      if (config.dateRange) {
        const { field, start, end } = config.dateRange;
        if (start) {
          dbQuery = dbQuery.gte(field, start);
        }
        if (end) {
          dbQuery = dbQuery.lte(field, end);
        }
      }
      
      const { data, error } = await dbQuery;
      
      if (error) throw error;
      
      // Group and count the data
      const items = data as unknown as Record<string, unknown>[];
      const grouped: Record<string, number> = {};
      for (const row of items) {
        const key = String(row[config.groupBy!] ?? 'Unknown');
        grouped[key] = (grouped[key] || 0) + 1;
      }
      
      // Convert to chart data format
      return Object.entries(grouped).map(([name, value]) => ({
        name,
        value,
      }));
    },
    enabled: enabled && !!module && !!config.groupBy,
  });
}
