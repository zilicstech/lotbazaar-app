"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, type Session } from "@/lib/api";
import { ROLE_LABEL, type Role } from "@/lib/workflow";

const ALL: Role[] = ["OWNER", "WAREHOUSE", "SALES"];

// 20x20 outline icons (Heroicons-style paths).
const ICON: Record<string, string> = {
  dashboard: "M3 4.75A1.75 1.75 0 0 1 4.75 3h3.5A1.75 1.75 0 0 1 10 4.75v3.5A1.75 1.75 0 0 1 8.25 10h-3.5A1.75 1.75 0 0 1 3 8.25v-3.5Zm7 7A1.75 1.75 0 0 1 11.75 10h3.5A1.75 1.75 0 0 1 17 11.75v3.5A1.75 1.75 0 0 1 15.25 17h-3.5A1.75 1.75 0 0 1 10 15.25v-3.5ZM3 13.5A3.5 3.5 0 1 1 10 13.5 3.5 3.5 0 0 1 3 13.5ZM13.5 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z",
  guide: "M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.75 11.5h1.5V15h-1.5v-1.5Zm.75-8a2.75 2.75 0 0 0-2.75 2.75h1.5a1.25 1.25 0 1 1 1.98 1.01c-.75.55-1.48 1.13-1.48 2.24v.25h1.5V11.5c0-.36.2-.56.86-1.04A2.75 2.75 0 0 0 10 5.5Z",
  container: "M2.5 6 10 2.5 17.5 6v8L10 17.5 2.5 14V6Zm1.5.95v6.1l5.25 2.45V9.4L4 6.95Zm6.75 2.45v6.1L16 13.05v-6.1L10.75 9.4ZM10 4.15 5.07 6.45 10 8.75l4.93-2.3L10 4.15Z",
  putaway: "M3 3h14v2H3V3Zm0 6h14v2H3V9Zm0 6h14v2H3v-2Zm3-10h2v2H6V5Zm6 6h2v2h-2v-2Z",
  inventory: "M3.5 3h13A1.5 1.5 0 0 1 18 4.5v2A1.5 1.5 0 0 1 16.5 8H16v7.5A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5V8h-.5A1.5 1.5 0 0 1 2 6.5v-2A1.5 1.5 0 0 1 3.5 3Zm2 5v7.5h9V8h-9Zm-2-3.5v2h13v-2h-13ZM8 10h4v1.5H8V10Z",
  lots: "M4 3h5l1.5 2H16a1 1 0 0 1 1 1v9.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4 3Zm.5 1.5v11h11v-9H9.7L8.2 4.5H4.5Z",
  offers: "M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.4L5 16.8V14a2 2 0 0 1-2-2V5Zm2-.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h1.5v1.2l1.4-1.2H15a.5.5 0 0 0 .5-.5V5a.5.5 0 0 0-.5-.5H5Z",
  orders: "M5 2.5h10A1.5 1.5 0 0 1 16.5 4v13l-2.25-1.5L12 17l-2-1.5L8 17l-2.25-1.5L3.5 17V4A1.5 1.5 0 0 1 5 2.5Zm0 1.5v10.2l.75-.5L8 15.2l2-1.5 2 1.5 2.25-1.5.75.5V4H5Zm2 2h6v1.5H7V6Zm0 3h6v1.5H7V9Z",
  buyers: "M7 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM14 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM1.5 16c0-2.8 2.4-5 5.5-5s5.5 2.2 5.5 5V17h-11v-1Zm1.6-.5h7.8C10.6 13.8 9 12.5 7 12.5s-3.6 1.3-3.9 3Zm10.4-3.9c2.8.1 5 2.1 5 4.4v1h-4V15.5h2.4c-.4-1.3-1.8-2.3-3.4-2.4v-1.5Z",
  fulfil: "M2 5.5A1.5 1.5 0 0 1 3.5 4h8A1.5 1.5 0 0 1 13 5.5V7h2.4a1.5 1.5 0 0 1 1.2.6l1.1 1.5a1.5 1.5 0 0 1 .3.9V13.5a1.5 1.5 0 0 1-1.5 1.5h-.6a2.5 2.5 0 0 1-4.8 0H8.9a2.5 2.5 0 0 1-4.8 0H3.5A1.5 1.5 0 0 1 2 13.5v-8Zm1.5 0v8h.6a2.5 2.5 0 0 1 4.8 0h2.6v-8h-8Zm9.5 3v5h.1a2.5 2.5 0 0 1 2.9-1.6V10l-1.1-1.5H13ZM6.5 13.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  claims: "M10 2.5 17.5 16h-15L10 2.5Zm0 3L5.05 14.5h9.9L10 5.5ZM9.25 8h1.5v3.5h-1.5V8Zm0 4.5h1.5V14h-1.5v-1.5Z",
};

