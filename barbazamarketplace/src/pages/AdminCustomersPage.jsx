import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Pagination from '../components/ui/Pagination';
const PAGE_SIZE = 10;
import { Search, UserPlus, Mail, Shield, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';
import { createAdminUser, deleteAdminUser, fetchAdminUsers, updateAdminUser } from '../api/EcommerceApi';

const INITIAL_FORM = {
  name: '',
  email: '',
  role: 'member',
  password: '',
  password_confirmation: '',
};

const formatJoinDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const AdminCustomersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let page = 1;
      let hasMore = true;
      const allUsers = [];

      while (hasMore) {
        const response = await fetchAdminUsers({ page, per_page: 50 });
        const pageUsers = Array.isArray(response?.users) ? response.users : [];
        allUsers.push(...pageUsers);
        hasMore = Boolean(response?.meta?.has_more_pages);
        page += 1;
      }

      setUsers(allUsers);
    } catch (error) {
      toast({
        title: 'Unable to load users',
        description: error?.message || 'Failed to fetch customer directory.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const [currentPage, setCurrentPage] = useState(1);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user?.name, user?.email].filter(Boolean).join(' ').toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const lastPage = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, lastPage);
  const pagedCustomers = filteredCustomers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openAddDialog = () => {
    setEditingUser(null);
    setForm(INITIAL_FORM);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      role: user?.is_admin ? 'admin' : 'member',
      password: '',
      password_confirmation: '',
    });
    setIsFormDialogOpen(true);
  };

  const openDeleteDialog = (user) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const role = form.role === 'admin';
    const password = form.password;
    const passwordConfirmation = form.password_confirmation;

    if (!name || !email) {
      toast({
        title: 'Missing details',
        description: 'Name and email are required.',
        variant: 'destructive',
      });
      return;
    }

    if (!editingUser && password.length < 8) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    if ((!editingUser && password) || (editingUser && password.length > 0)) {
      if (password !== passwordConfirmation) {
        toast({
          title: 'Password mismatch',
          description: 'Password confirmation does not match.',
          variant: 'destructive',
        });
        return;
      }
      if (password.length < 8) {
        toast({
          title: 'Weak password',
          description: 'Password must be at least 8 characters.',
          variant: 'destructive',
        });
        return;
      }
    }

    const payload = {
      name,
      email,
      is_admin: role,
    };

    if (!editingUser || password.length > 0) {
      payload.password = password;
      payload.password_confirmation = passwordConfirmation;
    }

    setIsMutating(true);
    try {
      if (editingUser?.id) {
        await updateAdminUser(editingUser.id, payload);
        toast({
          title: 'User updated',
          description: `${name} has been updated.`,
          variant: 'success',
        });
      } else {
        await createAdminUser(payload);
        toast({
          title: 'User created',
          description: `${name} has been added.`,
          variant: 'success',
        });
      }

      setIsFormDialogOpen(false);
      setEditingUser(null);
      setForm(INITIAL_FORM);
      await loadUsers();
    } catch (error) {
      toast({
        title: editingUser ? 'Update failed' : 'Create failed',
        description: error?.message || 'Unable to save user.',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser?.id) return;

    setIsMutating(true);
    try {
      await deleteAdminUser(deletingUser.id);
      toast({
        title: 'User deleted',
        description: `${deletingUser.name} has been removed.`,
        variant: 'success',
      });
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
      await loadUsers();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Unable to delete user.',
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
            <CardTitle className="text-xl font-bold text-slate-800">Customer Management</CardTitle>
            <p className="text-sm text-slate-500">View and manage registered marketplace users</p>
          </div>
          <Button className="gap-2 text-xs font-bold rounded-xl bg-[#2954C8]" onClick={openAddDialog}>
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
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
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Joined</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {loading ? (
                   <tr><td colSpan="5" className="py-10 text-center text-slate-400 animate-pulse">Loading directory...</td></tr>
                ) : pagedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center text-slate-500">No users found.</td>
                  </tr>
                ) : (
                  pagedCustomers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-[#2954C8] font-bold text-xs uppercase">
                            {user.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{user.name}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-bold uppercase tracking-wider">Active</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <Shield className="h-3.5 w-3.5 text-slate-400" />
                          {user.is_admin ? 'Admin' : 'Member'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-medium text-slate-500">{formatJoinDate(user.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => openDeleteDialog(user)}
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
          <Pagination currentPage={safePage} lastPage={lastPage} hasMore={safePage < lastPage} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update account information and role.' : 'Create a new marketplace user account.'}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(event) => updateFormField('name', event.target.value)}
                placeholder="Full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(event) => updateFormField('email', event.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-role">Role</Label>
              <select
                id="customer-role"
                value={form.role}
                onChange={(event) => updateFormField('role', event.target.value)}
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-password">Password {editingUser ? '(optional)' : ''}</Label>
                <Input
                  id="customer-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateFormField('password', event.target.value)}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Minimum 8 characters'}
                  required={!editingUser}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-password-confirmation">Confirm Password</Label>
                <Input
                  id="customer-password-confirmation"
                  type="password"
                  value={form.password_confirmation}
                  onChange={(event) => updateFormField('password_confirmation', event.target.value)}
                  placeholder="Repeat password"
                  required={!editingUser || form.password.length > 0}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#2954C8]" disabled={isMutating}>
                {isMutating ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              {deletingUser
                ? `Are you sure you want to delete "${deletingUser.name}"? This action cannot be undone.`
                : 'Are you sure you want to delete this user?'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isMutating}>
              {isMutating ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomersPage;
