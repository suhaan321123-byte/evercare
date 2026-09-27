"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getWebsiteCheckoutOrderDetails,
  initWebsiteCheckoutOrderPayment,
  verifyWebsiteCheckoutOrderPayment,
  type WebsiteCheckoutAddress,
  type WebsiteCheckoutItem,
  type WebsiteCheckoutOrder,
} from "@/lib/websitePaymentApi";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on?: (eventName: string, handler: (response: any) => void) => void;
    };
  }
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatCurrency(amount: unknown, currency = "INR") {
  const resolvedCurrency = String(currency || "INR")
    .trim()
    .toUpperCase();
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: resolvedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(toNumber(amount, 0));
  } catch {
    return `${resolvedCurrency} ${toNumber(amount, 0).toFixed(2)}`;
  }
}

function joinAddress(address?: WebsiteCheckoutAddress) {
  return [
    address?.addressLine1,
    address?.addressLine2,
    [address?.city, address?.state, address?.pincode]
      .filter(Boolean)
      .join(", "),
    address?.country,
  ]
    .filter(Boolean)
    .join("\n");
}

function hasWebsiteCheckoutAddressData(address?: WebsiteCheckoutAddress) {
  return Boolean(
    address?.fullName ||
    address?.phone ||
    address?.addressLine1 ||
    address?.addressLine2 ||
    address?.city ||
    address?.state ||
    address?.pincode ||
    address?.country,
  );
}

function getDeliveryModeLabel(order?: WebsiteCheckoutOrder) {
  if (order?.deliveryModeLabel) return order.deliveryModeLabel;
  if (order?.isExpressDelivery) return "Express Delivery";
  if (order?.deliveryMode === "store-pickup") return "Store Pickup";
  if (order?.deliveryMode === "billing-only") return "Billing Only";
  if (order?.deliveryMode === "shipping") return "Standard Delivery";
  if (order?.deliveryMode === "standard") return "Standard Delivery";
  return order?.source || "Website order";
}

function getItemPrice(item: WebsiteCheckoutItem) {
  const quantity = Math.max(1, toNumber(item.quantity, 1));
  const amount = toNumber(item.amount, 0);
  if (amount > 0) return amount;
  return toNumber(item.salePrice ?? item.rate ?? item.basePrice, 0) * quantity;
}

function getItemUnitPrice(item: WebsiteCheckoutItem) {
  const quantity = Math.max(1, toNumber(item.quantity, 1));
  return getItemPrice(item) / quantity;
}

