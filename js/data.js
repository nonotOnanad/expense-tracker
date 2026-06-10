/* ===================== Categories ===================== */
const CATEGORIES = [
  { id: "food",          name: "Food & Dining",    short: "Food",        icon: "🍔", color: "#fb7185" },
  { id: "groceries",     name: "Groceries",        short: "Groceries",   icon: "🛒", color: "#34d399" },
  { id: "transport",     name: "Transportation",   short: "Transport",   icon: "🚗", color: "#60a5fa" },
  { id: "shopping",      name: "Shopping",         short: "Shopping",    icon: "🛍️", color: "#f472b6" },
  { id: "entertainment", name: "Entertainment",    short: "Fun",         icon: "🎬", color: "#a78bfa" },
  { id: "bills",         name: "Bills & Utilities",short: "Bills",       icon: "💡", color: "#fbbf24" },
  { id: "health",        name: "Health & Fitness", short: "Health",      icon: "💊", color: "#2dd4bf" },
  { id: "education",     name: "Education",        short: "Education",   icon: "📚", color: "#818cf8" },
  { id: "travel",        name: "Travel",           short: "Travel",      icon: "✈️", color: "#22d3ee" },
  { id: "other",         name: "Other",            short: "Other",       icon: "📦", color: "#94a3b8" },
];

function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

/* ===================== Theme (per-browser, local) ===================== */
const THEME_KEY = "clarity_theme";

function getTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

/* ===================== Expenses (Supabase) ===================== */
async function getExpenses() {
  const { data, error } = await supabaseClient
    .from("expenses")
    .select("id, amount, category, description, date, created_at")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load expenses", error);
    return [];
  }
  return data.map((e) => ({ ...e, amount: Number(e.amount) }));
}

async function addExpense(expense) {
  const { data, error } = await supabaseClient
    .from("expenses")
    .insert({
      amount: expense.amount,
      category: expense.category,
      description: expense.description || "",
      date: expense.date,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, amount: Number(data.amount) };
}

async function updateExpense(updated) {
  const { error } = await supabaseClient
    .from("expenses")
    .update({
      amount: updated.amount,
      category: updated.category,
      description: updated.description || "",
      date: updated.date,
    })
    .eq("id", updated.id);

  if (error) throw error;
}

async function deleteExpense(id) {
  const { error } = await supabaseClient.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

/* ===================== Budgets (Supabase, one row per user) ===================== */
async function getBudgets() {
  const { data, error } = await supabaseClient.from("budgets").select("overall, categories").maybeSingle();

  if (error) {
    console.error("Failed to load budgets", error);
    return { overall: null, categories: {} };
  }
  if (!data) return { overall: null, categories: {} };
  return {
    overall: data.overall === null ? null : Number(data.overall),
    categories: data.categories || {},
  };
}

async function saveBudgets(budgets) {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const { error } = await supabaseClient.from("budgets").upsert(
    {
      user_id: user.id,
      overall: budgets.overall,
      categories: budgets.categories || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

/* ===================== Import / Export / Clear ===================== */
async function exportAllData() {
  const [expenses, budgets] = await Promise.all([getExpenses(), getBudgets()]);
  return JSON.stringify({ expenses, budgets, exportedAt: new Date().toISOString() }, null, 2);
}

async function importAllData(json) {
  const data = JSON.parse(json);

  if (Array.isArray(data.expenses) && data.expenses.length) {
    const rows = data.expenses
      .filter((e) => e && e.amount > 0 && e.category && e.date)
      .map((e) => ({
        amount: e.amount,
        category: e.category,
        description: e.description || "",
        date: e.date,
      }));
    if (rows.length) {
      const { error } = await supabaseClient.from("expenses").insert(rows);
      if (error) throw error;
    }
  }

  if (data.budgets) {
    await saveBudgets({
      overall: data.budgets.overall ?? null,
      categories: data.budgets.categories || {},
    });
  }
}

async function clearAllData() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const [expRes, budRes] = await Promise.all([
    supabaseClient.from("expenses").delete().eq("user_id", user.id),
    supabaseClient.from("budgets").delete().eq("user_id", user.id),
  ]);

  if (expRes.error) throw expRes.error;
  if (budRes.error) throw budRes.error;
}
