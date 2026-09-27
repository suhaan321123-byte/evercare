import { buildPageMetadata } from "@/app/seo";
import { CheckoutLoginClient } from "./CheckoutLoginClient";

export const metadata = buildPageMetadata({
  title: "Checkout Login",
  description: "Log in to continue your EvercareMed checkout.",
  path: "/checkout-login",
  noIndex: true,
});

export default function CheckoutLoginPage() {
  return <CheckoutLoginClient />;
}
