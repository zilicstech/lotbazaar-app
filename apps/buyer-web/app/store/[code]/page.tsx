"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import { ErrorBox } from "@/components/ui";
import { ListToolbar, Pagination, useList } from "@/components/list";
import { api, getSession, inr, num, photoUrl } from "@/lib/api";
import type { Lot } from "@/lib/types";

function StorePageContent() {
  const { code } = useParams<{ code: string }>();
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [store, setStore] = useState<{ tenant: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) return;
    api<{ tenant: string; status: string }>(`/store/${code}/access`).then((a) => {
      setStore(a);
      if (a.status === "APPROVED") api<Lot[]>(`/store/${code}/lots`).then(setLots).catch((e) => setError(e.message));
    }).catch((e) => setError(e.message));
  }, [code]);

  const GENDER: Record<string, string> = { M: "Men", W: "Women", K: "Kids", U: "Unisex" };
  const priceBand = (v: number | null) => (v == null ? null : v < 50_000 ? "Under ₹50,000" : v < 100_000 ? "₹50,000 – ₹1 lakh" : v < 250_000 ? "₹1 – 2.5 lakh" : "Above ₹2.5 lakh");
  const list = useList(lots ?? [], {
    search: (l) => [l.code, l.title, l.description, ...Object.keys(l.manifest.brandMix), ...Object.keys(l.manifest.categoryMix)],
    filters: {
      brand: { label: "Brand", value: (l) => Object.keys(l.manifest.brandMix) },
      category: { label: "Category", value: (l) => Object.keys(l.manifest.categoryMix) },
      gender: { label: "For", value: (l) => Object.keys(l.manifest.genderMix).map((g) => GENDER[g] ?? g) },
      grade: { label: "Grade", value: (l) => l.manifest.grades.map((g) => `Grade ${g}`) },
      price: { label: "Price", value: (l) => priceBand(l.priceAmount) },
      offers: { label: "Offers", value: (l) => (l.acceptOffers ? "Takes offers" : "Fixed price") },
    },
    sorts: {
      newest: (l) => l.listedAt ?? l.createdAt, price: (l) => l.priceAmount, pct: (l) => l.pricePct,
      perPiece: (l) => (l.priceAmount ?? 0) / l.pieceCount, pieces: (l) => l.pieceCount,
    },
    defaultSort: { key: "newest", dir: "desc" },
    pageSize: 24,
  });

  return (
    <>
      <Header storeCode={code} storeName={store?.tenant} />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <ErrorBox message={error} />
        {store && store.status !== "APPROVED" && (
          <div className="card text-sm">
            {store.status === "NONE" ? "You are not registered with this seller yet." : `Your account is ${store.status.toLowerCase()} with ${store.tenant}. You will see lots once approved.`}
          </div>
        )}
        {lots && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">{store?.tenant}</h1>
              <p className="mt-1 text-sm text-slate-500">{lots.length} lots on sale · verified manifests · prices shown as % of tag MRP, GST extra</p>
            </div>
            <ListToolbar list={list} placeholder="Search brand, category, lot title or code…">
              <select aria-label="Sort" className="input w-auto" value={`${list.state.sort}:${list.state.dir}`}
                onChange={(e) => { const [k, d] = e.target.value.split(":"); list.setSort(k, d as "asc" | "desc"); }}>
                <option value="newest:desc">Newest first</option>
                <option value="pct:asc">Lowest % of MRP</option>
                <option value="price:asc">Price: low to high</option>
                <option value="price:desc">Price: high to low</option>
                <option value="perPiece:asc">Lowest price per piece</option>
                <option value="pieces:desc">Most pieces</option>
              </select>
            </ListToolbar>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.rows.map((l) => (
                <Link key={l.id} href={`/store/${code}/lots/${l.id}`} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {l.photos[0]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={photoUrl(code, l.photos[0])} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                      : <div className="flex h-full items-center justify-center text-sm text-slate-400">No photo</div>}
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      <span className="rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-emerald-700 shadow-xs">Grade {l.manifest.grades.join("/")}</span>
                      {l.acceptOffers && <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-xs font-medium text-white">Takes offers</span>}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold text-slate-900 group-hover:text-emerald-800">{l.title}</div>
                      <div className="shrink-0 font-mono text-[11px] text-slate-400">{l.code}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.keys(l.manifest.brandMix).map((b) => <span key={b} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{b}</span>)}
                      {Object.keys(l.manifest.categoryMix).map((c) => <span key={c} className="rounded-md bg-slate-50 px-2 py-0.5 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">{c}</span>)}
                    </div>
                    <div className="mt-3 text-sm text-slate-600">{num(l.pieceCount)} pcs · {l.manifest.cartons} cartons · MRP {inr(l.totalMrp)}</div>
                    <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3">
                      <div>
                        <div className="text-xl font-semibold text-slate-900">{inr(l.priceAmount)}</div>
                        <div className="text-xs text-slate-500">{inr((l.priceAmount ?? 0) / l.pieceCount)} / pc</div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">{l.pricePct}% of MRP</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {list.total === 0 && (
              <div className="card py-12 text-center">
                <div className="font-medium text-slate-700">{lots.length === 0 ? "No lots on sale right now" : "No lots match these filters"}</div>
                {lots.length > 0 && <button type="button" className="mt-1 text-sm text-emerald-700 hover:underline" onClick={list.clear}>Clear filters</button>}
              </div>
            )}
            {list.pages > 1 && <div className="card mt-5 !p-0"><Pagination list={list} /></div>}
          </>
        )}
      </main>
    </>
  );
}

// useParams needs a Suspense boundary under cacheComponents.
export default function StorePage() {
  return (
    <Suspense>
      <StorePageContent />
    </Suspense>
  );
}
