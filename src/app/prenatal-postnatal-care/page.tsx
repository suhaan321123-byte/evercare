import { buildPageMetadata } from "@/app/seo";
import PrenatalPostnatalCare from "@/views/pages/PrenatalPostnatalCare";

export const metadata = buildPageMetadata({
  title: "Prenatal & Postnatal Care in Ayurveda",
  description:
    "Compassionate Ayurvedic prenatal and postnatal care, personalized nourishment, recovery guidance, and emotional wellness support from Evercare Med Group.",
  path: "/prenatal-postnatal-care",
});

export default function PrenatalPostnatalCarePage() {
  return <PrenatalPostnatalCare />;
}
