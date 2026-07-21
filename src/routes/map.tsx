import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { POST_TYPES, type PostRow } from "@/lib/posts";
import { CATEGORIES, CATEGORY_LIST, categoryOf, type CategoryId } from "@/lib/categories";
import { Heart, Loader2, MapPin, X, ExternalLink, CheckCircle2, Flag, ThumbsUp } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "困ったマップ / Problem Map — YururiMap" },
      { name: "description", content: "See local problems by category on the map." },
    ],
  }),
  component: MapPage,
});

type FilterKey = "all" | CategoryId;

type PostRowExt = PostRow & {
  resolved?: boolean;
  category?: string | null;
  subtopic?: string | null;
  thanks_count?: number;
};

function pinColorFor(p: PostRowExt): string {
  const cat = categoryOf(p.category ?? null);
  if (cat) return cat.color;
  return POST_TYPES[p.type].color;
}

function MapPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const postsQ = useQuery({
    queryKey: ["public-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts")
        .select("*").eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as PostRowExt[];
    },
    refetchInterval: 30000,
  });

  const likesQ = useQuery({
    queryKey: ["post-likes-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_likes").select("post_id");
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of data ?? []) {
        const id = (r as { post_id: string }).post_id;
        m.set(id, (m.get(id) ?? 0) + 1);
      }
      return m;
    },
    refetchInterval: 30000,
  });

  const posts = (postsQ.data ?? []).filter((p) => p.lat != null && p.lng != null);
  const visible = filter === "all" ? posts : posts.filter((p) => p.category === filter);
  const selected = useMemo(() => posts.find((p) => p.id === selectedId) ?? null, [selectedId, posts]);
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of posts) if (p.category) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [posts]);

  async function like(postId: string) {
    try {
      const sid = getSessionId();
      const { demoSnapshot } = await import("@/lib/profile");
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, session_id: sid, ...demoSnapshot() });
      if (error) {
        if (error.code === "23505") { toast.info(t(lang, "すでに反応しました", "You already reacted")); return; }
        throw error;
      }
      toast.success(t(lang, "私も困った！", "Me too!"));
      qc.invalidateQueries({ queryKey: ["post-likes-counts"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function thanks(postId: string) {
    try {
      const sid = getSessionId();
      const { demoSnapshot } = await import("@/lib/profile");
      const { error } = await supabase.from("post_thanks").insert({ post_id: postId, session_id: sid, ...demoSnapshot() });
      if (error) {
        if (error.code === "23505") { toast.info(t(lang, "すでにありがとうを送りました", "You already thanked")); return; }
        throw error;
      }
      toast.success(t(lang, "ありがとう！", "Thanks!"));
      qc.invalidateQueries({ queryKey: ["public-posts"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t(lang, "困ったマップ", "Problem Map")}</h2>
        <div className="text-[10px] text-muted-foreground">{t(lang, "ピンをタップして詳細を見る", "Tap a pin for details")}</div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} label={t(lang, "すべて", "All")} sub={String(posts.length)} color="#6B7280" />
        {CATEGORY_LIST.map((c) => (
          <Chip key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
            label={`${c.emoji} ${lang === "ja" ? c.ja : c.en}`}
            sub={String(catCounts[c.id] ?? 0)}
            color={c.color} />
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden border border-border shadow-md bg-card">
        {postsQ.isLoading ? (
          <div className="h-[380px] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <ClientOnly fallback={<div className="h-[380px]" />}>
            <PostMap posts={visible} counts={likesQ.data ?? new Map()} onSelect={setSelectedId} />
          </ClientOnly>
        )}
      </div>

      {selected && (
        <PostCard
          post={selected}
          likeCount={likesQ.data?.get(selected.id) ?? 0}
          onLike={() => like(selected.id)}
          onThanks={() => thanks(selected.id)}
          onClose={() => setSelectedId(null)}
          onReport={() => setReportId(selected.id)}
        />
      )}
      <ReportDialog open={!!reportId} onClose={() => setReportId(null)} target={{ post_id: reportId ?? undefined }} />

      {/* Legend / quick post links */}
      <div className="grid grid-cols-2 gap-2">
        {CATEGORY_LIST.map((c) => (
          <Link key={c.id} to="/post/$category" params={{ category: c.id }}
            className="rounded-xl border p-2 text-center text-[11px] font-semibold shadow-sm"
            style={{ backgroundColor: c.soft, borderColor: `${c.color}55`, color: c.color }}>
            {c.emoji} {lang === "ja" ? c.ja : c.en}
            <div className="text-[9px] font-normal opacity-80">{t(lang, "投稿する", "Post")}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, sub, color }:
  { active: boolean; onClick: () => void; label: string; sub?: string; color: string }) {
  return (
    <button onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
      style={active
        ? { backgroundColor: color, color: "#fff", borderColor: color }
        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
      {label}
      {sub != null && <span className="text-[10px] opacity-80">{sub}</span>}
    </button>
  );
}

function PostMap({ posts, counts, onSelect }:
  { posts: PostRowExt[]; counts: Map<string, number>; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const m = L.map(ref.current, {
      center: [36.5, 138.0], zoom: 5, minZoom: 2, maxZoom: 19, worldCopyJump: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19, minZoom: 2, subdomains: ["a","b","c"], noWrap: false,
    }).addTo(m);
    layerRef.current = L.layerGroup().addTo(m);
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 80);
    return () => { m.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const m = mapRef.current; const layer = layerRef.current;
    if (!m || !layer) return;
    layer.clearLayers();
    posts.forEach((p) => {
      const bg = pinColorFor(p);
      const isResolved = p.resolved === true;
      const count = (counts.get(p.id) ?? 0) + 1;
      const size = 32;
      const label = isResolved ? "♥" : String(count);
      const fontSize = 13;
      const html = `
        <div style="position:relative;width:${size}px;height:${size + 8}px;">
          <div style="position:absolute;top:0;left:50%;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${bg};transform:translateX(-50%) rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,.25);">
            <span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:${fontSize}px;font-family:inherit;line-height:1;">${label}</span>
          </div>
        </div>`;
      const icon = L.divIcon({ className: "post-pin", html, iconSize: [size, size + 8], iconAnchor: [size / 2, size + 8] });
      const marker = L.marker([p.lat!, p.lng!], { icon });
      marker.on("click", () => onSelectRef.current(p.id));
      marker.addTo(layer);
    });
  }, [posts, counts]);

  return <div ref={ref} style={{ height: 380, width: "100%" }} />;
}

function PostCard({ post, likeCount, onLike, onThanks, onClose, onReport }:
  { post: PostRowExt; likeCount: number; onLike: () => void; onThanks: () => void; onClose: () => void; onReport: () => void }) {
  const { lang } = useLang();
  const cat = categoryOf(post.category ?? null);
  const color = cat?.color ?? POST_TYPES[post.type].color;
  const soft = cat?.soft ?? POST_TYPES[post.type].soft;
  const label = cat ? (lang === "ja" ? cat.ja : cat.en)
                    : (lang === "ja" ? POST_TYPES[post.type].ja : POST_TYPES[post.type].en);
  const isResolved = post.resolved === true;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-md space-y-3" style={{ borderColor: `${color}66` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-bold" style={{ color }}>{label}</div>
          <div className="text-sm font-bold truncate">{post.title ?? post.place_label ?? (lang === "ja" ? "投稿" : "Post")}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground p-1"><X className="w-4 h-4" /></button>
      </div>

      {post.photo_url && (
        <img src={post.photo_url} alt="" className="w-full h-40 object-cover rounded-xl border border-border" />
      )}

      {post.place_label && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" /> {post.place_label}
        </div>
      )}

      <p className="rounded-xl px-3 py-2 text-sm whitespace-pre-wrap" style={{ backgroundColor: soft }}>
        {post.description}
      </p>

      {post.official_url && (
        <a href={post.official_url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs underline" style={{ color }}>
          <ExternalLink className="w-3 h-3" /> {post.official_url}
        </a>
      )}

      {!isResolved && (
        <button onClick={onLike}
          className="w-full min-h-[48px] rounded-2xl text-white font-bold shadow-sm inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: color }}>
          <ThumbsUp className="w-4 h-4" />
          {t(lang, "私も困った", "Me too")}
          <span className="ml-1 text-sm font-extrabold">{likeCount}</span>
        </button>
      )}

      {isResolved && (
        <button onClick={onThanks}
          className="w-full min-h-[48px] rounded-2xl text-white font-bold shadow-sm inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: "#EC4899" }}>
          <Heart className="w-4 h-4" />
          {t(lang, "ありがとう！", "Thank you!")}
          <span className="ml-1 text-sm font-extrabold">{post.thanks_count ?? 0}</span>
        </button>
      )}

      <div className="flex gap-2">
        {!isResolved && (
          <Link to="/resolve/$postId" params={{ postId: post.id }}
            className="flex-1 min-h-[40px] rounded-xl bg-pink-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t(lang, "解決を報告する", "Report Resolution")}
          </Link>
        )}
        <button onClick={onReport}
          className="min-h-[40px] px-3 rounded-xl border border-border text-muted-foreground text-xs inline-flex items-center gap-1">
          <Flag className="w-3 h-3" /> {t(lang, "報告", "Report")}
        </button>
      </div>
    </div>
  );
}
