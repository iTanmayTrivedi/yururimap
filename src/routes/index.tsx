import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MOODS, getSessionId, type Mood } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { computeStreak } from "@/lib/streak";
import { AnimatedScene } from "@/components/AnimatedScene";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FaceIcon } from "@/components/FaceIcon";
import { POST_TYPE_LIST } from "@/lib/posts";
import { Loader2, MapPin, Calendar, Flame, MessageCircleHeart, User, Megaphone as MegaphoneIcon, ChevronRight, Bell } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YururiMap — 今の気持ちは？ / How are you feeling?" },
      { name: "description", content: "Post Happy, Request, or Promote-Activity to your neighborhood map." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [sessionTick, setSessionTick] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sid, setSid] = useState("");

  useEffect(() => { setSid(getSessionId()); }, []);

  const myQ = useQuery({
    enabled: !!sid,
    queryKey: ["my-submissions-lite", sid],
    queryFn: async () => {
      const { data, error } = await supabase.from("submissions").select("timestamp").eq("session_id", sid);
      if (error) throw error;
      return (data ?? []).map((r) => r.timestamp as string);
    },
  });
  const { todayCount, streakDays } = computeStreak(myQ.data ?? []);

  async function submit(m: Mood) {
    setBusy(m.ja);
    // Read location preference from My Page (falls back to on)
    let exact_lat: number | null = null;
    let exact_lng: number | null = null;
    const locOn = (typeof window !== "undefined" && localStorage.getItem("niko_loc_on") !== "off");
    if (locOn && "geolocation" in navigator) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => { exact_lat = p.coords.latitude; exact_lng = p.coords.longitude; resolve(); },
          () => resolve(),
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
        );
      });
    }
    try {
      const { data, error } = await supabase.from("submissions").insert({
        mood: m.ja, mood_en: m.en, mood_color: m.color,
        rounded_lat: null, rounded_lng: null, exact_lat, exact_lng,
        shared_code: null, session_id: getSessionId(),
      }).select("id").single();
      if (error) throw error;
      if (data?.id && exact_lat != null && exact_lng != null) {
        localStorage.setItem("niko_last_sub", JSON.stringify({ id: data.id, lat: exact_lat, lng: exact_lng }));
      }
      setSessionTick((n) => n + 1);
      qc.invalidateQueries({ queryKey: ["my-submissions-lite", sid] });
      qc.invalidateQueries({ queryKey: ["public-submissions"] });
      toast.success(t(lang, "記録しました！", "Recorded!"), { description: lang === "ja" ? m.ja : m.en, duration: 1600 });
    } catch (e) {
      toast.error(t(lang, "エラー", "Error"), { description: (e as Error).message });
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      {/* Top row: My Page (left) + Feedback + Announcements */}
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

      {/* Three main post-type tiles */}
      <div className="grid grid-cols-3 gap-2">
        {POST_TYPE_LIST.map((p) => (
          <Link key={p.type} to={`/post/${p.type}` as "/post/happy"}
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


      {/* Feelings — mood input */}
      <div>
        <h2 className="text-base font-bold mb-2 text-foreground">{t(lang, "今の気持ちは？", "How are you feeling?")}</h2>
        <div className="grid grid-cols-5 gap-1.5">
          {MOODS.map((m) => (
            <button key={m.ja} onClick={() => submit(m)} disabled={busy !== null}
              className="rounded-2xl border p-1.5 flex flex-col items-center min-h-[80px] transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: m.soft, borderColor: `${m.color}55` }}>
              <span className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 shadow-sm"
                style={{ backgroundColor: "#fff", border: `2px solid ${m.color}` }}>
                <FaceIcon color={m.color} kind={m.en} />
              </span>
              <span className="text-[10px] font-bold leading-tight text-center" style={{ color: m.color }}>
                {lang === "ja" ? m.ja : m.en}
              </span>
              {busy === m.ja && <Loader2 className="w-3 h-3 mt-1 animate-spin" style={{ color: m.color }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Stats card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-3 flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-100 to-sky-100 flex items-center justify-center shrink-0 border border-emerald-200">
          <MapPin className="w-7 h-7 text-pink-500" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">{t(lang, "今日の投稿回数", "Today's posts")}</span>
            <span className="text-xl font-bold tabular-nums text-foreground">{todayCount}</span>
            <span className="text-[11px] text-muted-foreground">{t(lang, "回", "×")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">{t(lang, "連続投稿日数", "Streak")}</span>
            <span className="text-xl font-bold tabular-nums text-foreground">{streakDays}</span>
            <span className="text-[11px] text-muted-foreground">{t(lang, "日", "d")}</span>
          </div>
        </div>
      </div>

      <AnimatedScene trigger={sessionTick} />

      <div className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] text-amber-800 text-center">
        💡 {t(lang, "気持ちボタンを押すと、ラッコとおともだちが遊びに来るよ♪", "Tap a mood and a little friend visits ✨")}
      </div>

      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
