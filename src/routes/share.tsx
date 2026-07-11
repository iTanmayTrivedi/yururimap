import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MOODS, filterByRange, getSessionId, type TimeRange } from "@/lib/session";
import { RangeTabs } from "./map";
import { MapView } from "@/components/MapView";
import {
  Users, Flag, Loader2, X, CheckCircle2, Plus, Shield,
  MessageSquare, LifeBuoy, BarChart3, Map as MapIcon, PieChart, Send,
} from "lucide-react";

const JAPAN_CENTER: [number, number] = [36.5, 138.0];
const JAPAN_ZOOM = 5;

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "共有 / Share" },
      { name: "description", content: "Share your moods with friends or at events." },
    ],
  }),
  component: SharePage,
});

const CODE_KEY = "niko_active_code";
const CODE_RE = /^[A-Z0-9_-]{4,32}$/;

export function normalizeCode(raw: string): { code: string | null; reason?: string } {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return { code: null, reason: "コードを入力してください / Please enter a code" };
  if (!CODE_RE.test(trimmed)) {
    return {
      code: null,
      reason:
        "コードは半角英数字・ハイフン(-)・アンダースコア(_) 4〜32文字 / Use A–Z, 0–9, - or _ (4–32 chars)",
    };
  }
  return { code: trimmed };
}

type Mode = "menu" | "create" | "join";

function SharePage() {
  const [mode, setMode] = useState<Mode>("menu");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<string>("");

  useEffect(() => {
    setActiveCode(localStorage.getItem(CODE_KEY) ?? "");
    const onStorage = () => setActiveCode(localStorage.getItem(CODE_KEY) ?? "");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [openCode, mode]);

  function clearCode() {
    localStorage.removeItem(CODE_KEY);
    setActiveCode("");
    toast.success("共有コードを解除しました / Unbound shared code");
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">共有</h2>
        <p className="text-sm text-muted-foreground">Share</p>
      </div>

      {activeCode ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-emerald-800">投稿中の共有コード / Posting as</div>
            <div className="font-mono font-bold text-base text-emerald-900 truncate">{activeCode}</div>
            <button
              onClick={() => setOpenCode(activeCode)}
              className="mt-2 text-xs px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-800"
            >
              グループを開く / Open group
            </button>
          </div>
          <button onClick={clearCode} className="text-xs px-2.5 py-1.5 rounded-md bg-white border border-emerald-300 text-emerald-800 shrink-0">
            解除
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          共有コードは未設定です / No shared code set.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode("create")}
          className="text-left bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-md active:scale-[0.99] transition"
        >
          <span className="w-11 h-11 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "#EDE9FE" }}>
            <Plus className="w-6 h-6" style={{ color: "#7C3AED" }} />
          </span>
          <h3 className="text-sm font-bold">グループを作成</h3>
          <p className="text-[11px] text-muted-foreground">Create group</p>
        </button>
        <button
          onClick={() => setMode("join")}
          className="text-left bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-md active:scale-[0.99] transition"
        >
          <span className="w-11 h-11 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "#D1FAE5" }}>
            <Users className="w-6 h-6" style={{ color: "#059669" }} />
          </span>
          <h3 className="text-sm font-bold">グループに参加</h3>
          <p className="text-[11px] text-muted-foreground">Join group</p>
        </button>
      </div>

      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm opacity-90">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#DBEAFE" }}>
            <Flag className="w-6 h-6" style={{ color: "#2563EB" }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold">イベントで共有する</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Coming Soon</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Share at an event</p>
          </div>
        </div>
      </div>

      {mode === "create" && <CreateSheet onClose={() => setMode("menu")} onOpenGroup={(c) => { setMode("menu"); setOpenCode(c); }} />}
      {mode === "join" && <JoinSheet onClose={() => setMode("menu")} onOpenGroup={(c) => { setMode("menu"); setOpenCode(c); }} />}
      {openCode && <GroupSheet code={openCode} onClose={() => setOpenCode(null)} />}

      <div className="text-center text-[11px] text-muted-foreground">
        投稿は <Link to="/" className="underline">気持ち</Link> 画面から。
      </div>
    </div>
  );
}

/* ---------------- Create ---------------- */