type Item = { href: string; label: string; icon: string; roles: Role[] };
const NAV: { group?: string; items: Item[] }[] = [
  { items: [
    { href: "/", label: "Dashboard", icon: "dashboard", roles: ["OWNER"] },
    { href: "/guide", label: "How it works", icon: "guide", roles: ALL },
  ] },
  { group: "Inbound", items: [
    { href: "/containers", label: "Containers & sorting", icon: "container", roles: ["OWNER", "WAREHOUSE"] },
    { href: "/putaway", label: "Putaway", icon: "putaway", roles: ["OWNER", "WAREHOUSE"] },
    { href: "/inventory", label: "Inventory", icon: "inventory", roles: ALL },
  ] },
  { group: "Sales", items: [
    { href: "/lots", label: "Lots", icon: "lots", roles: ["OWNER", "SALES"] },
    { href: "/offers", label: "Offers", icon: "offers", roles: ["OWNER", "SALES"] },
    { href: "/orders", label: "Orders", icon: "orders", roles: ["OWNER", "SALES"] },
    { href: "/buyers", label: "Buyers", icon: "buyers", roles: ["OWNER", "SALES"] },
  ] },
  { group: "Warehouse", items: [
    { href: "/fulfil", label: "Pick, pack & dispatch", icon: "fulfil", roles: ["OWNER", "WAREHOUSE"] },
  ] },
  { group: "After sale", items: [
    { href: "/claims", label: "Claims", icon: "claims", roles: ["OWNER"] },
  ] },
];

/** Landing page per role after login. */
export const HOME: Record<string, string> = { OWNER: "/", WAREHOUSE: "/containers", SALES: "/lots" };

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  return <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" clipRule="evenodd" d={ICON[name]} /></svg>;
}

export default function Shell({ title, help, actions, children }:
  { title: string; help?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) router.replace("/login");
    else setSession(s);
  }, [router]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (!session) return null;
  const role = session.user.role as Role;
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const signOut = () => { clearSession(); router.replace("/login"); };
  const initials = session.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  const nav = (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((g, i) => (
        <div key={g.group ?? i}>
          {g.group && <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.group}</div>}
          <div className="space-y-0.5">
            {g.items.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive(n.href) ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"}`}>
                <Icon name={n.icon} className={`h-[18px] w-[18px] ${isActive(n.href) ? "text-emerald-400" : ""}`} />
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-transform md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">LB</span>
          <div>
            <div className="text-[15px] font-semibold text-white">LotBazaar</div>
            <div className="text-[11px] text-slate-400">Seller console</div>
          </div>
        </div>
        {nav}
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">{initials}</span>
            <div className="min-w-0 flex-1 text-xs">
              <div className="truncate font-medium text-white">{session.user.name}</div>
              <div className="truncate text-slate-400">{ROLE_LABEL[role] ?? role}</div>
            </div>
            <button type="button" onClick={signOut} title="Sign out or switch role" aria-label="Sign out"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2h-1.5v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .41.34.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2H13v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25ZM14.47 6.47a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H8v-1.5h8.19l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
      </aside>
      {menuOpen && <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <button type="button" aria-label="Open menu" className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMenuOpen(true)}>
            <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path d="M3 5h14v1.5H3V5Zm0 4.25h14v1.5H3v-1.5Zm0 4.25h14V15H3v-1.5Z" /></svg>
          </button>
          <div className="min-w-0 flex-1 truncate text-sm text-slate-500">
            <span className="font-medium text-slate-900">{session.user.tenantName}</span>
          </div>
          <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 sm:inline">{ROLE_LABEL[role] ?? role}</span>
          <button type="button" onClick={signOut} className="text-sm text-slate-500 hover:text-slate-900">Sign out</button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
              {help && <p className="mt-1 text-sm leading-6 text-slate-500">{help} <Link href="/guide" className="whitespace-nowrap font-medium text-emerald-700 hover:underline">How it works →</Link></p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
