import React, { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { resolveProductImage } from '../lib/marketplace';
import { cn } from '../lib/utils';

const StoreLogo = ({ src, name = 'Store', className, imageClassName, iconClassName }) => {
  const resolvedSrc = resolveProductImage(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#eef5ff] text-[#2954C8]',
        className
      )}
    >
      {resolvedSrc && !failed ? (
        <img
          src={resolvedSrc}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imageClassName)}
        />
      ) : (
        <Store className={cn('h-5 w-5', iconClassName)} aria-label={`${name} logo unavailable`} />
      )}
    </div>
  );
};

export default StoreLogo;
