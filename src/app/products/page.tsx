import { buildPageMetadata } from "@/app/seo";
import { ProductsClient } from "./ProductsClient";

export const metadata = buildPageMetadata({
  title: "Products",
  description:
    "Explore EvercareMed Ayurvedic medicines, natural wellness products, therapy essentials, and healthcare equipment.",
  path: "/products",
});

export default function ProductsPage() {
  return <ProductsClient />;
}
