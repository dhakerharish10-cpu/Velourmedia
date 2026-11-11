import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Upload, X, Loader2, ImageIcon, Video, DollarSign, Check, Eye } from 'lucide-react';
import { KycVerification } from './KycVerification';
import { findRestrictedKeyword } from '../lib/content-rules';

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function makeTinyPreview(file: File, type: 'image' | 'video'): Promise<Blob | null> {
  const MAX = 96;
  const objectUrl = URL.createObjectURL(file);
  try {
    let source: CanvasImageSource;
    let w = 0;
    let h = 0;
    if (type === 'image') {
      const img = new Image();
      await withTimeout(new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('image load failed'));
        img.src = objectUrl;
      }), 8000);
      source = img; w = img.naturalWidth; h = img.naturalHeight;
    } else {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = objectUrl;
      await withTimeout(new Promise<void>((res, rej) => {
        video.onloadeddata = () => res();
        video.onerror = () => rej(new Error('video load failed'));
      }), 8000);
      await withTimeout(new Promise<void>((res) => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
        res();
      }), 5000);
      source = video; w = video.videoWidth; h = video.videoHeight;
    }
    if (!w || !h) return null;
    const scale = Math.min(1, MAX / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.5));
  } catch (e) {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function UploadForm({ onDone }: { onDone?: () => void }) {
  const { user, activeProfileId, profiles, addToast, refreshMyContent, refreshFeed } = useStore();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [blurPercent, setBlurPercent] = useState(60);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview));
    setMediaFiles([]);
    setTitle('');
    setDescription('');
    setPrice('');
    setBlurPercent(60);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [mediaFiles]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: MediaFile[] = [];
    const errors: string[] = [];
    Array.from(fileList).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        errors.push(`${file.name}: not a valid image or video.`);
        return;
      }
      if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported format.`);
        return;
      }
      if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported video format.`);
        return;
      }
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      if (file.size > maxSize) {
        errors.push(`${file.name} is too large.`);
        return;
      }
      newFiles.push({ file, preview: URL.createObjectURL(file), type: isImage ? 'image' : 'video' });
    });
    errors.forEach((msg) => addToast(msg, 'error'));
    if (newFiles.length > 0) setMediaFiles((prev) => [...prev, ...newFiles]);
  }, [addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || mediaFiles.length === 0) return;

    // Strict adult content restriction check
    if (findRestrictedKeyword(title, description)) {
      addToast('Adult content on this site is restricted', 'error');
      return;
    }

    const priceNum = parseFloat(price || '0');
    if (isNaN(priceNum) || priceNum < 0) {
      addToast('Please enter a valid price.', 'error');
      return;
    }
    if (!title.trim()) {
      addToast('Please enter a title.', 'error');
      return;
    }

    setUploading(true);
    const uploaded: { bucket: string; path: string }[] = [];
    let createdContentId: string | null = null;

    try {
      const creatorId = activeProfileId || profiles.find((p) => p.is_primary)?.id || profiles[0]?.id || user.id;
      const uploadedUrls: { url: string; type: 'image' | 'video' }[] = [];
      const isPaid = priceNum > 0;
      const mediaBucket = isPaid ? 'paid-media' : 'creator-media';

      for (const media of mediaFiles) {
        const fileExt = media.file.name.split('.').pop() || (media.type === 'image' ? 'jpg' : 'mp4');
        const fileName = `${creatorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(mediaBucket)
          .upload(fileName, media.file, { contentType: media.file.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);

        uploaded.push({ bucket: mediaBucket, path: fileName });
        if (isPaid) {
          uploadedUrls.push({ url: fileName, type: media.type });
        } else {
          const { data: urlData } = supabase.storage.from('creator-media').getPublicUrl(fileName);
          uploadedUrls.push({ url: urlData.publicUrl, type: media.type });
        }
      }

      const firstMedia = uploadedUrls[0];
      let thumbnailUrl: string | null = !isPaid && firstMedia.type === 'image' ? firstMedia.url : null;
      const previewUrls: (string | null)[] = [];

      if (isPaid) {
        for (const m of mediaFiles) {
          let previewUrl: string | null = null;
          const blob = await makeTinyPreview(m.file, m.type);
          if (blob) {
            const thumbPath = `${creatorId}/thumbs/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
            const { error: thumbErr } = await supabase.storage.from('creator-media').upload(thumbPath, blob, { contentType: 'image/jpeg' });
            if (!thumbErr) {
              uploaded.push({ bucket: 'creator-media', path: thumbPath });
              previewUrl = supabase.storage.from('creator-media').getPublicUrl(thumbPath).data.publicUrl;
            }
          }
          previewUrls.push(previewUrl);
        }
        thumbnailUrl = previewUrls.find((u) => !!u) ?? null;
      }

      const { data: contentData, error: insertError } = await supabase
        .from('content')
        .insert({
          creator_id: creatorId,
          title: title.trim(),
          description: description.trim() || null,
          media_url: firstMedia.url,
          media_type: firstMedia.type,
          thumbnail_url: thumbnailUrl,
          price: priceNum,
          is_published: true,
          media_count: uploadedUrls.length,
          blur_level: blurPercent <= 33 ? 'low' : blurPercent >= 80 ? 'hard' : 'medium',
          blur_percent: blurPercent,
          is_adult: false,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      createdContentId = contentData.id;

      if (uploadedUrls.length > 1) {
        const mediaRecords = uploadedUrls.map((m, i) => ({
          content_id: createdContentId,
          media_url: m.url,
          media_type: m.type,
          display_order: i,
          preview_url: isPaid ? (previewUrls[i] ?? null) : null,
        }));
        await supabase.from('content_media').insert(mediaRecords);
      }

      addToast('Content published successfully!', 'success');
      resetForm();
      await refreshMyContent();
      await refreshFeed();
      onDone?.();
    } catch (err: any) {
      if (createdContentId) await supabase.from('content').delete().eq('id', createdContentId);
      for (const bucket of Array.from(new Set(uploaded.map((u) => u.bucket)))) {
        await supabase.storage.from(bucket).remove(uploaded.filter((u) => u.bucket === bucket).map((u) => u.path));
      }
      addToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700 p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Upload size={20} className="text-indigo-400" />
        Upload New Content
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-6 text-center ${
            dragOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-300 dark:border-zinc-700'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload size={22} className="text-slate-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">Tap to select media</p>
            <p className="text-xs text-slate-400">Photos or videos</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden bg-slate-100 aspect-square">
                {media.type === 'image' ? (
                  <img src={media.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={media.preview} className="w-full h-full object-cover" muted />
                )}
                <button
                  type="button"
                  onClick={() => setMediaFiles((prev) => prev.filter((_, i) => i !== index))}
                  className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Post description..."
            rows={2}
            className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Price (USD $)</label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0 (Free)"
              min="0"
              step="0.01"
              className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500">Preview Blur ({blurPercent}%)</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={blurPercent}
              onChange={(e) => setBlurPercent(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={mediaFiles.length === 0 || uploading || !title.trim()}
          className="w-full rounded-xl bg-gradient-brand text-white font-semibold py-2.5 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {uploading ? 'Uploading...' : `Publish ${mediaFiles.length} File${mediaFiles.length !== 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  );
}

export function UploadContent({ onDone }: { onDone?: () => void }) {
  const { user, activeProfileId, profiles, refreshProfiles } = useStore();
  const [gate, setGate] = useState<'loading' | 'verified' | 'pending' | 'unverified'>('loading');

  const profileId = activeProfileId || profiles[0]?.id || user?.id || '';

  const loadGate = useCallback(async () => {
    if (!user) return;
    try {
      // User ke main account/Gmail level par check karo
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, kyc_status')
        .or(`id.eq.${user.id},owner_id.eq.${user.id}`);

      if (error || !data) {
        setGate('unverified');
        return;
      }

      // Agar is account ka koi bhi profile verified/approved/admin hai toh direct post allow
      const isAnyVerified = data.some(
        (p) => p.role === 'admin' || p.kyc_status === 'verified' || p.kyc_status === 'approved'
      );

      if (isAnyVerified) {
        setGate('verified');
      } else if (data.some((p) => p.kyc_status === 'pending')) {
        setGate('pending');
      } else {
        setGate('unverified');
      }
    } catch {
      setGate('unverified');
    }
  }, [user]);

  useEffect(() => {
    loadGate();
  }, [loadGate]);

  if (!user || gate === 'loading') {
    return (
      <div className="p-10 text-center">
        <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
      </div>
    );
  }

  // Agar verified hai toh seedha upload form dikhao, koi popup nahi
  if (gate === 'verified') {
    return <UploadForm onDone={onDone} />;
  }

  return (
    <KycVerification
      profileId={profileId}
      status={gate === 'pending' ? 'pending' : 'unverified'}
      onSubmitted={() => {
        setGate('pending');
        refreshProfiles();
      }}
      onRefresh={loadGate}
    />
  );
}
