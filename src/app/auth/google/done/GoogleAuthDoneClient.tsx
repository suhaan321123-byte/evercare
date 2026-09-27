"use client";

import { ClientRoute } from "@/app/ClientRoute";
import GoogleAuthDone from "@/views/pages/auth/GoogleAuthDone";

export function GoogleAuthDoneClient() {
  return (
    <ClientRoute>
      <GoogleAuthDone />
    </ClientRoute>
  );
}
