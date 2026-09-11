import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';
import {
  fetchMerchantPushSettings,
  removeMerchantPushSubscription,
  saveMerchantPushSubscription,
} from '../api/EcommerceApi';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useToast } from './ui/use-toast';

const urlBase64ToUint8Array = (value) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

const browserSupportsPush = () =>
  typeof window !== 'undefined'
  && window.isSecureContext
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window;

const MerchantPushNotifications = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await fetchMerchantPushSettings();
      const supported = browserSupportsPush();
      setAvailable(Boolean(settings?.available) && supported);
      setPublicKey(settings?.public_key || '');

      if (supported) {
        const registration = await navigator.serviceWorker.register('/push-service-worker.js');
        setSubscription(await registration.pushManager.getSubscription());
        setPermission(Notification.permission);
      }
    } catch (error) {
      toast({
        title: 'Unable to check notification settings',
        description: error?.message || 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = async () => {
    if (!available || !publicKey) return;
    setSaving(true);
    try {
      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission);
      if (requestedPermission !== 'granted') {
        throw new Error('Browser notification permission was not granted.');
      }

      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      const nextSubscription = current || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await saveMerchantPushSubscription(nextSubscription.toJSON());
      setSubscription(nextSubscription);
      toast({
        title: 'Order alerts enabled',
        description: 'This device will receive a browser alert when your store gets an order.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Could not enable order alerts',
        description: error?.message || 'Check this browser’s notification permissions and try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    if (!subscription) return;
    setSaving(true);
    try {
      await removeMerchantPushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
      toast({ title: 'Order alerts disabled', description: 'This device will no longer receive browser alerts.' });
    } catch (error) {
      toast({
        title: 'Could not disable order alerts',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const enabled = Boolean(subscription) && permission === 'granted';
  const statusLabel = loading
    ? 'Checking this device…'
    : enabled
      ? 'Enabled on this device'
      : permission === 'denied'
        ? 'Blocked in browser settings'
        : available
          ? 'Not enabled on this device'
          : 'Unavailable';

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </span>
            <div>
              <CardTitle className="text-lg">New order alerts</CardTitle>
              <CardDescription className="mt-1 leading-5">
                Receive a browser push on this device. New-order emails are sent automatically to merchant accounts and the store contact email.
              </CardDescription>
            </div>
          </div>
          {enabled ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Device status</p>
          <p className={`mt-1 text-sm font-semibold ${enabled ? 'text-emerald-700' : 'text-slate-700'}`}>{statusLabel}</p>
          {!window.isSecureContext ? <p className="mt-1 text-xs text-amber-700">Push requires HTTPS (localhost is supported for development).</p> : null}
        </div>
        <Button
          type="button"
          variant={enabled ? 'outline' : 'default'}
          className={`min-h-11 w-full rounded-xl sm:w-auto ${enabled ? 'border-slate-300' : 'bg-[#2954C8] hover:bg-[#2148ae]'}`}
          disabled={loading || saving || (!enabled && (!available || permission === 'denied'))}
          onClick={enabled ? disable : enable}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : enabled ? 'Disable on this device' : 'Enable order alerts'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MerchantPushNotifications;
