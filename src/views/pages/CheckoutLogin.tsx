import { ArrowLeft, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getBackendBaseUrl } from "@/lib/backendUrl";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { sendWebsiteEmailOtp, verifyWebsiteEmailOtp } from "@/lib/emailAuthApi";
import { encryptData } from "@/utils/cryptoJS/cryptoJs";
import { setCustomerToken } from "@/utils/tokenKey";

const getErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Please try again";

const CheckoutLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hydrated: authHydrated, isLoggedIn, setSession } = useCustomerAuth();
  const [searchParams] = useSearchParams();
  const returnTo = useMemo(
    () => searchParams.get("returnTo") || "/checkout",
    [searchParams],
  );
  const [step, setStep] = useState<"buttons" | "email" | "emailOtp">("buttons");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (authHydrated && isLoggedIn) {
      navigate(returnTo, { replace: true });
    }
  }, [authHydrated, isLoggedIn, navigate, returnTo]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const url = new URL(
        `${getBackendBaseUrl()}/auth/google/website/login/url`,
      );
      url.searchParams.set("origin", origin);
      url.searchParams.set("returnTo", returnTo);

      const res = await fetch(url.toString(), { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || "Failed to start Google login");
      if (!json?.authUrl) throw new Error("Missing authUrl from server");
      window.location.href = String(json.authUrl);
    } catch (err: unknown) {
      toast({
        title: "Google login failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    setStep("email");
  };

  const handleSendEmailOtp = async () => {
    const value = String(email || "")
      .trim()
      .toLowerCase();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!ok) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const origin = window.location.origin;
      const subdomain = window.location.hostname;
      const res = await sendWebsiteEmailOtp({
        email: value,
        origin,
        returnTo,
        subdomain,
      });
      if ((res as any)?.success === false) {
        throw new Error((res as any)?.message || "Failed to send OTP");
      }
      setStep("emailOtp");
      toast({
        title: "OTP sent",
        description: "Check your email for the verification code.",
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to send OTP",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const storeVerifiedSession = (values) => {
    const { expiration } = values;
    const sessionData = {
      ...values,
      expiresAt: new Date(Date.now() + expiration).toISOString(),
    };
    const encryptedData = encryptData(sessionData);
    localStorage.setItem("chatSession", JSON.stringify(encryptedData));
    document.cookie = `chatSession=${JSON.stringify(
      encryptedData,
    )}; Secure; SameSite=Strict; max-age=${expiration / 1000}`;
  };

  const handleVerifyEmailOtp = async () => {
    const value = String(email || "")
      .trim()
      .toLowerCase();
    const code = String(otp || "").trim();
    if (!code) {
      toast({ title: "Enter OTP", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const origin = window.location.origin;
      const subdomain = window.location.hostname;
      const res = await verifyWebsiteEmailOtp({
        email: value,
        otp: code,
        origin,
        returnTo,
        subdomain,
      });
      if ((res as any)?.success === false) {
        throw new Error((res as any)?.message || "OTP verification failed");
      }
      if (!res?.token || !res?.customerId) {
        throw new Error("Login failed (missing token)");
      }
      setSession({
        token: res.token,
        customerId: res.customerId,
        email: res.customerData?.email || value,
        name: res.customerData?.name,
        image: res.customerData?.image,
        ...res.customerData,
        createdAt: Date.now(),
      });
      const sessionData = {
        customerId: res.customerId,
        hostname: window.location.hostname,
        expiration: 240 * 60 * 60 * 1000,
        ...res?.customerData,
      };
      storeVerifiedSession(sessionData);
      setCustomerToken(res.token);

      toast({ title: "Logged in", description: "You can checkout now." });
      navigate(returnTo);
    } catch (err: unknown) {
      toast({
        title: "OTP verification failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold leading-none">Login</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Continue to checkout
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-8">
        <div className="mx-auto max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-foreground">
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Login to save your address and complete your order faster.
            </p>
          </div>

          {step === "buttons" ? (
            <div className="space-y-3">
              <Button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="h-12 w-full rounded-full text-base font-bold"
              >
                <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full border border-primary-foreground/40 text-xs font-bold">
                  G
                </span>
                {loading ? "Opening Google…" : "Login with Google"}
              </Button>
              <Button
                onClick={handleEmailLogin}
                variant="outline"
                className="h-12 w-full rounded-full border-primary/40 text-base font-bold"
              >
                <Mail className="mr-2 h-4 w-4" />
                Login with Email
              </Button>
            </div>
          ) : step === "email" ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  We’ll send a one-time code to your email.
                </p>
              </div>
              <Button
                onClick={handleSendEmailOtp}
                disabled={loading}
                className="h-12 w-full rounded-full text-base font-bold"
              >
                {loading ? "Sending…" : "Send OTP"}
              </Button>
              <Button
                onClick={() => setStep("buttons")}
                variant="ghost"
                className="h-10 w-full rounded-full text-sm"
              >
                Back
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">OTP</label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="123456"
                  inputMode="numeric"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Sent to{" "}
                  {String(email || "")
                    .trim()
                    .toLowerCase()}
                </p>
              </div>
              <Button
                onClick={handleVerifyEmailOtp}
                disabled={loading}
                className="h-12 w-full rounded-full text-base font-bold"
              >
                {loading ? "Verifying…" : "Verify & Login"}
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleSendEmailOtp}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 rounded-full"
                >
                  Resend
                </Button>
                <Button
                  onClick={() => setStep("email")}
                  disabled={loading}
                  variant="ghost"
                  className="flex-1 rounded-full"
                >
                  Change email
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CheckoutLogin;
