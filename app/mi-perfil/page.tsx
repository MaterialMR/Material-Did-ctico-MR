 "use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  phone: string;
  institution: string;
};

export default function MiPerfilPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [institucion, setInstitucion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      setCargando(true);
      setError("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        if (activo) {
          setError(`Error al consultar la sesión: ${sessionError.message}`);
          setCargando(false);
        }
        return;
      }

      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/iniciar-sesion");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, institution")
        .eq("id", user.id)
        .maybeSingle();

      if (!activo) return;

      if (profileError) {
        console.error("Error detallado al cargar el perfil:", profileError);
        setError(
          `Supabase respondió: ${profileError.message} (código: ${profileError.code || "sin código"}).`
        );
        setCargando(false);
        return;
      }

      if (!data) {
        setError(
          "La sesión está activa, pero no se encontró un perfil asociado a esta cuenta."
        );
        setCargando(false);
        return;
      }

      setProfile(data);
      setCorreo(user.email || "");
      setNombre(data.full_name || "");
      setTelefono(data.phone || "");
      setInstitucion(data.institution || "");
      setCargando(false);
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, [router]);

  async function guardarCambios(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!profile) return;

    setGuardando(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const user = sessionData.session?.user;

    if (sessionError || !user || user.id !== profile.id) {
      setGuardando(false);
      setError("Tu sesión no está activa. Inicia sesión nuevamente.");
      router.replace("/iniciar-sesion");
      return;
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: nombre.trim(),
        phone: telefono.trim(),
        institution: institucion.trim(),
      })
      .eq("id", user.id)
      .select("id, full_name, phone, institution")
      .maybeSingle();

    setGuardando(false);

    if (updateError) {
      console.error("Error detallado al actualizar el perfil:", updateError);
      setError(
        `No se pudieron guardar los cambios: ${updateError.message} (código: ${updateError.code || "sin código"}).`
      );
      return;
    }

    if (!data) {
      setError(
        "No se actualizó ningún registro. Verifica los permisos de actualización de la tabla profiles."
      );
      return;
    }

    setProfile(data);
    setNombre(data.full_name);
    setTelefono(data.phone);
    setInstitucion(data.institution);
    setMensaje("¡Tus datos se actualizaron correctamente!");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    marginTop: "6px",
    fontSize: "15px",
    boxSizing: "border-box",
    background: "#ffffff",
  };

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="font-semibold text-purple-900">Cargando tu perfil...</p>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-black text-purple-950">Mi perfil</h1>
          <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block font-bold text-purple-700 underline"
          >
            Volver a la tienda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg sm:p-9">
        <div className="mb-8 text-center">
          <div className="text-4xl">👤</div>
          <h1 className="mt-3 text-3xl font-black text-[#263b63]">
            Mi perfil
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tienda Material Didáctico MR
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Consulta y actualiza tus datos personales.
          </p>
        </div>

        <form onSubmit={guardarCambios}>
          <label className="block text-sm font-semibold text-slate-800">
            Nombre completo
          </label>
          <input
            style={inputStyle}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={150}
            autoComplete="name"
          />

          <label className="mt-5 block text-sm font-semibold text-slate-800">
            Correo electrónico
          </label>
          <input
            style={{ ...inputStyle, background: "#f1f5f9", color: "#64748b" }}
            value={correo}
            readOnly
            aria-readonly="true"
          />
          <p className="mt-1 text-xs text-slate-500">
            El correo de acceso no se modifica desde esta sección.
          </p>

          <label className="mt-5 block text-sm font-semibold text-slate-800">
            Número de teléfono
          </label>
          <input
            style={inputStyle}
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
            maxLength={30}
            autoComplete="tel"
          />

          <label className="mt-5 block text-sm font-semibold text-slate-800">
            Institución educativa
          </label>
          <input
            style={inputStyle}
            value={institucion}
            onChange={(e) => setInstitucion(e.target.value)}
            required
            maxLength={180}
          />

          {error && (
            <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {mensaje}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="mt-7 w-full rounded-lg bg-[#263b63] px-5 py-3 font-bold text-white transition hover:bg-[#1e2f50] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando cambios..." : "Guardar cambios"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            Volver a la tienda
          </Link>
        </div>
      </section>
    </main>
  );
}
