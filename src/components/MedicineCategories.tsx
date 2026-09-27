import { ArrowRight, Leaf, LayoutGrid, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import type { Catalogue } from "@/services/catalogues";

type MedicineCategoriesProps = {
  catalogues: Catalogue[];
  promotionalImage?: string;
};

const MedicineCategories = ({ catalogues, promotionalImage }: MedicineCategoriesProps) => {
  const medicineCatalogue = catalogues.find((catalogue) =>
    /medicine|pharma|healthcare/i.test(
      `${catalogue.name} ${catalogue.route} ${catalogue.slug}`,
    ),
  );

  const categories = medicineCatalogue?.categories.slice(0, 11) ?? [];

  if (!medicineCatalogue || categories.length === 0) return null;

  const catalogueRoute =
    medicineCatalogue.route || medicineCatalogue.slug || medicineCatalogue.name;
  const featureImage = promotionalImage || medicineCatalogue.image || categories[0]?.image;
  const viewAllPath = `/products?category=${encodeURIComponent(catalogueRoute)}`;

  return (
    <section className="site-container py-10">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6">
        <div className="grid grid-cols-6 gap-x-4 gap-y-5">
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
                <div className="aspect-square overflow-hidden rounded-2xl border border-[#29ABE2]/20 bg-white shadow-soft transition-smooth group-hover:border-[#29ABE2]/50 group-hover:shadow-card">
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
                <span className="mt-2 block line-clamp-2 px-1 text-xs font-bold leading-snug text-foreground transition-colors group-hover:text-[#29ABE2] xl:text-sm">
                  {category.name}
                </span>
              </Link>
            );
          })}

          <Link
            to={viewAllPath}
            className="group flex aspect-square min-w-0 flex-col items-center justify-center rounded-2xl border border-[#29ABE2]/25 bg-[#E4F8E5] px-3 text-center shadow-soft transition-smooth hover:-translate-y-1 hover:border-[#29ABE2]/60 hover:shadow-card"
          >
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#29ABE2] shadow-soft transition-transform group-hover:scale-105 xl:h-14 xl:w-14">
              <LayoutGrid className="h-6 w-6 xl:h-7 xl:w-7" aria-hidden="true" />
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-[#29ABE2] xl:text-sm">
              View More
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </div>

        <Link
          to={viewAllPath}
          aria-label={`Shop all ${medicineCatalogue.name}`}
          className="group relative min-h-full overflow-hidden rounded-2xl border border-[#B7D8B2] bg-[#DFF0DC] shadow-soft"
        >
          {featureImage ? (
            <img
              src={featureImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center opacity-20 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <ImagePlaceholder label={`${medicineCatalogue.name} image unavailable`} />
          )}

          <span className="absolute inset-0 bg-gradient-to-r from-[#E8F5E5] via-[#DDEFD9]/95 to-[#CBE6C6]/70" />
          <MapPin
            className="absolute right-4 top-[42%] h-9 w-9 text-[#527A4A]/20"
            aria-hidden="true"
          />

          <span className="absolute inset-0 z-10 flex flex-col items-start p-5 xl:p-7">
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#B7D8B2] bg-white/75 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#477140] backdrop-blur-sm xl:px-4 xl:text-xs">
              <Leaf className="h-4 w-4 fill-current" aria-hidden="true" />
              Ayurvedic Care
            </span>

            <span className="mt-5 max-w-[24rem] text-[clamp(1.35rem,2.15vw,2.25rem)] font-extrabold leading-[1.05] tracking-tight text-[#264D2D]">
              Ayurvedic Medicines Delivered to Your Doorstep
            </span>

            <span className="mt-4 max-w-[22rem] text-xs font-medium leading-relaxed text-[#4F6F53] xl:text-base">
              Authentic Ayurvedic products for your health and wellness, now at your convenience.
            </span>

            <span className="mt-auto inline-flex items-center gap-3 rounded-full bg-[#4F7D57] px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors group-hover:bg-[#3F6848] xl:px-7 xl:text-base">
              Shop Now
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
};

export default MedicineCategories;
