import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductById } from '../api/EcommerceApi';
import { useCart } from '../hooks/useCart';
import { buildSimpleCartItem, resolveProductImage } from '../lib/marketplace';

const ProductDetailPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchProductById(id);
        if (isMounted) {
          setProduct(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load product');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;

    const stockValue = Number(product.stock || 0);
    const { product: cartProduct, variant } = buildSimpleCartItem(product);

    addToCart(cartProduct, variant, quantity, stockValue)
      .then(() => {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      })
      .catch(err => alert(err.message));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="not-found">
        <h1>Unable to load product</h1>
        <p>{error}</p>
        <Link to="/products" className="back-btn">Back to Products</Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="not-found">
        <h1>Product Not Found</h1>
        <p>The product you're looking for doesn't exist.</p>
        <Link to="/products" className="back-btn">Back to Products</Link>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/products">Products</Link>
        <span>/</span>
        <span className="current">{product.title || product.name}</span>
      </nav>

      <div className="product-container">
        <div className="product-image-section">
          <div className="main-image">
            {product.image ? (
              <img src={resolveProductImage(product.image_url || product.image)} alt={product.title || product.name} />
            ) : (
              <div className="placeholder">No image</div>
            )}
          </div>
          <span className="category-badge">{product.category}</span>
        </div>

        <div className="product-info-section">
          <h1 className="product-title">{product.title || product.name}</h1>

          <div className="product-price">
            PHP {Number(product.price || 0).toFixed(2)}
          </div>

          <div className="stock-info">
            {Number(product.stock || 0) > 0 ? (
              <span className="in-stock">In Stock ({product.stock} available)</span>
            ) : (
              <span className="out-of-stock">Out of Stock</span>
            )}
          </div>

          <p className="product-description">{product.description}</p>

          <div className="quantity-section">
            <label>Quantity:</label>
            <div className="quantity-controls">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="quantity-value">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(Number(product.stock || 0), q + 1))}
                disabled={quantity >= Number(product.stock || 0)}
              >
                +
              </button>
            </div>
          </div>

          <button
            className={`add-to-cart-btn ${addedToCart ? 'added' : ''}`}
            onClick={handleAddToCart}
            disabled={Number(product.stock || 0) === 0 || addedToCart}
          >
            {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
          </button>

          <div className="product-meta">
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <span className="meta-value">{product.category}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .product-detail-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        .loading-container,
        .not-found {
          min-height: 50vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #7488A3;
        }

        .not-found h1 {
          color: #2954C8;
          margin-bottom: 0.5rem;
        }

        .back-btn {
          margin-top: 1rem;
          background: #2954C8;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          font-size: 0.9rem;
        }

        .breadcrumb a {
          color: #7488A3;
          text-decoration: none;
        }

        .breadcrumb a:hover {
          color: #2954C8;
        }

        .breadcrumb span {
          color: #9AACBF;
        }

        .breadcrumb .current {
          color: #0B1739;
          font-weight: 500;
        }

        .product-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
        }

        .product-image-section {
          position: relative;
        }

        .main-image {
          aspect-ratio: 1;
          background: #F5F8FE;
          border-radius: 16px;
          overflow: hidden;
        }

        .main-image img {
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
          font-size: 1.5rem;
          opacity: 0.4;
        }

        .category-badge {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: #2954C8;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .product-info-section {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .product-title {
          font-size: 2rem;
          color: #0B1739;
          margin: 0;
        }

        .product-price {
          font-size: 2rem;
          font-weight: 700;
          color: #2954C8;
        }

        .stock-info {
          font-size: 0.95rem;
        }

        .in-stock {
          color: #059669;
        }

        .out-of-stock {
          color: #dc2626;
        }

        .product-description {
          color: #627796;
          line-height: 1.7;
          font-size: 1.05rem;
        }

        .quantity-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .quantity-section label {
          font-weight: 500;
          color: #5D7393;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          background: #F5F8FE;
          border-radius: 8px;
          overflow: hidden;
        }

        .quantity-controls button {
          width: 44px;
          height: 44px;
          border: none;
          background: transparent;
          font-size: 1.25rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .quantity-controls button:hover:not(:disabled) {
          background: #E1E8F3;
        }

        .quantity-controls button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .quantity-value {
          width: 50px;
          text-align: center;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .add-to-cart-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #2954C8 0%, #2EA7FF 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .add-to-cart-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(30, 58, 95, 0.3);
        }

        .add-to-cart-btn.added {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }

        .add-to-cart-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .product-meta {
          display: flex;
          gap: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #E1E8F3;
        }

        .meta-item {
          display: flex;
          gap: 0.5rem;
        }

        .meta-label {
          color: #7488A3;
        }

        .meta-value {
          color: #0B1739;
          font-weight: 500;
        }

        @media (max-width: 960px) {
          .product-container {
            gap: 2rem;
          }

          .breadcrumb {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 768px) {
          .product-container {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .product-title {
            font-size: 1.5rem;
          }

          .product-price {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 520px) {
          .product-detail-page {
            padding: 1.5rem 1rem;
          }

          .quantity-section {
            flex-direction: column;
            align-items: flex-start;
          }

          .product-meta {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductDetailPage;

