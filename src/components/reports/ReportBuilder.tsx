import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Save, RotateCcw } from 'lucide-react';
import { REPORT_MODULES, getModuleConfig, getChartTypes } from '@/lib/reportModules';
import { ReportFilters } from './ReportFilters';
import { ReportPreview } from './ReportPreview';
import { SaveReportDialog } from './SaveReportDialog';
import { useReportData, useReportChartData } from '@/hooks/useReportData';
import type { ReportConfig, ReportTemplate } from '@/types/reports';

interface ReportBuilderProps {
  initialTemplate?: ReportTemplate;
  companyId: string;
  staffId: string;
  onBack?: () => void;
}

export function ReportBuilder({
  initialTemplate,
  companyId,
  staffId,
  onBack,
}: ReportBuilderProps) {
  const [selectedModule, setSelectedModule] = useState(
    initialTemplate?.module || ''
  );
  const [config, setConfig] = useState<ReportConfig>(
    initialTemplate?.config || {
      columns: [],
      filters: [],
      sortBy: undefined,
      sortOrder: 'desc',
      dateRange: undefined,
      groupBy: undefined,
      chartType: undefined,
    }
  );
  const [showResults, setShowResults] = useState(!!initialTemplate);
  const [page, setPage] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const moduleConfig = selectedModule ? getModuleConfig(selectedModule) : null;

  // Initialize columns when module changes
  useEffect(() => {
    if (moduleConfig && !initialTemplate) {
      setConfig((prev) => ({
        ...prev,
        columns: moduleConfig.defaultColumns,
        filters: [],
        sortBy: moduleConfig.columns.find((c) => c.sortable)?.key,
        groupBy: moduleConfig.filters.find((f) => f.type === 'enum')?.key,
      }));
    }
  }, [moduleConfig, initialTemplate]);

  const { data, metrics, isLoading, refetch } = useReportData({
    module: selectedModule,
    config,
    page,
    pageSize: 50,
    enabled: showResults && !!selectedModule,
  });

  const { data: chartData } = useReportChartData({
    module: selectedModule,
    config,
    enabled: showResults && !!selectedModule && !!config.chartType,
  });

  const handleModuleChange = (module: string) => {
    setSelectedModule(module);
    setShowResults(false);
    setPage(0);
  };

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    setConfig((prev) => ({
      ...prev,
      columns: checked
        ? [...prev.columns, columnKey]
        : prev.columns.filter((c) => c !== columnKey),
    }));
  };

  const handleRun = () => {
    setShowResults(true);
    setPage(0);
    if (showResults) {
      refetch();
    }
  };

  const handleReset = () => {
    if (moduleConfig) {
      setConfig({
        columns: moduleConfig.defaultColumns,
        filters: [],
        sortBy: moduleConfig.columns.find((c) => c.sortable)?.key,
        sortOrder: 'desc',
        dateRange: undefined,
        groupBy: moduleConfig.filters.find((f) => f.type === 'enum')?.key,
        chartType: undefined,
      });
      setShowResults(false);
      setPage(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Builder Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {initialTemplate ? `Edit: ${initialTemplate.name}` : 'Build Custom Report'}
            </CardTitle>
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                ← Back
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Module Selection */}
          <div className="grid gap-2">
            <Label>Data Source</Label>
            <Select value={selectedModule} onValueChange={handleModuleChange}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a module" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_MODULES.map((module) => (
                  <SelectItem key={module.module} value={module.module}>
                    {module.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {moduleConfig && (
            <>
              {/* Column Selection */}
              <div className="space-y-3">
                <Label>Columns to Include</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {moduleConfig.columns.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${column.key}`}
                        checked={config.columns.includes(column.key)}
                        onCheckedChange={(checked) =>
                          handleColumnToggle(column.key, !!checked)
                        }
                      />
                      <label
                        htmlFor={`col-${column.key}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <ReportFilters
                moduleConfig={moduleConfig}
                filters={config.filters}
                onChange={(filters) => setConfig((prev) => ({ ...prev, filters }))}
              />

              {/* Date Range */}
              {moduleConfig.dateFields.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Date Field</Label>
                    <Select
                      value={config.dateRange?.field || '__none__'}
                      onValueChange={(field) =>
                        setConfig((prev) => ({
                          ...prev,
                          dateRange: field !== '__none__'
                            ? { field, start: prev.dateRange?.start || '', end: prev.dateRange?.end || '' }
                            : undefined,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select date field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {moduleConfig.dateFields.map((field) => {
                          const col = moduleConfig.columns.find((c) => c.key === field);
                          return (
                            <SelectItem key={field} value={field}>
                              {col?.label || field}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  {config.dateRange?.field && (
                    <>
                      <div className="grid gap-2">
                        <Label>From</Label>
                        <Input
                          type="date"
                          value={config.dateRange?.start || ''}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              dateRange: {
                                ...prev.dateRange!,
                                start: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>To</Label>
                        <Input
                          type="date"
                          value={config.dateRange?.end || ''}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              dateRange: {
                                ...prev.dateRange!,
                                end: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sorting */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Sort By</Label>
                  <Select
                    value={config.sortBy || ''}
                    onValueChange={(sortBy) =>
                      setConfig((prev) => ({ ...prev, sortBy: sortBy || undefined }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sort field" />
                    </SelectTrigger>
                    <SelectContent>
                      {moduleConfig.columns
                        .filter((c) => c.sortable)
                        .map((col) => (
                          <SelectItem key={col.key} value={col.key}>
                            {col.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Sort Order</Label>
                  <Select
                    value={config.sortOrder || 'desc'}
                    onValueChange={(order) =>
                      setConfig((prev) => ({
                        ...prev,
                        sortOrder: order as 'asc' | 'desc',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Chart Options */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Chart Type (Optional)</Label>
                  <Select
                    value={config.chartType || '__none__'}
                    onValueChange={(chartType) =>
                      setConfig((prev) => ({
                        ...prev,
                        chartType: chartType !== '__none__' ? (chartType as ReportConfig['chartType']) : undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No chart" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Chart</SelectItem>
                      {getChartTypes().map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {config.chartType && (
                  <div className="grid gap-2">
                    <Label>Group By</Label>
                    <Select
                      value={config.groupBy || ''}
                      onValueChange={(groupBy) =>
                        setConfig((prev) => ({ ...prev, groupBy: groupBy || undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grouping field" />
                      </SelectTrigger>
                      <SelectContent>
                        {moduleConfig.filters
                          .filter((f) => f.type === 'enum')
                          .map((filter) => (
                            <SelectItem key={filter.key} value={filter.key}>
                              {filter.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button onClick={handleRun} disabled={config.columns.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={config.columns.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
                <Button variant="ghost" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {showResults && selectedModule && (
        <ReportPreview
          module={selectedModule}
          config={config}
          data={data}
          metrics={metrics}
          chartData={chartData}
          isLoading={isLoading}
          page={page}
          pageSize={50}
          onPageChange={setPage}
          reportName={initialTemplate?.name || 'Custom Report'}
        />
      )}

      {/* Save Dialog */}
      <SaveReportDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        module={selectedModule}
        config={config}
        companyId={companyId}
        staffId={staffId}
      />
    </div>
  );
}
