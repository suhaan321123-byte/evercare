"use client";

import { ClientRoute } from "@/app/ClientRoute";
import ProductListing from "@/views/pages/ProductListing";

export function ProductsClient() {
  return (
    <ClientRoute>
      <ProductListing />
    </ClientRoute>
  );
}
