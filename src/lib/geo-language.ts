import type { Language } from '@/hooks/useI18n';

const STORAGE_KEY = 'a3:lang-preference';
const DETECTED_KEY = 'a3:lang-detected';

// Mapa país (ISO-2) → idioma do portal
const COUNTRY_TO_LANG: Record<string, Language> = {
  BR: 'pt-br', PT: 'pt-br', AO: 'pt-br', MZ: 'pt-br', CV: 'pt-br',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  UY: 'es', PY: 'es', BO: 'es', EC: 'es', CR: 'es', PA: 'es', DO: 'es',
  GT: 'es', HN: 'es', NI: 'es', SV: 'es', CU: 'es', PR: 'es',
};

const SUPPORTED: Language[] = ['pt-br', 'eng', 'es'];

const fromBrowser = (): Language => {
  if (typeof navigator === 'undefined') return 'eng';
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('pt')) return 'pt-br';
  if (lang.startsWith('es')) return 'es';
  return 'eng';
};

export const getStoredLang = (): Language | null => {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Language | null;
    return v && SUPPORTED.includes(v) ? v : null;
  } catch {
    return null;
  }
};

export const setStoredLang = (lang: Language) => {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* noop */ }
};

/**
 * Resolução SÍNCRONA e instantânea do idioma — nunca bloqueia a renderização.
 * Ordem: preferência salva → cache de detecção → idioma do navegador.
 */
export const getInstantLang = (): Language => {
  const stored = getStoredLang();
  if (stored) return stored;
  try {
    const cached = localStorage.getItem(DETECTED_KEY) as Language | null;
    if (cached && SUPPORTED.includes(cached)) return cached;
  } catch { /* noop */ }
  return fromBrowser();
};

/**
 * Detecção geográfica em SEGUNDO PLANO — apenas atualiza o cache para visitas
 * futuras. Nunca deve ser aguardada para renderizar a UI.
 */
export const refreshGeoLangInBackground = (): void => {
  try {
    if (localStorage.getItem(DETECTED_KEY) || getStoredLang()) return;
  } catch { /* noop */ }
  detectLanguage().catch(() => { /* noop */ });
};

export const detectLanguage = async (): Promise<Language> => {
  // 1. Preferência salva pelo usuário
  const stored = getStoredLang();
  if (stored) return stored;

  // 2. Cache de detecção anterior (não consultar IP de novo)
  try {
    const cached = localStorage.getItem(DETECTED_KEY) as Language | null;
    if (cached && SUPPORTED.includes(cached)) return cached;
  } catch { /* noop */ }

  // 3. Geolocalização via IP (ipapi.co — gratuito, sem chave)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const country = (data?.country_code || data?.country || '').toUpperCase();
      const lang = COUNTRY_TO_LANG[country] || fromBrowser();
      try { localStorage.setItem(DETECTED_KEY, lang); } catch { /* noop */ }
      return lang;
    }
  } catch { /* falha de rede ou bloqueio — segue para fallback */ }

  // 4. Fallback: idioma do navegador
  const lang = fromBrowser();
  try { localStorage.setItem(DETECTED_KEY, lang); } catch { /* noop */ }
  return lang;
};
