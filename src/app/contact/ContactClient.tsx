"use client";

import { ClientRoute } from "@/app/ClientRoute";
import Contact from "@/views/pages/Contact";

export function ContactClient() {
  return (
    <ClientRoute>
      <Contact />
    </ClientRoute>
  );
}
