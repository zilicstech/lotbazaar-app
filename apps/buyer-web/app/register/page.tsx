"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, ErrorBox } from "@/components/ui";

type Storefront = { id: string; code: string; legalName: string };

export default function RegisterPage() {
  const [stores, setStores] = useState<Storefront[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", gstin: "", city: "", tenantCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<Storefront[]>("/public/storefronts").then((s) => {
      setStores(s);
      setForm((f) => ({ ...f, tenantCode: s[0]?.code ?? "" }));
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/auth/register-buyer", { method: "POST", body: { ...form, gstin: form.gstin.trim().toUpperCase() } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} required className="input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">LB</span><span className="text-[15px] font-semibold">LotBazaar</span></div>
        <h1 className="text-xl font-semibold tracking-tight">Register your shop</h1>
        {done ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="rounded-md bg-emerald-50 p-3 text-emerald-800">Registered. The seller will verify your GSTIN and approve your account.</p>
            <Link href="/login" className="font-medium text-emerald-700 hover:underline">Go to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><ErrorBox message={error} /></div>
            {field("businessName", "Shop / business name")}
            {field("name", "Your name")}
            {field("email", "Email", { type: "email", autoComplete: "email" })}
            {field("password", "Password", { type: "password", minLength: 6, autoComplete: "new-password" })}
            {field("gstin", "GSTIN", { placeholder: "22AAAAA0000A1Z5", maxLength: 15 })}
            {field("city", "City")}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="store">Seller</label>
              <select id="store" className="input" value={form.tenantCode} onChange={(e) => setForm({ ...form, tenantCode: e.target.value })}>
                {stores.map((s) => <option key={s.code} value={s.code}>{s.legalName}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <Link href="/login" className="text-sm text-slate-500 underline">Back to sign in</Link>
              <Button type="submit" className="!bg-emerald-700 hover:!bg-emerald-600">Register</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
