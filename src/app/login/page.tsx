import { Suspense } from "react";

import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
