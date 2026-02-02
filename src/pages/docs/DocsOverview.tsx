import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Users, FileText, Shield, Code, BookOpen, GitBranch, Rocket } from 'lucide-react';

const sections = [
  {
    title: 'ERD',
    description: 'Visual diagram of all database tables and their relationships.',
    icon: GitBranch,
    href: '/docs/erd',
    color: 'text-indigo-500',
  },
  {
    title: 'Future Builds & Roadmap',
    description: 'Upcoming features, improvements, and development priorities.',
    icon: Rocket,
    href: '/docs/future-builds',
    color: 'text-amber-500',
  },
  {
    title: 'Database Schema',
    description: 'Complete reference for all database tables, columns, and relationships.',
    icon: Database,
    href: '/docs/schema',
    color: 'text-blue-500',
  },
  {
    title: 'Role Guides',
    description: 'Role-specific user guides with workflows, features, and best practices.',
    icon: Users,
    href: '/docs/roles/admin',
    color: 'text-green-500',
  },
  {
    title: 'Feature Guides',
    description: 'Detailed documentation for each module and feature in the system.',
    icon: FileText,
    href: '/docs/features/leads',
    color: 'text-purple-500',
  },
  {
    title: 'Security & RLS',
    description: 'Row-level security policies and data access patterns.',
    icon: Shield,
    href: '/docs/rls-policies',
    color: 'text-orange-500',
  },
  {
    title: 'Permissions Matrix',
    description: 'Complete overview of role-based access control.',
    icon: BookOpen,
    href: '/docs/permissions',
    color: 'text-pink-500',
  },
  {
    title: 'Edge Functions',
    description: 'Backend functions and API endpoints documentation.',
    icon: Code,
    href: '/docs/edge-functions',
    color: 'text-cyan-500',
  },
];

export default function DocsOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Documentation</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Comprehensive documentation for the Guardian Litigation Group case management system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.href} to={section.href}>
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className={`h-5 w-5 ${section.color}`} />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Frequently accessed documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <Link to="/docs/roles/admin" className="text-sm text-primary hover:underline">
              → Administrator Guide
            </Link>
            <Link to="/docs/features/leads" className="text-sm text-primary hover:underline">
              → Lead Management
            </Link>
            <Link to="/docs/features/settlements" className="text-sm text-primary hover:underline">
              → Settlement Negotiation
            </Link>
            <Link to="/docs/features/litigation" className="text-sm text-primary hover:underline">
              → Litigation Management
            </Link>
            <Link to="/docs/schema" className="text-sm text-primary hover:underline">
              → Database Schema
            </Link>
            <Link to="/docs/permissions" className="text-sm text-primary hover:underline">
              → Permissions Matrix
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            This case management system is designed for debt settlement law firms. It provides comprehensive 
            tools for managing the entire client lifecycle from lead intake through settlement completion.
          </p>
          
          <h4>Core Modules</h4>
          <ul>
            <li><strong>Leads</strong> - Intake and qualification of potential clients</li>
            <li><strong>Clients</strong> - Client records and contact management</li>
            <li><strong>Services</strong> - Active debt settlement programs</li>
            <li><strong>Liabilities</strong> - Individual debt accounts enrolled in programs</li>
            <li><strong>Settlements</strong> - Negotiated settlement offers and payments</li>
            <li><strong>Litigation</strong> - Legal cases and court proceedings</li>
            <li><strong>Tasks</strong> - Workflow and task management</li>
            <li><strong>Reports</strong> - Analytics and custom reporting</li>
          </ul>

          <h4>Technology Stack</h4>
          <ul>
            <li><strong>Frontend</strong> - React with TypeScript, Tailwind CSS, shadcn/ui</li>
            <li><strong>Backend</strong> - Supabase (PostgreSQL, Auth, Storage, Edge Functions)</li>
            <li><strong>State Management</strong> - TanStack Query for server state</li>
            <li><strong>Charts</strong> - Recharts for data visualization</li>
          </ul>

          <h4>Multi-Tenancy</h4>
          <p>
            The system supports multiple companies with proper data isolation through Row Level Security (RLS).
            Each company's data is completely separated, with optional parent-child relationships for 
            franchise or affiliate structures.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
