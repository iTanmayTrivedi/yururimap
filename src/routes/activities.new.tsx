import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { demoSnapshot } from "@/lib/profile";
import { LocationPicker } from "@/components/LocationPicker";
import { SCOPES, type ActivityScope, type ActivityRow } from "@/lib/activities";
import { CATEGORIES, CATEGORY_LIST, SUBTOPICS, type CategoryId } from "@/lib/categories";
import { ArrowLeft, Loader2, Send, Save, ImagePlus, X, ShieldAlert, MapPin, Home as HomeIcon, Globe } from "lucide-react";

export const Route = createFileRoute("/activities/new")({
  head: () => ({ meta: [{ title: "活動を投稿 / Post an Activity" }, { name: "description", content: "Submit a community activity for approval." }] }),
  component: ActivityNewPage,
});

const SCOPE_ICON: Record<ActivityScope, string> = {
  single: "📍", local: "🏘️", regional: "🗾", national: "🗾", global: "🌏",
};

function ActivityNewPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [sid, setSid] = useState("");
  useEffect(() => { setSid(getSessionId()); }, []);

  const verifiedQ = useQuery({
    enabled: !!sid,
    queryKey: ["verified", sid],
    queryFn: async () => {
      const { data, error } = await supabase.from("verified_posters").select("id").eq("session_id", sid).maybeSingle();
      if (error) throw error; return !!data;
    },
  });

  const draftsQ = useQuery({
    enabled: !!sid,
    queryKey: ["my-drafts", sid],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").eq("session_id", sid).order("updated_at", { ascending: false }).limit(20);
      if (error) throw error; return (data ?? []) as (ActivityRow & { category?: string | null; subtopic?: string | null })[];
    },
  });

  const [category, setCategory] = useState<CategoryId>("community");
  const [subtopic, setSubtopic] = useState<string | null>(null);
  const [scope, setScope] = useState<ActivityScope>("local");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [whenText, setWhenText] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [donationUrl, setDonationUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const meta = CATEGORIES[category];
  const subtopics = SUBTOPICS[category];

  useEffect(() => {
    if (!photoFile) { return; }
    const u = URL.createObjectURL(photoFile);
    setPhotoPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photoFile]);

  async function uploadPhoto(file: File): Promise<string> {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `activity/${sid}/${Date.now()}.${ext}`;
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
    if (!title.trim()) { toast.error(t(lang, "活動名を入力", "Please enter an activity name")); return; }
    if (!description.trim()) { toast.error(t(lang, "内容を入力", "Please enter a description")); return; }
    if ((scope === "single" || scope === "local") && (lat == null || lng == null)) {
      toast.error(t(lang, "場所を選んでください", "Please choose a location")); return;
    }
    setBusy(true);
    try {
      let photo_url: string | null = photoPreview && !photoFile ? photoPreview : null;
      if (photoFile) photo_url = await uploadPhoto(photoFile);
      const combinedUrl = [officialUrl.trim(), donationUrl.trim() ? `寄付先: ${donationUrl.trim()}` : ""]
        .filter(Boolean).join(" | ").slice(0, 500) || null;
      const row = {
        session_id: sid,
        status,
        activity_type: "join",
        category,
        subtopic,
        scope,
        title: title.trim().slice(0, 100),
        description: [description.trim(), whenText.trim() ? `\n\n📅 ${whenText.trim()}` : ""].join("").slice(0, 900),
        place_label: placeLabel.trim() ? placeLabel.trim().slice(0, 120) : null,
        lat, lng,
        official_url: combinedUrl,
        photo_url,
        ...demoSnapshot(),
      };
      if (editingId) {
        const { error } = await supabase.from("activities").update(row).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("activities").insert(row);
        if (error) throw error;
      }
      toast.success(status === "draft"
        ? t(lang, "下書きを保存しました", "Draft saved")
        : t(lang, "承認申請を送信しました！", "Submitted for approval!"));
      if (status === "pending") navigate({ to: "/activities" });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function loadDraft(d: ActivityRow & { category?: string | null; subtopic?: string | null }) {
    setEditingId(d.id);
    if (d.category && (["kurashi","community","business","education"] as string[]).includes(d.category)) {
      setCategory(d.category as CategoryId);
    }
    setSubtopic(d.subtopic ?? null);
    setScope(d.scope);
    setTitle(d.title);
    setDescription(d.description);
    setPlaceLabel(d.place_label ?? "");
    setLat(d.lat); setLng(d.lng);
    setOfficialUrl(d.official_url ?? "");
    setPhotoFile(null); setPhotoPreview(d.photo_url ?? null);
  }

  if (verifiedQ.isLoading) return <div className="pt-16 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!verifiedQ.data) {
    return (
      <div className="pt-8 space-y-4 text-center">
        <ShieldAlert className="w-14 h-14 mx-auto text-amber-500" />
        <h2 className="text-lg font-bold">{t(lang, "承認された投稿者のみ", "Verified posters only")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(lang, "活動の投稿には事前の承認が必要です。運営にお問い合わせください。",
            "Only verified individuals or organisations can post activities.")}
        </p>
        <div className="rounded-xl bg-muted p-3 text-[11px] text-muted-foreground break-all">
          <div className="font-semibold mb-1">{t(lang, "あなたのID", "Your ID")}</div>{sid}
        </div>
        <Link to="/activities" className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> {t(lang, "戻る", "Back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold" style={{ color: meta.color }}>
        📢 {t(lang, "活動を投稿", "Post an activity")}
      </h2>

      {(draftsQ.data ?? []).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="text-[11px] font-bold text-muted-foreground">{t(lang, "自分の投稿・下書き", "My drafts & posts")}</div>
          <div className="space-y-1">
            {(draftsQ.data ?? []).map((d) => (
              <button key={d.id} onClick={() => loadDraft(d)}
                className="w-full text-left rounded-xl border border-border p-2 text-xs hover:bg-muted">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">{d.title || "(untitled)"}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 rounded" style={{
                    backgroundColor: d.status === "approved" ? "#D1FAE5"
                      : d.status === "pending" ? "#FEF3C7"
                      : d.status === "rejected" ? "#FEE2E2" : "#F3F4F6",
                    color: d.status === "approved" ? "#065F46"
                      : d.status === "pending" ? "#92400E"
                      : d.status === "rejected" ? "#991B1B" : "#374151",
                  }}>{d.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category */}
      <Section label={t(lang, "カテゴリ", "Category")} accent={meta.color}>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_LIST.map((c) => {
            const Icon = c.icon;
            const active = c.id === category;
            return (
              <button key={c.id} onClick={() => { setCategory(c.id); setSubtopic(null); }}
                className="min-h-[52px] rounded-xl border text-[12px] font-semibold flex items-center justify-center gap-2"
                style={active ? { backgroundColor: c.color, color: "#fff", borderColor: c.color }
                  : { backgroundColor: c.soft, color: c.color, borderColor: `${c.color}55` }}>
                <Icon className="w-4 h-4" />
                {lang === "ja" ? c.ja : c.en}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Subtopic */}
      <Section label={t(lang, "どんな活動ですか？", "What kind of activity?")} accent={meta.color}>
        <div className="grid grid-cols-2 gap-1.5">
          {subtopics.map((s) => {
            const SIcon = s.icon;
            const active = subtopic === s.id;
            return (
              <button key={s.id} onClick={() => setSubtopic(s.id)}
                className="min-h-[40px] rounded-xl border text-[11px] font-semibold flex items-center gap-2 px-2 text-left"
                style={active ? { backgroundColor: meta.color, color: "#fff", borderColor: meta.color }
                  : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                <SIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{lang === "ja" ? s.ja : s.en}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Title */}
      <Section label={t(lang, "活動名（必須）", "Activity name (required)")} accent={meta.color}>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))}
          placeholder={t(lang, "例：クリーンアップ活動", "e.g. Community cleanup")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
      </Section>

      {/* Description */}
      <Section label={t(lang, "活動内容（必須）", "Activity description (required)")} accent={meta.color}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 800))} rows={4}
          placeholder={t(lang, "どんな活動か教えてください", "Tell us about the activity")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
      </Section>

      {/* Photo */}
      <Section label={t(lang, "写真（任意・1枚）", "Photo (optional, 1)")} accent={meta.color}>
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-border" />
            <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
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

      {/* Scope cards */}
      <Section label={t(lang, "④ 活動範囲を選んでください（必須）", "④ Activity scope (required)")} accent={meta.color}>
        <div className="grid grid-cols-3 gap-2">
          {SCOPES.map((s) => {
            const active = scope === s.id;
            return (
              <button key={s.id} onClick={() => setScope(s.id)}
                className="min-h-[64px] rounded-xl border text-[10px] font-semibold flex flex-col items-center justify-center gap-1 px-1"
                style={active ? { backgroundColor: meta.color, color: "#fff", borderColor: meta.color }
                  : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                <span className="text-lg leading-none">{SCOPE_ICON[s.id]}</span>
                <span className="leading-tight text-center">{lang === "ja" ? s.ja : s.en}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Location */}
      {(scope === "single" || scope === "local") && (
        <Section label={t(lang, "場所（必須）", "Location (required)")} accent={meta.color}>
          <LocationPicker lat={lat} lng={lng} accentColor={meta.color}
            onPick={(la, ln, label) => { setLat(la); setLng(ln); if (label) setPlaceLabel(label); }} />
        </Section>
      )}

      {/* When */}
      <Section label={t(lang, "いつ（任意）", "When (optional)")} accent={meta.color}>
        <input value={whenText} onChange={(e) => setWhenText(e.target.value.slice(0, 100))}
          placeholder={t(lang, "例：毎月第2日曜日 10:00〜11:30", "e.g. 2nd Sunday 10:00–11:30")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
      </Section>

      {/* Official URL */}
      <Section label={t(lang, "公式サイト・SNS（任意）", "Official site / SNS (optional)")} accent={meta.color}>
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <input value={officialUrl} onChange={(e) => setOfficialUrl(e.target.value.slice(0, 300))}
            placeholder="https://www.example.com"
            className="w-full bg-transparent text-sm outline-none" />
        </div>
      </Section>

      {/* Donation URL */}
      <Section label={t(lang, "寄付先 URL（任意）", "Donation URL (optional)")} accent={meta.color}>
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2">
          <HomeIcon className="w-4 h-4 text-muted-foreground" />
          <input value={donationUrl} onChange={(e) => setDonationUrl(e.target.value.slice(0, 300))}
            placeholder="https://www.example.com"
            className="w-full bg-transparent text-sm outline-none" />
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => save("draft")} disabled={busy}
          className="min-h-[48px] rounded-2xl border-2 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ borderColor: meta.color, color: meta.color }}>
          <Save className="w-4 h-4" />{t(lang, "下書き保存", "Save draft")}
        </button>
        <button onClick={() => save("pending")} disabled={busy}
          className="min-h-[48px] rounded-2xl text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: meta.color }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t(lang, "申請する", "Submit")}
        </button>
      </div>

      <Link to="/activities" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "戻る", "Back")}
      </Link>
      <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
        <MapPin className="w-3 h-3" /> {t(lang, "位置情報は活動範囲が『一カ所』『地域』のときのみ表示されます", "Location is only used for Single/Local scope")}
      </div>
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
