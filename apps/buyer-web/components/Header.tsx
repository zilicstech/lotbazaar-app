"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, type Session } from "@/lib/api";

/** Top bar for signed-in buyer pages; redirects to login when there is no session. */
export default function Header({ storeCode, storeName }: { storeCode?: string; storeName?: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const s = getSession();
    if (!s) router.replace("/login");
    else setSession(s);
  }, [router]);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold text-emerald-700">LotBazaar</Link>
          {storeCode && (
            <nav className="flex gap-3 text-sm">
              <Link href={`/store/${storeCode}`} className="hover:underline">{storeName ?? "Lots"}</Link>
              <Link href={`/store/${storeCode}/orders`} className="hover:underline">My orders</Link>
              <Link href={`/store/${storeCode}/offers`} className="hover:underline">My offers</Link>
            </nav>
          )}
        </div>
        {session && (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">{session.user.businessName ?? session.user.name}</span>
            <button className="text-slate-500 underline" onClick={() => { clearSession(); router.replace("/login"); }}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
