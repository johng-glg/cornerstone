import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Plus, 
  MoreHorizontal, 
  Play, 
  Pencil, 
  Trash2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { PresetReportCard } from '@/components/reports/PresetReportCard';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { usePresetReports, useSavedReports, useDeleteReportTemplate } from '@/hooks/useReportTemplates';
import { useAuth } from '@/lib/auth';
import { useStaff } from '@/hooks/useStaff';
import type { ReportTemplate } from '@/types/reports';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewMode = 'list' | 'builder';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('presets');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const { user } = useAuth();
  const { data: staff } = useStaff();
  const currentStaff = staff?.find((s) => s.user_id === user?.id);
  
  const { data: presetReports, isLoading: presetsLoading } = usePresetReports();
  const { data: savedReports, isLoading: savedLoading } = useSavedReports();
  const deleteTemplate = useDeleteReportTemplate();

  const handleRunReport = (report: ReportTemplate) => {
    setSelectedTemplate(report);
    setViewMode('builder');
  };

  const handleNewReport = () => {
    setSelectedTemplate(undefined);
    setActiveTab('custom');
    setViewMode('builder');
  };

  const handleBackToList = () => {
    setSelectedTemplate(undefined);
    setViewMode('list');
  };

  const handleDeleteClick = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  // Show builder mode
  if (viewMode === 'builder') {
    return (
      <div className="p-6 space-y-6">
        <ReportBuilder
          initialTemplate={selectedTemplate}
          companyId={currentStaff?.company_id || ''}
          staffId={currentStaff?.id || ''}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground">
              Generate and analyze data across all modules
            </p>
          </div>
        </div>
        <Button onClick={handleNewReport}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="presets">Pre-set Reports</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="custom">Build Custom</TabsTrigger>
        </TabsList>

        {/* Pre-set Reports Tab */}
        <TabsContent value="presets" className="mt-6">
          {presetsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : presetReports && presetReports.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {presetReports.map((report) => (
                <PresetReportCard
                  key={report.id}
                  report={report}
                  onRun={handleRunReport}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pre-set reports available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Saved Reports Tab */}
        <TabsContent value="saved" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved Report Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {savedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : savedReports && savedReports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Shared</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{report.name}</p>
                            {report.description && (
                              <p className="text-sm text-muted-foreground">
                                {report.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.module.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.is_public ? (
                            <Badge variant="secondary">Team</Badge>
                          ) : (
                            <Badge variant="outline">Private</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.updated_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRunReport(report)}>
                                <Play className="h-4 w-4 mr-2" />
                                Run Report
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRunReport(report)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteClick(report.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved reports yet</p>
                  <p className="text-sm mt-1">
                    Build a custom report and save it as a template
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleNewReport}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Build Custom Tab */}
        <TabsContent value="custom" className="mt-6">
          <ReportBuilder
            companyId={currentStaff?.company_id || ''}
            staffId={currentStaff?.id || ''}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
