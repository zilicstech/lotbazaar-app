"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, saveSession, type Session } from "@/lib/api";
import { Button, ErrorBox } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("buyer@shop.demo");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = await api<Session>("/auth/login", { method: "POST", body: { email, password } });
      if (s.user.kind !== "BUYER") throw new Error("This portal is for retailer accounts. Sellers use the seller console.");
      saveSession(s);
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">LB</span><span className="text-[15px] font-semibold">LotBazaar</span></div>
        <h1 className="text-xl font-semibold tracking-tight">Retailer sign in</h1>
        <p className="mb-5 text-sm text-slate-500">Branded stock lots at wholesale prices. Retailer sign in.</p>
        <ErrorBox message={error} />
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input mb-3" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input mb-5" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
        <p className="mt-4 text-sm">New retailer? <Link href="/register" className="font-medium text-emerald-700 hover:underline">Register with GSTIN</Link></p>
        <p className="mt-2 text-xs text-slate-500">Demo: buyer@shop.demo (approved) or newbuyer@shop.demo (pending), password demo123</p>
      </form>
    </div>
  );
}
