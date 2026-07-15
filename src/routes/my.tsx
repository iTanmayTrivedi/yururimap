import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId, MOODS, filterByRange, type TimeRange } from "@/lib/session";
import { MapView, type MapPoint } from "@/components/MapView";
import { RangeTabs } from "@/components/RangeTabs";
import { useLang, t } from "@/lib/i18n";
import { FaceIcon } from "@/components/FaceIcon";
import { loadProfile, saveProfile } from "@/lib/profile";
import { Loader2, Trash2, Luggage, MapPin, Home as HomeIcon, User, Settings } from "lucide-react";

export const Route = createFileRoute("/my")({
  head: () => ({
    meta: [
      { title: "旅ログ / Trip Log" },
      { name: "description", content: "Review your mood history." },
    ],
  }),
  component: MyPage,
});

const JAPAN_CENTER: [number, number] = [36.5, 138.0];

function MyPage() {
  const { lang } = useLang();
  const [sid, setSid] = useState("");
  const [range, setRange] = useState<TimeRange>("all");
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    setSid(getSessionId());
    try {
      const raw = localStorage.getItem("niko_last_sub");
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.lat === "number" && typeof p.lng === "number") setFocus({ lat: p.lat, lng: p.lng });
      }
    } catch { /* ignore */ }
  }, []);

  const { data, isLoading, error } = useQuery({
    enabled: !!sid,
    queryKey: ["my-submissions", sid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions").select("*").eq("session_id", sid)
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function del(id: string) {
    const { error } = await supabase.from("submissions").delete().eq("id", id).eq("session_id", sid);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "削除しました", "Deleted"));
    qc.invalidateQueries({ queryKey: ["my-submissions", sid] });
    qc.invalidateQueries({ queryKey: ["public-submissions"] });
  }

  const ranged = filterByRange(data ?? [], range);
  const counts = MOODS.map((m) => ({ ...m, count: ranged.filter((d) => d.mood === m.ja).length }));
  const points: MapPoint[] = ranged
    .map((d): MapPoint | null => {
      const lat = (d.exact_lat as number | null) ?? (d.rounded_lat as number | null);
      const lng = (d.exact_lng as number | null) ?? (d.rounded_lng as number | null);
      if (lat == null || lng == null) return null;
      return {
        id: d.id, own: true, timestamp: d.timestamp,
        lat, lng, color: d.mood_color,
        emoji: MOODS.find((m) => m.ja === d.mood)?.emoji, label: d.mood,
      };
    })
    .filter((p): p is MapPoint => p !== null);

  const mapCenter: [number, number] = focus ? [focus.lat, focus.lng] : JAPAN_CENTER;
  const mapZoom = focus ? 15 : 5;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold inline-flex items-center gap-2">
          <User className="w-5 h-5 text-sky-600" />
          {t(lang, "マイページ", "My Page")}
        </h2>
        <p className="text-xs text-muted-foreground">My Page</p>
      </div>

      <SettingsCard />

      <div className="pt-2 flex items-center gap-2">
        <Luggage className="w-4 h-4 text-emerald-600" />
        <h3 className="text-base font-bold">{t(lang, "旅ログ", "Trip Log")}</h3>
      </div>

      <RangeTabs value={range} onChange={setRange} />

      {/* Horizontal face counts */}
      <div className="grid grid-cols-5 gap-1.5">
        {counts.map((c) => (
          <div key={c.ja} className="rounded-2xl border bg-card p-1.5 flex flex-col items-center min-h-[90px]"
               style={{ borderColor: `${c.color}55`, backgroundColor: c.soft }}>
            <span className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm mb-1"
                  style={{ backgroundColor: "#fff", border: `2px solid ${c.color}` }}>
              <FaceIcon color={c.color} kind={c.en} />
            </span>
            <span className="text-[10px] font-bold leading-tight text-center" style={{ color: c.color }}>
              {lang === "ja" ? c.ja : c.en}
            </span>
            <span className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color: c.color }}>{c.count}</span>
          </div>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
      {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}

      {/* Big, obvious pin-delete hint */}
      <div className="rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50 px-3 py-2.5 flex items-center gap-3">
        <span className="text-2xl shrink-0">🦦</span>
        <div className="flex-1 min-w-0 text-[11px] text-pink-900 leading-snug">
          <div className="font-bold text-sm">
            {t(lang, "ピンをタップすると削除できます", "Tap a pin on the map to delete it")}
          </div>
          <div>{t(lang, "タップしてみてね！", "Give it a try!")}</div>
        </div>
        <Trash2 className="w-5 h-5 text-pink-500 shrink-0" />
      </div>

      <div className="rounded-2xl overflow-hidden border border-border shadow-md bg-card">
        <ClientOnly fallback={<div className="h-[280px] bg-muted" />}>
          <MapView
            points={points}
            height="280px"
            center={mapCenter}
            zoom={mapZoom}
            fitToPoints={false}
            highlightOwn
            onDelete={del}
          />
        </ClientOnly>
      </div>

      {ranged.length === 0 && !isLoading && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          {t(lang, "この期間の記録はありません", "No records in this range")}
        </div>
      )}

      {ranged.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-semibold">{t(lang, "履歴", "History")}</h3>
          {ranged.map((d) => {
            const m = MOODS.find((x) => x.ja === d.mood);
            return (
              <div key={d.id} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 border border-border shadow-sm"
                style={{ borderLeft: `4px solid ${d.mood_color}` }}>
                <span className="text-2xl">{m?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {lang === "ja" ? d.mood : d.mood_en}
                    <span className="text-[11px] text-muted-foreground ml-1">/ {lang === "ja" ? d.mood_en : d.mood}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(d.timestamp).toLocaleString(lang === "ja" ? "ja-JP" : undefined)}
                  </div>
                </div>
                {d.shared_code && <span className="text-[10px] font-mono px-2 py-1 rounded bg-muted">{d.shared_code}</span>}
                <button
                  onClick={() => {
                    if (confirm(t(lang, "この投稿を削除しますか？", "Delete this post?"))) del(d.id);
                  }}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                  title={t(lang, "削除", "Delete")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsCard() {
  const { lang } = useLang();
  const [locOn, setLocOn] = useState(true);
  const [homeArea, setHomeArea] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("niko_loc_on");
    setLocOn(saved !== "off");
    const p = loadProfile();
    setHomeArea(p.homeArea ?? "");
    setHomeLat(p.homeLat ?? null);
    setHomeLng(p.homeLng ?? null);
  }, []);

  function toggleLoc() {
    const next = !locOn;
    setLocOn(next);
    localStorage.setItem("niko_loc_on", next ? "on" : "off");
    toast.success(next ? t(lang, "位置情報 ON", "Location ON") : t(lang, "位置情報 OFF", "Location OFF"));
  }

  function useCurrentAsHome() {
    if (!("geolocation" in navigator)) {
      toast.error(t(lang, "位置情報が使えません", "Geolocation unavailable")); return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHomeLat(p.coords.latitude); setHomeLng(p.coords.longitude);
        saveProfile({ ...loadProfile(), homeLat: p.coords.latitude, homeLng: p.coords.longitude, homeArea });
        setBusy(false);
        toast.success(t(lang, "現在地を居住地域に設定しました", "Saved current location as home"));
      },
      () => { setBusy(false); toast.error(t(lang, "位置情報を取得できません", "Could not get location")); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function saveArea() {
    saveProfile({ ...loadProfile(), homeArea: homeArea.trim().slice(0, 60), homeLat: homeLat ?? undefined, homeLng: homeLng ?? undefined });
    toast.success(t(lang, "保存しました", "Saved"));
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-sky-600" />
        <h3 className="text-sm font-bold">{t(lang, "設定", "Settings")}</h3>
      </div>

      {/* Location toggle */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
        <MapPin className="w-4 h-4 shrink-0" style={{ color: locOn ? "#059669" : "#9CA3AF" }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {t(lang, "位置情報", "Location")}
            <span className="ml-2 text-xs font-bold" style={{ color: locOn ? "#059669" : "#6B7280" }}>
              {locOn ? "ON" : "OFF"}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {locOn
              ? t(lang, "気持ち投稿に正確な位置を保存します", "Saves exact location on mood posts")
              : t(lang, "位置は保存しません", "Location not saved")}
          </div>
        </div>
        <button onClick={toggleLoc}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border bg-card">
          {locOn ? "ON → OFF" : "OFF → ON"}
        </button>
      </div>

      {/* Home area */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HomeIcon className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold">{t(lang, "居住地域（任意）", "Home area (optional)")}</span>
        </div>
        <input
          value={homeArea}
          onChange={(e) => setHomeArea(e.target.value.slice(0, 60))}
          placeholder={t(lang, "例：東京都 中野区", "e.g. Nakano, Tokyo")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
        />
        <div className="flex gap-2">
          <button onClick={saveArea}
            className="flex-1 min-h-[40px] rounded-xl bg-sky-500 text-white text-xs font-bold">
            {t(lang, "保存", "Save")}
          </button>
          <button onClick={useCurrentAsHome} disabled={busy}
            className="flex-1 min-h-[40px] rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            {t(lang, "現在地を使う", "Use current")}
          </button>
        </div>
        {homeLat != null && homeLng != null && (
          <div className="text-[10px] text-muted-foreground">
            ✓ {homeLat.toFixed(4)}, {homeLng.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
}
