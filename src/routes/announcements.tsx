import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "お知らせ / Announcements — YururiMap" },
      { name: "description", content: "News and announcements from the YururiMap team." },
    ],
  }),
  component: AnnouncementsPage,
});

type Item = { date: string; ja: string; en: string; body_ja: string; body_en: string };

const ITEMS: Item[] = [
  {
    date: "2026-07-15",
    ja: "3種類の投稿がはじまりました",
    en: "Three post types are live",
    body_ja: "「よかった投稿」「リクエスト」「活動を広める」を追加しました。ホーム画面から投稿できます。",
    body_en: "You can now post Happy posts, Requests, and Promote-Activity from the home screen.",
  },
  {
    date: "2026-07-14",
    ja: "イベント・つながり機能は一時停止中",
    en: "Events & Connect are temporarily paused",
    body_ja: "地域の声を集めることに集中するため、イベント／つながり機能は一時停止しています。",
    body_en: "We paused Events and Connect while we focus on collecting local voices.",
  },
];

function AnnouncementsPage() {
  const { lang } = useLang();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-bold">{t(lang, "お知らせ", "Announcements")}</h2>
      </div>
      <div className="space-y-3">
        {ITEMS.map((a) => (
          <div key={a.date} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-[11px] text-muted-foreground font-mono">{a.date}</div>
            <div className="text-sm font-bold mt-1">{lang === "ja" ? a.ja : a.en}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {lang === "ja" ? a.body_ja : a.body_en}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
