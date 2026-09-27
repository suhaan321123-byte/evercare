import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCatalogues, type Catalogue } from "@/services/catalogues";
import ImagePlaceholder from "./ImagePlaceholder";
import allCataloguesImage from "@/assets/indian_grocery_items_under_1mb.jpg";
import offersImage from "@/assets/indiverse offers.png";

const CatalogueCardSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
    <div className="mb-4 aspect-square overflow-hidden rounded-xl bg-muted">
      <div className="h-full w-full animate-pulse bg-gradient-to-r from-muted via-background to-muted" />
    </div>
    <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
  </div>
);

type PopularCategoriesProps = {
  initialCatalogues?: Catalogue[];
};

const PopularCategories = ({ initialCatalogues }: PopularCategoriesProps) => {
  const shouldFetch = initialCatalogues === undefined;
  const { data: fetchedCatalogues = [], isLoading } = useCatalogues(shouldFetch);
  const popularCatalogues = initialCatalogues ?? fetchedCatalogues;
  const loading = shouldFetch && isLoading;
  const allCataloguesImageSrc =
    typeof allCataloguesImage === "string" ? allCataloguesImage : allCataloguesImage.src;
  const offersImageSrc = typeof offersImage === "string" ? offersImage : offersImage.src;

  return (
    <section className="site-container py-10">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Popular Catalogues</h2>
        </div>
        <Button variant="ghost" className="hidden sm:flex group" asChild>
          <Link to="/products">
          Browse All <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-smooth" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-flow-col grid-rows-2 auto-cols-[minmax(140px,1fr)] gap-4 overflow-x-auto pb-2 lg:grid-flow-row lg:grid-cols-6 lg:auto-cols-auto lg:overflow-visible lg:pb-0">
        {loading &&
          Array.from({ length: 12 }).map((_, index) => (
            <CatalogueCardSkeleton key={`catalogue-card-skeleton-${index}`} />
          ))}

        {!loading && (
          <>
            <Link
              to="/products"
              className="group rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-card"
            >
              <div className="mb-4 aspect-square overflow-hidden rounded-xl bg-muted">
                <img
                  src={allCataloguesImageSrc}
                  alt="All catalogues"
                  className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                />
              </div>
              <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-smooth">
                All
              </h3>
            </Link>

            <Link
              to="/offers"
              className="group rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-card"
            >
              <div className="mb-4 aspect-square overflow-hidden rounded-xl bg-muted">
                <img
                  src={offersImageSrc}
                  alt="Offers"
                  className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                />
              </div>
              <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-smooth">
                Offers
              </h3>
            </Link>
          </>
        )}

        {!loading &&
          popularCatalogues.map((catalogue) => {
          const catalogueRoute = catalogue.route || catalogue.slug || catalogue.name;

          return (
            <Link
              key={catalogue._id}
              to={`/products?category=${encodeURIComponent(catalogueRoute)}`}
              className="group rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-card"
            >
              <div className="mb-4 aspect-square overflow-hidden rounded-xl bg-muted">
                {catalogue.image ? (
                  <img
                    src={catalogue.image}
                    alt={catalogue.name}
                    className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                  />
                ) : (
                  <ImagePlaceholder label={`${catalogue.name} image unavailable`} />
                )}
              </div>
              <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-smooth">
                {catalogue.name}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default PopularCategories;
