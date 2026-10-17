"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, saveSession, type Session } from "@/lib/api";
import { Button, ErrorBox } from "@/components/ui";
import { HOME } from "@/components/Shell";

const DEMO = [
  { email: "owner@rk.demo", label: "Owner", hint: "everything, incl. money and claims" },
  { email: "warehouse@rk.demo", label: "Warehouse", hint: "dock check, sorting, putaway, pick, pack, dispatch" },
  { email: "sales@rk.demo", label: "Sales", hint: "lots, buyers, offers, orders" },
  { email: "owner@acme.demo", label: "Other company", hint: "a second liquidator: sees only its own data" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@rk.demo");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await signIn(email, password);
  }

  async function signIn(email: string, password: string) {
    setBusy(true);
    setError(null);
    try {
      const s = await api<Session>("/auth/login", { method: "POST", body: { email, password } });
      if (s.user.kind !== "SELLER") throw new Error("This console is for seller accounts. Buyers use the buyer portal.");
      saveSession(s);
      router.replace(HOME[s.user.role] ?? "/guide");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold">LB</span>
          <span className="text-lg font-semibold">LotBazaar</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Turn containers of branded stock into paid orders, faster.</h2>
          <p className="mt-4 text-slate-400">Sort, shelve, build lots and sell to verified retailers, with GST invoices and a stock ledger that always adds up.</p>
        </div>
        <div className="text-xs text-slate-500">Seller console</div>
      </div>
      <div className="flex items-center justify-center bg-white p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Manage containers, stock, lots and orders.</p>
          <ErrorBox message={error} />
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input mb-6" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
          <div className="mt-8">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Demo: sign in as</div>
            <div className="grid gap-2">
              {DEMO.map((d) => (
                <button key={d.email} type="button" disabled={busy} onClick={() => signIn(d.email, "demo123")}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50">
                  <div className="text-sm font-medium">{d.label} <span className="font-normal text-slate-500">· {d.email}</span></div>
                  <div className="text-xs text-slate-500">{d.hint}</div>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
