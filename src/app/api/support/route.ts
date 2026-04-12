import { Resend } from "resend";

import { createClient } from "@/lib/supabase/server";
import {
  escapeHtmlForEmail,
  isValidSupportCategory,
} from "@/lib/support-email";
import {
  isUnderSupportDailyLimit,
  recordSuccessfulSupportSend,
} from "@/lib/support-rate-limit";

const SUPPORT_TO = "support@reportrx.co.uk";
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 10000;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function parseBody(request: Request): Promise<{
  category: string;
  subject: string;
  message: string;
  screenshot: File | null;
}> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      category: String(form.get("category") ?? ""),
      subject: String(form.get("subject") ?? "").trim(),
      message: String(form.get("message") ?? "").trim(),
      screenshot: (() => {
        const f = form.get("screenshot");
        return f instanceof File && f.size > 0 ? f : null;
      })(),
    };
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return { category: "", subject: "", message: "", screenshot: null };
  }
  return {
    category: typeof body.category === "string" ? body.category : "",
    subject: typeof body.subject === "string" ? body.subject.trim() : "",
    message: typeof body.message === "string" ? body.message.trim() : "",
    screenshot: null,
  };
}

function safeAttachmentFilename(name: string): string {
  const base = name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  return base || "screenshot";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!isUnderSupportDailyLimit(user.id)) {
    return Response.json(
      { error: "Daily support request limit reached. Try again tomorrow." },
      { status: 429 },
    );
  }

  const { category, subject, message, screenshot } = await parseBody(request);

  if (!isValidSupportCategory(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!subject || subject.length > MAX_SUBJECT) {
    return Response.json(
      { error: "Subject is required (max 200 characters)" },
      { status: 400 },
    );
  }
  if (!message || message.length < 10) {
    return Response.json(
      { error: "Message is required (minimum 10 characters)" },
      { status: 400 },
    );
  }
  if (message.length > MAX_MESSAGE) {
    return Response.json(
      { error: `Message must be at most ${MAX_MESSAGE} characters` },
      { status: 400 },
    );
  }

  let attachment:
    | { filename: string; content: Buffer; content_type?: string }
    | undefined;

  if (screenshot) {
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return Response.json(
        { error: "Screenshot must be 5MB or smaller" },
        { status: 400 },
      );
    }
    if (!ALLOWED_IMAGE_TYPES.has(screenshot.type)) {
      return Response.json(
        { error: "Screenshot must be JPG, PNG, or WebP" },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await screenshot.arrayBuffer());
    attachment = {
      filename: safeAttachmentFilename(screenshot.name),
      content: buf,
      content_type: screenshot.type,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email, role, organisation_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return Response.json({ error: "Profile not found" }, { status: 400 });
  }

  let organisationName = "—";
  if (profile.organisation_id) {
    const { data: org } = await supabase
      .from("organisations")
      .select("name")
      .eq("id", profile.organisation_id)
      .maybeSingle();
    if (org?.name?.trim()) organisationName = org.name.trim();
  }

  const resend = getResend();
  if (!resend) {
    console.error("RESEND_API_KEY is not set");
    return Response.json(
      { error: "Email is not configured" },
      { status: 500 },
    );
  }

  const replyTo = profile.email?.trim() || user.email;
  if (!replyTo) {
    return Response.json(
      { error: "No email address on your account" },
      { status: 400 },
    );
  }

  const esc = escapeHtmlForEmail;
  const fullName = (profile.full_name ?? "").trim() || "Unknown";
  const profileEmail = profile.email?.trim() || user.email || "—";
  const role = profile.role ?? "unknown";
  const sentAt = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/London",
  });

  const staffHtml = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px;">
        <h2 style="color: #0d9488;">New Support Request</h2>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 120px;">From</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${esc(fullName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${esc(profileEmail)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Role</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${esc(role)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Organisation</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${esc(organisationName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Category</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${esc(category)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Subject</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${esc(subject)}</td>
          </tr>
        </table>
        <h3 style="color: #374151;">Message</h3>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; white-space: pre-wrap;">${esc(message)}</div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
          Sent from ReportRx Support Form • ${esc(sentAt)}
        </p>
      </div>
    `;

  const { error: sendError } = await resend.emails.send({
    from: "ReportRx Support <noreply@reportrx.co.uk>",
    to: [SUPPORT_TO],
    replyTo,
    subject: `[ReportRx Support] ${category}: ${subject}`,
    html: staffHtml,
    attachments: attachment ? [attachment] : undefined,
  });

  if (sendError) {
    console.error("Support email failed:", sendError);
    return Response.json(
      { error: "Failed to send support request" },
      { status: 500 },
    );
  }

  recordSuccessfulSupportSend(user.id);

  const confirmTo = profileEmail.includes("@") ? profileEmail : user.email;
  if (confirmTo) {
    await resend.emails
      .send({
        from: "ReportRx <noreply@reportrx.co.uk>",
        to: [confirmTo],
        subject: `We received your support request: ${subject}`,
        html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px;">
        <h2 style="color: #0d9488;">We've received your request</h2>
        <p>Hi ${esc(fullName === "Unknown" ? "there" : fullName)},</p>
        <p>We've received your support request about <strong>${esc(subject)}</strong> and will get back to you as soon as possible.</p>
        <p>If your issue is urgent, please contact your PCN admin or manager directly.</p>
        <p style="color: #6b7280; margin-top: 20px;">— The ReportRx Team</p>
      </div>
    `,
      })
      .catch((err: unknown) =>
        console.warn("Confirmation email failed:", err),
      );
  }

  return Response.json({ success: true });
}
