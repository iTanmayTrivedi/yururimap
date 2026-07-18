import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { POST_TYPES, POST_TYPE_LIST, type PostRow, type PostType } from "@/lib/posts";
import { Heart, Loader2, MapPin, X, ExternalLink, CheckCircle2, Flag } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "みんなの投稿マップ / Public Map — YururiMap" },
      { name: "description", content: "Everyone's Happy posts, Requests, and Promoted activities on one map." },
    ],
  }),
  component: MapPage,
});

type FilterKey = "all" | PostType;

function MapPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const postsQ = useQuery({
    queryKey: ["public-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as PostRow[];
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
  const visible = filter === "all" ? posts : posts.filter((p) => p.type === filter);
  const selected = useMemo(() => posts.find((p) => p.id === selectedId) ?? null, [selectedId, posts]);
  const counts = {
    happy: posts.filter((p) => p.type === "happy").length,
    request: posts.filter((p) => p.type === "request").length,
    promote: posts.filter((p) => p.type === "promote").length,
  };

  async function like(postId: string) {
    try {
      const sid = getSessionId();
      const { demoSnapshot } = await import("@/lib/profile");
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, session_id: sid, ...demoSnapshot() });
      if (error) {
        if (error.code === "23505") { toast.info(t(lang, "すでに反応しました", "You already reacted")); return; }
        throw error;
      }
      toast.success(t(lang, "ありがとう！", "Thanks!"));
      qc.invalidateQueries({ queryKey: ["post-likes-counts"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t(lang, "みんなの投稿マップ", "Public Map")}</h2>
        <div className="text-[10px] text-muted-foreground">{t(lang, "ピンをタップして内容を確認", "Tap a pin for details")}</div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} label={t(lang, "すべて", "All")} sub={String(posts.length)} color="#6B7280" />
        {POST_TYPE_LIST.map((p) => (
          <Chip key={p.type}
            active={filter === p.type}
            onClick={() => setFilter(p.type)}
            label={`${p.emoji} ${lang === "ja" ? p.ja : p.en}`}
            sub={String(counts[p.type])}
            color={p.color} />
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
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2">
        {POST_TYPE_LIST.map((p) => (
          <Link key={p.type} to={`/post/${p.type}` as "/post/happy"}
            className="rounded-xl border p-2 text-center text-[11px] font-semibold shadow-sm"
            style={{ backgroundColor: p.soft, borderColor: `${p.color}55`, color: p.color }}>
            {p.emoji} {lang === "ja" ? p.ja : p.en}
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
  { posts: PostRow[]; counts: Map<string, number>; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    // Default view: Japan; can zoom out to world.
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
      const meta = POST_TYPES[p.type];
      const showCount = p.type === "request";
      const count = (counts.get(p.id) ?? 0) + (showCount ? 1 : 0);
      const size = showCount ? Math.min(46, 26 + Math.log2(Math.max(1, count)) * 6) : 30;
      const label = showCount ? String(count) : meta.emoji;
      const fontSize = showCount ? Math.max(11, size * 0.42) : 16;
      const html = `
        <div style="position:relative;width:${size}px;height:${size + 8}px;">
          <div style="position:absolute;top:0;left:50%;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${meta.color};transform:translateX(-50%) rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,.25);">
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

function PostCard({ post, likeCount, onLike, onClose }:
  { post: PostRow; likeCount: number; onLike: () => void; onClose: () => void }) {
  const { lang } = useLang();
  const meta = POST_TYPES[post.type];
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-md space-y-3"
      style={{ borderColor: `${meta.color}66` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: meta.soft, border: `2px solid ${meta.color}` }}>
            {meta.emoji}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold" style={{ color: meta.color }}>
              {lang === "ja" ? meta.ja : meta.en}
            </div>
            <div className="text-sm font-bold truncate">{post.title ?? post.place_label ?? (lang === "ja" ? "投稿" : "Post")}</div>
          </div>
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

      <div>
        <div className="text-[10px] font-semibold mb-1" style={{ color: meta.color }}>
          {post.type === "request" ? t(lang, "リクエスト内容", "Request")
            : post.type === "promote" ? t(lang, "活動内容", "Activity")
            : t(lang, "内容", "Content")}
        </div>
        <p className="rounded-xl px-3 py-2 text-sm whitespace-pre-wrap" style={{ backgroundColor: meta.soft }}>
          {post.description}
        </p>
      </div>

      {post.why_needed && (
        <div>
          <div className="text-[10px] font-semibold mb-1" style={{ color: meta.color }}>
            {t(lang, "なぜリクエスト？", "Why?")}
          </div>
          <p className="rounded-xl px-3 py-2 text-sm whitespace-pre-wrap" style={{ backgroundColor: meta.soft }}>
            {post.why_needed}
          </p>
        </div>
      )}

      {post.when_text && (
        <div className="text-xs"><span className="font-semibold">{t(lang, "いつ", "When")}: </span>{post.when_text}</div>
      )}
      {post.official_url && (
        <a href={post.official_url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-emerald-700 underline">
          <ExternalLink className="w-3 h-3" /> {post.official_url}
        </a>
      )}

      <button onClick={onLike}
        className="w-full min-h-[48px] rounded-2xl text-white font-bold shadow-sm inline-flex items-center justify-center gap-2"
        style={{ backgroundColor: meta.color }}>
        <Heart className="w-4 h-4" />
        {lang === "ja" ? meta.actionJa : meta.actionEn}
        <span className="ml-1 text-sm font-extrabold">{likeCount}{lang === "ja" ? "人" : ""}</span>
      </button>
    </div>
  );
}
