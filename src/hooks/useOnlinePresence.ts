import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GeoData {
  longitude: number;
  latitude: number;
  country?: string;
  state?: string;
  city?: string;
}

const STORAGE_KEY = "presence_user_id";
const GEO_CACHE_KEY = "presence_geo_cache";
const PING_INTERVAL = 60_000; // 1 min

const getOrCreateUserId = () => {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + "-" + Date.now();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
};

const fetchGeo = async (): Promise<GeoData | null> => {
  // Cache geo for the session to avoid hammering the public API
  const cached = sessionStorage.getItem(GEO_CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached) as GeoData; } catch { /* ignore */ }
  }
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.longitude !== "number" || typeof data.latitude !== "number") return null;
    const geo: GeoData = {
      longitude: data.longitude,
      latitude: data.latitude,
      country: data.country_name ?? undefined,
      state: data.region_code ?? data.region ?? undefined,
      city: data.city ?? undefined,
    };
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
    return geo;
  } catch {
    return null;
  }
};

export const useOnlinePresence = () => {
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const ping = async () => {
      const geo = await fetchGeo();
      if (!geo || cancelled) return;
      const userId = getOrCreateUserId();
      await supabase.rpc("update_online_status", {
        p_user_id: userId,
        p_longitude: geo.longitude,
        p_latitude: geo.latitude,
        p_country: geo.country ?? null,
        p_state: geo.state ?? null,
        p_city: geo.city ?? null,
      });
      const HISTORY_FLAG = "presence_history_saved";
      if (!sessionStorage.getItem(HISTORY_FLAG)) {
        await supabase.rpc("record_visitor_history", {
          p_user_id: userId,
          p_longitude: geo.longitude,
          p_latitude: geo.latitude,
          p_country: geo.country ?? null,
          p_state: geo.state ?? null,
          p_city: geo.city ?? null,
        });
        sessionStorage.setItem(HISTORY_FLAG, "1");
      }
    };

    ping();
    timer = window.setInterval(ping, PING_INTERVAL);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);
};
