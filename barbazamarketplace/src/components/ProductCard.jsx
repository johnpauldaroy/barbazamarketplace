import React, { memo } from 'react';
import { ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPeso, resolveProductImage } from '../lib/marketplace';

const ProductCard = ({ product, onAddToCart }) => {
  const title = product.title || product.name || 'Untitled product';
  const price = Number(product.price || 0);
  const stock = Number(product.stock || 0);
  const averageRating = Number(product?.review_summary?.average_rating || 0);
  const ratingsCount = Number(product?.review_summary?.ratings_count || 0);
  const imageUrl = resolveProductImage(product.image);
  const isLowStock = stock > 0 && stock < 20;
  const isOutOfStock = stock <= 0;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#dfe7f4] bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Image */}
      <Link to={`/product/${product.id}`} className="relative block overflow-hidden">
        <div className="aspect-[4/3] overflow-hidden bg-[#f4f7fd]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div
            className="h-full w-full flex-col items-center justify-center gap-2 bg-[#f4f7fd]"
            style={{ display: imageUrl ? 'none' : 'flex' }}
          >
            <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] text-slate-400">No image</span>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {isOutOfStock && (
            <span className="badge-red">Sold out</span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="badge-amber">Low stock</span>
          )}
        </div>

        {/* Quick-add button — visible on hover (desktop), hidden on mobile (uses bottom button instead) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onAddToCart?.(product);
          }}
          disabled={isOutOfStock}
          aria-label={`Add ${title} to cart`}
          className="absolute bottom-3 right-3 hidden h-10 w-10 items-center justify-center rounded-lg bg-[#2954C8] text-white shadow-lg opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        {product?.store?.slug ? (
          <Link
            to={`/stores/${product.store.slug}`}
            className="mb-1 text-xs font-medium text-[#2954C8] hover:underline"
          >
            {product?.store?.name || 'Platform Store'}
          </Link>
        ) : (
          <p className="mb-1 text-xs font-medium text-slate-400">
            {product?.store?.name || 'Platform Store'}
          </p>
        )}

        <Link to={`/product/${product.id}`} className="block flex-1">
          <h3 className="clamp-2 text-sm font-semibold leading-snug text-[#0b1739] transition-colors group-hover:text-[#2954C8]">
            {title}
          </h3>
        </Link>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-[#0b1739]">{formatPeso(price)}</p>
            <p className="text-[11px] text-slate-400">
              {stock > 0 ? `${stock} in stock` : 'Out of stock'}
            </p>
          </div>

          {ratingsCount > 0 ? (
            <div className="text-right">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {averageRating.toFixed(1)} ({ratingsCount})
              </p>
            </div>
          ) : null}
        </div>

        {/* Add to cart — always visible on mobile (below sm breakpoint), hidden on desktop */}
        <button
          type="button"
          onClick={() => onAddToCart?.(product)}
          disabled={isOutOfStock}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#dfe7f4] bg-white text-xs font-semibold text-[#2954C8] transition-colors hover:border-[#2954C8] hover:bg-[#eef3fb] disabled:cursor-not-allowed disabled:opacity-40 sm:hidden"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {isOutOfStock ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </div>
  );
};

export default memo(ProductCard);
