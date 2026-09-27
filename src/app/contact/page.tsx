import { buildPageMetadata } from "@/app/seo";
import { ContactClient } from "./ContactClient";

export const metadata = buildPageMetadata({
  title: "Contact Us",
  description:
    "Contact EvercareMed for Ayurvedic product orders, delivery support, store pickup details, and customer service.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactClient />;
}
