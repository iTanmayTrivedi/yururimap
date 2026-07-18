import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { LocationPicker } from "@/components/LocationPicker";
import { POST_TYPES, type PostType } from "@/lib/posts";
import { ArrowLeft, Loader2, Send, ImagePlus, X } from "lucide-react";

export const Route = createFileRoute("/post/$type")({
  head: () => ({
    meta: [
      { title: "投稿する / Post — YururiMap" },
      { name: "description", content: "Share a Happy post, a Request, or promote an activity." },
    ],
  }),
  component: PostPage,
});

const AFFECTED = [
  { id: "child", ja: "子ども", en: "Children", emoji: "🧒" },
  { id: "adult", ja: "大人", en: "Adults", emoji: "🧑" },
  { id: "elder", ja: "高齢者", en: "Elderly", emoji: "👵" },
  { id: "disable", ja: "障害のある方", en: "Disabled", emoji: "♿" },
  { id: "all", ja: "みんな", en: "Everyone", emoji: "👨‍👩‍👧" },
  { id: "unknown", ja: "わからない", en: "Not sure", emoji: "❓" },
] as const;

function PostPage() {
  const { type: rawType } = useParams({ from: "/post/$type" });
  const navigate = useNavigate();
  const { lang } = useLang();

  const type = (["happy", "request", "promote"].includes(rawType) ? rawType : "happy") as PostType;
  const meta = POST_TYPES[type];

  const [title, setTitle] = useState("");            // promote: activity name; happy: optional
  const [description, setDescription] = useState("");
  const [whyNeeded, setWhyNeeded] = useState("");    // request only
  const [placeLabel, setPlaceLabel] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [affected, setAffected] = useState<string | null>(null);
  const [whenText, setWhenText] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
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
    // Private bucket + public-read RLS → use a very long signed URL.
    const { data, error: sErr } = await supabase.storage.from("activity-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw sErr;
    return data?.signedUrl ?? null;
  }

  async function submit() {
    if (!description.trim()) {
      toast.error(t(lang, "内容を入力してください", "Please enter a description")); return;
    }
    if (type === "request" && !whyNeeded.trim()) {
      toast.error(t(lang, "「なぜそう思いますか？」を入力してください", "Please enter why this request is needed")); return;
    }
    if (type === "promote" && !title.trim()) {
      toast.error(t(lang, "活動名を入力してください", "Please enter an activity name")); return;
    }
    setSubmitting(true);
    try {
      let photo_url: string | null = null;
      if (type === "promote" && photoFile) {
        photo_url = await uploadPhoto(photoFile);
      }
      const sid = getSessionId();
      const { demoSnapshot } = await import("@/lib/profile");
      const { error } = await supabase.from("posts").insert({
        session_id: sid,
        type,
        title: title.trim() ? title.trim().slice(0, 100) : null,
        place_label: placeLabel.trim() ? placeLabel.trim().slice(0, 120) : null,
        description: description.trim().slice(0, 500),
        why_needed: type === "request" && whyNeeded.trim() ? whyNeeded.trim().slice(0, 500) : null,
        affected_group: type === "request" ? affected : null,
        when_text: type === "promote" && whenText.trim() ? whenText.trim().slice(0, 100) : null,
        official_url: type === "promote" && officialUrl.trim() ? officialUrl.trim().slice(0, 300) : null,
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

  const Icon = meta.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: meta.soft, border: `2px solid ${meta.color}` }}>
          <Icon className="w-5 h-5" style={{ color: meta.color }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold leading-tight" style={{ color: meta.color }}>
            {lang === "ja" ? meta.ja : meta.en}
          </h2>
          <div className="text-[11px] text-muted-foreground">{lang === "ja" ? meta.en : meta.ja}</div>
        </div>
      </div>

      {/* Promote-only: photo */}
      {type === "promote" && (
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
            <label className="flex items-center justify-center gap-2 min-h-[80px] rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 text-sm cursor-pointer">
              <ImagePlus className="w-5 h-5" />
              {t(lang, "写真を選ぶ", "Choose a photo")}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); }} />
            </label>
          )}
        </Section>
      )}

      {/* Promote: activity name (required). Happy: optional title. Request has no title. */}
      {type !== "request" && (
        <Section label={type === "promote"
          ? t(lang, "活動名（必須）", "Activity name (required)")
          : t(lang, "タイトル（任意）", "Title (optional)")} accent={meta.color}>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))}
            placeholder={type === "promote"
              ? t(lang, "例：クリーンアップ活動", "e.g. Community cleanup")
              : t(lang, "例：桜がきれいだった", "e.g. Cherry blossoms were lovely")}
            className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
        </Section>
      )}

      {/* Description */}
      <Section label={type === "request"
        ? t(lang, "① 何をしてほしいですか？（必須）", "① What is your request? (required)")
        : type === "promote"
          ? t(lang, "活動内容（必須）", "Activity description (required)")
          : t(lang, "内容（必須）", "Content (required)")}
        accent={meta.color}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={4}
          placeholder={type === "request"
            ? t(lang, "困っていることや改善してほしいこと", "What you're troubled by or would like improved")
            : type === "promote"
              ? t(lang, "どんな活動か教えてください", "Tell us about the activity")
              : t(lang, "嬉しかったこと・良かったことを教えてください", "Tell us about a happy moment")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
        <div className="text-right text-[10px] text-muted-foreground">{description.length}/500</div>
      </Section>

      {/* Request: why needed */}
      {type === "request" && (
        <Section label={t(lang, "② なぜそう思いますか？（必須）", "② Why is this needed? (required)")} accent={meta.color}>
          <textarea value={whyNeeded} onChange={(e) => setWhyNeeded(e.target.value.slice(0, 500))}
            rows={3}
            placeholder={t(lang, "理由や困っている背景を教えてください", "Share the reason or background")}
            className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
          <div className="text-right text-[10px] text-muted-foreground">{whyNeeded.length}/500</div>
        </Section>
      )}

      {/* Location */}
      <Section label={t(lang, "場所（任意）", "Location (optional)")} accent={meta.color}>
        <LocationPicker lat={lat} lng={lng} accentColor={meta.color}
          onPick={(la, ln, label) => { setLat(la); setLng(ln); if (label) setPlaceLabel(label); }} />
      </Section>

      {/* Promote: date/time and official link */}
      {type === "promote" && (
        <>
          <Section label={t(lang, "いつ（任意）", "When (optional)")} accent={meta.color}>
            <input value={whenText} onChange={(e) => setWhenText(e.target.value.slice(0, 100))}
              placeholder={t(lang, "例：毎月第2日曜日 10:00〜11:30", "e.g. 2nd Sunday of the month 10:00–11:30")}
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
          </Section>
          <Section label={t(lang, "公式サイト・SNS（任意）", "Official website / SNS (optional)")} accent={meta.color}>
            <input value={officialUrl} onChange={(e) => setOfficialUrl(e.target.value.slice(0, 300))}
              placeholder="https://www.example.com"
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
          </Section>
        </>
      )}

      {/* Request: affected group */}
      {type === "request" && (
        <Section label={t(lang, "困ったのは誰？（任意）", "Who is affected? (optional)")} accent={meta.color}>
          <div className="grid grid-cols-3 gap-2">
            {AFFECTED.map((a) => (
              <button key={a.id} onClick={() => setAffected((c) => c === a.id ? null : a.id)}
                className="min-h-[60px] rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1"
                style={affected === a.id
                  ? { backgroundColor: meta.color, color: "#fff", borderColor: meta.color }
                  : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                <span className="text-lg">{a.emoji}</span>
                {lang === "ja" ? a.ja : a.en}
              </button>
            ))}
          </div>
        </Section>
      )}

      <button onClick={submit} disabled={submitting}
        className="w-full min-h-[52px] rounded-2xl text-white font-bold shadow-md disabled:opacity-60 inline-flex items-center justify-center gap-2"
        style={{ backgroundColor: meta.color }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {t(lang, "投稿する", "Post")}
      </button>

      <Link to="/" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "ホームへ戻る", "Back to home")}
      </Link>
    </div>
  );
}

function Section({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
      <div className="text-[11px] font-bold" style={{ color: accent }}>{label}</div>
      {children}
    </div>
  );
}
