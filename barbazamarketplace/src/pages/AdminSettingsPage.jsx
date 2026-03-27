import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Shield, Store, Globe, Tags } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { createCategory, getCategories } from '../api/EcommerceApi';

const AdminSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const response = await getCategories();
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
    loadCategories();
  }, [loadCategories]);

  const sortedCategories = useMemo(
    () =>
      Array.from(new Set(categories.map((category) => String(category || '').trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [categories]
  );

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
      const response = await createCategory({ name });
      const updatedCategories = Array.isArray(response?.categories) ? response.categories : [...sortedCategories, name];

      setCategories(updatedCategories);
      setNewCategoryName('');
      toast({
        title: 'Category saved',
        description: `${name} is now available for products.`,
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
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-sm text-slate-500">Configure marketplace preferences and security</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">General Settings</CardTitle>
              </div>
              <CardDescription>Basic information about your marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Marketplace Name</label>
                  <Input defaultValue="Barbaza MPC Marketplace" className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Support Email</label>
                  <Input defaultValue="support@barbazampc.com" className="rounded-xl border-slate-200" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">About Marketplace</label>
                <textarea 
                  className="w-full h-24 rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  defaultValue="Trusted products from community producers."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">Security & Access</CardTitle>
              </div>
              <CardDescription>Manage administrator roles and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">M</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">mutya (Primary Admin)</p>
                    <p className="text-[10px] text-slate-500">Full Access Control</p>
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white">Owner</Badge>
              </div>
              <Button variant="outline" className="w-full rounded-xl border-slate-200 text-xs font-bold">Manage Permissions</Button>
            </CardContent>
          </Card>

          <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Category</CardTitle>
              </div>
              <CardDescription>Create and manage category names for products.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCreateCategory}>
                <Input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="e.g. Fruits"
                  className="rounded-xl border-slate-200"
                  disabled={isSavingCategory}
                />
                <Button type="submit" className="rounded-xl bg-[#2954C8]" disabled={isSavingCategory}>
                  {isSavingCategory ? 'Adding...' : 'Add Category'}
                </Button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Available Categories</p>
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

              <Button
                variant="outline"
                className="w-full rounded-xl border-slate-200 text-xs font-bold"
                onClick={() => navigate('/admin/products')}
              >
                Open Product Categories
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none bg-[#2954C8] text-white shadow-xl">
            <CardContent className="p-6">
              <Globe className="h-8 w-8 text-white/50" />
              <h3 className="mt-4 text-lg font-bold">Public Status</h3>
              <p className="mt-2 text-xs text-white/70 text-balance leading-relaxed">Your marketplace is currently live and accepting orders globally.</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Operational</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button className="w-full gap-2 rounded-xl bg-blue-600 shadow-lg">
              <Save className="h-4 w-4" />
              Save All Changes
            </Button>
            <Button variant="ghost" className="w-full text-xs font-bold text-slate-400">Discard Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
