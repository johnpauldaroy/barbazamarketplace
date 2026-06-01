import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Store, UserPlus, Edit, Power } from 'lucide-react';
import Pagination from '../components/ui/Pagination';
const PAGE_SIZE = 10;
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';
import { createAdminStore, createStoreMerchant, deactivateAdminStore, fetchAdminStores, updateAdminStore } from '../api/EcommerceApi';

const INITIAL_STORE_FORM = {
  name: '',
  slug: '',
  status: 'active',
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
  facebook_url: '',
};

const INITIAL_MERCHANT_FORM = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
};

const AdminStoresPage = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeForm, setStoreForm] = useState(INITIAL_STORE_FORM);
  const [isMerchantDialogOpen, setIsMerchantDialogOpen] = useState(false);
  const [merchantStore, setMerchantStore] = useState(null);
  const [merchantForm, setMerchantForm] = useState(INITIAL_MERCHANT_FORM);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchAdminStores();
      const storeList = Array.isArray(response?.stores) ? response.stores : [];
      setStores(storeList);
    } catch (error) {
      toast({
        title: 'Unable to load stores',
        description: error?.message || 'Failed to fetch stores.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const [currentPage, setCurrentPage] = useState(1);

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return stores;
    return stores.filter((store) =>
      [store?.name, store?.slug, store?.description].filter(Boolean).join(' ').toLowerCase().includes(query)
    );
  }, [stores, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const lastPage = Math.max(1, Math.ceil(filteredStores.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, lastPage);
  const pagedStores = filteredStores.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openAddStoreDialog = () => {
    setEditingStore(null);
    setStoreForm(INITIAL_STORE_FORM);
    setIsStoreDialogOpen(true);
  };

  const openEditStoreDialog = (store) => {
    setEditingStore(store);
    setStoreForm({
      name: store?.name || '',
      slug: store?.slug || '',
      status: store?.status || 'active',
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
      facebook_url: store?.facebook_url || '',
    });
    setIsStoreDialogOpen(true);
  };

  const openMerchantDialog = (store) => {
    setMerchantStore(store);
    setMerchantForm(INITIAL_MERCHANT_FORM);
    setIsMerchantDialogOpen(true);
  };

  const handleStoreSubmit = async (event) => {
    event.preventDefault();

    const optionalValue = (value) => {
      const normalized = String(value || '').trim();
      return normalized || undefined;
    };

    const payload = {
      name: storeForm.name.trim(),
      slug: optionalValue(storeForm.slug),
      status: storeForm.status,
      description: optionalValue(storeForm.description),
      contact_email: optionalValue(storeForm.contact_email),
      contact_phone: optionalValue(storeForm.contact_phone),
      address_line_1: optionalValue(storeForm.address_line_1),
      address_line_2: optionalValue(storeForm.address_line_2),
      city: optionalValue(storeForm.city),
      province: optionalValue(storeForm.province),
      postal_code: optionalValue(storeForm.postal_code),
      country: optionalValue(storeForm.country),
      facebook_url: optionalValue(storeForm.facebook_url),
    };
    if (storeForm.logo_image_file instanceof File) {
      payload.logo_image_file = storeForm.logo_image_file;
    }
    if (storeForm.cover_image_file instanceof File) {
      payload.cover_image_file = storeForm.cover_image_file;
    }

    setIsMutating(true);
    try {
      if (editingStore?.id) {
        await updateAdminStore(editingStore.id, payload);
        toast({ title: 'Store updated', description: `${payload.name} has been updated.`, variant: 'success' });
      } else {
        await createAdminStore(payload);
        toast({ title: 'Store created', description: `${payload.name} has been created.`, variant: 'success' });
      }

      setIsStoreDialogOpen(false);
      setEditingStore(null);
      setStoreForm(INITIAL_STORE_FORM);
      await loadStores();
    } catch (error) {
      toast({
        title: editingStore ? 'Update failed' : 'Create failed',
        description: error?.message || 'Unable to save store.',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleMerchantSubmit = async (event) => {
    event.preventDefault();
    if (!merchantStore?.id) return;

    setIsMutating(true);
    try {
      await createStoreMerchant(merchantStore.id, merchantForm);
      toast({
        title: 'Merchant created',
        description: `${merchantForm.name} has been assigned to ${merchantStore.name}.`,
        variant: 'success',
      });
      setIsMerchantDialogOpen(false);
      setMerchantStore(null);
      setMerchantForm(INITIAL_MERCHANT_FORM);
      await loadStores();
    } catch (error) {
      toast({
        title: 'Unable to create merchant',
        description: error?.message || 'Failed to create merchant account.',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeactivateStore = async (store) => {
    setIsMutating(true);
    try {
      await deactivateAdminStore(store.id);
      toast({
        title: 'Store deactivated',
        description: `${store.name} is now inactive.`,
        variant: 'success',
      });
      await loadStores();
    } catch (error) {
      toast({
        title: 'Unable to deactivate store',
        description: error?.message || 'Failed to update store status.',
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
            <CardTitle className="text-xl font-bold text-slate-800">Store Management</CardTitle>
            <p className="text-sm text-slate-500">Create stores and provision merchant accounts.</p>
          </div>
          <Button className="gap-2 text-xs font-bold rounded-xl bg-[#2954C8]" onClick={openAddStoreDialog}>
            <Store className="h-4 w-4" />
            Add Store
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search stores by name, slug, or description..."
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
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Store</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Merchants</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {loading ? (
                  <tr><td colSpan="4" className="py-10 text-center text-slate-400 animate-pulse">Loading stores...</td></tr>
                ) : pagedStores.length === 0 ? (
                  <tr><td colSpan="4" className="py-20 text-center text-slate-500">No stores found.</td></tr>
                ) : (
                  pagedStores.map((store) => (
                    <tr key={store.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{store.name}</p>
                        <p className="text-[10px] text-slate-400">{store.slug}</p>
                        <p className="text-xs text-slate-500 mt-1">{store.description || 'No description'}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {[store.city, store.province, store.country].filter(Boolean).join(', ') || 'No location'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {store.contact_email || 'No email'} {store.contact_phone ? `| ${store.contact_phone}` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={store.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}>
                          {store.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-700">{store.merchant_count || 0}</p>
                        {Array.isArray(store.merchants) && store.merchants.length > 0 && (
                          <p className="text-[11px] text-slate-500">{store.merchants.map((merchant) => merchant.name).join(', ')}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditStoreDialog(store)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => openMerchantDialog(store)}>
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeactivateStore(store)} disabled={isMutating || store.status === 'inactive'}>
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={safePage} lastPage={lastPage} hasMore={safePage < lastPage} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStore ? 'Edit Store' : 'Add Store'}</DialogTitle>
            <DialogDescription>
              {editingStore ? 'Update store details.' : 'Create a new merchant store.'}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleStoreSubmit}>
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input id="store-name" value={storeForm.name} onChange={(event) => setStoreForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-slug">Store Slug (optional)</Label>
              <Input id="store-slug" value={storeForm.slug} onChange={(event) => setStoreForm((prev) => ({ ...prev, slug: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-status">Status</Label>
              <select
                id="store-status"
                value={storeForm.status}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, status: event.target.value }))}
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-description">Description</Label>
              <textarea
                id="store-description"
                rows={4}
                value={storeForm.description}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store-contact-email">Contact Email</Label>
                <Input
                  id="store-contact-email"
                  type="email"
                  value={storeForm.contact_email}
                  onChange={(event) => setStoreForm((prev) => ({ ...prev, contact_email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-contact-phone">Contact Phone</Label>
                <Input
                  id="store-contact-phone"
                  value={storeForm.contact_phone}
                  onChange={(event) => setStoreForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-facebook-url">Facebook / Messenger Link</Label>
              <Input
                id="store-facebook-url"
                type="url"
                placeholder="https://facebook.com/yourpage or https://m.me/yourpage"
                value={storeForm.facebook_url}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, facebook_url: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-address-line-1">Address Line 1</Label>
              <Input
                id="store-address-line-1"
                value={storeForm.address_line_1}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, address_line_1: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-address-line-2">Address Line 2</Label>
              <Input
                id="store-address-line-2"
                value={storeForm.address_line_2}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, address_line_2: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store-city">City</Label>
                <Input
                  id="store-city"
                  value={storeForm.city}
                  onChange={(event) => setStoreForm((prev) => ({ ...prev, city: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-province">Province</Label>
                <Input
                  id="store-province"
                  value={storeForm.province}
                  onChange={(event) => setStoreForm((prev) => ({ ...prev, province: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store-postal-code">Postal Code</Label>
                <Input
                  id="store-postal-code"
                  value={storeForm.postal_code}
                  onChange={(event) => setStoreForm((prev) => ({ ...prev, postal_code: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-country">Country</Label>
                <Input
                  id="store-country"
                  value={storeForm.country}
                  onChange={(event) => setStoreForm((prev) => ({ ...prev, country: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-logo-image">Logo Image</Label>
              <input
                id="store-logo-image"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setStoreForm((prev) => ({
                    ...prev,
                    logo_image_file: event.target.files?.[0] || null,
                  }))
                }
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-[#2954C8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
              />
              {storeForm.logo_image ? (
                <p className="text-xs text-slate-500">Current: {storeForm.logo_image}</p>
              ) : null}
              {storeForm.logo_image_file ? (
                <p className="text-xs text-slate-500">Selected: {storeForm.logo_image_file.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-cover-image">Cover Image</Label>
              <input
                id="store-cover-image"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setStoreForm((prev) => ({
                    ...prev,
                    cover_image_file: event.target.files?.[0] || null,
                  }))
                }
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-[#2954C8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
              />
              {storeForm.cover_image ? (
                <p className="text-xs text-slate-500">Current: {storeForm.cover_image}</p>
              ) : null}
              {storeForm.cover_image_file ? (
                <p className="text-xs text-slate-500">Selected: {storeForm.cover_image_file.name}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStoreDialogOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#2954C8]" disabled={isMutating}>
                {isMutating ? 'Saving...' : editingStore ? 'Update Store' : 'Create Store'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMerchantDialogOpen} onOpenChange={setIsMerchantDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Provision Merchant</DialogTitle>
            <DialogDescription>
              Create a merchant account for {merchantStore?.name || 'selected store'}.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleMerchantSubmit}>
            <div className="space-y-2">
              <Label htmlFor="merchant-name">Name</Label>
              <Input id="merchant-name" value={merchantForm.name} onChange={(event) => setMerchantForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant-email">Email</Label>
              <Input id="merchant-email" type="email" value={merchantForm.email} onChange={(event) => setMerchantForm((prev) => ({ ...prev, email: event.target.value }))} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="merchant-password">Password</Label>
                <Input id="merchant-password" type="password" value={merchantForm.password} onChange={(event) => setMerchantForm((prev) => ({ ...prev, password: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchant-password-confirmation">Confirm Password</Label>
                <Input id="merchant-password-confirmation" type="password" value={merchantForm.password_confirmation} onChange={(event) => setMerchantForm((prev) => ({ ...prev, password_confirmation: event.target.value }))} required />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMerchantDialogOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#2954C8]" disabled={isMutating}>
                {isMutating ? 'Saving...' : 'Create Merchant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStoresPage;
