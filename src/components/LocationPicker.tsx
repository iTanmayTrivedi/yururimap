/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { MapPin, Home as HomeIcon } from "lucide-react";
import { toast } from "sonner";
import { useLang, t } from "@/lib/i18n";
import { loadProfile } from "@/lib/profile";
import { loadGoogleMaps, DEFAULT_CENTER } from "@/lib/gmaps";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";

type LocSource = "current" | "home" | "map" | "search" | null;

type Props = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number, label?: string | null, source?: LocSource) => void;
  height?: number;
  accentColor?: string;
};

export function LocationPicker({ lat, lng, onPick, height = 220, accentColor = "#38BDF8" }: Props) {
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
          icon={<MapPin className="w-4 h-4" />} label={t(lang, "現在地を使う", "Use current location")} />
        <LocBtn active={source === "home"} onClick={useHome} accentColor={accentColor}
          icon={<HomeIcon className="w-4 h-4" />} label={t(lang, "居住地域を使う", "Use home area")} />
      </div>

      <PlaceSearchInput
        placeholder={t(lang, "地名・駅名・施設名で検索", "Search place, station or facility")}
        onPick={(la, ln, label) => { onPick(la, ln, label, "search"); setSource("search"); }}
      />

      <PickerMap lat={lat} lng={lng} height={height}
        onPickMap={(la, ln) => { onPick(la, ln, null, "map"); setSource("map"); }} />

      <div className="text-[11px] text-muted-foreground">
        {t(lang, "地図をタップしてピンを置くこともできます", "You can also tap the map to drop a pin")}
      </div>
      {lat != null && lng != null && (
        <div className="text-[11px] text-emerald-700">✓ {lat.toFixed(4)}, {lng.toFixed(4)}</div>
      )}
    </div>
  );
}

function LocBtn({ active, onClick, icon, label, accentColor }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; accentColor: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className="min-h-[44px] rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 px-2"
      style={active
        ? { backgroundColor: accentColor, color: "#fff", borderColor: accentColor }
        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
      {icon}{label}
    </button>
  );
}

function PickerMap({ lat, lng, height, onPickMap }: {
  lat: number | null; lng: number | null; height: number;
  onPickMap: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapsRef = useRef<any>(null);
  const cbRef = useRef(onPickMap);
  useEffect(() => { cbRef.current = onPickMap; }, [onPickMap]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !ref.current || mapRef.current) return;
      mapsRef.current = maps;
      mapRef.current = new maps.Map(ref.current, {
        center: lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER,
        zoom: lat != null ? 15 : 12,
        minZoom: 2,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      mapRef.current.addListener("click", (e: any) => {
        cbRef.current(e.latLng.lat(), e.latLng.lng());
      });
      sync();
    }).catch(() => { /* map unavailable */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    const maps = mapsRef.current; const map = mapRef.current;
    if (!maps || !map) return;
    if (lat == null || lng == null) { markerRef.current?.setMap(null); markerRef.current = null; return; }
    const pos = { lat, lng };
    if (!markerRef.current) {
      markerRef.current = new maps.Marker({ position: pos, map, draggable: true });
      markerRef.current.addListener("dragend", (e: any) => cbRef.current(e.latLng.lat(), e.latLng.lng()));
    } else {
      markerRef.current.setPosition(pos);
    }
    map.panTo(pos);
    if (map.getZoom() < 14) map.setZoom(15);
  }

  useEffect(() => { sync(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return <div ref={ref} style={{ height }} className="w-full rounded-xl overflow-hidden border border-border bg-muted" />;
}
