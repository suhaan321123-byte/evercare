import { headers } from "next/headers";
import { HomeClient, type HomePageServerData } from "@/app/HomeClient";
import { getActiveBanners } from "@/services/banners";
import { buildPageMetadata } from "@/app/seo";
import { getPublishedScrollingBarItems } from "@/services/scrollingBar";
import {
  getCatalogues,
  getCatalogueGroups,
  getPagedCatalogueProducts,
  getPagedOfferProducts,
  getProductBrandsWithImages,
} from "@/services/catalogues";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Buy Ayurvedic Medicines & Wellness Products Online | EvercareMed",
  description:
    "Shop authentic Ayurvedic medicines, natural wellness products, therapy essentials, and healthcare equipment online at EvercareMed.",
  keywords: [
    "Ayurvedic medicines online",
    "buy Ayurvedic medicine online",
    "Ayurvedic wellness products",
    "Ayurvedic therapy equipment",
    "natural healthcare products",
    "herbal wellness products",
    "authentic Ayurvedic products",
    "Ayurveda store online",
    "EvercareMed",
  ],
  path: "/",
  absoluteTitle: true,
});

const MOBILE_USER_AGENT_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

const normalizeCatalogueName = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();

const findCatalogueByName = (
  catalogues: HomePageServerData["catalogues"],
  catalogueName: string,
) => {
  const normalizedName = normalizeCatalogueName(catalogueName);

  return catalogues.find((catalogue) =>
    [catalogue.name, catalogue.route, catalogue.slug].some((value) =>
      normalizeCatalogueName(value).includes(normalizedName),
    ),
  );
};

const getHomePageServerData = async (): Promise<HomePageServerData> => {
  const [
    catalogues,
    catalogueGroups,
    featuredBrands,
    desktopBanners,
    mobileBanners,
    scrollingItems,
  ] = await Promise.all([
    getCatalogues(),
    getCatalogueGroups(),
    getProductBrandsWithImages(),
    getActiveBanners("Desktop"),
    getActiveBanners("Mobile"),
    getPublishedScrollingBarItems(),
  ]);

  const riceCatalogue = findCatalogueByName(catalogues, "Rice & Rice Products");
  const frozenCatalogue = findCatalogueByName(catalogues, "Frozen Items");
  const medicineCatalogue = catalogues.find((catalogue) =>
    /medicine|pharma|healthcare/i.test(
      `${catalogue.name} ${catalogue.route} ${catalogue.slug}`,
    ),
  );

  const [
    newestPage,
    offersPage,
    ricePage,
    frozenPage,
    medicinePage,
  ] = await Promise.all([
    getPagedCatalogueProducts({
      page: 1,
      limit: 6,
      sortBy: "newest",
    }),
    getPagedOfferProducts({
      page: 1,
      limit: 6,
      sortBy: "newest",
    }),
    riceCatalogue?._id
      ? getPagedCatalogueProducts({
          catalogueId: riceCatalogue._id,
          page: 1,
          limit: 6,
        })
      : Promise.resolve({ products: [], pagination: { currentPage: 1, pageSize: 6, totalItems: 0, totalPages: 1, hasPrev: false, hasNext: false } }),
    frozenCatalogue?._id
      ? getPagedCatalogueProducts({
          catalogueId: frozenCatalogue._id,
          page: 1,
          limit: 6,
        })
      : Promise.resolve({ products: [], pagination: { currentPage: 1, pageSize: 6, totalItems: 0, totalPages: 1, hasPrev: false, hasNext: false } }),
    medicineCatalogue?._id
      ? getPagedCatalogueProducts({
          catalogueId: medicineCatalogue._id,
          page: 1,
          limit: 100,
        })
      : Promise.resolve({ products: [], pagination: { currentPage: 1, pageSize: 100, totalItems: 0, totalPages: 1, hasPrev: false, hasNext: false } }),
  ]);

  const medicineCategoryImages = new Map(
    medicinePage.products
      .filter((product) => product.categoryId && product.categoryImage)
      .map((product) => [product.categoryId as string, product.categoryImage as string]),
  );
  const cataloguesWithCategoryImages = catalogues.map((catalogue) =>
    catalogue._id === medicineCatalogue?._id
      ? {
          ...catalogue,
          categories: catalogue.categories.map((category) => ({
            ...category,
            image: category.image || medicineCategoryImages.get(category._id),
          })),
        }
      : catalogue,
  );

  return {
    catalogues: cataloguesWithCategoryImages,
    catalogueGroups,
    brands: featuredBrands.map((brand) => brand.name),
    featuredBrands,
    desktopBanners,
    mobileBanners,
    scrollingItems,
    medicineSectionProducts: medicinePage.products.slice(0, 6),
    newestArrivals: newestPage.products,
    offerProducts: offersPage.products,
    riceSectionProducts: ricePage.products,
    frozenSectionProducts: frozenPage.products,
  };
};

export default async function HomePage() {
  const headerList = headers();
  const userAgent = headerList.get("user-agent") || "";
  const initialIsMobile = MOBILE_USER_AGENT_REGEX.test(userAgent);
  let homeData: HomePageServerData = {
    catalogues: [],
    catalogueGroups: [],
    brands: [],
    featuredBrands: [],
    desktopBanners: [],
    mobileBanners: [],
    scrollingItems: [],
    medicineSectionProducts: [],
    newestArrivals: [],
    offerProducts: [],
    riceSectionProducts: [],
    frozenSectionProducts: [],
  };

  try {
    homeData = await getHomePageServerData();
  } catch (error) {
    console.error("Failed to fetch home page data", error);
  }
  
  console.log(homeData?.catalogues[0]?.categories[0], "catalogues")
  return <HomeClient initialIsMobile={initialIsMobile} homeData={homeData} />;
}
