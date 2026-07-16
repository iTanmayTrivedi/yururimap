import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLang, t } from "@/lib/i18n";
import { loadProfile, saveProfile, AGE_GROUPS, GENDERS } from "@/lib/profile";
import { Loader2, MapPin, Home as HomeIcon, User, Users as UsersIcon, Cake, ChevronRight, FileText } from "lucide-react";

export const Route = createFileRoute("/my")({
  head: () => ({
    meta: [
      { title: "マイページ / My Page — YururiMap" },
      { name: "description", content: "Manage your location, home area, age group, gender, and preferences." },
    ],
  }),
  component: MyPage,
});

function MyPage() {
  const { lang } = useLang();
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold inline-flex items-center gap-2">
          <User className="w-5 h-5 text-sky-600" />
          {t(lang, "マイページ", "My Page")}
        </h2>
        <p className="text-xs text-muted-foreground">My Page</p>
      </div>

      <LocationCard />
      <AgeGenderCard />
      <HomeAreaCard />

      <Link to="/terms"
        className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3 active:scale-[0.99]">
        <span className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center">
          <FileText className="w-5 h-5 text-rose-600" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">{t(lang, "利用規約・プライバシーポリシー", "Terms & Privacy Policy")}</div>
          <div className="text-[10px] text-muted-foreground">{t(lang, "運営からの約束ごとを読む", "Read our terms and privacy policy")}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </div>
  );
}

function LocationCard() {
  const { lang } = useLang();
  const [locOn, setLocOn] = useState(true);
  useEffect(() => { setLocOn(localStorage.getItem("niko_loc_on") !== "off"); }, []);
  function set(on: boolean) {
    setLocOn(on);
    localStorage.setItem("niko_loc_on", on ? "on" : "off");
    toast.success(on ? t(lang, "位置情報 ON", "Location ON") : t(lang, "位置情報 OFF", "Location OFF"));
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4" style={{ color: locOn ? "#059669" : "#9CA3AF" }} />
        <h3 className="text-sm font-bold">{t(lang, "位置情報", "Location")}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => set(true)}
          className="min-h-[44px] rounded-xl font-bold text-sm"
          style={locOn
            ? { backgroundColor: "#10B981", color: "#fff" }
            : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>ON</button>
        <button onClick={() => set(false)}
          className="min-h-[44px] rounded-xl font-bold text-sm"
          style={!locOn
            ? { backgroundColor: "#6B7280", color: "#fff" }
            : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>OFF</button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        {t(lang, "気持ちや投稿の位置を保存します（許可した時だけ）", "Saves the location of your posts (only when allowed)")}
      </p>
    </div>
  );
}

function AgeGenderCard() {
  const { lang } = useLang();
  const [ageGroup, setAgeGroup] = useState<string | undefined>();
  const [gender, setGender] = useState<string | undefined>();

  useEffect(() => {
    const p = loadProfile();
    setAgeGroup(p.ageGroup); setGender(p.gender);
  }, []);

  function pickAge(id: string) {
    const next = ageGroup === id ? undefined : id;
    setAgeGroup(next);
    saveProfile({ ...loadProfile(), ageGroup: next });
  }
  function pickGender(id: string) {
    const next = gender === id ? undefined : id;
    setGender(next);
    saveProfile({ ...loadProfile(), gender: next });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Cake className="w-4 h-4 text-pink-600" />
          <h3 className="text-sm font-bold">{t(lang, "年代（任意）", "Age group (optional)")}</h3>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {AGE_GROUPS.map((a) => (
            <button key={a.id} onClick={() => pickAge(a.id)}
              className="min-h-[40px] rounded-xl border text-xs font-semibold"
              style={ageGroup === a.id
                ? { backgroundColor: "#EC4899", color: "#fff", borderColor: "#EC4899" }
                : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
              {lang === "ja" ? a.ja : a.en}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <UsersIcon className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold">{t(lang, "性別（任意）", "Gender (optional)")}</h3>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {GENDERS.map((g) => (
            <button key={g.id} onClick={() => pickGender(g.id)}
              className="min-h-[40px] rounded-xl border text-[11px] font-semibold px-1"
              style={gender === g.id
                ? { backgroundColor: "#A855F7", color: "#fff", borderColor: "#A855F7" }
                : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
              {lang === "ja" ? g.ja : g.en}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeAreaCard() {
  const { lang } = useLang();
  const [homeArea, setHomeArea] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setHomeArea(p.homeArea ?? "");
    setHomeLat(p.homeLat ?? null);
    setHomeLng(p.homeLng ?? null);
  }, []);

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

  async function save() {
    setSaving(true);
    try {
      const text = homeArea.trim().slice(0, 60);
      let lat = homeLat; let lng = homeLng;
      if (text && (lat == null || lng == null)) {
        const hit = await geocode(text);
        if (hit) { lat = hit.lat; lng = hit.lng; setHomeLat(lat); setHomeLng(lng); }
        else toast.info(t(lang, "地名の位置が見つかりませんでした。「現在地を使う」をお試しください。", "Couldn't locate that place. Try 'Use current'."));
      }
      saveProfile({
        ...loadProfile(),
        homeArea: text || undefined,
        homeLat: lat ?? undefined, homeLng: lng ?? undefined,
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
        setHomeLat(p.coords.latitude); setHomeLng(p.coords.longitude);
        saveProfile({ ...loadProfile(), homeArea: homeArea.trim() || undefined, homeLat: p.coords.latitude, homeLng: p.coords.longitude });
        setBusy(false);
        toast.success(t(lang, "現在地を居住地域に設定しました", "Saved current location as home"));
      },
      () => { setBusy(false); toast.error(t(lang, "位置情報を取得できません", "Could not get location")); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <HomeIcon className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-bold">{t(lang, "居住地域（任意）", "Home area (optional)")}</h3>
      </div>
      <input
        value={homeArea}
        onChange={(e) => { setHomeArea(e.target.value.slice(0, 60)); setHomeLat(null); setHomeLng(null); }}
        placeholder={t(lang, "例：東京都 中野区", "e.g. Nakano, Tokyo")}
        className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex-1 min-h-[42px] rounded-xl bg-sky-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1 disabled:opacity-60">
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {t(lang, "保存", "Save")}
        </button>
        <button onClick={useCurrent} disabled={busy}
          className="flex-1 min-h-[42px] rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          {t(lang, "現在地を使う", "Use current")}
        </button>
      </div>
      {homeLat != null && homeLng != null ? (
        <div className="text-[10px] text-emerald-700">
          ✓ {t(lang, "位置を保存済み", "Location saved")}: {homeLat.toFixed(4)}, {homeLng.toFixed(4)}
        </div>
      ) : homeArea ? (
        <div className="text-[10px] text-amber-700">
          ⚠ {t(lang, "「保存」を押して位置を検索します", "Press 'Save' to look up the location")}
        </div>
      ) : null}
    </div>
  );
}