function getInitials(text?: string) {
  return (
    String(text || "Item")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "IT"
  );
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Browser unavailable"));
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

function AddressCard({
  title,
  address,
}: {
  title: string;
  address?: WebsiteCheckoutAddress;
}) {
  if (!hasWebsiteCheckoutAddressData(address)) return null;

  return (
    <Card className="border-border/80 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-extrabold">
          <MapPin className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm leading-6 text-muted-foreground">
        <p className="font-normal text-foreground">
          {address?.fullName || "-"}
        </p>
        <p className="whitespace-pre-line">{joinAddress(address) || "-"}</p>
        {address?.phone ? (
          <p>{`${address.countryCode || ""} ${address.phone}`.trim()}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  currency,
  negative,
  hideWhenZero = true,
}: {
  label: string;
  value: unknown;
  currency: string;
  negative?: boolean;
  hideWhenZero?: boolean;
}) {
  const amount = Math.max(0, toNumber(value, 0));
  if (hideWhenZero && amount <= 0) return null;
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn("font-bold text-foreground", negative && "text-accent")}
      >
        {negative ? "- " : ""}
        {formatCurrency(amount, currency)}
      </span>
    </div>
  );
}

function OrderItem({
  item,
  currency,
}: {
  item: WebsiteCheckoutItem;
  currency: string;
}) {
  const title = item.description || item.name || "Order item";
  const quantity = Math.max(1, toNumber(item.quantity, 1));
  const imageUrl = String(
    item.imageUrl || item.image || item.thumbnail || item.productImage || "",
  ).trim();

  return (
    <div className="flex gap-3 px-4 py-5 sm:gap-4 sm:px-6">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 sm:h-16 sm:w-16">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-extrabold text-primary">
            {getInitials(title)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium leading-snug text-foreground sm:text-base">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Qty {quantity} {item.quantityUnit || "pcs"} ·{" "}
              {formatCurrency(getItemUnitPrice(item), currency)} each
            </p>
          </div>
          <p className="shrink-0 font-extrabold text-foreground">
            {formatCurrency(getItemPrice(item), currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WebsitePaymentCheckoutClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const verifyOnceRef = useRef(false);
  const [order, setOrder] = useState<WebsiteCheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError("");
    try {
      const response = await getWebsiteCheckoutOrderDetails(orderId);
      if (!response?.success) {
        throw new Error(response?.message || "Unable to load order details.");
      }
      setOrder(response.data || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load order details.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const stripeSessionId = searchParams.get("stripe_session_id") || "";
  const paymentAttemptId = searchParams.get("paymentAttemptId") || "";
  const paymentCancelled = searchParams.get("payment_cancelled") || "";

  const verifyStripePayment = useCallback(async () => {
    if (!stripeSessionId || !paymentAttemptId || verifyOnceRef.current) return;
    verifyOnceRef.current = true;
    setVerifying(true);
    setError("");
    try {
      const response = await verifyWebsiteCheckoutOrderPayment({
        stripe_session_id: stripeSessionId,
        paymentAttemptId,
      });
      if (!response?.success) {
        throw new Error(response?.message || "Payment verification failed.");
      }
      setSuccessMessage("Payment verified successfully.");
      await fetchOrder();
      router.replace(pathname);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment verification failed.",
      );
    } finally {
      setVerifying(false);
    }
  }, [fetchOrder, paymentAttemptId, pathname, router, stripeSessionId]);

  useEffect(() => {
    verifyStripePayment();
  }, [verifyStripePayment]);

  useEffect(() => {
    if (!paymentCancelled) return;
    setError("Payment was cancelled. You can try again when ready.");
    router.replace(pathname);
  }, [paymentCancelled, pathname, router]);

  const items = Array.isArray(order?.items) ? order.items : [];
  const hasAnyAddressData =
    hasWebsiteCheckoutAddressData(order?.billingAddress) ||
    hasWebsiteCheckoutAddressData(order?.deliveryAddress);
  const summary = order?.summary || {};
  const currency =
    order?.currency ||
    summary.currency ||
    order?.payment?.orderCurrency ||
    order?.payment?.currency ||
    "INR";
  const paymentCurrency = order?.payment?.currency || currency;
  const isPaid = Boolean(summary.isPaid);
  const amountDue = toNumber(summary.amountDue, 0);
  const canPay =
    !isPaid && Boolean(order?.payment?.gatewayAvailable) && amountDue > 0;

  const statusText = useMemo(() => {
    if (isPaid) return "Paid";
    if (!order?.payment?.gatewayAvailable) return "Payment unavailable";
    return "Payment pending";
  }, [isPaid, order?.payment?.gatewayAvailable]);

  const handlePayNow = async () => {
    if (!canPay || paying) return;
    setPaying(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await initWebsiteCheckoutOrderPayment({
        orderId,
        returnUrl: window.location.href.split("?")[0],
      });
      if (!response?.success) {
        throw new Error(response?.message || "Unable to start payment.");
      }

      const paymentData = response.data || {};
      if (paymentData.gateway === "stripe") {
        if (!paymentData.paymentUrl)
          throw new Error("Stripe payment URL missing.");
        window.location.href = paymentData.paymentUrl;
        return;
      }

      if (paymentData.gateway === "razorpay") {
        await loadRazorpayScript();
        const Razorpay = window.Razorpay;
        if (!Razorpay) throw new Error("Razorpay checkout unavailable.");

        const razorpay = new Razorpay({
          key: paymentData.keyId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          name: paymentData.businessName || "Order Payment",
          description: order?.title || order?.orderId || "Order payment",
          order_id: paymentData.order_id,
          prefill: {
            name: order?.client?.name || order?.billingAddress?.fullName || "",
            email: order?.client?.email || "",
            contact: order?.client?.phone || order?.billingAddress?.phone || "",
          },
          handler: async (razorpayResponse: Record<string, string>) => {
            setVerifying(true);
            try {
              const verifyResponse = await verifyWebsiteCheckoutOrderPayment({
                paymentAttemptId: paymentData.paymentAttemptId,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              });
              if (!verifyResponse?.success) {
                throw new Error(
                  verifyResponse?.message || "Payment verification failed.",
                );
              }
              setSuccessMessage("Payment completed successfully.");
              await fetchOrder();
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Payment verification failed.",
              );
            } finally {
              setVerifying(false);
              setPaying(false);
            }
          },
          modal: {
            ondismiss: () => setPaying(false),
          },
        });
        razorpay.open();
        return;
      }

      throw new Error("Unsupported payment gateway.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <Header hideSearch hideAccount hideCart />
        <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md border-border/80 p-8 text-center shadow-card">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" />
            <p className="mt-4 text-sm font-bold text-muted-foreground">
              Loading order details...
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-muted/20">
        <Header hideSearch hideAccount hideCart />
        <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
          <Card className="w-full max-w-lg border-destructive/30 p-8 text-center shadow-card">
            <ReceiptText className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-2xl font-extrabold text-foreground">
              Order not found
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error || "We could not find this order."}
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Header
        hideSearch
        hideAccount
        hideCart
        rightContent={
          <Badge
            variant={isPaid ? "default" : "secondary"}
            className="w-fit text-sm"
          >
            {statusText}
          </Badge>
        }
      />
      <main className="container mx-auto px-4 pb-28 pt-8 md:pb-8 lg:py-12">
        <div className="mb-3">
          <div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Complete your payment
            </h1>
          </div>
        </div>

        {(error || successMessage || verifying) && (
          <div
            className={cn(
              "mb-5 rounded-2xl border px-4 py-3 text-sm font-bold",
              error
                ? "border-destructive/25 bg-destructive/10 text-destructive"
                : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            {verifying ? "Verifying payment..." : error || successMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            {hasAnyAddressData ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AddressCard
                  title="Billing Address"
                  address={order.billingAddress}
                />
                <AddressCard
                  title="Delivery Address"
                  address={order.deliveryAddress}
                />
              </div>
            ) : null}

            <Card className="overflow-hidden border-border/80 shadow-card">
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-extrabold">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  Order items
                </CardTitle>
                <span className="text-sm font-semibold text-muted-foreground">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </CardHeader>
              <CardContent className="p-0">
                {items.length ? (
                  <div className="divide-y divide-border">
                    {items.map((item, index) => (
                      <OrderItem
                        key={`${item.itemId || item.description || "item"}-${index}`}
                        item={item}
                        currency={currency}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-sm text-muted-foreground">
                    No items found.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit border-border/80 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold">
                Order summary
              </CardTitle>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Order #{order.orderId || order._id}</p>
                <p>{getDeliveryModeLabel(order)}</p>
                {order.isExpressDelivery && order.expressDeliveryMessage ? (
                  <p className="text-primary">{order.expressDeliveryMessage}</p>
                ) : null}
                {order.zoneNote ? <p>{order.zoneNote}</p> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3 border-b border-border pb-5">
                <SummaryRow
                  label="Subtotal"
                  value={summary.subtotal}
                  currency={currency}
                  hideWhenZero={false}
                />
                <SummaryRow
                  label="Discount"
                  value={summary.discount}
                  currency={currency}
                  negative
                />
                <SummaryRow
                  label={`Coupon${summary.promotionCode ? ` (${summary.promotionCode})` : ""}`}
                  value={summary.promotionDiscount}
                  currency={currency}
                  negative
                />
                <SummaryRow
                  label="Tax"
                  value={summary.tax}
                  currency={currency}
                />
                {summary.shipping ? (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-bold text-foreground">
                      {toNumber(summary.shipping, 0) > 0
                        ? formatCurrency(summary.shipping, currency)
                        : "Free"}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                  <span className="font-extrabold text-foreground">Total</span>
                  <span className="text-2xl font-extrabold text-primary sm:text-3xl">
                    {formatCurrency(summary.total, currency)}
                  </span>
                </div>
                {!isPaid && toNumber(summary.paidAmount, 0) > 0 ? (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Amount due</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(amountDue, currency)}
                    </span>
                  </div>
                ) : null}
                {paymentCurrency !== currency ? (
                  <p className="rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Payment gateway currency: {paymentCurrency}
                  </p>
                ) : null}
              </div>

              {isPaid ? (
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  Payment completed
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handlePayNow}
                  disabled={!canPay || paying || verifying}
                  className="hidden h-12 w-full rounded-xl text-base font-extrabold md:flex"
                >
                  {paying || verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Pay {formatCurrency(amountDue, currency)} now
                </Button>
              )}

              {!order.payment?.gatewayAvailable && !isPaid ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                  Online payment gateway is not configured for this business.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-2 text-center text-xs font-semibold text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              256-bit SSL encrypted payment
            </p>
            <p className="flex items-center justify-center gap-2">
              <Package className="h-4 w-4" />
              Inclusive of applicable taxes
            </p>
          </div>
        </div>
      </main>
      {!isPaid ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-4 py-3 shadow-card backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Amount due
              </p>
              <p className="truncate text-lg font-extrabold text-primary">
                {formatCurrency(amountDue, currency)}
              </p>
            </div>
            <Button
              type="button"
              onClick={handlePayNow}
              disabled={!canPay || paying || verifying}
              className="h-12 min-w-36 rounded-xl text-base font-extrabold"
            >
              {paying || verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Pay now
            </Button>
          </div>
        </div>
      ) : null}
      <Footer />
    </div>
  );
}
