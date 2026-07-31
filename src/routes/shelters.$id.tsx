/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { PostsGoogleMap } from "@/components/PostsGoogleMap";
import {
  SUPPLY_ITEMS, PROBLEM_ITEMS, crowdMeta, petMeta, itemLabel,
  type ItemMeta, type ShelterRow, type ShelterPostRow,
} from "@/lib/shelters";
import {
  ArrowLeft, Loader2, MapPin, PawPrint, Users, Megaphone, ExternalLink,
  ImagePlus, X, Send, Settings, Package,
} from "lucide-react";

export const Route = createFileRoute("/shelters/$id")({
  head: () => ({
    meta: [
      { title: "避難所の状況 — みんなの困ったMap" },
      { name: "description", content: "避難所の混雑状況・必要物資・困りごと・投稿をリアルタイムに共有します。" },
      { property: "og:title", content: "避難所の状況 — みんなの困ったMap" },
      { property: "og:description", content: "避難所の混雑状況・必要物資・困りごとを共有。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShelterDetailPage,
});

function ShelterDetailPage() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"status" | "posts">("status");
  const [canAdmin, setCanAdmin] = useState(false);

  const shelterQ = useQuery({
    queryKey: ["shelter", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shelters" as any).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as ShelterRow | null;
    },
  });

  const votesQ = useQuery({
    queryKey: ["shelter-votes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shelter_status_votes" as any)
        .select("kind,item_key").eq("shelter_id", id);
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of (data ?? []) as any[]) {
        const k = `${r.kind}:${r.item_key}`;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    },
  });

  const shelter = shelterQ.data;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("is_admin");
      setCanAdmin(!!data || (!!shelter?.admin_session_id && shelter.admin_session_id === getSessionId()));
    })();
  }, [shelter?.admin_session_id]);

  async function vote(kind: "supply" | "problem", itemKey: string) {
    const { error } = await supabase.from("shelter_status_votes" as any).insert({
      shelter_id: id, kind, item_key: itemKey, session_id: getSessionId(),
    } as any);
    if (error) {
      if (error.code === "23505") { toast.info(t(lang, "すでに報告済みです", "Already reported")); return; }
      toast.error(error.message); return;
    }
    toast.success(t(lang, "報告しました", "Reported"));
    qc.invalidateQueries({ queryKey: ["shelter-votes", id] });
  }

  if (shelterQ.isLoading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!shelter) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{t(lang, "避難所が見つかりません", "Shelter not found")}</p>
        <Link to="/shelters" className="text-xs underline">{t(lang, "避難所一覧へ", "Back to shelters")}</Link>
      </div>
    );
  }

  const c = crowdMeta(shelter.crowdedness);
  const p = petMeta(shelter.pet_status);
  const counts = votesQ.data ?? new Map<string, number>();

  return (
    <div className="space-y-4 pb-8">
      <Link to="/shelters" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "避難所一覧", "Shelters")}
      </Link>

      <div className="space-y-2">
        <h1 className="text-lg font-extrabold">{shelter.name}</h1>
        {shelter.address && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3" /> {shelter.address}
          </div>
        )}
        {shelter.lat != null && shelter.lng != null && (
          <div className="rounded-2xl overflow-hidden border border-border">
            <PostsGoogleMap height={200} zoom={15}
              center={{ lat: shelter.lat, lng: shelter.lng }}
              items={[{ id: shelter.id, lat: shelter.lat, lng: shelter.lng, kind: "activity", count: 0 }]} />
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ backgroundColor: c.color }}>
            <Users className="w-3 h-3" /> {lang === "ja" ? c.ja : c.en}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ backgroundColor: p.color }}>
            <PawPrint className="w-3 h-3" /> {lang === "ja" ? p.ja : p.en}
          </span>
        </div>
        {shelter.announcement && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
            <Megaphone className="w-4 h-4 shrink-0" />
            <span className="whitespace-pre-wrap">{shelter.announcement}</span>
          </div>
        )}
        {!!(shelter.surplus_supplies ?? []).length && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 flex gap-2">
            <Package className="w-4 h-4 shrink-0" />
            <span>
              {t(lang, "余剰物資：", "Surplus supplies: ")}
              {(shelter.surplus_supplies ?? []).map((s) => itemLabel(SUPPLY_ITEMS, s, lang)).join(" / ")}
            </span>
          </div>
        )}
        {shelter.info_url && (
          <a href={shelter.info_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sky-700 underline break-all">
            <ExternalLink className="w-3 h-3" /> {t(lang, "情報・連絡先", "Information / contact")}
          </a>
        )}
        {canAdmin && (
          <Link to="/shelters/$id/admin" params={{ id: shelter.id }}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 underline">
            <Settings className="w-3.5 h-3.5" /> {t(lang, "避難所の管理", "Shelter admin")}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted">
        {([
          { id: "status" as const, ja: "現在の状況", en: "Current status" },
          { id: "posts" as const, ja: "投稿", en: "Posts" },
        ]).map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)}
            className={`min-h-[38px] rounded-xl text-xs font-bold ${tab === x.id ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {lang === "ja" ? x.ja : x.en}
          </button>
        ))}
      </div>

      {tab === "status" ? (
        <div className="space-y-4">
          <VoteSection title={t(lang, "必要な物資", "Needed supplies")} accent="#0EA5E9"
            items={SUPPLY_ITEMS} kind="supply" counts={counts} onVote={vote} lang={lang}
            extra={shelter.needed_supplies ?? []} />
          <VoteSection title={t(lang, "困っていること", "Problems")} accent="#F97316"
            items={PROBLEM_ITEMS} kind="problem" counts={counts} onVote={vote} lang={lang}
            extra={shelter.problem_categories ?? []} />
        </div>
      ) : (
        <ShelterPosts shelterId={shelter.id} canModerate={canAdmin} />
      )}
    </div>
  );
}

function VoteSection({ title, items, kind, counts, onVote, lang, accent, extra }: {
  title: string; items: ItemMeta[]; kind: "supply" | "problem";
  counts: Map<string, number>; onVote: (k: "supply" | "problem", id: string) => void;
  lang: "ja" | "en"; accent: string; extra: string[];
}) {
  const all: ItemMeta[] = [...items];
  for (const e of extra) {
    if (!all.some((i) => i.id === e)) all.push({ id: e, ja: e, en: e, emoji: "•" });
  }
  const sorted = [...all].sort((a, b) => (counts.get(`${kind}:${b.id}`) ?? 0) - (counts.get(`${kind}:${a.id}`) ?? 0));
  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="text-[12px] font-bold">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        {sorted.map((it) => {
          const n = counts.get(`${kind}:${it.id}`) ?? 0;
          return (
            <button key={it.id} onClick={() => onVote(kind, it.id)}
              className="min-h-[46px] rounded-xl border text-xs font-bold flex items-center justify-between px-3 gap-2"
              style={n > 0
                ? { borderColor: accent, backgroundColor: `${accent}14`, color: accent }
                : { borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
              <span className="truncate">{it.emoji} {lang === "ja" ? it.ja : it.en}</span>
              <span className="shrink-0 rounded-full px-1.5 text-[11px] font-extrabold text-white"
                style={{ backgroundColor: n > 0 ? accent : "#CBD5E1" }}>{n}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {lang === "ja" ? "ボタンを押すと集計に反映されます（1人1回）" : "Tap to add your report (once per device)"}
      </p>
    </div>
  );
}

function ShelterPosts({ shelterId, canModerate }: { shelterId: string; canModerate: boolean }) {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const postsQ = useQuery({
    queryKey: ["shelter-posts", shelterId],
    queryFn: async () => {
      const { data, error } = await supabase.from("shelter_posts" as any)
        .select("*").eq("shelter_id", shelterId).eq("hidden", false)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ShelterPostRow[];
    },
  });

  async function submit() {
    if (!text.trim() && !file) { toast.error(t(lang, "内容を入力してください", "Please write something")); return; }
    setBusy(true);
    try {
      let photo_url: string | null = null;
      if (file) {
        const sid = getSessionId();
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `shelters/${sid}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("activity-photos").upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg",
        });
        if (up.error) throw up.error;
        const signed = await supabase.storage.from("activity-photos")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (signed.error) throw signed.error;
        photo_url = signed.data.signedUrl;
      }
      const { error } = await supabase.from("shelter_posts" as any).insert({
        shelter_id: shelterId, session_id: getSessionId(),
        content: text.trim().slice(0, 500), photo_url,
      } as any);
      if (error) throw error;
      setText(""); setFile(null);
      toast.success(t(lang, "投稿しました", "Posted"));
      qc.invalidateQueries({ queryKey: ["shelter-posts", shelterId] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function hide(postId: string) {
    const { error } = await supabase.from("shelter_posts" as any).update({ hidden: true } as any).eq("id", postId);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "削除しました", "Deleted"));
    qc.invalidateQueries({ queryKey: ["shelter-posts", shelterId] });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={3}
          placeholder={t(lang, "避難所の様子を共有しましょう", "Share what's happening at the shelter")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-border" />
            <button onClick={() => setFile(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 text-xs font-bold text-sky-700 cursor-pointer">
            <ImagePlus className="w-4 h-4" /> {t(lang, "写真を追加（任意）", "Add a photo (optional)")}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          </label>
        )}
        <button onClick={submit} disabled={busy}
          className="w-full min-h-[46px] rounded-xl bg-sky-500 text-white font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t(lang, "投稿する", "Post")}
        </button>
      </div>

      {postsQ.isLoading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (postsQ.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t(lang, "まだ投稿はありません", "No posts yet")}
        </div>
      ) : (
        (postsQ.data ?? []).map((post) => (
          <div key={post.id} className="rounded-2xl border border-border bg-card p-3 space-y-2">
            {post.photo_url && <img src={post.photo_url} alt="" className="w-full h-40 object-cover rounded-xl" />}
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            {canModerate && (
              <button onClick={() => hide(post.id)}
                className="text-[11px] text-red-600 font-bold inline-flex items-center gap-1">
                <X className="w-3 h-3" /> {t(lang, "この投稿を削除", "Delete this post")}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
