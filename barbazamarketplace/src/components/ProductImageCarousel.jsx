import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * `images` is the full gallery (already resolved to absolute URLs), in
 * display order with the primary image first. A product with zero or one
 * photo renders exactly like the old single-image block, just without the
 * arrows/dots — this only becomes a carousel once there's something to page
 * through.
 */
const ProductImageCarousel = ({ images = [], alt = 'Product' }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex min-h-[340px] items-center justify-center rounded-xl border border-[#dfe7f4] bg-[#f4f7fd]">
        <Package className="h-12 w-12 text-slate-400 opacity-40" />
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, images.length - 1);
  const goTo = (index) => setActiveIndex((index + images.length) % images.length);

  return (
    <div className="space-y-3">
      <div className="group relative overflow-hidden rounded-xl border border-[#dfe7f4] bg-[#f4f7fd]">
        <img
          src={images[safeIndex]}
          alt={images.length > 1 ? `${alt} — photo ${safeIndex + 1} of ${images.length}` : alt}
          className="h-full max-h-[520px] w-full object-contain p-4"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(safeIndex - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(safeIndex + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Go to photo ${index + 1}`}
                  aria-current={index === safeIndex}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === safeIndex ? 'w-5 bg-[#2954C8]' : 'w-1.5 bg-white/80 hover:bg-white'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`View photo ${index + 1}`}
              aria-current={index === safeIndex}
              className={cn(
                'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors',
                index === safeIndex ? 'border-[#2954C8]' : 'border-transparent hover:border-[#dfe7f4]'
              )}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageCarousel;
