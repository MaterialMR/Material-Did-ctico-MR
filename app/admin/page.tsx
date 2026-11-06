 import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase-server";

const ADMIN_UID = "42755f00-5e71-41ef-9b11-a2446e290676";

function LoadingAdmin() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fff8fc]">
      <p className="text-xl font-bold text-purple-800">
        Cargando panel administrativo...
      </p>
    </main>
  );
}

async function AdminContent() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.id !== ADMIN_UID) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#fff8fc]">
      <div className="flex min-h-screen">

        {/* MENÚ LATERAL */}
        <aside className="hidden w-72 shrink-0 border-r border-purple-100 bg-white p-7 lg:block">

          <div className="mb-12 text-center">
            <img
              src="/logo/logo-material-didactico-mr.png"
              alt="Material Didáctico MR"
              className="mx-auto h-28 w-28 object-contain"
            />

            <h2 className="mt-3 text-xl font-black text-purple-950">
              MATERIAL DIDÁCTICO MR
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Administración de tienda
            </p>
          </div>

          <p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
            Menú principal
          </p>

          <nav className="space-y-3">

            <a
              href="/admin"
              className="flex items-center gap-4 rounded-xl bg-purple-100 px-5 py-4 text-base font-black text-purple-900"
            >
              <span className="text-2xl">🏠</span>
              Inicio
            </a>

            <a
              href="/admin/productos"
              className="flex items-center gap-4 rounded-xl px-5 py-4 text-base font-bold text-slate-700 transition hover:bg-purple-50 hover:text-purple-800"
            >
              <span className="text-2xl">📚</span>
              Productos
            </a>

            <a
              href="/admin/categorias"
              className="flex items-center gap-4 rounded-xl px-5 py-4 text-base font-bold text-slate-700 transition hover:bg-purple-50 hover:text-purple-800"
            >
              <span className="text-2xl">🗂️</span>
              Categorías
            </a>

            <a
              href="/admin/pedidos"
              className="flex items-center gap-4 rounded-xl px-5 py-4 text-base font-bold text-slate-700 transition hover:bg-purple-50 hover:text-purple-800"
            >
              <span className="text-2xl">📦</span>
              Gestión de pedidos
            </a>

            <a
              href="/admin/ventas"
              className="flex items-center gap-4 rounded-xl px-5 py-4 text-base font-bold text-slate-700 transition hover:bg-purple-50 hover:text-purple-800"
            >
              <span className="text-2xl">📊</span>
              Dashboard de ventas
            </a>

            <a
              href="/"
              className="flex items-center gap-4 rounded-xl px-5 py-4 text-base font-bold text-slate-700 transition hover:bg-purple-50 hover:text-purple-800"
            >
              <span className="text-2xl">🛍️</span>
              Ver tienda
            </a>

          </nav>

          <div className="mt-16 rounded-2xl bg-pink-50 p-5">
            <p className="font-black text-purple-950">
              Colección 2027
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Administra todos tus recursos educativos desde un solo lugar.
            </p>
          </div>

        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <section className="min-w-0 flex-1 px-6 py-8 md:px-10 lg:px-12 xl:px-16">

          <header className="mb-12 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-purple-100 bg-white px-8 py-7 shadow-sm">

            <div>
              <p className="text-sm font-black uppercase tracking-widest text-pink-600">
                TIENDA EDUCATIVA
              </p>

              <h1 className="mt-2 text-3xl font-black text-purple-950 md:text-4xl">
                Panel administrativo
              </h1>

              <p className="mt-2 text-base text-slate-500">
                Material Didáctico MR
              </p>
            </div>

            <img
              src="/logo/logo-material-didactico-mr.png"
              alt="Logo"
              className="h-20 w-20 object-contain lg:hidden"
            />

            <a
              href="/"
              className="rounded-full bg-purple-700 px-7 py-4 text-base font-black text-white transition hover:bg-purple-800"
            >
              Ver tienda →
            </a>

          </header>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-purple-950 md:text-4xl">
              ¡Bienvenido a tu tienda!
            </h2>

            <p className="mt-3 text-lg text-slate-600">
              Administra tus materiales, portadas, precios y publicaciones.
            </p>
          </div>

          <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">

            {/* PRODUCTOS */}
            <a
              href="/admin/productos"
              className="group rounded-3xl border border-purple-100 bg-white p-9 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-100 text-5xl">
                📚
              </div>

              <h3 className="mt-7 text-2xl font-black text-purple-950">
                Productos
              </h3>

              <p className="mt-3 text-base leading-7 text-slate-600">
                Registra nuevos materiales, sube portadas, administra precios digitales y físicos y publica tus recursos.
              </p>

              <p className="mt-7 text-base font-black text-purple-700 group-hover:text-pink-600">
                Administrar productos →
              </p>
            </a>

            {/* CATEGORÍAS */}
            <a
              href="/admin/categorias"
              className="group rounded-3xl border border-purple-100 bg-white p-9 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-pink-100 text-5xl">
                🗂️
              </div>

              <h3 className="mt-7 text-2xl font-black text-purple-950">
                Categorías
              </h3>

              <p className="mt-3 text-base leading-7 text-slate-600">
                Organiza los materiales por nivel educativo, grado y tipo de recurso.
              </p>

              <p className="mt-7 text-base font-black text-purple-700 group-hover:text-pink-600">
                Administrar categorías →
              </p>
            </a>

            {/* GESTIÓN DE PEDIDOS */}
            <a
              href="/admin/pedidos"
              className="group rounded-3xl border border-purple-100 bg-white p-9 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-5xl">
                📦
              </div>

              <h3 className="mt-7 text-2xl font-black text-purple-950">
                Gestión de pedidos
              </h3>

              <p className="mt-3 text-base leading-7 text-slate-600">
                Consulta las compras de tus clientes, revisa los materiales, contacta por WhatsApp y actualiza los estados de cada pedido.
              </p>

              <p className="mt-7 text-base font-black text-purple-700 group-hover:text-pink-600">
                Administrar pedidos →
              </p>
            </a>

            {/* DASHBOARD DE VENTAS */}
            <a
              href="/admin/ventas"
              className="group rounded-3xl border border-purple-100 bg-white p-9 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-5xl">
                📊
              </div>

              <h3 className="mt-7 text-2xl font-black text-purple-950">
                Dashboard de ventas
              </h3>

              <p className="mt-3 text-base leading-7 text-slate-600">
                Consulta ingresos confirmados, evolución mensual, pedidos por estado y materiales más vendidos.
              </p>

              <p className="mt-7 text-base font-black text-purple-700 group-hover:text-pink-600">
                Ver estadísticas →
              </p>
            </a>

            {/* TIENDA PÚBLICA */}
            <a
              href="/"
              className="group rounded-3xl border border-purple-100 bg-white p-9 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-5xl">
                🛍️
              </div>

              <h3 className="mt-7 text-2xl font-black text-purple-950">
                Tienda pública
              </h3>

              <p className="mt-3 text-base leading-7 text-slate-600">
                Consulta cómo ven los visitantes tus materiales y publicaciones.
              </p>

              <p className="mt-7 text-base font-black text-purple-700 group-hover:text-pink-600">
                Abrir tienda →
              </p>
            </a>

          </div>

          <div className="mt-12 rounded-3xl border border-purple-100 bg-purple-100/70 p-8">
            <h3 className="text-xl font-black text-purple-950">
              Tu centro de administración
            </h3>

            <p className="mt-3 text-base leading-7 text-purple-900">
              Desde este espacio podrás gestionar el catálogo de Material Didáctico MR y mantener organizada la oferta de recursos educativos para el ciclo lectivo 2027.
            </p>
          </div>

          <footer className="mt-12 border-t border-purple-200 py-7 text-center text-sm text-slate-500">
            © 2027 Material Didáctico MR. Todos los derechos reservados.
          </footer>

        </section>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingAdmin />}>
      <AdminContent />
    </Suspense>
  );
}