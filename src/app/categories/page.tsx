import { buildPageMetadata } from "@/app/seo";
import { getCatalogueProducts, getCatalogues } from "@/services/catalogues";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Categories",
  description: "Browse all EvercareMed product categories across medicines, wellness, and healthcare equipment.",
  path: "/categories",
});

const normalize = (value: string) => value.trim().toLowerCase();

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams?: { category?: string | string[] };
}) {
  const catalogues = await getCatalogues();
  const cataloguesWithImages = await Promise.all(
    catalogues.map(async (catalogue) => {
      const products = await getCatalogueProducts(catalogue._id);
      const categoryImages = new Map<string, string>();

      products.forEach((product) => {
        const image = product.categoryImage || product.image;

        if (!image) return;
        if (product.categoryId && !categoryImages.has(product.categoryId)) {
          categoryImages.set(product.categoryId, image);
        }
        if (product.category && !categoryImages.has(normalize(product.category))) {
          categoryImages.set(normalize(product.category), image);
        }
      });

      return {
        ...catalogue,
        categories: catalogue.categories.map((category) => ({
          ...category,
          image:
            category.image ||
            categoryImages.get(category._id) ||
            categoryImages.get(normalize(category.name)),
        })),
      };
    }),
  );
  const requestedCategory = Array.isArray(searchParams?.category)
    ? searchParams?.category[0]
    : searchParams?.category;
  const visibleCatalogues = requestedCategory
    ? cataloguesWithImages.filter((catalogue) =>
        [catalogue._id, catalogue.name, catalogue.route, catalogue.slug].some(
          (value) => normalize(value) === normalize(requestedCategory),
        ),
      )
    : cataloguesWithImages;

  return (
    <CategoriesClient
      catalogues={cataloguesWithImages}
      visibleCatalogues={visibleCatalogues}
    />
  );
}
