import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { decodeBase64UrlJson } from "@/lib/customerAuth";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { encryptData } from "@/utils/cryptoJS/cryptoJs";
import { setCustomerToken } from "@/utils/tokenKey";

type CustomerPayload = {
  customerId?: string;
  customerData?: { _id?: string; name?: string; email?: string; image?: string };
};
const SESSION_EXPIRATION_MS = 240 * 60 * 60 * 1000;

function parseHash(hash: string) {
  const raw = String(hash || "").replace(/^#/, "");
  const params = new URLSearchParams(raw);
  return {
    accessToken: params.get("accessToken") || "",
    data: params.get("data") || "",
  };
}

export default function GoogleAuthDone() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setSession } = useCustomerAuth();

  const returnTo = useMemo(() => searchParams.get("returnTo") || "/", [searchParams]);
  const [{ done, error }, setState] = useState<{ done: boolean; error: string }>({
    done: false,
    error: "",
  });

  useEffect(() => {
    const { accessToken, data } = parseHash(location.hash);
    if (!accessToken || !data) {
      setState({ done: false, error: "Missing token data. Please try again." });
      return;
    }
    try {
      const decoded = decodeBase64UrlJson<CustomerPayload>(data);
      const customerId = decoded?.customerId || decoded?.customerData?._id || "";
      setSession({
        token: accessToken,
        customerId,
        email: decoded?.customerData?.email || undefined,
        name: decoded?.customerData?.name || undefined,
        image: decoded?.customerData?.image || undefined,
        ...decoded?.customerData,
        createdAt: Date.now(),
      });
      const sessionData = {
        token: accessToken,
        customerId,
        email: decoded?.customerData?.email || "",
        name: decoded?.customerData?.name || "",
        image: decoded?.customerData?.image || "",
        authMethod: "google",
        hostname: window.location.hostname,
        expiration: SESSION_EXPIRATION_MS,
        expiresAt: new Date(Date.now() + SESSION_EXPIRATION_MS).toISOString(),
        ...decoded?.customerData,
      };

      const encryptedData = encryptData(sessionData);
      localStorage.setItem("chatSession", JSON.stringify(encryptedData));
      localStorage.setItem("userAccessToken", accessToken);
      document.cookie = `chatSession=${JSON.stringify(
        encryptedData,
      )}; Secure; SameSite=Strict; max-age=${SESSION_EXPIRATION_MS / 1000}`;
      setCustomerToken(accessToken);
      
      setState({ done: true, error: "" });
      navigate(returnTo, { replace: true });
    } catch (error) {
      console.error(error)
      setState({ done: false, error: "Could not decode login response. Please try again." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-center">
        <h1 className="text-lg font-bold">Signing you in…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please wait, completing Google login.
        </p>

        {error ? (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            <div className="mt-3">
              <Button onClick={() => navigate("/checkout-login", { replace: true })}>
                Back to login
              </Button>
            </div>
          </div>
        ) : null}

        {done ? <div className="mt-4 text-xs text-muted-foreground">Redirecting…</div> : null}
      </div>
    </div>
  );
}

