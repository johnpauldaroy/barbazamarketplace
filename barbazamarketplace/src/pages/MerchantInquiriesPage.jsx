import React, { useCallback, useEffect, useState } from 'react';
import { Filter, MessageSquare } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';
import { fetchMerchantInquiries, updateMerchantInquiryStatus } from '../api/EcommerceApi';

const statusLabel = (value) =>
  String(value || 'open').replace(/^\w/, (char) => char.toUpperCase());

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No timestamp';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const MerchantInquiriesPage = () => {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('open');
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchMerchantInquiries({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: 1,
        per_page: 50,
      });
      setInquiries(Array.isArray(response?.inquiries) ? response.inquiries : []);
    } catch (error) {
      toast({
        title: 'Unable to load inquiries',
        description: error?.message || 'Failed to fetch seller inquiries.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleStatusChange = async (inquiryId, nextStatus) => {
    setUpdatingId(inquiryId);
    try {
      const response = await updateMerchantInquiryStatus(inquiryId, nextStatus);
      const updatedInquiry = response?.inquiry;
      if (updatedInquiry?.id) {
        setInquiries((currentInquiries) =>
          currentInquiries.map((inquiry) => (inquiry.id === updatedInquiry.id ? updatedInquiry : inquiry))
        );
      } else {
        await loadInquiries();
      }

      toast({
        title: 'Inquiry updated',
        description: `Inquiry #${inquiryId} is now ${statusLabel(nextStatus)}.`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Unable to update inquiry',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
      await loadInquiries();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Seller Inquiries</CardTitle>
            <p className="text-sm text-slate-500">Manage customer inquiries submitted from your store page.</p>
          </div>
          <label className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
            <Filter className="mr-2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </label>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-[#ECF1FA] bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#ECF1FA] bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Inquiry</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Message</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      Loading inquiries...
                    </td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center text-slate-500">
                      No inquiries found for this filter.
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">#{inquiry.id}</p>
                        <p className="text-[10px] text-slate-400">{formatDateTime(inquiry.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700">{inquiry.name}</p>
                        <p className="text-[11px] text-slate-500">{inquiry.email}</p>
                        <p className="text-[11px] text-slate-400">{inquiry.phone || 'No phone'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="max-w-[420px] text-xs text-slate-600">{inquiry.message}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={inquiry.status === 'resolved' ? 'success' : 'warning'}>
                          {statusLabel(inquiry.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={updatingId === inquiry.id}
                          onClick={() =>
                            handleStatusChange(
                              inquiry.id,
                              inquiry.status === 'resolved' ? 'open' : 'resolved'
                            )
                          }
                        >
                          <MessageSquare className="h-4 w-4" />
                          {updatingId === inquiry.id
                            ? 'Updating...'
                            : inquiry.status === 'resolved'
                              ? 'Reopen'
                              : 'Resolve'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantInquiriesPage;
