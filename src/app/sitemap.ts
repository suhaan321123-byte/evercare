import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/seo";
const baseBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const staticRoutes = [
  "",
  "/products",
  "/offers",
  "/about-us",
  "/prenatal-postnatal-care",
  "/ayurvedic-tourism",
  "/contact",
  "/privacy-policy",
  "/terms-conditions",
  "/refund-return-policy",
  "/shipping-delivery-policy",
];

// Fetch from your new lightweight endpoint
async function getSitemapProducts() {
  try {
    const res = await fetch(
      `${baseBackendUrl}/business_website/get_catalogue_sitemap_products?hostname=${SITE_URL}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error("Failed to fetch sitemap products:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticPages = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: (route === "" || route === "/products" ? "weekly" : "yearly") as "weekly" | "yearly",
    priority: route === "" ? 1 : route === "/products" ? 0.9 : 0.7,
  }));

  const products = await getSitemapProducts();

  const productPages = products.map((product: { slug: string; updatedAt: string }) => ({
    url: `${SITE_URL}/product/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...productPages];
}

export const revalidate = 3600;
