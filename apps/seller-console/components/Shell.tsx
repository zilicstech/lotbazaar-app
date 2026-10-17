"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, type Session } from "@/lib/api";
import { ROLE_LABEL, type Role } from "@/lib/workflow";

const ALL: Role[] = ["OWNER", "WAREHOUSE", "SALES"];

const NAV: { href: string; label: string; step?: string; roles: Role[] }[] = [
  { href: "/guide", label: "How it works", roles: ALL },
  { href: "/", label: "Dashboard", step: "17", roles: ["OWNER"] },
  { href: "/containers", label: "Containers & sorting", step: "1–4", roles: ["OWNER", "WAREHOUSE"] },
  { href: "/putaway", label: "Putaway", step: "5", roles: ["OWNER", "WAREHOUSE"] },
  { href: "/inventory", label: "Inventory", roles: ALL },
  { href: "/lots", label: "Lots", step: "6–7", roles: ["OWNER", "SALES"] },
  { href: "/buyers", label: "Buyers", step: "8", roles: ["OWNER", "SALES"] },
  { href: "/offers", label: "Offers", step: "9b", roles: ["OWNER", "SALES"] },
  { href: "/orders", label: "Orders", roles: ["OWNER", "SALES"] },
  { href: "/fulfil", label: "Pick, pack & dispatch", step: "11–13", roles: ["OWNER", "WAREHOUSE"] },
  { href: "/claims", label: "Claims", step: "16", roles: ["OWNER"] },
];

/** Landing page per role after login. */
export const HOME: Record<string, string> = { OWNER: "/", WAREHOUSE: "/containers", SALES: "/lots" };

export default function Shell({ title, help, actions, children }:
  { title: string; help?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) router.replace("/login");
    else setSession(s);
  }, [router]);

  if (!session) return null;
  const role = session.user.role as Role;
  const nav = NAV.filter((n) => n.roles.includes(role));
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-200 md:flex">
        <div className="px-5 py-5">
          <div className="text-lg font-semibold text-white">LotBazaar</div>
          <div className="text-xs text-slate-400">Seller console</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${isActive(n.href) ? "bg-slate-700 text-white" : "hover:bg-slate-800"}`}>
              <span>{n.label}</span>
              {n.step && <span className="rounded bg-slate-800 px-1.5 text-[10px] text-slate-400">step {n.step}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-5 py-4 text-xs">
          <div className="font-medium text-white">{session.user.name}</div>
          <div className="text-slate-400">{ROLE_LABEL[role] ?? role} · {session.user.tenantName}</div>
          <button className="mt-2 text-slate-300 underline" onClick={() => { clearSession(); router.replace("/login"); }}>
            Sign out / switch role
          </button>
        </div>
      </aside>
      <nav aria-label="Sections" className="flex gap-1 overflow-x-auto bg-slate-900 px-3 py-2 md:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded px-2 py-1 text-xs ${isActive(n.href) ? "bg-slate-700 text-white" : "text-slate-300"}`}>
            {n.label}
          </Link>
        ))}
        <button className="whitespace-nowrap px-2 text-xs text-slate-300 underline" onClick={() => { clearSession(); router.replace("/login"); }}>Sign out</button>
      </nav>
      <main className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-4 md:px-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex gap-2">{actions}</div>
        </div>
        {help && (
          <div className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-sm text-sky-900 md:px-6">
            <span className="font-medium">What is this screen? </span>{help}{" "}
            <Link href="/guide" className="underline">See all steps</Link>
          </div>
        )}
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
