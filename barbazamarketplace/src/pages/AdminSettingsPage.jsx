import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Shield, Store, Globe, Tags, Pencil, Trash2, Check, X, UserPlus, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';
import { createCategory, getCategories, updateCategory, deleteCategory, fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../api/EcommerceApi';

const INITIAL_USER_FORM = { name: '', email: '', password: '', password_confirmation: '' };

const AdminSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Admin users
  const [adminUsers, setAdminUsers] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isMutatingUser, setIsMutatingUser] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(INITIAL_USER_FORM);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);

  const loadAdminUsers = useCallback(async () => {
    setIsLoadingAdmins(true);
    try {
      const response = await fetchAdminUsers({ per_page: 100 });
      const all = Array.isArray(response?.users) ? response.users : [];
      setAdminUsers(all.filter((u) => u.is_admin));
    } catch {
      // silently fail — not critical
    } finally {
      setIsLoadingAdmins(false);
    }
  }, []);

  useEffect(() => { loadAdminUsers(); }, [loadAdminUsers]);

  const openAddUserDialog = () => {
    setEditingUser(null);
    setUserForm(INITIAL_USER_FORM);
    setIsUserDialogOpen(true);
  };

  const openEditUserDialog = (user) => {
    setEditingUser(user);
    setUserForm({ name: user.name || '', email: user.email || '', password: '', password_confirmation: '' });
    setIsUserDialogOpen(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const name = userForm.name.trim();
    const email = userForm.email.trim();
    if (!name || !email) {
      toast({ title: 'Missing details', description: 'Name and email are required.', variant: 'destructive' });
      return;
    }
    if (!editingUser && userForm.password.length < 8) {
      toast({ title: 'Weak password', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (userForm.password && userForm.password !== userForm.password_confirmation) {
      toast({ title: 'Password mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    const payload = { name, email, is_admin: true };
    if (!editingUser || userForm.password) {
      payload.password = userForm.password;
      payload.password_confirmation = userForm.password_confirmation;
    }
    setIsMutatingUser(true);
    try {
      if (editingUser?.id) {
        await updateAdminUser(editingUser.id, payload);
        toast({ title: 'Admin updated', description: `${name} has been updated.`, variant: 'success' });
      } else {
        await createAdminUser(payload);
        toast({ title: 'Admin added', description: `${name} has been added as admin.`, variant: 'success' });
      }
      setIsUserDialogOpen(false);
      await loadAdminUsers();
    } catch (error) {
      toast({ title: 'Failed to save', description: error?.message || 'Unable to save admin user.', variant: 'destructive' });
    } finally {
      setIsMutatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser?.id) return;
    setIsMutatingUser(true);
    try {
      await deleteAdminUser(deletingUser.id);
      toast({ title: 'Admin removed', description: `${deletingUser.name} has been removed.`, variant: 'success' });
      setIsDeleteUserDialogOpen(false);
      setDeletingUser(null);
      await loadAdminUsers();
    } catch (error) {
      toast({ title: 'Delete failed', description: error?.message || 'Unable to remove admin.', variant: 'destructive' });
    } finally {
      setIsMutatingUser(false);
    }
  };

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

  const handleStartEdit = (category) => {
    setEditingCategory(category);
    setEditValue(category);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  const handleSaveEdit = async (oldName) => {
    const newName = editValue.trim();
    if (!newName) return;
    if (newName === oldName) {
      handleCancelEdit();
      return;
    }

    try {
      const response = await updateCategory(oldName, { name: newName });
      const updatedCategories = Array.isArray(response?.categories)
        ? response.categories
        : categories.map((c) => (c === oldName ? newName : c));
      setCategories(updatedCategories);
      setEditingCategory(null);
      setEditValue('');
      toast({ title: 'Category updated', description: `Renamed to "${newName}".`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Unable to update category', description: error?.message || 'Failed to update category.', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (name) => {
    setDeletingCategory(name);
    try {
      const response = await deleteCategory(name);
      const updatedCategories = Array.isArray(response?.categories)
        ? response.categories
        : categories.filter((c) => c !== name);
      setCategories(updatedCategories);
      toast({ title: 'Category deleted', description: `"${name}" has been removed.`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Unable to delete category', description: error?.message || 'Failed to delete category.', variant: 'destructive' });
    } finally {
      setDeletingCategory(null);
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg">Security & Access</CardTitle>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl bg-[#2954C8] text-xs" onClick={openAddUserDialog}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Admin
                </Button>
              </div>
              <CardDescription>Manage administrator accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingAdmins ? (
                <p className="text-xs text-slate-400 animate-pulse">Loading admins...</p>
              ) : adminUsers.length === 0 ? (
                <p className="text-xs text-slate-400">No admin users found.</p>
              ) : (
                adminUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                        {user.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{user.name}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white text-[10px]">Admin</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditUserDialog(user)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => { setDeletingUser(user); setIsDeleteUserDialogOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Category</CardTitle>
              </div>
              <CardDescription>Create and manage category names for products. Categories you add here apply to all stores and appear in every merchant's category list.</CardDescription>
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
                      editingCategory === category ? (
                        <span key={category} className="flex items-center gap-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(category); if (e.key === 'Escape') handleCancelEdit(); }}
                            className="h-7 w-36 rounded-lg border-slate-300 px-2 text-xs"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(category)} className="text-emerald-600 hover:text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : (
                        <Badge key={category} variant="outline" className="group flex items-center gap-1 border-slate-300 pr-1 text-slate-600">
                          {category}
                          <button
                            onClick={() => handleStartEdit(category)}
                            className="ml-0.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            disabled={deletingCategory === category}
                            className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
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
      {/* Add / Edit Admin Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Admin' : 'Add Admin'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update admin account details.' : 'Create a new administrator account.'}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUserSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name</Label>
              <Input id="admin-name" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} placeholder="name@example.com" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password {editingUser ? '(optional)' : ''}</Label>
                <Input id="admin-password" type="password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} placeholder={editingUser ? 'Leave blank to keep' : 'Min. 8 characters'} required={!editingUser} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-confirm">Confirm Password</Label>
                <Input id="admin-confirm" type="password" value={userForm.password_confirmation} onChange={(e) => setUserForm((p) => ({ ...p, password_confirmation: e.target.value }))} placeholder="Repeat password" required={!editingUser || userForm.password.length > 0} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)} disabled={isMutatingUser}>Cancel</Button>
              <Button type="submit" className="bg-[#2954C8]" disabled={isMutatingUser}>
                {isMutatingUser ? 'Saving...' : editingUser ? 'Update Admin' : 'Create Admin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Dialog */}
      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Admin</DialogTitle>
            <DialogDescription>
              {deletingUser ? `Are you sure you want to remove "${deletingUser.name}" as admin? This cannot be undone.` : 'Are you sure?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)} disabled={isMutatingUser}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDeleteUser} disabled={isMutatingUser}>
              {isMutatingUser ? 'Removing...' : 'Remove Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettingsPage;
