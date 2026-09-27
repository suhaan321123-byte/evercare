"use client";

import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export const carePackages = [
  {
    title: "Gentle Beginnings",
    duration: "7-day plan",
    price: "₹2,499",
    image: "/brands/banner_PRENATAL_CARE.jpg",
    imagePosition: "28% center",
    highlights: ["Initial wellness consultation", "Personalised food guidance", "Daily routine recommendations"],
  },
  {
    title: "Pregnancy Wellness",
    duration: "21-day plan",
    price: "₹5,999",
    image: "/brands/PRENATAL_CARE.jpg",
    imagePosition: "center",
    highlights: ["Trimester-based care guidance", "Nutrition and lifestyle planning", "Emotional wellness support"],
  },
  {
    title: "Postnatal Recovery",
    duration: "28-day plan",
    price: "₹8,999",
    image: "/brands/POSTNATAL_CARE.jpg",
    imagePosition: "center",
    highlights: ["Recovery-focused care plan", "Massage and herbal bath guidance", "Lactation and nourishment support"],
    featured: true,
  },
  {
    title: "Mother & Baby Complete",
    duration: "42-day plan",
    price: "₹12,999",
    image: "/brands/POSTNATAL_CARE.jpg",
    imagePosition: "72% center",
    highlights: ["Extended postnatal guidance", "Diet, rest and self-care planning", "Ongoing emotional support"],
  },
];

type CarePackagesProps = {
  onEnquire?: () => void;
  compactMobile?: boolean;
};

const CarePackages = ({ onEnquire, compactMobile = false }: CarePackagesProps) => (
  <section className="border-y border-[#eadfd5] bg-[#f8f2ec] py-16 lg:py-24">
    <div className="site-container px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#a34f5e]">Care packages</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#293327] sm:text-4xl">
            Choose support that fits your journey
          </h2>
          <p className="mt-5 text-base leading-8 text-[#62685d]">
            Thoughtfully structured plans for pregnancy, recovery, and the early weeks of motherhood.
          </p>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[#74796f] sm:text-right">
          Every plan can be adapted after your initial consultation.
        </p>
      </div>

      <div className={compactMobile ? "-mx-4 mt-10 flex snap-x gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4" : "mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4"}>
        {carePackages.map((carePackage) => (
          <article
            key={carePackage.title}
            className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_14px_40px_rgba(72,55,43,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(72,55,43,0.14)] ${
              compactMobile ? "w-[84vw] max-w-[340px] shrink-0 snap-start md:w-auto md:max-w-none" : ""
            } ${carePackage.featured ? "border-[#b6727d] ring-1 ring-[#b6727d]/20" : "border-[#e5d9cf]"}`}
          >
            <div className="relative h-52 overflow-hidden">
              <img
                src={carePackage.image}
                alt={`${carePackage.title} maternal care package`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                style={{ objectPosition: carePackage.imagePosition }}
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
              <span className="absolute bottom-4 left-4 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-xs font-extrabold text-[#556044] shadow-sm backdrop-blur">
                {carePackage.duration}
              </span>
              {carePackage.featured ? (
                <span className="absolute right-4 top-4 rounded-full bg-[#8f4653] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-sm">
                  Most popular
                </span>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col p-6">
              <h3 className="text-xl font-black leading-tight text-[#293327]">{carePackage.title}</h3>
              <ul className="mt-5 space-y-3">
                {carePackage.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5 text-sm leading-5 text-[#60675b]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#85954b]" strokeWidth={2.5} />
                    {highlight}
                  </li>
                ))}
              </ul>

              <div className="mt-auto border-t border-[#ece2da] pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#888d83]">Starting from</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-3xl font-black tracking-tight text-[#8f4653]">{carePackage.price}</p>
                  {onEnquire ? (
                    <button
                      type="button"
                      onClick={onEnquire}
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#eef1e5] px-4 py-2 text-xs font-extrabold text-[#56613e] transition hover:bg-[#dde5ca] focus:outline-none focus:ring-2 focus:ring-[#7f8f49] focus:ring-offset-2"
                    >
                      Enquire
                    </button>
                  ) : (
                    <Link
                      to="/prenatal-postnatal-care?questionnaire=open"
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#eef1e5] px-4 py-2 text-xs font-extrabold text-[#56613e] transition hover:bg-[#dde5ca] focus:outline-none focus:ring-2 focus:ring-[#7f8f49] focus:ring-offset-2"
                    >
                      Enquire
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default CarePackages;
