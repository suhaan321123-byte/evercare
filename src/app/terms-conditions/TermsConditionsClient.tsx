"use client";

import { ClientRoute } from "@/app/ClientRoute";
import TermsConditions from "@/views/pages/TermsConditions";

export function TermsConditionsClient() {
  return (
    <ClientRoute>
      <TermsConditions />
    </ClientRoute>
  );
}
