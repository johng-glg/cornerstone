import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { DOC_SECTIONS } from "./docsData";
import { cn } from "@/lib/utils";

/** Shared chrome for every docs page: a section rail plus the page body. */
export function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Developer Documentation</h1>
        <p className="text-sm text-muted-foreground">
          Reference for Cornerstone's schema, security model, and product modules.
        </p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {DOC_SECTIONS.map((s) => (
              <NavLink
                key={s.href}
                to={s.href}
                end={s.href === "/docs"}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-guardian-navy font-medium text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <s.icon className="h-4 w-4 shrink-0" />
                {s.title}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** Standard page header inside a docs page. */
export function DocsHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
    </div>
  );
}
