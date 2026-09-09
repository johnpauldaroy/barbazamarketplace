import React, { useEffect, useMemo } from 'react';
import { X, ImagePlus, Star } from 'lucide-react';
import { cn } from '../lib/utils';

const MAX_IMAGES = 8;

/**
 * Manages a product's photo gallery: existing images (from `existingImages`,
 * removable via `onRemoveExisting`) plus newly picked files not yet uploaded
 * (`newFiles`, added/removed via `onAddFiles`/`onRemoveNewFile`). The first
 * tile overall is always the primary image shown everywhere else in the app.
 */
const MultiImageUploader = ({
  existingImages = [],
  newFiles = [],
  onAddFiles,
  onRemoveExisting,
  onRemoveNewFile,
  disabled = false,
}) => {
  const previews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles]
  );

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const totalCount = existingImages.length + newFiles.length;
  const canAddMore = totalCount < MAX_IMAGES;

  const handleFileInput = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (picked.length === 0) return;

    const remainingSlots = MAX_IMAGES - totalCount;
    onAddFiles(picked.slice(0, Math.max(0, remainingSlots)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {existingImages.map((image, index) => (
          <div
            key={image.id}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
          >
            <img src={image.url} alt="Product" className="h-full w-full object-cover" />
            {index === 0 && (
              <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                <Star className="h-2.5 w-2.5 fill-current" />
                Main
              </span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemoveExisting(image.id)}
                aria-label="Remove image"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {previews.map((preview, index) => (
          <div
            key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-dashed border-[#2954C8]/50 bg-slate-50"
          >
            <img src={preview.url} alt="New upload preview" className="h-full w-full object-cover" />
            {existingImages.length === 0 && index === 0 && (
              <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                <Star className="h-2.5 w-2.5 fill-current" />
                Main
              </span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemoveNewFile(index)}
                aria-label="Remove selected image"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {canAddMore && !disabled && (
          <label
            className={cn(
              'flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-[#2954C8] hover:text-[#2954C8]'
            )}
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Add</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
          </label>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {totalCount === 0
          ? `Add up to ${MAX_IMAGES} photos. The first photo is used as the main image.`
          : `${totalCount}/${MAX_IMAGES} photos. The first photo is used as the main image.`}
      </p>
    </div>
  );
};

export default MultiImageUploader;
