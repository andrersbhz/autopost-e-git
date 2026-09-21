import { toast } from "@/hooks/use-toast";

type PerformanceLog = {
  label: string;
  duration: number;
  timestamp: string;
};

const logs: PerformanceLog[] = [];
const SLOW_QUERY_THRESHOLD = 800; // ms

export const monitorPerformance = async <T>(label: string, task: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  try {
    const result = await task();
    const duration = Math.round(performance.now() - start);
    
    const log = {
      label,
      duration,
      timestamp: new Date().toISOString()
    };
    
    logs.push(log);
    window.dispatchEvent(new CustomEvent('performance-log-added', { detail: log }));
    
    // Alert on slow queries (logged only, no toast to avoid annoyance)
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`[Performance Alert] "${label}" took ${duration}ms (limit: ${SLOW_QUERY_THRESHOLD}ms).`);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${label}: ${duration}ms`);
    }
    
    // Keep only last 100 logs
    if (logs.length > 100) logs.shift();
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error(`[Performance Error] ${label} failed after ${duration}ms`, error);
    throw error;
  }
};


export const getPerformanceLogs = () => [...logs];

export const exportLogsToCSV = () => {
  if (logs.length === 0) return;
  
  const headers = ["Label", "Duration (ms)", "Timestamp"];
  const csvContent = [
    headers.join(","),
    ...logs.map(log => `"${log.label}",${log.duration},"${log.timestamp}"`)
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `performance-logs-${new Date().toISOString()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


// Simple Cache Utility
const cache: Record<string, { data: any; expiry: number }> = {};

export const withCache = async <T>(
  key: string, 
  ttlSeconds: number, 
  task: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  if (cache[key] && cache[key].expiry > now) {
    if (import.meta.env.DEV) console.log(`[Cache Hit] ${key}`);
    return cache[key].data;
  }

  const data = await task();
  cache[key] = {
    data,
    expiry: now + (ttlSeconds * 1000)
  };
  return data;
};

export const clearCache = (key?: string) => {
  if (key) delete cache[key];
  else {
    Object.keys(cache).forEach(k => delete cache[k]);
  }
};
