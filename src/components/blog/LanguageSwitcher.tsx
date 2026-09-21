import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n, type Language } from '@/hooks/useI18n';
import { setStoredLang } from '@/lib/geo-language';
import { setTranslateLang } from '@/lib/translate';

const LanguageSwitcher = () => {
  const { currentLang, changeLanguage, languages } = useI18n();
  const current = languages.find((l) => l.code === currentLang) || languages[0];

  const handleSelect = (code: Language) => {
    if (code === currentLang) return;
    // 1) Persist preference   2) Apply Google Translate without reload
    // 3) Update the :lang URL segment via React Router (SPA, no full reload)
    setStoredLang(code);
    setTranslateLang(code);
    changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Idioma atual: ${current.label}. Alterar idioma`}
          className="flex items-center gap-2 px-2.5 py-1 bg-white/50 hover:bg-white hover:shadow-sm rounded-full transition-all duration-200 text-black/80 hover:text-black border border-black/5 notranslate"
          translate="no"
        >
          <span className="text-base leading-none">{current.flag}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider">{current.code}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-gray-900 border border-gray-800 shadow-2xl z-[100] min-w-[160px] notranslate"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-800 focus:bg-gray-800 text-white px-4 py-2"
            translate="no"
          >
            <span className="text-xl leading-none">{lang.flag}</span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-white">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
