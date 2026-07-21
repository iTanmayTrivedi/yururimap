import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { LocationPicker } from "@/components/LocationPicker";
import { CATEGORIES, SUBTOPICS, affectedOptionsFor, type CategoryId } from "@/lib/categories";
import { ArrowLeft, ChevronRight, Loader2, Send, ImagePlus, X } from "lucide-react";

export const Route = createFileRoute("/post/$category")({
  head: () => ({
    meta: [
      { title: "困ったを投稿 / Post a Problem — YururiMap" },
      { name: "description", content: "Share what's troubling you in your neighborhood." },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { category: raw } = useParams({ from: "/post/$category" });
  const navigate = useNavigate();
  const { lang } = useLang();

  const validCats: CategoryId[] = ["kurashi", "community", "business", "education"];
  const category = (validCats.includes(raw as CategoryId) ? raw : "kurashi") as CategoryId;
  const meta = CATEGORIES[category];
  const subtopics = SUBTOPICS[category];
  const affectedOpts = affectedOptionsFor(category);

  const [subtopic, setSubtopic] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [affected, setAffected] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  async function uploadPhoto(file: File): Promise<string | null> {
    const sid = getSessionId();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${sid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("activity-photos").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg",
    });
    if (error) throw error;
    const { data, error: sErr } = await supabase.storage.from("activity-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw sErr;
    return data?.signedUrl ?? null;
  }

  async function submit() {
    if (!description.trim()) {
      toast.error(t(lang, "何に困っていますか？を入力してください", "Please describe the problem")); return;
    }
    if (lat == null || lng == null) {
      toast.error(t(lang, "場所を選んでください", "Please choose a location")); return;
    }
    setSubmitting(true);
    try {
      let photo_url: string | null = null;
      if (meta.photoAllowed && photoFile) photo_url = await uploadPhoto(photoFile);
      const sid = getSessionId();
      const { demoSnapshot } = await import("@/lib/profile");
      const sub = subtopics.find((s) => s.id === subtopic);
      const { error } = await supabase.from("posts").insert({
        session_id: sid,
        type: "request",
        category,
        subtopic,
        title: sub ? (lang === "ja" ? sub.ja : sub.en) : null,
        place_label: placeLabel.trim() ? placeLabel.trim().slice(0, 120) : null,
        description: description.trim().slice(0, 500),
        affected_group: affected,
        photo_url,
        lat, lng,
        ...demoSnapshot(),
      });
      if (error) throw error;
      toast.success(t(lang, "投稿しました。ありがとうございます！", "Posted. Thank you!"));
      navigate({ to: "/map" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSubmitting(false); }
  }

  // Step 1: subtopic list
  if (!subtopic) {
    const Icon = meta.icon;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-muted-foreground p-1"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1 flex items-center gap-2">
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: meta.soft, border: `2px solid ${meta.color}` }}>
              <Icon className="w-5 h-5" style={{ color: meta.color }} />
            </span>
            <div>
              <h2 className="text-lg font-extrabold leading-tight" style={{ color: meta.color }}>
                {lang === "ja" ? meta.ja : meta.en}
              </h2>
              <div className="text-[11px] text-muted-foreground">
                {t(lang, "どんなことですか？", "What is it about?")}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {subtopics.map((s) => {
            const SIcon = s.icon;
            return (
              <button key={s.id} onClick={() => setSubtopic(s.id)}
                className="w-full rounded-2xl border border-border bg-card p-3 flex items-center gap-3 shadow-sm active:scale-[0.99]">
                <span className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: meta.soft }}>
                  <SIcon className="w-4.5 h-4.5" style={{ color: meta.color }} />
                </span>
                <span className="flex-1 text-left text-sm font-semibold">
                  {lang === "ja" ? s.ja : s.en}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const chosen = subtopics.find((s) => s.id === subtopic)!;

  // Step 2: form
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setSubtopic(null)} className="text-muted-foreground p-1"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <div className="text-[10px] font-bold" style={{ color: meta.color }}>
            {lang === "ja" ? meta.ja : meta.en}
          </div>
          <h2 className="text-base font-extrabold leading-tight">
            {lang === "ja" ? chosen.ja : chosen.en}{t(lang, "の困った投稿", " — Post a problem")}
          </h2>
        </div>
      </div>

      {/* Photo */}
      {meta.photoAllowed && (
        <Section label={t(lang, "写真（任意・1枚）", "Photo (optional, 1)")} accent={meta.color}>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-border" />
              <button onClick={() => setPhotoFile(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 min-h-[70px] rounded-xl border-2 border-dashed text-sm cursor-pointer"
              style={{ borderColor: `${meta.color}88`, backgroundColor: meta.soft, color: meta.color }}>
              <ImagePlus className="w-5 h-5" />
              {t(lang, "写真を選ぶ", "Choose a photo")}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); }} />
            </label>
          )}
        </Section>
      )}

      {/* ① Description */}
      <Section label={t(lang, "① 何に困っていますか？（必須）", "① What is the problem? (required)")} accent={meta.color}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={4}
          placeholder={placeholderFor(category, lang)}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
        <div className="text-right text-[10px] text-muted-foreground">{description.length}/500</div>
      </Section>

      {/* ② Location */}
      <Section label={t(lang, "② どこで？（必須）", "② Where? (required)")} accent={meta.color}>
        <LocationPicker lat={lat} lng={lng} accentColor={meta.color}
          onPick={(la, ln, label) => { setLat(la); setLng(ln); if (label) setPlaceLabel(label); }} />
      </Section>

      {/* ③ Affected group */}
      <Section label={t(lang, "③ 誰が困っていますか？（任意）", "③ Who is affected? (optional)")} accent={meta.color}>
        <div className="grid grid-cols-3 gap-2">
          {affectedOpts.map((a) => (
            <button key={a.id} onClick={() => setAffected((c) => c === a.id ? null : a.id)}
              className="min-h-[60px] rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 px-1"
              style={affected === a.id
                ? { backgroundColor: meta.color, color: "#fff", borderColor: meta.color }
                : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
              <span className="text-lg leading-none">{a.emoji}</span>
              <span className="leading-tight text-center">{lang === "ja" ? a.ja : a.en}</span>
            </button>
          ))}
        </div>
      </Section>

      <button onClick={submit} disabled={submitting}
        className="w-full min-h-[52px] rounded-2xl text-white font-bold shadow-md disabled:opacity-60 inline-flex items-center justify-center gap-2"
        style={{ backgroundColor: meta.color }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {t(lang, "投稿する", "Post")}
      </button>
    </div>
  );
}

function placeholderFor(cat: CategoryId, lang: "ja" | "en") {
  if (lang === "en") return "e.g. The park is overgrown / trash is scattered / mirror is blocked by trees";
  if (cat === "kurashi")   return "例：公園が雑草だらけで遊べない\n木が邪魔でカーブミラーが見えない";
  if (cat === "community") return "例：地域イベントを知らない人が多い\nボランティアが不足している";
  if (cat === "business")  return "例：人手が足りない\n売上が伸びない\n設備が古い\n手続きがわかりにくい など";
  return "例：教室が暑い、トイレが使いにくい、勉強がむずかしい など\nくわしく書いてくれるとうれしいです！";
}

function Section({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
      <div className="text-[11px] font-bold" style={{ color: accent }}>{label}</div>
      {children}
    </div>
  );
}
