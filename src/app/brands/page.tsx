import { buildPageMetadata } from "@/app/seo";
import { getCatalogues, getProductBrandsWithImages } from "@/services/catalogues";
import { BrandsClient } from "./BrandsClient";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Brands",
  description: "Browse all official medicine, wellness, and healthcare brands available from EvercareMed.",
  path: "/brands",
});

const normalize = (value: string) => value.trim().toLowerCase();
const isEquipmentCatalogue = (value: string) =>
  /equipment|medical device/i.test(value);

export default async function BrandsPage({
  searchParams,
}: {
  searchParams?: { category?: string | string[] };
}) {
  const catalogues = await getCatalogues();
  const requestedCategory = Array.isArray(searchParams?.category)
    ? searchParams?.category[0]
    : searchParams?.category;
  const brandCatalogues = catalogues.filter(
    (catalogue) =>
      !isEquipmentCatalogue(
        `${catalogue.name} ${catalogue.route} ${catalogue.slug}`,
      ),
  );
  const selectedCatalogues = requestedCategory
    ? brandCatalogues.filter((catalogue) =>
        [catalogue._id, catalogue.name, catalogue.route, catalogue.slug].some(
          (value) => normalize(value) === normalize(requestedCategory),
        ),
      )
    : brandCatalogues;

  const brandGroups = (
    await Promise.all(
      selectedCatalogues.map(async (catalogue) => ({
        catalogue,
        brands: (await getProductBrandsWithImages(catalogue._id)).filter(
          (brand) => !brand.legacy,
        ),
      })),
    )
  ).filter((group) => group.brands.length > 0);

  return <BrandsClient catalogues={catalogues} brandGroups={brandGroups} />;
}
