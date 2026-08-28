import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Store, Tags } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { createMerchantCategory, fetchMerchantCategories, fetchMerchantStore, updateMerchantStore } from '../api/EcommerceApi';

const EMPTY_STORE_FORM = {
  name: '',
  slug: '',
  description: '',
  contact_email: '',
  contact_phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  province: '',
  postal_code: '',
  country: '',
  logo_image: '',
  cover_image: '',
  logo_image_file: null,
  cover_image_file: null,
  status: 'active',
};

const MerchantSettingsPage = () => {
  const { toast } = useToast();
  const [storeForm, setStoreForm] = useState(EMPTY_STORE_FORM);
  const [loadingStore, setLoadingStore] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const loadStore = useCallback(async () => {
    setLoadingStore(true);
    try {
      const response = await fetchMerchantStore();
      const store = response?.store || {};
      setStoreForm({
        name: store?.name || '',
        slug: store?.slug || '',
        description: store?.description || '',
        contact_email: store?.contact_email || '',
        contact_phone: store?.contact_phone || '',
        address_line_1: store?.address_line_1 || '',
        address_line_2: store?.address_line_2 || '',
        city: store?.city || '',
        province: store?.province || '',
        postal_code: store?.postal_code || '',
        country: store?.country || '',
        logo_image: store?.logo_image || '',
        cover_image: store?.cover_image || '',
        logo_image_file: null,
        cover_image_file: null,
        status: store?.status || 'active',
      });
    } catch (error) {
      toast({
        title: 'Unable to load store settings',
        description: error?.message || 'Failed to fetch merchant store profile.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStore(false);
    }
  }, [toast]);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const response = await fetchMerchantCategories();
      setCategories(Array.isArray(response) ? response : []);
    } catch (error) {
      setCategories([]);
      toast({
        title: 'Unable to load categories',
        description: error?.message || 'Failed to fetch category options.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStore();
    loadCategories();
  }, [loadStore, loadCategories]);

  const sortedCategories = useMemo(
    () =>
      Array.from(new Set(categories.map((category) => String(category || '').trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [categories]
  );

  const handleSaveStore = async (event) => {
    event.preventDefault();
    setSavingStore(true);
    try {
      const optionalValue = (value) => {
        const normalized = String(value || '').trim();
        return normalized || undefined;
      };

      const payload = {
        name: storeForm.name.trim(),
        slug: optionalValue(storeForm.slug),
        description: optionalValue(storeForm.description),
        contact_email: optionalValue(storeForm.contact_email),
        contact_phone: optionalValue(storeForm.contact_phone),
        address_line_1: optionalValue(storeForm.address_line_1),
        address_line_2: optionalValue(storeForm.address_line_2),
        city: optionalValue(storeForm.city),
        province: optionalValue(storeForm.province),
        postal_code: optionalValue(storeForm.postal_code),
        country: optionalValue(storeForm.country),
      };
      if (storeForm.logo_image_file instanceof File) {
        payload.logo_image_file = storeForm.logo_image_file;
      }
      if (storeForm.cover_image_file instanceof File) {
        payload.cover_image_file = storeForm.cover_image_file;
      }
      const response = await updateMerchantStore(payload);
      const store = response?.store || {};
      setStoreForm({
        name: store?.name || payload.name,
        slug: store?.slug ?? payload.slug ?? '',
        description: store?.description ?? payload.description ?? '',
        contact_email: store?.contact_email ?? payload.contact_email ?? '',
        contact_phone: store?.contact_phone ?? payload.contact_phone ?? '',
        address_line_1: store?.address_line_1 ?? payload.address_line_1 ?? '',
        address_line_2: store?.address_line_2 ?? payload.address_line_2 ?? '',
        city: store?.city ?? payload.city ?? '',
        province: store?.province ?? payload.province ?? '',
        postal_code: store?.postal_code ?? payload.postal_code ?? '',
        country: store?.country ?? payload.country ?? '',
        logo_image: store?.logo_image ?? storeForm.logo_image ?? '',
        cover_image: store?.cover_image ?? storeForm.cover_image ?? '',
        logo_image_file: null,
        cover_image_file: null,
        status: store?.status || storeForm.status,
      });
      toast({
        title: 'Store updated',
        description: 'Merchant store profile has been saved.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Unable to save store profile',
        description: error?.message || 'Failed to update store profile.',
        variant: 'destructive',
      });
    } finally {
      setSavingStore(false);
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();

    const name = newCategoryName.trim();
    if (!name) {
      toast({
        title: 'Category is required',
        description: 'Enter a category name before adding it.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingCategory(true);
    try {
      const response = await createMerchantCategory({ name });
      const updatedCategories = Array.isArray(response?.categories) ? response.categories : [...sortedCategories, name];
      setCategories(updatedCategories);
      setNewCategoryName('');
      toast({
        title: 'Category saved',
        description: `${name} is now available for your store products.`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Unable to add category',
        description: error?.message || 'Failed to create category.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">Merchant Settings</h2>
        <p className="text-sm text-slate-500">Manage your store profile and product categories.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Store Profile</CardTitle>
              </div>
              <CardDescription>Basic details for your merchant storefront profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={handleSaveStore}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Store Name</label>
                  <Input
                    value={storeForm.name}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="rounded-xl border-slate-200"
                    disabled={loadingStore || savingStore}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Store Slug</label>
                  <Input
                    value={storeForm.slug}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, slug: event.target.value }))}
                    className="rounded-xl border-slate-200"
                    disabled={loadingStore || savingStore}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                  <textarea
                    className="w-full h-24 rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={storeForm.description}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, description: event.target.value }))}
                    disabled={loadingStore || savingStore}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Contact Email</label>
                    <Input
                      type="email"
                      value={storeForm.contact_email}
                      onChange={(event) => setStoreForm((prev) => ({ ...prev, contact_email: event.target.value }))}
                      className="rounded-xl border-slate-200"
                      disabled={loadingStore || savingStore}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Contact Phone</label>
                    <Input
                      value={storeForm.contact_phone}
                      onChange={(event) => setStoreForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
                      className="rounded-xl border-slate-200"
                      disabled={loadingStore || savingStore}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Address Line 1</label>
                  <Input
                    value={storeForm.address_line_1}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, address_line_1: event.target.value }))}
                    className="rounded-xl border-slate-200"
                    disabled={loadingStore || savingStore}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Address Line 2</label>
                  <Input
                    value={storeForm.address_line_2}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, address_line_2: event.target.value }))}
                    className="rounded-xl border-slate-200"
                    disabled={loadingStore || savingStore}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">City</label>
                    <Input
                      value={storeForm.city}
                      onChange={(event) => setStoreForm((prev) => ({ ...prev, city: event.target.value }))}
                      className="rounded-xl border-slate-200"
                      disabled={loadingStore || savingStore}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Province</label>
                    <Input
                      value={storeForm.province}
                      onChange={(event) => setStoreForm((prev) => ({ ...prev, province: event.target.value }))}
                      className="rounded-xl border-slate-200"
                      disabled={loadingStore || savingStore}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Postal Code</label>
                    <Input
                      value={storeForm.postal_code}
                      onChange={(event) => setStoreForm((prev) => ({ ...prev, postal_code: event.target.value }))}
                      className="rounded-xl border-slate-200"
                      disabled={loadingStore || savingStore}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
                    <Input
                      value={storeForm.country}
                      onChange={(event) => setStoreForm((prev) => ({ ...prev, country: event.target.value }))}
                      className="rounded-xl border-slate-200"
                      disabled={loadingStore || savingStore}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Logo Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setStoreForm((prev) => ({
                        ...prev,
                        logo_image_file: event.target.files?.[0] || null,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-[#2954C8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20 disabled:cursor-not-allowed"
                    disabled={loadingStore || savingStore}
                  />
                  {storeForm.logo_image ? (
                    <p className="text-xs text-slate-500">Current: {storeForm.logo_image}</p>
                  ) : null}
                  {storeForm.logo_image_file ? (
                    <p className="text-xs text-slate-500">Selected: {storeForm.logo_image_file.name}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cover Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setStoreForm((prev) => ({
                        ...prev,
                        cover_image_file: event.target.files?.[0] || null,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-[#2954C8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20 disabled:cursor-not-allowed"
                    disabled={loadingStore || savingStore}
                  />
                  {storeForm.cover_image ? (
                    <p className="text-xs text-slate-500">Current: {storeForm.cover_image}</p>
                  ) : null}
                  {storeForm.cover_image_file ? (
                    <p className="text-xs text-slate-500">Selected: {storeForm.cover_image_file.name}</p>
                  ) : null}
                </div>

                <Button type="submit" className="w-full gap-2 rounded-xl bg-blue-600 shadow-lg" disabled={loadingStore || savingStore}>
                  <Save className="h-4 w-4" />
                  {savingStore ? 'Saving...' : 'Save Store Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Categories</CardTitle>
              </div>
              <CardDescription>Categories set by the administrator apply to every store and appear here automatically. You can add your own on top of those.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCreateCategory}>
                <Input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="e.g. Beverages"
                  className="rounded-xl border-slate-200"
                  disabled={isSavingCategory}
                />
                <Button type="submit" className="rounded-xl bg-[#2954C8]" disabled={isSavingCategory}>
                  {isSavingCategory ? 'Adding...' : 'Add Category'}
                </Button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Available Categories</p>
                <p className="mt-1 text-[11px] text-slate-400">Includes store-wide categories from the administrator.</p>
                {isLoadingCategories ? (
                  <p className="mt-2 text-xs text-slate-400">Loading categories...</p>
                ) : sortedCategories.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">No categories added yet.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sortedCategories.map((category) => (
                      <Badge key={category} variant="outline" className="border-slate-300 text-slate-600">
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none bg-[#2954C8] text-white shadow-xl">
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">Store status</p>
              <p className="mt-3 text-lg font-bold">{storeForm.status || 'active'}</p>
              <p className="mt-2 text-xs text-white/70">
                Access to the merchant portal depends on your store remaining active.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MerchantSettingsPage;
