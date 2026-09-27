"use client";

import { ClientRoute } from "@/app/ClientRoute";
import ProductDetails from "@/views/pages/ProductDetails";

export function ProductDetailsClient() {
  return (
    <ClientRoute>
      <ProductDetails />
    </ClientRoute>
  );
}