function CreateSheet({ onClose, onOpenGroup }: { onClose: () => void; onOpenGroup: (code: string) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [precision, setPrecision] = useState<"500m" | "exact">("500m");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const { code: c, reason } = normalizeCode(code);
    if (!c) { setErr(reason ?? null); return; }
    setErr(null);
    setBusy(true);
    // check existing
    const { data: existing, error: exErr } = await supabase.from("groups").select("shared_code").eq("shared_code", c).maybeSingle();
    if (exErr) { toast.error(exErr.message); setBusy(false); return; }
    if (existing) {
      setBusy(false);
      setErr("このコードは既に使われています。参加画面から参加してください / Code already exists — use Join.");
      return;
    }
    const { error } = await supabase.from("groups").insert({
      shared_code: c,
      name: name.trim().slice(0, 60),
      admin_session_id: getSessionId(),
      location_precision: precision,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    localStorage.setItem(CODE_KEY, c);
    toast.success(`グループを作成しました / Created ${c}`);
    onOpenGroup(c);
  }

  return (
    <Sheet onClose={onClose} title="共有グループを作成 / Create group">
      <Field label="① グループ名 / Name" hint={`${name.length}/60`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder="例: 石田家, 会社イベント"
          className="w-full min-h-[48px] px-3 rounded-xl border border-input bg-card text-base"
        />
      </Field>
      <Field label="② グループ共有コード / Code" hint="半角英数字・ハイフン・アンダースコア 4〜32文字">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(null); }}
          placeholder="例: AB12-CD34"
          maxLength={32}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          className="w-full min-h-[48px] px-3 rounded-xl border bg-card font-mono text-base"
          style={{ borderColor: err ? "#FCA5A5" : "var(--input)" }}
        />

        {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
      </Field>
      <Field label="③ 位置情報 / Location">
        <div className="space-y-2">
          {[
            { v: "500m" as const, ja: "500mグリッド", en: "Approximate (500m)" },
            { v: "exact" as const, ja: "正確な位置情報", en: "Exact location" },
          ].map((o) => (
            <label key={o.v} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${precision === o.v ? "border-violet-400 bg-violet-50" : "border-border bg-card"}`}>
              <input type="radio" checked={precision === o.v} onChange={() => setPrecision(o.v)} />
              <span className="flex-1">
                <span className="block font-medium text-sm">{o.ja}</span>
                <span className="block text-[11px] text-muted-foreground">{o.en}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      <ComingRow icon={Shield} ja="管理者機能" en="Admin tools" />
      <ComingRow icon={LifeBuoy} ja="困ったボタン (LINE通知)" en="Need Help (LINE)" />
      <ComingRow icon={BarChart3} ja="アンケートボタン" en="Survey" />
      <ComingRow icon={MessageSquare} ja="コメント機能" en="Comments" />

      <button
        onClick={submit}
        disabled={busy || !name.trim() || !code.trim()}
        className="w-full min-h-[52px] rounded-xl text-white font-medium disabled:opacity-50"
        style={{ backgroundColor: "#7C3AED" }}
      >
        {busy ? "作成中..." : "コードを発行する / Create"}
      </button>
    </Sheet>
  );
}

function ComingRow({ icon: Icon, ja, en }: { icon: React.ElementType; ja: string; en: string }) {
  return (
    <div className="flex items-center gap-3 py-2 opacity-90">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="flex-1 text-sm">{ja} <span className="text-[10px] text-muted-foreground">/ {en}</span></span>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">利用可 / Available</span>
    </div>
  );
}

/* ---------------- Join ---------------- */

function JoinSheet({ onClose, onOpenGroup }: { onClose: () => void; onOpenGroup: (code: string) => void }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const { code: c, reason } = normalizeCode(input);
    if (!c) { setErr(reason ?? null); return; }
    setErr(null);
    setBusy(true);
    // Auto-create group row if missing (join-or-create simplicity).
    const { data: existing } = await supabase.from("groups").select("shared_code").eq("shared_code", c).maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("groups").insert({
        shared_code: c, name: "", admin_session_id: getSessionId(), location_precision: "500m",
      });
      if (error) { toast.error(error.message); setBusy(false); return; }
    }
    setBusy(false);
    localStorage.setItem(CODE_KEY, c);
    toast.success(`参加しました / Joined ${c}`);
    onOpenGroup(c);
  }

  return (
    <Sheet onClose={onClose} title="共有コードを入力 / Join group">
      <p className="text-xs text-muted-foreground">
        参加したいグループの共有コードを入力してください。<br />
        Enter the shared code for the group you want to join.
      </p>
      <input
        value={input}
        onChange={(e) => { setInput(e.target.value.toUpperCase()); setErr(null); }}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="例: AB12-CD34"
        maxLength={32}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        className="w-full min-h-[52px] px-3 rounded-xl border bg-card font-mono text-base"
        style={{ borderColor: err ? "#FCA5A5" : "var(--input)" }}
      />

      {err && <p className="text-[11px] text-red-600">{err}</p>}
      <button
        onClick={submit}
        disabled={busy || !input.trim()}
        className="w-full min-h-[52px] rounded-xl text-white font-medium disabled:opacity-50"
        style={{ backgroundColor: "#7C3AED" }}
      >
        {busy ? "参加中..." : "参加する / Join"}
      </button>
    </Sheet>
  );
}

/* ---------------- Group view (with tabs) ---------------- */

type Tab = "map" | "stats" | "comments" | "help" | "survey" | "admin";

function GroupSheet({ code, onClose }: { code: string; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("map");
  const [range, setRange] = useState<TimeRange>("all");
  const sessionId = getSessionId();

  const groupQ = useQuery({
    queryKey: ["group", code],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("shared_code", code).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const subsQ = useQuery({
    queryKey: ["group-subs", code],
    queryFn: async () => {
      const { data, error } = await supabase.from("submissions")
        .select("*").eq("shared_code", code).order("timestamp", { ascending: false }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ranged = filterByRange(subsQ.data ?? [], range);
  const participants = new Set(ranged.map((d) => d.session_id)).size;
  const isAdmin = groupQ.data?.admin_session_id === sessionId;

  const groupName = groupQ.data?.name?.trim() || code;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="min-w-0">
              <h3 className="text-base font-bold truncate">{groupName}</h3>
              <div className="font-mono text-[11px] text-muted-foreground truncate">{code}{isAdmin && " · 管理者 / Admin"}</div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <Mini icon={Users} label="参加人数 / People" value={participants} />
            <Mini icon={MessageSquare} label="投稿数 / Posts" value={ranged.length} />
          </div>

          <div className="flex gap-1 overflow-x-auto mt-3 -mx-1 px-1">
            {([
              ["map", MapIcon, "マップ"],
              ["stats", PieChart, "集計"],
              ["comments", MessageSquare, "コメント"],
              ["help", LifeBuoy, "困った"],
              ["survey", BarChart3, "アンケート"],
              ["admin", Shield, "管理"],
            ] as const).map(([t, Icon, ja]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${tab === t ? "text-white" : "text-foreground bg-card"}`}
                style={tab === t ? { backgroundColor: "#7C3AED", borderColor: "#7C3AED" } : { borderColor: "var(--border)" }}>
                <Icon className="w-3.5 h-3.5" /> {ja}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {tab !== "admin" && tab !== "comments" && tab !== "help" && tab !== "survey" && (
            <RangeTabs value={range} onChange={setRange} />
          )}

          {tab === "map" && <GroupMapTab ranged={ranged} loading={subsQ.isLoading} />}
          {tab === "stats" && <GroupStatsTab ranged={ranged} />}
          {tab === "comments" && <CommentsTab code={code} />}
          {tab === "help" && <HelpTab code={code} isAdmin={isAdmin} />}
          {tab === "survey" && <SurveyTab code={code} isAdmin={isAdmin} sessionId={sessionId} />}
          {tab === "admin" && <AdminTab code={code} isAdmin={isAdmin} group={groupQ.data} />}
        </div>
      </div>
    </div>
  );
}

function GroupMapTab({ ranged, loading }: { ranged: any[]; loading: boolean }) {
  const points = ranged
    .filter((d) => d.rounded_lat !== null && d.rounded_lng !== null)
    .map((d) => ({
      lat: d.rounded_lat as number, lng: d.rounded_lng as number,
      color: d.mood_color, emoji: MOODS.find((m) => m.ja === d.mood)?.emoji, label: d.mood,
    }));
  const noLoc = ranged.length - points.length;
  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card">
      {loading ? (
        <div className="h-[260px] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <ClientOnly fallback={<div className="h-[260px]" />}>
          <MapView points={points} height="260px" center={JAPAN_CENTER} zoom={JAPAN_ZOOM} fitToPoints={false} jitterDuplicates />
        </ClientOnly>
      )}
      <div className="text-[10px] text-center py-1.5 text-muted-foreground border-t border-border bg-muted/40">
        🔒 500mグリッド · {points.length} 表示 · {noLoc} 位置なし
      </div>
    </div>
  );
}

function GroupStatsTab({ ranged }: { ranged: any[] }) {
  const counts = MOODS.map((m) => {
    const n = ranged.filter((d) => d.mood === m.ja).length;
    return { ...m, count: n, pct: ranged.length ? (n / ranged.length) * 100 : 0 };
  });
  if (ranged.length === 0) return <Empty text="このコードの記録はまだありません / No records yet" />;
  return (
    <div className="bg-card rounded-2xl p-3 border border-border space-y-2">
      <h4 className="text-sm font-semibold">気持ちの割合 / Mood</h4>
      {counts.map((c) => (
        <div key={c.ja}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{c.emoji}</span>
            <span className="text-sm flex-1">{c.ja}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{c.count}</span>
            <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color: c.color }}>{c.pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Comments ---------------- */

function CommentsTab({ code }: { code: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ["group-comments", code];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_comments").select("*").eq("shared_code", code).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  async function send() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    const { error } = await supabase.from("group_comments").insert({ shared_code: code, session_id: getSessionId(), content: t.slice(0, 500) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    qc.invalidateQueries({ queryKey: key });
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="コメントを書く / Write a comment"
          className="flex-1 min-h-[44px] px-3 rounded-xl border border-input bg-card text-sm" maxLength={500} />
        <button onClick={send} disabled={busy || !text.trim()} className="min-h-[44px] px-4 rounded-xl text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1" style={{ backgroundColor: "#7C3AED" }}>
          <Send className="w-4 h-4" /> 送信
        </button>
      </div>
      {q.isLoading ? <Loader /> : (q.data ?? []).length === 0 ? <Empty text="まだコメントはありません / No comments yet" /> : (
        <div className="space-y-2">
          {(q.data ?? []).map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-3">
              <div className="text-sm whitespace-pre-wrap break-words">{c.content}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Help ---------------- */

function HelpTab({ code, isAdmin }: { code: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ["group-help", code];
  const q = useQuery({
    queryKey: key,
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_help_requests").select("*").eq("shared_code", code).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  async function send() {
    setBusy(true);
    const { error } = await supabase.from("group_help_requests").insert({ shared_code: code, session_id: getSessionId(), message: msg.slice(0, 500) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setMsg("");
    toast.success("管理者に通知しました / Admin has been notified");
    qc.invalidateQueries({ queryKey: key });
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900">
        困ったときはこのボタンで管理者に通知が届きます。<br />
        Tap the button to notify the group admin (LINE-style alert).
      </div>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value.slice(0, 500))}
        placeholder="任意のメッセージ / Optional message"
        className="w-full min-h-[80px] p-3 rounded-xl border border-input bg-card text-sm" />
      <button onClick={send} disabled={busy} className="w-full min-h-[52px] rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "#E11D48" }}>
        <LifeBuoy className="w-5 h-5" /> {busy ? "送信中..." : "困った / Send Help Alert"}
      </button>

      {isAdmin && (
        <div className="pt-2">
          <h4 className="text-sm font-semibold mb-2">受信一覧 / Received (Admin)</h4>
          {q.isLoading ? <Loader /> : (q.data ?? []).length === 0 ? <Empty text="通知はありません / No alerts" /> : (
            <div className="space-y-2">
              {(q.data ?? []).map((h: any) => (
                <div key={h.id} className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="text-sm whitespace-pre-wrap break-words">{h.message || "（メッセージなし）"}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(h.created_at).toLocaleString()} · {h.session_id.slice(0, 8)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Survey ---------------- */

function SurveyTab({ code, isAdmin, sessionId }: { code: string; isAdmin: boolean; sessionId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const surveysKey = ["group-surveys", code];
  const surveys = useQuery({
    queryKey: surveysKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_surveys").select("*").eq("shared_code", code).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const surveyIds = useMemo(() => (surveys.data ?? []).map((s: any) => s.id), [surveys.data]);
  const responses = useQuery({
    enabled: surveyIds.length > 0,
    queryKey: ["group-survey-resp", code, surveyIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_survey_responses").select("*").in("survey_id", surveyIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function createSurvey() {
    const question = q.trim();
    const cleaned = opts.map((o) => o.trim()).filter(Boolean);
    if (!question || cleaned.length < 2) { toast.error("質問と2つ以上の選択肢を入力してください"); return; }
    setBusy(true);
    const { error } = await supabase.from("group_surveys").insert({
      shared_code: code, admin_session_id: sessionId, question, options: cleaned,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setQ(""); setOpts(["", ""]);
    toast.success("アンケートを作成しました / Survey created");
    qc.invalidateQueries({ queryKey: surveysKey });
  }

  async function vote(surveyId: string, idx: number) {
    const { error } = await supabase.from("group_survey_responses").insert({ survey_id: surveyId, session_id: sessionId, option_index: idx });
    if (error) {
      if (error.code === "23505") toast.info("既に投票済みです / Already voted");
      else toast.error(error.message);
      return;
    }
    toast.success("投票しました / Voted");
    qc.invalidateQueries({ queryKey: ["group-survey-resp", code, surveyIds.join(",")] });
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h4 className="text-sm font-semibold">アンケートを作成 / New survey</h4>
          <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 200))} placeholder="質問 / Question"
            className="w-full min-h-[44px] px-3 rounded-xl border border-input bg-card text-sm" />
          {opts.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`選択肢 ${i + 1}`}
                className="flex-1 min-h-[40px] px-3 rounded-xl border border-input bg-card text-sm" />
              {opts.length > 2 && (
                <button onClick={() => setOpts(opts.filter((_, j) => j !== i))} className="px-2 text-muted-foreground"><X className="w-4 h-4" /></button>
              )}
            </div>
          ))}
          {opts.length < 8 && (
            <button onClick={() => setOpts([...opts, ""])} className="text-xs text-violet-700">+ 選択肢を追加</button>
          )}
          <button onClick={createSurvey} disabled={busy} className="w-full min-h-[44px] rounded-xl text-white font-medium disabled:opacity-50" style={{ backgroundColor: "#7C3AED" }}>
            {busy ? "作成中..." : "作成 / Create"}
          </button>
        </div>
      )}

      {surveys.isLoading ? <Loader /> : (surveys.data ?? []).length === 0 ? <Empty text="アンケートはまだありません / No surveys yet" /> : (
        <div className="space-y-3">
          {(surveys.data ?? []).map((s: any) => {
            const resps = (responses.data ?? []).filter((r: any) => r.survey_id === s.id);
            const myVote = resps.find((r: any) => r.session_id === sessionId)?.option_index;
            const total = resps.length;
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-3 space-y-2">
                <div className="text-sm font-semibold">{s.question}</div>
                <div className="space-y-1.5">
                  {(s.options as string[]).map((opt, i) => {
                    const count = resps.filter((r: any) => r.option_index === i).length;
                    const pct = total ? (count / total) * 100 : 0;
                    const voted = myVote === i;
                    return (
                      <button key={i} disabled={myVote !== undefined} onClick={() => vote(s.id, i)}
                        className={`w-full text-left rounded-lg border p-2 relative overflow-hidden ${voted ? "border-violet-400" : "border-border"} disabled:cursor-default`}>
                        <div className="absolute inset-0 bg-violet-100" style={{ width: `${pct}%`, opacity: myVote !== undefined ? 1 : 0 }} />
                        <div className="relative flex items-center gap-2 text-sm">
                          <span className="flex-1">{opt}</span>
                          {myVote !== undefined && (
                            <>
                              <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                              <span className="text-xs font-bold tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground">{total} 票 · {new Date(s.created_at).toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Admin ---------------- */

function AdminTab({ code, isAdmin, group }: { code: string; isAdmin: boolean; group: any }) {
  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-center text-muted-foreground">
        あなたはこのグループの管理者ではありません。<br />
        You are not the admin of this group.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-violet-700" />
          <span className="text-sm font-semibold text-violet-900">管理者 / Admin</span>
        </div>
        <p className="text-xs text-violet-900/80">
          このグループを作成したセッションが管理者です。困ったボタンの受信、アンケートの作成ができます。<br />
          The session that created this group is the admin. You can receive help alerts and create surveys.
        </p>
      </div>
      <InfoRow label="グループ名 / Name" value={group?.name || "—"} />
      <InfoRow label="共有コード / Code" value={code} mono />
      <InfoRow label="位置精度 / Precision" value={group?.location_precision || "500m"} />
      <InfoRow label="作成日 / Created" value={group?.created_at ? new Date(group.created_at).toLocaleString() : "—"} />
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

/* ---------------- Shared UI bits ---------------- */

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="bg-card rounded-xl p-2.5 border border-border flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase text-muted-foreground truncate">{label}</div>
        <div className="text-lg font-bold tabular-nums leading-none mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function Loader() { return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>; }
function Empty({ text }: { text: string }) { return <div className="text-center text-sm text-muted-foreground py-6 bg-muted/30 rounded-xl">{text}</div>; }
