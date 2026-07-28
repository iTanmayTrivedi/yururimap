import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { LocationPicker } from "@/components/LocationPicker";
import { ACTIVITY_CATEGORY_LIST, SCOPES, type ActivityCategoryId, type ActivityScope } from "@/lib/activities";
import { ArrowLeft, ImagePlus, X, Loader2, Send, Save, Sparkles } from "lucide-react";

const ACCENT = "#10B981";

export const Route = createFileRoute("/activities/new")({
  head: () => ({
    meta: [
      { title: "活動を投稿 — みんなの困ったMap" },
      { name: "description", content: "地域・全国・オンラインの活動を投稿して、参加者や支援を募りましょう。" },
      { property: "og:title", content: "活動を投稿 — みんなの困ったMap" },
      { property: "og:description", content: "地域・全国・オンラインの活動を投稿できます。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewActivityPage,
});

function NewActivityPage() {
  const { lang } = useLang();
  const navigate = useNavigate();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ActivityCategoryId | null>(null);
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<ActivityScope>("local");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [applyUrl, setApplyUrl] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [donationUrl, setDonationUrl] = useState("");
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
    const path = `activities/${sid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("activity-photos").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg",
    });
    if (error) throw error;
    const { data, error: sErr } = await supabase.storage.from("activity-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw sErr;
    return data.signedUrl;
  }

  async function save(status: "draft" | "pending") {
    if (!title.trim()) { toast.error(t(lang, "活動名を入力してください", "Please enter a title")); return; }
    if (status === "pending") {
      if (!category) { toast.error(t(lang, "カテゴリを選んでください", "Please choose a category")); return; }
      if (!description.trim()) { toast.error(t(lang, "活動内容を入力してください", "Please describe the activity")); return; }
      if (scope === "local" && (lat == null || lng == null)) {
        toast.error(t(lang, "活動場所を選んでください", "Please choose a location")); return;
      }
    }
    setBusy(true);
    try {
      const photo_url = photoFile ? await uploadPhoto(photoFile) : null;
      const { error } = await supabase.from("activities").insert({
        session_id: getSessionId(),
        status,
        activity_type: "join",
        category,
        title: title.trim().slice(0, 120),
        description: description.trim().slice(0, 800),
        scope,
        place_label: scope === "local" ? placeLabel : null,
        lat: scope === "local" ? lat : null,
        lng: scope === "local" ? lng : null,
        apply_url: applyUrl.trim() || null,
        homepage_url: homepageUrl.trim() || null,
        official_url: homepageUrl.trim() || null,
        donation_url: donationUrl.trim() || null,
        photo_url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      if (error) throw error;
      toast.success(status === "draft"
        ? t(lang, "下書きを保存しました", "Draft saved")
        : t(lang, "申請しました！承認後に公開されます", "Submitted! It will appear after approval"));
      navigate({ to: "/activities" });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#D1FAE5", border: `2px solid ${ACCENT}` }}>
          <Sparkles className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-lg font-extrabold" style={{ color: ACCENT }}>
          {t(lang, "活動を投稿", "Post an activity")}
        </h2>
      </div>

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
            style={{ borderColor: "#6EE7B7", backgroundColor: "#ECFDF5", color: "#047857" }}>
            <ImagePlus className="w-5 h-5" />
            {t(lang, "写真を選ぶ", "Choose a photo")}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); }} />
          </label>
        )}
      </Card>

      <Card num="2" title={t(lang, "活動名（必須）", "Activity title (required)")}>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder={t(lang, "例）公園そうじボランティア", "e.g. Park cleanup volunteers")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
      </Card>

      <Card num="3" title={t(lang, "カテゴリ（必須）", "Category (required)")}>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_CATEGORY_LIST.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className="rounded-xl border p-2 flex flex-col items-center gap-1 text-[10px] font-bold min-h-[64px] justify-center"
                style={active
                  ? { backgroundColor: c.color, color: "#fff", borderColor: c.color }
                  : { backgroundColor: c.soft, color: "#374151", borderColor: "transparent" }}>
                <Icon className="w-4 h-4" style={{ color: active ? "#fff" : c.color }} />
                <span className="leading-tight text-center">{lang === "ja" ? c.ja : c.en}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card num="4" title={t(lang, "活動内容の紹介（必須）", "Description (required)")}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 800))} rows={5}
          placeholder={t(lang, "どんな活動か、誰でも参加できるかなど", "What is it about? Who can join?")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
        <div className="text-[10px] text-right text-muted-foreground">{description.length}/800</div>
      </Card>

      <Card num="5" title={t(lang, "活動範囲（必須）", "Scope (required)")}>
        <div className="grid grid-cols-3 gap-2">
          {SCOPES.map((s) => {
            const Icon = s.icon;
            const active = scope === s.id;
            return (
              <button key={s.id} onClick={() => setScope(s.id)}
                className="rounded-xl border p-2 flex flex-col items-center gap-1 min-h-[70px] justify-center"
                style={active
                  ? { backgroundColor: ACCENT, color: "#fff", borderColor: ACCENT }
                  : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold">{lang === "ja" ? s.ja : s.en}</span>
                <span className="text-[9px] opacity-80 text-center leading-tight">{lang === "ja" ? s.hint_ja : s.hint_en}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {scope === "local" && (
        <Card num="6" title={t(lang, "活動場所", "Location")}>
          <LocationPicker lat={lat} lng={lng} accentColor={ACCENT} height={220}
            onPick={(la, ln, label) => { setLat(la); setLng(ln); if (label) setPlaceLabel(label); }} />
          <input value={placeLabel ?? ""} onChange={(e) => setPlaceLabel(e.target.value)}
            placeholder={t(lang, "場所の名前（任意）", "Place name (optional)")}
            className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
        </Card>
      )}

      <Card num={scope === "local" ? "7" : "6"} title={t(lang, "リンク（任意）", "Links (optional)")}>
        <input value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)}
          placeholder={t(lang, "申込みURL", "Registration URL")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
        <input value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)}
          placeholder={t(lang, "ホームページ・SNSのURL", "Website / SNS URL")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
        <input value={donationUrl} onChange={(e) => setDonationUrl(e.target.value)}
          placeholder={t(lang, "寄付先URL", "Donation URL")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
      </Card>

      <div className="flex gap-2">
        <button onClick={() => save("draft")} disabled={busy}
          className="flex-1 min-h-[52px] rounded-2xl border border-border font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" /> {t(lang, "下書き保存", "Save draft")}
        </button>
        <button onClick={() => save("pending")} disabled={busy}
          className="flex-[1.4] min-h-[52px] rounded-2xl text-white font-extrabold shadow-md disabled:opacity-60 inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: ACCENT }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t(lang, "申請する", "Submit")}
        </button>
      </div>

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
