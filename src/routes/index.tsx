import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { POST_TYPE_LIST } from "@/lib/posts";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { AlertOctagon, Bell, MessageCircleHeart, User, ChevronRight, MapPin, Heart, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "みんなの困ったMap / Everyone's Problem Map" },
      { name: "description", content: "Share local problems, positive posts and requests. See what neighbours care about." },
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
              {t(lang, "位置情報・居住地域", "Location & profile")}
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

      {/* Hero */}
      <div className="rounded-3xl p-4 bg-gradient-to-br from-emerald-50 via-white to-pink-50 border border-emerald-200 shadow-sm">
        <div className="text-center">
          <div className="text-[10px] font-semibold text-emerald-700 tracking-wider">MINNA NO KOMATTA MAP</div>
          <h2 className="text-lg font-extrabold text-foreground mt-1">
            {t(lang, "みんなの困った・気づきを地図に。", "Put local problems on the map.")}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t(lang, "地域の声を集めて可視化しよう。", "Collect and visualise local voices.")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat label={t(lang, "投稿", "Posts")} value={statsQ.data?.total ?? 0} color="#10B981" />
          <Stat label={t(lang, "私の共感", "My Me-too")} value={statsQ.data?.myMeToo ?? 0} color="#EC4899" />
          <Stat label={t(lang, "解決済", "Resolved")} value={statsQ.data?.resolved ?? 0} color="#F97316" />
        </div>
      </div>

      {/* Primary CTA */}
      <Link to="/post/$type" params={{ type: "request" }}
        className="block rounded-2xl p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <AlertOctagon className="w-7 h-7" />
          </span>
          <div className="flex-1">
            <div className="text-lg font-extrabold leading-tight">{t(lang, "困ったを投稿する", "Post a Problem")}</div>
            <div className="text-[11px] opacity-90">{t(lang, "地域の困りごとを共有しよう", "Share a local problem")}</div>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      </Link>

      {/* Three post-type tiles */}
      <div className="grid grid-cols-3 gap-2">
        {POST_TYPE_LIST.map((p) => (
          <Link key={p.type} to="/post/$type" params={{ type: p.type }}
            className="rounded-2xl border p-3 flex flex-col items-center text-center shadow-sm active:scale-[0.97] transition"
            style={{ backgroundColor: p.soft, borderColor: `${p.color}55` }}>
            <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm mb-1"
              style={{ backgroundColor: "#fff", border: `2px solid ${p.color}` }}>{p.emoji}</span>
            <span className="text-[12px] font-extrabold leading-tight" style={{ color: p.color }}>
              {lang === "ja" ? p.ja : p.en}
            </span>
          </Link>
        ))}
      </div>

      {/* Map + activities entrances */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/map"
          className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm active:scale-[0.98] flex flex-col gap-1">
          <span className="text-lg">🗺️</span>
          <div className="text-sm font-extrabold text-emerald-700">{t(lang, "マップを見る", "Open the Map")}</div>
          <div className="text-[10px] text-muted-foreground">{t(lang, "全ての投稿を地図で", "All posts on the map")}</div>
        </Link>
        <Link to="/activities"
          className="rounded-2xl border border-purple-200 bg-white p-3 shadow-sm active:scale-[0.98] flex flex-col gap-1">
          <span className="text-lg">✨</span>
          <div className="text-sm font-extrabold text-purple-700">{t(lang, "取り組みを見る", "Community Activities")}</div>
          <div className="text-[10px] text-muted-foreground">{t(lang, "地方・全国・世界", "Local, national & global")}</div>
        </Link>
      </div>

      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const Icon = label.includes("解決") || label.includes("Resolved") ? CheckCircle2
    : label.includes("共感") || label.includes("Me-too") ? Heart : MapPin;
  return (
    <div className="rounded-xl bg-white/70 border border-white p-2 text-center">
      <Icon className="w-4 h-4 mx-auto" style={{ color }} />
      <div className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
