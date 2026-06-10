/* ===================== Global state ===================== */
const state = {
  view: "dashboard",
  selectedCategory: null,
  analysisPeriod: "week",
  history: { search: "", category: "all", from: null, to: null },
};

/* ===================== Small helpers ===================== */
function hexToRgba(hex, alpha) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ===================== Init ===================== */
document.addEventListener("DOMContentLoaded", init);

function init() {
  applyTheme(getTheme());
  setupNav();
  setupModal();
  renderCategoryGrid();
  populateCategoryFilter();
  setupFilters();
  setupPeriodSwitch();
  setupBudgetsView();
  setupDataActions();
}

async function renderAll() {
  await Promise.all([renderDashboard(), renderHistory(), renderAnalysis(), renderBudgets()]);
}

/* ===================== Theme ===================== */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("theme-toggle").textContent = theme === "dark" ? "☀️" : "🌙";
}

/* ===================== Navigation ===================== */
function setupNav() {
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  });

  document.querySelectorAll(".tab, .bnav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.querySelectorAll("[data-view-link]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.viewLink));
  });
}

async function switchView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  document.querySelectorAll(".bnav-item").forEach((t) => t.classList.toggle("active", t.dataset.view === view));

  if (view === "dashboard") await renderDashboard();
  else if (view === "history") await renderHistory();
  else if (view === "analysis") await renderAnalysis();
  else if (view === "budgets") await renderBudgets();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===================== Modal: Add / Edit Expense ===================== */
function setupModal() {
  const overlay = document.getElementById("modal-overlay");

  document.getElementById("open-add-expense").addEventListener("click", () => openModal());
  document.getElementById("open-add-expense-mobile").addEventListener("click", () => openModal());
  document.getElementById("modal-close").addEventListener("click", closeModal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
  });

  document.getElementById("expense-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("delete-expense").addEventListener("click", handleDeleteExpense);
}

function openModal(expense = null) {
  const form = document.getElementById("expense-form");
  form.reset();
  state.selectedCategory = null;

  document.getElementById("expense-id").value = "";
  document.getElementById("expense-date").value = todayISO();
  document.getElementById("delete-expense").hidden = true;
  document.getElementById("modal-title").textContent = "Add Expense";

  if (expense) {
    document.getElementById("modal-title").textContent = "Edit Expense";
    document.getElementById("expense-id").value = expense.id;
    document.getElementById("expense-amount").value = expense.amount;
    document.getElementById("expense-description").value = expense.description || "";
    document.getElementById("expense-date").value = expense.date;
    state.selectedCategory = expense.category;
    document.getElementById("delete-expense").hidden = false;
  }

  document.getElementById("expense-category").value = state.selectedCategory || "";
  updateCategorySelection();
  document.getElementById("modal-overlay").classList.add("open");
  setTimeout(() => document.getElementById("expense-amount").focus(), 100);
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}

function renderCategoryGrid() {
  const grid = document.getElementById("category-grid");
  grid.innerHTML = CATEGORIES.map(
    (c) => `<div class="category-option" data-cat="${c.id}">
        <span class="cat-emoji">${c.icon}</span>
        <span>${c.short}</span>
      </div>`
  ).join("");

  grid.querySelectorAll(".category-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      state.selectedCategory = opt.dataset.cat;
      document.getElementById("expense-category").value = state.selectedCategory;
      updateCategorySelection();
    });
  });
}

