import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import { fetchOrderFeedbackLink, submitOrderFeedback } from '../api/EcommerceApi';

const StarRow = ({ value = 0, onSelect, disabled }) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const rating = i + 1;
        const active = rating <= value;
        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(rating)}
            className={`p-0 border-0 bg-transparent transition ${
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } ${active ? 'text-amber-400' : 'text-slate-200'}`}
            aria-label={`Rate ${rating}`}
          >
            <Star className={`h-6 w-6 ${active ? 'fill-current' : ''}`} />
          </button>
        );
      })}
    </div>
  );
};

const OrderFeedbackPage = () => {
  const { token } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    rating: 0,
    message: '',
  });

  const canSubmit = useMemo(() => {
    return form.full_name.trim() !== '' && form.rating >= 1 && form.rating <= 5 && form.message.trim() !== '';
  }, [form.full_name, form.message, form.rating]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrderFeedbackLink(token)
      .then((data) => {
        if (!mounted) return;
        setLink(data?.link || null);
        setForm((prev) => ({
          ...prev,
          full_name: data?.link?.customer_name || prev.full_name,
          email: data?.link?.email || prev.email,
        }));
      })
      .catch((error) => {
        if (!mounted) return;
        toast({
          title: 'Feedback link not available',
          description: error?.message || 'This feedback link may be expired or already used.',
          variant: 'destructive',
        });
        setLink(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      toast({
        title: 'Missing information',
        description: 'Please provide your name, rating, and message.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await submitOrderFeedback(token, form);
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully.',
        variant: 'success',
      });
      setLink((prev) => (prev ? { ...prev, is_used: true } : prev));
    } catch (error) {
      toast({
        title: 'Unable to submit feedback',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isUsed = Boolean(link?.is_used);

  return (
    <div className="min-h-screen bg-[#F4F7FD] py-12">
      <Helmet>
        <title>Feedback — e-KoopMart</title>
        <meta name="description" content="Share your experience" />
      </Helmet>

      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Feedback
          </span>
          <h1 className="mt-4 text-4xl font-bold text-[#0b1739]">Share Your Experience</h1>
          <p className="mt-3 text-sm text-slate-500">We genuinely value every guest&apos;s feedback.</p>
        </div>

        <div className="rounded-3xl border border-[#dfe7f4] bg-white p-6 shadow-sm sm:p-10">
          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">Loading feedback form…</p>
          ) : !link ? (
            <p className="py-16 text-center text-sm text-slate-500">
              This feedback link is not available.
            </p>
          ) : isUsed ? (
            <p className="py-16 text-center text-sm text-slate-500">
              This feedback link has already been used. Thank you!
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#0b1739]">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Juan dela Cruz"
                    className="h-12 rounded-2xl border-[#dfe7f4] bg-[#f8fafd] px-4"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#0b1739]">
                    Email <span className="text-slate-400">(optional)</span>
                  </label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="juan@example.com"
                    className="h-12 rounded-2xl border-[#dfe7f4] bg-[#f8fafd] px-4"
                    type="email"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 block text-sm font-semibold text-[#0b1739]">Your Rating</p>
                <StarRow
                  value={form.rating}
                  onSelect={(rating) => setForm((prev) => ({ ...prev, rating }))}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0b1739]">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us about your experience…"
                  rows={6}
                  maxLength={2000}
                  className="w-full rounded-2xl border border-[#dfe7f4] bg-[#f8fafd] px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                className="h-12 w-full rounded-2xl bg-amber-500 text-base font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderFeedbackPage;

