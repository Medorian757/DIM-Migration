import { useEffect, useState } from "react";
import { dim as base44 } from "@/api/dimDataClient";

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // "admin" = full access. "staff" = view + update counts only.
  const isAdmin = user?.role === "admin";

  return { user, isAdmin, loading };
}