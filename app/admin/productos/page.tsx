  "use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_UID = "42755f00-5e71-41ef-9b11-a2446e290676";

type Category = {
  id: string;
  name: string;
};

type Preview = {
  id: string;
  product_id: string;
  image_url: string;
  page_number: number | null;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id?: string | null;
  grade: string | null;
  material_type: string | null;
  pages: number | null;
  digital_price: number | null;
  physical_price: number | null;
  cover_url: string | null;
  featured: boolean;
  published: boolean;
  created_at: string;
  categories: { name: string } | { name: string }[] | null;
};

export default function ProductosAdmin() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewRecords, setPreviewRecords] = useState<Preview[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [uploadingPreviews, setUploadingPreviews] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [grade, setGrade] = useState("");
  const [materialType, setMaterialType] = useState("Material regular");
  const [pages, setPages] = useState("");
  const [digitalPrice, setDigitalPrice] = useState("");
  const [physicalPrice, setPhysicalPrice] = useState("");
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);

  async function loadProducts() {
    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        category_id,
        grade,
        material_type,
        pages,
        digital_price,
        physical_price,
        cover_url,
        featured,
        published,
        created_at,
        categories(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando productos:", error.message);
      setMessage("No se pudo cargar el listado de productos: " + error.message);
    } else {
      setProducts((data || []) as unknown as Product[]);
    }

    setLoadingProducts(false);
  }

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== ADMIN_UID) {
        router.replace("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (error) {
        setMessage("No fue posible cargar las categorías: " + error.message);
      } else {
        setCategories(data || []);
      }

      await loadProducts();
      setChecking(false);
    }

    initialize();
  }, [router]);

  function resetForm() {
    setName("");
    setDescription("");
    setCategoryId("");
    setGrade("");
    setMaterialType("Material regular");
    setPages("");
    setDigitalPrice("");
    setPhysicalPrice("");
    setFeatured(false);
    setPublished(false);
    setCoverFile(null);
    setCurrentCoverUrl(null);
    setEditingId(null);

    const fileInput = document.getElementById("cover") as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";
  }

  function startEditing(product: Product) {
    setMessage("");
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description || "");
    setCategoryId(product.category_id || "");
    setGrade(product.grade || "");
    setMaterialType(product.material_type || "Material regular");
    setPages(product.pages?.toString() || "");
    setDigitalPrice(product.digital_price?.toString() || "");
    setPhysicalPrice(product.physical_price?.toString() || "");
    setFeatured(Boolean(product.featured));
    setPublished(Boolean(product.published));
    setCurrentCoverUrl(product.cover_url);
    setCoverFile(null);

    const fileInput = document.getElementById("cover") as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!categoryId) {
      setMessage("Selecciona una categoría.");
      return;
    }

    if (!digitalPrice && !physicalPrice) {
      setMessage("Debes indicar al menos un precio.");
      return;
    }

    if (coverFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(coverFile.type)) {
        setMessage("La portada debe ser JPG, PNG o WebP.");
        return;
      }

      if (coverFile.size > 5 * 1024 * 1024) {
        setMessage("La portada no puede superar los 5 MB.");
        return;
      }
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== ADMIN_UID) {
      setMessage("Tu sesión no tiene permisos de administrador.");
      setSaving(false);
      router.replace("/admin/login");
      return;
    }

    let coverUrl = currentCoverUrl;
    let uploadedPath: string | null = null;

    try {
      if (coverFile) {
        const safeName = coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        uploadedPath = `${user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-covers")
          .upload(uploadedPath, coverFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Error al subir la portada: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-covers")
          .getPublicUrl(uploadedPath);

        coverUrl = publicUrlData.publicUrl;
      }

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        grade: grade.trim() || null,
        material_type: materialType,
        pages: pages ? Number(pages) : null,
        digital_price: digitalPrice ? Number(digitalPrice) : null,
        physical_price: physicalPrice ? Number(physicalPrice) : null,
        cover_url: coverUrl,
        featured,
        published,
      };

      const result = editingId
        ? await supabase.from("products").update(productData).eq("id", editingId)
        : await supabase.from("products").insert(productData);

      if (result.error) {
        throw new Error(
          `${editingId ? "Error al actualizar" : "Error al guardar"} el producto: ${result.error.message}`
        );
      }

      setMessage(
        editingId
          ? "¡Material actualizado correctamente!"
          : published
            ? "¡Producto guardado y publicado correctamente!"
            : "¡Producto guardado como borrador!"
      );

      resetForm();
      await loadProducts();
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from("product-covers").remove([uploadedPath]);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar el producto."
      );
    }

    setSaving(false);
  }

  async function loadPreviews(productId: string) {
    setLoadingPreviews(true);
    const { data, error } = await supabase
      .from("product_previews")
      .select("id, product_id, image_url, page_number, created_at")
      .eq("product_id", productId)
      .order("page_number", { ascending: true });

    if (error) {
      setPreviewMessage("No se pudieron cargar las muestras: " + error.message);
      setPreviewRecords([]);
    } else {
      setPreviewRecords((data || []) as Preview[]);
    }
    setLoadingPreviews(false);
  }

  async function openPreviews(product: Product) {
    setPreviewProduct(product);
    setPreviewFiles([]);
    setPreviewMessage("");
    setPreviewRecords([]);
    await loadPreviews(product.id);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function createWatermarkedImage(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar una de las imágenes.");

    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    context.save();
    context.globalAlpha = 0.22;
    context.fillStyle = "#4c1d95";
    context.font = `bold ${Math.max(18, Math.round(canvas.width / 24))}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(-Math.PI / 5);

    const stepX = Math.max(260, Math.round(canvas.width / 2));
    const stepY = Math.max(180, Math.round(canvas.height / 5));
    for (let y = -canvas.height * 2; y <= canvas.height * 2; y += stepY) {
      for (let x = -canvas.width * 2; x <= canvas.width * 2; x += stepX) {
        context.fillText("MATERIAL DIDÁCTICO MR", x, y);
      }
    }
    context.restore();

    const output = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen con marca de agua.")),
        "image/jpeg",
        0.88
      );
    });
    return output;
  }

  async function handleUploadPreviews() {
    if (!previewProduct) return;
    if (previewFiles.length === 0) {
      setPreviewMessage("Selecciona al menos una imagen.");
      return;
    }

    const invalidFile = previewFiles.find((file) =>
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024
    );
    if (invalidFile) {
      setPreviewMessage("Cada imagen debe ser JPG, PNG o WebP y pesar máximo 10 MB.");
      return;
    }

    setUploadingPreviews(true);
    setPreviewMessage("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== ADMIN_UID) {
      setPreviewMessage("Tu sesión no tiene permisos de administrador.");
      setUploadingPreviews(false);
      router.replace("/admin/login");
      return;
    }

    try {
      for (let index = 0; index < previewFiles.length; index++) {
        const file = previewFiles[index];
        const watermarkedBlob = await createWatermarkedImage(file);
        const filePath = `${authData.user.id}/${previewProduct.id}/${Date.now()}-${index}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("product-previews-public")
          .upload(filePath, watermarkedBlob, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) throw new Error("Error al subir una muestra: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from("product-previews-public")
          .getPublicUrl(filePath);
        const nextPage = previewRecords.length + index + 1;
        const { error: insertError } = await supabase
          .from("product_previews")
          .insert({
            product_id: previewProduct.id,
            image_url: publicUrlData.publicUrl,
            page_number: nextPage,
          });
        if (insertError) throw new Error("La imagen se subió, pero no se pudo registrar: " + insertError.message);
      }

      setPreviewMessage("¡Las imágenes de muestra se subieron con marca de agua!");
      setPreviewFiles([]);
      const input = document.getElementById("preview-files") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadPreviews(previewProduct.id);
    } catch (error) {
      setPreviewMessage(error instanceof Error ? error.message : "Ocurrió un error al subir las muestras.");
    }
    setUploadingPreviews(false);
  }

  async function handleDeletePreview(preview: Preview) {
    const confirmed = window.confirm("¿Deseas eliminar esta imagen de muestra?");
    if (!confirmed) return;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== ADMIN_UID) {
      setPreviewMessage("Tu sesión no tiene permisos de administrador.");
      router.replace("/admin/login");
      return;
    }

    const { error } = await supabase.from("product_previews").delete().eq("id", preview.id);
    if (error) {
      setPreviewMessage("No se pudo eliminar la muestra: " + error.message);
      return;
    }

    const marker = "/product-previews-public/";
    const pathIndex = preview.image_url.indexOf(marker);
    if (pathIndex >= 0) {
      const storagePath = decodeURIComponent(preview.image_url.slice(pathIndex + marker.length));
      await supabase.storage.from("product-previews-public").remove([storagePath]);
    }
    setPreviewMessage("Muestra eliminada correctamente.");
    if (previewProduct) await loadPreviews(previewProduct.id);
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setDeletingId(product.id);
    setMessage("");

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user || authData.user.id !== ADMIN_UID) {
      setMessage("Tu sesión no tiene permisos de administrador.");
      setDeletingId(null);
      router.replace("/admin/login");
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", product.id);

    if (error) {
      setMessage("No se pudo eliminar el material: " + error.message);
    } else {
      if (editingId === product.id) resetForm();
      setMessage("Material eliminado correctamente.");
      await loadProducts();
    }

    setDeletingId(null);
  }

  async function handleTogglePublished(product: Product) {
    const nextPublished = !product.published;
    const action = nextPublished ? "publicar" : "retirar de la tienda";

    const confirmed = window.confirm(
      `¿Deseas ${action} "${product.name}"?`
    );

    if (!confirmed) return;

    setPublishingId(product.id);
    setMessage("");

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user || authData.user.id !== ADMIN_UID) {
      setMessage("Tu sesión no tiene permisos de administrador.");
      setPublishingId(null);
      router.replace("/admin/login");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({ published: nextPublished })
      .eq("id", product.id);

    if (error) {
      setMessage(`No se pudo ${action} el material: ${error.message}`);
    } else {
      setMessage(
        nextPublished
          ? `¡"${product.name}" ya está publicado en la tienda!`
          : `Se retiró "${product.name}" de la tienda. El material sigue guardado como borrador.`
      );
      await loadProducts();
    }

    setPublishingId(null);
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  function getCategoryName(product: Product) {
    if (Array.isArray(product.categories)) {
      return product.categories[0]?.name || "Sin categoría";
    }

    return product.categories?.name || "Sin categoría";
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fc]">
        <p className="text-lg font-bold text-purple-800">
          Verificando acceso administrativo...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fc] px-5 py-10">
      <div className="mx-auto max-w-[1500px]">
        <a
          href="/admin"
          className="font-bold text-purple-700 hover:text-pink-600"
        >
          ← Volver al panel administrativo
        </a>

        <div className="mt-6 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm md:p-9">
          <div className="mb-8">
            <p className="font-black uppercase tracking-widest text-pink-600">
              TIENDA MATERIAL DIDÁCTICO MR
            </p>

            <h1 className="mt-2 text-3xl font-black text-purple-950">
              {editingId ? "Editar material educativo" : "Registrar material educativo"}
            </h1>

            <p className="mt-2 text-base text-slate-500">
              {editingId
                ? "Modifica la información del material y guarda los cambios."
                : "Completa la información para incorporar un nuevo producto al catálogo."}
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="mb-2 block font-bold text-purple-900">
                Nombre del material *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ejemplo: Folleto de Matemáticas"
                className="w-full rounded-xl border border-purple-200 px-4 py-3 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-bold text-purple-900">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe el contenido y las características del material..."
                className="w-full rounded-xl border border-purple-200 px-4 py-3 outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-bold text-purple-900">
                  Categoría *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-bold text-purple-900">
                  Grado o nivel
                </label>
                <input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Ejemplo: Primer grado"
                  className="w-full rounded-xl border border-purple-200 px-4 py-3"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-bold text-purple-900">
                  Tipo de material
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
                >
                  <option>Material regular</option>
                  <option>Material adecuado</option>
                  <option>Servicio de apoyo</option>
                  <option>Folleto</option>
                  <option>Diagnóstico</option>
                  <option>Examen</option>
                  <option>Planeamiento</option>
                  <option>Guía de trabajo</option>
                  <option>Agenda docente</option>
                  <option>Otro material educativo</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-bold text-purple-900">
                  Cantidad de páginas
                </label>
                <input
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="Ejemplo: 160"
                  className="w-full rounded-xl border border-purple-200 px-4 py-3"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-purple-50 p-5">
              <h2 className="mb-4 font-black text-purple-950">
                Precios del material
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block font-bold text-purple-900">
                    Precio digital (₡)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={digitalPrice}
                    onChange={(e) => setDigitalPrice(e.target.value)}
                    placeholder="Ejemplo: 6000"
                    className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-bold text-purple-900">
                    Precio físico (₡)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={physicalPrice}
                    onChange={(e) => setPhysicalPrice(e.target.value)}
                    placeholder="Ejemplo: 25000"
                    className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-bold text-purple-900">
                Portada del material
              </label>

              {currentCoverUrl && (
                <div className="mb-3 flex items-center gap-4 rounded-xl bg-purple-50 p-3">
                  <img
                    src={currentCoverUrl}
                    alt="Portada actual"
                    className="h-20 w-16 rounded-lg border object-cover"
                  />
                  <p className="text-sm text-slate-600">
                    Portada actual. Si no seleccionas otra imagen, se conservará.
                  </p>
                </div>
              )}

              <input
                id="cover"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-purple-200 bg-white p-3"
              />
              <p className="mt-2 text-xs text-slate-500">
                Formatos JPG, PNG o WebP. Tamaño máximo: 5 MB.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-purple-100 p-5">
              <label className="flex items-center gap-3 font-bold text-purple-900">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-5 w-5 accent-purple-700"
                />
                Mostrar como producto destacado
              </label>

              <label className="flex items-center gap-3 font-bold text-purple-900">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-5 w-5 accent-pink-600"
                />
                Publicar inmediatamente en la tienda
              </label>

              <p className="text-xs text-slate-500">
                Si no marcas publicar, el material quedará guardado como borrador.
              </p>
            </div>

            {message && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 font-semibold text-purple-900">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-full bg-purple-700 px-6 py-4 font-black text-white hover:bg-purple-800 disabled:opacity-60"
              >
                {saving
                  ? editingId
                    ? "Actualizando material..."
                    : "Guardando material..."
                  : editingId
                    ? "Guardar cambios"
                    : "Guardar material"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-purple-200 px-6 py-4 font-bold text-purple-800 hover:bg-purple-50"
                >
                  Cancelar edición
                </button>
              )}

              <a
                href="/admin"
                className="rounded-full border border-purple-200 px-6 py-4 font-bold text-purple-800 hover:bg-purple-50"
              >
                Volver al panel
              </a>
            </div>
          </form>
        </div>

        <section className="mt-12 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-black uppercase tracking-widest text-pink-600">
                CATÁLOGO ADMINISTRATIVO
              </p>
              <h2 className="mt-2 text-3xl font-black text-purple-950">
                Materiales registrados
              </h2>
              <p className="mt-2 text-slate-500">
                Consulta, edita o elimina los materiales guardados en tu tienda.
              </p>
            </div>

            <button
              type="button"
              onClick={loadProducts}
              disabled={loadingProducts}
              className="rounded-full border border-purple-200 px-5 py-3 font-bold text-purple-800 hover:bg-purple-50"
            >
              {loadingProducts ? "Actualizando..." : "↻ Actualizar"}
            </button>
          </div>

          <div className="mt-7">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar material por nombre..."
              className="w-full rounded-xl border border-purple-200 px-5 py-4 outline-none focus:border-purple-500"
            />
          </div>

          <div className="mt-6">
            {loadingProducts ? (
              <p className="py-10 text-center text-slate-500">
                Cargando materiales...
              </p>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-purple-50 p-10 text-center">
                <p className="text-xl font-bold text-purple-950">
                  No se encontraron materiales.
                </p>
                <p className="mt-2 text-slate-500">
                  Los productos guardados aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead>
                    <tr className="border-b border-purple-100 text-sm text-purple-900">
                      <th className="px-4 py-4">Material</th>
                      <th className="px-4 py-4">Categoría</th>
                      <th className="px-4 py-4">Grado</th>
                      <th className="px-4 py-4">Precio digital</th>
                      <th className="px-4 py-4">Estado</th>
                      <th className="px-4 py-4">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-purple-50 hover:bg-purple-50/50"
                      >
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            {product.cover_url ? (
                              <img
                                src={product.cover_url}
                                alt={product.name}
                                className="h-14 w-12 rounded-lg border object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">
                                📚
                              </div>
                            )}

                            <div>
                              <p className="font-bold text-purple-950">
                                {product.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {product.material_type || "Material educativo"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5 text-sm text-slate-600">
                          {getCategoryName(product)}
                        </td>

                        <td className="px-4 py-5 text-sm text-slate-600">
                          {product.grade || "No especificado"}
                        </td>

                        <td className="px-4 py-5 text-sm font-bold text-purple-900">
                          {product.digital_price !== null
                            ? `₡${Number(product.digital_price).toLocaleString("es-CR")}`
                            : "No indicado"}
                        </td>

                        <td className="px-4 py-5">
                          {product.published ? (
                            <span className="rounded-full bg-green-100 px-3 py-2 text-xs font-bold text-green-800">
                              Publicado
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
                              Borrador
                            </span>
                          )}

                          {product.featured && (
                            <p className="mt-2 text-xs font-bold text-pink-600">
                              ★ Destacado
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openPreviews(product)}
                              className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-100"
                            >
                              Muestras
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePublished(product)}
                              disabled={publishingId === product.id}
                              className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                                product.published
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "bg-green-100 text-green-800 hover:bg-green-200"
                              }`}
                            >
                              {publishingId === product.id
                                ? "Actualizando..."
                                : product.published
                                  ? "Retirar"
                                  : "Publicar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditing(product)}
                              className="rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-800 hover:bg-purple-200"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(product)}
                              disabled={deletingId === product.id}
                              className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              {deletingId === product.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-5 text-sm text-slate-500">
              Total de materiales: {filteredProducts.length}
            </p>
          </div>
        </section>

        {previewProduct && (
          <section className="mt-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-black uppercase tracking-widest text-blue-600">VISTA PREVIA DEL MATERIAL</p>
                <h2 className="mt-2 text-2xl font-black text-purple-950">{previewProduct.name}</h2>
                <p className="mt-2 text-sm text-slate-500">Sube páginas de muestra. La marca de agua se incorpora directamente a cada imagen antes de guardarla.</p>
              </div>
              <button
                type="button"
                onClick={() => { setPreviewProduct(null); setPreviewFiles([]); setPreviewRecords([]); setPreviewMessage(""); }}
                className="rounded-full border border-purple-200 px-5 py-2 font-bold text-purple-800 hover:bg-purple-50"
              >
                Cerrar muestras
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-blue-50 p-5">
              <label htmlFor="preview-files" className="mb-2 block font-bold text-purple-900">Seleccionar imágenes de muestra</label>
              <input
                id="preview-files"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setPreviewFiles(Array.from(e.target.files || []))}
                className="w-full rounded-xl border border-blue-200 bg-white p-3"
              />
              <p className="mt-2 text-xs text-slate-600">JPG, PNG o WebP. Máximo 10 MB por imagen. Se guardarán como imágenes JPG con marca de agua repetida.</p>
              {previewFiles.length > 0 && <p className="mt-2 text-sm font-semibold text-purple-800">{previewFiles.length} imagen(es) seleccionada(s).</p>}
              <button
                type="button"
                onClick={handleUploadPreviews}
                disabled={uploadingPreviews || previewFiles.length === 0}
                className="mt-4 rounded-full bg-purple-700 px-6 py-3 font-bold text-white hover:bg-purple-800 disabled:opacity-50"
              >
                {uploadingPreviews ? "Procesando y subiendo..." : "Subir muestras con marca de agua"}
              </button>
            </div>

            {previewMessage && <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-900">{previewMessage}</p>}

            <div className="mt-7">
              <h3 className="mb-4 font-black text-purple-950">Muestras registradas ({previewRecords.length})</h3>
              {loadingPreviews ? (
                <p className="py-6 text-center text-slate-500">Cargando muestras...</p>
              ) : previewRecords.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Todavía no hay páginas de muestra para este material.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {previewRecords.map((preview) => (
                    <div key={preview.id} className="rounded-xl border border-purple-100 p-2">
                      <img src={preview.image_url} alt={`Muestra página ${preview.page_number || ""}`} className="aspect-[3/4] w-full rounded-lg object-contain bg-slate-50" />
                      <p className="mt-2 text-center text-xs font-bold text-slate-600">Página {preview.page_number || "—"}</p>
                      <button type="button" onClick={() => handleDeletePreview(preview)} className="mt-2 w-full rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Eliminar muestra</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="py-8 text-center text-sm text-slate-500">
          © 2027 Material Didáctico MR. Todos los derechos reservados.
        </footer>
      </div>
    </main>
  );
}