"use client";

import { ClientRoute } from "@/app/ClientRoute";
import AboutUs from "@/views/pages/AboutUs";

export function AboutUsClient() {
  return (
    <ClientRoute>
      <AboutUs />
    </ClientRoute>
  );
}
