import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ReportRx collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-teal-600 px-4 py-4 text-white shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-lg font-bold">
            Rx
          </div>
          <div>
            <p className="text-sm font-medium text-teal-100">ReportRx</p>
            <h1 className="text-lg font-semibold sm:text-xl">Privacy Policy</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/login"
          className="mb-6 inline-block text-sm font-medium text-teal-700 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          ← Back to login
        </Link>

        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900">Privacy Policy — ReportRx</h2>
          <p className="mt-6 text-sm leading-relaxed text-gray-700">
            <strong className="text-gray-900">Who we are.</strong> Clinical Rx Ltd operates
            ReportRx, a clinical activity tracking platform for NHS Primary Care.
          </p>

          <h3 className="mt-8 text-base font-semibold text-gray-900">What data we collect</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            We collect your name, email address, organisation, role, and clinical activity logs
            (appointment counts, hours worked, activity categories). We do{" "}
            <strong className="text-gray-900">not</strong> collect patient data, NHS numbers, or
            clinical records.
          </p>

          <h3 className="mt-8 text-base font-semibold text-gray-900">Why we collect it</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            To track clinician activity for workforce reporting under ARRS funding arrangements.
          </p>

          <h3 className="mt-8 text-base font-semibold text-gray-900">Legal basis</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            Legitimate interests of the employer/contracting organisation for workforce management
            and reporting.
          </p>

          <h3 className="mt-8 text-base font-semibold text-gray-900">Who we share it with</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            Data is shared with your employing/contracting organisation&apos;s managers and
            administrators. We use Supabase (data processor) for database hosting and Resend for
            transactional emails.
          </p>

          <h3 className="mt-8 text-base font-semibold text-gray-900">Data retention</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            Activity logs are retained for the duration of the service agreement. You can request
            deletion by contacting your organisation administrator or emailing{" "}
            <a
              className="font-medium text-teal-700 underline hover:text-teal-800"
              href="mailto:privacy@clinicalrx.co.uk"
            >
              privacy@clinicalrx.co.uk
            </a>
            .
          </p>

          <h3 className="mt-8 text-base font-semibold text-gray-900">Your rights</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            You have rights of access, rectification, erasure, restriction, portability, and
            objection. Contact{" "}
            <a
              className="font-medium text-teal-700 underline hover:text-teal-800"
              href="mailto:privacy@clinicalrx.co.uk"
            >
              privacy@clinicalrx.co.uk
            </a>
            .
          </p>

          <h3 className="mt-8 text-base font-semibold text-gray-900">Cookies</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            We use essential session cookies only. We do not use analytics or advertising cookies.
          </p>

          <h3 className="mt-8 text-base font-semibold text-gray-900">Changes</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            We may update this policy from time to time. Last updated: April 2026.
          </p>
        </article>
      </main>
    </div>
  );
}
