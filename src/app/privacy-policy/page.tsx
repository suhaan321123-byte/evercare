import { buildPageMetadata } from "@/app/seo";
import { PrivacyPolicyClient } from "./PrivacyPolicyClient";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "Learn how Evercare Med Group collects, uses, shares and protects customer, order, prescription and care-enquiry information.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
