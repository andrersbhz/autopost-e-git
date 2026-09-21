import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

export type Language = 'pt-br' | 'eng' | 'es';

export const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'pt-br', label: 'Português', flag: '🇧🇷' },
  { code: 'eng', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export const useI18n = () => {
  const { lang } = useParams<{ lang?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentLang: Language = (lang as Language) || 'pt-br';

  const changeLanguage = (newLang: Language) => {
    const segments = location.pathname.split('/').filter(Boolean);

    // If first segment is a known language, replace it
    if (languages.some(l => l.code === segments[0])) {
      segments[0] = newLang;
    } else {
      segments.unshift(newLang);
    }

    const nextPath = `/${segments.join('/')}${location.search}${location.hash}`;
    // Use replace to avoid polluting history and prevent any full reload behavior.
    // Navigation stays within React Router (SPA) — no page reload.
    navigate(nextPath, { replace: true });
  };

  return {
    currentLang,
    changeLanguage,
    languages
  };
};
