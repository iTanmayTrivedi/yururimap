/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/gmaps";
import { useLang, t } from "@/lib/i18n";

type Suggestion = { id: string; main: string; secondary: string; place: any };

type Props = {
  placeholder?: string;
  value?: string;
  onPick: (lat: number, lng: number, label: string) => void;
  className?: string;
};

/** Google Places (New) autocomplete — strong Japanese place / station search. */
export function PlaceSearchInput({ placeholder, value, onPick, className }: Props) {
  const { lang } = useLang();
  const [query, setQuery] = useState(value ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const tokenRef = useRef<any>(null);

  useEffect(() => { if (value != null) setQuery(value); }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) { setItems([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const maps = await loadGoogleMaps();
        const places: any = await maps.importLibrary("places");
        if (!tokenRef.current) tokenRef.current = new places.AutocompleteSessionToken();
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: tokenRef.current,
          language: lang === "ja" ? "ja" : "en",
          region: "jp",
        });
        if (cancelled) return;
        const mapped: Suggestion[] = (suggestions ?? [])
          .filter((s: any) => s.placePrediction)
          .slice(0, 6)
          .map((s: any, i: number) => ({
            id: `${i}-${s.placePrediction.placeId}`,
            main: s.placePrediction.mainText?.text ?? s.placePrediction.text?.text ?? "",
            secondary: s.placePrediction.secondaryText?.text ?? "",
            place: s.placePrediction,
          }));
        setItems(mapped);
        setOpen(true);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, lang]);

  async function choose(s: Suggestion) {
    try {
      const place = s.place.toPlace();
      await place.fetchFields({ fields: ["location", "displayName", "formattedAddress"] });
      const loc = place.location;
      const label = [s.main, s.secondary].filter(Boolean).join(" ") || place.formattedAddress || "";
      setQuery(label);
      setOpen(false);
      tokenRef.current = null;
      if (loc) onPick(loc.lat(), loc.lng(), label);
    } catch { /* ignore */ }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 min-h-[44px]">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          placeholder={placeholder ?? t(lang, "地名・駅名で検索", "Search a place or station")}
          className="flex-1 bg-transparent text-sm outline-none py-2"
        />
        {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      {open && items.length > 0 && (
        <ul className="absolute z-[1000] left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {items.map((s) => (
            <li key={s.id}>
              <button onClick={() => choose(s)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-sky-500 shrink-0" />
                <span>
                  <span className="font-semibold block">{s.main}</span>
                  {s.secondary && <span className="text-muted-foreground">{s.secondary}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
