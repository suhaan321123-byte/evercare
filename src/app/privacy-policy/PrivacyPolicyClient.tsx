"use client";

import { ClientRoute } from "@/app/ClientRoute";
import PrivacyPolicy from "@/views/pages/PrivacyPolicy";

export function PrivacyPolicyClient() {
  return (
    <ClientRoute>
      <PrivacyPolicy />
    </ClientRoute>
  );
}
