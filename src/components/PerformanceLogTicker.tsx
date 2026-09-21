import { useEffect, useState, useRef } from 'react';
import { getPerformanceLogs } from '@/lib/performance';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

export const PerformanceLogTicker = () => {
  const [logs, setLogs] = useState(getPerformanceLogs());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleLogAdded = () => {
      setLogs(getPerformanceLogs());
    };
    window.addEventListener('performance-log-added', handleLogAdded);
    return () => window.removeEventListener('performance-log-added', handleLogAdded);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] h-6 bg-background/80 backdrop-blur-md border-t border-primary/20 flex items-center px-4 overflow-hidden select-none pointer-events-none">
      <div className="flex items-center gap-2 mr-4 shrink-0">
        <Activity className="h-3 w-3 text-primary animate-pulse" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">System Logs:</span>
      </div>
      <div className="flex-1 overflow-hidden relative h-full">
        <div className="flex items-center gap-6 animate-marquee whitespace-nowrap h-full">
          {logs.slice(-5).map((log, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground font-mono">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className="text-[10px] text-foreground font-medium uppercase tracking-tight">{log.label}</span>
              <span className={cn(
                "text-[10px] font-black",
                log.duration > 800 ? "text-destructive" : log.duration > 400 ? "text-warning" : "text-success"
              )}>
                {log.duration}ms
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
