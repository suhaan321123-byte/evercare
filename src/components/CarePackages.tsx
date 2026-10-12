"use client";

import { Baby, Check, Crown, HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";

export const carePackages = [
  {
    title: "Essential Recovery",
    duration: "11 days",
    price: "₹38,000",
    description: "A gentle foundation for early postnatal rest, nourishment, and recovery.",
    image: "/brands/banner_PRENATAL_CARE.jpg",
    imagePosition: "28% center",
    motherCare: [
      "Patient consultation and counselling",
      "Daily postnatal care assessment",
      "Ayurvedic full-body oil massage – 7 sessions",
      "Head massage – 5 sessions",
      "Herbal body bath / Vethu Kuli – 10 sessions",
      "Kizhi / herbal poultice therapy – 3 sessions, if suitable",
      "Foot massage – 3 sessions",
      "Face massage – 3 sessions",
      "Face pack – 3 sessions",
      "Hair care – 2 sessions",
      "Abdominal support / binding – as advised",
      "Gentle herbal steam – as advised",
      "Diet and postnatal nutrition guidance",
      "Breastfeeding and lactation guidance",
      "Lifestyle guidance for wellness and emotional well-being",
    ],
    babyCare: [
      "Gentle baby oil massage",
      "Baby bath with an appropriate herbal preparation",
      "Newborn-care guidance",
      "Umbilical-care guidance",
      "Feeding and routine-care guidance for parents",
    ],
  },
  {
    title: "Complete Recovery",
    duration: "14 days",
    price: "₹49,000",
    description: "More time and hands-on support for a steady, well-guided recovery.",
    image: "/brands/PRENATAL_CARE.jpg",
    imagePosition: "center",
    motherCare: [
      "Patient consultation and counselling",
      "Full-body Ayurvedic oil massage – 10 sessions",
      "Head massage – 7 sessions",
      "Herbal body bath / Vethu Kuli – 13 sessions",
      "Foot massage – 7 sessions",
      "Face massage – 5 sessions",
      "Face pack – 5 sessions",
      "Hair care / herbal hair wash – 4 sessions",
      "Abdominal support / binding – as advised",
      "Kizhi / herbal poultice therapy – 5 sessions, if suitable",
      "Herbal steam – 1–2 sessions, if suitable",
      "Ayurvedic facial – 1 session",
      "Postnatal nutrition plan",
      "Lactation counselling",
      "Lifestyle guidance for wellness and emotional well-being",
    ],
    babyCare: [
      "Baby oil massage",
      "Baby bath",
      "Newborn hygiene guidance",
      "Feeding guidance",
      "Sleep and daily-care guidance",
      "Mother education for safe baby handling",
    ],
  },
  {
    title: "Signature Traditional Postnatal",
    duration: "21 days",
    price: "₹72,000",
    description: "Our flagship experience, with extended traditional care for mother and baby.",
    image: "/brands/POSTNATAL_CARE.jpg",
    imagePosition: "center",
    featured: true,
    motherCare: [
      "Patient consultation and counselling",
      "Regular doctor follow-up",
      "Ayurvedic full-body oil massage – 15 sessions",
      "Head massage – 10 sessions",
      "Herbal body bath / Vethu Kuli – 18 sessions",
      "Foot massage – 10 sessions",
      "Face massage – 7 sessions",
      "Face pack – 7 sessions",
      "Hair care / herbal hair wash – 5 sessions",
      "Abdominal support / binding – as advised",
      "Kizhi therapy – 7 sessions, if suitable",
      "Herbal steam – 2–3 sessions, if suitable",
      "Ayurvedic facial – 2 sessions",
      "Hair spa / scalp therapy – 1 session",
      "Relaxation therapy: Shirodhara – 5 sessions",
      "Personalized postnatal diet plan",
      "Lactation counselling",
      "Lifestyle guidance for wellness and emotional well-being",
    ],
    babyCare: [
      "Gentle baby oil massage",
      "Baby bath",
      "Newborn hygiene support",
      "Umbilical-care guidance",
      "Feeding support",
      "Baby-care education for parents",
      "Safe handling and bathing guidance",
      "Daily mother-and-baby wellness monitoring",
    ],
  },
];

type CarePackagesProps = {
  onEnquire?: () => void;
  compactMobile?: boolean;
};

const CareList = ({ items }: { items: string[] }) => (
  <ul className="mt-4 space-y-2.5">
    {items.map((item) => (
      <li key={item} className="flex gap-2.5 text-sm leading-6 text-[#60675b]">
        <Check className="mt-1 h-4 w-4 shrink-0 text-[#85954b]" strokeWidth={2.5} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const CarePackages = ({ onEnquire, compactMobile = false }: CarePackagesProps) => (
  <section
    id="wellness-packages"
    className={compactMobile ? "bg-transparent py-4" : "border-y border-[#dce8d4] bg-[#f1f7ec] py-16 lg:py-24"}
  >
    <div className={compactMobile ? "site-container px-0" : "site-container px-4 sm:px-6 lg:px-8"}>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#4f8138]">Mother &amp; Baby Wellness Packages</p>
        {!compactMobile ? (
          <>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#173d28] sm:text-4xl">
              Nurturing care for the early days of motherhood
            </h2>
            <p className="mt-5 text-base leading-8 text-[#667563]">
              An Ayurvedic journey for mother and newborn, combining traditional postnatal care,
              nourishing food, relaxation, and guided baby care.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm font-extrabold text-[#79505a]">
              {["11 days", "14 days", "21 days"].map((duration) => (
                <span key={duration} className="rounded-full border border-[#dfc9c3] bg-white px-4 py-2 shadow-sm">
                  {duration}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className={compactMobile ? "no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2" : "mt-12 grid items-start gap-6 lg:grid-cols-3"}>
        {carePackages.map((carePackage) => (
          <article
            key={carePackage.title}
            className={`relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_14px_40px_rgba(72,55,43,0.08)] ${
              compactMobile ? "w-[82vw] max-w-[340px] shrink-0 snap-start" : ""
            } ${carePackage.featured ? "border-[#8fba79] ring-1 ring-[#8fba79]/20" : "border-[#dce8d4]"}`}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={carePackage.image}
                alt={`${carePackage.title} mother and baby wellness package`}
                className="h-full w-full object-cover"
                style={{ objectPosition: carePackage.imagePosition }}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#273025]/75 via-transparent to-transparent" />
              <span className="absolute bottom-4 left-4 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#556044] shadow-sm backdrop-blur">
                {carePackage.duration}
              </span>
              {carePackage.featured ? (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#4f8138] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-sm">
                  <Crown className="h-3.5 w-3.5" /> Flagship
                </span>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#4f8138]">{carePackage.duration} package</p>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-[#173d28]">{carePackage.title}</h3>
                </div>
                <p className="shrink-0 text-xl font-black text-[#4f8138]">{carePackage.price}</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#74796f]">{carePackage.description}</p>

              <div className="mt-7 border-t border-[#ece2da] pt-6">
                <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-[#46503f]">
                  <HeartHandshake className="h-4 w-4 text-[#4f8138]" /> Mother care
                </h4>
                <CareList items={carePackage.motherCare} />
              </div>

              <div className="mt-7 border-t border-[#ece2da] pt-6">
                <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-[#46503f]">
                  <Baby className="h-4 w-4 text-[#638d4b]" /> Baby care
                </h4>
                <CareList items={carePackage.babyCare} />
              </div>

              <div className="mt-auto pt-8">
                {onEnquire ? (
                  <button
                    type="button"
                    onClick={onEnquire}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#4f8138] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#315f2a] focus:outline-none focus:ring-2 focus:ring-[#4f8138] focus:ring-offset-2"
                  >
                    Discuss this package
                  </button>
                ) : (
                  <Link
                    to="/prenatal-postnatal-care?questionnaire=open"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#4f8138] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#315f2a] focus:outline-none focus:ring-2 focus:ring-[#4f8138] focus:ring-offset-2"
                  >
                    Discuss this package
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!compactMobile ? (
        <div className="mx-auto mt-10 max-w-5xl rounded-2xl border border-[#dfcec3] bg-[#fffaf7] px-6 py-5 text-center text-sm leading-6 text-[#6e625b] shadow-sm">
          <strong className="text-[#4a5146]">Please note:</strong> All treatments and therapies may vary depending on the
          individual&apos;s health condition, body type, and specific needs. The final treatment plan will be decided after
          consultation and assessment by the doctor.
        </div>
      ) : null}
    </div>
  </section>
);

export default CarePackages;
