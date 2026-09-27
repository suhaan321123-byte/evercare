"use client";

import { ClientRoute } from "@/app/ClientRoute";
import dynamic from "next/dynamic";

const Checkout = dynamic(() => import("@/views/pages/Checkout"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4 text-center">
        <div>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    </div>
  ),
});

export function CheckoutClient() {
  return (
    <ClientRoute>
      <Checkout />
    </ClientRoute>
  );
}
