"use client";

import { ClientRoute } from "@/app/ClientRoute";
import ShippingDeliveryPolicy from "@/views/pages/ShippingDeliveryPolicy";

export function ShippingDeliveryPolicyClient() {
  return (
    <ClientRoute>
      <ShippingDeliveryPolicy />
    </ClientRoute>
  );
}
