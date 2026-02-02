import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LeadRepMetric } from '@/hooks/useLeadMetrics';

interface LeadRepMetricsTableProps {
  metrics: LeadRepMetric[];
}

type SortKey = 'name' | 'total_assigned' | 'contact_ratio' | 'conversion_ratio' | 'avg_hours_to_contact' | 'avg_days_to_convert';

export function LeadRepMetricsTable({ metrics }: LeadRepMetricsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total_assigned');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortKey) {
      case 'name':
        aVal = `${a.first_name} ${a.last_name}`;
        bVal = `${b.first_name} ${b.last_name}`;
        break;
      case 'total_assigned':
        aVal = a.total_assigned;
        bVal = b.total_assigned;
        break;
      case 'contact_ratio':
        aVal = a.contact_ratio || 0;
        bVal = b.contact_ratio || 0;
        break;
      case 'conversion_ratio':
        aVal = a.conversion_ratio || 0;
        bVal = b.conversion_ratio || 0;
        break;
      case 'avg_hours_to_contact':
        aVal = a.avg_hours_to_contact || 999;
        bVal = b.avg_hours_to_contact || 999;
        break;
      case 'avg_days_to_convert':
        aVal = a.avg_days_to_convert || 999;
        bVal = b.avg_days_to_convert || 999;
        break;
      default:
        return 0;
    }

    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return sortAsc ? aVal - (bVal as number) : (bVal as number) - aVal;
  });

  const formatPercent = (ratio: number | null) => {
    if (ratio === null || isNaN(ratio)) return '0%';
    return `${Math.round(ratio * 100)}%`;
  };

  const getPerformanceBadge = (ratio: number | null) => {
    const value = ratio || 0;
    if (value >= 0.6) return <Badge variant="default" className="bg-green-600">High</Badge>;
    if (value >= 0.3) return <Badge variant="secondary">Avg</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const SortableHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3 font-medium"
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (metrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No rep metrics available
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortableHeader label="Rep" sortKeyName="name" /></TableHead>
            <TableHead className="text-right"><SortableHeader label="Leads" sortKeyName="total_assigned" /></TableHead>
            <TableHead className="text-right"><SortableHeader label="Contact %" sortKeyName="contact_ratio" /></TableHead>
            <TableHead className="text-right"><SortableHeader label="Conversion %" sortKeyName="conversion_ratio" /></TableHead>
            <TableHead className="text-right"><SortableHeader label="Hrs to Contact" sortKeyName="avg_hours_to_contact" /></TableHead>
            <TableHead className="text-right"><SortableHeader label="Days to Convert" sortKeyName="avg_days_to_convert" /></TableHead>
            <TableHead className="text-center">Performance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMetrics.map((rep) => (
            <TableRow key={rep.staff_id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={rep.avatar_url || undefined} />
                    <AvatarFallback>
                      {rep.first_name?.[0]}{rep.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {rep.first_name} {rep.last_name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">{rep.total_assigned}</TableCell>
              <TableCell className="text-right">{formatPercent(rep.contact_ratio)}</TableCell>
              <TableCell className="text-right font-medium">{formatPercent(rep.conversion_ratio)}</TableCell>
              <TableCell className="text-right">
                {rep.avg_hours_to_contact !== null ? `${rep.avg_hours_to_contact}h` : '—'}
              </TableCell>
              <TableCell className="text-right">
                {rep.avg_days_to_convert !== null ? `${rep.avg_days_to_convert}d` : '—'}
              </TableCell>
              <TableCell className="text-center">
                {getPerformanceBadge(rep.conversion_ratio)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