function updateCategorySelection() {
  document.querySelectorAll(".category-option").forEach((opt) => {
    opt.classList.toggle("selected", opt.dataset.cat === state.selectedCategory);
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("expense-id").value;
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const category = document.getElementById("expense-category").value;
  const description = document.getElementById("expense-description").value.trim();
  const date = document.getElementById("expense-date").value;

  if (!amount || amount <= 0) return showToast("Please enter a valid amount");
  if (!category) return showToast("Please choose a category");
  if (!date) return showToast("Please choose a date");

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    if (id) {
      await updateExpense({ id, amount, category, description, date });
      showToast("Expense updated");
    } else {
      await addExpense({ amount, category, description, date });
      showToast("Expense added");
    }
    closeModal();
    await renderAll();
  } catch (err) {
    console.error(err);
    showToast("Failed to save expense");
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleDeleteExpense() {
  const id = document.getElementById("expense-id").value;
  if (!id) return;
  if (!confirm("Delete this expense? This can't be undone.")) return;

  try {
    await deleteExpense(id);
    closeModal();
    await renderAll();
    showToast("Expense deleted");
  } catch (err) {
    console.error(err);
    showToast("Failed to delete expense");
  }
}

/* ===================== Transaction list rendering ===================== */
function renderTxItem(expense) {
  const cat = getCategory(expense.category);
  return `<div class="tx-item" data-id="${expense.id}">
      <div class="tx-icon" style="background:${hexToRgba(cat.color, 0.16)}">${cat.icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHtml(expense.description) || cat.name}</div>
        <div class="tx-meta">${cat.name} · ${formatDateLabel(expense.date)}</div>
      </div>
      <div class="tx-amount">-${formatCurrency(expense.amount)}</div>
    </div>`;
}

function attachTxHandlers(container, expenses) {
  container.querySelectorAll(".tx-item").forEach((item) => {
    item.addEventListener("click", () => {
      const expense = expenses.find((e) => e.id === item.dataset.id);
      if (expense) openModal(expense);
    });
  });
}

function renderTxList(container, expenses, grouped) {
  if (!expenses.length) {
    container.innerHTML = "";
    return;
  }

  if (!grouped) {
    container.innerHTML = expenses.map(renderTxItem).join("");
  } else {
    const groups = {};
    expenses.forEach((e) => {
      (groups[e.date] = groups[e.date] || []).push(e);
    });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    container.innerHTML = dates
      .map((date) => {
        const items = groups[date].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        const dayTotal = sumExpenses(items);
        return (
          `<div class="tx-group-label">${formatDateLabel(date)} · ${formatCurrency(dayTotal)}</div>` +
          items.map(renderTxItem).join("")
        );
      })
      .join("");
  }

  attachTxHandlers(container, expenses);
}

/* ===================== Dashboard ===================== */
function setComparisonSub(elId, current, previous, label) {
  const el = document.getElementById(elId);
  if (current === 0 && previous === 0) {
    el.textContent = `vs ${label}`;
    el.className = "stat-sub";
    return;
  }
  const change = percentChange(current, previous);
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "•";
  const cls = change > 0 ? "trend-up" : change < 0 ? "trend-down" : "";
  el.textContent = `${arrow} ${Math.abs(change).toFixed(0)}% vs ${label}`;
  el.className = "stat-sub" + (cls ? " " + cls : "");
}

async function renderDashboard() {
  const expenses = await getExpenses();
  const now = new Date();

  document.getElementById("greeting").textContent = `${getGreeting()} 👋`;
  document.getElementById("today-date").textContent = formatLongDate(now);

  // Today
  const todayStr = todayISO();
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  document.getElementById("stat-today").textContent = formatCurrency(sumExpenses(todayExpenses));
  document.getElementById("stat-today-sub").textContent = todayExpenses.length
    ? `${todayExpenses.length} transaction${todayExpenses.length > 1 ? "s" : ""}`
    : "No expenses yet";

  // Week
  const weekRange = getPeriodRange("week");
  const thisWeekTotal = sumExpenses(filterByRange(expenses, weekRange.start, weekRange.end));
  const lastWeekTotal = sumExpenses(filterByRange(expenses, weekRange.prevStart, weekRange.prevEnd));
  document.getElementById("stat-week").textContent = formatCurrency(thisWeekTotal);
  setComparisonSub("stat-week-sub", thisWeekTotal, lastWeekTotal, "last week");

  // Month
  const monthRange = getPeriodRange("month");
  const thisMonthTotal = sumExpenses(filterByRange(expenses, monthRange.start, monthRange.end));
  const lastMonthTotal = sumExpenses(filterByRange(expenses, monthRange.prevStart, monthRange.prevEnd));
  document.getElementById("stat-month").textContent = formatCurrency(thisMonthTotal);
  setComparisonSub("stat-month-sub", thisMonthTotal, lastMonthTotal, "last month");

  // Daily average this month
  const daysElapsed = now.getDate();
  document.getElementById("stat-avg").textContent = formatCurrency(thisMonthTotal / daysElapsed);
  document.getElementById("stat-avg-sub").textContent = `over ${daysElapsed} day${daysElapsed > 1 ? "s" : ""}`;

  // Last 7 days chart
  const buckets = getLastNDays(7).map((d) => {
    const key = toISODate(d);
    return { label: WEEKDAY_LABELS[d.getDay()], dateKey: key, total: sumExpenses(expenses.filter((e) => e.date === key)) };
  });
  renderBarChart(document.getElementById("chart-week"), buckets, { highlightKey: todayStr });

  // Donut: this month by category
  const monthExpenses = filterByRange(expenses, monthRange.start, monthRange.end);
  const byCategory = groupByCategory(monthExpenses);
  const donutData = CATEGORIES.map((c) => ({ label: c.name, value: byCategory[c.id] || 0, color: c.color, icon: c.icon }));
  renderDonutChart(document.getElementById("chart-donut-dash"), donutData, { totalLabel: "This month" });

  // Recent transactions
  const recent = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || "").localeCompare(a.created_at || ""))
    .slice(0, 6);
  const recentList = document.getElementById("recent-list");
  if (!recent.length) {
    recentList.innerHTML = `<div class="empty-state"><div class="empty-emoji">🌱</div><p>No transactions yet. Add your first expense to get started!</p></div>`;
  } else {
    renderTxList(recentList, recent, false);
  }
}

/* ===================== History ===================== */
function populateCategoryFilter() {
  const select = document.getElementById("filter-category");
  CATEGORIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.name}`;
    select.appendChild(opt);
  });
}

function setupFilters() {
  document.getElementById("filter-search").addEventListener(
    "input",
    debounce((e) => {
      state.history.search = e.target.value.trim().toLowerCase();
      renderHistory();
    }, 200)
  );

  document.getElementById("filter-category").addEventListener("change", (e) => {
    state.history.category = e.target.value;
    renderHistory();
  });

  document.getElementById("filter-from").addEventListener("change", (e) => {
    state.history.from = e.target.value || null;
    document.querySelectorAll("#view-history .chip[data-range]").forEach((c) => c.classList.remove("active"));
    renderHistory();
  });

  document.getElementById("filter-to").addEventListener("change", (e) => {
    state.history.to = e.target.value || null;
    document.querySelectorAll("#view-history .chip[data-range]").forEach((c) => c.classList.remove("active"));
    renderHistory();
  });

  document.querySelectorAll("#view-history .chip[data-range]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#view-history .chip[data-range]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");

      const range = chip.dataset.range;
      if (range === "all") {
        state.history.from = null;
        state.history.to = null;
      } else {
        const days = parseInt(range, 10);
        state.history.to = todayISO();
        state.history.from = toISODate(addDays(new Date(), -(days - 1)));
      }
      document.getElementById("filter-from").value = state.history.from || "";
      document.getElementById("filter-to").value = state.history.to || "";
      renderHistory();
    });
  });
}

async function renderHistory() {
  let expenses = await getExpenses();
  const { search, category, from, to } = state.history;

  if (search) {
    expenses = expenses.filter(
      (e) => (e.description || "").toLowerCase().includes(search) || getCategory(e.category).name.toLowerCase().includes(search)
    );
  }
  if (category !== "all") expenses = expenses.filter((e) => e.category === category);
  if (from) expenses = expenses.filter((e) => e.date >= from);
  if (to) expenses = expenses.filter((e) => e.date <= to);

  expenses.sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || "").localeCompare(a.created_at || ""));

  document.getElementById("history-summary").textContent = `${expenses.length} transaction${expenses.length !== 1 ? "s" : ""} · ${formatCurrency(
    sumExpenses(expenses)
  )}`;

  const listEl = document.getElementById("history-list");
  const emptyEl = document.getElementById("history-empty");
  if (!expenses.length) {
    listEl.innerHTML = "";
    emptyEl.hidden = false;
  } else {
    emptyEl.hidden = true;
    renderTxList(listEl, expenses, true);
  }
}

/* ===================== Analysis ===================== */
function setupPeriodSwitch() {
  document.querySelectorAll("#period-switch .chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      document.querySelectorAll("#period-switch .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.analysisPeriod = chip.dataset.period;
      await renderAnalysis();
    });
  });
}

async function renderAnalysis() {
  const expenses = await getExpenses();
  const period = state.analysisPeriod;
  const { start, end, prevStart, prevEnd } = getPeriodRange(period);
  const periodLabel = period === "week" ? "week" : period === "month" ? "month" : "year";

  const current = filterByRange(expenses, start, end);
  const previous = filterByRange(expenses, prevStart, prevEnd);
  const currentTotal = sumExpenses(current);
  const previousTotal = sumExpenses(previous);
  const byCategory = groupByCategory(current);

  document.getElementById("an-total").textContent = formatCurrency(currentTotal);
  setComparisonSub("an-total-sub", currentTotal, previousTotal, `previous ${periodLabel}`);

  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length) {
    const [topCatId, topAmount] = sortedCats[0];
    const cat = getCategory(topCatId);
    document.getElementById("an-top-cat").textContent = `${cat.icon} ${cat.name}`;
    const pct = currentTotal > 0 ? ((topAmount / currentTotal) * 100).toFixed(0) : 0;
    document.getElementById("an-top-cat-sub").textContent = `${formatCurrency(topAmount)} · ${pct}% of total`;
  } else {
    document.getElementById("an-top-cat").textContent = "—";
    document.getElementById("an-top-cat-sub").textContent = "No data yet";
  }

  const avgTx = current.length ? currentTotal / current.length : 0;
  document.getElementById("an-avg-tx").textContent = formatCurrency(avgTx);
  document.getElementById("an-avg-tx-sub").textContent = `${current.length} transaction${current.length !== 1 ? "s" : ""}`;

  // Trend chart
  const buckets = getTrendBuckets(period, expenses);
  const labelEvery = period === "month" ? 5 : 1;
  const highlightKey = period !== "year" ? todayISO() : null;
  document.getElementById("trend-label").textContent = period === "year" ? "Monthly totals" : "Daily totals";
  renderBarChart(document.getElementById("chart-trend"), buckets, { labelEvery, highlightKey });

  // Donut + legend
  const donutData = CATEGORIES.map((c) => ({ label: c.name, value: byCategory[c.id] || 0, color: c.color, icon: c.icon }));
  renderDonutChart(document.getElementById("chart-donut-analysis"), donutData, { totalLabel: capitalize(periodLabel) });
  renderLegend(document.getElementById("legend-analysis"), donutData);

  await renderInsights({ period, periodLabel, current, previous, currentTotal, previousTotal, byCategory });
}

async function renderInsights({ period, periodLabel, current, previous, currentTotal, previousTotal, byCategory }) {
  const insights = [];

  if (!current.length) {
    insights.push({ icon: "🌱", html: `No expenses recorded for this ${periodLabel} yet. Add some to unlock personalized insights.` });
    return renderInsightsList(insights);
  }

  // Overall trend vs previous period
  if (previousTotal > 0) {
    const change = percentChange(currentTotal, previousTotal);
    if (Math.abs(change) >= 1) {
      if (change > 0) {
        insights.push({
          icon: "📈",
          html: `You've spent <strong>${Math.abs(change).toFixed(0)}% more</strong> this ${periodLabel} (${formatCurrency(currentTotal)}) than the previous ${periodLabel} (${formatCurrency(previousTotal)}).`,
        });
      } else {
        insights.push({
          icon: "📉",
          html: `Nice! You've spent <strong>${Math.abs(change).toFixed(0)}% less</strong> this ${periodLabel} (${formatCurrency(currentTotal)}) than the previous ${periodLabel} (${formatCurrency(previousTotal)}).`,
        });
      }
    }
  }

  // Dominant category
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length) {
    const [topCatId, topAmount] = sortedCats[0];
    const cat = getCategory(topCatId);
    const pct = (topAmount / currentTotal) * 100;
    if (pct >= 25) {
      insights.push({
        icon: cat.icon,
        html: `<strong>${cat.name}</strong> is your biggest expense category, making up <strong>${pct.toFixed(0)}%</strong> of your spending this ${periodLabel}.`,
      });
    }
  }

  // Category with the largest increase vs previous period
  const prevByCategory = groupByCategory(previous);
  let biggestIncrease = null;
  CATEGORIES.forEach((c) => {
    const diff = (byCategory[c.id] || 0) - (prevByCategory[c.id] || 0);
    if (diff > 0 && (!biggestIncrease || diff > biggestIncrease.diff)) biggestIncrease = { cat: c, diff };
  });
  if (biggestIncrease && previousTotal > 0 && biggestIncrease.diff >= 1) {
    insights.push({
      icon: "⚠️",
      html: `Your <strong>${biggestIncrease.cat.name}</strong> spending increased by <strong>${formatCurrency(biggestIncrease.diff)}</strong> compared to the previous ${periodLabel}.`,
    });
  }

  // Largest single expense
  const largest = [...current].sort((a, b) => b.amount - a.amount)[0];
  if (largest) {
    const cat = getCategory(largest.category);
    const what = largest.description ? `"${escapeHtml(largest.description)}"` : cat.name;
    insights.push({
      icon: "💸",
      html: `Your largest expense was <strong>${formatCurrency(largest.amount)}</strong> for ${what} on ${formatDateLabel(largest.date)}.`,
    });
  }

  // No-spend days
  if (period === "week" || period === "month") {
    const { start, end } = getPeriodRange(period);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = end < today ? end : today;
    let totalDays = 0;
    let noSpendDays = 0;
    const spendDates = new Set(current.map((e) => e.date));
    for (let d = new Date(start); d <= lastDay; d = addDays(d, 1)) {
      totalDays++;
      if (!spendDates.has(toISODate(d))) noSpendDays++;
    }
    if (noSpendDays > 0) {
      insights.push({
        icon: "🎉",
        html: `You had <strong>${noSpendDays} no-spend day${noSpendDays !== 1 ? "s" : ""}</strong> out of ${totalDays} so far this ${periodLabel}. Keep it up!`,
      });
    }
  }

  // Budget-based insights (month only)
  if (period === "month") {
    const budgets = await getBudgets();

    Object.entries(budgets.categories || {}).forEach(([catId, limit]) => {
      const spent = byCategory[catId] || 0;
      if (limit && spent > limit) {
        const cat = getCategory(catId);
        insights.push({
          icon: "🚨",
          html: `You're over budget for <strong>${cat.name}</strong> by <strong>${formatCurrency(spent - limit)}</strong> this month.`,
        });
      }
    });

    if (budgets.overall) {
      if (currentTotal > budgets.overall) {
        insights.push({
          icon: "🚨",
          html: `You've exceeded your overall monthly budget by <strong>${formatCurrency(currentTotal - budgets.overall)}</strong>.`,
        });
      } else {
        const today = new Date();
        const daysLeft = Math.max(endOfMonth(today).getDate() - today.getDate(), 1);
        const remaining = budgets.overall - currentTotal;
        insights.push({
          icon: "🎯",
          html: `You have <strong>${formatCurrency(remaining)}</strong> left in your monthly budget for the next <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong> (about ${formatCurrency(remaining / daysLeft)}/day).`,
        });
      }
    }
  }

  if (!insights.length) {
    insights.push({ icon: "👍", html: `You're tracking steadily this ${periodLabel}. Keep adding expenses to spot more trends.` });
  }

  renderInsightsList(insights.slice(0, 6));
}

