import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-sm font-medium text-teal-700">404</p>
      <h1 className="mt-2 text-xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        This page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className="mt-6 min-h-11 inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
