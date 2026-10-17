"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, type Session } from "@/lib/api";

/** Top bar for signed-in buyer pages; redirects to login when there is no session. */
export default function Header({ storeCode, storeName }: { storeCode?: string; storeName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const s = getSession();
    if (!s) router.replace("/login");
    else setSession(s);
  }, [router]);

  const links = storeCode ? [
    { href: `/store/${storeCode}`, label: "Lots" },
    { href: `/store/${storeCode}/orders`, label: "My orders" },
    { href: `/store/${storeCode}/offers`, label: "My offers" },
  ] : [];
  const active = (href: string) => (href === `/store/${storeCode}` ? pathname === href || pathname.includes("/lots/") : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">LB</span>
            <span className="text-[15px] font-semibold text-slate-900">LotBazaar</span>
          </Link>
          {storeName && <span className="hidden truncate border-l border-slate-200 pl-6 text-sm text-slate-500 lg:inline">{storeName}</span>}
          {links.length > 0 && (
            <nav aria-label="Store" className="flex gap-1 text-sm">
              {links.map((l) => (
                <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${active(l.href) ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>{l.label}</Link>
              ))}
            </nav>
          )}
        </div>
        {session && (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-48 truncate text-slate-600 sm:inline">{session.user.businessName ?? session.user.name}</span>
            <button type="button" className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => { clearSession(); router.replace("/login"); }}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
