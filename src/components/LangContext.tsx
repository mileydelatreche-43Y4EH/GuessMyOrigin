"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getDict,
  LANG_KEY,
  loadLang,
  type Dict,
  type LangCode,
} from "@/lib/i18n";

const LangContext = createContext<{
  lang: LangCode;
  setLang: (c: LangCode) => void;
  t: Dict;
} | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("fr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(loadLang());
    setReady(true);
  }, []);

  const setLang = useCallback((c: LangCode) => {
    setLangState(c);
    localStorage.setItem(LANG_KEY, c);
    document.documentElement.lang = c;
  }, []);

  useEffect(() => {
    if (ready) document.documentElement.lang = lang;
  }, [lang, ready]);

  const value = useMemo(
    () => ({ lang, setLang, t: getDict(lang) }),
    [lang, setLang]
  );

  if (!ready) return null;

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang outside LangProvider");
  return ctx;
}
