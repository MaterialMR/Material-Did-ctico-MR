 "use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Preview = {
  id: string;
  product_id: string;
  image_url: string;
  page_number: number | null;
};

type CartItem = {
  productId: string;
  name: string;
  format: "Digital" | "Físico";
  price: number;
  quantity: number;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  grade: string | null;
  material_type: string | null;
  digital_price: number | null;
  physical_price: number | null;
  cover_url: string | null;
  pages: number | null;
  featured: boolean;
  category: string;
};

const categoryOrder = [
  "preescolar",
  "primaria",
  "servicio-de-apoyo",
  "diagnosticos-examenes",
  "planeamientos-guias",
  "agenda-docente-2027",
];

const formatPrice = (price: number) =>
  `₡${price.toLocaleString("es-CR")}`;

const whatsappLink = (productName?: string) => {
  const message = productName
    ? `Hola, Material Didáctico MR. Deseo información sobre ${productName}.`
    : "Hola, Material Didáctico MR. Deseo información sobre sus materiales educativos.";

  return `https://wa.me/50683943170?text=${encodeURIComponent(message)}`;
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewsByProduct, setPreviewsByProduct] = useState<Record<string, Preview[]>>({});
  const [activePreviewProduct, setActivePreviewProduct] = useState<Product | null>(null);
  const [activeDetailProduct, setActiveDetailProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [pendingOrder, setPendingOrder] = useState<{ id: string; total: number } | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [sendingPayment, setSendingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      const { data, error } = await supabase.auth.getSession();

      if (!error && mounted) {
        setCurrentUser(data.session?.user ?? null);
      }
    }

    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("No fue posible cerrar la sesión. Inténtalo nuevamente.");
      return;
    }

    setCurrentUser(null);
    window.location.reload();
  }

  function addToCart(product: Product, format: "Digital" | "Físico") {
    const price = format === "Digital" ? product.digital_price : product.physical_price;
    if (price === null) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id && item.format === format);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id && item.format === format
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { productId: product.id, name: product.name, format, price: Number(price), quantity: 1 }];
    });
  }

  function changeCartQuantity(productId: string, format: "Digital" | "Físico", quantity: number) {
    if (quantity < 1) {
      setCart((current) => current.filter((item) => !(item.productId === productId && item.format === format)));
      return;
    }
    setCart((current) => current.map((item) =>
      item.productId === productId && item.format === format ? { ...item, quantity } : item
    ));
  }

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  async function createOrderAndContinue() {
    setOrderError("");

    if (cart.length === 0) {
      setOrderError("Agrega al menos un material antes de continuar.");
      return;
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      setOrderError("Para registrar tu pedido primero debes iniciar sesión.");
      return;
    }

    setSendingOrder(true);

    const { data: orderId, error: orderErrorFromSupabase } =
      await supabase.rpc("create_customer_order", {
        p_items: cart.map((item) => ({
          product_id: item.productId,
          format: item.format,
          quantity: item.quantity,
        })),
      });

    if (orderErrorFromSupabase || !orderId) {
      console.error("No fue posible registrar el pedido:", orderErrorFromSupabase);
      setSendingOrder(false);
      setOrderError(
        orderErrorFromSupabase?.message ||
          "No fue posible registrar el pedido. Inténtalo nuevamente."
      );
      return;
    }

    const { data: savedOrder, error: savedOrderError } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("id", orderId)
      .single();

    if (savedOrderError || !savedOrder) {
      console.error("El pedido se creó, pero no se pudo consultar su total:", savedOrderError);
      setSendingOrder(false);
      setOrderError(
        `El pedido quedó registrado con el número ${orderId}, pero no pudimos preparar el mensaje de WhatsApp. Contacta a la tienda indicando ese número.`
      );
      return;
    }

    setPendingOrder({
      id: orderId,
      total: Number(savedOrder.total_amount),
    });
    setCart([]);
    setSendingOrder(false);
    setPaymentReference("");
    setPaymentProof(null);
    setPaymentMessage("");
  }

  async function submitPaymentProof() {
    setOrderError("");
    setPaymentMessage("");

    if (!pendingOrder) return;
    if (!paymentReference.trim()) {
      setOrderError("Escribe la referencia de la transferencia SINPE.");
      return;
    }
    if (!paymentProof) {
      setOrderError("Selecciona la captura del comprobante SINPE.");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(paymentProof.type)) {
      setOrderError("Solo se permiten imágenes JPG o PNG.");
      return;
    }
    if (paymentProof.size > 5 * 1024 * 1024) {
      setOrderError("La imagen supera el límite permitido de 5 MB.");
      return;
    }

    setSendingPayment(true);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (sessionError || !user) {
      setSendingPayment(false);
      setOrderError("Tu sesión no está activa. Inicia sesión nuevamente.");
      return;
    }

    const extension = paymentProof.type === "image/png" ? "png" : "jpg";
    const filePath = `${user.id}/${pendingOrder.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("comprobantes-sinpe")
      .upload(filePath, paymentProof, {
        contentType: paymentProof.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error al subir comprobante SINPE:", uploadError);
      setSendingPayment(false);
      setOrderError(uploadError.message || "No fue posible subir el comprobante.");
      return;
    }

    const { error: paymentError } = await supabase.rpc("submit_order_payment", {
      p_order_id: pendingOrder.id,
      p_reference: paymentReference.trim(),
      p_proof_path: filePath,
    });

    if (paymentError) {
      console.error("Error al registrar el comprobante:", paymentError);
      await supabase.storage.from("comprobantes-sinpe").remove([filePath]);
      setSendingPayment(false);
      setOrderError(paymentError.message || "No fue posible registrar el comprobante.");
      return;
    }

    setSendingPayment(false);
    setPaymentMessage("¡Comprobante enviado! El equipo de Material Didáctico MR verificará el pago. El pedido todavía no está marcado como pagado.");
  }

  useEffect(() => {
    async function loadStore() {
      setLoading(true);
      setErrorMessage("");

      const { data: categoryData, error: categoryError } =
        await supabase
          .from("categories")
          .select("id, name, slug")
          .eq("active", true);

      if (categoryError) {
        console.error("Error al cargar categorías:", categoryError);
        setErrorMessage("No fue posible cargar las categorías.");
        setLoading(false);
        return;
      }

      const orderedCategories = (categoryData || []).sort(
        (a, b) =>
          categoryOrder.indexOf(a.slug) -
          categoryOrder.indexOf(b.slug)
      );

      setCategories(orderedCategories);

      const { data: productData, error: productError } =
        await supabase
          .from("products")
          .select(
            "id, name, description, category_id, grade, material_type, digital_price, physical_price, cover_url, pages, featured"
          )
          .eq("published", true)
          .order("created_at", { ascending: false });

      if (productError) {
        console.error("Error al cargar productos:", productError);
        setErrorMessage("No fue posible cargar los productos.");
        setLoading(false);
        return;
      }

      const productsWithCategory: Product[] = (productData || []).map(
        (product) => ({
          ...product,
          category:
            orderedCategories.find(
              (category) => category.id === product.category_id
            )?.name || "Sin categoría",
        })
      );

      setProducts(productsWithCategory);

      // Cargar únicamente las muestras asociadas a materiales publicados.
      if ((productData || []).length > 0) {
        const publishedProductIds = productData.map((product) => product.id);
        const { data: previewData, error: previewError } = await supabase
          .from("product_previews")
          .select("id, product_id, image_url, page_number")
          .in("product_id", publishedProductIds)
          .order("page_number", { ascending: true });

        if (previewError) {
          console.error("No fue posible cargar las muestras:", previewError);
        } else {
          const grouped: Record<string, Preview[]> = {};
          (previewData || []).forEach((preview) => {
            if (!grouped[preview.product_id]) grouped[preview.product_id] = [];
            grouped[preview.product_id].push(preview);
          });
          setPreviewsByProduct(grouped);
        }
      } else {
        setPreviewsByProduct({});
      }

      setLoading(false);
    }

    loadStore();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      `${product.name} ${product.grade || ""} ${product.material_type || ""} ${product.description || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "Todos" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-[#fffdfb] text-[#21183b]">

      {/* ENCABEZADO */}
      <header className="border-b border-purple-100 bg-white">
        <div className="mx-auto max-w-[1450px] px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-5">

            <a href="#" className="flex items-center gap-3">
              <img
                src="/logo/logo-material-didactico-mr.png"
                alt="Material Didáctico MR"
                className="h-[76px] w-[76px] object-contain"
              />

              <div>
                <h1 className="text-xl font-black text-purple-900">
                  MATERIAL DIDÁCTICO MR
                </h1>
                <p className="text-xs text-slate-500">
                  Recursos educativos para docentes 💗
                </p>
              </div>
            </a>

            <div className="hidden rounded-full border-2 border-purple-100 px-6 py-3 text-sm font-semibold text-purple-900 lg:block">
              Recursos educativos para docentes 💗
            </div>

            <div className="flex items-center gap-5">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  className="flex min-w-[112px] items-center justify-center gap-2 rounded-full border border-purple-100 bg-white px-4 py-2 text-sm font-bold text-purple-900 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  <span className="text-xl">👤</span>
                  <span>Mi cuenta</span>
                  <span className={`text-xs transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}>⌄</span>
                </button>

                {accountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-purple-100 bg-white text-left shadow-xl shadow-purple-900/10"
                  >
                    {currentUser ? (
                      <>
                        <div className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-500">
                            Cuenta del cliente
                          </p>
                          <p className="mt-1 truncate text-sm font-extrabold text-purple-950">
                            {currentUser.user_metadata?.full_name || "Cliente"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {currentUser.email}
                          </p>
                        </div>

                        <a
                          href="/mi-perfil"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-purple-50 hover:text-purple-900"
                        >
                          <span className="text-lg">👤</span>
                          <span>Mi perfil</span>
                        </a>
                        <a
                          href="/mis-pedidos"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-purple-50 hover:text-purple-900"
                        >
                          <span className="text-lg">📦</span>
                          <span>Mis pedidos</span>
                        </a>
                        <div className="border-t border-slate-100 p-2">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-pink-700 transition hover:bg-pink-50"
                          >
                            <span className="text-lg">↪</span>
                            <span>Cerrar sesión</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-4">
                          <p className="text-sm font-extrabold text-purple-950">
                            ¡Te damos la bienvenida!
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Ingresa o crea tu cuenta para consultar tus pedidos.
                          </p>
                        </div>
                        <a
                          href="/iniciar-sesion"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-purple-50 hover:text-purple-900"
                        >
                          <span className="text-lg">🔐</span>
                          <span>Iniciar sesión</span>
                        </a>
                        <a
                          href="/registro"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-purple-50 hover:text-purple-900"
                        >
                          <span className="text-lg">✨</span>
                          <span>Crear mi cuenta</span>
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>

              <a
                href="#catalogo"
                className="text-center text-sm font-bold text-purple-900"
              >
                <span className="block text-2xl">📚</span>
                Catálogo
              </a>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="relative text-center text-sm font-bold text-purple-900"
              >
                <span className="block text-2xl">🛒</span>
                Mi carrito
                <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-600 px-1 text-[10px] text-white">{cartCount}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex overflow-hidden rounded-full border border-purple-100">
            <input
              type="search"
              placeholder="Buscar materiales, grados o temas..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedCategory("Todos");
              }}
              className="w-full px-5 py-3 text-sm outline-none"
            />

            <span className="bg-purple-700 px-6 py-3 text-white">
              🔍
            </span>
          </div>
        </div>
      </header>

      {/* MENÚ PRINCIPAL */}
      <nav className="bg-[#654092] text-white">
        <div className="mx-auto flex max-w-[1450px] flex-wrap justify-center">
          {[
            ["⌂", "Inicio", "#"],
            ["▣", "Catálogo", "#catalogo"],
            ["🎓", "Por grado", "#categorias"],
            ["☎", "Contacto", "#contacto"],
          ].map(([icon, name, link]) => (
            <a
              key={name}
              href={link}
              className="px-5 py-4 text-sm font-bold transition hover:bg-white hover:text-purple-800"
            >
              {icon} {name}
            </a>
          ))}
        </div>
      </nav>

      {/* BANNER PANORÁMICO */}
      <section className="w-full overflow-hidden bg-[#a9eeee]">
        <img
          src="/images/banner-tienda.png"
          alt="Bienvenidos a Material Didáctico MR"
          className="block h-auto w-full max-w-none"
        />
      </section>

      {/* CATEGORÍAS ILUSTRADAS */}
      <section
        id="categorias"
        className="mx-auto max-w-[1600px] px-3 py-12 md:px-6"
      >
        <div className="mb-8 text-center">
          <p className="font-black uppercase tracking-[0.18em] text-pink-600">
            ENCUENTRA LO QUE NECESITAS
          </p>

          <h2 className="mt-3 text-3xl font-black text-[#57317f]">
            Explora nuestros recursos
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Selecciona una categoría y descubre nuestros materiales educativos.
          </p>
        </div>

        <div className="relative mx-auto w-full">
          <img
            src="/images/categorias-tienda.png"
            alt="Categorías educativas de Material Didáctico MR"
            className="block h-auto w-full"
          />

          <div className="absolute inset-0 flex">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-label={`Explorar ${category.name}`}
                title={`Explorar ${category.name}`}
                onClick={() => {
                  setSelectedCategory(category.name);
                  document.getElementById("catalogo")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
                className="h-full flex-1 rounded-2xl transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-pink-500"
              />
            ))}
          </div>
        </div>
      </section>

      {/* MATERIALES */}
      <section
        id="catalogo"
        className="bg-[#fff8fc] py-16"
      >
        <div className="mx-auto max-w-[1450px] px-5">

          <div className="mb-9 text-center">
            <p className="font-black uppercase tracking-widest text-pink-600">
              NUESTRA SELECCIÓN
            </p>

            <h2 className="mt-2 text-3xl font-black text-purple-950">
              Materiales destacados
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Recursos educativos creados para acompañar tu labor docente.
            </p>
          </div>

          {/* FILTROS */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">

            <button
              onClick={() => setSelectedCategory("Todos")}
              className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                selectedCategory === "Todos"
                  ? "bg-purple-700 text-white"
                  : "border border-purple-200 bg-white text-purple-800 hover:bg-purple-50"
              }`}
            >
              Todos los materiales
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  selectedCategory === category.name
                    ? "bg-pink-600 text-white"
                    : "border border-pink-100 bg-white text-purple-800 hover:bg-pink-50"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {selectedCategory !== "Todos" && (
            <div className="mb-7 text-center">
              <p className="font-bold text-purple-800">
                Categoría seleccionada: {selectedCategory}
              </p>
            </div>
          )}

          {/* BUSCADOR */}
          <div className="mb-8 flex justify-end">
            <input
              type="search"
              placeholder="Buscar un material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md rounded-full border border-purple-100 bg-white px-6 py-3 outline-none focus:border-purple-500"
            />
          </div>

          {/* ESTADOS DE CARGA Y ERROR */}
          {loading && (
            <div className="py-16 text-center">
              <p className="text-4xl">📚</p>
              <p className="mt-4 font-bold text-purple-800">
                Cargando materiales educativos...
              </p>
            </div>
          )}

          {!loading && errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              {errorMessage}
            </div>
          )}

          {/* PRODUCTOS */}
          {!loading && !errorMessage && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative flex h-64 items-center justify-center overflow-hidden bg-purple-50">

                    {product.cover_url ? (
                      <img
                        src={product.cover_url}
                        alt={`Portada de ${product.name}`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-8xl">📚</span>
                    )}

                    {product.featured && (
                      <span className="absolute right-4 top-4 rounded-full bg-pink-600 px-4 py-2 text-xs font-black text-white">
                        DESTACADO
                      </span>
                    )}
                  </div>

                  <div className="p-6">

                    <p className="text-xs font-black uppercase text-purple-600">
                      {product.grade || product.category}
                    </p>

                    <h3 className="mt-2 text-xl font-black text-purple-950">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="mt-3 text-sm text-slate-500">
                        {product.description}
                      </p>
                    )}

                    <p className="mt-3 text-sm text-slate-500">
                      {product.material_type || "Material educativo"}
                      {product.pages ? ` · ${product.pages} páginas` : ""}
                    </p>

                    <button
                      type="button"
                      onClick={() => setActiveDetailProduct(product)}
                      className="mt-5 block w-full rounded-full border-2 border-purple-200 bg-white px-5 py-3 text-center text-sm font-black text-purple-800 transition hover:bg-purple-50"
                    >
                      Ver ficha completa
                    </button>

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-5">

                      {(previewsByProduct[product.id]?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setActivePreviewProduct(product)}
                          className="block w-full rounded-full border-2 border-purple-200 bg-purple-50 px-5 py-3 text-center text-sm font-black text-purple-800 transition hover:bg-purple-100"
                        >
                          Ver páginas de muestra ({previewsByProduct[product.id].length})
                        </button>
                      )}

                      {product.digital_price !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">
                            Formato digital
                          </span>
                          <span className="text-xl font-black text-purple-800">
                            {formatPrice(Number(product.digital_price))}
                          </span>
                        </div>
                      )}

                      {product.physical_price !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">
                            Formato físico
                          </span>
                          <span className="text-xl font-black text-purple-800">
                            {formatPrice(Number(product.physical_price))}
                          </span>
                        </div>
                      )}

                      <a
                        href={whatsappLink(product.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-full bg-pink-600 px-5 py-3 text-center text-sm font-black text-white hover:bg-pink-700"
                      >
                        Consultar por WhatsApp
                      </a>
                    </div>
                  </div>
                </article>
              ))}

            </div>
          )}

          {!loading && !errorMessage && filteredProducts.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-5xl">📚</p>

              <h3 className="mt-4 text-xl font-black text-purple-900">
                Todavía no hay materiales publicados.
              </h3>

              <p className="mt-2 text-slate-500">
                Pronto encontrarás nuevos recursos educativos.
              </p>

              <button
                onClick={() => {
                  setSelectedCategory("Todos");
                  setSearch("");
                }}
                className="mt-5 rounded-full bg-purple-700 px-6 py-3 font-bold text-white"
              >
                Ver todos los materiales
              </button>
            </div>
          )}

        </div>
      </section>

      {activePreviewProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Páginas de muestra de ${activePreviewProduct.name}`}
          onClick={() => setActivePreviewProduct(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-pink-600">
                  VISTA PREVIA DEL MATERIAL
                </p>
                <h2 className="mt-2 text-2xl font-black text-purple-950">
                  {activePreviewProduct.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Estas páginas son muestras protegidas con marca de agua.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewProduct(null)}
                className="rounded-full border border-purple-200 px-5 py-2 font-bold text-purple-800 hover:bg-purple-50"
              >
                Cerrar muestras
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
              {(previewsByProduct[activePreviewProduct.id] || []).map((preview) => (
                <figure key={preview.id} className="rounded-2xl border border-purple-100 bg-slate-50 p-3">
                  <img
                    src={preview.image_url}
                    alt={`Página de muestra ${preview.page_number || ""} de ${activePreviewProduct.name}`}
                    loading="lazy"
                    className="max-h-[65vh] w-full rounded-xl bg-white object-contain"
                  />
                  <figcaption className="mt-3 text-center text-sm font-bold text-purple-800">
                    Página {preview.page_number || "—"}
                  </figcaption>
                </figure>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Para adquirir el material o solicitar información, utiliza el botón de WhatsApp en su ficha.
            </p>
          </div>
        </div>
      )}

      {activeDetailProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Ficha completa de ${activeDetailProduct.name}`}
          onClick={() => setActiveDetailProduct(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-purple-100 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-pink-600">
                  INFORMACIÓN DEL MATERIAL
                </p>
                <h2 className="mt-1 text-2xl font-black text-purple-950">
                  {activeDetailProduct.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailProduct(null)}
                className="shrink-0 rounded-full border border-purple-200 px-4 py-2 text-sm font-bold text-purple-800 hover:bg-purple-50"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-7 p-6 md:grid-cols-2 md:p-8">
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-purple-50 p-4">
                {activeDetailProduct.cover_url ? (
                  <img
                    src={activeDetailProduct.cover_url}
                    alt={`Portada de ${activeDetailProduct.name}`}
                    className="max-h-[430px] w-full object-contain"
                  />
                ) : (
                  <span className="text-8xl">📚</span>
                )}
              </div>

              <div className="flex flex-col">
                <p className="text-xs font-black uppercase tracking-wider text-purple-600">
                  {activeDetailProduct.category}
                </p>
                <h3 className="mt-2 text-xl font-black text-purple-950">
                  {activeDetailProduct.name}
                </h3>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {activeDetailProduct.description || "Material educativo elaborado para apoyar los procesos de enseñanza y aprendizaje."}
                </p>

                <div className="mt-6 space-y-3 rounded-2xl bg-purple-50 p-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">Grado o nivel</span>
                    <strong className="text-right text-purple-950">{activeDetailProduct.grade || "No especificado"}</strong>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">Tipo de material</span>
                    <strong className="text-right text-purple-950">{activeDetailProduct.material_type || "Material educativo"}</strong>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">Cantidad de páginas</span>
                    <strong className="text-right text-purple-950">{activeDetailProduct.pages ? `${activeDetailProduct.pages} páginas` : "No especificada"}</strong>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                  {activeDetailProduct.digital_price !== null && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-600">Formato digital</span>
                      <strong className="text-xl font-black text-purple-800">{formatPrice(Number(activeDetailProduct.digital_price))}</strong>
                    </div>
                  )}
                  {activeDetailProduct.physical_price !== null && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-600">Formato físico</span>
                      <strong className="text-xl font-black text-purple-800">{formatPrice(Number(activeDetailProduct.physical_price))}</strong>
                    </div>
                  )}
                </div>

                {(previewsByProduct[activeDetailProduct.id]?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDetailProduct(null);
                      setActivePreviewProduct(activeDetailProduct);
                    }}
                    className="mt-5 w-full rounded-full border-2 border-purple-200 bg-purple-50 px-5 py-3 text-sm font-black text-purple-800 hover:bg-purple-100"
                  >
                    Ver páginas de muestra ({previewsByProduct[activeDetailProduct.id].length})
                  </button>
                )}

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeDetailProduct.digital_price !== null && (
                    <button
                      type="button"
                      onClick={() => addToCart(activeDetailProduct, "Digital")}
                      className="rounded-full border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-black text-purple-800 hover:bg-purple-100"
                    >
                      Agregar digital al carrito
                    </button>
                  )}
                  {activeDetailProduct.physical_price !== null && (
                    <button
                      type="button"
                      onClick={() => addToCart(activeDetailProduct, "Físico")}
                      className="rounded-full border-2 border-pink-200 bg-pink-50 px-4 py-3 text-sm font-black text-pink-700 hover:bg-pink-100"
                    >
                      Agregar físico al carrito
                    </button>
                  )}
                </div>

                <a
                  href={whatsappLink(activeDetailProduct.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block rounded-full bg-pink-600 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-pink-700"
                >
                  Consultar o adquirir por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Mi carrito de compras"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-purple-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-pink-600">TIENDA MATERIAL DIDÁCTICO MR</p>
                <h2 className="mt-1 text-2xl font-black text-purple-950">Mi carrito ({cartCount})</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="rounded-full border border-purple-200 px-4 py-2 text-sm font-bold text-purple-800 hover:bg-purple-50">Cerrar</button>
            </div>

            {pendingOrder ? (
              <div className="mt-5 space-y-5">
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-purple-600">PEDIDO REGISTRADO</p>
                  <p className="mt-2 break-all text-sm font-bold text-purple-950">Número: {pendingOrder.id}</p>
                  <p className="mt-3 text-sm text-slate-600">Total exacto a transferir</p>
                  <p className="text-3xl font-black text-purple-800">{formatPrice(pendingOrder.total)}</p>
                </div>

                <div className="rounded-2xl border border-pink-200 bg-pink-50 p-5">
                  <h3 className="font-black text-purple-950">Pago por SINPE Móvil</h3>
                  <p className="mt-3 text-sm text-slate-600">Número SINPE</p>
                  <p className="text-2xl font-black text-purple-900">8394-3170</p>
                  <p className="mt-2 text-sm text-slate-600">Titular</p>
                  <p className="font-bold text-purple-950">Melissa Rosales Ruiz</p>
                  <p className="mt-3 text-xs leading-5 text-slate-600">Realiza la transferencia por el monto exacto indicado. Después adjunta la captura del comprobante.</p>
                </div>

                {paymentMessage ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm font-semibold text-green-800">
                    {paymentMessage}
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-bold text-purple-950">
                      Referencia SINPE
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(event) => setPaymentReference(event.target.value)}
                        placeholder="Escribe el número de referencia"
                        className="mt-2 w-full rounded-xl border border-purple-200 px-4 py-3 font-normal outline-none focus:border-purple-500"
                      />
                    </label>
                    <label className="block text-sm font-bold text-purple-950">
                      Captura del comprobante (JPG o PNG, máximo 5 MB)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        onChange={(event) => setPaymentProof(event.target.files?.[0] || null)}
                        className="mt-2 block w-full rounded-xl border border-purple-200 bg-white p-3 text-sm"
                      />
                    </label>
                    {paymentProof && <p className="text-xs text-slate-500">Archivo seleccionado: {paymentProof.name}</p>}
                    {orderError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{orderError}</div>}
                    <button
                      type="button"
                      onClick={submitPaymentProof}
                      disabled={sendingPayment}
                      className="w-full rounded-full bg-purple-700 px-6 py-4 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingPayment ? "Enviando comprobante..." : "Enviar comprobante para revisión"}
                    </button>
                  </>
                )}
                <p className="text-xs leading-5 text-slate-500">El comprobante será revisado manualmente. Enviar una imagen no significa que el pago esté aprobado.</p>
                <button type="button" onClick={() => setCartOpen(false)} className="w-full rounded-full border border-purple-200 px-5 py-3 text-sm font-bold text-purple-800 hover:bg-purple-50">Cerrar</button>
              </div>
            ) : cart.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-5xl">🛒</p>
                <h3 className="mt-4 text-lg font-black text-purple-900">Tu carrito está vacío</h3>
                <p className="mt-2 text-sm text-slate-500">Abre la ficha de un material y agrega el formato digital o físico.</p>
                <button type="button" onClick={() => setCartOpen(false)} className="mt-5 rounded-full bg-purple-700 px-6 py-3 text-sm font-bold text-white">Seguir explorando</button>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.format}`} className="rounded-2xl border border-purple-100 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-purple-950">{item.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">Formato {item.format} · {formatPrice(item.price)} cada uno</p>
                        </div>
                        <strong className="text-lg text-purple-800">{formatPrice(item.price * item.quantity)}</strong>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button type="button" aria-label="Disminuir cantidad" onClick={() => changeCartQuantity(item.productId, item.format, item.quantity - 1)} className="h-8 w-8 rounded-full border border-purple-200 font-black text-purple-800">−</button>
                          <span className="min-w-5 text-center font-bold">{item.quantity}</span>
                          <button type="button" aria-label="Aumentar cantidad" onClick={() => changeCartQuantity(item.productId, item.format, item.quantity + 1)} className="h-8 w-8 rounded-full border border-purple-200 font-black text-purple-800">+</button>
                        </div>
                        <button type="button" onClick={() => changeCartQuantity(item.productId, item.format, 0)} className="text-sm font-bold text-red-600 hover:underline">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-purple-100 pt-5">
                  <span className="text-lg font-bold text-purple-950">Total del pedido</span>
                  <strong className="text-2xl font-black text-purple-800">{formatPrice(cartTotal)}</strong>
                </div>
                <p className="mt-2 text-xs text-slate-500">Al registrar el pedido podrás realizar el pago por SINPE Móvil y adjuntar el comprobante.</p>
                {orderError && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{orderError}</p>
                    {!currentUser && (
                      <a
                        href="/iniciar-sesion"
                        className="mt-2 inline-block font-bold underline"
                      >
                        Iniciar sesión
                      </a>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={createOrderAndContinue}
                  disabled={sendingOrder}
                  className="mt-5 block w-full rounded-full bg-purple-700 px-6 py-4 text-center text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingOrder ? "Registrando pedido..." : "Registrar pedido y pagar con SINPE"}
                </button>
                <p className="mt-2 text-xs text-slate-500">
El pedido se guardará en tu cuenta y luego podrás adjuntar el comprobante SINPE.
                </p>
                <button type="button" onClick={() => setCart([])} className="mt-3 w-full rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50">Vaciar carrito</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* PIE DE PÁGINA */}
      <footer
        id="contacto"
        className="bg-[#35234f] px-6 py-12 text-white"
      >
        <div className="mx-auto grid max-w-[1450px] gap-10 md:grid-cols-3">

          {/* MARCA */}
          <div className="flex items-center gap-4">
            <img
              src="/logo/logo-material-didactico-mr.png"
              alt="Material Didáctico MR"
              className="h-20 w-20 object-contain"
            />

            <div>
              <h2 className="text-lg font-black">
                MATERIAL DIDÁCTICO MR
              </h2>

              <p className="mt-2 text-sm text-purple-200">
                Recursos educativos para docentes.
              </p>
            </div>
          </div>

          {/* INFORMACIÓN */}
          <div>
            <h3 className="text-lg font-black">
              Nuestra tienda
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-purple-200">
              Materiales, folletos, guías, planeamientos y recursos
              para acompañar la educación costarricense.
            </p>

            <p className="mt-3 text-sm text-purple-200">
              Colección educativa 2027.
            </p>
          </div>

          {/* WHATSAPP */}
          <div>
            <h3 className="text-lg font-black">
              ¿Necesitas ayuda?
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-purple-200">
              ¿Deseas adquirir algún material o tienes alguna consulta?
              Estamos para ayudarte.
            </p>

            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] px-6 py-4 font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#1ebe5d] hover:shadow-xl"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path d="M20.52 3.48A11.83 11.83 0 0 0 12.08 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.9 11.9 0 0 0 5.8 1.47h.01c6.58 0 11.93-5.35 11.93-11.93a11.86 11.86 0 0 0-3.49-8.42ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.97.99-3.63-.23-.37a9.88 9.88 0 0 1-1.52-5.25c0-5.46 4.44-9.9 9.9-9.9a9.83 9.83 0 0 1 7 2.9 9.83 9.83 0 0 1 2.9 7c0 5.46-4.45 9.87-9.91 9.87Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
              </svg>

              <span>CONTÁCTANOS POR WHATSAPP</span>
            </a>

            <p className="mt-3 text-center text-sm text-purple-200">
              +506 8394-3170
            </p>
          </div>
        </div>

        {/* DERECHOS */}
        <div className="mx-auto mt-10 max-w-[1450px] border-t border-purple-400/30 pt-6 text-center text-xs text-purple-200">
          © 2027 Material Didáctico MR. Todos los derechos reservados.
        </div>
      </footer>

    </main>
  );
}