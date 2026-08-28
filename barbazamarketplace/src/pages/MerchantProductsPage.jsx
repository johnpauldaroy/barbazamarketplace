import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';
import { createMerchantProduct, deleteMerchantProduct, fetchMerchantCategories, fetchMerchantProducts, updateMerchantProduct } from '../api/EcommerceApi';
import { formatPeso as defaultFormatPeso, resolveProductImage } from '../lib/marketplace';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 10;

const INITIAL_FORM = {
  title: '',
  category: '',
  price: '',
  stock: '',
  lowStockThreshold: '10',
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
});

const MerchantProductsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
        const response = await fetchMerchantProducts({ page, per_page: 24, sort: 'name' });
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
  }, [toast]);

  const loadCategories = useCallback(async () => {
    try {
      const categoryList = await fetchMerchantCategories();
      setCategories(Array.isArray(categoryList) ? categoryList : []);
    } catch (_) {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  const normalizedProducts = useMemo(
    () => products.map((product) => normalizeProduct(product)),
    [products]
  );

  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return normalizedProducts;
    return normalizedProducts.filter((p) =>
      p.displayName.toLowerCase().includes(query) || p.displayCategory.toLowerCase().includes(query)
    );
  }, [normalizedProducts, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const lastPage = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, lastPage);
  const pagedProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openAddDialog = () => {
    setEditingProduct(null);
    setForm(INITIAL_FORM);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setForm({
      title: product?.title || product?.name || '',
      category: product?.category || '',
      price: product?.price != null ? String(product.price) : '',
      stock: product?.stock != null ? String(product.stock) : '',
      lowStockThreshold: product?.low_stock_threshold != null ? String(product.low_stock_threshold) : '10',
      description: product?.description || '',
      imageFile: null,
    });
    setIsFormDialogOpen(true);
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openDeleteDialog = (product) => {
    setDeletingProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.trim();
    const category = form.category.trim();
    const description = form.description.trim();
    const parsedPrice = Number(form.price);
    const parsedStock = Number(form.stock);
    const rawThreshold = String(form.lowStockThreshold ?? '').trim();
    const parsedThreshold = rawThreshold === '' ? 10 : Number(rawThreshold);

    if (!title || !category || Number.isNaN(parsedPrice) || Number.isNaN(parsedStock) || Number.isNaN(parsedThreshold)) {
      toast({
        title: 'Invalid form input',
        description: 'Title, category, price, and stock are required.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      title,
      category,
      price: parsedPrice,
      stock: Math.floor(parsedStock),
      low_stock_threshold: Math.max(0, Math.floor(parsedThreshold)),
      description,
    };

    if (form.imageFile) {
      payload.image = form.imageFile;
    }

    setIsMutating(true);
    try {
      if (editingProduct?.id) {
        const response = await updateMerchantProduct(editingProduct.id, payload);
        const updated = normalizeProduct(response?.product || { ...editingProduct, ...payload });
        setProducts((prev) => prev.map((item) => (item.id === editingProduct.id ? updated : item)));
        toast({ title: 'Product updated', description: `${updated.displayName} has been updated.`, variant: 'success' });
      } else {
        const response = await createMerchantProduct(payload);
        const created = normalizeProduct(response?.product || payload);
        setProducts((prev) => [created, ...prev]);
        toast({ title: 'Product added', description: `${created.displayName} has been created.`, variant: 'success' });
      }

      loadCategories();
      setIsFormDialogOpen(false);
      setForm(INITIAL_FORM);
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
      await deleteMerchantProduct(deletingProduct.id);
      setProducts((prev) => prev.filter((item) => item.id !== deletingProduct.id));
      toast({ title: 'Product deleted', description: `${deletingProduct.displayName} has been removed.`, variant: 'success' });
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
        <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold text-slate-800 sm:text-xl">My Products</CardTitle>
            <p className="text-sm text-slate-500">View products in your store. Product management is currently restricted to administrators.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search products by name or category..."
                className="h-11 rounded-2xl border-slate-200 pl-11 focus:ring-2 focus:ring-[#2954C8]/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#ECF1FA] bg-white shadow-sm lg:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#ECF1FA] bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Price</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {isLoadingProducts ? (
                  <tr><td colSpan="5" className="py-10 text-center text-slate-400 animate-pulse">Loading catalog...</td></tr>
                ) : pagedProducts.length === 0 ? (
                  <tr><td colSpan="5" className="py-20 text-center text-slate-500">No products found.</td></tr>
                ) : (
                  pagedProducts.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100 p-1">
                            {product.displayImage ? (
                              <img src={product.displayImage} alt={product.displayName} className="h-full w-full object-cover rounded-md" />
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
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-slate-200">
                          {product.displayCategory}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{defaultFormatPeso(product.displayAmount)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-600">{product.displayStock} {product.base_unit?.code || 'pc'} in stock</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-medium text-slate-400 italic">View Only</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked product cards in place of the table */}
          <div className="space-y-3 lg:hidden">
            {isLoadingProducts ? (
              <p className="animate-pulse py-10 text-center text-sm text-slate-400">Loading catalog...</p>
            ) : pagedProducts.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No products found.</p>
            ) : (
              pagedProducts.map((product) => (
                <div key={product.id} className="flex gap-3 rounded-2xl border border-[#ECF1FA] bg-white p-3 shadow-sm">
                  <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-slate-100 p-1">
                    {product.displayImage ? (
                      <img src={product.displayImage} alt={product.displayName} className="h-full w-full rounded-md object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-md bg-slate-200 text-[8px] text-slate-400">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{product.displayName}</p>
                        <p className="text-[10px] text-slate-400">ID: {product.id}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-slate-800">{defaultFormatPeso(product.displayAmount)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {product.displayCategory}
                      </Badge>
                      <span className="text-xs font-medium text-slate-600">{product.displayStock} {product.base_unit?.code || 'pc'} in stock</span>
                      <span className="text-[10px] font-medium italic text-slate-400">View Only</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Pagination currentPage={safePage} lastPage={lastPage} hasMore={safePage < lastPage} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details below.' : 'Create a new product for your store.'}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleFormSubmit}>
            <div className="space-y-2">
              <Label htmlFor="merchant-product-title">Product Title</Label>
              <Input
                id="merchant-product-title"
                value={form.title}
                onChange={(event) => updateFormField('title', event.target.value)}
                placeholder="Enter product title"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="merchant-product-category">Category</Label>
                  <button type="button" onClick={() => navigate('/merchant/settings')} className="text-xs font-semibold text-[#2954C8] hover:underline">
                    Manage in Settings
                  </button>
                </div>
                <select
                  id="merchant-product-category"
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

              <div className="space-y-2">
                <Label htmlFor="merchant-product-stock">Stock</Label>
                <Input
                  id="merchant-product-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => updateFormField('stock', event.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant-product-low-stock">Low stock alert at</Label>
              <Input
                id="merchant-product-low-stock"
                type="number"
                min="0"
                step="1"
                value={form.lowStockThreshold}
                onChange={(event) => updateFormField('lowStockThreshold', event.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-slate-500">
                Flag this product as low stock once it falls to this many units. Defaults to 10.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant-product-price">Price</Label>
              <Input
                id="merchant-product-price"
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
              <Label htmlFor="merchant-product-description">Description</Label>
              <textarea
                id="merchant-product-description"
                rows={4}
                value={form.description}
                onChange={(event) => updateFormField('description', event.target.value)}
                placeholder="Short product description"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant-product-image">Image</Label>
              <Input
                id="merchant-product-image"
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

export default MerchantProductsPage;
