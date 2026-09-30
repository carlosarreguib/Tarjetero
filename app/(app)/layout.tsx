import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <Link href="/" className="font-semibold text-blue-700">Ferias</Link>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="hidden sm:inline">{String(data.claims.email ?? "")}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4 sm:pb-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-white sm:hidden">
        <Link href="/" className="flex-1 py-3 text-center text-sm font-medium">Eventos</Link>
        <Link href="/repeated" className="flex-1 py-3 text-center text-sm font-medium">Repetidos</Link>
      </nav>
    </div>
  );
}
