import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { demoSnapshot } from "@/lib/profile";
import { LocationPicker } from "@/components/LocationPicker";
import { PLACE_RELATIONS, type PlaceRelationId } from "@/lib/posts";
import { ArrowLeft, ImagePlus, X, Loader2, Send, Flag } from "lucide-react";

const ACCENT = "#38BDF8";

export const Route = createFileRoute("/post")({
  head: () => ({
    meta: [
      { title: "困ったを投稿 — みんなの困ったMap" },
      { name: "description", content: "写真・困りごと・場所・この場所との関係を選んで、地域の困りごとを投稿できます。" },
      { property: "og:title", content: "困ったを投稿 — みんなの困ったMap" },
      { property: "og:description", content: "地域の困りごとを地図に投稿しましょう。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostProblemPage,
});

function PostProblemPage() {
  const { lang } = useLang();
  const navigate = useNavigate();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [relation, setRelation] = useState<PlaceRelationId | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const u = URL.createObjectURL(photoFile);
    setPhotoPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photoFile]);

  async function uploadPhoto(file: File): Promise<string> {
    const sid = getSessionId();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `posts/${sid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("activity-photos").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg",
    });
    if (error) throw error;
    const { data, error: sErr } = await supabase.storage.from("activity-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw sErr;
    return data.signedUrl;
  }

  async function submit() {
    if (!description.trim()) { toast.error(t(lang, "困っていることを入力してください", "Please describe the problem")); return; }
    if (lat == null || lng == null) { toast.error(t(lang, "場所を選んでください", "Please choose a location")); return; }
    if (!relation) { toast.error(t(lang, "この場所との関係を選んでください", "Please choose your relationship to this place")); return; }
    setBusy(true);
    try {
      const photo_url = photoFile ? await uploadPhoto(photoFile) : null;
      const { error } = await supabase.from("posts").insert({
        session_id: getSessionId(),
        type: "request",
        description: description.trim().slice(0, 500),
        place_label: placeLabel,
        place_relation: relation,
        lat, lng,
        photo_url,
        ...demoSnapshot(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      if (error) throw error;
      toast.success(t(lang, "投稿しました！", "Posted!"));
      navigate({ to: "/" });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#E0F2FE", border: `2px solid ${ACCENT}` }}>
          <Flag className="w-5 h-5" style={{ color: "#0284C7" }} />
        </div>
        <h2 className="text-lg font-extrabold" style={{ color: "#0284C7" }}>
          {t(lang, "困ったを投稿", "Post a problem")}
        </h2>
      </div>

      {/* 1. photo */}
      <Card num="1" title={t(lang, "写真（任意・1枚）", "Photo (optional, 1)")}>
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-border" />
            <button onClick={() => setPhotoFile(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 min-h-[80px] rounded-xl border-2 border-dashed text-sm cursor-pointer"
            style={{ borderColor: "#7DD3FC", backgroundColor: "#F0F9FF", color: "#0284C7" }}>
            <ImagePlus className="w-5 h-5" />
            {t(lang, "写真を選ぶ", "Choose a photo")}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); }} />
          </label>
        )}
      </Card>

      {/* 2. description */}
      <Card num="2" title={t(lang, "何に困っていますか？（必須）", "What is the problem? (required)")}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} rows={4}
          placeholder={t(lang, "例）歩道が狭くてベビーカーが通りにくい", "e.g. The sidewalk is too narrow for a stroller")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
        <div className="text-[10px] text-right text-muted-foreground">{description.length}/500</div>
      </Card>

      {/* 3. location */}
      <Card num="3" title={t(lang, "どこですか？（必須）", "Where is it? (required)")}>
        <LocationPicker lat={lat} lng={lng} accentColor={ACCENT} height={240}
          onPick={(la, ln, label) => { setLat(la); setLng(ln); if (label) setPlaceLabel(label); }} />
        <input value={placeLabel ?? ""} onChange={(e) => setPlaceLabel(e.target.value)}
          placeholder={t(lang, "場所の名前（任意）", "Place name (optional)")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
      </Card>

      {/* 4. relation */}
      <Card num="4" title={t(lang, "この場所との関係（必須）", "Your relationship to this place (required)")}>
        <div className="grid grid-cols-1 gap-2">
          {PLACE_RELATIONS.map((r) => {
            const Icon = r.icon;
            const active = relation === r.id;
            return (
              <button key={r.id} onClick={() => setRelation(r.id)}
                className="min-h-[46px] rounded-xl border text-sm font-bold inline-flex items-center gap-2 px-3"
                style={active
                  ? { backgroundColor: ACCENT, color: "#fff", borderColor: ACCENT }
                  : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                <Icon className="w-4 h-4" /> {lang === "ja" ? r.ja : r.en}
              </button>
            );
          })}
        </div>
      </Card>

      <button onClick={submit} disabled={busy}
        className="w-full min-h-[54px] rounded-2xl text-white font-extrabold shadow-md disabled:opacity-60 inline-flex items-center justify-center gap-2"
        style={{ backgroundColor: ACCENT }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {t(lang, "投稿する", "Submit")}
      </button>

      <Link to="/" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "ホームへ戻る", "Back to home")}
      </Link>
    </div>
  );
}

function Card({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full text-[10px] font-extrabold text-white inline-flex items-center justify-center"
          style={{ backgroundColor: ACCENT }}>{num}</span>
        <span className="text-[12px] font-bold">{title}</span>
      </div>
      {children}
    </div>
  );
}
