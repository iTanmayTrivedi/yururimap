import { useEffect, useRef } from "react";
import L from "leaflet";

export type MapPoint = {
  lat: number;
  lng: number;
  color: string;
  emoji?: string;
  label?: string;
  /** When set + own===true, marker gets a delete button in its popup. */
  id?: string;
  own?: boolean;
  timestamp?: string;
};

type Props = {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showPolyline?: boolean;
  fitToPoints?: boolean;
  jitterDuplicates?: boolean;
  /** Callback when user clicks "delete" in a popup. */
  onDelete?: (id: string) => void;
  /** Highlight own markers with a ring. */
  highlightOwn?: boolean;
};

const JAPAN: [number, number] = [36.5, 138.0];

function spreadOverlaps(points: MapPoint[]): MapPoint[] {
  const buckets = new Map<string, MapPoint[]>();
  points.forEach((p) => {
    const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    const arr = buckets.get(k) ?? [];
    arr.push(p);
    buckets.set(k, arr);
  });
  const out: MapPoint[] = [];
  buckets.forEach((arr) => {
    if (arr.length === 1) { out.push(arr[0]); return; }
    const r = 0.0003;
    arr.forEach((p, i) => {
      const a = (2 * Math.PI * i) / arr.length;
      out.push({ ...p, lat: p.lat + r * Math.cos(a), lng: p.lng + r * Math.sin(a) });
    });
  });
  return out;
}

export function MapView({
  points, center = JAPAN, zoom = 5, height = "400px",
  showPolyline = false, fitToPoints = true, jitterDuplicates = false,
  onDelete, highlightOwn = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onDeleteRef = useRef(onDelete);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center, zoom, minZoom: 2, worldCopyJump: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19, minZoom: 2, subdomains: ["a", "b", "c"], noWrap: false,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener("resize", onResize);
      map.remove(); mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const display = jitterDuplicates ? spreadOverlaps(points) : points;

    display.forEach((p) => {
      const isOwn = !!p.own;
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: isOwn && highlightOwn ? 12 : 9,
        fillColor: p.color,
        color: isOwn && highlightOwn ? "#111827" : "#fff",
        weight: isOwn && highlightOwn ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.92,
      });
      const time = p.timestamp ? new Date(p.timestamp).toLocaleString() : "";
      const canDelete = isOwn && !!p.id && !!onDeleteRef.current;
      const html = `
        <div style="min-width:140px;font-family:inherit">
          <div style="font-size:22px">${p.emoji ?? ""}</div>
          <div style="font-weight:600;margin-top:2px">${p.label ?? ""}</div>
          ${time ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${time}</div>` : ""}
          ${canDelete ? `<button data-del="${p.id}" style="margin-top:8px;width:100%;padding:6px 8px;border-radius:6px;background:#ef4444;color:#fff;font-weight:600;font-size:12px;border:0;cursor:pointer">🗑 削除 / Delete</button>` : ""}
        </div>`;
      marker.bindPopup(html);
      marker.on("popupopen", (e) => {
        const el = (e.popup.getElement() as HTMLElement | null)?.querySelector<HTMLButtonElement>(`button[data-del="${p.id}"]`);
        if (el) el.onclick = () => {
          if (confirm("この投稿を削除しますか？ / Delete this post?")) {
            onDeleteRef.current?.(p.id as string);
            marker.closePopup();
          }
        };
      });
      marker.addTo(layer);
    });

    if (showPolyline && points.length > 1) {
      L.polyline(points.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "#64748b", weight: 2, opacity: 0.6, dashArray: "4 6" }).addTo(layer);
    }

    if (fitToPoints && display.length > 0) {
      const bounds = L.latLngBounds(display.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds.pad(0.2), { maxZoom: 14, animate: false });
    } else {
      map.setView(center, zoom);
    }
    setTimeout(() => map.invalidateSize(), 50);
  }, [points, showPolyline, fitToPoints, center, zoom, jitterDuplicates, highlightOwn]);

  return <div ref={containerRef} style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}
