import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, Eye } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/use-toast';
import { getProducts, getProductQuantities } from '@/api/EcommerceApi';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjVGN0ZBIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==";

const ProductCard = ({ product, index }) => {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const displayVariant = product.variants[0];
  const hasSale = displayVariant && displayVariant.sale_price_in_cents !== null;
  const displayPrice = hasSale ? displayVariant.sale_price_formatted : displayVariant.price_formatted;
  const originalPrice = hasSale ? displayVariant.price_formatted : null;

  // Check if out of stock
  const isOutOfStock = !displayVariant.inventory_quantity || displayVariant.inventory_quantity <= 0;
  // If manage_inventory is false, it's considered in stock
  const isInStock = !displayVariant.manage_inventory || !isOutOfStock;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    
    if (product.variants.length > 1) {
      // If multiple variants, go to detail page
       window.location.href = `/product/${product.id}`;
      return;
    }

    try {
      await addToCart(product, displayVariant, 1, displayVariant.inventory_quantity);
      toast({
        title: "Added to Cart!",
        description: `${product.title} has been added to your cart.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="h-full"
    >
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col group">
        <Link to={`/product/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-100 block">
          <img
            src={product.image || placeholderImage}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {/* Overlays */}
          {product.ribbon_text && (
            <div className="absolute top-3 left-3 bg-[#2EA7FF] text-[#2954C8] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              {product.ribbon_text}
            </div>
          )}
          {hasSale && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              Sale
            </div>
          )}
           {!isInStock && (
             <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <span className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-bold">Out of Stock</span>
             </div>
           )}
        </Link>
        
        <div className="p-5 flex flex-col flex-grow">
          <Link to={`/product/${product.id}`} className="block">
            <h3 className="text-lg font-bold text-[#0B1739] mb-1 truncate hover:text-[#12B981] transition-colors">{product.title}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[2.5rem]">{product.subtitle || product.title}</p>
          </Link>
          
          <div className="mt-auto">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xl font-bold text-[#2954C8]">{displayPrice}</span>
              {hasSale && (
                <span className="text-sm text-gray-400 line-through">{originalPrice}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Link to={`/product/${product.id}`} className="w-full">
                    <Button variant="outline" className="w-full border-[#2954C8] text-[#2954C8] hover:bg-[#2954C8] hover:text-white">
                        <Eye className="w-4 h-4 mr-2" /> View
                    </Button>
                </Link>
                <Button 
                    onClick={handleAddToCart}
                    disabled={!isInStock}
                    className="w-full bg-[#2EA7FF] hover:bg-[#2197E9] text-[#2954C8] font-semibold disabled:opacity-50"
                >
                    <ShoppingCart className="w-4 h-4 mr-2" /> Add
                </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ProductsList = ({ limit, categoryId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductsWithQuantities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch products, applying limit if provided
        const productsResponse = await getProducts({ limit: limit ? String(limit) : undefined });

        if (productsResponse.products.length === 0) {
          setProducts([]);
          return;
        }

        const productIds = productsResponse.products.map(product => product.id);

        const quantitiesResponse = await getProductQuantities({
          fields: 'inventory_quantity',
          product_ids: productIds
        });

        const variantQuantityMap = new Map();
        quantitiesResponse.variants.forEach(variant => {
          variantQuantityMap.set(variant.id, variant.inventory_quantity);
        });

        const productsWithQuantities = productsResponse.products.map(product => ({
          ...product,
          variants: product.variants.map(variant => ({
            ...variant,
            inventory_quantity: variantQuantityMap.get(variant.id) ?? variant.inventory_quantity
          }))
        }));

        setProducts(productsWithQuantities);
      } catch (err) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProductsWithQuantities();
  }, [limit, categoryId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 text-[#12B981] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8 bg-red-50 rounded-xl">
        <p>Unable to load products at this time. Please try again later.</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center text-gray-500 p-12 bg-white rounded-xl shadow-sm">
        <p className="text-lg">No products available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
};

export default ProductsList;
