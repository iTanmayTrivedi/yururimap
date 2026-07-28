/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { loadGoogleMaps, pinSvgUrl, DEFAULT_CENTER, type PinKind } from "@/lib/gmaps";

export type MapItem = {
  id: string;
  lat: number;
  lng: number;
  kind: PinKind;
  count: number;
};

type Props = {
  items: MapItem[];
  center?: { lat: number; lng: number } | null;
  height?: number;
  zoom?: number;
  onSelect?: (id: string) => void;
};

/** Google map rendering problem / resolved / activity pins. */
export function PostsGoogleMap({ items, center, height = 300, zoom = 13, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mapsRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !ref.current || mapRef.current) return;
      mapsRef.current = maps;
      mapRef.current = new maps.Map(ref.current, {
        center: center ?? DEFAULT_CENTER,
        zoom,
        minZoom: 2,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      draw();
    }).catch(() => { /* key/network issue — map stays blank */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const maps = mapsRef.current; const map = mapRef.current;
    if (!maps || !map) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    items.forEach((it) => {
      const marker = new maps.Marker({
        position: { lat: it.lat, lng: it.lng },
        map,
        icon: {
          url: pinSvgUrl(it.kind, String(it.count)),
          scaledSize: new maps.Size(34, 44),
          anchor: new maps.Point(17, 44),
        },
      });
      marker.addListener("click", () => onSelectRef.current?.(it.id));
      markersRef.current.push(marker);
    });
  }

  useEffect(() => { draw(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.panTo(center);
      if (mapRef.current.getZoom() < 13) mapRef.current.setZoom(14);
    }
  }, [center]);

  return <div ref={ref} style={{ height, width: "100%" }} className="bg-muted" />;
}
