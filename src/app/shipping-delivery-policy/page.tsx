import { buildPageMetadata } from "@/app/seo";
import { ShippingDeliveryPolicyClient } from "./ShippingDeliveryPolicyClient";

export const metadata = buildPageMetadata({
  title: "Shipping & Delivery Policy",
  description:
    "Learn how Evercare Med Group dispatches Ayurvedic medicines, postpartum-care products and medical equipment across serviceable locations in India.",
  path: "/shipping-delivery-policy",
});

export default function ShippingDeliveryPolicyPage() {
  return <ShippingDeliveryPolicyClient />;
}
