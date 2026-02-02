import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Rocket, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { FUTURE_BUILDS, getRoadmapCategories, type RoadmapItem } from '@/lib/docs/roadmapData';

const priorityColors = {
  High: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusIcons = {
  Planned: Clock,
  'In Progress': Rocket,
  Research: AlertCircle,
  Completed: CheckCircle,
};

const statusColors = {
  Planned: 'text-muted-foreground',
  'In Progress': 'text-info',
  Research: 'text-warning',
  Completed: 'bg-success text-success-foreground px-2 py-0.5 rounded-full font-medium',
};

function FeatureCard({ item }: { item: RoadmapItem }) {
  const StatusIcon = statusIcons[item.status];
  
  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{item.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={priorityColors[item.priority]}>
              {item.priority}
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 ${statusColors[item.status]}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {item.status}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
        {item.notes && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
            {item.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function FutureBuildPage() {
  const [search, setSearch] = useState('');
  const categories = getRoadmapCategories();
  
  const filteredItems = FUTURE_BUILDS.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const sortByStatus = (items: RoadmapItem[]) => {
    const statusOrder = { 'In Progress': 0, 'Research': 1, 'Planned': 2, 'Completed': 3 };
    return [...items].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  };

  const getItemsByCategory = (category: string) =>
    sortByStatus(filteredItems.filter(item => item.category === category));

  const highPriorityItems = sortByStatus(filteredItems.filter(item => item.priority === 'High'));
  const inProgressItems = filteredItems.filter(item => item.status === 'In Progress' || item.status === 'Research');
  const sortedFilteredItems = sortByStatus(filteredItems);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Future Builds</h1>
        <p className="text-muted-foreground mt-2">
          Planned features and enhancements for the system. Items are prioritized and categorized for implementation.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search features..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Features</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{FUTURE_BUILDS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{highPriorityItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress / Research</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{inProgressItems.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="high-priority">High Priority</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {sortedFilteredItems.map(item => (
              <FeatureCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="high-priority" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {highPriorityItems.map(item => (
              <FeatureCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {getItemsByCategory(category).map(item => (
                <FeatureCard key={item.id} item={item} />
              ))}
            </div>
            {getItemsByCategory(category).length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No features found in this category matching your search.
              </p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
