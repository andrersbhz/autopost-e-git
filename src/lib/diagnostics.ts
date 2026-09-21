type DiagnosticMetric = {
  operation: string;
  duration: number;
  timestamp: number;
  status: 'success' | 'error';
  details?: string;
};

class Diagnostics {
  private metrics: DiagnosticMetric[] = [];
  private static instance: Diagnostics;

  private constructor() {}

  static getInstance() {
    if (!Diagnostics.instance) {
      Diagnostics.instance = new Diagnostics();
    }
    return Diagnostics.instance;
  }

  startTimer() {
    return performance.now();
  }

  endTimer(startTime: number, operation: string, status: 'success' | 'error' = 'success', details?: string) {
    const duration = performance.now() - startTime;
    const metric: DiagnosticMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      status,
      details
    };
    this.metrics.unshift(metric);
    // Keep only last 50 metrics
    if (this.metrics.length > 50) this.metrics.pop();
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('diagnostics-updated', { detail: this.metrics }));
    console.log(`[Diagnostics] ${operation}: ${duration.toFixed(2)}ms (${status})`);
    return duration;
  }

  getMetrics() {
    return [...this.metrics];
  }

  clear() {
    this.metrics = [];
    window.dispatchEvent(new CustomEvent('diagnostics-updated', { detail: [] }));
  }
}

export const diagnostics = Diagnostics.getInstance();
