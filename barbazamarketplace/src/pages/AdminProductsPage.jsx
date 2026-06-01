import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';
import { createProduct, deleteProduct, fetchAdminStores, fetchProducts, getCategories, updateProduct } from '../api/EcommerceApi';
import { formatPeso as defaultFormatPeso, resolveProductImage } from '../lib/marketplace';

const INITIAL_FORM = {
  storeId: '',
  title: '',
  category: '',
  price: '',
  stock: '',
  stockThreshold: '5',
  description: '',
  imageFile: null,
};

const normalizeProduct = (product) => ({
  ...product,
  displayName: product?.name || product?.title || 'Untitled Product',
  displayCategory: product?.category || 'Uncategorized',
  displayAmount: Number(product?.price ?? 0),
  displayImage: resolveProductImage(product?.image_url || product?.image) || null,
  displayStock: Number(product?.stock ?? 0),
  displayThreshold: Number(product?.stock_threshold ?? 5),
});

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const outletContext = useOutletContext() || {};
  const {
    searchQuery = '',
    setSearchQuery = () => {},
    formatPeso = defaultFormatPeso,
    loading = false,
  } = outletContext;

  const [products, setProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      let page = 1;
      let hasMore = true;
      const allProducts = [];

      while (hasMore) {
        const response = await fetchProducts({
          page,
          per_page: 24,
          sort: 'name',
          store_id: selectedStoreId || undefined,
        });
        const pageProducts = Array.isArray(response?.products) ? response.products : [];
        allProducts.push(...pageProducts);

        hasMore = Boolean(response?.meta?.has_more_pages);
        page += 1;
      }

      setProducts(allProducts);
    } catch (error) {
      toast({
        title: 'Unable to load products',
        description: error?.message || 'Failed to fetch product catalog.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [selectedStoreId, toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadStores = useCallback(async () => {
    try {
      const response = await fetchAdminStores();
      setStores(Array.isArray(response?.stores) ? response.stores : []);
    } catch (_) {
      setStores([]);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const loadCategoryOptions = useCallback(async (storeId = '') => {
    try {
      const categories = await getCategories({ store_id: storeId || undefined });
      setCategoryOptions(Array.isArray(categories) ? categories : []);
    } catch (error) {
      // Keep product management usable even if category suggestions fail to load.
      setCategoryOptions([]);
    }
  }, []);

  useEffect(() => {
    loadCategoryOptions(selectedStoreId);
  }, [loadCategoryOptions, selectedStoreId]);

  useEffect(() => {
    if (!isFormDialogOpen) return;
    loadCategoryOptions(form.storeId || selectedStoreId);
  }, [form.storeId, isFormDialogOpen, loadCategoryOptions, selectedStoreId]);

  const categories = useMemo(
    () => {
      const fromProducts = products.map((product) => product?.category).filter(Boolean);
      return Array.from(new Set([...categoryOptions, ...fromProducts])).sort((left, right) =>
        left.localeCompare(right)
      );
    },
    [products, categoryOptions]
  );

  const normalizedProducts = useMemo(
    () => products.map((product) => normalizeProduct(product)),
    [products]
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(
    () =>
      normalizedProducts.filter((product) => {
        if (!query) return true;
        return (
          product.displayName.toLowerCase().includes(query) ||
          product.displayCategory.toLowerCase().includes(query)
        );
      }),
    [normalizedProducts, query]
  );

  const tableLoading = isLoadingProducts || (loading && products.length === 0);

  const openAddDialog = () => {
    setEditingProduct(null);
    setForm({ ...INITIAL_FORM, storeId: selectedStoreId });
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setForm({
      storeId: product?.store_id != null ? String(product.store_id) : selectedStoreId,
      title: product?.title || product?.name || '',
      category: product?.category || '',
      price: product?.price != null ? String(product.price) : '',
      stock: product?.stock != null ? String(product.stock) : '',
      stockThreshold: product?.stock_threshold != null ? String(product.stock_threshold) : '5',
      description: product?.description || '',
      imageFile: null,
    });
    setIsFormDialogOpen(true);
  };

  const openDeleteDialog = (product) => {
    setDeletingProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.trim();
    const category = form.category.trim();
    const description = form.description.trim();
    const parsedStoreId = form.storeId ? Number(form.storeId) : null;
    const parsedPrice = Number(form.price);
    const parsedStock = Number(form.stock);
    const parsedThreshold = Number(form.stockThreshold);

    if (!title || !category || Number.isNaN(parsedPrice) || Number.isNaN(parsedStock) || Number.isNaN(parsedThreshold)) {
      toast({
        title: 'Invalid form input',
        description: 'Title, category, price, stock, and alert threshold are required.',
        variant: 'destructive',
      });
      return;
    }

    if (parsedPrice < 0 || parsedStock < 0) {
      toast({
        title: 'Invalid numeric values',
        description: 'Price and stock must be zero or greater.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      title,
      category,
      store_id: parsedStoreId || undefined,
      price: parsedPrice,
      stock: Math.floor(parsedStock),
      stock_threshold: Math.floor(parsedThreshold),
      description,
    };

    if (form.imageFile) {
      payload.image = form.imageFile;
    }

    setIsMutating(true);
    try {
      if (editingProduct?.id) {
        const response = await updateProduct(editingProduct.id, payload);
        const updated = normalizeProduct({ ...editingProduct, ...payload, ...(response?.product || {}) });
        setProducts((prev) => prev.map((item) => (item.id === editingProduct.id ? updated : item)));
        toast({ title: 'Product updated', description: `${updated.displayName} has been updated.`, variant: 'success' });
      } else {
        const response = await createProduct(payload);
        const created = normalizeProduct(response?.product || payload);
        setProducts((prev) => [created, ...prev]);
        toast({ title: 'Product added', description: `${created.displayName} has been created.`, variant: 'success' });
      }

      loadCategoryOptions(form.storeId);
      setIsFormDialogOpen(false);
      setForm({ ...INITIAL_FORM, storeId: selectedStoreId });
      setEditingProduct(null);
    } catch (error) {
      toast({
        title: editingProduct ? 'Update failed' : 'Create failed',
        description: error?.message || 'Unable to save product changes.',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct?.id) return;

    setIsMutating(true);
    try {
      await deleteProduct(deletingProduct.id);
      setProducts((prev) => prev.filter((item) => item.id !== deletingProduct.id));
      toast({ title: 'Product deleted', description: `${deletingProduct.displayName} has been removed.`, variant: 'success' });
      loadCategoryOptions(selectedStoreId);
      setIsDeleteDialogOpen(false);
      setDeletingProduct(null);
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Unable to delete this product.',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Product Catalog</CardTitle>
            <p className="text-sm text-slate-500">Manage your marketplace inventory</p>
          </div>
          <Button className="gap-2 text-xs font-bold rounded-xl bg-[#2954C8]" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Add New Product
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search products by name or category..."
                className="h-11 rounded-2xl border-slate-200 pl-11 focus:ring-2 focus:ring-[#2954C8]/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="min-w-[220px]">
              <select
                value={selectedStoreId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
              >
                <option value="">All stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={String(store.id)}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#ECF1FA] bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#ECF1FA] bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Store</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Price</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {tableLoading ? (
                   <tr><td colSpan="6" className="py-10 text-center text-slate-400 animate-pulse">Loading catalog...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-slate-500">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100 p-1">
                            {product.displayImage ? (
                              <img
                                src={product.displayImage}
                                alt={product.displayName}
                                className="h-full w-full object-cover rounded-md"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-md bg-slate-200 text-[8px] text-slate-400">
                                No img
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{product.displayName}</p>
                            <p className="text-[10px] text-slate-400">ID: {product.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-semibold text-slate-700">{product?.store?.name || 'Platform Store'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-slate-200">
                          {product.displayCategory}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{formatPeso(product.displayAmount)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              product.displayStock > (product.stock_threshold ?? 5) ? 'bg-emerald-500' : product.displayStock > 0 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          />
                          <p className="text-xs font-medium text-slate-600">{product.displayStock} in stock 
                            <span className="ml-1.5 text-[10px] text-slate-400 font-normal">(Alert: {product.stock_threshold ?? 5})</span></p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => openDeleteDialog(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details below.' : 'Create a new product for your marketplace catalog.'}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleFormSubmit}>
            <div className="space-y-2">
              <Label htmlFor="product-title">Product Title</Label>
              <Input
                id="product-title"
                value={form.title}
                onChange={(event) => updateFormField('title', event.target.value)}
                placeholder="Enter product title"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-store">Store</Label>
                <select
                  id="product-store"
                  value={form.storeId}
                  onChange={(event) => {
                    updateFormField('storeId', event.target.value);
                    updateFormField('category', '');
                  }}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
                >
                  <option value="">Platform Store (Default)</option>
                  {stores.map((store) => (
                    <option key={store.id} value={String(store.id)}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="product-category">Category</Label>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/settings')}
                    className="text-xs font-semibold text-[#2954C8] hover:underline"
                  >
                    Manage in Settings
                  </button>
                </div>
                <select
                  id="product-category"
                  value={form.category}
                  onChange={(event) => updateFormField('category', event.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>
                    {categories.length > 0 ? 'Select a category' : 'No categories available'}
                  </option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-stock">Current Stock</Label>
                <Input
                  id="product-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => updateFormField('stock', event.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-threshold">Stock Alert Threshold</Label>
                <Input
                  id="product-threshold"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockThreshold}
                  onChange={(event) => updateFormField('stockThreshold', event.target.value)}
                  placeholder="5"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-price">Price</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => updateFormField('price', event.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <textarea
                id="product-description"
                rows={4}
                value={form.description}
                onChange={(event) => updateFormField('description', event.target.value)}
                placeholder="Short product description"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-image">Image</Label>
              <Input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={(event) => updateFormField('imageFile', event.target.files?.[0] || null)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#2954C8]" disabled={isMutating}>
                {isMutating ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              {deletingProduct
                ? `Are you sure you want to delete "${deletingProduct.displayName}"? This action cannot be undone.`
                : 'Are you sure you want to delete this product?'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isMutating}>
              {isMutating ? 'Deleting...' : 'Delete Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductsPage;
