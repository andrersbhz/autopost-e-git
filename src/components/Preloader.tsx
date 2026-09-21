import { useEffect, useState } from 'react';

interface PreloaderProps {
  message?: string;
  /** 0–100. If omitted, an indeterminate auto-advancing progress is shown. */
  progress?: number;
}

const Preloader = ({ message, progress }: PreloaderProps) => {
  const [autoProgress, setAutoProgress] = useState(0);
  const isControlled = typeof progress === 'number';

  useEffect(() => {
    if (isControlled) return;
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      // Chega a 100% em aproximadamente 1 segundo para ser rápido
      const target = Math.min(100, 100 * (1 - Math.exp(-elapsed / 400)));
      setAutoProgress(target);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isControlled]);

  const value = Math.round(isControlled ? Math.max(0, Math.min(100, progress!)) : autoProgress);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Subtle pulsing dot */}
        <div className="relative h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-[#a3ff12] animate-ping opacity-75" />
          <span className="relative block h-2 w-2 rounded-full bg-[#a3ff12]" />
        </div>

        {/* Determinate progress bar */}
        <div className="h-[3px] w-44 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[#a3ff12] transition-[width] duration-200 ease-out"
            style={{ width: `${value}%` }}
          />
        </div>

        {/* Percentage */}
        <div className="flex items-baseline gap-2 tabular-nums">
          <span className="text-2xl font-light text-white">{value}</span>
          <span className="text-xs text-white/50">%</span>
        </div>

        {message && (
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#a3ff12]/60">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default Preloader;