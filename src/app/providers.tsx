"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Suspense, useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { pageView } from "@/lib/analytics";

function AnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    pageView(`${pathname}${search ? `?${search}` : ""}`);
  }, [pathname, search]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <Suspense fallback={null}>
                <AnalyticsPageTracker />
              </Suspense>
              {children}
              <Toaster />
              <Sonner />
            </CartProvider>
          </CustomerAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
