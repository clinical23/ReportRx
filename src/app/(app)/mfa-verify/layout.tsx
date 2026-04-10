import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two-Factor Authentication",
  description: "Verify your identity with a code from your authenticator app.",
};

export default function MfaVerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
