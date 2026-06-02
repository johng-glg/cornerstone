import { Routes, Route, Navigate } from "react-router-dom";
import { DocsLayout } from "./DocsLayout";
import {
  DocsOverview,
  ERDPage,
  SchemaPage,
  EnumsPage,
  FunctionsPage,
  EdgeFunctionsPage,
  RLSPoliciesPage,
  PermissionsPage,
  RoleGuidePage,
  StoragePage,
  SecurityPage,
  FeatureGuidePage,
  IntegrationsPage,
  FutureBuildPage,
} from "./DocsPages";

/**
 * The in-app Developer/Docs portal. Mounted at `/docs/*` as a single lazy chunk; nested routes
 * render inside the shared DocsLayout (section rail + body). All content is reference material
 * sourced from docsData.tsx.
 */
export default function DocsPortal() {
  return (
    <DocsLayout>
      <Routes>
        <Route index element={<DocsOverview />} />
        <Route path="erd" element={<ERDPage />} />
        <Route path="schema" element={<SchemaPage />} />
        <Route path="enums" element={<EnumsPage />} />
        <Route path="functions" element={<FunctionsPage />} />
        <Route path="edge-functions" element={<EdgeFunctionsPage />} />
        <Route path="rls-policies" element={<RLSPoliciesPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="roles/:role" element={<RoleGuidePage />} />
        <Route path="roles" element={<Navigate to="/docs/roles/admin" replace />} />
        <Route path="storage" element={<StoragePage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="features/:feature" element={<FeatureGuidePage />} />
        <Route path="features" element={<Navigate to="/docs/features/leads" replace />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="future-builds" element={<FutureBuildPage />} />
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Routes>
    </DocsLayout>
  );
}
