import { buildPageMetadata } from "@/app/seo";
import { AboutUsClient } from "./AboutUsClient";

export const metadata = buildPageMetadata({
  title: "About Us",
  description:
    "Discover Evercare Med Group's trusted Ayurvedic medicines, postpartum care services, and medical equipment for lifelong health and wellbeing.",
  path: "/about-us",
});

export default function AboutUsPage() {
  return <AboutUsClient />;
}
