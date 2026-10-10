import { useState, useRef, useCallback } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Upload, X, Loader2, ImageIcon, Video, DollarSign, Check, Eye } from 'lucide-react';

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];

export function UploadContent({ onDone }: { onDone?: () => void }) {
  const { user, activeProfileId, profiles, addToast, refreshMyContent, refreshFeed } = useStore();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [blurLevel, setBlurLevel] = useState<'low' | 'medium' | 'hard'>('medium');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview));
    setMediaFiles([]);
    setTitle('');
    setDescription('');
    setPrice('');
    setBlurLevel('medium');
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
        errors.push(`${file.name}: not a valid image or video file.`);
        return;
      }
      if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported image format. Use JPG, PNG, WebP, GIF, or AVIF.`);
        return;
      }
      if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported video format. Use MP4, WebM, or MOV.`);
        return;
      }
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      if (file.size > maxSize) {
        const limitMB = Math.round(maxSize / (1024 * 1024));
        errors.push(`${file.name}: file is too large. Max ${limitMB} MB for ${isImage ? 'images' : 'videos'}.`);
        return;
      }
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        type: isImage ? 'image' : 'video',
      });
    });
    errors.forEach((msg) => addToast(msg, 'error'));
    if (newFiles.length === 0) {
      if (errors.length === 0) addToast('Please select image or video files.', 'error');
      return;
    }
    setMediaFiles((prev) => [...prev, ...newFiles]);
  }, [addToast]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || mediaFiles.length === 0) return;

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      addToast('Please enter a valid price.', 'error');
      return;
    }
    if (!title.trim()) {
      addToast('Please enter a title.', 'error');
      return;
    }

    setUploading(true);

    try {
      const profileId = activeProfileId || profiles.find((p) => p.is_primary)?.id || profiles[0]?.id;
      if (!profileId) {
        addToast('No creator profile found. Please complete your profile setup first.', 'error');
        setUploading(false);
        return;
      }
      const creatorId = profileId;
      const uploadedUrls: { url: string; type: 'image' | 'video' }[] = [];

      for (const media of mediaFiles) {
        const fileExt = media.file.name.split('.').pop() || (media.type === 'image' ? 'jpg' : 'mp4');
        const fileName = `${creatorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('creator-media')
          .upload(fileName, media.file, {
            contentType: media.file.type || (media.type === 'image' ? 'image/jpeg' : 'video/mp4'),
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Failed to upload ${media.file.name}: ${uploadError.message}`);
        }
        const { data: urlData } = supabase.storage
          .from('creator-media')
          .getPublicUrl(fileName);
        uploadedUrls.push({ url: urlData.publicUrl, type: media.type });
      }

      const firstMedia = uploadedUrls[0];
      const primaryType = firstMedia.type;
      const thumbnailUrl = primaryType === 'image' ? firstMedia.url : (uploadedUrls.find(u => u.type === 'image')?.url || null);

      const { data: contentData, error: insertError } = await supabase
        .from('content')
        .insert({
          creator_id: creatorId,
          title: title.trim(),
          description: description.trim() || null,
          media_url: firstMedia.url,
          media_type: primaryType,
          thumbnail_url: thumbnailUrl,
          price: priceNum,
          is_published: true,
          media_count: uploadedUrls.length,
          blur_level: blurLevel,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (uploadedUrls.length > 1) {
        const mediaRecords = uploadedUrls.map((m, i) => ({
          content_id: contentData.id,
          media_url: m.url,
          media_type: m.type,
          display_order: i,
        }));
        const { error: mediaError } = await supabase
          .from('content_media')
          .insert(mediaRecords);
        if (mediaError) throw mediaError;
      }

      addToast(`${uploadedUrls.length} file${uploadedUrls.length > 1 ? 's' : ''} uploaded successfully!`, 'success');

      try {
        resetForm();
        await refreshMyContent();
        await refreshFeed();
      } catch (refreshErr) {
        console.error('Post-upload refresh failed:', refreshErr);
      }

      onDone?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      console.error('Upload failed:', err);
      addToast(message, 'error');
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
        {/* File Upload Zone — multiple files, mobile-optimized */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-6 text-center ${
            dragOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-600'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
              <Upload size={22} className="text-slate-400 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">Tap to select media</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Select multiple images and/or videos</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={onFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Upload media files"
          />
        </div>

        {/* Preview Grid */}
        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-zinc-700/50 aspect-square">
                {media.type === 'image' ? (
                  <img src={media.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <video src={media.preview} className="w-full h-full object-cover" muted />
                )}
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white flex items-center gap-1">
                  {media.type === 'image' ? <ImageIcon size={8} /> : <Video size={8} />}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white hover:bg-rose-500/80 transition-colors"
                  aria-label="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your content a title..."
            className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your content..."
            rows={2}
            className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Price (USD $)</label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="4.99"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Set to 0 for free content. Applies to all {mediaFiles.length || 0} file{mediaFiles.length !== 1 ? 's' : ''}.</p>
        </div>

        {/* Blur Intensity Level */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Preview Blur Intensity</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'low', label: 'Normal', desc: 'Low blur', blur: 'blur-sm' },
              { value: 'medium', label: 'Medium', desc: 'Standard', blur: 'blur-xl' },
              { value: 'hard', label: 'Hard', desc: 'Heavy blur', blur: 'blur-3xl' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBlurLevel(opt.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  blurLevel === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                  {mediaFiles[0]?.type === 'image' ? (
                    <img src={mediaFiles[0].preview} alt="" className={`w-full h-full object-cover ${opt.blur}`} />
                  ) : (
                    <Eye size={16} className={`text-slate-400 dark:text-zinc-500 ${opt.blur}`} />
                  )}
                </div>
                <span className={`text-xs font-medium ${blurLevel === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-zinc-300'}`}>{opt.label}</span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">{opt.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5">Controls how blurred the preview thumbnail appears to non-purchasers.</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mediaFiles.length === 0 || uploading || !title.trim()}
          className="w-full rounded-xl bg-gradient-brand text-white font-semibold py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Uploading {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Check size={16} />
              Publish {mediaFiles.length > 0 ? `${mediaFiles.length} File${mediaFiles.length !== 1 ? 's' : ''}` : 'Content'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
