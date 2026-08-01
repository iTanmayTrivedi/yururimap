/* eslint-disable @typescript-eslint/no-explicit-any */
// "Disaster Life Ideas" — survival tips shared by anyone, moderated by admins.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { useIsAdmin, ModerationBar, AdminEditDialog } from "@/lib/admin";
import { ArrowLeft, Lightbulb, Loader2, ImagePlus, X, Send, Plus } from "lucide-react";

export const Route = createFileRoute("/ideas")({
  head: () => ({
    meta: [
      { title: "防災の生活アイデア — みんなの困ったMap" },
      { name: "description", content: "断水・停電のときに役立つ生活の知恵を共有する掲示板。新聞紙で食器を洗う方法など、被災経験からのアイデアを集めています。" },
      { property: "og:title", content: "防災の生活アイデア — みんなの困ったMap" },
      { property: "og:description", content: "断水・停電のときに役立つ生活の知恵をみんなで共有。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IdeasPage,
});

export const IDEA_CATEGORIES = [
  { id: "water", ja: "水・トイレ", en: "Water & toilets", emoji: "💧" },
  { id: "food", ja: "食事", en: "Food", emoji: "🍙" },
  { id: "power", ja: "停電・電気", en: "Power", emoji: "🔌" },
  { id: "warmth", ja: "暑さ・寒さ", en: "Heat & cold", emoji: "🧣" },
  { id: "hygiene", ja: "衛生・健康", en: "Hygiene & health", emoji: "🧼" },
  { id: "kids", ja: "子ども・赤ちゃん", en: "Kids & babies", emoji: "🍼" },
  { id: "pets", ja: "ペット", en: "Pets", emoji: "🐾" },
  { id: "other", ja: "その他", en: "Other", emoji: "➕" },
];

type IdeaRow = {
  id: string; session_id: string; category: string | null;
  title: string; body: string; photo_url: string | null;
  hidden: boolean; created_at: string;
};

function catMeta(id: string | null) {
  return IDEA_CATEGORIES.find((c) => c.id === id) ?? IDEA_CATEGORIES[IDEA_CATEGORIES.length - 1];
}

function IdeasPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<IdeaRow | null>(null);

  const q = useQuery({
    queryKey: ["ideas", isAdmin],
    queryFn: async () => {
      let query = supabase.from("disaster_ideas" as any).select("*");
      if (!isAdmin) query = query.eq("hidden", false);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as IdeaRow[];
    },
  });

  const ideas = (q.data ?? []).filter((i) => !filter || i.category === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link to="/shelters" className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-extrabold inline-flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          {t(lang, "防災の生活アイデア", "Disaster life ideas")}
        </h1>
      </div>

      <p className="text-xs text-muted-foreground">
        {t(lang,
          "断水・停電のときに役立つ生活の知恵を共有しましょう。（例：新聞紙で食器を洗う）",
          "Share practical tips for outages and water cuts (e.g. wiping dishes with newspaper).")}
      </p>

      <button onClick={() => setOpen(true)}
        className="w-full min-h-[48px] rounded-2xl bg-amber-500 text-white font-extrabold inline-flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> {t(lang, "アイデアを投稿する", "Share an idea")}
      </button>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={filter === null} onClick={() => setFilter(null)} label={t(lang, "すべて", "All")} />
        {IDEA_CATEGORIES.map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}
            label={`${c.emoji} ${lang === "ja" ? c.ja : c.en}`} />
        ))}
      </div>

      {q.isLoading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : ideas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t(lang, "まだアイデアはありません。最初の投稿をしてみましょう！", "No ideas yet — be the first to share!")}
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map((i) => {
            const m = catMeta(i.category);
            return (
              <div key={i.id} className="rounded-2xl border border-amber-200 bg-card p-3 space-y-1.5"
                style={{ opacity: i.hidden ? 0.55 : 1 }}>
                {i.photo_url && <img src={i.photo_url} alt="" className="w-full h-40 object-cover rounded-xl" />}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-amber-600">
                      {m.emoji} {lang === "ja" ? m.ja : m.en}
                      {i.hidden && <span className="ml-1 text-muted-foreground">· {t(lang, "非公開", "Unpublished")}</span>}
                    </div>
                    <div className="text-sm font-bold">{i.title}</div>
                  </div>
                  {isAdmin && (
                    <ModerationBar table="disaster_ideas" id={i.id} hidden={i.hidden} compact
                      invalidate={[["ideas"]]} onEdit={() => setEditTarget(i)} />
                  )}
                </div>
                <p className="text-xs whitespace-pre-wrap">{i.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {open && <IdeaForm onClose={() => setOpen(false)} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["ideas"] }); }} />}

      {editTarget && (
        <AdminEditDialog open table="disaster_ideas" id={editTarget.id}
          fields={[
            { key: "title", label: t(lang, "タイトル", "Title"), value: editTarget.title },
            { key: "body", label: t(lang, "内容", "Body"), value: editTarget.body, multiline: true },
          ]}
          invalidate={[["ideas"]]} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-semibold"
      style={active
        ? { backgroundColor: "#F59E0B", color: "#fff", borderColor: "#F59E0B" }
        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
      {label}
    </button>
  );
}

function IdeaForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { lang } = useLang();
  const [category, setCategory] = useState(IDEA_CATEGORIES[0].id);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function submit() {
    if (!title.trim() || !body.trim()) {
      toast.error(t(lang, "タイトルと内容を入力してください", "Please fill in the title and body"));
      return;
    }
    setBusy(true);
    try {
      let photo_url: string | null = null;
      if (file) {
        const sid = getSessionId();
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `ideas/${sid}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("activity-photos").upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg",
        });
        if (up.error) throw up.error;
        const signed = await supabase.storage.from("activity-photos")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (signed.error) throw signed.error;
        photo_url = signed.data.signedUrl;
      }
      const { error } = await supabase.from("disaster_ideas" as any).insert({
        session_id: getSessionId(), category,
        title: title.trim().slice(0, 120), body: body.trim().slice(0, 1000), photo_url,
      } as any);
      if (error) throw error;
      toast.success(t(lang, "投稿しました", "Posted"));
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border p-4 space-y-3 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-sm inline-flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" /> {t(lang, "アイデアを投稿", "Share an idea")}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {IDEA_CATEGORIES.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}
              label={`${c.emoji} ${lang === "ja" ? c.ja : c.en}`} />
          ))}
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder={t(lang, "タイトル（例：新聞紙で食器を洗う）", "Title (e.g. Wash dishes with newspaper)")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm" />

        <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 1000))} rows={5}
          placeholder={t(lang, "やり方やコツを書いてください", "Describe how to do it")}
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
          <label className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 text-xs font-bold text-amber-700 cursor-pointer">
            <ImagePlus className="w-4 h-4" /> {t(lang, "写真を追加（任意）", "Add a photo (optional)")}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          </label>
        )}

        <button onClick={submit} disabled={busy}
          className="w-full min-h-[48px] rounded-xl bg-amber-500 text-white font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t(lang, "投稿する", "Post")}
        </button>
      </div>
    </div>
  );
}
