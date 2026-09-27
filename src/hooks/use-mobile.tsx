import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const ServerMobileContext = React.createContext<boolean | undefined>(undefined);

export function useIsMobile() {
  const serverIsMobile = React.useContext(ServerMobileContext);
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(serverIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return Boolean(isMobile);
}

export function ServerMobileProvider({
  initialIsMobile,
  children,
}: {
  initialIsMobile: boolean;
  children: React.ReactNode;
}) {
  return (
    <ServerMobileContext.Provider value={initialIsMobile}>
      {children}
    </ServerMobileContext.Provider>
  );
}
