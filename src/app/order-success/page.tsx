import { buildPageMetadata } from "@/app/seo";
import { OrderSuccessClient } from "./OrderSuccessClient";

export const metadata = buildPageMetadata({
  title: "Order Success",
  description: "Your EvercareMed order has been placed successfully.",
  path: "/order-success",
  noIndex: true,
});

export default function OrderSuccessPage() {
  return <OrderSuccessClient />;
}
