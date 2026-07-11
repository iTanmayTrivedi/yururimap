import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { loadProfile } from "@/lib/profile";
import { MapView } from "@/components/MapView";
import { AlertCircle, ArrowLeft, Loader2, MapPin, Home as HomeIcon, Map as MapIcon, Check } from "lucide-react";

export const Route = createFileRoute("/trouble/$slug")({
  head: () => ({
    meta: [
      { title: "アンケート回答 / Survey — YururiMap" },
      { name: "description", content: "Answer the fixed survey for this category." },
    ],
  }),
  component: TroubleSurvey,
});

type Category = { id: string; slug: string; name_ja: string; name_en: string; emoji: string };
type Survey = { id: string; title: string; description: string | null };
type Question = { id: string; label: string; order_index: number; location_enabled: boolean };
type LocSource = "current" | "home" | "map" | null;
type Answer = { comment: string; lat: number | null; lng: number | null; location_source: LocSource };

function TroubleSurvey() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const navigate = useNavigate();

  const dataQ = useQuery({
    queryKey: ["fixed-survey", slug],
    queryFn: async () => {
      const { data: cat, error: e1 } = await supabase
        .from("fixed_survey_categories").select("*").eq("slug", slug).maybeSingle();
      if (e1) throw e1;
      if (!cat) return null;
      const { data: survey } = await supabase
        .from("fixed_surveys").select("*")
        .eq("category_id", cat.id).eq("is_published", true).maybeSingle();
      let questions: Question[] = [];
      if (survey) {
        const { data: qs } = await supabase
          .from("fixed_survey_questions").select("*")
          .eq("survey_id", survey.id).order("order_index", { ascending: true });
        questions = (qs ?? []) as Question[];
      }
      return { cat: cat as Category, survey: survey as Survey | null, questions };
    },
  });

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);
  const profile = useMemo(() => loadProfile(), []);

  function setAns(qid: string, patch: Partial<Answer>) {
    setAnswers((a) => ({
      ...a,
      [qid]: { comment: "", lat: null, lng: null, location_source: null, ...(a[qid] ?? {}), ...patch },
    }));
  }

  async function useCurrent(qid: string) {
    if (!("geolocation" in navigator)) {
      toast.error(t(lang, "位置情報が使えません", "Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setAns(qid, { lat: p.coords.latitude, lng: p.coords.longitude, location_source: "current" }),
      () => toast.error(t(lang, "位置情報を取得できません", "Could not get location")),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function useHome(qid: string) {
    if (profile.homeLat != null && profile.homeLng != null) {
      setAns(qid, { lat: profile.homeLat, lng: profile.homeLng, location_source: "home" });
      return;
    }
    toast.info(t(lang, "居住地域の座標が未登録です（初回設定から登録できます）",
      "Home area coordinates not set (register them in initial setup)"));
  }

  async function submit() {
    const d = dataQ.data;
    if (!d?.survey) return;
    setSubmitting(true);
    try {
      const sid = getSessionId();
      const { data: sub, error: se } = await supabase
        .from("fixed_survey_submissions")
        .insert({ survey_id: d.survey.id, session_id: sid })
        .select("id").single();
      if (se) throw se;
      const rows = d.questions.map((q) => {
        const a = answers[q.id] ?? { comment: "", lat: null, lng: null, location_source: null };
        return {
          submission_id: sub.id,
          question_id: q.id,
          comment: a.comment?.trim() ? a.comment.trim().slice(0, 400) : null,
          lat: q.location_enabled ? a.lat : null,
          lng: q.location_enabled ? a.lng : null,
          location_source: q.location_enabled ? a.location_source : null,
        };
      });
      if (rows.length > 0) {
        const { error: ae } = await supabase.from("fixed_survey_answers").insert(rows);
        if (ae) throw ae;
      }
      toast.success(t(lang, "送信しました。ありがとうございます！", "Submitted. Thank you!"));
      navigate({ to: "/trouble" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (dataQ.isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }
  if (!dataQ.data) {
    return (
      <div className="space-y-3">
        <Link to="/trouble" className="text-sm text-muted-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> {t(lang, "戻る", "Back")}
        </Link>
        <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
          {t(lang, "カテゴリが見つかりません", "Category not found")}
        </div>
      </div>
    );
  }
  const { cat, survey, questions } = dataQ.data;

  return (
    <div className="space-y-4">
      <Link to="/trouble" className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> {t(lang, "戻る", "Back")}
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cat.emoji}</span>
          <div className="min-w-0">
            <div className="text-[11px] text-rose-700 font-semibold">
              {t(lang, "困りごとのテーマ", "Trouble category")}
            </div>
            <div className="font-bold truncate">{lang === "ja" ? cat.name_ja : cat.name_en}</div>
          </div>
        </div>
        {survey?.title && <div className="mt-3 font-bold text-sm">{survey.title}</div>}
        {survey?.description && (
          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{survey.description}</p>
        )}
      </div>

      {!survey ? (
        <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
          <AlertCircle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
          {t(lang, "このテーマのアンケートはまだ準備中です。", "Survey for this category is not ready yet.")}
        </div>
      ) : (
        <>
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              index={i + 1}
              total={questions.length}
              q={q}
              answer={answers[q.id]}
              onChange={(patch) => setAns(q.id, patch)}
              onCurrent={() => useCurrent(q.id)}
              onHome={() => useHome(q.id)}
              lang={lang}
            />
          ))}

          <button
            onClick={submit}
            disabled={submitting || questions.length === 0}
            className="w-full min-h-[52px] rounded-2xl bg-rose-500 text-white font-bold shadow-md disabled:opacity-60"
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin inline" />
              : t(lang, "アンケートに答える / 送信", "Submit answers")}
          </button>
        </>
      )}
    </div>
  );
}

function QuestionCard({
  index, total, q, answer, onChange, onCurrent, onHome, lang,
}: {
  index: number; total: number; q: Question; answer: Answer | undefined;
  onChange: (patch: Partial<Answer>) => void;
  onCurrent: () => void; onHome: () => void;
  lang: "ja" | "en";
}) {
  const a = answer ?? { comment: "", lat: null, lng: null, location_source: null };
  const hasLoc = a.lat != null && a.lng != null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div>
        <div className="text-[11px] text-rose-600 font-semibold">
          {index}/{total}
        </div>
        <div className="font-bold">{q.label}</div>
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground">
          {t(lang, "コメント（任意・3行まで）", "Comment (optional, up to 3 lines)")}
        </label>
        <textarea
          rows={3}
          maxLength={150}
          value={a.comment}
          onChange={(e) => onChange({ comment: e.target.value })}
          placeholder={t(lang, "自由にご記入ください", "Write freely")}
          className="mt-1 w-full rounded-xl border border-input bg-card p-2 text-sm resize-none"
        />
        <div className="text-right text-[10px] text-muted-foreground">{a.comment.length}/150</div>
      </div>

      {q.location_enabled && (
        <div className="space-y-2">
          <div className="text-[11px] text-emerald-700 font-semibold">
            {t(lang, "位置情報（任意）", "Location (optional)")}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <LocBtn active={a.location_source === "current"} onClick={onCurrent} icon={<MapPin className="w-4 h-4" />}
              label={t(lang, "現在地", "Current")} />
            <LocBtn active={a.location_source === "home"} onClick={onHome} icon={<HomeIcon className="w-4 h-4" />}
              label={t(lang, "居住地域", "Home")} />
            <LocBtn active={a.location_source === "map"} onClick={() => { /* map click sets */ }}
              icon={<MapIcon className="w-4 h-4" />} label={t(lang, "地図で選ぶ", "Map")} />
          </div>
          <div className="rounded-xl overflow-hidden border border-border">
            <ClickableMap
              lat={a.lat} lng={a.lng}
              onPick={(lat, lng) => onChange({ lat, lng, location_source: "map" })}
            />
          </div>
          {hasLoc && (
            <div className="text-[11px] text-emerald-700 flex items-center gap-1">
              <Check className="w-3 h-3" /> {a.lat!.toFixed(4)}, {a.lng!.toFixed(4)}
              <button className="ml-2 underline text-muted-foreground"
                onClick={() => onChange({ lat: null, lng: null, location_source: null })}>
                {t(lang, "クリア", "clear")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[40px] rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1 ${
        active ? "bg-emerald-500 text-white border-emerald-500" : "bg-card border-border text-foreground"
      }`}
    >
      {icon}{label}
    </button>
  );
}

function ClickableMap({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  // Reuse MapView for visualization; overlay a transparent click layer for picking.
  // We use a small dedicated Leaflet map for reliable click capture.
  return <PickerMap lat={lat} lng={lng} onPick={onPick} />;
}

// Minimal picker map (Leaflet direct) so we can capture clicks precisely.
import { useEffect, useRef } from "react";
import L from "leaflet";
function PickerMap({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const m = L.map(ref.current, {
      center: lat != null && lng != null ? [lat, lng] : [36.5, 138.0],
      zoom: lat != null ? 12 : 5,
      minZoom: 2,
      worldCopyJump: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19, minZoom: 2, subdomains: ["a","b","c"],
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => {
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 80);
    return () => { m.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    if (lat == null || lng == null) {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 10, color: "#fff", weight: 2, fillColor: "#EF4444", fillOpacity: 0.95,
      }).addTo(m);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    m.setView([lat, lng], Math.max(m.getZoom(), 12), { animate: true });
  }, [lat, lng]);

  return <div ref={ref} style={{ height: 200, width: "100%" }} />;
}
