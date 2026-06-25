import api from "@/lib/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushConfig() {
  try {
    const { data } = await api.get("/notifications/config");
    return data || {};
  } catch {
    const runtimeConfig = window.GL_MODEL_ACADEMY_CONFIG || {};
    return {
      enabled: !!runtimeConfig.VAPID_PUBLIC_KEY,
      vapid_public_key: runtimeConfig.VAPID_PUBLIC_KEY || "",
    };
  }
}

export async function subscribeToPush() {
  if (!pushSupported()) {
    return { ok: false, reason: "Este navegador ainda nao suporta push web completo." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Permissao de notificacao nao foi concedida." };
  }

  const config = await getPushConfig();
  if (!config.vapid_public_key) {
    return {
      ok: false,
      reason: "Os alertas ainda estao sendo preparados para este dispositivo. Tente novamente mais tarde.",
      permissionOnly: true,
    };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.vapid_public_key),
    }));

  await api.post("/notifications/subscribe", subscription.toJSON());
  return { ok: true };
}

export async function sendTestNotification() {
  try {
    const { data } = await api.post("/notifications/test", {});
    return data || { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.response?.data?.detail || err?.message || "Falha no teste." };
  }
}
