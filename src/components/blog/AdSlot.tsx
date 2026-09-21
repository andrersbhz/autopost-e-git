import { useEffect, useRef } from 'react';

interface AdSlotProps {
  /** AdSense ad slot id (data-ad-slot). When omitted, renders a placeholder. */
  slot?: string;
  /** AdSense format. Defaults to 'auto'. */
  format?: string;
  /** Responsive flag. Defaults to true. */
  responsive?: boolean;
  /** Minimum height of the slot to avoid layout shift. */
  minHeight?: number;
  /** Optional label rendered as small "Publicidade" hint above the ad. */
  label?: string;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

const CLIENT_ID =
  (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) || '';

/**
 * Strategic Google AdSense slot.
 * - When VITE_ADSENSE_CLIENT and `slot` are set, renders a real <ins class="adsbygoogle">.
 * - Otherwise renders a discreet placeholder so editors can see ad positions.
 */
const AdSlot = ({
  slot,
  format = 'auto',
  responsive = true,
  minHeight = 90,
  label = 'Publicidade',
  className = '',
}: AdSlotProps) => {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      // adsbygoogle not yet ready — ignore
    }
  }, [slot]);

  const showReal = Boolean(CLIENT_ID && slot);

  return (
    <aside
      className={`w-full my-8 ${className}`}
      aria-label={label}
      role="complementary"
    >
      <div className="news-container">
        <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--news-muted))] mb-1 text-center">
          {label}
        </p>
        {showReal ? (
          <ins
            ref={insRef as any}
            className="adsbygoogle block"
            style={{ display: 'block', minHeight }}
            data-ad-client={CLIENT_ID}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive ? 'true' : 'false'}
          />
        ) : (
          <div
            style={{ minHeight }}
            className="w-full bg-[hsl(var(--news-paper))] border border-dashed border-[hsl(var(--news-line))] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--news-muted))] uppercase tracking-widest"
          >
            Espaço para anúncio (AdSense)
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdSlot;
