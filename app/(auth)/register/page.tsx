import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";

export const metadata = {
  title: "Register",
  description: "Create a new account",
};

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4 py-12">
      {/* Soft background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-12%] right-[-8%] w-[480px] h-[480px] bg-mint/16 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-8%] w-[400px] h-[400px] bg-mint/12 rounded-full blur-3xl" />
        <div className="absolute top-[35%] left-[40%] w-[260px] h-[260px] bg-mint/8 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mb-8 text-sm text-ink-3 hover:text-ink-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>
        <RegisterForm />
      </div>
    </main>
  );
}
