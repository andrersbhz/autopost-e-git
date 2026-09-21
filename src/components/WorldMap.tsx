import { useEffect, useState, useMemo, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// URL for world map with countries and optionally states/regions
// Using a higher resolution world map that includes more detail
const worldGeoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
// Brazil states GeoJSON for detailed view
const brazilGeoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface OnlineUser {
  id: string;
  coordinates: [number, number]; // [longitude, latitude]
  country: string;
  city?: string;
  state?: string;
}

const WorldMap = () => {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase.rpc('get_online_locations', { p_minutes: 10 });
      if (cancelled || error || !data) return;
      const mapped: OnlineUser[] = (data as Array<{
        id: string; longitude: number | null; latitude: number | null;
        country: string | null; state: string | null; city: string | null;
      }>)
        .filter((row) => typeof row.longitude === 'number' && typeof row.latitude === 'number')
        .map((row) => ({
          id: row.id,
          coordinates: [row.longitude as number, row.latitude as number],
          country: row.country ?? 'Desconhecido',
          state: row.state ?? undefined,
          city: row.city ?? undefined,
        }));
      setUsers(mapped);
    };

    load();
    const interval = window.setInterval(load, 20_000);

    const channel = supabase
      .channel('online_users_map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const continentMarkers = useMemo(() => [
    { name: "América do Sul", coords: [-60, -15] as [number, number] },
    { name: "América do Norte", coords: [-100, 40] as [number, number] },
    { name: "Europa", coords: [15, 50] as [number, number] },
    { name: "África", coords: [20, 0] as [number, number] },
    { name: "Ásia", coords: [100, 35] as [number, number] },
    { name: "Oceania", coords: [135, -25] as [number, number] },
  ], []);

  const countryStats = useMemo(() => {
    const tally = new Map<string, number>();
    users.forEach((u) => tally.set(u.country, (tally.get(u.country) ?? 0) + 1));
    return tally;
  }, [users]);

  const maxCount = useMemo(() => {
    let m = 0;
    countryStats.forEach((c) => { if (c > m) m = c; });
    return m;
  }, [countryStats]);

  const getCountryHeat = (geoName: string): { fill: string; stroke: string; strokeWidth: number } | null => {
    if (!geoName || maxCount === 0) return null;
    // Try direct match and common variants
    let count = countryStats.get(geoName) ?? 0;
    if (count === 0) {
      countryStats.forEach((c, name) => {
        if (name && (name.toLowerCase() === geoName.toLowerCase() || geoName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(geoName.toLowerCase()))) {
          count = Math.max(count, c);
        }
      });
    }
    if (count === 0) return null;
    const intensity = count / maxCount;
    return {
      fill: 'transparent',
      stroke: '#39FF14',
      strokeWidth: 1 + intensity * 1.5,
    };
  };

  const dominantRegion = useMemo(() => {
    if (users.length === 0) return { name: 'Aguardando dados', percentage: 0 };
    const tally = new Map<string, number>();
    users.forEach((u) => tally.set(u.country, (tally.get(u.country) ?? 0) + 1));
    let topName = 'Global';
    let topCount = 0;
    tally.forEach((count, name) => {
      if (count > topCount) { topCount = count; topName = name; }
    });
    return { name: topName, percentage: Math.round((topCount / users.length) * 100) };
  }, [users]);

  return (
    <div 
      ref={mapContainerRef}
      className={`w-full bg-[#020202] overflow-hidden relative perspective-1000 transition-all duration-500 ${
        isFullScreen ? 'fixed inset-0 z-[9999] rounded-0' : 'rounded-xl border border-primary/30 shadow-[0_0_100px_rgba(0,100,255,0.2)]'
      }`}
    >
      {/* 3D Depth effect layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,150,255,0.1),transparent)] pointer-events-none z-10" />
      
      <div className="p-5 border-b border-primary/20 flex items-center justify-between relative z-30 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse shadow-[0_0_20px_#0096ff]" />
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-primary animate-ping opacity-75" />
          </div>
          <div>
            <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground leading-none text-glow-blue">Vortex Real-Time</h3>
            <p className="text-[8px] text-primary/80 uppercase font-black tracking-widest mt-1.5 flex items-center gap-2">
              <span className="h-px w-6 bg-primary/50" /> Monitor de Tráfego 3D
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[7px] font-black text-primary/60 uppercase tracking-widest">Status da Rede</span>
            <span className="text-[10px] font-black text-success uppercase tracking-tighter">{users.length > 0 ? `Estável • ${users.length} Online` : 'Aguardando visitantes'}</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 border border-primary/20 rounded-sm skew-x-[-10deg]">
             <span className="text-[11px] font-black text-white tabular-nums skew-x-[10deg]">{zoom.toFixed(1)}x</span>
          </div>
          <button 
            onClick={toggleFullScreen}
            className="flex items-center justify-center h-8 w-8 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-sm transition-colors text-primary"
            title={isFullScreen ? "Sair da Tela Cheia" : "Expandir para Tela Cheia"}
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      
      <div className={`w-full relative cursor-grab active:cursor-grabbing bg-[linear-gradient(rgba(0,150,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,150,255,0.05)_1px,transparent_1px)] [background-size:40px_40px] overflow-hidden transition-all duration-500 ${
        isFullScreen ? 'h-[calc(100vh-80px)]' : 'h-[600px]'
      }`}>
        {/* Decorative 3D elements */}
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />

        <div className="w-full h-full transform transition-transform duration-700" style={{ transform: 'rotateX(5deg)' }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
              center: [0, 15]
            }}
            className="w-full h-full filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
          >
            <ZoomableGroup 
              zoom={zoom} 
              minZoom={1} 
              maxZoom={40} 
              onMoveEnd={({ zoom }) => setZoom(zoom)}
            >
              <Geographies geography={worldGeoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const heat = getCountryHeat(geo.properties?.name ?? '');
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={heat?.fill ?? "#050505"}
                        stroke={heat?.stroke ?? "rgba(0, 150, 255, 0.5)"}
                        strokeWidth={(heat?.strokeWidth ?? 0.8) / zoom}
                        style={{
                          default: { outline: "none", transition: "all 300ms", filter: heat ? `drop-shadow(0 0 ${4 + (heat.strokeWidth * 4)}px #39FF14)` : 'none' },
                          hover: { fill: heat?.fill ?? "#111", stroke: "#00f6ff", strokeWidth: 1 / zoom, outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {/* Detail Layer: Brazil States (Visible when zoomed in) */}
              {zoom > 3 && (
                <Geographies geography={brazilGeoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="transparent"
                        stroke="rgba(0, 246, 255, 0.3)"
                        strokeWidth={0.4 / zoom}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "rgba(0, 150, 255, 0.05)", outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>
              )}

              {/* Continents Labels (Fade out when zoomed in) */}
              <AnimatePresence>
                {zoom < 3 && continentMarkers.map((cont) => (
                  <Marker key={cont.name} coordinates={cont.coords}>
                    <motion.text
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.15 }}
                      exit={{ opacity: 0 }}
                      textAnchor="middle"
                      className="text-[10px] font-black uppercase tracking-[0.4em] pointer-events-none fill-white select-none"
                      style={{ fontSize: '8px' }}
                    >
                      {cont.name}
                    </motion.text>
                  </Marker>
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {users.map((user) => (
                  <Marker key={user.id} coordinates={user.coordinates}>
                    <motion.g
                      initial={{ scale: 0, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      {/* Vertical line for 3D depth look */}
                      <line x1="0" y1="0" x2="0" y2="-15" stroke="var(--primary)" strokeWidth={0.5 / zoom} strokeDasharray="2,2" opacity="0.4" />
                      
                      {/* Base point */}
                      <circle r={2.5 / zoom} fill="var(--primary)" />
                      
                      {/* Pulsing rings */}
                      <circle r={8 / zoom} fill="var(--primary)" opacity="0.2">
                        <animate attributeName="r" from={1 / zoom} to={15 / zoom} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>

                      {/* Info label - bolinha verde + nome da cidade em destaque */}
                      <motion.g transform={`translate(0, -${22 / zoom})`}>
                         <circle cx={-14 / zoom} cy={-4 / zoom} r={2.4 / zoom} fill="#39FF14" style={{ filter: `drop-shadow(0 0 ${5 / zoom}px #39FF14)` }} className="animate-pulse" />
                         <text
                           textAnchor="start"
                           x={-9 / zoom}
                           y={-1 / zoom}
                           className="font-black uppercase tracking-tight"
                           style={{ fontSize: `${Math.max(9, 13 / Math.sqrt(zoom))}px`, fill: "#fff", paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.9)', strokeWidth: `${2 / Math.sqrt(zoom)}px`, strokeLinejoin: 'round' }}
                         >
                           {user.city || user.state || user.country}
                         </text>
                      </motion.g>

                    </motion.g>
                  </Marker>
                ))}
              </AnimatePresence>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Floating Side Info Panel */}
        <div className="absolute top-6 left-6 z-40 pointer-events-none hidden lg:block">
           <div className="bg-black/60 backdrop-blur-md p-4 border-l-2 border-primary space-y-4 shadow-2xl">
              <div className="space-y-1">
                 <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Região Dominante</p>
                 <p className="text-[14px] font-black text-white uppercase tracking-tighter">{dominantRegion.name}{dominantRegion.percentage > 0 ? ` (${dominantRegion.percentage}%)` : ''}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Visitantes Online</p>
                 <p className="text-[14px] font-black text-success uppercase tracking-tighter">{users.length}</p>
              </div>
           </div>
        </div>

        {/* Control Interface Overlay */}
        <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-2">
           <div className="bg-black/90 backdrop-blur-xl p-5 border border-primary/20 rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.8)] border-b-4 border-b-primary">
              <div className="flex items-center justify-between gap-10 mb-2">
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">Global Reach</span>
                 <span className="text-[14px] font-black text-white tabular-nums">1.2M+</span>
              </div>
              <div className="flex gap-1">
                 {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className={`h-1.5 w-4 rounded-none ${i < 7 ? 'bg-primary' : 'bg-white/10'} ${i === 6 ? 'animate-pulse' : ''}`} />
                 ))}
              </div>
           </div>
        </div>

        {/* Floating HUD Instructions */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
           <div className="flex items-center gap-4 bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full border border-white/5">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-primary" />
                 <span className="text-[8px] font-black text-white/70 uppercase tracking-widest">Zoom Level: {zoom > 3 ? 'Deep Insight' : 'Global View'}</span>
              </div>
              <div className="w-[1px] h-3 bg-white/20" />
              <p className="text-[8px] font-black text-primary uppercase tracking-widest animate-pulse">
                 {zoom > 3 ? 'Visualizando Divisões Estaduais' : 'Aproxime para ver Estados'}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;



