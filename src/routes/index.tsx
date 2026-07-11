import { createFileRoute } from "@tanstack/react-router";
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
import { Loader2, Users, MapPin, Info, ChevronDown, Calendar, Flame, MessageCircleHeart, PartyPopper } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YururiMap — 今の気持ちは？ / How are you feeling?" },
      { name: "description", content: "Tap a mood to record how you feel." },
    ],
  }),
  component: InputPage,
});

type LocResult = { lat: number; lng: number; accuracy: number } | null;

function getPosition(): Promise<LocResult> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

const LOC_PREF_KEY = "niko_loc_on";

function InputPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [locOn, setLocOn] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [permState, setPermState] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [showHelp, setShowHelp] = useState(false);
  const [activeCode, setActiveCode] = useState("");
  const [sessionTick, setSessionTick] = useState(0); // triggers scene visitor
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sid, setSid] = useState("");

  useEffect(() => {
    setSid(getSessionId());
    const saved = localStorage.getItem(LOC_PREF_KEY);
    if (saved === "off") setLocOn(false);
    else if (saved === "on") setLocOn(true);
    setActiveCode(localStorage.getItem("niko_active_code") ?? "");
    const onStorage = () => setActiveCode(localStorage.getItem("niko_active_code") ?? "");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { localStorage.setItem(LOC_PREF_KEY, locOn ? "on" : "off"); }, [locOn]);

  useEffect(() => {
    const nav = navigator as Navigator & { permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> } };
    if (!nav.permissions?.query) return;
    let status: PermissionStatus | null = null;
    nav.permissions.query({ name: "geolocation" as PermissionName }).then((s) => {
      status = s;
      setPermState(s.state as typeof permState);
      s.onchange = () => setPermState(s.state as typeof permState);
    }).catch(() => {});
    return () => { if (status) status.onchange = null; };
  }, []);

  // Look up whether active code is an event → skip GPS in event mode.
  const activeGroupQ = useQuery({
    enabled: !!activeCode,
    queryKey: ["active-group", activeCode],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("is_event,name").eq("shared_code", activeCode).maybeSingle();
      return data;
    },
  });
  const inEvent = activeGroupQ.data?.is_event === true;

  // Today count + streak
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
    let exact_lat: number | null = null;
    let exact_lng: number | null = null;

    if (locOn && !inEvent) {
      const pos = await getPosition();
      if (pos) {
        exact_lat = pos.lat;
        exact_lng = pos.lng;
      }
    }

    try {
      const code = (typeof window !== "undefined" && localStorage.getItem("niko_active_code")) || null;
      const { data, error } = await supabase.from("submissions").insert({
        mood: m.ja,
        mood_en: m.en,
        mood_color: m.color,
        rounded_lat: null,
        rounded_lng: null,
        exact_lat, exact_lng,
        shared_code: code,
        session_id: getSessionId(),
      }).select("id").single();
      if (error) throw error;
      if (data?.id && exact_lat != null && exact_lng != null) {
        localStorage.setItem("niko_last_sub", JSON.stringify({ id: data.id, lat: exact_lat, lng: exact_lng }));
      } else {
        localStorage.removeItem("niko_last_sub");
      }
      // Stay on this screen — animate visitor, update stats.
      setSessionTick((n) => n + 1);
      qc.invalidateQueries({ queryKey: ["my-submissions-lite", sid] });
      qc.invalidateQueries({ queryKey: ["my-submissions", sid] });
      qc.invalidateQueries({ queryKey: ["public-submissions"] });
      toast.success(t(lang, "記録しました！", "Recorded!"), {
        description: lang === "ja" ? m.ja : m.en,
        duration: 1600,
      });
    } catch (e) {
      toast.error(t(lang, "エラー", "Error"), { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const gpsHidden = inEvent;

  return (
    <div className="space-y-4">
      {/* Top-left feedback button (floats over the content area) */}
      <div className="flex items-start justify-between -mt-1">
        <button
          onClick={() => setFeedbackOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-[11px] font-semibold text-pink-700 shadow-sm active:scale-[0.97]"
        >
          <MessageCircleHeart className="w-3.5 h-3.5" />
          {t(lang, "ご意見・ご感想", "Feedback")}
        </button>
        <div className="h-6" />
      </div>

      {activeCode && (
        <div
          className="rounded-2xl border px-3 py-2.5 flex items-center gap-2 text-xs"
          style={{
            borderColor: inEvent ? "#FDE68A" : "#A7F3D0",
            backgroundColor: inEvent ? "#FFFBEB" : "#ECFDF5",
          }}
        >
          {inEvent ? <PartyPopper className="w-4 h-4 text-amber-600 shrink-0" /> : <Users className="w-4 h-4 text-emerald-700 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div style={{ color: inEvent ? "#92400E" : "#065F46" }}>
              {inEvent ? t(lang, "イベントで投稿中", "Posting in event") : t(lang, "共有コードで投稿中", "Posting as")}
            </div>
            <div className="font-mono font-bold truncate" style={{ color: inEvent ? "#78350F" : "#064E3B" }}>{activeCode}</div>
          </div>
          <button
            onClick={() => { localStorage.removeItem("niko_active_code"); setActiveCode(""); }}
            className="text-[11px] px-2 py-1 rounded-md bg-white border border-current/20 shrink-0"
            style={{ color: inEvent ? "#92400E" : "#065F46" }}
          >
            {t(lang, "解除", "Unbind")}
          </button>
        </div>
      )}

      {/* Location line (compact) */}
      {!gpsHidden ? (
        <button
          onClick={() => setLocOn((v) => !v)}
          className="w-full flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-left"
        >
          <MapPin className="w-4 h-4 shrink-0" style={{ color: locOn ? "#059669" : "#9CA3AF" }} />
          <span className="text-xs font-semibold">
            {t(lang, "位置情報", "Location")}：
            <span style={{ color: locOn ? "#059669" : "#6B7280" }}>{locOn ? "ON" : "OFF"}</span>
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">
            {locOn ? t(lang, "（正確な位置）", "(exact)") : t(lang, "（保存しません）", "(not saved)")}
          </span>
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          🎉 {t(lang, "イベント中は位置情報を保存しません", "Location is off during events")}
        </div>
      )}

      {/* Mood question */}
      <div>
        <h2 className="text-base font-bold mb-2 text-foreground">{t(lang, "今の気持ちは？", "How are you feeling?")}</h2>

        {/* Horizontal 5-button row */}
        <div className="grid grid-cols-5 gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.ja}
              onClick={() => submit(m)}
              disabled={busy !== null}
              className="rounded-2xl border p-1.5 flex flex-col items-center min-h-[80px] transition-all active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: m.soft,
                borderColor: `${m.color}55`,
              }}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 shadow-sm"
                style={{ backgroundColor: "#fff", border: `2px solid ${m.color}` }}
              >
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

      {/* Stats card: today's posts + streak */}
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

      {/* River scene with drifting otters */}
      <AnimatedScene trigger={sessionTick} />

      {/* Friendly hint */}
      <div className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] text-amber-800 text-center">
        💡 {t(lang, "気持ちボタンを押すと、ラッコとおともだちが遊びに来るよ♪", "Tap a mood and a little friend visits ✨")}
      </div>

      {/* Location detail help (only when needed) */}
      {!gpsHidden && permState === "denied" && locOn && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-3 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">
                {t(lang, "ブラウザで位置情報がブロックされています", "Location is blocked by your browser")}
              </div>
              <div className="mt-1">
                {t(lang, "OFFにすれば位置情報なしで投稿できます。", "Turn it OFF to post without location.")}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setLocOn(false)} className="px-3 py-1.5 rounded-md bg-amber-900 text-white text-xs font-medium">
              {t(lang, "OFFにする", "Turn OFF")}
            </button>
            <button onClick={() => setShowHelp((v) => !v)} className="px-3 py-1.5 rounded-md bg-white border border-amber-300 text-xs inline-flex items-center gap-1">
              {t(lang, "解除方法", "How to enable")}
              <ChevronDown className={`w-3 h-3 transition-transform ${showHelp ? "rotate-180" : ""}`} />
            </button>
          </div>
          {showHelp && (
            <div className="rounded-md bg-white/70 border border-amber-200 p-2 leading-relaxed">
              <div className="font-medium mb-1">📱 iPhone</div>設定 → Safari → 位置情報<br />
              <div className="font-medium mt-2 mb-1">🤖 Android</div>アドレスバーの🔒 → 権限 → 位置情報<br />
              <div className="font-medium mt-2 mb-1">💻 PC</div>アドレスバーの🔒 → サイトの設定 → 位置情報
            </div>
          )}
        </div>
      )}

      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

