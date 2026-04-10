import { getPublicSiteUrl } from "@/lib/site-url";
import type { MonthlyReportViewProps } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNum(n: number) {
  return n.toLocaleString("en-GB");
}

const teal = "#0d9488";
const border = "#e5e7eb";
const text = "#111827";
const muted = "#6b7280";

/** Inner document: &lt;style&gt; + &lt;article&gt; (for embedding in API or preview). */
export function buildMonthlyReportInnerHtml(p: MonthlyReportViewProps): string {
  const maxCat =
    p.byCategory.length > 0
      ? Math.max(...p.byCategory.map((c) => c.total_count), 1)
      : 1;

  const categoryRows =
    p.byCategory.length === 0
      ? `<p style="color:${muted};font-size:13px">No category data for this period.</p>`
      : p.byCategory
          .map((row) => {
            const pct = maxCat > 0 ? (row.total_count / maxCat) * 100 : 0;
            return `<div class="rr-bar-row">
  <span class="rr-bar-name">${esc(row.category_name)}</span>
  <div class="rr-bar-track"><div class="rr-bar-fill" style="width:${pct}%"></div></div>
  <span class="rr-bar-pct">${formatNum(row.total_count)} <span style="color:${muted}">(${row.percentage}%)</span></span>
</div>`;
          })
          .join("");

  const practiceTable =
    p.byPractice.length === 0
      ? `<p style="color:${muted};font-size:13px">No practice data for this period.</p>`
      : `<table class="rr-table"><thead><tr>
<th>Practice</th><th class="num">Appointments</th><th class="num">Hours</th><th class="num">Logs</th>
</tr></thead><tbody>
${p.byPractice
  .map(
    (r) =>
      `<tr><td>${esc(r.practice_name)}</td><td class="num">${formatNum(r.total_count)}</td><td class="num">${formatNum(r.total_hours)}</td><td class="num">${formatNum(r.log_count)}</td></tr>`,
  )
  .join("")}
</tbody></table>`;

  const clinicianTable =
    p.clinicianBreakdown.length === 0
      ? `<p style="color:${muted};font-size:13px">No clinician data for this period.</p>`
      : `<table class="rr-table"><thead><tr>
<th>Clinician</th><th class="num">Appointments</th><th class="num">Hours</th><th class="num">Practices</th><th class="num">Logs</th>
</tr></thead><tbody>
${p.clinicianBreakdown
  .map(
    (c) =>
      `<tr><td>${esc(c.clinician_name)}</td><td class="num">${formatNum(c.total_appointments)}</td><td class="num">${formatNum(c.total_hours)}</td><td class="num">${formatNum(c.practices_covered)}</td><td class="num">${formatNum(c.log_count)}</td></tr>`,
  )
  .join("")}
</tbody></table>`;

  const style = `<style>
.rr-report { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: ${text}; line-height: 1.5; max-width: 210mm; margin: 0 auto; padding: 24px; background: #fff; }
.rr-report * { box-sizing: border-box; }
.rr-header { border-bottom: 3px solid ${teal}; padding-bottom: 16px; margin-bottom: 24px; }
.rr-logo { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: ${teal}; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; margin-bottom: 12px; }
.rr-title { font-size: 22px; font-weight: 600; margin: 0 0 4px 0; }
.rr-sub { margin: 0; font-size: 13px; color: ${muted}; }
.rr-org-line { margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: ${text}; }
.rr-section { margin-bottom: 28px; page-break-inside: avoid; }
.rr-section h2 { font-size: 14px; font-weight: 600; color: ${teal}; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 12px 0; border-bottom: 1px solid ${border}; padding-bottom: 6px; }
.rr-kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 480px) { .rr-kpi-grid { grid-template-columns: repeat(4, 1fr); } }
.rr-kpi { border: 1px solid ${border}; border-radius: 8px; padding: 12px 14px; background: #fafafa; }
.rr-kpi-label { font-size: 11px; color: ${muted}; margin: 0 0 4px 0; }
.rr-kpi-value { font-size: 20px; font-weight: 700; color: ${teal}; margin: 0; }
table.rr-table { width: 100%; border-collapse: collapse; font-size: 12px; }
table.rr-table th, table.rr-table td { border: 1px solid ${border}; padding: 8px 10px; text-align: left; }
table.rr-table th { background: #f9fafb; font-weight: 600; color: ${muted}; font-size: 11px; }
table.rr-table td.num, table.rr-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
.rr-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 12px; page-break-inside: avoid; }
.rr-bar-name { flex: 0 0 28%; min-width: 100px; }
.rr-bar-track { flex: 1; height: 18px; background: #f3f4f6; border-radius: 4px; overflow: hidden; border: 1px solid ${border}; }
.rr-bar-fill { height: 100%; background: ${teal}; border-radius: 3px; min-width: 2px; }
.rr-bar-pct { flex: 0 0 48px; text-align: right; color: ${muted}; font-variant-numeric: tabular-nums; }
.rr-footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid ${border}; font-size: 11px; color: ${muted}; text-align: center; }
@media print {
  .rr-print-hide { display: none !important; }
  .rr-report { padding: 12mm; max-width: none; margin: 0; }
  @page { size: A4; margin: 12mm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>`;

  const body = `<article class="rr-report">
<header class="rr-header">
<div class="rr-logo" aria-hidden="true">Rx</div>
<h1 class="rr-title">Activity report</h1>
<p class="rr-org-line">${esc(p.organisationName)}</p>
<p class="rr-sub">Reporting period: ${esc(p.periodLabel)}</p>
<p class="rr-sub">Generated: ${esc(p.generatedAtLabel)}</p>
</header>
<section class="rr-section"><h2>Summary</h2>
<div class="rr-kpi-grid">
<div class="rr-kpi"><p class="rr-kpi-label">Total appointments</p><p class="rr-kpi-value">${formatNum(p.summary.totalAppointments)}</p></div>
<div class="rr-kpi"><p class="rr-kpi-label">Hours logged</p><p class="rr-kpi-value">${formatNum(p.summary.totalHours)}</p></div>
<div class="rr-kpi"><p class="rr-kpi-label">Active clinicians</p><p class="rr-kpi-value">${formatNum(p.summary.activeClinicians)}</p></div>
<div class="rr-kpi"><p class="rr-kpi-label">Practices covered</p><p class="rr-kpi-value">${formatNum(p.practicesCovered)}</p></div>
</div></section>
<section class="rr-section"><h2>Appointments by category</h2>${categoryRows}</section>
<section class="rr-section"><h2>Appointments by practice</h2>${practiceTable}</section>
<section class="rr-section"><h2>Clinician breakdown</h2>${clinicianTable}</section>
<footer class="rr-footer">Generated by ReportRx — ${esc(getPublicSiteUrl())}</footer>
</article>`;

  return style + body;
}

export function buildMonthlyReportApiDocumentHtml(p: MonthlyReportViewProps): string {
  const inner = buildMonthlyReportInnerHtml(p);
  const printBar = `<div class="rr-print-hide" style="padding:12px 16px;text-align:center;border-bottom:1px solid ${border};background:#fff;font-family:system-ui,sans-serif">
<button type="button" onclick="window.print()" style="cursor:pointer;border:0;border-radius:8px;background:${teal};color:#fff;font-weight:600;font-size:16px;padding:12px 24px">Print report</button>
<p style="margin:10px 0 0;font-size:12px;color:${muted}">Use Print → Save as PDF to download.</p>
</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ReportRx — Activity report</title>
</head>
<body style="margin:0;background:#f3f4f6">
${printBar}
${inner}
</body>
</html>`;
}
