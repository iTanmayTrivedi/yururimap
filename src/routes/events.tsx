import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId, MOODS } from "@/lib/session";
import { useLang, t } from "@/lib/i18n";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PartyPopper, ChevronDown, Users, BarChart3, Copy, CheckCircle2, Loader2, Play, Square, Monitor, Pencil, Trash2, Calendar, MapPin, JapaneseYen, User, Link as LinkIcon, FileText, Settings, Eye, Lock, GripVertical } from "lucide-react";
import { normalizeCode } from "./share";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "イベント / Events" },
      { name: "description", content: "Event mode: create and view aggregated results." },
    ],
  }),
  component: EventsPage,
});

const CODE_KEY = "niko_active_code";

function EventsPage() {
  const { lang } = useLang();
  const [code, setCode] = useState("");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newCode, setNewCode] = useState("");
  const sessionId = getSessionId();

  useEffect(() => { setCode(localStorage.getItem(CODE_KEY) ?? ""); }, []);

  async function joinCode() {
    const { code: c, reason } = normalizeCode(code);
    if (!c) { toast.error(reason ?? ""); return; }
    localStorage.setItem(CODE_KEY, c);
    setOpenCode(c);
    toast.success(t(lang, `イベント ${c} に参加`, `Joined event ${c}`));
  }

  async function createEvent() {
    const { code: c, reason } = normalizeCode(newCode);
    if (!c || !name.trim()) { toast.error(reason ?? t(lang, "入力してください", "Please fill fields")); return; }
    const { data: existing } = await supabase.from("groups").select("shared_code").eq("shared_code", c).maybeSingle();
    if (existing) { toast.error(t(lang, "コード重複", "Code already exists")); return; }
    const { error } = await supabase.from("groups").insert({
      shared_code: c, name: name.trim().slice(0, 60),
      admin_session_id: sessionId, location_precision: "500m",
      is_event: true, results_visible: false,
    });
    if (error) { toast.error(error.message); return; }
    localStorage.setItem(CODE_KEY, c);
    toast.success(t(lang, "イベントを作成しました", "Event created"));
    setCreating(false); setName(""); setNewCode("");
    setOpenCode(c);
  }

  if (openCode) return <EventView code={openCode} onBack={() => setOpenCode(null)} />;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold inline-flex items-center gap-2">
          <PartyPopper className="w-5 h-5 text-amber-500" />
          {t(lang, "イベント", "Events")}
        </h2>
        <p className="text-xs text-muted-foreground">Event mode</p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
        <div>
          <div className="text-sm font-bold">{t(lang, "イベントコードで参加", "Join with event code")}</div>
          <p className="text-[11px] text-muted-foreground">{t(lang, "主催者から共有されたコード", "Code shared by organizer")}</p>
        </div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="AB12-CD34"
          maxLength={32}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          className="w-full min-h-[48px] px-3 rounded-xl border border-input bg-card font-mono text-base"
        />
        <button onClick={joinCode} disabled={!code.trim()} className="w-full min-h-[48px] rounded-xl text-white font-semibold disabled:opacity-50"
          style={{ backgroundColor: "#F59E0B" }}>
          {t(lang, "イベントに参加", "Join event")}
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
        <button
          onClick={() => setCreating((v) => !v)}
          className="w-full flex items-center gap-2 text-left"
        >
          <span className="text-sm font-bold flex-1">{t(lang, "イベントを作成", "Create event")}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${creating ? "rotate-180" : ""}`} />
        </button>
        {creating && (
          <div className="space-y-3">
            <input
              value={name} onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder={t(lang, "例: 地域交流フェスティバル 2025", "e.g. Community Festival 2025")}
              className="w-full min-h-[48px] px-3 rounded-xl border border-input bg-card text-base"
            />
            <input
              value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="AB12-CD34" maxLength={32}
              autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} inputMode="text"
              className="w-full min-h-[48px] px-3 rounded-xl border border-input bg-card font-mono text-base"
            />

            <button onClick={createEvent} className="w-full min-h-[48px] rounded-xl text-white font-semibold"
              style={{ backgroundColor: "#10B981" }}>
              {t(lang, "イベントを作成", "Create event")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Event view ---------------- */

type EventSession = {
  id: string;
  shared_code: string;
  label: string;
  started_at: string;
  ended_at: string | null;
  created_by: string;
};
type Sub = { mood: string; mood_color: string; timestamp: string; session_id: string };

function EventView({ code, onBack }: { code: string; onBack: () => void }) {
  const { lang } = useLang();
  const sessionId = getSessionId();
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("");

  const groupQ = useQuery({
    queryKey: ["event-group", code],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("shared_code", code).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const subsQ = useQuery({
    queryKey: ["event-subs", code],
    queryFn: async () => {
      const { data, error } = await supabase.from("submissions").select("mood,mood_color,timestamp,session_id").eq("shared_code", code).limit(5000);
      if (error) throw error;
      return (data ?? []) as Sub[];
    },
    refetchInterval: 10000,
  });

  const sessionsQ = useQuery({
    queryKey: ["event-sessions", code],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_sessions").select("*").eq("shared_code", code).order("started_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventSession[];
    },
    refetchInterval: 10000,
  });

  const isAdmin = groupQ.data?.admin_session_id === sessionId;
  const isEvent = groupQ.data?.is_event ?? false;
  const groupName = groupQ.data?.name?.trim() || code;
  const subs = subsQ.data ?? [];
  const sessions = sessionsQ.data ?? [];
  const liveSession = sessions.find((s) => s.ended_at === null) ?? null;
  const participants = new Set(subs.map((d) => d.session_id)).size;

  async function startSession() {
    if (liveSession) return;
    const label = pendingLabel.trim() || defaultSessionLabel(sessions.length + 1, lang);
    const { error } = await supabase.from("event_sessions").insert({
      shared_code: code, label: label.slice(0, 80), created_by: sessionId,
    });
    if (error) { toast.error(error.message); return; }
    setPendingLabel("");
    await supabase.from("groups").update({ results_visible: true }).eq("shared_code", code);
    toast.success(t(lang, "集計を開始しました", "Results started"));
    sessionsQ.refetch(); groupQ.refetch();
  }

  async function stopSession() {
    if (!liveSession) return;
    const { error } = await supabase.from("event_sessions").update({ ended_at: new Date().toISOString() }).eq("id", liveSession.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("groups").update({ results_visible: false }).eq("shared_code", code);
    toast.success(t(lang, "集計を保存しました", "Results saved"));
    sessionsQ.refetch(); groupQ.refetch();
  }

  const liveUrl = typeof window !== "undefined" ? `${window.location.origin}/live/${code}` : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-muted-foreground">← {t(lang, "戻る", "Back")}</button>
      </div>

      {/* Header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FEF3C7" }}>
            <PartyPopper className="w-6 h-6" style={{ color: "#B45309" }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{groupName}</div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="font-mono">{code}</span>
              <button
                onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                className="p-0.5 rounded hover:bg-muted">
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
              {isAdmin && <span className="ml-1 text-emerald-700">· 管理者</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Mini icon={Users} label={t(lang, "参加人数", "People")} value={participants} />
          <Mini icon={BarChart3} label={t(lang, "投稿数", "Posts")} value={subs.length} />
        </div>

        {/* Live presentation link */}
        <a
          href={`/live/${code}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs"
        >
          <Monitor className="w-4 h-4 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{t(lang, "プレゼン用ライブ表示", "Live view for presentation")}</div>
            <div className="text-[10px] text-muted-foreground truncate">{liveUrl}</div>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); navigator.clipboard?.writeText(liveUrl); toast.success(t(lang, "URLをコピー", "URL copied")); }}
            className="p-1 rounded hover:bg-card"
            aria-label="copy"
          ><Copy className="w-3.5 h-3.5" /></button>
        </a>
      </div>

      {/* Event 5-button survey (visible to everyone if configured) */}
      <EventSurveyCard code={code} group={groupQ.data} isAdmin={isAdmin} sessionId={sessionId} />

      {/* Event details — behind a toggle button */}
      <button
        onClick={() => setShowDetails((v) => !v)}
        className="w-full flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
      >
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold flex-1 text-left">{t(lang, "イベント詳細", "Event details")}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
      </button>
      {showDetails && <EventDetailCard group={groupQ.data} />}

      {/* Admin: edit event details + survey */}
      {isAdmin && (
        <EventAdminEditor code={code} group={groupQ.data} onSaved={() => groupQ.refetch()} />
      )}



      {/* Session control (admin) */}
      {isAdmin && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
          <div className="text-sm font-bold">{t(lang, "集計コントロール", "Results control")}</div>
          {liveSession ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </div>
                <div className="text-sm font-semibold text-emerald-900 mt-0.5">{liveSession.label}</div>
                <div className="text-[10px] text-emerald-800/70">
                  {t(lang, "開始", "Started")}: {new Date(liveSession.started_at).toLocaleTimeString(lang === "ja" ? "ja-JP" : undefined, { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button onClick={stopSession}
                className="w-full min-h-[48px] rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: "#EF4444" }}>
                <Square className="w-4 h-4" /> {t(lang, "集計 OFF（保存）", "Results OFF (save)")}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={pendingLabel}
                onChange={(e) => setPendingLabel(e.target.value.slice(0, 80))}
                placeholder={t(lang, "例: スピーカー1 / ワークショップA / 前半", "e.g. Speaker 1 / Workshop A / First half")}
                className="w-full min-h-[44px] px-3 rounded-xl border border-input bg-card text-sm"
              />
              <button onClick={startSession}
                className="w-full min-h-[48px] rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: "#10B981" }}>
                <Play className="w-4 h-4" /> {t(lang, "集計 ON（新しいセッション）", "Results ON (new session)")}
              </button>
              <p className="text-[11px] text-muted-foreground">
                {t(lang,
                  "ONからOFFまでの投稿が1つの円グラフとして保存されます。",
                  "Posts between ON and OFF are saved as one pie chart.")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Session results list */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
        <h3 className="font-bold text-sm">{t(lang, "集計結果一覧", "Saved results")}</h3>
        {sessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            {t(lang, "まだ集計セッションがありません", "No sessions yet")}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
            {sessions.map((s, i) => (
              <SessionCard
                key={s.id}
                index={i + 1}
                session={s}
                subs={subs}
                lang={lang}
                isAdmin={isAdmin}
                onChanged={() => sessionsQ.refetch()}
              />
            ))}
          </div>
        )}
        {sessions.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center">
            👉 {t(lang, "横にスクロールして、何回でも集計結果を確認できます", "Scroll sideways to see all sessions")}
          </p>
        )}
      </div>

      {/* Overall breakdown */}
      {subs.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <div className="text-xs font-bold mb-2 text-muted-foreground">{t(lang, "全体の内訳", "Overall breakdown")}</div>
          <MoodBreakdown subs={subs} lang={lang} />
        </div>
      )}

    </div>
  );
}

function defaultSessionLabel(n: number, lang: "ja" | "en") {
  return lang === "ja" ? `集計${circled(n)}` : `Session ${n}`;
}
function circled(n: number) {
  const c = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩"];
  return c[n - 1] ?? `#${n}`;
}


function Mini({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-xl p-2.5 border border-border flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

export function subsInSession(subs: Sub[], s: EventSession): Sub[] {
  const start = new Date(s.started_at).getTime();
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
  return subs.filter((sub) => {
    const t = new Date(sub.timestamp).getTime();
    return t >= start && t <= end;
  });
}

function SessionCard({ index, session, subs, lang, isAdmin, onChanged }:
  { index: number; session: EventSession; subs: Sub[]; lang: "ja" | "en"; isAdmin: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(session.label);
  const inSession = subsInSession(subs, session);
  const data = MOODS.map((m) => ({ name: m.ja, value: inSession.filter((s) => s.mood === m.ja).length, fill: m.color }))
    .filter((d) => d.value > 0);
  const live = session.ended_at === null;
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString(lang === "ja" ? "ja-JP" : undefined, { hour: "2-digit", minute: "2-digit" });

  async function save() {
    const trimmed = label.trim().slice(0, 80);
    if (!trimmed) { setLabel(session.label); setEditing(false); return; }
    const { error } = await supabase.from("event_sessions").update({ label: trimmed }).eq("id", session.id);
    if (error) { toast.error(error.message); return; }
    setEditing(false); onChanged();
  }
  async function remove() {
    if (!confirm(t(lang, "この集計を削除しますか？", "Delete this session?"))) return;
    const { error } = await supabase.from("event_sessions").delete().eq("id", session.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  }

  return (
    <div className="w-[160px] shrink-0 snap-start rounded-xl border border-border bg-muted/30 p-2 text-center">
      <div className="text-[11px] font-bold flex items-center justify-center gap-1">
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        {t(lang, `集計${circled(index)}`, `#${index}`)}
      </div>
      {editing ? (
        <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          className="w-full text-[10px] text-center rounded border border-input bg-card px-1 py-0.5 mt-0.5" />
      ) : (
        <div className="text-[10px] text-muted-foreground truncate" title={session.label}>{session.label || "—"}</div>
      )}
      <div className="text-[9px] text-muted-foreground">
        {fmt(session.started_at)} – {session.ended_at ? fmt(session.ended_at) : t(lang, "集計中", "live")}
      </div>
      <div className="text-[10px] tabular-nums text-muted-foreground">{inSession.length} {t(lang, "件", "posts")}</div>
      <div className="h-24 mt-1">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground rounded-full border border-dashed border-border/60">—</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius="90%">
                {data.map((_d, i) => <Cell key={i} fill={data[i].fill} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, padding: "2px 6px" }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      {isAdmin && (
        <div className="flex items-center justify-center gap-1 mt-1">
          <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-card" aria-label="rename"><Pencil className="w-3 h-3" /></button>
          <button onClick={remove} className="p-1 rounded hover:bg-card text-red-500" aria-label="delete"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

function MoodBreakdown({ subs, lang }: { subs: Sub[]; lang: "ja" | "en" }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {MOODS.map((m) => {
        const total = subs.filter((s) => s.mood === m.ja).length;
        const pct = subs.length > 0 ? Math.round((total / subs.length) * 100) : 0;
        return (
          <div key={m.ja} className="text-center">
            <div className="text-lg">{m.emoji}</div>
            <div className="text-[9px] text-muted-foreground">{lang === "ja" ? m.ja : m.en}</div>
            <div className="text-[11px] font-bold tabular-nums" style={{ color: m.color }}>{pct}%</div>
          </div>
        );
      })}
    </div>
  );
}


/* ---------------- Event detail + 5-button survey ---------------- */

type GroupRow = {
  shared_code: string;
  name: string | null;
  admin_session_id: string;
  is_event: boolean;
  results_visible: boolean;
  event_title?: string | null;
  event_datetime?: string | null;
  event_location?: string | null;
  event_fee?: string | null;
  event_description?: string | null;
  organizer_name?: string | null;
  event_url?: string | null;
  survey_question?: string | null;
  survey_options?: unknown;
  survey_visibility?: string | null;
};

const SURVEY_PRESETS: { key: string; ja: string; en: string; options: { ja: string; en: string; color: string; emoji: string }[] }[] = [
  {
    key: "yesno",
    ja: "Yes / No / わからない",
    en: "Yes / No / Not sure",
    options: [
      { ja: "Yes", en: "Yes", color: "#10B981", emoji: "⭕" },
      { ja: "どちらかといえばYes", en: "Rather Yes", color: "#34D399", emoji: "🙂" },
      { ja: "わからない", en: "Not sure", color: "#F59E0B", emoji: "😐" },
      { ja: "どちらかといえばNo", en: "Rather No", color: "#FB7185", emoji: "😕" },
      { ja: "No", en: "No", color: "#EF4444", emoji: "❌" },
    ],
  },
  {
    key: "fun",
    ja: "楽しい / まぁまぁ / 普通 / イマイチ / つまらない",
    en: "Fun scale",
    options: [
      { ja: "楽しい", en: "Fun", color: "#10B981", emoji: "😄" },
      { ja: "まぁまぁ", en: "Okay", color: "#34D399", emoji: "🙂" },
      { ja: "普通", en: "Neutral", color: "#F59E0B", emoji: "😐" },
      { ja: "イマイチ", en: "Meh", color: "#FB923C", emoji: "😕" },
      { ja: "つまらない", en: "Boring", color: "#EF4444", emoji: "😞" },
    ],
  },
  {
    key: "good",
    ja: "とても良かった 〜 悪かった",
    en: "Very good — Bad",
    options: [
      { ja: "とても良かった", en: "Very good", color: "#10B981", emoji: "💖" },
      { ja: "良かった", en: "Good", color: "#34D399", emoji: "🙂" },
      { ja: "普通", en: "Neutral", color: "#F59E0B", emoji: "😐" },
      { ja: "イマイチ", en: "Not great", color: "#FB923C", emoji: "😕" },
      { ja: "悪かった", en: "Bad", color: "#EF4444", emoji: "😞" },
    ],
  },
  {
    key: "satisfaction",
    ja: "満足 〜 不満",
    en: "Satisfaction",
    options: [
      { ja: "満足", en: "Satisfied", color: "#10B981", emoji: "😊" },
      { ja: "やや満足", en: "Somewhat", color: "#34D399", emoji: "🙂" },
      { ja: "普通", en: "Neutral", color: "#F59E0B", emoji: "😐" },
      { ja: "やや不満", en: "Somewhat dissat.", color: "#FB923C", emoji: "😕" },
      { ja: "不満", en: "Dissatisfied", color: "#EF4444", emoji: "😞" },
    ],
  },
  {
    key: "useful",
    ja: "とても役に立った 〜 役に立たなかった",
    en: "Usefulness",
    options: [
      { ja: "とても役に立った", en: "Very useful", color: "#10B981", emoji: "💡" },
      { ja: "役に立った", en: "Useful", color: "#34D399", emoji: "🙂" },
      { ja: "普通", en: "Neutral", color: "#F59E0B", emoji: "😐" },
      { ja: "あまり役に立たなかった", en: "Not very", color: "#FB923C", emoji: "😕" },
      { ja: "役に立たなかった", en: "Not useful", color: "#EF4444", emoji: "😞" },
    ],
  },
];

type SurveyOpt = { label: string; color: string; emoji?: string };

function parseSurveyOptions(raw: unknown): SurveyOpt[] | null {
  if (!Array.isArray(raw)) return null;
  const arr = raw as unknown[];
  if (arr.length !== 5) return null;
  const out: SurveyOpt[] = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") return null;
    const obj = o as Record<string, unknown>;
    if (typeof obj.label !== "string" || typeof obj.color !== "string") return null;
    out.push({ label: obj.label, color: obj.color, emoji: typeof obj.emoji === "string" ? obj.emoji : undefined });
  }
  return out;
}

function EventSurveyCard({ code, group, isAdmin, sessionId }: { code: string; group: GroupRow | null | undefined; isAdmin: boolean; sessionId: string }) {
  const { lang } = useLang();
  const options = parseSurveyOptions(group?.survey_options);
  const question = group?.survey_question ?? "";
  const visibility = group?.survey_visibility ?? "participants";
  const canSeeResults = visibility === "participants" || isAdmin;

  const [voted, setVoted] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Load existing vote for this session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("event_survey_responses" as never)
        .select("option_index")
        .eq("shared_code", code)
        .eq("session_id", sessionId)
        .maybeSingle();
      if (!cancelled && data) setVoted((data as { option_index: number }).option_index);
    })();
    return () => { cancelled = true; };
  }, [code, sessionId]);

  const responsesQ = useQuery({
    queryKey: ["event-survey-responses", code],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_survey_responses" as never)
        .select("option_index")
        .eq("shared_code", code);
      return (data ?? []) as { option_index: number }[];
    },
    refetchInterval: 5000,
    enabled: !!options,
  });

  if (!options || options.length !== 5) {
    if (isAdmin) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          {t(lang, "5ボタンアンケートは未設定です。下の「イベント設定」から設定できます。", "5-button survey is not set. Configure it in Event settings below.")}
        </div>
      );
    }
    return null;
  }

  async function vote(i: number) {
    setBusy(true);
    const { error } = await supabase
      .from("event_survey_responses" as never)
      .upsert({ shared_code: code, session_id: sessionId, option_index: i } as never, { onConflict: "shared_code,session_id" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setVoted(i);
    responsesQ.refetch();
    toast.success(t(lang, "回答を送信しました", "Vote submitted"));
  }

  const counts = options.map((_, i) => (responsesQ.data ?? []).filter((r) => r.option_index === i).length);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3">
      {question && <div className="text-sm font-bold text-center">{question}</div>}
      <div className="grid grid-cols-5 gap-1.5">
        {options.map((o, i) => {
          const active = voted === i;
          return (
            <button
              key={i}
              onClick={() => vote(i)}
              disabled={busy}
              className="rounded-xl border p-1.5 flex flex-col items-center justify-center min-h-[72px] transition-all disabled:opacity-60"
              style={{
                borderColor: active ? o.color : "var(--border)",
                backgroundColor: active ? o.color : "var(--card)",
                color: active ? "white" : "inherit",
                boxShadow: active ? `0 4px 12px ${o.color}55` : undefined,
              }}
            >
              {o.emoji && <span className="text-xl leading-none">{o.emoji}</span>}
              <span className="text-[10px] font-semibold text-center leading-tight mt-1 line-clamp-2">{o.label}</span>
            </button>
          );
        })}
      </div>
      {voted !== null && (
        <div className="text-[11px] text-center text-emerald-600">
          ✓ {t(lang, "回答済み（タップで変更）", "Voted (tap to change)")}
        </div>
      )}

      {canSeeResults ? (
        total > 0 && (
          <div className="pt-2 border-t border-border/60 space-y-1.5">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Eye className="w-3 h-3" /> {t(lang, "回答結果", "Results")} · {total} {t(lang, "件", "votes")}
              {visibility === "organizer" && <span className="ml-auto text-amber-600">{t(lang, "主催者のみ", "Organizer only")}</span>}
            </div>
            {options.map((o, i) => {
              const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 truncate">{o.emoji} {o.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, backgroundColor: o.color }} />
                  </div>
                  <span className="text-[10px] tabular-nums w-10 text-right">{counts[i]} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="pt-2 border-t border-border/60 text-[11px] text-center text-muted-foreground inline-flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> {t(lang, "結果は主催者のみが確認できます", "Results visible to organizer only")}
        </div>
      )}
    </div>
  );
}

function EventDetailCard({ group }: { group: GroupRow | null | undefined }) {
  const { lang } = useLang();
  if (!group) return null;
  const hasAny = group.event_title || group.event_datetime || group.event_location || group.event_fee || group.event_description || group.organizer_name || group.event_url;
  if (!hasAny) return null;
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-2.5">
      {group.event_title && <div className="text-base font-bold">{group.event_title}</div>}
      <div className="space-y-2 text-sm">
        {group.event_datetime && <DetailRow icon={Calendar} label={t(lang, "開催日時", "Date & time")} value={group.event_datetime} />}
        {group.event_location && <DetailRow icon={MapPin} label={t(lang, "開催場所", "Location")} value={group.event_location} />}
        {group.event_fee && <DetailRow icon={JapaneseYen} label={t(lang, "参加費", "Fee")} value={group.event_fee} />}
        {group.event_description && <DetailRow icon={FileText} label={t(lang, "イベント内容", "About")} value={group.event_description} multiline />}
        {group.organizer_name && <DetailRow icon={User} label={t(lang, "主催者", "Organizer")} value={group.organizer_name} />}
        {group.event_url && (
          <div className="flex items-start gap-2">
            <LinkIcon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground">{t(lang, "公式イベントページ", "Official page")}</div>
              <a href={group.event_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline break-all">{group.event_url}</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, multiline }: { icon: React.ElementType; label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className={`text-sm ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function EventAdminEditor({ code, group, onSaved }: { code: string; group: GroupRow | null | undefined; onSaved: () => void }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"info" | "survey">("survey");
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="bg-card rounded-2xl border border-border shadow-sm">
      <summary className="flex items-center gap-2 p-4 cursor-pointer list-none">
        <Settings className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold flex-1">{t(lang, "イベント編集（主催者）", "Edit event (organizer)")}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </summary>
      <div className="px-4 pb-4 space-y-3">
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <button onClick={() => setTab("survey")} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${tab === "survey" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {t(lang, "5ボタン設定", "5-button survey")}
          </button>
          <button onClick={() => setTab("info")} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${tab === "info" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {t(lang, "イベント情報", "Event info")}
          </button>
        </div>
        {tab === "survey" ? (
          <SurveyBuilder code={code} group={group} onSaved={onSaved} />
        ) : (
          <EventInfoEditor code={code} group={group} onSaved={onSaved} />
        )}
      </div>
    </details>
  );
}

function SurveyBuilder({ code, group, onSaved }: { code: string; group: GroupRow | null | undefined; onSaved: () => void }) {
  const { lang } = useLang();
  const initialOptions = parseSurveyOptions(group?.survey_options);
  const [mode, setMode] = useState<"preset" | "custom">(initialOptions ? "custom" : "preset");
  const [question, setQuestion] = useState(group?.survey_question ?? "");
  const [visibility, setVisibility] = useState<"organizer" | "participants">((group?.survey_visibility as "organizer" | "participants") ?? "participants");
  const [presetKey, setPresetKey] = useState(SURVEY_PRESETS[0].key);
  const [custom, setCustom] = useState<SurveyOpt[]>(
    initialOptions ?? [
      { label: "", color: "#10B981", emoji: "😄" },
      { label: "", color: "#34D399", emoji: "🙂" },
      { label: "", color: "#F59E0B", emoji: "😐" },
      { label: "", color: "#FB923C", emoji: "😕" },
      { label: "", color: "#EF4444", emoji: "😞" },
    ]
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    let options: SurveyOpt[];
    if (mode === "preset") {
      const p = SURVEY_PRESETS.find((x) => x.key === presetKey) ?? SURVEY_PRESETS[0];
      options = p.options.map((o) => ({ label: lang === "ja" ? o.ja : o.en, color: o.color, emoji: o.emoji }));
    } else {
      if (custom.some((c) => !c.label.trim())) {
        toast.error(t(lang, "すべてのボタンを入力してください", "Fill all 5 buttons"));
        return;
      }
      options = custom.map((c) => ({ label: c.label.trim().slice(0, 40), color: c.color, emoji: c.emoji }));
    }
    setBusy(true);
    const { error } = await supabase.from("groups")
      .update({
        survey_question: question.trim().slice(0, 200) || null,
        survey_options: options as unknown as never,
        survey_visibility: visibility,
      } as never)
      .eq("shared_code", code);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "アンケート設定を保存しました", "Survey saved"));
    onSaved();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold">{t(lang, "① 質問文", "① Question")}</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
          placeholder={t(lang, "このセッションはいかがでしたか？", "How was this session?")}
          className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-input bg-card text-sm"
        />
      </div>

      <div>
        <div className="text-xs font-bold mb-1.5">{t(lang, "② ボタン設定（5つ）", "② Buttons (5)")}</div>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <button onClick={() => setMode("preset")} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${mode === "preset" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {t(lang, "定型テンプレート", "Preset")}
          </button>
          <button onClick={() => setMode("custom")} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${mode === "custom" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {t(lang, "自由に設定", "Custom")}
          </button>
        </div>

        {mode === "preset" ? (
          <div className="mt-2 space-y-2">
            {SURVEY_PRESETS.map((p) => (
              <label key={p.key}
                className={`flex flex-col p-3 rounded-xl border cursor-pointer ${presetKey === p.key ? "border-emerald-400 bg-emerald-50" : "border-border bg-card"}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" checked={presetKey === p.key} onChange={() => setPresetKey(p.key)} />
                  <span className="text-sm font-semibold">{lang === "ja" ? p.ja : p.en}</span>
                </div>
                <div className="flex gap-1 mt-1.5 pl-6">
                  {p.options.map((o, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${o.color}22`, color: o.color }}>
                      {o.emoji} {lang === "ja" ? o.ja : o.en}
                    </span>
                  ))}
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            {custom.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold w-4 text-center text-muted-foreground">{i + 1}</span>
                <input
                  type="color"
                  value={c.color}
                  onChange={(e) => setCustom((prev) => prev.map((x, j) => j === i ? { ...x, color: e.target.value } : x))}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <input
                  value={c.emoji ?? ""}
                  onChange={(e) => setCustom((prev) => prev.map((x, j) => j === i ? { ...x, emoji: e.target.value.slice(0, 2) } : x))}
                  placeholder="🙂"
                  maxLength={2}
                  className="w-10 h-10 text-center rounded-lg border border-input bg-card text-lg"
                />
                <input
                  value={c.label}
                  onChange={(e) => setCustom((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value.slice(0, 40) } : x))}
                  placeholder={t(lang, `選択肢 ${i + 1}`, `Option ${i + 1}`)}
                  className="flex-1 min-h-[40px] px-2 rounded-lg border border-input bg-card text-sm"
                />
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-bold mb-1.5">{t(lang, "③ 集計結果の公開設定", "③ Result visibility")}</div>
        <div className="space-y-1.5">
          <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${visibility === "organizer" ? "border-pink-400 bg-pink-50" : "border-border bg-card"}`}>
            <input type="radio" checked={visibility === "organizer"} onChange={() => setVisibility("organizer")} className="mt-1" />
            <div className="flex-1">
              <div className="text-sm font-semibold flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> {t(lang, "主催者のみ表示", "Organizer only")}</div>
              <div className="text-[11px] text-muted-foreground">{t(lang, "集計結果は主催者だけが見ることができます。", "Only the organizer sees the results.")}</div>
            </div>
          </label>
          <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${visibility === "participants" ? "border-emerald-400 bg-emerald-50" : "border-border bg-card"}`}>
            <input type="radio" checked={visibility === "participants"} onChange={() => setVisibility("participants")} className="mt-1" />
            <div className="flex-1">
              <div className="text-sm font-semibold flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {t(lang, "イベント参加者にも表示", "Participants can see")}</div>
              <div className="text-[11px] text-muted-foreground">{t(lang, "参加者もリアルタイムで結果を見られます。", "Participants see results in real time.")}</div>
            </div>
          </label>
        </div>
      </div>

      <button onClick={save} disabled={busy}
        className="w-full min-h-[48px] rounded-xl text-white font-semibold disabled:opacity-50"
        style={{ backgroundColor: "#10B981" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t(lang, "アンケート設定を保存", "Save survey")}
      </button>
    </div>
  );
}

function EventInfoEditor({ code, group, onSaved }: { code: string; group: GroupRow | null | undefined; onSaved: () => void }) {
  const { lang } = useLang();
  const [title, setTitle] = useState(group?.event_title ?? "");
  const [datetime, setDatetime] = useState(group?.event_datetime ?? "");
  const [location, setLocation] = useState(group?.event_location ?? "");
  const [fee, setFee] = useState(group?.event_fee ?? "");
  const [desc, setDesc] = useState(group?.event_description ?? "");
  const [organizer, setOrganizer] = useState(group?.organizer_name ?? "");
  const [url, setUrl] = useState(group?.event_url ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("groups")
      .update({
        event_title: title.trim().slice(0, 120) || null,
        event_datetime: datetime.trim().slice(0, 120) || null,
        event_location: location.trim().slice(0, 200) || null,
        event_fee: fee.trim().slice(0, 60) || null,
        event_description: desc.trim().slice(0, 1000) || null,
        organizer_name: organizer.trim().slice(0, 120) || null,
        event_url: url.trim().slice(0, 500) || null,
      } as never)
      .eq("shared_code", code);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "保存しました", "Saved"));
    onSaved();
  }

  const inputCls = "mt-1 w-full min-h-[44px] px-3 rounded-xl border border-input bg-card text-sm";
  return (
    <div className="space-y-2.5">
      <Labeled label={t(lang, "イベント名", "Event title")}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder={t(lang, "例: 未来をつくるテック勉強会", "e.g. Tech Meetup")} />
      </Labeled>
      <Labeled label={t(lang, "開催日時", "Date & time")}>
        <input value={datetime} onChange={(e) => setDatetime(e.target.value)} className={inputCls} placeholder="2025/7/20 (日) 14:00〜16:30" />
      </Labeled>
      <Labeled label={t(lang, "開催場所", "Location")}>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder={t(lang, "渋谷区文化総合センター 6F", "e.g. Shibuya Center 6F")} />
      </Labeled>
      <Labeled label={t(lang, "参加費", "Fee")}>
        <input value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} placeholder="1,500円 / Free" />
      </Labeled>
      <Labeled label={t(lang, "イベント内容", "About")}>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 1000))} rows={3}
          className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-card text-sm"
          placeholder={t(lang, "最新のテクノロジーについて学び、参加者同士で交流します。", "Learn and connect around the latest tech.")} />
      </Labeled>
      <Labeled label={t(lang, "主催者名", "Organizer name")}>
        <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} className={inputCls} placeholder={t(lang, "YururiTech コミュニティ", "YururiTech community")} />
      </Labeled>
      <Labeled label={t(lang, "公式イベントページ (任意)", "Official event page (optional)")}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} placeholder="https://example.com/event/1234" inputMode="url" />
      </Labeled>
      <button onClick={save} disabled={busy}
        className="w-full min-h-[48px] rounded-xl text-white font-semibold disabled:opacity-50"
        style={{ backgroundColor: "#7C3AED" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t(lang, "保存する", "Save")}
      </button>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
