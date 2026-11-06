 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_UID = "42755f00-5e71-41ef-9b11-a2446e290676";
const COMPLETED_STATUSES = ["Confirmado", "Entregado"];

type Period = "today" | "week" | "month" | "year" | "all";

type Order = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer_name: string;
};

type OrderItem = {
  order_id: string;
  product_name: string;
  format: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type MonthSummary = {
  key: string;
  label: string;
  amount: number;
};

const money = (amount: number) =>
  `₡${Number(amount || 0).toLocaleString("es-CR")}`;

function getPeriodStart(period: Period): Date | null {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "today") return start;

  if (period === "week") {
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    return start;
  }

  if (period === "month") {
    start.setDate(1);
    return start;
  }

  if (period === "year") {
    start.setMonth(0, 1);
    return start;
  }

  return null;
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function AdminVentasPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [period, setPeriod] = useState<Period>("all");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user || authData.user.id !== ADMIN_UID) {
      router.replace("/admin/login");
      return;
    }

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at, customer_name")
      .order("created_at", { ascending: false });

    if (orderError) {
      setError(`No fue posible cargar los pedidos: ${orderError.message}`);
      setLoading(false);
      return;
    }

    const savedOrders = (orderData || []) as Order[];
    let savedItems: OrderItem[] = [];

    if (savedOrders.length > 0) {
      const { data: itemData, error: itemError } = await supabase
        .from("order_items")
        .select("order_id, product_name, format, quantity, unit_price, subtotal")
        .in("order_id", savedOrders.map((order) => order.id));

      if (itemError) {
        setError(`Se cargaron los pedidos, pero no los productos: ${itemError.message}`);
        setLoading(false);
        return;
      }

      savedItems = (itemData || []).map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      }));
    }

    setOrders(
      savedOrders.map((order) => ({
        ...order,
        total_amount: Number(order.total_amount),
      }))
    );
    setItems(savedItems);
    setLastUpdated(new Date().toLocaleString("es-CR"));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const periodOrders = useMemo(() => {
    const start = getPeriodStart(period);
    if (!start) return orders;
    return orders.filter((order) => new Date(order.created_at) >= start);
  }, [orders, period]);

  const completedOrders = periodOrders.filter((order) =>
    COMPLETED_STATUSES.includes(order.status)
  );
  const pendingOrders = periodOrders.filter((order) =>
    ["Pendiente", "En revisión"].includes(order.status)
  );
  const cancelledOrders = periodOrders.filter(
    (order) => order.status === "Cancelado"
  );
  const confirmedRevenue = completedOrders.reduce(
    (sum, order) => sum + order.total_amount,
    0
  );

  const periodOrderIds = new Set(periodOrders.map((order) => order.id));
  const periodItems = items.filter((item) => periodOrderIds.has(item.order_id));
  const completedOrderIds = new Set(completedOrders.map((order) => order.id));
  const completedItems = periodItems.filter((item) =>
    completedOrderIds.has(item.order_id)
  );

  const productTotals = new Map<string, number>();
  completedItems.forEach((item) => {
    productTotals.set(
      item.product_name,
      (productTotals.get(item.product_name) || 0) + item.quantity
    );
  });

  const topProducts = Array.from(productTotals.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const customerTotals = new Map<string, { orders: number; amount: number }>();
  completedOrders.forEach((order) => {
    const name = order.customer_name?.trim() || "Cliente sin nombre";
    const current = customerTotals.get(name) || { orders: 0, amount: 0 };
    current.orders += 1;
    current.amount += order.total_amount;
    customerTotals.set(name, current);
  });
  const topCustomers = Array.from(customerTotals.entries())
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const formatTotals = new Map<string, number>();
  completedItems.forEach((item) => {
    const format = item.format?.trim() || "Sin formato";
    formatTotals.set(format, (formatTotals.get(format) || 0) + item.subtotal);
  });
  const formatSummaries = Array.from(formatTotals.entries())
    .map(([format, amount]) => ({ format, amount }))
    .sort((a, b) => b.amount - a.amount);

  const now = new Date();
  const monthSummaries: MonthSummary[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const amount = orders
      .filter((order) => COMPLETED_STATUSES.includes(order.status))
      .filter((order) => {
        const date = new Date(order.created_at);
        return date.getFullYear() === monthDate.getFullYear() &&
          date.getMonth() === monthDate.getMonth();
      })
      .reduce((sum, order) => sum + order.total_amount, 0);

    monthSummaries.push({
      key,
      label: monthDate.toLocaleDateString("es-CR", { month: "short" }),
      amount,
    });
  }
  const maxMonthAmount = Math.max(...monthSummaries.map((month) => month.amount), 1);

  function downloadReport() {
    const rows: (string | number)[][] = [[
      "Pedido", "Fecha", "Cliente", "Estado", "Producto",
      "Formato", "Cantidad", "Precio unitario", "Subtotal", "Total del pedido",
    ]];

    periodOrders.forEach((order) => {
      const relatedItems = items.filter((item) => item.order_id === order.id);
      if (relatedItems.length === 0) {
        rows.push([
          order.id,
          new Date(order.created_at).toLocaleString("es-CR"),
          order.customer_name,
          order.status,
          "Sin detalle",
          "",
          0,
          0,
          0,
          order.total_amount,
        ]);
      } else {
        relatedItems.forEach((item) => {
          rows.push([
            order.id,
            new Date(order.created_at).toLocaleString("es-CR"),
            order.customer_name,
            order.status,
            item.product_name,
            item.format,
            item.quantity,
            item.unit_price,
            item.subtotal,
            order.total_amount,
          ]);
        });
      }
    });

    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-ventas-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const periodLabel: Record<Period, string> = {
    today: "Hoy",
    week: "Esta semana",
    month: "Este mes",
    year: "Este año",
    all: "Todo el historial",
  };

  return (
    <main className="min-h-screen bg-[#fff8fc] px-4 py-8 text-purple-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
              MATERIAL DIDÁCTICO MR
            </p>
            <h1 className="mt-2 text-3xl font-black">Dashboard de ventas</h1>
            <p className="mt-2 text-sm text-slate-500">
              Resumen de pedidos, ingresos y materiales más solicitados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin" className="rounded-full border border-purple-200 px-5 py-3 text-sm font-bold text-purple-800 hover:bg-purple-50">
              Volver al panel
            </a>
            <button type="button" onClick={loadDashboard} disabled={loading} className="rounded-full bg-purple-700 px-5 py-3 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-60">
              {loading ? "Actualizando..." : "↻ Actualizar"}
            </button>
          </div>
        </header>

        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Los ingresos se calculan únicamente con pedidos en estado Confirmado o Entregado. Los pedidos Pendientes, En revisión y Cancelados no se cuentan como ingresos confirmados.
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
          <div>
            <h2 className="font-black">Período de consulta</h2>
            <p className="mt-1 text-xs text-slate-500">Los indicadores, clientes y formatos se actualizan según el período seleccionado.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-purple-500">
              <option value="today">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="year">Este año</option>
              <option value="all">Todo el historial</option>
            </select>
            <button type="button" onClick={downloadReport} disabled={loading || periodOrders.length === 0} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              ↓ Descargar informe CSV
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center font-semibold text-purple-800 shadow-sm">
            Cargando estadísticas...
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold text-purple-700">
              Mostrando: {periodLabel[period]}
            </p>

            <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-purple-100">
                <p className="text-sm text-purple-700">Ingresos confirmados</p>
                <p className="mt-2 text-2xl font-black text-emerald-700">{money(confirmedRevenue)}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-purple-100">
                <p className="text-sm text-purple-700">Pedidos registrados</p>
                <p className="mt-2 text-2xl font-black">{periodOrders.length}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-purple-100">
                <p className="text-sm text-amber-700">Pedidos pendientes</p>
                <p className="mt-2 text-2xl font-black text-amber-800">{pendingOrders.length}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-purple-100">
                <p className="text-sm text-red-700">Pedidos cancelados</p>
                <p className="mt-2 text-2xl font-black text-red-700">{cancelledOrders.length}</p>
              </div>
            </section>

            <section className="mb-7 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Comparación de ventas mensuales</h2>
                <p className="mt-1 text-xs text-slate-500">Últimos seis meses · pedidos Confirmados y Entregados</p>
                <div className="mt-7 flex h-56 items-end justify-around gap-3 border-b border-purple-100 pb-2">
                  {monthSummaries.map((month) => {
                    const height = month.amount === 0 ? 4 : Math.max(10, (month.amount / maxMonthAmount) * 100);
                    return (
                      <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <span className="max-w-full truncate text-center text-[10px] font-semibold text-slate-500">{month.amount > 0 ? money(month.amount) : "₡0"}</span>
                        <div className="w-full max-w-14 rounded-t-xl bg-purple-500" style={{ height: `${height}%` }} title={`${month.label}: ${money(month.amount)}`} />
                        <span className="text-xs font-bold capitalize text-slate-600">{month.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Productos más vendidos</h2>
                <p className="mt-1 text-xs text-slate-500">Unidades en pedidos Confirmados y Entregados del período</p>
                {topProducts.length === 0 ? (
                  <div className="mt-8 rounded-2xl bg-purple-50 p-6 text-center text-sm text-slate-500">Todavía no hay ventas confirmadas para mostrar.</div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={product.name}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold">{index + 1}. {product.name}</span>
                          <strong>{product.quantity} unidad(es)</strong>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-purple-100">
                          <div className="h-full rounded-full bg-pink-500" style={{ width: `${(product.quantity / topProducts[0].quantity) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mb-7 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Clientes frecuentes</h2>
                <p className="mt-1 text-xs text-slate-500">Ordenados por ingresos confirmados en el período</p>
                {topCustomers.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-purple-50 p-5 text-center text-sm text-slate-500">Todavía no hay clientes con compras confirmadas.</div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {topCustomers.map((customer, index) => (
                      <div key={customer.name} className="flex items-center justify-between gap-3 rounded-xl bg-purple-50 p-4">
                        <div>
                          <p className="font-bold">{index + 1}. {customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.orders} pedido(s)</p>
                        </div>
                        <strong className="text-purple-800">{money(customer.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Ingresos por formato</h2>
                <p className="mt-1 text-xs text-slate-500">Ventas Confirmadas y Entregadas según formato</p>
                {formatSummaries.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-purple-50 p-5 text-center text-sm text-slate-500">Todavía no hay ventas por formato para mostrar.</div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {formatSummaries.map((summary) => (
                      <div key={summary.format} className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 p-4">
                        <span className="font-bold">{summary.format}</span>
                        <strong className="text-emerald-700">{money(summary.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black">Resumen de estados</h2>
                <span className="text-xs text-slate-500">{periodOrders.length} pedido(s) en el período</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Pendiente", count: periodOrders.filter((o) => o.status === "Pendiente").length, style: "bg-amber-50 text-amber-900" },
                  { label: "En revisión", count: periodOrders.filter((o) => o.status === "En revisión").length, style: "bg-blue-50 text-blue-900" },
                  { label: "Confirmado", count: periodOrders.filter((o) => o.status === "Confirmado").length, style: "bg-emerald-50 text-emerald-900" },
                  { label: "Entregado", count: periodOrders.filter((o) => o.status === "Entregado").length, style: "bg-purple-50 text-purple-900" },
                  { label: "Cancelado", count: cancelledOrders.length, style: "bg-red-50 text-red-900" },
                ].map((status) => (
                  <div key={status.label} className={`rounded-2xl p-4 ${status.style}`}>
                    <p className="text-xs font-semibold">{status.label}</p>
                    <p className="mt-1 text-2xl font-black">{status.count}</p>
                  </div>
                ))}
              </div>
            </section>

            <p className="mt-5 text-right text-xs text-slate-400">Última actualización: {lastUpdated}</p>
          </>
        )}
      </div>
    </main>
  );
}
