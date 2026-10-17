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
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Choose a seller</h1>
        <p className="mb-6 text-sm text-slate-600">Each liquidator runs its own private storefront. You see lots once the seller approves you.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => (
            <Link key={s.code} href={`/store/${s.code}`} className="card hover:border-emerald-400">
              <div className="font-semibold">{s.legalName}</div>
              <div className="text-xs text-slate-500">{s.code}</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
