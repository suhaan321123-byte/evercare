import { ArrowRight, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import type { Catalogue } from "@/services/catalogues";

type MedicineCategoriesProps = {
  catalogues: Catalogue[];
};

const MedicineCategories = ({ catalogues }: MedicineCategoriesProps) => {
  const medicineCatalogue = catalogues.find((catalogue) =>
    /medicine|pharma|healthcare/i.test(
      `${catalogue.name} ${catalogue.route} ${catalogue.slug}`,
    ),
  );

  const categories = medicineCatalogue?.categories.slice(0, 9) ?? [];

  if (!medicineCatalogue || categories.length === 0) return null;

  const catalogueRoute =
    medicineCatalogue.route || medicineCatalogue.slug || medicineCatalogue.name;
  const viewAllPath = `/categories?category=${encodeURIComponent(catalogueRoute)}`;

  return (
    <section className="site-container px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mb-8 flex items-end justify-between gap-5">
        <div>
          <h2 className="text-xl font-black leading-tight text-[#173d28] sm:text-2xl">Everyday Ayurvedic care</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667563] sm:text-base">
            Explore trusted wellness essentials, thoughtfully organised for simpler everyday care.
          </p>
        </div>
        <Link to={viewAllPath} className="hidden items-center gap-2 text-sm font-extrabold text-[#4f8138] transition hover:text-[#315f2a] sm:inline-flex">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="w-full">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
          {categories.map((category) => {
            const params = new URLSearchParams({
              category: catalogueRoute,
              itemCategory: category._id || category.name,
            });

            return (
              <Link
                key={category._id}
                to={`/products?${params.toString()}`}
                className="group min-w-0 text-center transition-smooth hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden rounded-2xl border border-[#dce8d4] bg-white shadow-soft transition-smooth group-hover:border-[#8fba79] group-hover:shadow-card">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <ImagePlaceholder label={`${category.name} image unavailable`} />
                  )}
                </div>
                <span className="mt-2 block line-clamp-2 px-1 text-xs font-bold leading-snug text-[#314737] transition-colors group-hover:text-[#4f8138] xl:text-sm">
                  {category.name}
                </span>
              </Link>
            );
          })}

          <Link
            to={viewAllPath}
            className="group min-w-0 text-center transition-smooth hover:-translate-y-1"
            aria-label={`View all ${medicineCatalogue.name} categories`}
          >
            <div className="flex aspect-square items-center justify-center rounded-2xl border border-[#dce8d4] bg-[#eaf4e3] shadow-soft transition-smooth group-hover:border-[#8fba79] group-hover:shadow-card">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#4f8138] shadow-soft transition-transform duration-300 group-hover:scale-105">
                <LayoutGrid className="h-6 w-6" aria-hidden="true" />
              </span>
            </div>
            <span className="mt-2 block px-1 text-xs font-bold leading-snug text-[#314737] transition-colors group-hover:text-[#4f8138] xl:text-sm">
              View More
            </span>
          </Link>

        </div>

      </div>
    </section>
  );
};

export default MedicineCategories;
