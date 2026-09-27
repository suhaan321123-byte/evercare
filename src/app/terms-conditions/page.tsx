import { buildPageMetadata } from "@/app/seo";
import { TermsConditionsClient } from "./TermsConditionsClient";

export const metadata = buildPageMetadata({
  title: "Terms & Conditions",
  description:
    "Read the Evercare Med Group terms for Ayurvedic medicines, postpartum-care products, medical equipment, orders and website use.",
  path: "/terms-conditions",
});

export default function TermsConditionsPage() {
  return <TermsConditionsClient />;
}
