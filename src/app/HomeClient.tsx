"use client";

import { ClientRoute } from "@/app/ClientRoute";
import Index from "@/views/pages/Index";
import { ServerMobileProvider } from "@/hooks/use-mobile";
import type { Product } from "@/data/catalog";
import type { BannerSlide } from "@/services/banners";
import type { Catalogue, CatalogueGroup, ProductBrand } from "@/services/catalogues";
import type { ScrollingBarItem } from "@/services/scrollingBar";

export type HomePageServerData = {
  catalogues: Catalogue[];
  catalogueGroups: CatalogueGroup[];
  brands: string[];
  featuredBrands: ProductBrand[];
  desktopBanners: BannerSlide[];
  mobileBanners: BannerSlide[];
  scrollingItems: ScrollingBarItem[];
  medicineSectionProducts: Product[];
  newestArrivals: Product[];
  offerProducts: Product[];
  riceSectionProducts: Product[];
  frozenSectionProducts: Product[];
};

export function HomeClient({
  initialIsMobile,
  homeData,
}: {
  initialIsMobile: boolean;
  homeData: HomePageServerData;
}) {
  return (
    <ServerMobileProvider initialIsMobile={initialIsMobile}>
      <ClientRoute>
        <Index homeData={homeData} />
      </ClientRoute>
    </ServerMobileProvider>
  );
}
