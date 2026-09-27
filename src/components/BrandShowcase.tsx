import { ArrowRight, Ellipsis } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProductBrand } from "@/services/catalogues";

type BrandShowcaseProps = {
  brands: ProductBrand[];
};

const brandStyles = [
  "from-[#E8F6F8] to-[#CBE9EE] text-[#087A96] border-[#A9D7DF]",
  "from-[#FFF2E9] to-[#F9D9C6] text-[#A14510] border-[#EEC2A8]",
  "from-[#F3F8DF] to-[#DFECB0] text-[#58721B] border-[#CDDF8A]",
  "from-[#F2EEFA] to-[#DED2F1] text-[#69499A] border-[#CDBBE6]",
  "from-[#FFF4D9] to-[#F9DF9D] text-[#966412] border-[#EBCF83]",
];

const getBrandMark = (brand: string) =>
  brand
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const BrandShowcase = ({ brands }: BrandShowcaseProps) => {
  const visibleBrands = brands.slice(0, 9);

  if (visibleBrands.length === 0) return null;

  return (
    <section className="site-container pb-2 pt-4 sm:pt-6" aria-label="Featured brands">
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-3">
        <div className="grid min-w-[920px] grid-cols-10 gap-4">
          {visibleBrands.map((brand, index) => {
            return (
              <Link
                key={brand._id}
                to={`/products?brand=${encodeURIComponent(brand.name)}`}
                className="group flex min-w-0 flex-col items-center gap-2 text-center"
                aria-label={`Shop ${brand.name}`}
              >
                <span
                  className={`flex aspect-square w-full max-w-[92px] items-center justify-center overflow-hidden rounded-full border-2 bg-gradient-to-br text-2xl font-black shadow-soft transition-smooth group-hover:-translate-y-1 group-hover:shadow-card ${brandStyles[index % brandStyles.length]}`}
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
            to="/products"
            className="group flex min-w-0 flex-col items-center gap-2 text-center"
            aria-label="View more brands"
          >
            <span className="flex aspect-square w-full max-w-[92px] items-center justify-center rounded-full border-2 border-dashed border-primary/45 bg-primary/5 text-primary shadow-soft transition-smooth group-hover:-translate-y-1 group-hover:border-primary group-hover:bg-primary/10 group-hover:shadow-card">
              <Ellipsis className="h-8 w-8" />
            </span>
            <span className="flex min-h-8 items-start gap-1 text-xs font-extrabold leading-4 text-primary">
              More <ArrowRight className="mt-0.5 h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrandShowcase;
