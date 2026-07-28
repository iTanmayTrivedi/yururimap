import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { demoSnapshot } from "@/lib/profile";
import type { PostRow } from "@/lib/posts";
import { ArrowLeft, Loader2, Send, ImagePlus, X, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/resolve/$postId")({
  head: () => ({ meta: [{ title: "解決を報告 / Report Resolution" }, { name: "description", content: "Report that a problem is resolved." }] }),
  component: ResolvePage,
});

function ResolvePage() {
  const { postId } = useParams({ from: "/resolve/$postId" });
  const { lang } = useLang();
  const navigate = useNavigate();

  const postQ = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
      if (error) throw error; return data as PostRow | null;
    },
  });

  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const u = URL.createObjectURL(photoFile);
    setPhotoPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photoFile]);

  async function uploadPhoto(file: File): Promise<string> {
    const sid = getSessionId();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `resolution/${sid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("activity-photos").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg",
    });
    if (error) throw error;
    const { data, error: sErr } = await supabase.storage.from("activity-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw sErr;
    return data.signedUrl;
  }

  async function submit() {
    if (!description.trim()) { toast.error(t(lang, "解決内容を入力してください", "Please describe the resolution")); return; }
    if (!photoFile) { toast.error(t(lang, "写真を添付してください", "Please attach a photo")); return; }
    setBusy(true);
    try {
      const photo_url = await uploadPhoto(photoFile);
      const { error } = await supabase.from("resolution_reports").insert({
        related_post_id: postId,
        session_id: getSessionId(),
        description: description.trim().slice(0, 500),
        photo_url,
        status: "pending",
        ...demoSnapshot(),
      });
      if (error) throw error;
      toast.success(t(lang, "承認申請を送信しました！", "Submitted for approval!"));
      navigate({ to: "/map" });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-pink-100 border-2 border-pink-500 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-pink-600">{t(lang, "解決を報告する", "Report Resolution")}</h2>
          <div className="text-[11px] text-muted-foreground">{t(lang, "管理者の承認後に公開されます", "Published after admin approval")}</div>
        </div>
      </div>

      {postQ.data && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
          <div className="text-[10px] font-bold text-orange-700">{t(lang, "元の困りごと", "Related problem")}</div>
          <div className="text-sm font-semibold mt-0.5">{postQ.data.place_label ?? "—"}</div>
          <p className="text-xs mt-1 whitespace-pre-wrap">{postQ.data.description}</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="text-[11px] font-bold text-pink-600">{t(lang, "解決内容（必須）", "Resolution description (required)")}</div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} rows={4}
          placeholder={t(lang, "どのように解決したか教えてください", "How was it resolved?")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="text-[11px] font-bold text-pink-600">{t(lang, "写真（必須・1枚）", "Photo (required, 1)")}</div>
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-border" />
            <button onClick={() => setPhotoFile(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 min-h-[80px] rounded-xl border-2 border-dashed border-pink-300 bg-pink-50 text-pink-700 text-sm cursor-pointer">
            <ImagePlus className="w-5 h-5" />
            {t(lang, "写真を選ぶ", "Choose a photo")}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); }} />
          </label>
        )}
      </div>

      <button onClick={submit} disabled={busy}
        className="w-full min-h-[52px] rounded-2xl bg-pink-500 text-white font-bold shadow-md disabled:opacity-60 inline-flex items-center justify-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {t(lang, "承認申請を送信", "Submit for approval")}
      </button>

      <Link to="/" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "ホームへ戻る", "Back to home")}
      </Link>
    </div>
  );
}
