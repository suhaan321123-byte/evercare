import { buildPageMetadata } from "@/app/seo";
import { EquipmentClient } from "./EquipmentClient";

export const metadata = buildPageMetadata({
  title: "Healthcare Equipment",
  description:
    "Browse EvercareMed healthcare equipment and filter products by equipment category, brand, price, and shipping.",
  path: "/equipment",
});

export default function EquipmentPage() {
  return <EquipmentClient />;
}
