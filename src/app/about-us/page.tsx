import { buildPageMetadata } from "@/app/seo";
import { AboutUsClient } from "./AboutUsClient";

export const metadata = buildPageMetadata({
  title: "About Us",
  description:
    "Learn about Evercare MedGroup, our mission, healthcare and wellness services, and our commitment to ethical, patient-centred care.",
  path: "/about-us",
});

export default function AboutUsPage() {
  return <AboutUsClient />;
}
