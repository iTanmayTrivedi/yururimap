import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ja" | "en";
const KEY = "niko_lang";

function detect(): Lang {
  if (typeof window === "undefined") return "ja";
  const saved = localStorage.getItem(KEY);
  if (saved === "ja" || saved === "en") return saved;
  const nav = navigator.language || (navigator.languages && navigator.languages[0]) || "ja";
  return nav.toLowerCase().startsWith("ja") ? "ja" : "en";
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "ja", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ja");
  useEffect(() => { setLangState(detect()); }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };
  useEffect(() => { if (typeof document !== "undefined") document.documentElement.lang = lang; }, [lang]);
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

/** Pick JA or EN string. */
export function t(lang: Lang, ja: string, en: string) {
  return lang === "ja" ? ja : en;
}
