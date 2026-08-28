import React, { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

const ProductThumbnail = ({ src, alt = 'Product', className, imageClassName }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#dfe7f4] bg-[#f4f7fd]',
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imageClassName)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-slate-300"
          role="img"
          aria-label={`${alt} image unavailable`}
        >
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export default ProductThumbnail;
