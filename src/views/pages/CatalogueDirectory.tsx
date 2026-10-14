import { ArrowLeft, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import MegaMenu from "@/components/MegaMenu";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Catalogue, ProductBrand } from "@/services/catalogues";

export type BrandDirectoryGroup = {
  catalogue: Catalogue;
  brands: ProductBrand[];
};

type CatalogueDirectoryProps =
  | {
      type: "brands";
      catalogues: Catalogue[];
      brandGroups: BrandDirectoryGroup[];
    }
  | {
      type: "categories";
      catalogues: Catalogue[];
      visibleCatalogues?: Catalogue[];
      brandGroups?: never;
    };

const getCatalogueRoute = (catalogue: Catalogue) =>
  catalogue.route || catalogue.slug || catalogue.name;

const getProductListingPath = (
  catalogue: Catalogue,
  key: "brand" | "itemCategory",
  value: string,
) => {
  const params = new URLSearchParams({
    category: getCatalogueRoute(catalogue),
    [key]: value,
  });

  return `/products?${params.toString()}`;
};

const getBrandMark = (brand: string) =>
  brand
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const CatalogueDirectory = (props: CatalogueDirectoryProps) => {
  const isMobile = useIsMobile();
  const isBrands = props.type === "brands";
  const title = isBrands ? "Medicine & wellness brands" : "Shop by category";
  const description = isBrands
    ? "Browse every official brand, organised by catalogue, and find its complete product range."
    : "Explore every product category, organised by catalogue, to quickly find what you need.";

  const categoryGroups = (props.type === "categories" && props.visibleCatalogues
    ? props.visibleCatalogues
    : props.catalogues)
    .map((catalogue) => ({ catalogue, categories: catalogue.categories }))
    .filter((group) => group.categories.length > 0);
  const groups = isBrands ? props.brandGroups : categoryGroups;

  return (
    <div className="min-h-screen bg-[#f8faf6] text-foreground">
      {isMobile ? (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link to="/" aria-label="Back to home">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-xl font-bold leading-none">{isBrands ? "Brands" : "Categories"}</span>
          </div>
        </header>
      ) : (
        <>
          <Header />
          <MegaMenu initialCatalogues={props.catalogues} />
        </>
      )}

      <main>
        <section className="relative overflow-hidden border-b border-[#dce8d4] bg-[linear-gradient(145deg,#edf6e8_0%,#f9fbf7_55%,#f4efe3_100%)]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[48px] border-primary/[0.06]" />
          <div className="site-container relative px-4 py-12 sm:px-6 md:py-16 lg:px-8">
            <h1 className="max-w-3xl text-3xl font-black tracking-[-0.03em] text-[#173d28] sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#667563] sm:text-base">
              {description}
            </p>
          </div>
        </section>

        <div className="site-container space-y-14 px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          {groups.map((group) => {
            const catalogue = group.catalogue;
            const items = "brands" in group ? group.brands : group.categories;

            return (
              <section key={catalogue._id} aria-labelledby={`catalogue-${catalogue._id}`}>
                <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#dce8d4] pb-4">
                  <div>
                    <h2 id={`catalogue-${catalogue._id}`} className="text-2xl font-black text-[#173d28]">
                      {catalogue.name}
                    </h2>
                  </div>
                  <Link
                    to={`/products?category=${encodeURIComponent(getCatalogueRoute(catalogue))}`}
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-primary hover:text-[#315f2a]"
                  >
                    View products <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className={`grid gap-4 ${isBrands ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"}`}>
                  {items.map((item) => {
                    const isBrandItem = "brands" in group;
                    const itemName = item.name;
                    const itemImage = item.image;
                    const href = getProductListingPath(
                      catalogue,
                      isBrandItem ? "brand" : "itemCategory",
                      isBrandItem ? itemName : item._id || itemName,
                    );

                    return (
                      <Link
                        key={item._id || itemName}
                        to={href}
                        className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dce8d4] bg-white p-3 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#8fba79] hover:shadow-card sm:p-4"
                      >
                        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f2f7ee] text-2xl font-black text-[#315f2a]">
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt={isBrandItem ? `${itemName} logo` : itemName}
                              className={`h-full w-full transition-transform duration-300 group-hover:scale-105 ${isBrandItem ? "object-contain p-3" : "object-cover"}`}
                              loading="lazy"
                            />
                          ) : isBrandItem ? (
                            getBrandMark(itemName)
                          ) : (
                            <ImagePlaceholder label={`${itemName} image unavailable`} />
                          )}
                        </div>
                        <span className="mt-3 line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-[#314737] group-hover:text-primary">
                          {itemName}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {groups.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#b8caae] bg-white px-6 py-16 text-center">
              <Package className="mx-auto h-10 w-10 text-[#769267]" />
              <h2 className="mt-4 text-xl font-black text-[#173d28]">Nothing to show yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">Please check back when catalogue information is available.</p>
            </div>
          )}
        </div>
      </main>

      <Footer premium />
    </div>
  );
};

export default CatalogueDirectory;
