import { TwoFactorVerifyForm } from "@/components/auth/two-factor-verify-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two-Factor Verification",
};

export default function TwoFactorVerifyPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute top-[-12%] right-[-8%] w-[420px] h-[420px] rounded-full bg-mint/22 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8%] left-[-6%] w-[380px] h-[380px] rounded-full bg-mint/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <TwoFactorVerifyForm />
      </div>
    </main>
  );
}
