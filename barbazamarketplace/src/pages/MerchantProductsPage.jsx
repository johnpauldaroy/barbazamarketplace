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

const INITIAL_FORM = {
  title: '',
  category: '',
  price: '',
  stock: '',
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

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return normalizedProducts;

    return normalizedProducts.filter((product) => (
      product.displayName.toLowerCase().includes(query) ||
      product.displayCategory.toLowerCase().includes(query)
    ));
  }, [normalizedProducts, searchQuery]);

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

    if (!title || !category || Number.isNaN(parsedPrice) || Number.isNaN(parsedStock)) {
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">My Products</CardTitle>
            <p className="text-sm text-slate-500">Manage products in your own merchant store.</p>
          </div>
          <Button className="gap-2 text-xs font-bold rounded-xl bg-[#2954C8]" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search products by name or category..."
                className="h-11 rounded-2xl border-slate-200 pl-11 focus:ring-2 focus:ring-[#2954C8]/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#ECF1FA] bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#ECF1FA] bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Price</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {isLoadingProducts ? (
                  <tr><td colSpan="5" className="py-10 text-center text-slate-400 animate-pulse">Loading catalog...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="5" className="py-20 text-center text-slate-500">No products found.</td></tr>
                ) : (
                  filteredProducts.map((product) => (
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
                        <p className="text-xs font-medium text-slate-600">{product.displayStock} in stock</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditDialog(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => openDeleteDialog(product)}>
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

