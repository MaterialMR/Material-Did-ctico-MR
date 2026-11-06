 
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_UID = "42755f00-5e71-41ef-9b11-a2446e290676";

type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  payment_method: string;
  expense_date: string;
  notes: string | null;
  created_at: string;
};

const CATEGORIES = [
  "Materiales e impresión",
  "Papelería",
  "Publicidad",
  "Transporte",
  "Servicios",
  "Plataformas y tecnología",
  "Empaques y envíos",
  "Comisiones bancarias",
  "Otros",
];

const METHODS = [
  "Efectivo",
  "Transferencia",
  "Tarjeta",
  "SINPE Móvil",
  "Otro",
];

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(value: number) {
  return `₡${Number(value || 0).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function csvCell(value: string | number) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function AdminGastosPage() {
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(METHODS[0]);
  const [expenseDate, setExpenseDate] = useState("");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== ADMIN_UID) {
      router.replace("/admin/login");
      return;
    }

    const { data, error: queryError } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("No fue posible cargar los gastos: " + queryError.message);
      setLoading(false);
      return;
    }

    setExpenses((data || []) as Expense[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    setExpenseDate(localDate());
    loadExpenses();
  }, [loadExpenses]);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(search.toLowerCase()) ||
      expense.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      filterCategory === "Todas" || expense.category === filterCategory;

    const matchesFrom =
      !dateFrom || expense.expense_date >= dateFrom;

    const matchesTo =
      !dateTo || expense.expense_date <= dateTo;

    return matchesSearch && matchesCategory && matchesFrom && matchesTo;
  });

  const total = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  function resetForm() {
    setEditingId(null);
    setDescription("");
    setCategory(CATEGORIES[0]);
    setAmount("");
    setPaymentMethod(METHODS[0]);
    setExpenseDate(localDate());
    setNotes("");
  }

  async function saveExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!description.trim() || !amount || Number(amount) <= 0) {
      setError("Completa la descripción y escribe un monto válido.");
      return;
    }

    setSaving(true);

    const expenseData = {
      description: description.trim(),
      category,
      amount: Number(amount),
      payment_method: paymentMethod,
      expense_date: expenseDate,
      notes: notes.trim() || null,
    };

    const result = editingId
      ? await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editingId)
      : await supabase.from("expenses").insert(expenseData);

    if (result.error) {
      setError("No fue posible guardar el gasto: " + result.error.message);
      setSaving(false);
      return;
    }

    setMessage(
      editingId
        ? "El gasto se actualizó correctamente."
        : "El gasto se registró correctamente."
    );

    resetForm();
    await loadExpenses();
    setSaving(false);
  }

  function editExpense(expense: Expense) {
    setEditingId(expense.id);
    setDescription(expense.description);
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setPaymentMethod(expense.payment_method);
    setExpenseDate(expense.expense_date);
    setNotes(expense.notes || "");
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(id: string) {
    const confirmed = window.confirm(
      "¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError("No fue posible eliminar el gasto: " + deleteError.message);
      return;
    }

    setMessage("El gasto se eliminó correctamente.");
    await loadExpenses();
  }

  function downloadCSV() {
    const rows = [
      [
        "Fecha",
        "Descripción",
        "Categoría",
        "Método de pago",
        "Monto",
        "Observaciones",
      ],
      ...filteredExpenses.map((expense) => [
        expense.expense_date,
        expense.description,
        expense.category,
        expense.payment_method,
        expense.amount,
        expense.notes || "",
      ]),
    ];

    const csv =
      "\uFEFF" +
      rows.map((row) => row.map(csvCell).join(";")).join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `gastos-material-mr-${localDate()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#fff8fc] px-4 py-8 text-purple-950 sm:px-6">
      <div className="mx-auto max-w-6xl">

        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
              MATERIAL DIDÁCTICO MR
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Control de gastos
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Administra los gastos de tu negocio.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/admin"
              className="rounded-full border border-purple-200 px-5 py-3 text-sm font-bold hover:bg-purple-50"
            >
              Volver al panel
            </a>

            <button
              onClick={loadExpenses}
              disabled={loading}
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-50"
            >
              ↻ Actualizar
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <section className="mb-7 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 text-xl font-black">
            {editingId ? "Editar gasto" : "Registrar nuevo gasto"}
          </h2>

          <form onSubmit={saveExpense} className="grid gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-bold">
                Descripción del gasto
              </label>
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ejemplo: Compra de papel para impresión"
                className="w-full rounded-xl border border-purple-200 px-4 py-3 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Monto en colones
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ejemplo: 15000"
                className="w-full rounded-xl border border-purple-200 px-4 py-3 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Método de pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
              >
                {METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Fecha del gasto
              </label>
              <input
                required
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded-xl border border-purple-200 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Observaciones
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional (opcional)"
                className="w-full rounded-xl border border-purple-200 px-4 py-3"
              />
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-purple-700 px-7 py-3 font-bold text-white hover:bg-purple-800 disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Registrar gasto"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-purple-200 px-7 py-3 font-bold text-purple-800"
                >
                  Cancelar edición
                </button>
              )}
            </div>

          </form>
        </section>

        <section className="mb-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-purple-700">Gastos registrados</p>
            <p className="mt-2 text-3xl font-black">
              {filteredExpenses.length}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-red-700">Total de gastos</p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {money(total)}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar gasto..."
              className="rounded-xl border border-purple-200 px-4 py-3"
            />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-purple-200 bg-white px-4 py-3"
            >
              <option value="Todas">Todas las categorías</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Desde"
              className="rounded-xl border border-purple-200 px-4 py-3"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Hasta"
              className="rounded-xl border border-purple-200 px-4 py-3"
            />

          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-3">
            <button
              onClick={() => {
                setSearch("");
                setFilterCategory("Todas");
                setDateFrom("");
                setDateTo("");
              }}
              className="rounded-xl border border-purple-200 px-5 py-3 text-sm font-bold"
            >
              Limpiar filtros
            </button>

            <button
              onClick={downloadCSV}
              disabled={filteredExpenses.length === 0}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              ↓ Descargar gastos CSV
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
          <div className="border-b border-purple-100 p-6">
            <h2 className="text-xl font-black">Historial de gastos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Consulta, modifica o elimina tus registros.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-purple-800">
              Cargando gastos...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl">🧾</div>
              <h3 className="mt-4 text-xl font-black">
                No hay gastos registrados
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Registra tu primer gasto utilizando el formulario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Descripción</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Pago</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="border-t border-purple-100">
                      <td className="p-4 whitespace-nowrap">
                        {expense.expense_date}
                      </td>

                      <td className="p-4">
                        <p className="font-bold">{expense.description}</p>
                        {expense.notes && (
                          <p className="mt-1 text-xs text-slate-500">
                            {expense.notes}
                          </p>
                        )}
                      </td>

                      <td className="p-4">{expense.category}</td>
                      <td className="p-4">{expense.payment_method}</td>

                      <td className="p-4 font-black text-red-700">
                        {money(expense.amount)}
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => editExpense(expense)}
                            className="rounded-lg bg-purple-100 px-3 py-2 font-bold text-purple-800 hover:bg-purple-200"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700 hover:bg-red-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="border-t border-purple-200 bg-purple-50">
                  <tr>
                    <td colSpan={4} className="p-4 text-right font-black">
                      Total de gastos:
                    </td>
                    <td className="p-4 font-black text-red-700">
                      {money(total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          © 2027 Material Didáctico MR · Control administrativo de gastos.
        </footer>

      </div>
    </main>
  );
}
