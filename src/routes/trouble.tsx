import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { loadProfile } from "@/lib/profile";
import { AlertCircle, ArrowLeft, Check, Home as HomeIcon, Loader2, Map as MapIcon, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/trouble")({
  head: () => ({
    meta: [
      { title: "困った / Report a problem — YururiMap" },
      { name: "description", content: "Report a local concern in seconds." },
    ],
  }),
  component: TroublePage,
});

type LocSource = "current" | "home" | "map" | null;

const AFFECTED = [
  { id: "child",   ja: "子ども",     en: "Children", emoji: "🧒" },
  { id: "adult",   ja: "大人",       en: "Adults",   emoji: "🧑" },
  { id: "elder",   ja: "高齢者",     en: "Elderly",  emoji: "👵" },
  { id: "disable", ja: "障害のある方", en: "Disabled", emoji: "♿" },
  { id: "all",     ja: "みんな",     en: "Everyone", emoji: "👨‍👩‍👧" },
  { id: "unknown", ja: "わからない",  en: "Not sure", emoji: "❓" },
] as const;

function TroublePage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const profile = useMemo(() => loadProfile(), []);
  const [placeLabel, setPlaceLabel] = useState("");
  const [description, setDescription] = useState("");
  const [affected, setAffected] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locSource, setLocSource] = useState<LocSource>(null);
  const [submitting, setSubmitting] = useState(false);

  function useCurrent() {
    if (!("geolocation" in navigator)) {
      toast.error(t(lang, "位置情報が使えません", "Geolocation unavailable")); return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude); setLng(p.coords.longitude); setLocSource("current"); },
      () => toast.error(t(lang, "位置情報を取得できません", "Could not get location")),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }
  function useHome() {
    if (profile.homeLat != null && profile.homeLng != null) {
      setLat(profile.homeLat); setLng(profile.homeLng); setLocSource("home");
    } else {
      toast.info(t(lang, "居住地域が未登録です", "Home area not set"));
    }
  }

  async function submit() {
    if (!placeLabel.trim()) { toast.error(t(lang, "場所を入力してください", "Enter a place")); return; }
    if (lat == null || lng == null) { toast.error(t(lang, "位置を選んでください", "Select a location")); return; }
    if (!description.trim()) { toast.error(t(lang, "内容を入力してください", "Enter a description")); return; }
    setSubmitting(true);
    try {
      const sid = getSessionId();
      const { error } = await supabase.from("trouble_reports").insert({
        session_id: sid,
        place_label: placeLabel.trim().slice(0, 120),
        description: description.trim().slice(0, 500),
        affected_group: affected,
        lat, lng,
      });
      if (error) throw error;
      toast.success(t(lang, "投稿しました。ありがとうございます！", "Submitted. Thank you!"));
      navigate({ to: "/trouble/map" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSubmitting(false); }
  }

  const hasLoc = lat != null && lng != null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-bold">{t(lang, "困ったを伝える", "Report a problem")}</h2>
        </div>
        <Link to="/trouble/map" className="text-xs font-semibold text-rose-600 inline-flex items-center gap-1 border border-rose-200 bg-rose-50 rounded-full px-2.5 py-1">
          <MapIcon className="w-3.5 h-3.5" /> {t(lang, "困ったマップ", "Trouble map")}
        </Link>
      </div>

      {/* Step 1: place label */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
        <label className="text-[11px] text-rose-600 font-bold">1. {t(lang, "どこで困ったの？", "Where is the problem?")}</label>
        <input
          value={placeLabel}
          onChange={(e) => setPlaceLabel(e.target.value)}
          maxLength={120}
          placeholder={t(lang, "例：〇〇公園、△△交差点", "e.g. Central Park, Main St. crossing")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
        />
      </div>

      {/* Step 2: location */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
        <label className="text-[11px] text-emerald-700 font-bold">2. {t(lang, "場所を選ぶ", "Select the location")}</label>
        <div className="grid grid-cols-3 gap-2">
          <LocBtn active={locSource === "current"} onClick={useCurrent} icon={<MapPin className="w-4 h-4" />} label={t(lang, "現在地", "Current")} />
          <LocBtn active={locSource === "home"} onClick={useHome} icon={<HomeIcon className="w-4 h-4" />} label={t(lang, "居住地域", "Home")} />
          <LocBtn active={locSource === "map"} onClick={() => { /* pick via map */ }} icon={<MapIcon className="w-4 h-4" />} label={t(lang, "地図で選ぶ", "Map")} />
        </div>
        <div className="rounded-xl overflow-hidden border border-border">
          <PickerMap lat={lat} lng={lng} onPick={(la, ln) => { setLat(la); setLng(ln); setLocSource("map"); }} />
        </div>
        {hasLoc && (
          <div className="text-[11px] text-emerald-700 flex items-center gap-1">
            <Check className="w-3 h-3" /> {lat!.toFixed(4)}, {lng!.toFixed(4)}
          </div>
        )}
      </div>

      {/* Step 3: description */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
        <label className="text-[11px] text-rose-600 font-bold">3. {t(lang, "何に困った？", "What is the problem?")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder={t(lang, "例：遊具のすべり台が壊れていて危ないです。", "e.g. The playground slide is broken and unsafe.")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none"
        />
        <div className="text-right text-[10px] text-muted-foreground">{description.length}/500</div>
      </div>

      {/* Step 4: affected */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
        <label className="text-[11px] text-muted-foreground font-bold">4. {t(lang, "困ったのは誰？（任意）", "Who is affected? (optional)")}</label>
        <div className="grid grid-cols-3 gap-2">
          {AFFECTED.map((a) => (
            <button
              key={a.id}
              onClick={() => setAffected((cur) => cur === a.id ? null : a.id)}
              className={`min-h-[64px] rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 ${
                affected === a.id ? "bg-rose-500 text-white border-rose-500" : "bg-card border-border text-foreground"
              }`}
            >
              <span className="text-xl">{a.emoji}</span>
              {lang === "ja" ? a.ja : a.en}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full min-h-[52px] rounded-2xl bg-rose-500 text-white font-bold shadow-md disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {t(lang, "困ったを伝える", "Submit")}
      </button>

      <Link to="/" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "ホームへ戻る", "Back to home")}
      </Link>
    </div>
  );
}

function LocBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1 ${
        active ? "bg-emerald-500 text-white border-emerald-500" : "bg-card border-border text-foreground"
      }`}
    >
      {icon}{label}
    </button>
  );
}

type SearchHit = { display_name: string; lat: string; lon: string };

function PickerMap({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  const { lang } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&accept-language=${lang}&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { signal: ctrl.signal, headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as SearchHit[];
        setResults(data);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally { setSearching(false); }
    }, 400);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [query, lang]);

  function choose(h: SearchHit) {
    const la = parseFloat(h.lat); const ln = parseFloat(h.lon);
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      onPickRef.current(la, ln);
      setQuery(h.display_name);
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const profile = loadProfile();
    const initial: [number, number] = lat != null && lng != null
      ? [lat, lng]
      : profile.homeLat != null && profile.homeLng != null
        ? [profile.homeLat, profile.homeLng]
        : [36.5, 138.0];
    const m = L.map(ref.current, { center: initial, zoom: lat != null || profile.homeLat != null ? 13 : 5, minZoom: 2, worldCopyJump: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19, minZoom: 2, subdomains: ["a","b","c"],
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => onPickRef.current(e.latlng.lat, e.latlng.lng));
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
      markerRef.current = L.circleMarker([lat, lng], { radius: 10, color: "#fff", weight: 2, fillColor: "#EF4444", fillOpacity: 0.95 }).addTo(m);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    m.setView([lat, lng], Math.max(m.getZoom(), 13), { animate: true });
  }, [lat, lng]);

  return <div ref={ref} style={{ height: 220, width: "100%" }} />;
}
