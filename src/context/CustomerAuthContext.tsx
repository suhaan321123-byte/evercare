import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCustomerSession, setCustomerSession, type CustomerSession } from "@/lib/customerAuth";

type CustomerAuthContextValue = {
  hydrated: boolean;
  session: CustomerSession | null;
  isLoggedIn: boolean;
  setSession: (next: CustomerSession | null) => void;
  logout: () => void;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSessionState] = useState<CustomerSession | null>(null);

  useEffect(() => {
    setSessionState(getCustomerSession());
    setHydrated(true);
  }, []);

  const setSession = (next: CustomerSession | null) => {
    setSessionState(next);
    setCustomerSession(next);
  };

  const value = useMemo<CustomerAuthContextValue>(
    () => ({
      hydrated,
      session,
      isLoggedIn: Boolean(session?.token || session?.email),
      setSession,
      logout: () => setSession(null),
    }),
    [hydrated, session],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}

