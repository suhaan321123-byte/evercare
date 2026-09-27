import type { HomePageServerData } from "@/app/HomeClient";
import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import HeroSlider from "@/components/HeroSlider";
import OfferBar from "@/components/OfferBar";
import MedicineCategories from "@/components/MedicineCategories";
import CareHighlights from "@/components/CareHighlights";
import ProductSection from "@/components/ProductSection";
import Footer from "@/components/Footer";
import MobileLayout from "@/components/MobileLayout";
import BrandShowcase from "@/components/BrandShowcase";
import CarePackages from "@/components/CarePackages";
import { useIsMobile } from "@/hooks/use-mobile";
import { sortOutOfStockLast } from "@/data/catalog";
import type { Catalogue } from "@/services/catalogues";

const normalizeCatalogueName = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();

const findCatalogueByName = (catalogues: Catalogue[], catalogueName: string) => {
  const normalizedName = normalizeCatalogueName(catalogueName);

  return catalogues.find((catalogue) =>
    [catalogue.name, catalogue.route, catalogue.slug].some((value) =>
      normalizeCatalogueName(value).includes(normalizedName)
    )
  );
};

const Index = ({ homeData }: { homeData: HomePageServerData }) => {
  const isMobile = useIsMobile();
  const catalogues = homeData.catalogues;
  const riceCatalogue = findCatalogueByName(catalogues, "Rice & Rice Products");
  const frozenCatalogue = findCatalogueByName(catalogues, "Frozen Items");
  const medicineCatalogue = catalogues.find((catalogue) =>
    /medicine|pharma|ayurveda/i.test(
      `${catalogue.name} ${catalogue.route} ${catalogue.slug}`,
    ),
  );
  const riceCatalogueRoute = riceCatalogue?.route || riceCatalogue?.slug || riceCatalogue?.name || "";
  const frozenCatalogueRoute = frozenCatalogue?.route || frozenCatalogue?.slug || frozenCatalogue?.name || "";
  const medicineCatalogueRoute = medicineCatalogue?.route || medicineCatalogue?.slug || medicineCatalogue?.name || "";
  const medicineSectionProducts = sortOutOfStockLast(homeData.medicineSectionProducts).slice(0, 6);
  const riceSectionProducts = sortOutOfStockLast(homeData.riceSectionProducts);
  const frozenSectionProducts = sortOutOfStockLast(homeData.frozenSectionProducts);
  const scrollingTexts = homeData.scrollingItems.map((item) => item.text);

  if (isMobile) return <MobileLayout homeData={homeData} />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MegaMenu
        initialCatalogues={homeData.catalogues}
        initialGroups={homeData.catalogueGroups}
        initialBrands={homeData.brands}
      />
      <main>

        <HeroSlider
          initialDesktopSlides={homeData.desktopBanners}
          initialMobileSlides={homeData.mobileBanners}
        />
        <OfferBar speed="slow" initialItems={scrollingTexts} />
        <MedicineCategories
          catalogues={homeData.catalogues}
          promotionalImage="/medicine_delivery%20(1).png"
        />
        <CareHighlights />
        <BrandShowcase brands={homeData.featuredBrands} />
        {medicineSectionProducts.length > 0 && (
          <ProductSection
            title="Medicines"
            products={medicineSectionProducts}
            accent="accent"
            loading={false}
            viewAllTo={medicineCatalogueRoute ? `/products?category=${encodeURIComponent(medicineCatalogueRoute)}` : "/products"}
            titleClassName="text-3xl font-black leading-tight text-[#293327] sm:text-4xl"
          />
        )}
        <CarePackages />
        {riceSectionProducts.length > 0 && (
          <ProductSection
            title="Ayurvedic Medicines"
            products={riceSectionProducts}
            accent="accent"
            loading={false}
            viewAllTo={riceCatalogueRoute ? `/products?category=${encodeURIComponent(riceCatalogueRoute)}` : "/products"}
          />
        )}
        {frozenSectionProducts.length > 0 && (
          <ProductSection
            title="Frozen Items"
            products={frozenSectionProducts}
            accent="secondary"
            loading={false}
            viewAllTo={frozenCatalogueRoute ? `/products?category=${encodeURIComponent(frozenCatalogueRoute)}` : "/products"}
          />
        )}
      </main>
      <Footer initialCatalogues={homeData.catalogues} />
    </div>
  );
};

export default Index;
