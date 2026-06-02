import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Cross-module quick search over the entities that have detail pages.

export interface SearchHit {
  id: string;
  label: string;
  sublabel: string;
  to: string;
}
export interface SearchGroup {
  group: string;
  items: SearchHit[];
}

export function useGlobalSearch(term: string): UseQueryResult<SearchGroup[], Error> {
  const clean = term
    .trim()
    .replace(/[,()*%]/g, " ")
    .trim();
  return useQuery({
    queryKey: ["global_search", clean],
    enabled: clean.length >= 2,
    queryFn: async () => {
      const like = `%${clean}%`;
      const nameOr = `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`;
      const [leads, clients, matters] = await Promise.all([
        supabase.from("leads").select("id, first_name, last_name, email").or(nameOr).limit(5),
        supabase.from("clients").select("id, first_name, last_name, email").or(nameOr).limit(5),
        supabase
          .from("litigation_matters")
          .select("id, case_number, opposing_party, court_name")
          .or(`case_number.ilike.${like},opposing_party.ilike.${like}`)
          .limit(5),
      ]);

      const groups: SearchGroup[] = [];
      const ld = (leads.data ?? []) as {
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
      }[];
      if (ld.length)
        groups.push({
          group: "Leads",
          items: ld.map((l) => ({
            id: l.id,
            label: `${l.first_name} ${l.last_name}`,
            sublabel: l.email ?? "",
            to: `/leads/${l.id}`,
          })),
        });
      const cl = (clients.data ?? []) as {
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
      }[];
      if (cl.length)
        groups.push({
          group: "Clients",
          items: cl.map((c) => ({
            id: c.id,
            label: `${c.first_name} ${c.last_name}`,
            sublabel: c.email ?? "",
            to: `/clients/${c.id}`,
          })),
        });
      const mt = (matters.data ?? []) as {
        id: string;
        case_number: string | null;
        opposing_party: string | null;
        court_name: string | null;
      }[];
      if (mt.length)
        groups.push({
          group: "Litigation",
          items: mt.map((m) => ({
            id: m.id,
            label: m.case_number ?? m.opposing_party ?? "Matter",
            sublabel: m.court_name ?? m.opposing_party ?? "",
            to: `/litigation/${m.id}`,
          })),
        });
      return groups;
    },
  });
}
