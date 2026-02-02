import { DATABASE_SCHEMAS } from '@/lib/docs/schemaData';
import { TableSchemaCard } from '@/components/docs/TableSchemaCard';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function SchemaPage() {
  const [search, setSearch] = useState('');
  
  const filteredSchemas = DATABASE_SCHEMAS.filter(schema => 
    schema.name.toLowerCase().includes(search.toLowerCase()) ||
    schema.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Schema</h1>
        <p className="text-muted-foreground mt-2">
          Complete reference for all database tables, columns, types, and relationships.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {filteredSchemas.map((schema) => (
          <TableSchemaCard key={schema.name} schema={schema} />
        ))}
      </div>

      {filteredSchemas.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No tables found matching "{search}"
        </p>
      )}
    </div>
  );
}
