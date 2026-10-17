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
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold">LotBazaar Seller Console</h1>
        <p className="mb-5 text-sm text-slate-500">Sign in to manage containers, cartons and lots.</p>
        <ErrorBox message={error} />
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input mb-3" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input mb-5" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="label">Demo: sign in as</div>
          <div className="space-y-2">
            {DEMO.map((d) => (
              <button key={d.email} type="button" disabled={busy} onClick={() => signIn(d.email, "demo123")}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50">
                <div className="text-sm font-medium">{d.label} <span className="font-normal text-slate-500">· {d.email}</span></div>
                <div className="text-xs text-slate-500">{d.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
