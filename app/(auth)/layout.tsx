import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <footer className="fixed bottom-0 inset-x-0 pb-4 flex items-center justify-center gap-4 text-xs text-ink-3">
        <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
        <Link href="/cookies" className="hover:text-ink transition-colors">Cookies</Link>
      </footer>
    </>
  );
}
