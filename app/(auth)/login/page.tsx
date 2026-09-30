"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("database error saving new user") || m.includes("no autorizado") || m.includes("not allowed")) {
    return "Este correo no está autorizado. Pide a un administrador que lo añada a la lista.";
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) {
    return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  }
  if (m.includes("expired") || m.includes("invalid")) {
    return "El código no es válido o ha caducado. Solicita uno nuevo.";
  }
  return "No se pudo completar el acceso. Inténtalo de nuevo.";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "El enlace no es válido o ha caducado. Usa el código numérico del correo." : null,
  );

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError(friendlyError(error.message));
    else setSent(true);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError(friendlyError(error.message));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-blue-700">Seguimiento de Ferias</h1>
        <p className="mt-1 text-sm text-gray-600">Acceso con el correo de empresa.</p>
      </div>

      {!sent ? (
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border bg-white px-3 py-3 text-base"
          />
          <button disabled={busy} className="rounded bg-blue-700 px-3 py-3 font-medium text-white disabled:opacity-50">
            {busy ? "Enviando…" : "Enviarme el enlace"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-gray-700">
            Te hemos enviado un correo a <b>{email}</b>. Abre el enlace, o escribe aquí el código numérico si el
            enlace se abre en otro navegador.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="Código del correo"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded border bg-white px-3 py-3 text-center text-lg tracking-widest"
          />
          <button disabled={busy} className="rounded bg-blue-700 px-3 py-3 font-medium text-white disabled:opacity-50">
            {busy ? "Comprobando…" : "Entrar con el código"}
          </button>
          <button
            type="button"
            className="text-sm text-blue-700 underline"
            onClick={() => {
              setSent(false);
              setCode("");
              setError(null);
            }}
          >
            Usar otro correo
          </button>
        </form>
      )}

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
