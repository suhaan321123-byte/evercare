"use client";

import { ClientRoute } from "@/app/ClientRoute";
import OrderSuccess from "@/views/pages/OrderSuccess";

export function OrderSuccessClient() {
  return (
    <ClientRoute>
      <OrderSuccess />
    </ClientRoute>
  );
}
