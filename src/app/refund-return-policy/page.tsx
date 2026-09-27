import { buildPageMetadata } from "@/app/seo";
import { RefundReturnPolicyClient } from "./RefundReturnPolicyClient";

export const metadata = buildPageMetadata({
  title: "Refund & Return Policy",
  description:
    "Review Evercare Med Group return, replacement and refund rules for Ayurvedic medicines, postpartum care and medical equipment.",
  path: "/refund-return-policy",
});

export default function RefundReturnPolicyPage() {
  return <RefundReturnPolicyClient />;
}
