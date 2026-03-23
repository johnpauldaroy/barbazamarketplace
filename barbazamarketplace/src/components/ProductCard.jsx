import React, { memo } from 'react';
import { ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { formatPeso, resolveProductImage } from '../lib/marketplace';

const ProductCard = ({ product, onAddToCart }) => {
  const title = product.title || product.name || 'Untitled product';
  const price = Number(product.price || 0);
  const stock = Number(product.stock || 0);
  const imageUrl = resolveProductImage(product.image);
  const isLowStock = stock > 0 && stock < 20;
  const isOutOfStock = stock <= 0;

  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.2 }} className="h-full">
      <Card className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <Link to={`/product/${product.id}`} className="relative block overflow-hidden">
          <div className="aspect-[1/0.92] overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-[#dfeeff]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-400">
                No image available
              </div>
            )}
          </div>

          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            {isLowStock && <Badge variant="warning">Low stock</Badge>}
            {isOutOfStock && <Badge variant="destructive">Sold out</Badge>}
          </div>

          <Button
            size="icon"
            onClick={(event) => {
              event.preventDefault();
              onAddToCart?.(product);
            }}
            disabled={isOutOfStock}
            className="absolute bottom-4 right-4 h-12 w-12 rounded-full border-4 border-white bg-[#2954C8] shadow-[0_16px_30px_rgba(41,84,200,0.28)]"
            aria-label={`Add ${title} to cart`}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </Link>

        <CardContent className="flex flex-1 flex-col p-6">
          <Link to={`/product/${product.id}`} className="block">
            <h3 className="line-clamp-2 text-[1.05rem] font-semibold leading-8 text-[#0b1739] transition-colors group-hover:text-[#2954C8]">
              {title}
            </h3>
          </Link>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-[#0b1739]">{formatPeso(price)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {stock > 0 ? `${stock} in stock` : 'Unavailable'}
              </p>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              {[0, 1, 2].map((index) => (
                <Star key={`filled-${index}`} className="h-4 w-4 fill-current" />
              ))}
              {[0, 1].map((index) => (
                <Star key={`empty-${index}`} className="h-4 w-4 text-slate-300" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default memo(ProductCard);
