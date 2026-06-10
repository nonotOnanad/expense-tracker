/* ===================== Helpers ===================== */
function niceCeil(value) {
  if (value <= 0) return 10;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * Math.pow(10, exponent);
}

/* ===================== Bar / Trend Chart ===================== */
// data: [{ label, dateKey, total }]
function renderBarChart(container, data, options = {}) {
  const { color = "var(--chart-bar)", highlightKey = null, highlightColor = "var(--chart-highlight)", labelEvery = 1 } = options;

  if (!data.length) {
    container.innerHTML = `<div class="empty-chart">No data yet</div>`;
    return;
  }

  const width = 600, height = 240;
  const paddingLeft = 46, paddingBottom = 28, paddingTop = 16, paddingRight = 10;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.total), 0);
  const niceMax = niceCeil(maxVal);

  const barCount = data.length;
  const slot = chartWidth / barCount;
  const barWidth = Math.max(slot * 0.55, 2);

  let gridLines = "";
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const y = paddingTop + chartHeight - (chartHeight * i) / gridCount;
    const val = (niceMax * i) / gridCount;
    gridLines += `<line x1="${paddingLeft}" y1="${y.toFixed(2)}" x2="${width - paddingRight}" y2="${y.toFixed(2)}" class="grid-line" />`;
    gridLines += `<text x="${paddingLeft - 8}" y="${(y + 4).toFixed(2)}" class="axis-label" text-anchor="end">${formatCompactCurrency(val)}</text>`;
  }

  let bars = "";
  let labels = "";
  data.forEach((d, i) => {
    const x = paddingLeft + i * slot + (slot - barWidth) / 2;
    const barHeight = niceMax > 0 ? (d.total / niceMax) * chartHeight : 0;
    const y = paddingTop + chartHeight - Math.max(barHeight, d.total > 0 ? 2 : 0);
    const isHighlight = highlightKey && d.dateKey === highlightKey;
    const fillVar = isHighlight ? highlightColor : color;
    bars += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${(paddingTop + chartHeight - y).toFixed(2)}" rx="5" class="bar${isHighlight ? " bar-highlight" : ""}" style="fill:${fillVar}"><title>${d.label}: ${formatCurrency(d.total)}</title></rect>`;

    if (i % labelEvery === 0 || isHighlight) {
      labels += `<text x="${(x + barWidth / 2).toFixed(2)}" y="${height - 6}" class="axis-label${isHighlight ? " axis-label-highlight" : ""}" text-anchor="middle">${d.label}</text>`;
    }
  });

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bar chart">${gridLines}${bars}${labels}</svg>`;
}

/* ===================== Donut Chart ===================== */
// data: [{ label, value, color, icon }]
function renderDonutChart(container, data, options = {}) {
  const { size = 200, strokeWidth = 26, totalLabel = "Total" } = options;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total <= 0) {
    container.innerHTML = `<div class="empty-chart">No expenses yet 🌱<br><span>Add one to see your breakdown</span></div>`;
    return;
  }

  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  let segments = "";
  data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .forEach((d) => {
      const fraction = d.value / total;
      const dash = Math.max(fraction * circumference - 2, 0); // small gap between segments
      const gapLen = circumference - dash;
      const offset = -cumulative * circumference;
      segments += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${d.color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${gapLen.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" class="donut-segment"><title>${d.icon || ""} ${d.label}: ${formatCurrency(d.value)} (${(fraction * 100).toFixed(1)}%)</title></circle>`;
      cumulative += fraction;
    });

  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" class="donut-svg" role="img" aria-label="Category breakdown donut chart">
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" style="stroke:var(--donut-track)" stroke-width="${strokeWidth}" />
      ${segments}
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="donut-total">${formatCompactCurrency(total)}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-label">${totalLabel}</text>
    </svg>`;
}

/* ===================== Legend ===================== */
// data: [{ label, value, color, icon }]
function renderLegend(container, data) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const items = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  if (!items.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = items
    .map((d) => {
      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
      return `<div class="legend-item">
        <span class="legend-dot" style="background:${d.color}"></span>
        <span class="legend-label">${d.icon ? d.icon + " " : ""}${d.label}</span>
        <span class="legend-pct">${pct}%</span>
        <span class="legend-value">${formatCurrency(d.value)}</span>
      </div>`;
    })
    .join("");
}
