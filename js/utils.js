/* ===================== Date helpers ===================== */
// All dates are handled as local-time "YYYY-MM-DD" strings to match <input type="date">

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayISO() {
  return toISODate(new Date());
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // make Monday the start
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31);
}

function getLastNDays(n) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) days.push(addDays(today, -i));
  return days;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateLabel(dateStr) {
  const date = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = addDays(today, -1);
  if (toISODate(date) === toISODate(today)) return "Today";
  if (toISODate(date) === toISODate(yesterday)) return "Yesterday";
  const opts = { month: "short", day: "numeric" };
  if (date.getFullYear() !== today.getFullYear()) opts.year = "numeric";
  return date.toLocaleDateString(undefined, opts);
}

function formatLongDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/* ===================== Formatting ===================== */
function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompactCurrency(amount) {
  const n = Number(amount) || 0;
  if (Math.abs(n) >= 1000) {
    return "₱" + (n / 1000).toLocaleString("en-PH", { maximumFractionDigits: 1 }) + "k";
  }
  return "₱" + n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
}

function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

/* ===================== Expense aggregation ===================== */
function sumExpenses(expenses) {
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}

function filterByRange(expenses, start, end) {
  const startISO = toISODate(start);
  const endISO = toISODate(end);
  return expenses.filter((e) => e.date >= startISO && e.date <= endISO);
}

function groupByCategory(expenses) {
  const map = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] || 0) + Number(e.amount);
  }
  return map;
}

/* Returns { start, end, prevStart, prevEnd } Date objects for a given period */
function getPeriodRange(period, refDate = new Date()) {
  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  let start, end, prevStart, prevEnd;

  if (period === "week") {
    start = startOfWeek(today);
    end = addDays(start, 6);
    prevStart = addDays(start, -7);
    prevEnd = addDays(start, -1);
  } else if (period === "month") {
    start = startOfMonth(today);
    end = endOfMonth(today);
    prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
  } else {
    start = startOfYear(today);
    end = endOfYear(today);
    prevStart = new Date(start.getFullYear() - 1, 0, 1);
    prevEnd = new Date(start.getFullYear() - 1, 11, 31);
  }
  return { start, end, prevStart, prevEnd };
}

/* Returns array of { label, dateKey, total } buckets for the trend chart */
function getTrendBuckets(period, expenses) {
  const { start, end } = getPeriodRange(period);
  const buckets = [];

  if (period === "week") {
    let d = new Date(start);
    while (d <= end) {
      const key = toISODate(d);
      buckets.push({ label: WEEKDAY_LABELS[d.getDay()], dateKey: key, total: 0 });
      d = addDays(d, 1);
    }
  } else if (period === "month") {
    let d = new Date(start);
    while (d <= end) {
      const key = toISODate(d);
      buckets.push({ label: String(d.getDate()), dateKey: key, total: 0 });
      d = addDays(d, 1);
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(start.getFullYear(), m, 1);
      buckets.push({ label: MONTH_LABELS[m], dateKey: toISODate(monthStart), monthIndex: m, total: 0 });
    }
  }

  for (const e of expenses) {
    const eDate = parseDate(e.date);
    if (eDate < start || eDate > end) continue;
    if (period === "year") {
      buckets[eDate.getMonth()].total += Number(e.amount);
    } else {
      const key = e.date;
      const bucket = buckets.find((b) => b.dateKey === key);
      if (bucket) bucket.total += Number(e.amount);
    }
  }

  return buckets;
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
