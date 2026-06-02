import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notificationKeys } from "./useDomains";

/**
 * Subscribes to realtime changes on public.notifications and refetches the list when one
 * arrives. No-op if the table isn't in the Supabase realtime publication (the channel simply
 * never fires), so it's safe to always mount.
 */
export function useRealtimeNotifications() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () =>
        qc.invalidateQueries({ queryKey: notificationKeys.all }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
