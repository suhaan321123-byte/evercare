import { buildPageMetadata } from "@/app/seo";
import AyurvedicTourism from "@/views/pages/AyurvedicTourism";

export const metadata = buildPageMetadata({
  title: "Ayurvedic Tourism & Wellness in Kerala",
  description: "Plan a personalised Ayurvedic wellness journey in Kerala with traditional therapies, yoga, nourishing food, peaceful stays and travel support.",
  path: "/ayurvedic-tourism",
});

export default function AyurvedicTourismPage() {
  return <AyurvedicTourism />;
}
