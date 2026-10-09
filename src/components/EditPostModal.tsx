import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { ContentMedia } from '../lib/types';
import { X, Loader2, DollarSign, ImageIcon, Video, Upload, Trash2, Check } from 'lucide-react';

export function EditPostModal() {
  const { editPostId, closeEditPost, updateContent, addMediaToContent, removeMediaFromContent, addToast, refreshMyContent } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [blurLevel, setBlurLevel] = useState<'low' | 'medium' | 'hard'>('medium');
  const [mediaItems, setMediaItems] = useState<ContentMedia[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async (contentId: string) => {
    const { data } = await supabase
      .from('content_media')
      .select('*')
      .eq('content_id', contentId)
      .order('display_order', { ascending: true });
    return data || [];
  }, []);

  useEffect(() => {
    if (!editPostId) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('content')
        .select('*')
        .eq('id', editPostId)
        .maybeSingle();
      if (!active) return;
      if (fetchError || !data) {
        setError('Failed to load post data.');
        setLoading(false);
        return;
      }
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPrice(data.price?.toString() || '');
      setBlurLevel(data.blur_level || 'medium');
      if (data.media_count > 1) {
        const media = await fetchMedia(editPostId);
        if (active) setMediaItems(media);
      } else {
        setMediaItems([]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [editPostId, fetchMedia]);

  if (!editPostId) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length === 0) {
      addToast('Please select image or video files.', 'error');
      return;
    }
    setNewFiles(prev => [...prev, ...files]);
    setNewFilePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewFilePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExisting = async (mediaId: string) => {
    const { error: rmError } = await removeMediaFromContent(editPostId, mediaId);
    if (rmError) {
      addToast(rmError, 'error');
    } else {
      setMediaItems(prev => prev.filter(m => m.id !== mediaId));
      addToast('Media removed.', 'success');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title cannot be empty.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price.');
      return;
    }
    setSaving(true);
    setError(null);

    const { error: updateError } = await updateContent(editPostId, {
      title: title.trim(),
      description: description.trim() || null,
      price: priceNum,
      blur_level: blurLevel,
    });
    if (updateError) {
      setError(updateError);
      setSaving(false);
      return;
    }

    if (newFiles.length > 0) {
      const { error: addError } = await addMediaToContent(editPostId, newFiles);
      if (addError) {
        setError(addError);
        setSaving(false);
        return;
      }
      newFilePreviews.forEach(p => URL.revokeObjectURL(p));
      setNewFiles([]);
      setNewFilePreviews([]);
    }

    await refreshMyContent();
    addToast('Post updated successfully.', 'success');
    setSaving(false);
    closeEditPost();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEditPost} />
      <div className="relative w-full max-w-lg rounded-2xl glass border border-slate-200 dark:border-zinc-700 p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button
          onClick={closeEditPost}
          className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Edit Post</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-5">Update title, price, media, and blur settings.</p>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing Media */}
            {mediaItems.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Current Media ({mediaItems.length})</label>
                <div className="grid grid-cols-4 gap-2">
                  {mediaItems.map((m) => (
                    <div key={m.id} className="relative group rounded-lg overflow-hidden bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-zinc-700/50 aspect-square">
                      {m.media_type === 'image' ? (
                        <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800">
                          <Video size={16} className="text-slate-400 dark:text-zinc-500" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveExisting(m.id)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white hover:bg-rose-500/80 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Media */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Add More Media (optional)</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-500/50 p-4 text-center transition-all"
              >
                <Upload size={18} className="mx-auto text-slate-400 dark:text-zinc-500 mb-1" />
                <span className="text-xs text-slate-500 dark:text-zinc-400">Click to add more images or videos</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {newFilePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {newFilePreviews.map((preview, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-zinc-700/50 aspect-square">
                      {newFiles[i].type.startsWith('image/') ? (
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800">
                          <Video size={16} className="text-slate-400 dark:text-zinc-500" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewFile(i)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white hover:bg-rose-500/80 transition-colors"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-emerald-500/90 text-[9px] text-white font-bold">NEW</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Price (USD $)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            {/* Blur Intensity */}
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
                      <ImageIcon size={16} className={`text-slate-400 dark:text-zinc-500 ${opt.blur}`} />
                    </div>
                    <span className={`text-xs font-medium ${blurLevel === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-zinc-300'}`}>{opt.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5">Controls how blurred the preview appears to non-purchasers.</p>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={closeEditPost}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
