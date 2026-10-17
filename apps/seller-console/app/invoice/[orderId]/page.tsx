"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import InvoiceView from "@/components/InvoiceView";
import { api } from "@/lib/api";
import type { Invoice } from "@/lib/types";

function InvoiceContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Invoice>(`/seller/invoices/${orderId}`).then(setInv).catch((e) => setError(e.message)); }, [orderId]);
  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-3 flex max-w-3xl justify-end print:hidden">
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => window.print()}>Print</button>
      </div>
      {error && <p className="text-center text-rose-700">{error}</p>}
      {inv && <InvoiceView inv={inv} />}
    </div>
  );
}

export default function InvoicePage() {
  return <Suspense><InvoiceContent /></Suspense>;
}