function renderInsightsList(insights) {
  document.getElementById("insights-list").innerHTML = insights
    .map((i) => `<div class="insight-item"><span class="insight-icon">${i.icon}</span><span class="insight-text">${i.html}</span></div>`)
    .join("");
}

/* ===================== Budgets ===================== */
function setupBudgetsView() {
  document.getElementById("overall-budget-input").addEventListener(
    "input",
    debounce(async (e) => {
      const budgets = await getBudgets();
      const val = parseFloat(e.target.value);
      budgets.overall = isNaN(val) || val <= 0 ? null : val;
      try {
        await saveBudgets(budgets);
      } catch (err) {
        console.error(err);
        showToast("Failed to save budget");
      }
      await updateBudgetProgress();
    }, 350)
  );
}

async function renderBudgets() {
  const budgets = await getBudgets();
  const today = new Date();

  document.getElementById("overall-budget-sub").textContent = `${MONTH_LABELS[today.getMonth()]} ${today.getFullYear()}`;
  document.getElementById("overall-budget-input").value = budgets.overall || "";

  const list = document.getElementById("budget-list");
  list.innerHTML = CATEGORIES.map((c) => {
    const limit = (budgets.categories || {})[c.id];
    return `<div class="budget-item">
        <div class="budget-item-head">
          <div class="cat"><span class="emoji" style="background:${hexToRgba(c.color, 0.16)}">${c.icon}</span> ${c.name}</div>
          <input type="number" class="budget-input" data-cat="${c.id}" min="0" step="0.01" placeholder="No limit" value="${limit || ""}" />
        </div>
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" data-fill="${c.id}"></div></div>
          <div class="progress-text" data-text="${c.id}"></div>
        </div>
      </div>`;
  }).join("");

  list.querySelectorAll(".budget-input").forEach((input) => {
    input.addEventListener(
      "input",
      debounce(async (e) => {
        const budgets = await getBudgets();
        if (!budgets.categories) budgets.categories = {};
        const val = parseFloat(e.target.value);
        if (isNaN(val) || val <= 0) delete budgets.categories[e.target.dataset.cat];
        else budgets.categories[e.target.dataset.cat] = val;
        try {
          await saveBudgets(budgets);
        } catch (err) {
          console.error(err);
          showToast("Failed to save budget");
        }
        await updateBudgetProgress();
      }, 350)
    );
  });

  await updateBudgetProgress();
}

