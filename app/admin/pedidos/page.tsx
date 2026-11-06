 "use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_UID = "42755f00-5e71-41ef-9b11-a2446e290676";

const ORDER_STATUSES = [
  "Pendiente",
  "En revisión",
  "Confirmado",
  "Entregado",
  "Cancelado",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

type Order = {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  institution: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  payment_method: string | null;
  payment_status: "Pendiente" | "Comprobante enviado" | "Verificado" | "Rechazado";
  payment_reference: string | null;
  payment_proof_path: string | null;
  payment_submitted_at: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  format: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type OrderWithItems = Order & {
  items: OrderItem[];
  paymentProofUrl: string | null;
};

const formatPrice = (value: number) =>
  `₡${Number(value).toLocaleString("es-CR")}`;

const statusStyle: Record<OrderStatus, string> = {
  Pendiente: "bg-amber-100 text-amber-800",
  "En revisión": "bg-blue-100 text-blue-800",
  Confirmado: "bg-emerald-100 text-emerald-800",
  Entregado: "bg-purple-100 text-purple-800",
  Cancelado: "bg-red-100 text-red-800",
};

export default function AdminPedidosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, customer_name, customer_phone, institution, total_amount, status, created_at, payment_method, payment_status, payment_reference, payment_proof_path, payment_submitted_at"
      )
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error("Error al cargar pedidos:", orderError);
      setError(`No fue posible cargar los pedidos: ${orderError.message}`);
      setLoading(false);
      return;
    }

    const savedOrders = (orderData || []) as Order[];

    if (savedOrders.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ids = savedOrders.map((order) => order.id);
    const { data: itemData, error: itemError } = await supabase
      .from("order_items")
      .select(
        "id, order_id, product_name, format, quantity, unit_price, subtotal"
      )
      .in("order_id", ids)
      .order("created_at", { ascending: true });

    if (itemError) {
      console.error("Error al cargar detalles:", itemError);
      setError(`Los pedidos se encontraron, pero no sus detalles: ${itemError.message}`);
      setLoading(false);
      return;
    }

    const allItems = (itemData || []) as OrderItem[];

    const ordersWithProofs = await Promise.all(
      savedOrders.map(async (order) => {
        let paymentProofUrl: string | null = null;

        if (order.payment_proof_path) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from("comprobantes-sinpe")
            .createSignedUrl(order.payment_proof_path, 60 * 10);

          if (signedError) {
            console.error("No se pudo generar el enlace del comprobante:", signedError);
          } else {
            paymentProofUrl = signedData?.signedUrl || null;
          }
        }

        return {
          ...order,
          total_amount: Number(order.total_amount),
          paymentProofUrl,
          items: allItems
            .filter((item) => item.order_id === order.id)
            .map((item) => ({
              ...item,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              subtotal: Number(item.subtotal),
            })),
        };
      })
    );

    setOrders(ordersWithProofs);

    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;

      if (authError || !data.user || data.user.id !== ADMIN_UID) {
        router.replace("/admin/login");
        return;
      }

      setCheckingAdmin(false);
      await loadOrders();
    }

    verifyAdmin();

    return () => {
      active = false;
    };
  }, [router, loadOrders]);

  async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
    setUpdatingId(orderId);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error actualizando estado:", updateError);
      setError(`No fue posible actualizar el pedido: ${updateError.message}`);
      setUpdatingId(null);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order
      )
    );
    setMessage("El estado del pedido se actualizó correctamente.");
    setUpdatingId(null);
  }


  async function verifyPayment(orderId: string) {
    const confirmed = window.confirm(
      "¿Confirmas que verificaste el ingreso del dinero en SINPE y deseas aprobar este pago?"
    );
    if (!confirmed) return;

    setUpdatingId(orderId);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("orders")
      .update({ payment_status: "Verificado", status: "Confirmado" })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error verificando pago:", updateError);
      setError(`No fue posible verificar el pago: ${updateError.message}`);
      setUpdatingId(null);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, payment_status: "Verificado", status: "Confirmado" }
          : order
      )
    );
    setMessage("Pago verificado. El pedido ahora aparece como Confirmado.");
    setUpdatingId(null);
  }

  const filteredOrders = orders.filter((order) => {
    const text = [
      order.id,
      order.customer_name,
      order.customer_phone,
      order.institution,
      ...order.items.map((item) => item.product_name),
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "Todos" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = orders.filter(
    (order) => order.status === "Pendiente"
  ).length;

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffdfb] p-6">
        <p className="font-semibold text-purple-900">
          Verificando acceso administrativo...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffdfb] px-4 py-8 text-[#21183b] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
                MATERIAL DIDÁCTICO MR
              </p>
              <h1 className="mt-2 text-3xl font-black text-purple-950">
                Gestión de pedidos
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Consulta los pedidos de tus clientes y actualiza su estado.
              </p>
            </div>
            <a
              href="/admin"
              className="rounded-full border border-purple-200 px-5 py-3 text-sm font-bold text-purple-800 hover:bg-purple-50"
            >
              Volver al panel
            </a>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-purple-50 p-4">
              <p className="text-sm text-purple-700">Pedidos registrados</p>
              <p className="mt-1 text-2xl font-black text-purple-950">
                {orders.length}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm text-amber-800">Pendientes</p>
              <p className="mt-1 text-2xl font-black text-amber-900">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800">Total registrado</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">
                {formatPrice(
                  orders.reduce((sum, order) => sum + order.total_amount, 0)
                )}
              </p>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cliente, teléfono o pedido..."
            className="w-full rounded-xl border border-purple-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-purple-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
          >
            <option value="Todos">Todos los estados</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "↻ Actualizar"}
          </button>
        </section>

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">
            Cargando pedidos...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-4xl">📦</p>
            <h2 className="mt-3 text-xl font-black text-purple-950">
              No hay pedidos para mostrar
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Prueba con otro filtro o actualiza el listado.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-purple-100 p-5 sm:p-6">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider text-pink-600">
                      Pedido
                    </p>
                    <p className="mt-1 break-all text-sm font-bold text-purple-950">
                      {order.id}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString("es-CR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      statusStyle[order.status] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                  <div>
                    <h2 className="font-black text-purple-950">
                      Datos del cliente
                    </h2>
                    <p className="mt-2 text-sm">
                      <strong>Nombre:</strong> {order.customer_name}
                    </p>
                    <p className="mt-1 text-sm">
                      <strong>Teléfono:</strong> {order.customer_phone}
                    </p>
                    <p className="mt-1 text-sm">
                      <strong>Institución:</strong> {order.institution}
                    </p>
                    <a
                      href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola ${order.customer_name}, te contactamos de Material Didáctico MR sobre tu pedido ${order.id}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:bg-[#1ebe5d]"
                    >
                      Contactar por WhatsApp
                    </a>
                  </div>

                  <div>
                    <h2 className="font-black text-purple-950">
                      Actualizar estado
                    </h2>
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(event) =>
                        updateOrderStatus(
                          order.id,
                          event.target.value as OrderStatus
                        )
                      }
                      className="mt-3 w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-purple-500 disabled:opacity-60"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {updatingId === order.id && (
                      <p className="mt-2 text-xs text-slate-500">
                        Guardando cambio...
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-purple-100 bg-pink-50/50 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-black text-purple-950">
                      Verificación de pago SINPE
                    </h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${
                      order.payment_status === "Verificado"
                        ? "bg-emerald-100 text-emerald-800"
                        : order.payment_status === "Comprobante enviado"
                          ? "bg-blue-100 text-blue-800"
                          : order.payment_status === "Rechazado"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                    }`}>
                      {order.payment_status || "Pendiente"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Referencia SINPE
                      </p>
                      <p className="mt-2 break-all text-base font-black text-purple-950">
                        {order.payment_reference || "El cliente aún no ha enviado la referencia."}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">
                        Método: {order.payment_method || "No indicado"}
                      </p>
                      {order.payment_submitted_at && (
                        <p className="mt-1 text-xs text-slate-500">
                          Enviado: {new Date(order.payment_submitted_at).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Comprobante de pago
                      </p>
                      {order.paymentProofUrl ? (
                        <a
                          href={order.paymentProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-bold text-white hover:bg-purple-800"
                        >
                          Abrir comprobante ↗
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          {order.payment_proof_path
                            ? "No se pudo abrir el archivo. Presiona Actualizar e intenta nuevamente."
                            : "El cliente todavía no ha adjuntado un comprobante."}
                        </p>
                      )}
                    </div>
                  </div>

                  {order.payment_status === "Comprobante enviado" && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => verifyPayment(order.id)}
                        disabled={updatingId === order.id || !order.payment_proof_path}
                        className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingId === order.id ? "Guardando..." : "✓ Aprobar pago y confirmar pedido"}
                      </button>
                    </div>
                  )}

                  {order.payment_status === "Verificado" && (
                    <p className="mt-4 text-sm font-bold text-emerald-700">
                      ✓ Pago verificado. Pedido confirmado.
                    </p>
                  )}
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Verifica el ingreso del dinero directamente en SINPE antes de aprobar. La imagen del comprobante por sí sola no confirma el depósito.
                  </p>
                </div>

                <div className="space-y-3 border-t border-purple-100 bg-purple-50/40 p-5 sm:p-6">
                  <h2 className="font-black text-purple-950">
                    Materiales solicitados
                  </h2>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-4"
                    >
                      <div>
                        <p className="font-bold text-purple-950">
                          {item.product_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.format} · Cantidad: {item.quantity} · Unitario:{" "}
                          {formatPrice(item.unit_price)}
                        </p>
                      </div>
                      <strong className="text-purple-800">
                        {formatPrice(item.subtotal)}
                      </strong>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-purple-200 pt-4">
                    <span className="font-bold text-purple-950">
                      Total del pedido
                    </span>
                    <strong className="text-xl font-black text-purple-800">
                      {formatPrice(order.total_amount)}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
