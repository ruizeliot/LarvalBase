'use client';

import { useI18n } from '@/lib/i18n/i18n-context';
import { LANGUAGES } from '@/lib/i18n/translations';

export function LanguageSelector() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            language === lang.code
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          title={lang.label}
        >
          {lang.flag} {lang.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
