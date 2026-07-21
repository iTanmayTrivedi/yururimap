import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLang, t } from "@/lib/i18n";
import { loadProfile, saveProfile, AGE_GROUPS, GENDERS, COUNTRY_REGIONS } from "@/lib/profile";
import { Loader2, MapPin, Home as HomeIcon, User, Users as UsersIcon, Cake, ChevronRight, FileText, Globe, Search, Save } from "lucide-react";

export const Route = createFileRoute("/my")({
  head: () => ({
    meta: [
      { title: "マイページ / My Page — YururiMap" },
      { name: "description", content: "Manage your location, home area, age group, gender, and country/region." },
    ],
  }),
  component: MyPage,
});

function MyPage() {
  const { lang } = useLang();

  // All state lives here so the sticky Save button can persist everything at once.
  const [locOn, setLocOn] = useState(true);
  const [ageGroup, setAgeGroup] = useState<string | undefined>();
  const [gender, setGender] = useState<string | undefined>();
  const [countryRegion, setCountryRegion] = useState("");
  const [countryQ, setCountryQ] = useState("");
  const [homeArea, setHomeArea] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setLocOn(localStorage.getItem("niko_loc_on") !== "off");
    setAgeGroup(p.ageGroup);
    setGender(p.gender);
    setCountryRegion(p.countryRegion ?? "");
    setHomeArea(p.homeArea ?? "");
    setHomeLat(p.homeLat ?? null);
    setHomeLng(p.homeLng ?? null);
  }, []);

  const countryHits = useMemo(() => {
    const q = countryQ.trim().toLowerCase();
    if (!q) return [];
    return COUNTRY_REGIONS.filter((r) =>
      r.ja.toLowerCase().includes(q) || r.en.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [countryQ]);

  async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=${lang}&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) return null;
      const data = (await res.json()) as { lat: string; lon: string }[];
      const first = data?.[0];
      if (!first) return null;
      const lat = parseFloat(first.lat); const lng = parseFloat(first.lon);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    } catch { return null; }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const homeText = homeArea.trim().slice(0, 60);
      let lat = homeLat; let lng = homeLng;
      if (homeText && (lat == null || lng == null)) {
        const hit = await geocode(homeText);
        if (hit) { lat = hit.lat; lng = hit.lng; setHomeLat(lat); setHomeLng(lng); }
      }
      localStorage.setItem("niko_loc_on", locOn ? "on" : "off");
      saveProfile({
        ...loadProfile(),
        ageGroup, gender,
        countryRegion: countryRegion.trim() || undefined,
        homeArea: homeText || undefined,
        homeLat: lat ?? undefined,
        homeLng: lng ?? undefined,
      });
      toast.success(t(lang, "保存しました", "Saved"));
    } finally { setSaving(false); }
  }

  function useCurrent() {
    if (!("geolocation" in navigator)) {
      toast.error(t(lang, "位置情報が使えません", "Geolocation unavailable")); return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHomeLat(p.coords.latitude); setHomeLng(p.coords.longitude); setBusy(false);
        toast.success(t(lang, "現在地を取得しました（保存を押してください）", "Got current location — press Save"));
      },
      () => { setBusy(false); toast.error(t(lang, "位置情報を取得できません", "Could not get location")); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="text-center">
        <h2 className="text-xl font-bold inline-flex items-center gap-2">
          <User className="w-5 h-5 text-sky-600" />
          {t(lang, "マイページ", "My Page")}
        </h2>
        <p className="text-xs text-muted-foreground">My Page</p>
      </div>

      {/* Location ON/OFF */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4" style={{ color: locOn ? "#059669" : "#9CA3AF" }} />
          <h3 className="text-sm font-bold">{t(lang, "位置情報", "Location")}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setLocOn(true)}
            className="min-h-[44px] rounded-xl font-bold text-sm"
            style={locOn ? { backgroundColor: "#10B981", color: "#fff" } : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>ON</button>
          <button onClick={() => setLocOn(false)}
            className="min-h-[44px] rounded-xl font-bold text-sm"
            style={!locOn ? { backgroundColor: "#6B7280", color: "#fff" } : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>OFF</button>
        </div>
      </div>

      {/* Age grid */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Cake className="w-4 h-4 text-pink-600" />
          <h3 className="text-sm font-bold">{t(lang, "年齢（任意）", "Age (optional)")}</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {AGE_GROUPS.map((a) => (
            <button key={a.id} onClick={() => setAgeGroup((c) => c === a.id ? undefined : a.id)}
              className="min-h-[72px] rounded-xl border text-[10px] font-semibold flex flex-col items-center justify-center gap-1 px-1"
              style={ageGroup === a.id
                ? { backgroundColor: "#EC4899", color: "#fff", borderColor: "#EC4899" }
                : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
              <span className="text-2xl leading-none">{a.emoji}</span>
              <span className="leading-tight text-center">{lang === "ja" ? a.ja : a.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <UsersIcon className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold">{t(lang, "性別（任意）", "Gender (optional)")}</h3>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {GENDERS.map((g) => (
            <button key={g.id} onClick={() => setGender((c) => c === g.id ? undefined : g.id)}
              className="min-h-[44px] rounded-xl border text-[10px] font-semibold px-1"
              style={gender === g.id
                ? { backgroundColor: "#A855F7", color: "#fff", borderColor: "#A855F7" }
                : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
              {lang === "ja" ? g.ja : g.en}
            </button>
          ))}
        </div>
      </div>

      {/* Country / Region search */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold">{t(lang, "普段住んでいる国・地域（任意）", "Country / Region (optional)")}</h3>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={countryQ || countryRegion}
              onChange={(e) => { setCountryQ(e.target.value); setCountryRegion(e.target.value); }}
              placeholder={t(lang, "地域名で検索  例：東京都 千代田区", "Search country/region")}
              className="w-full bg-transparent text-sm outline-none" />
          </div>
          {countryQ && countryHits.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-card shadow-lg">
              {countryHits.map((h) => (
                <li key={h.ja}>
                  <button type="button" onClick={() => { setCountryRegion(lang === "ja" ? h.ja : h.en); setCountryQ(""); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted">
                    {lang === "ja" ? h.ja : h.en}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Home area with current-location */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <HomeIcon className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold">{t(lang, "居住地域（任意）", "Home area (optional)")}</h3>
        </div>
        <input value={homeArea}
          onChange={(e) => { setHomeArea(e.target.value.slice(0, 60)); setHomeLat(null); setHomeLng(null); }}
          placeholder={t(lang, "例：東京都 中野区", "e.g. Nakano, Tokyo")}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
        <button onClick={useCurrent} disabled={busy}
          className="w-full min-h-[42px] rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          {t(lang, "現在地を使う", "Use current location")}
        </button>
        {homeLat != null && homeLng != null && (
          <div className="text-[10px] text-emerald-700">
            ✓ {t(lang, "位置を記録済み", "Location captured")}: {homeLat.toFixed(4)}, {homeLng.toFixed(4)}
          </div>
        )}
      </div>

      <Link to="/terms"
        className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3 active:scale-[0.99]">
        <span className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center">
          <FileText className="w-5 h-5 text-rose-600" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">{t(lang, "利用規約・プライバシーポリシー", "Terms & Privacy Policy")}</div>
          <div className="text-[10px] text-muted-foreground">{t(lang, "運営からの約束ごとを読む", "Read our terms")}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      {/* Sticky save */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 z-40">
        <button onClick={saveAll} disabled={saving}
          className="w-full min-h-[52px] rounded-2xl bg-sky-500 text-white font-extrabold shadow-lg inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t(lang, "保存する", "Save")}
        </button>
      </div>
    </div>
  );
}
