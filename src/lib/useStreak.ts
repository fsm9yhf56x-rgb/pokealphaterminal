"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

export interface StreakData {
  current: number;
  longest: number;
  totalVisits: number;
  lastVisit: string | null;
}

/**
 * Streak de visites persiste en Neon (table user_streaks), lie au compte.
 * Remplace l'ancien localStorage pka_streak_v1.
 *
 * Au montage (et au changement d'utilisateur), POST /api/streak :
 *   - enregistre la visite du jour (calcul consecutif fait cote serveur)
 *   - renvoie l'etat a jour
 *
 * Renvoie null tant qu'on n'a pas de donnees, ou si l'utilisateur est
 * deconnecte (le streak est masque dans ce cas).
 */
export function useStreak() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pas connecte → pas de streak (on masque)
    if (authLoading) return;
    if (!user?.id) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/streak", { method: "POST" });
        if (!res.ok) throw new Error(`streak ${res.status}`);
        const json = (await res.json()) as StreakData;
        if (!cancelled) setData(json);
      } catch {
        // Echec silencieux : le streak n'est pas critique, on masque
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return { data, loading };
}
