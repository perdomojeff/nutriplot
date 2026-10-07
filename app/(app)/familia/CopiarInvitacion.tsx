'use client';
import { useState } from 'react';

/** Texto listo para pegar en WhatsApp o mensaje de texto. */
export default function CopiarInvitacion({ alias, email }: { alias: string; email: string }) {
  const [ok, setOk] = useState(false);
  const texto = () => `Hola ${alias}, te invité a NutriPlot, nuestra app familiar para bajar de peso y mantenernos saludables.\n\n1) Entra a ${location.origin}/login\n2) Toca “Crear cuenta” y usa este mismo correo: ${email}\n3) Confirma tu correo (revisa también Spam) y completa tu Día 0.`;
  async function copiar() {
    try { await navigator.clipboard.writeText(texto()); setOk(true); setTimeout(() => setOk(false), 2500); }
    catch { window.prompt('Copia este mensaje:', texto()); }
  }
  return <button type="button" onClick={copiar} className="btn-ghost !min-h-10 !px-4">{ok ? '¡Copiado!' : 'Copiar mensaje de invitación'}</button>;
}
