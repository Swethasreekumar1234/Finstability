import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLanguage, translations } from './translations';

type TranslateParams = Record<string, string | number>;

type LanguageContextType = {
  language: AppLanguage;
  setLanguage: (next: AppLanguage) => Promise<void>;
  t: (key: string, params?: TranslateParams) => string;
};

const LANGUAGE_KEY = 'app_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function lookup(lang: AppLanguage, key: string): string | undefined {
  const parts = key.split('.');
  let cursor: any = translations[lang];
  for (const part of parts) {
    if (cursor && typeof cursor === 'object' && part in cursor) {
      cursor = cursor[part];
    } else {
      return undefined;
    }
  }
  return typeof cursor === 'string' ? cursor : undefined;
}

function interpolate(input: string, params?: TranslateParams): string {
  if (!params) return input;
  return input.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ''));
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (saved === 'en' || saved === 'ta') {
          setLanguageState(saved);
        }
      } catch {
        // Keep default English on storage read failure.
      }
    };
    void load();
  }, []);

  const setLanguage = async (next: AppLanguage) => {
    setLanguageState(next);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Do not block UI if persistence fails.
    }
  };

  const t = (key: string, params?: TranslateParams) => {
    const selected = lookup(language, key);
    const fallback = lookup('en', key);
    return interpolate(selected ?? fallback ?? key, params);
  };

  const value = useMemo<LanguageContextType>(() => ({ language, setLanguage, t }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
