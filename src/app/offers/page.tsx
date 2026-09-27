import { buildPageMetadata } from "@/app/seo";
import { OffersClient } from "./OffersClient";

export const metadata = buildPageMetadata({
  title: "Ayurvedic Medicine & Wellness Offers | EvercareMed",
  description:
    "Discover offers on Ayurvedic medicines, wellness products, therapy essentials, and healthcare equipment at EvercareMed.",
  keywords: [
    "Ayurvedic medicine offers",
    "Ayurvedic wellness discounts",
    "Ayurvedic products sale",
    "herbal medicine deals",
    "therapy equipment offers",
    "natural wellness offers",
    "EvercareMed offers",
  ],
  path: "/offers",
  absoluteTitle: true,
});

export default function OffersPage() {
  return <OffersClient />;
}
