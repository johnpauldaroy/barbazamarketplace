import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../api/EcommerceApi';
import { useCart } from '../hooks/useCart';
import { buildSimpleCartItem, resolveProductImage } from '../lib/marketplace';

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchProducts();
        const items = Array.isArray(data) ? data : (data?.products || []);
        if (isMounted) {
          setProducts(items);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load products');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const { product: cartProduct, variant } = buildSimpleCartItem(product);

    addToCart(cartProduct, variant, 1, product.stock)
      .catch(err => console.error(err));
  };

  if (loading) {
    return (
      <div className="products-list">
        <div className="no-products">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="products-list">
        <div className="no-products">{error}</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="products-list">
        <div className="no-products">No products available.</div>
      </div>
    );
  }

  return (
    <div className="products-list">
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-image">
              {product.image ? (
                <img src={resolveProductImage(product.image_url || product.image)} alt={product.title || product.name} />
              ) : (
                <div className="placeholder">No image</div>
              )}
              {Number(product.stock || 0) < 30 && (
                <span className="sale-badge">Sale</span>
              )}
            </div>
            <div className="product-info">
              <h3 className="product-title">{product.title || product.name}</h3>
              <p className="product-category">{product.category}</p>
              <div className="product-pricing">
                <span className="current-price">PHP {Number(product.price || 0).toFixed(2)}</span>
                {Number(product.stock || 0) < 30 && (
                  <span className="original-price">PHP {(Number(product.price || 0) * 1.2).toFixed(2)}</span>
                )}
              </div>
              <div className="product-actions">
                <Link to={`/product/${product.id}`} className="btn-view">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                  </svg>
                  View
                </Link>
                <button className="btn-add" onClick={(e) => handleQuickAdd(e, product)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M6 6h15l-1.5 9h-12z" />
                    <circle cx="9" cy="20" r="1" />
                    <circle cx="18" cy="20" r="1" />
                  </svg>
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .products-list {
          width: 100%;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .product-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .product-image {
          position: relative;
          aspect-ratio: 1;
          background: #f5f5f5;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          opacity: 0.4;
        }

        .sale-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #dc2626;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .product-info {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .product-title {
          font-size: 1rem;
          color: #0B1739;
          margin-bottom: 0.25rem;
          font-weight: 600;
        }

        .product-category {
          font-size: 0.85rem;
          color: #1e5a6a;
          margin-bottom: 0.75rem;
        }

        .product-pricing {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .current-price {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0B1739;
        }

        .original-price {
          font-size: 0.9rem;
          color: #9AACBF;
          text-decoration: line-through;
        }

        .product-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: auto;
        }

        .btn-view,
        .btn-add {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn-view {
          background: white;
          color: #0B1739;
          border: 1px solid #E1E8F3;
        }

        .btn-view:hover {
          border-color: #0B1739;
        }

        .btn-add {
          background: #2EA7FF;
          color: white;
          border: none;
        }

        .btn-add:hover {
          background: #2197E9;
        }

        .no-products {
          text-align: center;
          padding: 2.5rem 1rem;
          color: #7488A3;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </div>
  );
};

export default ProductsList;

