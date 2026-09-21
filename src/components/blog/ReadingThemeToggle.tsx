import { useEffect, useState } from 'react';
import { Sun, Moon, Coffee, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ReadingTheme = 'light' | 'sepia' | 'dark';

const STORAGE = { theme: 'a3:reading-theme', size: 'a3:reading-size' };
const SIZES = [0.92, 1.0, 1.1, 1.22, 1.35];

interface Props {
  targetSelector?: string; // elemento que recebe a classe de tema (default: body)
}

const ReadingThemeToggle = ({ targetSelector }: Props) => {
  const [theme, setTheme] = useState<ReadingTheme>('light');
  const [sizeIdx, setSizeIdx] = useState<number>(1);

  // Carregar preferências
  useEffect(() => {
    try {
      const t = (localStorage.getItem(STORAGE.theme) as ReadingTheme) || 'light';
      const s = parseInt(localStorage.getItem(STORAGE.size) || '1', 10);
      setTheme(t);
      setSizeIdx(Number.isFinite(s) ? Math.min(SIZES.length - 1, Math.max(0, s)) : 1);
    } catch { /* noop */ }
  }, []);

  // Aplicar tema ao alvo (default body)
  useEffect(() => {
    const el = targetSelector ? document.querySelector(targetSelector) : document.body;
    if (!el) return;
    el.classList.remove('reading-sepia', 'reading-dark');
    if (theme === 'sepia') el.classList.add('reading-sepia');
    if (theme === 'dark') el.classList.add('reading-dark');
    try { localStorage.setItem(STORAGE.theme, theme); } catch { /* noop */ }
    return () => { el.classList.remove('reading-sepia', 'reading-dark'); };
  }, [theme, targetSelector]);

  // Aplicar escala de fonte na superfície de leitura
  useEffect(() => {
    const content = document.querySelector<HTMLElement>('.reading-content');
    if (content) content.style.setProperty('--reading-scale', String(SIZES[sizeIdx]));
    document.documentElement.style.setProperty('--reading-scale', String(SIZES[sizeIdx]));
    try { localStorage.setItem(STORAGE.size, String(sizeIdx)); } catch { /* noop */ }
  }, [sizeIdx]);

  const btn = (active: boolean) =>
    `h-9 w-9 rounded-md border transition ${
      active
        ? 'bg-[hsl(var(--reading-accent))] text-white border-transparent'
        : 'bg-transparent border-[hsl(var(--reading-line))] text-[hsl(var(--reading-muted))] hover:text-[hsl(var(--reading-fg))]'
    }`;

  return (
    <div
      role="toolbar"
      aria-label="Preferências de leitura"
      className="inline-flex items-center gap-2 p-2 rounded-lg border border-[hsl(var(--reading-line))] bg-[hsl(var(--reading-bg))]"
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Tema claro"
          aria-pressed={theme === 'light'}
          className={btn(theme === 'light')}
          onClick={() => setTheme('light')}
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Tema sépia"
          aria-pressed={theme === 'sepia'}
          className={btn(theme === 'sepia')}
          onClick={() => setTheme('sepia')}
        >
          <Coffee className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Tema escuro"
          aria-pressed={theme === 'dark'}
          className={btn(theme === 'dark')}
          onClick={() => setTheme('dark')}
        >
          <Moon className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-[hsl(var(--reading-line))]" aria-hidden />

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Diminuir tamanho da fonte"
          className={btn(false)}
          disabled={sizeIdx <= 0}
          onClick={() => setSizeIdx((i) => Math.max(0, i - 1))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xs font-semibold tabular-nums w-6 text-center text-[hsl(var(--reading-muted))]">
          {Math.round(SIZES[sizeIdx] * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Aumentar tamanho da fonte"
          className={btn(false)}
          disabled={sizeIdx >= SIZES.length - 1}
          onClick={() => setSizeIdx((i) => Math.min(SIZES.length - 1, i + 1))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ReadingThemeToggle;
