"use client";

import { ClientRoute } from "@/app/ClientRoute";
import Offers from "@/views/pages/Offers";

export function OffersClient() {
  return (
    <ClientRoute>
      <Offers />
    </ClientRoute>
  );
}
