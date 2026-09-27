"use client";

import { ClientRoute } from "@/app/ClientRoute";
import CheckoutLogin from "@/views/pages/CheckoutLogin";

export function CheckoutLoginClient() {
  return (
    <ClientRoute>
      <CheckoutLogin />
    </ClientRoute>
  );
}
