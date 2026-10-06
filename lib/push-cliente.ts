'use client';
// Activa los recordatorios en ESTE dispositivo (llamar desde un botón: el navegador exige un toque del usuario).
const b64ToUint8 = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export type EstadoPush = 'no-soportado' | 'denegado' | 'activo' | 'inactivo';

export async function estadoPush(): Promise<EstadoPush> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'no-soportado';
  if (Notification.permission === 'denied') return 'denegado';
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  return (await reg?.pushManager.getSubscription()) ? 'activo' : 'inactivo';
}

export async function activarRecordatorios(): Promise<EstadoPush> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'no-soportado';
  if ((await Notification.requestPermission()) !== 'granted') return 'denegado';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToUint8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
  return 'activo';
}

export async function desactivarRecordatorios() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
  await sub.unsubscribe();
}
