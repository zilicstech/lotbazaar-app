"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, getSession, inr2 } from "@/lib/api";
import type { Order } from "@/lib/types";

const METHODS = [
  { id: "UPI", label: "UPI", hint: "GPay, PhonePe, Paytm or any UPI app" },
  { id: "NETBANKING", label: "Net banking", hint: "All major Indian banks" },
  { id: "RTGS", label: "NEFT / RTGS", hint: "For large amounts, from your current account" },
];

/** Stand-in for the payment gateway's hosted page (Razorpay/Cashfree in production). */
function PayContent() {
  const { code, orderId } = useParams<{ code: string; orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState("UPI");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (getSession()) api<Order>(`/store/${code}/orders/${orderId}`).then(setOrder).catch((e) => setMessage({ ok: false, text: e.message }));
  }, [code, orderId]);

  async function pay(success: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const r = await api<{ success: boolean; message: string }>(`/store/${code}/orders/${orderId}/pay`, { method: "POST", body: { method, success } });
      setMessage({ ok: r.success, text: r.message });
      if (r.success) setTimeout(() => router.push(`/store/${code}/orders/${orderId}`), 1200);
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-indigo-950 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="bg-indigo-700 px-5 py-4 text-white">
          <div className="text-xs uppercase tracking-wide text-indigo-200">Secure payment · demo gateway</div>
          <div className="mt-1 text-2xl font-semibold">{order ? inr2(order.total) : "…"}</div>
          <div className="text-sm text-indigo-100">{order?.lotTitle} · {order?.orderNo}</div>
        </div>
        <div className="space-y-3 p-5">
          {METHODS.map((m) => (
            <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 ${method === m.id ? "border-indigo-600 bg-indigo-50" : "border-slate-200"}`}>
              <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
              <div><div className="text-sm font-medium">{m.label}</div><div className="text-xs text-slate-500">{m.hint}</div></div>
            </label>
          ))}
          {message && (
            <div role="status" className={`rounded-md px-3 py-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{message.text}</div>
          )}
          <button disabled={busy || !order || message?.ok} onClick={() => pay(true)}
            className="w-full rounded-md bg-indigo-700 py-3 font-medium text-white hover:bg-indigo-600 disabled:bg-slate-400">
            {busy ? "Processing…" : `Pay ${order ? inr2(order.total) : ""}`}
          </button>
          <button disabled={busy || !order || message?.ok} onClick={() => pay(false)} className="w-full text-sm text-slate-500 underline disabled:no-text-emerald-700 hover:underline">
            Simulate a failed payment
          </button>
          <p className="text-center text-[11px] text-slate-400">Demo only: no money moves. In production this page is Razorpay / Cashfree.</p>
        </div>
      </div>
    </div>
  );
}

export default function PayPage() {
  return <Suspense><PayContent /></Suspense>;
}
