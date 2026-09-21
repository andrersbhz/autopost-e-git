import { useEffect } from 'react';
import type { Language } from '@/hooks/useI18n';
import { detectLanguage, getStoredLang } from '@/lib/geo-language';

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const LANG_MAP: Record<Language, string> = {
  'pt-br': 'pt',
  'eng': 'en',
  'es': 'es',
};

const SOURCE_LANG = 'pt';

interface Props {
  currentLang: Language;
}

const setCookie = (value: string) => {
  document.cookie = `googtrans=${value};path=/`;
  const host = window.location.hostname;
  if (host && !host.includes('localhost')) {
    document.cookie = `googtrans=${value};path=/;domain=.${host.split('.').slice(-2).join('.')}`;
  }
};

const deleteCookie = () => {
  document.cookie = 'googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const host = window.location.hostname;
  if (host && !host.includes('localhost')) {
    document.cookie = `googtrans=;path=/;domain=.${host.split('.').slice(-2).join('.')};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};

/** Aplica a tradução via o <select> interno do widget, com tentativas. */
const applyWhenReady = (target: string, attempts = 0) => {
  const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (combo && combo.options.length > 0) {
    if (combo.value !== target) {
      combo.value = target;
      combo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }
  if (attempts < 40) setTimeout(() => applyWhenReady(target, attempts + 1), 300);
};

/** Carrega o script do widget do Google Translate (uma única vez). */
const loadWidget = () => {
  if (document.getElementById('google-translate-script')) return;

  window.googleTranslateElementInit = () => {
    if (!window.google?.translate) return;
    // eslint-disable-next-line new-cap
    new window.google.translate.TranslateElement(
      {
        pageLanguage: SOURCE_LANG,
        includedLanguages: 'pt,en,es',
        autoDisplay: false,
      },
      'google_translate_element'
    );
  };

  const s = document.createElement('script');
  s.id = 'google-translate-script';
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.body.appendChild(s);
};

/**
 * Tradução automática do blog:
 * 1. Detecta o idioma do visitante (preferência salva → geolocalização por IP → navegador)
 * 2. Carrega o widget oculto do Google Translate
 * 3. Aplica a tradução automaticamente, sem barra e sem recarregar a página
 */
const AutoTranslate = ({ currentLang }: Props) => {
  // Idioma escolhido manualmente (bandeiras) tem prioridade
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let lang: Language | null = getStoredLang();
      if (!lang) {
        // Detecção automática por IP (com cache e fallback para idioma do navegador)
        try { lang = await detectLanguage(); } catch { lang = currentLang; }
      }
      if (cancelled) return;

      const target = LANG_MAP[lang || currentLang] || SOURCE_LANG;

      if (target === SOURCE_LANG) {
        deleteCookie();
        // Carrega o widget mesmo assim, para o seletor de bandeiras funcionar sem reload
        loadWidget();
        return;
      }

      setCookie(`/${SOURCE_LANG}/${target}`);
      loadWidget();
      applyWhenReady(target);
    };

    run();
    return () => { cancelled = true; };
  }, [currentLang]);

  return (
    <>
      {/* O elemento é necessário para o widget inicializar, mas fica oculto */}
      <div id="google_translate_element" style={{ display: 'none' }} />
      <style>{`
        /* Esconde a barra superior e qualquer overlay do Google Translate */
        .goog-te-banner-frame,
        .goog-te-banner-frame.skiptranslate,
        body > .skiptranslate,
        body > .skiptranslate iframe,
        #goog-gt-tt,
        .goog-te-balloon-frame,
        .goog-tooltip,
        .goog-tooltip:hover { display: none !important; visibility: hidden !important; }
        body { top: 0 !important; position: static !important; }
        font[style*="background-color"] { background: transparent !important; box-shadow: none !important; }
        .goog-text-highlight { background: transparent !important; box-shadow: none !important; }
        #google_translate_element { display: none !important; }
      `}</style>
    </>
  );
};

export default AutoTranslate;
