import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, MapPin, PackageCheck, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { money } from "@/lib/pricing";

type LastOrderItem = {
  itemId?: string;
  description?: string;
  quantity?: number;
  quantityUnit?: string;
  amount?: number;
  basePrice?: number;
  salePrice?: number;
  gstPercentage?: number;
  gstAmount?: number;
};

type LastOrder = {
  orderId?: string;
  paymentMethod?: "cod" | "online";
  finalAmount?: number;
  subtotal?: number;
  itemDiscount?: number;
  promotionDiscount?: number;
  totalDiscount?: number;
  taxAmount?: number;
  shippingCost?: number;
  name?: string;
  email?: string;
  deliveryType?: "delivery" | "pickup" | "billing-only";
  deliveryMode?: string;
  isExpressDelivery?: boolean;
  expressDeliveryMessage?: string;
  zoneNote?: string;
  billingAddressLine?: string;
  shippingAddressLine?: string;
  pickupDateTime?: string;
  couponCode?: string;
  itemCount?: number;
  items?: LastOrderItem[];
};

const STORAGE_KEY = "ecom:last_order:v1";

function safeParse(json: string | null): LastOrder | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as LastOrder;
  } catch {
    return null;
  }
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatDeliveryType(value?: LastOrder["deliveryType"]) {
  if (value === "pickup") return "Store pickup";
  if (value === "billing-only") return "Billing only";
  return "Delivery";
}

function formatDeliveryModeLabel(order?: LastOrder | null) {
  if (!order) return "";
  if (order.isExpressDelivery) return "Express Delivery";
  if (order.deliveryType === "pickup") return "Store pickup";
  if (order.deliveryType === "billing-only") return "Billing only";
  return "Standard Delivery";
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  negative,
  strong,
}: {
  label: string;
  value: number;
  negative?: boolean;
  strong?: boolean;
}) {
  if (!strong && value <= 0) return null;
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong ? "border-t border-border pt-3 text-base" : "text-sm"
      }`}
    >
      <span className={strong ? "font-extrabold" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={`font-bold ${
          strong
            ? "text-primary"
            : negative
              ? "text-green-600"
              : "text-foreground"
        }`}
      >
        {negative ? "-" : ""}
        {money(value)}
      </span>
    </div>
  );
}

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderIdFromQuery = params.get("orderId") || "";

  const order = useMemo(() => {
    const fromStorage =
      typeof window === "undefined"
        ? null
        : safeParse(window.sessionStorage.getItem(STORAGE_KEY));
    if (fromStorage?.orderId) return fromStorage;
    if (orderIdFromQuery) return { orderId: orderIdFromQuery } as LastOrder;
    return null;
  }, [orderIdFromQuery]);

  useEffect(() => {
    if (!order?.orderId) {
      navigate("/", { replace: true });
    }
  }, [order?.orderId, navigate]);

  if (!order?.orderId) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount =
    toNumber(order.itemCount, 0) ||
    items.reduce(
      (sum, item) => sum + Math.max(1, toNumber(item.quantity, 1)),
      0,
    );
  const paymentLabel =
    order.paymentMethod === "online"
      ? "Pay Now"
      : order.paymentMethod === "cod"
        ? "Cash on delivery"
        : "Payment";
  const subtotal =
    toNumber(order.subtotal, 0) ||
    items.reduce(
      (sum, item) =>
        sum +
        Math.max(toNumber(item.basePrice, 0), toNumber(item.salePrice, 0)) *
          Math.max(1, toNumber(item.quantity, 1)),
      0,
    );
  const itemDiscount = Math.max(0, toNumber(order.itemDiscount, 0));
  const couponDiscount = Math.max(0, toNumber(order.promotionDiscount, 0));
  const taxAmount = Math.max(0, toNumber(order.taxAmount, 0));
  const shippingCost = Math.max(0, toNumber(order.shippingCost, 0));
  const total =
    toNumber(order.finalAmount, 0) ||
    Math.max(
      0,
      subtotal - itemDiscount - couponDiscount + taxAmount + shippingCost,
    );

  return (
    <div className="min-h-screen bg-muted/20">
      <Header />
      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card className="overflow-hidden border-primary/20 shadow-card">
            <div className="bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary p-3 text-primary-foreground shadow-soft">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                      Order confirmed
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                      Thank you{order.name ? `, ${order.name}` : ""}!
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      Your order is placed successfully. Keep this page for your
                      order summary and delivery details.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 p-4 text-left shadow-soft lg:min-w-64">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-primary">
                    {money(total)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                      {order.orderId}
                    </Badge>
                    <Badge variant="secondary">{paymentLabel}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
            <div className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PackageCheck className="h-5 w-5 text-primary" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length ? (
                    <div className="space-y-4">
                      {items.map((item, index) => {
                        const qty = Math.max(1, toNumber(item.quantity, 1));
                        const base = toNumber(item.basePrice, 0);
                        const sale = toNumber(item.salePrice, base);
                        const lineSale = toNumber(item.amount, sale * qty);
                        const lineBase = Math.max(base, sale) * qty;
                        const hasDiscount = lineBase > lineSale;

                        return (
                          <div
                            key={`${item.itemId || item.description || "item"}-${index}`}
                            className="rounded-2xl border border-border bg-background/70 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="line-clamp-2 font-extrabold text-foreground">
                                  {item.description || "Item"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Qty {qty} {item.quantityUnit || "pcs"}
                                  {toNumber(item.gstPercentage, 0) > 0
                                    ? ` • Tax ${item.gstPercentage}%`
                                    : ""}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="font-extrabold text-foreground">
                                  {money(lineSale)}
                                </p>
                                {hasDiscount ? (
                                  <p className="text-sm font-semibold text-muted-foreground line-through">
                                    {money(lineBase)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {itemCount
                        ? `${itemCount} item(s) in this order.`
                        : "Order item details will be available from your account."}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    Customer & Fulfillment
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Customer" value={order.name} />
                  <InfoRow label="Email" value={order.email} />
                  <InfoRow
                    label="Delivery mode"
                    value={formatDeliveryType(order.deliveryType)}
                  />
                  <InfoRow
                    label="Shipping speed"
                    value={formatDeliveryModeLabel(order)}
                  />
                  <InfoRow
                    label="Express delivery note"
                    value={order.expressDeliveryMessage}
                  />
                  <InfoRow label="Delivery note" value={order.zoneNote} />
                  <InfoRow label="Pickup time" value={order.pickupDateTime} />
                  <InfoRow
                    label="Delivery address"
                    value={order.shippingAddressLine}
                  />
                  <InfoRow
                    label="Billing address"
                    value={order.billingAddressLine}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="shadow-card lg:sticky lg:top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ReceiptText className="h-5 w-5 text-primary" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SummaryRow label="Subtotal" value={subtotal} />
                  <SummaryRow label="Discount" value={itemDiscount} negative />
                  <SummaryRow
                    label={`Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                    value={couponDiscount}
                    negative
                  />
                  <SummaryRow label="Tax" value={taxAmount} />
                  <SummaryRow label="Shipping" value={shippingCost} />
                  <SummaryRow label="Total" value={total} strong />
                  <div className="pt-3 text-xs leading-5 text-muted-foreground">
                    {order.email
                      ? `Confirmation will be sent to ${order.email}.`
                      : "You can view this order from your account once it is synced."}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <Button asChild size="lg">
                  <Link to="/">Continue shopping</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    window.sessionStorage.removeItem(STORAGE_KEY);
                    navigate("/", { replace: true });
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
