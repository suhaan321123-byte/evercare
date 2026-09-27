"use client";

import { ClientRoute } from "@/app/ClientRoute";
import ProductListing from "@/views/pages/ProductListing";

export function EquipmentClient() {
  return (
    <ClientRoute>
      <ProductListing catalogueMode="equipment" />
    </ClientRoute>
  );
}
