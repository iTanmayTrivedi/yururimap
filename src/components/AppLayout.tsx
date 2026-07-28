import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, User, Megaphone, BarChart3, FileText, Sparkles, ShieldCheck, Languages, MessageCircleHeart } from "lucide-react";
import { useLang, t } from "@/lib/i18n";
import { FeedbackDialog } from "@/components/FeedbackDialog";

const menu = [
  { to: "/my",            icon: User,        ja: "マイページ",   en: "My Page" },
  { to: "/activities",    icon: Sparkles,    ja: "活動一覧",     en: "Activities" },
  { to: "/announcements", icon: Megaphone,   ja: "お知らせ",     en: "Announcements" },
  { to: "/stats",         icon: BarChart3,   ja: "統計",         en: "Statistics" },
  { to: "/terms",         icon: FileText,    ja: "利用規約・プライバシー", en: "Terms & Privacy" },
  { to: "/admin",         icon: ShieldCheck, ja: "管理者",       en: "Admin" },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  const { lang, setLang } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  if (pathname.startsWith("/live/")) {
    return <>{children ?? <Outlet />}</>;
  }

  return (
    <div className="min-h-screen bg-background flex justify-center mobile-shell">
      <div className="w-full max-w-[430px] flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 shadow-sm">
          <div className="relative text-center">
            <button
              onClick={() => setOpen(true)}
              aria-label="Menu"
              className="absolute left-0 top-1 inline-flex items-center justify-center w-8 h-8 rounded-md border border-border bg-card text-muted-foreground"
            >
              <Menu className="w-4 h-4" />
            </button>
            <Link to="/" className="block">
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "#10B981" }}>
                みんなの<span style={{ color: "#EC4899" }}>困った</span>Map
              </h1>
              <p className="text-[10px] font-medium mt-0.5 text-muted-foreground">
                Everyone&apos;s Problem Map
              </p>
            </Link>
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

        <main className="flex-1 pb-10 px-4 pt-5 mobile-main">{children ?? <Outlet />}</main>

        {open && (
          <div className="fixed inset-0 z-[60] flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="relative w-[76%] max-w-[300px] bg-card h-full shadow-xl p-4 space-y-1 overflow-y-auto">
              <div className="flex items-center justify-between pb-2">
                <span className="font-extrabold text-sm">{t(lang, "メニュー", "Menu")}</span>
                <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-md border border-border inline-flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {menu.map((m) => {
                const Icon = m.icon;
                return (
                  <Link key={m.to} to={m.to}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-muted">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {lang === "ja" ? m.ja : m.en}
                  </Link>
                );
              })}
              <button onClick={() => { setOpen(false); setFeedback(true); }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-muted">
                <MessageCircleHeart className="w-4 h-4 text-muted-foreground" />
                {t(lang, "ご意見・ご要望", "Feedback")}
              </button>
            </div>
          </div>
        )}

        <FeedbackDialog open={feedback} onClose={() => setFeedback(false)} />
      </div>
    </div>
  );
}
