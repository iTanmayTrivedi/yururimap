/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { demoSnapshot, loadProfile } from "@/lib/profile";
import { PostsGoogleMap, type MapItem } from "@/components/PostsGoogleMap";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { ReportDialog } from "@/components/ReportDialog";
import { PLACE_RELATIONS, type PostRow } from "@/lib/posts";
import { activityCategoryOf, scopeGroup, type ActivityRow } from "@/lib/activities";
import { DEFAULT_CENTER } from "@/lib/gmaps";
import { useIsAdmin, ModerationBar, AdminEditDialog, type EditField, type ModTable } from "@/lib/admin";

import {
  Flag, Sparkles, Heart, MapPin, Crosshair, X, Loader2, CheckCircle2, ExternalLink, Plus, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "みんなの困ったMap — 地域の困りごとを地図で共有" },
      { name: "description", content: "地域の「困った」を地図に投稿し、みんなで共感して解決につなげるコミュニティマップ。活動の告知もできます。" },
      { property: "og:title", content: "みんなの困ったMap — 地域の困りごとを地図で共有" },
      { property: "og:description", content: "地域の「困った」を地図に投稿し、みんなで共感して解決につなげるコミュニティマップ。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

type Tab = "local" | "national" | "online";

function HomePage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("local");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ post_id?: string; activity_id?: string } | null>(null);
  const [limit, setLimit] = useState(10);
  const { isAdmin } = useIsAdmin();
  const [editTarget, setEditTarget] = useState<{ table: ModTable; id: string; fields: EditField[] } | null>(null);
  const invalidate = [["home-posts"], ["home-activities"]];

  const postsQ = useQuery({
    queryKey: ["home-posts", isAdmin],
    queryFn: async () => {
      let query = supabase.from("posts").select("*");
      if (!isAdmin) query = query.eq("hidden", false);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as PostRow[];
    },
  });


  const resolvedQ = useQuery({
    queryKey: ["home-resolved"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resolution_reports")
        .select("related_post_id").eq("status", "approved");
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.related_post_id as string));
    },
  });

  const likesQ = useQuery({
    queryKey: ["home-post-likes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_likes").select("post_id");
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of data ?? []) {
        const id = (r as any).post_id as string;
        m.set(id, (m.get(id) ?? 0) + 1);
      }
      return m;
    },
  });

  const actsQ = useQuery({
    queryKey: ["home-activities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities")
        .select("*").eq("status", "approved").eq("hidden", false)
        .order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
  });

  const posts = postsQ.data ?? [];
  const resolved = resolvedQ.data ?? new Set<string>();
  const likes = likesQ.data ?? new Map<string, number>();
  const acts = actsQ.data ?? [];

  const shownPosts = tab === "local" ? posts : [];
  const shownActs = acts.filter((a) => scopeGroup(a.scope) === tab);

  const mapItems: MapItem[] = useMemo(() => {
    const out: MapItem[] = [];
    for (const p of shownPosts) {
      if (p.lat == null || p.lng == null) continue;
      const isResolved = resolved.has(p.id);
      out.push({
        id: `p:${p.id}`, lat: p.lat, lng: p.lng,
        kind: isResolved ? "resolved" : "problem",
        count: isResolved ? (p.thanks_count ?? 0) : (likes.get(p.id) ?? 0),
      });
    }
    for (const a of shownActs) {
      if (a.lat == null || a.lng == null) continue;
      out.push({ id: `a:${a.id}`, lat: a.lat, lng: a.lng, kind: "activity", count: 0 });
    }
    return out;
  }, [shownPosts, shownActs, resolved, likes]);

  const homeCenter = useMemo(() => {
    const p = loadProfile();
    if (p.homeLat != null && p.homeLng != null) return { lat: p.homeLat, lng: p.homeLng };
    return DEFAULT_CENTER;
  }, []);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error(t(lang, "位置情報を取得できません", "Could not get location")),
    );
  }

  async function meToo(postId: string) {
    try {
      const { error } = await supabase.from("post_likes").insert({
        post_id: postId, session_id: getSessionId(), ...demoSnapshot(),
      } as any);
      if (error) {
        if (error.code === "23505") { toast.info(t(lang, "すでに共感しています", "You already reacted")); return; }
        throw error;
      }
      toast.success(t(lang, "「私も困ってる」を送りました", "Sent!"));
      qc.invalidateQueries({ queryKey: ["home-post-likes"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function thanks(postId: string) {
    try {
      const { error } = await supabase.from("post_thanks").insert({
        post_id: postId, session_id: getSessionId(),
      } as any);
      if (error) {
        if (error.code === "23505") { toast.info(t(lang, "すでにありがとうを送りました", "Already thanked")); return; }
        throw error;
      }
      toast.success(t(lang, "ありがとうを送りました！", "Thank you sent!"));
      qc.invalidateQueries({ queryKey: ["home-posts"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  const listPosts = shownPosts.slice(0, limit);
  const selPost = selected?.startsWith("p:") ? posts.find((p) => p.id === selected.slice(2)) ?? null : null;
  const selAct = selected?.startsWith("a:") ? acts.find((a) => a.id === selected.slice(2)) ?? null : null;
  const loading = postsQ.isLoading || actsQ.isLoading;

  return (
    <div className="space-y-4">
      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/post"
          className="rounded-2xl px-3 py-4 text-white font-extrabold text-sm flex flex-col items-center gap-1.5 shadow-md active:scale-[0.98]"
          style={{ backgroundColor: "#38BDF8" }}>
          <Flag className="w-6 h-6" />
          {t(lang, "困ったを投稿", "Post a problem")}
        </Link>
        <Link to="/activities/new"
          className="rounded-2xl px-3 py-4 text-white font-extrabold text-sm flex flex-col items-center gap-1.5 shadow-md active:scale-[0.98]"
          style={{ backgroundColor: "#10B981" }}>
          <Sparkles className="w-6 h-6" />
          {t(lang, "活動を投稿", "Post an activity")}
        </Link>
      </div>

      {/* Scope tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-muted">
        {([
          { id: "local" as Tab, ja: "地域", en: "Local" },
          { id: "national" as Tab, ja: "全国", en: "Nationwide" },
          { id: "online" as Tab, ja: "オンライン", en: "Online" },
        ]).map((x) => (
          <button key={x.id} onClick={() => { setTab(x.id); setLimit(10); }}
            className={`min-h-[38px] rounded-xl text-xs font-bold transition-colors ${
              tab === x.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {lang === "ja" ? x.ja : x.en}
          </button>
        ))}
        <Link to="/shelters"
          className="min-h-[38px] rounded-xl text-xs font-bold text-muted-foreground flex items-center justify-center">
          {lang === "ja" ? "災害・避難所" : "Shelters"}
        </Link>
      </div>


      {/* Search + map */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <PlaceSearchInput className="flex-1"
            onPick={(lat, lng) => setCenter({ lat, lng })} />
          <button onClick={useCurrentLocation} aria-label={t(lang, "現在地", "Current location")}
            className="w-11 rounded-xl border border-input bg-card inline-flex items-center justify-center text-sky-500">
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border">
          <PostsGoogleMap items={mapItems} center={center ?? homeCenter} height={280}
            onSelect={(id) => setSelected(id)} />
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <LegendDot color="#38BDF8" label={t(lang, "困った", "Problem")} />
          <LegendDot color="#EC4899" label={t(lang, "解決済み", "Resolved")} heart />
          <LegendDot color="#10B981" label={t(lang, "活動", "Activity")} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {tab === "local" && listPosts.map((p) => {
            const isResolved = resolved.has(p.id);
            const count = isResolved ? (p.thanks_count ?? 0) : (likes.get(p.id) ?? 0);
            return (
              <button key={p.id} onClick={() => setSelected(`p:${p.id}`)}
                className="w-full text-left rounded-2xl border bg-card overflow-hidden shadow-sm active:scale-[0.995]"
                style={{ borderColor: isResolved ? "#EC489955" : "#38BDF855" }}>
                <div className="flex gap-3 p-3">
                  {p.photo_url && <img src={p.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold" style={{ color: isResolved ? "#EC4899" : "#0284C7" }}>
                      {isResolved ? t(lang, "解決済み", "Resolved") : t(lang, "困った", "Problem")}
                    </div>
                    <p className="text-sm font-semibold line-clamp-2">{p.description}</p>
                    {p.place_label && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" /> <span className="truncate">{p.place_label}</span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 self-center text-center">
                    <Heart className="w-4 h-4 mx-auto" style={{ color: isResolved ? "#EC4899" : "#38BDF8" }} />
                    <div className="text-xs font-extrabold">{count}</div>
                  </div>
                </div>
              </button>
            );
          })}

          {shownActs.slice(0, limit).map((a) => {
            const meta = activityCategoryOf(a.category);
            return (
              <button key={a.id} onClick={() => setSelected(`a:${a.id}`)}
                className="w-full text-left rounded-2xl border bg-card overflow-hidden shadow-sm"
                style={{ borderColor: `${meta.color}55` }}>
                <div className="flex gap-3 p-3">
                  {a.photo_url && <img src={a.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold" style={{ color: meta.color }}>
                      {t(lang, "活動", "Activity")} · {lang === "ja" ? meta.ja : meta.en}
                    </div>
                    <p className="text-sm font-bold truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                  </div>
                </div>
              </button>
            );
          })}

          {tab === "local" && listPosts.length === 0 && shownActs.length === 0 && (
            <EmptyState lang={lang} />
          )}
          {tab !== "local" && shownActs.length === 0 && <EmptyState lang={lang} />}

          {(listPosts.length < shownPosts.length || shownActs.length > limit) && (
            <button onClick={() => setLimit((n) => n + 10)}
              className="w-full min-h-[44px] rounded-2xl border border-border text-sm font-bold text-muted-foreground inline-flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> {t(lang, "もっと見る", "Show more")}
            </button>
          )}
        </div>
      )}

      {/* Detail sheet */}
      {(selPost || selAct) && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-[430px] bg-card rounded-t-3xl p-4 space-y-3 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="text-sm font-extrabold">
                {selPost
                  ? (resolved.has(selPost.id) ? t(lang, "解決済み", "Resolved") : t(lang, "困った", "Problem"))
                  : t(lang, "活動", "Activity")}
              </div>
              <button onClick={() => setSelected(null)} aria-label="close" className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selPost && (
              <>
                {selPost.photo_url && <img src={selPost.photo_url} alt="" className="w-full h-44 object-cover rounded-xl" />}
                {selPost.place_label && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {selPost.place_label}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{selPost.description}</p>
                {selPost.place_relation && (
                  <div className="text-[11px] text-muted-foreground">
                    {t(lang, "この場所との関係", "Relationship")}:{" "}
                    {PLACE_RELATIONS.find((r) => r.id === selPost.place_relation)?.[lang === "ja" ? "ja" : "en"]}
                  </div>
                )}
                {resolved.has(selPost.id) ? (
                  <button onClick={() => thanks(selPost.id)}
                    className="w-full min-h-[48px] rounded-2xl bg-pink-500 text-white font-bold inline-flex items-center justify-center gap-2">
                    <Heart className="w-4 h-4" /> {t(lang, "ありがとう", "Thank you")} {selPost.thanks_count ?? 0}
                  </button>
                ) : (
                  <button onClick={() => meToo(selPost.id)}
                    className="w-full min-h-[48px] rounded-2xl text-white font-bold inline-flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#38BDF8" }}>
                    <Heart className="w-4 h-4" /> {t(lang, "私も困ってる", "I have this problem too")} {likes.get(selPost.id) ?? 0}
                  </button>
                )}
                <div className="flex gap-2">
                  <Link to="/resolve/$postId" params={{ postId: selPost.id }}
                    className="flex-1 min-h-[42px] rounded-xl border border-border text-xs font-bold inline-flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t(lang, "解決を報告", "Report resolved")}
                  </Link>
                  <button onClick={() => setReportTarget({ post_id: selPost.id })}
                    className="min-h-[42px] px-3 rounded-xl border border-border text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5" /> {t(lang, "通報", "Report")}
                  </button>
                </div>
              </>
            )}

            {selAct && (
              <>
                {selAct.photo_url && <img src={selAct.photo_url} alt="" className="w-full h-44 object-cover rounded-xl" />}
                <div className="text-base font-extrabold">{selAct.title}</div>
                {selAct.place_label && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {selAct.place_label}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{selAct.description}</p>
                {[
                  { url: selAct.apply_url, ja: "申込みはこちら", en: "Apply" },
                  { url: selAct.homepage_url ?? selAct.official_url, ja: "ホームページ・SNS", en: "Website / SNS" },
                  { url: selAct.donation_url, ja: "寄付する", en: "Donate" },
                ].filter((l) => !!l.url).map((l) => (
                  <a key={l.en} href={l.url as string} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-700 underline break-all">
                    <ExternalLink className="w-3 h-3" /> {lang === "ja" ? l.ja : l.en}
                  </a>
                ))}
                <button onClick={() => setReportTarget({ activity_id: selAct.id })}
                  className="w-full min-h-[42px] rounded-xl border border-border text-xs text-muted-foreground inline-flex items-center justify-center gap-1">
                  <Flag className="w-3.5 h-3.5" /> {t(lang, "通報", "Report")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ReportDialog open={!!reportTarget} onClose={() => setReportTarget(null)} target={reportTarget ?? {}} />
    </div>
  );
}

function EmptyState({ lang }: { lang: "ja" | "en" }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      {t(lang, "まだ投稿がありません。最初の投稿をしてみましょう！", "No posts yet — be the first to share!")}
    </div>
  );
}

function LegendDot({ color, label, heart }: { color: string; label: string; heart?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {heart
        ? <Heart className="w-3 h-3" style={{ color, fill: color }} />
        : <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </span>
  );
}
