import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReportChart } from './ReportChart';
import { getModuleConfig, type ColumnConfig } from '@/lib/reportModules';
import { exportToCSV } from '@/lib/reportExport';
import type { ReportConfig, ReportMetrics } from '@/types/reports';

interface ReportPreviewProps {
  module: string;
  config: ReportConfig;
  data: Record<string, unknown>[];
  metrics: ReportMetrics;
  chartData?: { name: string; value: number }[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  reportName?: string;
}

export function ReportPreview({
  module,
  config,
  data,
  metrics,
  chartData,
  isLoading,
  page,
  pageSize,
  onPageChange,
  reportName = 'Report',
}: ReportPreviewProps) {
  const moduleConfig = getModuleConfig(module);

  const getColumnConfig = (key: string): ColumnConfig | undefined => {
    return moduleConfig?.columns.find((c) => c.key === key);
  };

  const formatCellValue = (value: unknown, type: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Number(value));

      case 'date':
        try {
          return format(new Date(String(value)), 'MMM d, yyyy');
        } catch {
          return String(value);
        }

      case 'datetime':
        try {
          return format(new Date(String(value)), 'MMM d, yyyy h:mm a');
        } catch {
          return String(value);
        }

      case 'boolean':
        return value ? (
          <Badge variant="default">Yes</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        );

      case 'enum':
        return (
          <Badge variant="outline">
            {String(value).replace(/_/g, ' ')}
          </Badge>
        );

      default:
        return String(value);
    }
  };

  const handleExport = () => {
    const columns = config.columns
      .map((key) => getColumnConfig(key))
      .filter((c): c is ColumnConfig => !!c);
    
    exportToCSV(data, columns, reportName.replace(/\s+/g, '-').toLowerCase());
  };

  const totalPages = Math.ceil(metrics.totalRows / pageSize);
  const startRow = page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, metrics.totalRows);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {metrics.totalRows.toLocaleString()} Records
          </Badge>
          {config.filters.length > 0 && (
            <Badge variant="outline" className="text-sm">
              {config.filters.length} Filter{config.filters.length > 1 ? 's' : ''} Applied
            </Badge>
          )}
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Chart */}
      {config.chartType && chartData && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Distribution by {config.groupBy?.replace(/_/g, ' ')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportChart
              data={chartData}
              chartType={config.chartType}
            />
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data found matching your criteria
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {config.columns.map((columnKey) => {
                        const colConfig = getColumnConfig(columnKey);
                        return (
                          <TableHead key={columnKey}>
                            {colConfig?.label || columnKey}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {config.columns.map((columnKey) => {
                          const colConfig = getColumnConfig(columnKey);
                          return (
                            <TableCell key={columnKey}>
                              {formatCellValue(
                                row[columnKey],
                                colConfig?.type || 'text'
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {startRow} to {endRow} of {metrics.totalRows.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(page - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(page + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
