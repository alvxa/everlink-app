"use client";

import * as React from "react";
import { BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
  return output;
}

export function PushToggle() {
  const [supported, setSupported] = React.useState(true);
  const [subscribed, setSubscribed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const can = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(can);
    if (!can) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        const existing = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(existing));
      })
      .catch(() => setSupported(false));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications are blocked in this browser. Allow them in site settings, then try again.");
        return;
      }
      const { publicKey } = await apiFetch<{ publicKey?: string }>("/api/v1/push/public-key");
      if (!publicKey) throw new Error("Push is not configured on this server.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const payload = subscription.toJSON();
      await apiFetch("/api/v1/push/subscribe", {
        method: "POST",
        json: {
          endpoint: payload.endpoint,
          keys: payload.keys,
          userAgent: navigator.userAgent.slice(0, 300),
        },
      });
      setSubscribed(true);
      toast({ title: "Push notifications enabled", variant: "success" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiFetch("/api/v1/push/subscribe", {
          method: "DELETE",
          json: { endpoint: subscription.endpoint },
        }).catch(() => {});
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast({ title: "Push notifications disabled", variant: "success" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          {subscribed ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">Browser push notifications</p>
          <p className="mt-0.5 text-[11.5px] leading-5 text-ink-muted">
            {supported
              ? "Get alerts even when the Everlink tab is closed. Requires browser permission. Push works on HTTPS and localhost."
              : "This browser does not support web push notifications."}
          </p>
        </div>
        {supported && (
          <Button
            variant={subscribed ? "outline" : "default"}
            size="sm"
            loading={busy}
            onClick={subscribed ? disable : enable}
          >
            {subscribed ? "Turn off" : "Enable"}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
