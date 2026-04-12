import { formatDateLongUK } from "@/lib/datetime";
import { formatRoleLabel } from "@/lib/role-format";

const UK_TZ = "Europe/London";

export type DsarPracticeAssignment = {
  practice: string;
  pcn: string | null;
  assigned_at: string;
};

export type DsarActivityLog = {
  date: string;
  practice: string;
  hours: number | null;
  categories: Record<string, number>;
  created_at: string;
};

export type DsarEditRow = {
  log_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
  edited_by?: string;
};

export type DsarAuditRow = {
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type DsarHtmlInput = {
  generatedAt: Date;
  subject: {
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string | null;
  };
  organisation: { name: string };
  privacyContactEmail: string;
  practice_assignments: DsarPracticeAssignment[];
  activity_logs: DsarActivityLog[];
  edits_by_me: DsarEditRow[];
  edits_to_my_logs: Array<DsarEditRow & { edited_by: string }>;
  audit_trail: DsarAuditRow[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayValue(v: string | null | undefined): string {
  if (v == null || String(v).trim() === "") return "—";
  return String(v);
}

function formatDateTimeLongUK(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("en-GB", {
    timeZone: UK_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-GB", {
    timeZone: UK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
}

function humanizeAuditAction(action: string): string {
  const map: Record<string, string> = {
    view: "Page view",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    export: "Export",
    login: "Login",
    logout: "Logout",
    invite: "Invite",
    deactivate: "Deactivate",
  };
  const a = action.toLowerCase();
  if (map[a]) return map[a];
  return a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeResourceType(rt: string): string {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    reporting: "Reporting",
    activity_log: "Activity log",
    clinician: "Clinician",
    settings: "Settings",
    admin: "Admin",
    auth: "Auth",
    practice_assignment: "Practice assignment",
    bulk_invite: "Bulk invite",
    dsar: "DSAR",
  };
  if (map[rt]) return map[rt];
  return rt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAuditDetails(row: DsarAuditRow): string {
  if (row.resource_id?.trim()) return row.resource_id.trim();
  const meta = row.metadata;
  if (!meta || Object.keys(meta).length === 0) return "—";
  const parts: string[] = [];
  if (meta.format != null) {
    const from = meta.date_from ?? meta.dateRange;
    const to = meta.date_to;
    if (from && to) {
      parts.push(`${String(meta.format)} · ${String(from)} → ${String(to)}`);
    } else parts.push(String(meta.format));
  }
  if (meta.email != null) parts.push(`email: ${String(meta.email)}`);
  if (meta.role != null) parts.push(`role: ${String(meta.role)}`);
  if (meta.field != null) parts.push(`field: ${String(meta.field)}`);
  if (meta.action != null && meta.format == null) {
    parts.push(`op: ${String(meta.action)}`);
  }
  if (meta.count != null) parts.push(`count: ${String(meta.count)}`);
  if (meta.date != null) parts.push(`date: ${String(meta.date)}`);
  if (meta.practice_id != null) {
    parts.push(`practice: ${String(meta.practice_id).slice(0, 8)}…`);
  }
  if (meta.practice_ids != null) {
    parts.push(`practices: ${JSON.stringify(meta.practice_ids)}`);
  }
  if (meta.requested_by != null) {
    parts.push(`by: ${String(meta.requested_by).slice(0, 8)}…`);
  }
  if (meta.old_role != null && meta.new_role != null) {
    parts.push(`role: ${String(meta.old_role)} → ${String(meta.new_role)}`);
  }
  if (meta.is_active != null) parts.push(`active: ${String(meta.is_active)}`);
  if (parts.length > 0) return parts.join(" · ");
  try {
    const s = JSON.stringify(meta);
    return s.length > 140 ? `${s.slice(0, 137)}…` : s;
  } catch {
    return "—";
  }
}

function formatNum(n: number): string {
  return n.toLocaleString("en-GB");
}

export function buildDsarExportHtml(input: DsarHtmlInput): string {
  const {
    generatedAt,
    subject,
    organisation,
    privacyContactEmail,
    practice_assignments,
    activity_logs,
    edits_by_me,
    edits_to_my_logs,
    audit_trail,
  } = input;

  const title = "ReportRx — Your Data Export";
  const genLabel = formatDateTimeLongUK(generatedAt.toISOString());

  const assignmentsRows =
    practice_assignments.length === 0
      ? `<p class="muted">No practice assignments</p>`
      : `<table>
          <thead><tr><th>Practice name</th><th>PCN</th><th>Assigned</th></tr></thead>
          <tbody>
            ${practice_assignments
              .map(
                (a) => `<tr>
              <td>${escapeHtml(a.practice)}</td>
              <td>${escapeHtml(displayValue(a.pcn))}</td>
              <td>${escapeHtml(formatDateTimeLongUK(a.assigned_at))}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;

  const logsHtml =
    activity_logs.length === 0
      ? `<p class="muted">No activity logs</p>`
      : activity_logs
          .map((log) => {
            const catLines = Object.entries(log.categories)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(
                ([name, count]) =>
                  `<li>${escapeHtml(name)}: ${escapeHtml(formatNum(count))}</li>`,
              )
              .join("");
            const hours =
              log.hours == null
                ? "—"
                : formatNum(log.hours) + (log.hours === 1 ? " hour" : " hours");
            return `<div class="log-block">
            <p class="log-date">Date: ${escapeHtml(formatDateLongUK(log.date))}</p>
            <p><strong>Practice:</strong> ${escapeHtml(log.practice)}</p>
            <p><strong>Hours worked:</strong> ${escapeHtml(hours)}</p>
            <p><strong>Categories:</strong></p>
            <ul class="cat-list">${catLines || "<li>—</li>"}</ul>
          </div>`;
          })
          .join("");

  const editsByMeHtml =
    edits_by_me.length === 0
      ? ""
      : `<h2>Corrections you made to activity logs</h2>
        <table>
          <thead><tr><th>Date/Time</th><th>Log ID</th><th>Field</th><th>Old</th><th>New</th><th>Reason</th></tr></thead>
          <tbody>
            ${edits_by_me
              .map(
                (e) => `<tr>
              <td>${escapeHtml(formatDateTimeLongUK(e.created_at))}</td>
              <td class="mono">${escapeHtml(e.log_id.slice(0, 8))}…</td>
              <td>${escapeHtml(e.field_changed)}</td>
              <td>${escapeHtml(displayValue(e.old_value))}</td>
              <td>${escapeHtml(displayValue(e.new_value))}</td>
              <td>${escapeHtml(displayValue(e.reason))}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;

  const editsToMyHtml =
    edits_to_my_logs.length === 0
      ? ""
      : `<h2>Corrections others made to your activity logs</h2>
        <table>
          <thead><tr><th>Date/Time</th><th>Edited by</th><th>Field</th><th>Old</th><th>New</th><th>Reason</th></tr></thead>
          <tbody>
            ${edits_to_my_logs
              .map(
                (e) => `<tr>
              <td>${escapeHtml(formatDateTimeLongUK(e.created_at))}</td>
              <td>${escapeHtml(e.edited_by)}</td>
              <td>${escapeHtml(e.field_changed)}</td>
              <td>${escapeHtml(displayValue(e.old_value))}</td>
              <td>${escapeHtml(displayValue(e.new_value))}</td>
              <td>${escapeHtml(displayValue(e.reason))}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;

  const auditRows =
    audit_trail.length === 0
      ? `<tr><td colspan="4" class="muted">No audit entries</td></tr>`
      : audit_trail
          .map(
            (r) => `<tr>
          <td>${escapeHtml(formatDateTimeLongUK(r.created_at))}</td>
          <td>${escapeHtml(humanizeAuditAction(r.action))}</td>
          <td>${escapeHtml(humanizeResourceType(r.resource_type))}</td>
          <td>${escapeHtml(formatAuditDetails(r))}</td>
        </tr>`,
          )
          .join("");

  const accountCreated =
    subject.created_at == null
      ? "—"
      : formatDateTimeLongUK(subject.created_at);

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
      color: #111827;
      background: #f3f4f6;
      margin: 0;
      padding: 2rem 1rem;
    }
    .wrap {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      padding: 2rem 2.25rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0d9488;
      margin: 0 0 0.5rem 0;
      border-bottom: 3px solid #0d9488;
      padding-bottom: 0.75rem;
    }
    .subtitle { color: #6b7280; font-size: 0.95rem; margin: 0 0 2rem 0; }
    h2 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      background: #0f766e;
      margin: 2rem 0 1rem 0;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
    }
    h2:first-of-type { margin-top: 0.5rem; }
    dl { margin: 0; display: grid; grid-template-columns: 11rem 1fr; gap: 0.35rem 1rem; font-size: 0.95rem; }
    dt { color: #6b7280; font-weight: 500; }
    dd { margin: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      margin: 0.75rem 0 0 0;
    }
    th {
      background: #134e4a;
      color: #fff;
      text-align: left;
      padding: 0.6rem 0.75rem;
      font-weight: 600;
    }
    td {
      padding: 0.55rem 0.75rem;
      border: 1px solid #e5e7eb;
      vertical-align: top;
    }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .muted { color: #6b7280; font-style: italic; }
    .log-block {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem 1.1rem;
      margin-bottom: 1rem;
      background: #fafafa;
    }
    .log-date { font-weight: 700; color: #0f766e; margin: 0 0 0.5rem 0; }
    .cat-list { margin: 0.25rem 0 0 1.25rem; padding: 0; }
    .cat-list li { margin: 0.2rem 0; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .legal {
      margin-top: 2.5rem;
      padding: 1.25rem;
      background: #ecfdf5;
      border: 1px solid #99f6e4;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #115e59;
    }
    .legal p { margin: 0 0 0.75rem 0; }
    .legal p:last-child { margin-bottom: 0; }
    @media print {
      body { background: #fff; padding: 0; }
      .wrap { box-shadow: none; max-width: none; padding: 0; }
      h2 { break-after: avoid; }
      table, .log-block { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">Generated: ${escapeHtml(genLabel)} for ${escapeHtml(subject.name)}</p>

    <h2>Personal Information</h2>
    <dl>
      <dt>Name</dt><dd>${escapeHtml(subject.name)}</dd>
      <dt>Email</dt><dd>${escapeHtml(displayValue(subject.email))}</dd>
      <dt>Role</dt><dd>${escapeHtml(formatRoleLabel(subject.role))}</dd>
      <dt>Organisation</dt><dd>${escapeHtml(organisation.name)}</dd>
      <dt>Account status</dt><dd>${subject.is_active ? "Active" : "Inactive"}</dd>
      <dt>Account created</dt><dd>${escapeHtml(accountCreated)}</dd>
    </dl>

    <h2>Practice Assignments</h2>
    ${assignmentsRows}

    <h2>Activity Logs</h2>
    ${logsHtml}
    ${editsByMeHtml}
    ${editsToMyHtml}

    <h2>Audit Trail</h2>
    <table>
      <thead>
        <tr><th>Date/Time</th><th>Action</th><th>Resource</th><th>Details</th></tr>
      </thead>
      <tbody>${auditRows}</tbody>
    </table>

    <div class="legal">
      <p><strong>Data processing information</strong></p>
      <p>This export contains personal data held about you by ReportRx in connection with your use of the service.</p>
      <p><strong>Data controller:</strong> ClinicalRx Ltd</p>
      <p>For questions about your data, contact: <a href="mailto:${escapeHtml(privacyContactEmail)}">${escapeHtml(privacyContactEmail)}</a></p>
      <p>Export generated under UK GDPR Article 15 (Right of Access).</p>
    </div>
  </div>
</body>
</html>`;
}
