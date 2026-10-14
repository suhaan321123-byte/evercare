import { ArrowRight, Ellipsis } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProductBrand } from "@/services/catalogues";

type BrandShowcaseProps = {
  brands: ProductBrand[];
  variant?: "mobile" | "desktop";
  catalogueRoute?: string;
};

const brandStyles = [
  "from-[#fbfdf9] to-[#e4f0d9] text-[#315f2a] border-[#ccdfc1]",
  "from-[#f8fcf5] to-[#dcebd3] text-[#4f8138] border-[#c5dbb8]",
  "from-[#ffffff] to-[#edf5e7] text-[#527647] border-[#d7e6ce]",
  "from-[#f5faf1] to-[#dfeecf] text-[#3f6f35] border-[#c9ddbd]",
  "from-[#fbfdf9] to-[#e8f3e0] text-[#254f32] border-[#d2e3c8]",
];

const getBrandMark = (brand: string) =>
  brand
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const BrandShowcase = ({ brands, variant = "mobile", catalogueRoute }: BrandShowcaseProps) => {
  const visibleBrands = brands.slice(0, 5);
  const catalogueHref = catalogueRoute
    ? `/products?category=${encodeURIComponent(catalogueRoute)}`
    : "/products";
  const getBrandHref = (brandName: string) => {
    const params = new URLSearchParams();

    if (catalogueRoute) params.set("category", catalogueRoute);
    params.set("brand", brandName);

    return `/products?${params.toString()}`;
  };

  if (visibleBrands.length === 0) return null;

  if (variant === "desktop") {
    return (
      <section className="site-container px-6 py-16 lg:px-8 lg:py-20" aria-label="Medicine brands">
        <div>
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] xl:gap-16">
            <div>
              <div className="grid grid-cols-3 gap-5 xl:gap-6">
                {visibleBrands.map((brand, index) => (
                  <Link
                    key={brand._id}
                    to={getBrandHref(brand.name)}
                    className="group mx-auto flex w-full max-w-[132px] min-w-0 flex-col items-center text-center xl:max-w-[140px]"
                    aria-label={`Shop ${brand.name}`}
                  >
                    <span
                      className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border bg-gradient-to-br text-2xl font-black shadow-[0_12px_30px_-22px_rgba(57,44,37,.7)] transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-card ${brandStyles[index % brandStyles.length]}`}
                    >
                      {brand.image ? (
                        <img
                          src={brand.image}
                          alt={`${brand.name} logo`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        getBrandMark(brand.name)
                      )}
                    </span>
                    <span className="mt-3 line-clamp-2 min-h-10 text-xs font-extrabold leading-5 text-[#314737] transition-colors group-hover:text-[#4f8138] xl:text-sm">
                      {brand.name}
                    </span>
                  </Link>
                ))}
                <Link
                  to={catalogueHref}
                  className="group mx-auto flex w-full max-w-[132px] min-w-0 flex-col items-center text-center xl:max-w-[140px]"
                  aria-label="View more medicine brands"
                >
                  <span className="flex aspect-square w-full items-center justify-center rounded-full border-2 border-dashed border-[#7aaa61] bg-[#edf5e7] text-[#315f2a] shadow-[0_12px_30px_-22px_rgba(57,44,37,.7)] transition duration-300 group-hover:-translate-y-1.5 group-hover:border-[#4f8138] group-hover:bg-[#e4f0d9] group-hover:shadow-card">
                    <Ellipsis className="h-9 w-9" />
                  </span>
                  <span className="mt-3 inline-flex min-h-10 items-start gap-1 text-xs font-extrabold leading-5 text-[#315f2a] xl:text-sm">
                    View More <ArrowRight className="mt-0.5 h-4 w-4" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="relative isolate flex min-h-[430px] flex-col justify-center overflow-hidden rounded-[1.75rem] bg-[linear-gradient(145deg,#173d28_0%,#315f2a_100%)] px-9 py-12 text-white shadow-card xl:px-12">
              <span className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full border-[44px] border-white/[0.06]" />
              <span className="pointer-events-none absolute -bottom-16 -left-16 -z-10 h-48 w-48 rounded-full bg-[#b9d7a8]/10" />
              <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#cde5bd]">Trusted partners</p>
              <h2 className="max-w-sm text-4xl font-black leading-[1.08] tracking-[-0.04em] xl:text-[2.75rem]">
                Medicine brands selected with care
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
                Browse trusted medicine brands chosen for dependable quality, thoughtful formulations, and everyday wellness.
              </p>
              <Link
                to={catalogueHref}
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#244b2e] transition duration-300 hover:-translate-y-0.5 hover:bg-[#edf5e7]"
              >
                View all medicines <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="site-container px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10 lg:px-8 lg:pt-14" aria-label="Medicine brands">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-7">
        <div>
          <h2 className="text-xl font-black text-[#173d28] sm:text-2xl">Medicine brands</h2>
        </div>
        <Link to={catalogueHref} className="hidden items-center gap-2 text-sm font-extrabold text-[#4f8138] sm:inline-flex">
          Explore all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-1 sm:px-1 sm:pb-3">
        <div className="flex w-max items-start gap-2 sm:min-w-[1064px] sm:justify-between sm:gap-4">
          {visibleBrands.map((brand, index) => {
            return (
              <Link
                key={brand._id}
                to={getBrandHref(brand.name)}
                className="group flex w-[84px] shrink-0 flex-col items-center gap-2 text-center sm:w-[92px]"
                aria-label={`Shop ${brand.name}`}
              >
                <span
                  className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border bg-gradient-to-br text-2xl font-black shadow-soft transition-smooth group-hover:-translate-y-1 group-hover:shadow-card ${brandStyles[index % brandStyles.length]}`}
                >
                  {brand.image ? (
                    <img
                      src={brand.image}
                      alt={`${brand.name} logo`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    getBrandMark(brand.name)
                  )}
                </span>
                <span className="line-clamp-2 min-h-8 text-xs font-bold leading-4 text-foreground transition-colors group-hover:text-primary">
                  {brand.name}
                </span>
              </Link>
            );
          })}

          <Link
            to={catalogueHref}
            className="group flex w-[84px] shrink-0 flex-col items-center gap-2 text-center sm:w-[92px]"
            aria-label="View more medicine brands"
          >
            <span className="flex aspect-square w-full items-center justify-center rounded-full border-2 border-dashed border-primary/45 bg-primary/5 text-primary shadow-soft transition-smooth group-hover:-translate-y-1 group-hover:border-primary group-hover:bg-primary/10 group-hover:shadow-card">
              <Ellipsis className="h-8 w-8" />
            </span>
            <span className="flex min-h-8 items-start gap-1 text-xs font-extrabold leading-4 text-primary">
              View More <ArrowRight className="mt-0.5 h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrandShowcase;
