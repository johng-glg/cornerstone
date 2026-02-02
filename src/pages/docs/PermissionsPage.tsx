import { PermissionsMatrix } from '@/components/docs/PermissionsMatrix';

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permissions</h1>
        <p className="text-muted-foreground mt-2">
          Role-based access control matrix showing what each role can do in each module.
        </p>
      </div>

      <PermissionsMatrix />
    </div>
  );
}
