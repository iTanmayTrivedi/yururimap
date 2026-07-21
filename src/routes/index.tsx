import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { CATEGORY_LIST } from "@/lib/categories";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Bell, MessageCircleHeart, User, ChevronRight, MapPin, Heart, CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "みんなの困ったMap / Everyone's Problem Map" },
      { name: "description", content: "みんなの声で、地域や社会をもっとよくするアプリ。Post local problems by category, see them on the map, and support each other." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { lang } = useLang();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sid, setSid] = useState("");
  useEffect(() => { setSid(getSessionId()); }, []);

  const statsQ = useQuery({
    queryKey: ["home-stats", sid],
    queryFn: async () => {
      const [posts, likes, resolved] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("hidden", false),
        supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("session_id", sid || "__none__"),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("resolved", true),
      ]);
      return {
        total: posts.count ?? 0,
        myMeToo: likes.count ?? 0,
        resolved: resolved.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-4">
      {/* Top row: My Page + Feedback + Announcements */}
      <div className="flex items-center justify-between gap-2 -mt-1">
        <Link to="/my"
          className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 pl-1.5 pr-3 py-1 shadow-sm active:scale-[0.98]">
          <span className="w-7 h-7 rounded-full bg-white border border-sky-200 flex items-center justify-center">
            <User className="w-4 h-4 text-sky-700" />
          </span>
          <span className="text-[11px] font-bold text-sky-800 leading-tight">
            {t(lang, "マイページ", "My Page")}
            <span className="block text-[9px] font-normal text-sky-700/70">
              {t(lang, "投稿履歴・統計確認", "History & stats")}
            </span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-sky-600" />
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setFeedbackOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-[11px] font-semibold text-pink-700 shadow-sm active:scale-[0.97]">
            <MessageCircleHeart className="w-3.5 h-3.5" /> {t(lang, "ご意見", "Feedback")}
          </button>
          <Link to="/announcements"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm">
            <Bell className="w-3.5 h-3.5" /> {t(lang, "お知らせ", "News")}
          </Link>
        </div>
      </div>

      {/* Hero prompt */}
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 text-base font-extrabold">
          <span className="text-lg">〜</span>
          {t(lang, "どんなことに困っている？", "What are you troubled by?")}
          <span className="text-lg">〜</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {t(lang, "気になるテーマをタップしてね", "Tap a theme to get started")}
        </p>
      </div>

      {/* 4 category tiles */}
      <div className="grid grid-cols-2 gap-3">
        {CATEGORY_LIST.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.id} to="/post/$category" params={{ category: c.id }}
              className="rounded-2xl border p-4 flex flex-col items-center text-center shadow-sm active:scale-[0.97] transition"
              style={{ backgroundColor: c.soft, borderColor: `${c.color}66` }}>
              <span className="w-14 h-14 rounded-full bg-white border-2 flex items-center justify-center mb-2 shadow-sm"
                style={{ borderColor: c.color }}>
                <Icon className="w-7 h-7" style={{ color: c.color }} />
              </span>
              <span className="text-sm font-extrabold" style={{ color: c.color }}>
                {lang === "ja" ? c.ja : c.en}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {c.id === "kurashi" && t(lang, "住まい・公園・病院など", "Home, parks, health")}
                {c.id === "community" && t(lang, "地域活動・イベント・ボランティア", "Local events & volunteer")}
                {c.id === "business" && t(lang, "働き方・会社・仕事など", "Work & business")}
                {c.id === "education" && t(lang, "学校・学び・習いごとなど", "School & learning")}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Map preview link + activities entrance */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/map"
          className="rounded-2xl border border-rose-200 bg-white p-3 shadow-sm active:scale-[0.98] flex flex-col gap-1">
          <span className="text-lg">🗺️</span>
          <div className="text-sm font-extrabold text-rose-600">{t(lang, "困ったマップ", "Problem Map")}</div>
          <div className="text-[10px] text-muted-foreground">{t(lang, "地域の「困った」を地図で", "See problems on the map")}</div>
        </Link>
        <Link to="/activities"
          className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm active:scale-[0.98] flex flex-col gap-1">
          <span className="text-lg inline-flex items-center gap-1"><Sparkles className="w-4 h-4 text-emerald-600" /></span>
          <div className="text-sm font-extrabold text-emerald-700">{t(lang, "活動マップ", "Activity Map")}</div>
          <div className="text-[10px] text-muted-foreground">{t(lang, "取り組みを見る・投稿する", "See & post activities")}</div>
        </Link>
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t(lang, "今日の投稿", "Posts")} value={statsQ.data?.total ?? 0} color="#10B981" icon={MapPin} />
        <Stat label={t(lang, "私も困った", "Me too")} value={statsQ.data?.myMeToo ?? 0} color="#EC4899" icon={Heart} />
        <Stat label={t(lang, "解決済", "Resolved")} value={statsQ.data?.resolved ?? 0} color="#F97316" icon={CheckCircle2} />
      </div>

      {/* Activity submission CTA */}
      <Link to="/activities/new"
        className="block rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 shadow-md active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <div className="text-sm font-extrabold">{t(lang, "活動を投稿", "Post an activity")}</div>
            <div className="text-[10px] opacity-90">{t(lang, "地域の取り組みを広めよう", "Share your local initiative")}</div>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      </Link>

      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

function Stat({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div className="rounded-xl bg-white border border-border p-2 text-center shadow-sm">
      <Icon className="w-4 h-4 mx-auto" style={{ color }} />
      <div className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
