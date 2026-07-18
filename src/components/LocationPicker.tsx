import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Search, Loader2, MapPin, Home as HomeIcon } from "lucide-react";
import { useLang, t } from "@/lib/i18n";
import { loadProfile } from "@/lib/profile";
import { toast } from "sonner";

type SearchHit = { display_name: string; lat: string; lon: string };
type LocSource = "current" | "home" | "map" | "search" | null;

type Props = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number, label?: string | null, source?: LocSource) => void;
  height?: number;
  accentColor?: string;
};

export function LocationPicker({ lat, lng, onPick, height = 220, accentColor = "#10B981" }: Props) {
  const { lang } = useLang();
  const [source, setSource] = useState<LocSource>(null);

  function useCurrent() {
    if (!("geolocation" in navigator)) {
      toast.error(t(lang, "位置情報が使えません", "Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => { onPick(p.coords.latitude, p.coords.longitude, null, "current"); setSource("current"); },
      () => toast.error(t(lang, "位置情報を取得できません", "Could not get location")),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }
  function useHome() {
    const profile = loadProfile();
    if (profile.homeLat != null && profile.homeLng != null) {
      onPick(profile.homeLat, profile.homeLng, profile.homeArea ?? null, "home");
      setSource("home");
    } else if (profile.homeArea) {
      toast.info(t(lang, "居住地域の位置がまだ保存されていません。マイページで「保存」を押してください。", "Home area location isn't saved yet. Please press Save on My Page."));
    } else {
      toast.info(t(lang, "居住地域が未登録です（マイページで登録できます）", "Home area not set (set it on My Page)"));
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <LocBtn active={source === "current"} onClick={useCurrent} accentColor={accentColor}
          icon={<MapPin className="w-4 h-4" />} label={t(lang, "現在地", "Current")} />
        <LocBtn active={source === "home"} onClick={useHome} accentColor={accentColor}
          icon={<HomeIcon className="w-4 h-4" />} label={t(lang, "居住地域", "Home")} />
      </div>
      <PickerMap lat={lat} lng={lng} height={height}
        onPickMap={(la, ln) => { onPick(la, ln, null, "map"); setSource("map"); }}
        onPickSearch={(la, ln, label) => { onPick(la, ln, label, "search"); setSource("search"); }} />
      {lat != null && lng != null && (
        <div className="text-[11px] text-emerald-700">
          ✓ {lat.toFixed(4)}, {lng.toFixed(4)}
        </div>
      )}
    </div>
  );
}

function LocBtn({ active, onClick, icon, label, accentColor }:
  { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; accentColor: string }) {
  return (
    <button
      onClick={onClick}
      className="min-h-[44px] rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1"
      style={active
        ? { backgroundColor: accentColor, color: "#fff", borderColor: accentColor }
        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
    >
      {icon}{label}
    </button>
  );
}

function PickerMap({ lat, lng, onPickMap, onPickSearch, height }: {
  lat: number | null; lng: number | null;
  onPickMap: (lat: number, lng: number) => void;
  onPickSearch: (lat: number, lng: number, label: string) => void;
  height: number;
}) {
  const { lang } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onPickMapRef = useRef(onPickMap);
  useEffect(() => { onPickMapRef.current = onPickMap; }, [onPickMap]);

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
        // Bias to Japan when the query contains CJK (Hiragana/Katakana/Kanji),
        // and prefer Japanese-language names for higher accuracy on JP places.
        const isJa = /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/.test(q);
        const acceptLang = isJa ? "ja,en;q=0.5" : `${lang},ja;q=0.5,en;q=0.3`;
        const params = new URLSearchParams({
          format: "json", addressdetails: "0", limit: "8",
          "accept-language": acceptLang, q,
        });
        if (isJa) params.set("countrycodes", "jp");
        const primary = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
        const res = await fetch(primary, { signal: ctrl.signal, headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error("search failed");
        let data = (await res.json()) as SearchHit[];
        // Fallback: if a Japanese query returned nothing (e.g. facility name only),
        // retry via Photon (Komoot) which handles Japanese POIs well.
        if (data.length === 0 && isJa) {
          const photon = `https://photon.komoot.io/api/?lang=default&limit=8&q=${encodeURIComponent(q)}`;
          const r2 = await fetch(photon, { signal: ctrl.signal });
          if (r2.ok) {
            const j = await r2.json() as { features?: Array<{ geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> }> };
            data = (j.features ?? []).map((f) => {
              const p = f.properties;
              const name = [p.name, p.city, p.state, p.country].filter(Boolean).join(", ");
              return { lat: String(f.geometry.coordinates[1]), lon: String(f.geometry.coordinates[0]), display_name: name };
            });
          }
        }
        setResults(data); setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally { setSearching(false); }
    }, 400);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [query, lang]);


  function choose(h: SearchHit) {
    const la = parseFloat(h.lat); const ln = parseFloat(h.lon);
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      onPickSearch(la, ln, h.display_name);
      setQuery(h.display_name);
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const profile = loadProfile();
    const initial: [number, number] = lat != null && lng != null ? [lat, lng]
      : profile.homeLat != null && profile.homeLng != null ? [profile.homeLat, profile.homeLng]
      : [36.5, 138.0];
    const m = L.map(ref.current, { center: initial, zoom: lat != null || profile.homeLat != null ? 13 : 5, minZoom: 2, worldCopyJump: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19, minZoom: 2, subdomains: ["a","b","c"],
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => onPickMapRef.current(e.latlng.lat, e.latlng.lng));
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

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={t(lang, "地名・駅名で検索", "Search place or station")}
            className="w-full bg-transparent text-sm outline-none"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        {open && results.length > 0 && (
          <ul className="absolute z-[1000] left-0 right-0 mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-card shadow-lg">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lon},${i}`}>
                <button type="button" onClick={() => choose(r)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted">
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={ref} style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }} className="border border-border" />
    </div>
  );
}
