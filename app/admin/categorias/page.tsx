
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_UID = "42755f00-5e71-41ef-9b11-a2446e290676";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  productCount: number;
};

export default function CategoriasAdmin() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  function createSlug(value: string) {
    return value.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function loadCategories() {
    const [{ data, error }, { data: products, error: productError }] =
      await Promise.all([
        supabase.from("categories")
          .select("id,name,slug,description,active")
          .order("name"),
        supabase.from("products").select("category_id"),
      ]);

    if (error || productError) {
      setMessage("Error al cargar información: " +
        (error?.message || productError?.message));
      return;
    }

    const counts = new Map<string, number>();

    (products || []).forEach((product) => {
      if (product.category_id) {
        counts.set(
          product.category_id,
          (counts.get(product.category_id) || 0) + 1
        );
      }
    });

    setCategories((data || []).map((category) => ({
      ...category,
      active: Boolean(category.active),
      productCount: counts.get(category.id) || 0,
    })));
  }

  async function verifyAdmin() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user || data.user.id !== ADMIN_UID) {
      router.replace("/admin/login");
      return false;
    }

    return true;
  }

  useEffect(() => {
    async function initialize() {
      if (!(await verifyAdmin())) return;
      await loadCategories();
      setChecking(false);
    }

    initialize();
  }, [router]);

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setActive(true);
    setEditingId(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const cleanName = name.trim();
    const cleanSlug = createSlug(slug);

    if (!cleanName || !cleanSlug) {
      setMessage("Completa el nombre y el identificador.");
      return;
    }

    if (!(await verifyAdmin())) return;

    const duplicate = categories.find(
      (category) =>
        category.slug.toLowerCase() === cleanSlug.toLowerCase() &&
        category.id !== editingId
    );

    if (duplicate) {
      setMessage("Ya existe una categoría con ese identificador.");
      return;
    }

    setSaving(true);

    const categoryData = {
      name: cleanName,
      slug: cleanSlug,
      description: description.trim() || null,
      active,
    };

    const result = editingId
      ? await supabase.from("categories")
          .update(categoryData).eq("id", editingId)
      : await supabase.from("categories").insert(categoryData);

    if (result.error) {
      setMessage("No se pudo guardar: " + result.error.message);
    } else {
      setMessage("¡Categoría guardada correctamente!");
      resetForm();
      await loadCategories();
    }

    setSaving(false);
  }

  async function toggleActive(category: Category) {
    const next = !category.active;

    if (!window.confirm(
      `¿Deseas ${next ? "activar" : "desactivar"} "${category.name}"?`
    )) return;

    if (!(await verifyAdmin())) return;

    const { error } = await supabase.from("categories")
      .update({ active: next }).eq("id", category.id);

    if (error) {
      setMessage("Error al cambiar estado: " + error.message);
    } else {
      setMessage("Estado actualizado correctamente.");
      await loadCategories();
    }
  }

  async function deleteCategory(category: Category) {
    if (category.productCount > 0) {
      setMessage(
        `No puedes eliminar esta categoría porque tiene ${category.productCount} materiales asociados. Puedes desactivarla.`
      );
      return;
    }

    if (!window.confirm(
      `¿Eliminar definitivamente la categoría "${category.name}"?`
    )) return;

    if (!(await verifyAdmin())) return;

    const { data: linked, error: checkError } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", category.id)
      .limit(1);

    if (checkError) {
      setMessage("No se pudo comprobar la categoría: " + checkError.message);
      return;
    }

    if (linked && linked.length > 0) {
      setMessage("La categoría ya tiene materiales asociados.");
      await loadCategories();
      return;
    }

    const { error } = await supabase.from("categories")
      .delete().eq("id", category.id);

    if (error) {
      setMessage("No se pudo eliminar: " + error.message);
    } else {
      setMessage("Categoría eliminada correctamente.");
      await loadCategories();
    }
  }

  function editCategory(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description || "");
    setActive(category.active);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fc]">
        <p className="font-bold text-purple-800">
          Verificando acceso administrativo...
        </p>
      </main>
    );
  }

  const filtered = categories.filter((category) =>
    `${category.name} ${category.slug}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#fff8fc] px-5 py-10">
      <div className="mx-auto max-w-7xl">

        <a href="/admin" className="font-bold text-purple-700">
          ← Volver al panel administrativo
        </a>

        <header className="mt-6 rounded-3xl border border-purple-100 bg-white p-8 shadow-sm">
          <p className="font-black uppercase tracking-widest text-pink-600">
            MATERIAL DIDÁCTICO MR
          </p>
          <h1 className="mt-3 text-3xl font-black text-purple-950">
            Administrar categorías
          </h1>
          <p className="mt-2 text-slate-500">
            Organiza los recursos educativos de tu tienda.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-purple-950">
            {editingId ? "Editar categoría" : "Crear categoría"}
          </h2>

          <form onSubmit={handleSave} className="mt-6 space-y-5">

            <div className="grid gap-5 md:grid-cols-2">
              <label className="font-bold text-purple-900">
                Nombre *
                <input
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingId) setSlug(createSlug(e.target.value));
                  }}
                  placeholder="Ejemplo: Primaria"
                  className="mt-2 w-full rounded-xl border border-purple-200 p-3 font-normal"
                />
              </label>

              <label className="font-bold text-purple-900">
                Identificador (slug) *
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="primaria"
                  className="mt-2 w-full rounded-xl border border-purple-200 p-3 font-normal"
                />
              </label>
            </div>

            <label className="block font-bold text-purple-900">
              Descripción
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-purple-200 p-3 font-normal"
                placeholder="Describe esta categoría..."
              />
            </label>

            <label className="flex items-center gap-3 font-bold text-purple-900">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-5 w-5"
              />
              Categoría activa y visible en la tienda
            </label>

            {message && (
              <p className="rounded-xl bg-purple-50 p-4 font-semibold text-purple-900">
                {message}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-purple-700 px-7 py-4 font-bold text-white disabled:opacity-50"
              >
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear categoría"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-purple-200 px-6 py-4 font-bold text-purple-800"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-purple-950">
            Categorías registradas ({categories.length})
          </h2>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría..."
            className="mt-5 w-full rounded-xl border border-purple-200 p-4"
          />

          <div className="mt-6 space-y-4">
            {filtered.map((category) => (
              <article
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-100 p-5"
              >
                <div>
                  <h3 className="font-black text-purple-950">
                    {category.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {category.description || "Sin descripción"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Slug: {category.slug} · Materiales: {category.productCount}
                  </p>
                  <span className={
                    category.active
                      ? "text-sm font-bold text-green-700"
                      : "text-sm font-bold text-amber-700"
                  }>
                    {category.active ? "Activa" : "Inactiva"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => editCategory(category)}
                    className="rounded-full bg-purple-100 px-4 py-2 font-bold text-purple-800"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleActive(category)}
                    className="rounded-full bg-amber-100 px-4 py-2 font-bold text-amber-800"
                  >
                    {category.active ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteCategory(category)}
                    disabled={category.productCount > 0}
                    title={category.productCount > 0 ? "Tiene materiales asociados" : "Eliminar"}
                    className="rounded-full bg-red-50 px-4 py-2 font-bold text-red-700 disabled:opacity-40"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}

            {filtered.length === 0 && (
              <p className="py-8 text-center text-slate-500">
                No se encontraron categorías.
              </p>
            )}
          </div>
        </section>

        <footer className="py-8 text-center text-sm text-slate-500">
          © 2027 Material Didáctico MR. Todos los derechos reservados.
        </footer>
      </div>
    </main>
  );
}
