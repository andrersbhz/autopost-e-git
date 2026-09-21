import type { Language } from '@/hooks/useI18n';

const LANG_MAP: Record<Language, string> = {
  'pt-br': 'pt',
  'eng': 'en',
  'es': 'es',
};

// Idioma original do conteúdo do site
const SOURCE_LANG = 'pt';

const setCookie = (name: string, value: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value};path=/`;
  const host = window.location.hostname;
  if (host && !host.includes('localhost')) {
    const parts = host.split('.');
    const root = parts.length >= 2 ? parts.slice(-2).join('.') : host;
    document.cookie = `${name}=${value};path=/;domain=.${root}`;
  }
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  const host = window.location.hostname;
  if (host && !host.includes('localhost')) {
    const parts = host.split('.');
    const root = parts.length >= 2 ? parts.slice(-2).join('.') : host;
    document.cookie = `${name}=;path=/;domain=.${root};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};

/**
 * Aplica a tradução via o <select> interno do widget do Google Translate
 * (classe .goog-te-combo), sem recarregar a página.
 * Retorna true se conseguiu aplicar.
 */
const applyViaCombo = (target: string): boolean => {
  const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (!combo) return false;
  combo.value = target === SOURCE_LANG ? '' : target;
  combo.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};

/**
 * Define o idioma de destino do Google Translate sem recarregar a página.
 * Usa o cookie `googtrans` + o select interno do widget. Só recarrega como
 * último recurso, se o widget ainda não estiver carregado.
 */
export const setTranslateLang = (lang: Language) => {
  const target = LANG_MAP[lang] || SOURCE_LANG;

  if (target === SOURCE_LANG) {
    // Voltar ao idioma original: remove o cookie e desfaz a tradução (sem reload)
    deleteCookie('googtrans');
    let attempts = 0;
    const tryRestore = () => {
      if (applyViaCombo(target)) return;
      attempts += 1;
      if (attempts < 60) setTimeout(tryRestore, 250);
    };
    tryRestore();
    return;
  }

  setCookie('googtrans', `/${SOURCE_LANG}/${target}`);

  // Aplica via o select interno do widget — NUNCA recarrega a página
  let attempts = 0;
  const tryApply = () => {
    if (applyViaCombo(target)) return;
    attempts += 1;
    if (attempts < 60) setTimeout(tryApply, 250);
  };
  tryApply();
};
