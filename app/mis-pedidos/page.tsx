"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Order = {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
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
};

const formatPrice = (price: number) =>
  `₡${Number(price).toLocaleString("es-CR")}`;

const statusStyles: Record<string, string> = {
  Pendiente: "bg-amber-100 text-amber-800",
  "En revisión": "bg-blue-100 text-blue-800",
  Confirmado: "bg-green-100 text-green-800",
  Entregado: "bg-purple-100 text-purple-800",
  Cancelado: "bg-red-100 text-red-800",
};

export default function MisPedidosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        if (active) {
          setError("No fue posible comprobar tu sesión. Actualiza la página.");
          setLoading(false);
        }
        return;
      }

      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/iniciar-sesion");
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, customer_name, total_amount, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (orderError) {
        console.error("Error al cargar pedidos:", orderError);
        setError(
          `No fue posible cargar tus pedidos: ${orderError.message}`
        );
        setLoading(false);
        return;
      }

      const savedOrders = orderData || [];

      if (savedOrders.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = savedOrders.map((order) => order.id);

      const { data: itemData, error: itemError } = await supabase
        .from("order_items")
        .select("id, order_id, product_name, format, quantity, unit_price, subtotal")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (!active) return;

      if (itemError) {
        console.error("Error al cargar detalles de pedidos:", itemError);
        setError(
          `Se encontraron tus pedidos, pero no fue posible cargar sus detalles: ${itemError.message}`
        );
        setLoading(false);
        return;
      }

      const allItems = itemData || [];

      setOrders(
        savedOrders.map((order) => ({
          ...order,
          total_amount: Number(order.total_amount),
          items: allItems
            .filter((item) => item.order_id === order.id)
            .map((item) => ({
              ...item,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              subtotal: Number(item.subtotal),
            })),
        }))
      );

      setLoading(false);
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#fffdfb] px-4 py-10 text-[#21183b]">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8 rounded-3xl bg-white p-7 text-center shadow-sm">
          <div className="text-4xl">📦</div>
          <h1 className="mt-3 text-3xl font-black text-purple-950">
            Mis pedidos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulta tus pedidos y revisa su estado.
          </p>
          <p className="mt-1 text-sm font-semibold text-purple-700">
            Tienda Material Didáctico MR
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-3xl">📚</p>
            <p className="mt-3 font-semibold text-purple-900">
              Cargando tus pedidos...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-5xl">🛍️</p>
            <h2 className="mt-4 text-xl font-black text-purple-950">
              Todavía no tienes pedidos
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Cuando registres un pedido desde el carrito, aparecerá aquí.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-purple-700 px-6 py-3 text-sm font-bold text-white hover:bg-purple-800"
            >
              Explorar materiales
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => (
              <article
                key={order.id}
                className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-purple-100 p-5 sm:p-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-pink-600">
                      Pedido
                    </p>
                    <h2 className="mt-1 break-all text-sm font-bold text-purple-950">
                      {order.id}
                    </h2>
                    <p className="mt-2 text-xs text-slate-500">
                      Fecha:{" "}
                      {new Date(order.created_at).toLocaleString("es-CR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      statusStyles[order.status] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="space-y-3 p-5 sm:p-6">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-purple-50/70 p-4"
                    >
                      <div>
                        <h3 className="font-bold text-purple-950">
                          {item.product_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Formato {item.format} · Cantidad: {item.quantity}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Precio unitario: {formatPrice(item.unit_price)}
                        </p>
                      </div>
                      <strong className="text-base font-black text-purple-800">
                        {formatPrice(item.subtotal)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-purple-100 bg-white p-5 sm:px-6">
                  <span className="font-bold text-purple-950">
                    Total del pedido
                  </span>
                  <strong className="text-xl font-black text-purple-800">
                    {formatPrice(order.total_amount)}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm font-bold text-purple-700 underline hover:text-purple-900"
          >
            Volver a la tienda
          </Link>
        </div>
      </section>
    </main>
  );
}
