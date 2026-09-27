"use client";

import { ClientRoute } from "@/app/ClientRoute";
import RefundReturnPolicy from "@/views/pages/RefundReturnPolicy";

export function RefundReturnPolicyClient() {
  return (
    <ClientRoute>
      <RefundReturnPolicy />
    </ClientRoute>
  );
}
