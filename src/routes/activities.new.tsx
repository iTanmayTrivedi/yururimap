import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { demoSnapshot } from "@/lib/profile";
import { LocationPicker } from "@/components/LocationPicker";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LIST, SCOPES, type ActivityScope, type ActivityType, type ActivityRow } from "@/lib/activities";
import { ArrowLeft, Loader2, Send, Save, ImagePlus, X, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/activities/new")({
  head: () => ({ meta: [{ title: "取り組みを投稿 / New Activity" }, { name: "description", content: "Submit a community activity for approval." }] }),
  component: ActivityNewPage,
});

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
      if (error) throw error; return (data ?? []) as ActivityRow[];
    },
  });

  const [activityType, setActivityType] = useState<ActivityType>("meetup");
  const [scope, setScope] = useState<ActivityScope>("local");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [officialUrl, setOfficialUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const u = URL.createObjectURL(photoFile);
    setPhotoPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photoFile]);

  function loadDraft(d: ActivityRow) {
    setEditingId(d.id);
    setActivityType(d.activity_type);
    setScope(d.scope);
    setTitle(d.title);
    setDescription(d.description);
    setPlaceLabel(d.place_label ?? "");
    setLat(d.lat); setLng(d.lng);
    setOfficialUrl(d.official_url ?? "");
    setPhotoFile(null); setPhotoPreview(d.photo_url ?? null);
  }

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
    if (!title.trim()) { toast.error(t(lang, "タイトルを入力", "Please enter a title")); return; }
    if (!description.trim()) { toast.error(t(lang, "内容を入力", "Please enter a description")); return; }
    if ((scope === "single" || scope === "local") && (lat == null || lng == null)) {
      toast.error(t(lang, "場所を選んでください", "Please choose a location")); return;
    }
    setBusy(true);
    try {
      let photo_url: string | null = photoPreview && !photoFile ? photoPreview : null;
      if (photoFile) photo_url = await uploadPhoto(photoFile);
      const row = {
        session_id: sid,
        status,
        activity_type: activityType, scope,
        title: title.trim().slice(0, 100),
        description: description.trim().slice(0, 800),
        place_label: placeLabel.trim() ? placeLabel.trim().slice(0, 120) : null,
        lat, lng,
        official_url: officialUrl.trim() ? officialUrl.trim().slice(0, 300) : null,
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

  if (verifiedQ.isLoading) return <div className="pt-16 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!verifiedQ.data) {
    return (
      <div className="pt-8 space-y-4 text-center">
        <ShieldAlert className="w-14 h-14 mx-auto text-amber-500" />
        <h2 className="text-lg font-bold">{t(lang, "承認された投稿者のみ", "Verified posters only")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(lang, "取り組みの投稿には事前の承認が必要です。運営にお問い合わせください。",
            "Only verified organisations or individuals can post activities. Please contact the operator.")}
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
      <h2 className="text-lg font-extrabold text-purple-600">{t(lang, "取り組みを投稿", "Post an activity")}</h2>

      {(draftsQ.data ?? []).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="text-[11px] font-bold text-purple-700">{t(lang, "自分の投稿・下書き", "My drafts & posts")}</div>
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

      <Section label={t(lang, "種別", "Type")}>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_TYPE_LIST.map((m) => {
            const Icon = m.icon;
            const active = m.type === activityType;
            return (
              <button key={m.type} onClick={() => setActivityType(m.type)}
                className="min-h-[60px] rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1"
                style={active ? { backgroundColor: m.color, color: "#fff", borderColor: m.color }
                  : { backgroundColor: m.soft, color: m.color, borderColor: `${m.color}55` }}>
                <Icon className="w-4 h-4" />
                {lang === "ja" ? m.ja : m.en}
              </button>
            );
          })}
        </div>
      </Section>

      <Section label={t(lang, "活動範囲", "Scope")}>
        <div className="grid grid-cols-5 gap-1.5">
          {SCOPES.map((s) => (
            <button key={s.id} onClick={() => setScope(s.id)}
              className="min-h-[40px] rounded-xl border text-[10px] font-semibold"
              style={scope === s.id
                ? { backgroundColor: "#8B5CF6", color: "#fff", borderColor: "#8B5CF6" }
                : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
              {lang === "ja" ? s.ja : s.en}
            </button>
          ))}
        </div>
      </Section>

      <Section label={t(lang, "タイトル（必須）", "Title (required)")}>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
      </Section>

      <Section label={t(lang, "内容（必須）", "Description (required)")}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 800))} rows={4}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
      </Section>

      {(scope === "single" || scope === "local") && (
        <Section label={t(lang, "場所（必須）", "Location (required)")}>
          <LocationPicker lat={lat} lng={lng} accentColor="#8B5CF6"
            onPick={(la, ln, label) => { setLat(la); setLng(ln); if (label) setPlaceLabel(label); }} />
        </Section>
      )}

      <Section label={t(lang, "公式サイト・SNS（任意）", "Official site / SNS (optional)")}>
        <input value={officialUrl} onChange={(e) => setOfficialUrl(e.target.value.slice(0, 300))}
          placeholder="https://www.example.com"
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
      </Section>

      <Section label={t(lang, "写真（任意・1枚）", "Photo (optional, 1)")}>
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-border" />
            <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 min-h-[80px] rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 text-purple-700 text-sm cursor-pointer">
            <ImagePlus className="w-5 h-5" />
            {t(lang, "写真を選ぶ", "Choose a photo")}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); }} />
          </label>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => save("draft")} disabled={busy}
          className="min-h-[48px] rounded-2xl border-2 border-purple-500 text-purple-700 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" />{t(lang, "下書き保存", "Save draft")}
        </button>
        <button onClick={() => save("pending")} disabled={busy}
          className="min-h-[48px] rounded-2xl bg-purple-500 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t(lang, "申請する", "Submit")}
        </button>
      </div>

      <Link to="/activities" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "戻る", "Back")}
      </Link>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
      <div className="text-[11px] font-bold text-purple-600">{label}</div>
      {children}
    </div>
  );
}
