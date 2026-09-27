import { buildPageMetadata } from "@/app/seo";
import { CheckoutClient } from "./CheckoutClient";

export const metadata = buildPageMetadata({
  title: "Checkout",
  description:
    "Securely complete your EvercareMed order with billing, delivery, and store pickup options.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutPage() {
  return <CheckoutClient />;
}