async function updateBudgetProgress() {
  const budgets = await getBudgets();
  const expenses = await getExpenses();
  const monthRange = getPeriodRange("month");
  const monthExpenses = filterByRange(expenses, monthRange.start, monthRange.end);
  const monthTotal = sumExpenses(monthExpenses);
  const byCategory = groupByCategory(monthExpenses);

  const overallFill = document.getElementById("overall-progress-fill");
  const overallText = document.getElementById("overall-progress-text");
  if (budgets.overall) {
    const pct = Math.min((monthTotal / budgets.overall) * 100, 100);
    overallFill.style.width = pct + "%";
    overallFill.className = "progress-fill" + (monthTotal > budgets.overall ? " over" : pct >= 80 ? " warn" : "");
    overallText.innerHTML = `<span>${formatCurrency(monthTotal)} spent</span><span>${formatCurrency(budgets.overall)} budget</span>`;
  } else {
    overallFill.style.width = "0%";
    overallFill.className = "progress-fill";
    overallText.innerHTML = `<span>${formatCurrency(monthTotal)} spent this month</span><span>Set a budget to track progress</span>`;
  }

  CATEGORIES.forEach((c) => {
    const limit = (budgets.categories || {})[c.id];
    const spent = byCategory[c.id] || 0;
    const fill = document.querySelector(`[data-fill="${c.id}"]`);
    const text = document.querySelector(`[data-text="${c.id}"]`);
    if (!fill || !text) return;

    if (limit) {
      const pct = Math.min((spent / limit) * 100, 100);
      fill.style.width = pct + "%";
      fill.className = "progress-fill" + (spent > limit ? " over" : pct >= 80 ? " warn" : "");
      text.innerHTML = `<span>${formatCurrency(spent)} spent</span><span>${formatCurrency(limit)} budget</span>`;
    } else {
      fill.style.width = "0%";
      fill.className = "progress-fill";
      text.innerHTML = `<span>${formatCurrency(spent)} spent</span><span>No limit set</span>`;
    }
  });
}

/* ===================== Data management ===================== */
function setupDataActions() {
  document.getElementById("export-data").addEventListener("click", async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clarity-expenses-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data exported");
    } catch (err) {
      console.error(err);
      showToast("Failed to export data");
    }
  });

  document.getElementById("import-data").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await importAllData(reader.result);
        await renderAll();
        showToast("Data imported successfully");
      } catch (err) {
        console.error(err);
        showToast("Failed to import: invalid file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("clear-data").addEventListener("click", async () => {
    if (!confirm("This will permanently delete all expenses and budgets. Continue?")) return;
    try {
      await clearAllData();
      await renderAll();
      showToast("All data cleared");
    } catch (err) {
      console.error(err);
      showToast("Failed to clear data");
    }
  });
}
