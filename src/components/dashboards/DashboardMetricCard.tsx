import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  href?: string;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
  className?: string;
}

const variantStyles = {
  default: 'border-border',
  warning: 'border-l-4 border-l-yellow-500',
  success: 'border-l-4 border-l-green-500',
  destructive: 'border-l-4 border-l-destructive',
};

export function DashboardMetricCard({
  title,
  value,
  subtitle,
  icon,
  href,
  variant = 'default',
  className,
}: DashboardMetricCardProps) {
  const content = (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {href && (
          <Link 
            to={href} 
            className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );

  return content;
}
