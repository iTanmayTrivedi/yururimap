import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Smile, Luggage, Users, PartyPopper, BarChart3, Languages, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useLang } from "@/lib/i18n";

const tabs = [
  { to: "/",        icon: Smile,       ja: "気持ち",   en: "Mood" },
  { to: "/trouble", icon: AlertCircle, ja: "困った",   en: "Trouble" },
  { to: "/my",      icon: Luggage,     ja: "旅ログ",   en: "Trip" },
  { to: "/share",   icon: Users,       ja: "つながり", en: "Connect" },
  { to: "/events",  icon: PartyPopper, ja: "イベント", en: "Events" },
  { to: "/stats",   icon: BarChart3,   ja: "集計",     en: "Stats" },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  const { lang, setLang } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Presentation / big-screen views bypass the mobile shell entirely.
  if (pathname.startsWith("/live/")) {
    return <>{children ?? <Outlet />}</>;
  }
  return (
    <div className="min-h-screen bg-background flex justify-center mobile-shell">
      <div className="w-full max-w-[430px] flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 shadow-sm">
          <div className="relative text-center">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "#EC4899", letterSpacing: "-0.01em" }}>
              Yururi<span style={{ color: "#A855F7" }}>Map</span>
            </h1>
            <p className="text-[11px] font-medium mt-0.5">
              <span style={{ color: "#EC4899" }}>Happy</span>
              <span className="text-muted-foreground"> & </span>
              <span style={{ color: "#A855F7" }}>Sad</span>
              <span className="text-muted-foreground"> Map</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">ニコニコしょんぼりマップ</p>
            <button
              onClick={() => setLang(lang === "ja" ? "en" : "ja")}
              title="Language / 言語"
              className="absolute right-0 top-1 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              <Languages className="w-3.5 h-3.5" />
              {lang === "ja" ? "EN" : "日本語"}
            </button>
          </div>
        </header>
        <main className="flex-1 pb-28 px-4 pt-5 mobile-main">{children ?? <Outlet />}</main>
        <nav className="mobile-bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-50">
          <div className="grid grid-cols-5">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors select-none"
                  activeProps={{ className: "flex flex-col items-center justify-center py-2.5 text-primary select-none" }}
                  activeOptions={{ exact: true }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] mt-1 font-medium leading-none">{lang === "ja" ? t.ja : t.en}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
