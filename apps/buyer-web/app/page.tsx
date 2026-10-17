"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { api } from "@/lib/api";

type Storefront = { id: string; code: string; legalName: string };

export default function Home() {
  const [stores, setStores] = useState<Storefront[]>([]);
  useEffect(() => { api<Storefront[]>("/public/storefronts").then(setStores); }, []);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a seller</h1>
        <p className="mb-8 mt-1 text-sm text-slate-500">Each liquidator runs its own private storefront. You see lots once the seller approves you.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => (
            <Link key={s.code} href={`/store/${s.code}`} className="group card flex items-center gap-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-base font-semibold text-emerald-700">{s.legalName.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{s.legalName}</span>
                <span className="text-xs text-slate-500">Open storefront</span>
              </span>
              <span aria-hidden className="text-slate-300 transition group-hover:text-emerald-600">→</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
