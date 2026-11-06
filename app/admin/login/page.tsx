
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_UID = "42755f00-5e71-41ef-9b11-a2446e290676";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    if (data.user.id !== ADMIN_UID) {
      await supabase.auth.signOut();
      setErrorMessage("Esta cuenta no tiene permisos de administrador.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff8fc] px-5 py-10">

      <div className="w-full max-w-md rounded-3xl border border-purple-100 bg-white p-8 shadow-xl">

        <div className="mb-7 text-center">
          <img
            src="/logo/logo-material-didactico-mr.png"
            alt="Material Didáctico MR"
            className="mx-auto h-24 w-24 object-contain"
          />

          <h1 className="mt-4 text-2xl font-black text-purple-950">
            Panel administrativo
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Tienda Material Didáctico MR
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm font-bold text-purple-900">
              Correo electrónico
            </label>

            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo electrónico"
              className="w-full rounded-xl border border-purple-200 px-4 py-3 outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-purple-900">
              Contraseña
            </label>

            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              className="w-full rounded-xl border border-purple-200 px-4 py-3 outline-none focus:border-purple-500"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-purple-700 px-6 py-4 font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verificando acceso..." : "Iniciar sesión"}
          </button>

        </form>

        <div className="mt-7 border-t border-purple-100 pt-5 text-center">
          <a
            href="/"
            className="text-sm font-bold text-purple-700 hover:text-pink-600"
          >
            ← Volver a la tienda
          </a>
        </div>

      </div>
    </main>
  );
}
