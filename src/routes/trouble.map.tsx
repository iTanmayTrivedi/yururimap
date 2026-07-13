import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { loadProfile } from "@/lib/profile";
import { AlertCircle, ArrowLeft, Heart, Loader2, MapPin, Plus, X } from "lucide-react";

export const Route = createFileRoute("/trouble/map")({
  head: () => ({
    meta: [
      { title: "困ったマップ / Trouble map — YururiMap" },
      { name: "description", content: "See local concerns near you and tap Me too." },
    ],
  }),
  component: TroubleMapPage,
});

type Report = {
  id: string;
  session_id: string;
  place_label: string;
  description: string;
  affected_group: string | null;
  lat: number;
  lng: number;
  created_at: string;
};

function TroubleMapPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reportsQ = useQuery({
    queryKey: ["trouble-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trouble_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const countsQ = useQuery({
    queryKey: ["trouble-metoo-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trouble_metoo").select("report_id");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        const id = (r as { report_id: string }).report_id;
        map.set(id, (map.get(id) ?? 0) + 1);
      }
      return map;
    },
  });

  const selected = useMemo(
    () => reportsQ.data?.find((r) => r.id === selectedId) ?? null,
    [selectedId, reportsQ.data],
  );

  async function metoo(reportId: string) {
    try {
      const sid = getSessionId();
      const { error } = await supabase.from("trouble_metoo").insert({ report_id: reportId, session_id: sid });
      if (error) {
        if (error.code === "23505") {
          toast.info(t(lang, "すでに「私も困った」を送っています", "You already said Me too"));
          return;
        }
        throw error;
      }
      toast.success(t(lang, "ありがとう！", "Thanks!"));
      qc.invalidateQueries({ queryKey: ["trouble-metoo-counts"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-bold">{t(lang, "困ったマップ", "Trouble map")}</h2>
        </div>
        <Link to="/trouble" className="text-xs font-semibold text-white bg-rose-500 rounded-full px-3 py-1.5 inline-flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> {t(lang, "困ったを投稿", "Report")}
        </Link>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        {t(lang, "赤いピンをタップして内容を確認できます", "Tap a red pin to see the details")}
      </p>

      {reportsQ.isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
          <TroubleMap
            reports={reportsQ.data ?? []}
            counts={countsQ.data ?? new Map()}
            onSelect={setSelectedId}
          />
        </div>
      )}

      {selected && (
        <div className="rounded-2xl border border-rose-200 bg-card p-4 shadow-md space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="font-bold truncate">{selected.place_label}</div>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-muted-foreground p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="text-[11px] text-rose-600 font-semibold mb-1">{t(lang, "何に困った？", "What is the problem?")}</div>
            <p className="bg-rose-50 rounded-xl px-3 py-2 text-sm whitespace-pre-wrap">{selected.description}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-rose-700 font-semibold">
              <Heart className="w-4 h-4 fill-rose-200 text-rose-500" />
              {t(lang, "この場所で困った人", "People troubled here")}
            </div>
            <div className="text-lg font-extrabold text-rose-600">
              {(countsQ.data?.get(selected.id) ?? 0) + 1}
              <span className="text-xs font-medium text-muted-foreground ml-1">{t(lang, "人", "")}</span>
            </div>
          </div>
          <button
            onClick={() => metoo(selected.id)}
            className="w-full min-h-[48px] rounded-2xl bg-rose-500 text-white font-bold shadow-sm inline-flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4" /> {t(lang, "私も困った", "Me too")}
          </button>
        </div>
      )}

      <Link to="/" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "ホームへ戻る", "Back to home")}
      </Link>
    </div>
  );
}

function TroubleMap({
  reports, counts, onSelect,
}: { reports: Report[]; counts: Map<string, number>; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const profile = loadProfile();
    const initial: [number, number] = profile.homeLat != null && profile.homeLng != null
      ? [profile.homeLat, profile.homeLng] : [36.5, 138.0];
    const zoom = profile.homeLat != null ? 13 : 5;
    const m = L.map(ref.current, { center: initial, zoom, minZoom: 2, worldCopyJump: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19, minZoom: 2, subdomains: ["a","b","c"],
    }).addTo(m);
    layerRef.current = L.layerGroup().addTo(m);
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 80);
    return () => { m.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current; const layer = layerRef.current;
    if (!m || !layer) return;
    layer.clearLayers();
    reports.forEach((r) => {
      const count = (counts.get(r.id) ?? 0) + 1;
      const size = Math.min(48, 26 + Math.log2(count) * 6);
      const html = `
        <div style="position:relative;width:${size}px;height:${size + 8}px;transform:translate(-50%,-100%);">
          <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:#EF4444;transform-origin:center;transform:translateX(-50%) rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,.25);">
            <span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:${Math.max(11, size * 0.4)}px;font-family:inherit;">${count}</span>
          </div>
        </div>`;
      const icon = L.divIcon({ className: "trouble-pin", html, iconSize: [size, size + 8], iconAnchor: [size / 2, size + 8] });
      const marker = L.marker([r.lat, r.lng], { icon });
      marker.on("click", () => onSelectRef.current(r.id));
      marker.addTo(layer);
    });
  }, [reports, counts]);

  return <div ref={ref} style={{ height: 420, width: "100%" }} />;
}
