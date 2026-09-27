import { buildPageMetadata } from "@/app/seo";
import { WebsitePaymentCheckoutClient } from "./WebsitePaymentCheckoutClient";

export const metadata = buildPageMetadata({
  title: "Pay Order",
  description: "Securely complete your order payment.",
  path: "/website-payment/checkout",
  noIndex: true,
});

export default function WebsitePaymentCheckoutPage({
  params,
}: {
  params: { id: string };
}) {
  return <WebsitePaymentCheckoutClient orderId={params.id} />;
}
