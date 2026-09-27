"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Check,
  ChevronDown,
  CircleCheckBig,
  Clock3,
  Compass,
  Flower2,
  HeartHandshake,
  Leaf,
  Map,
  Plane,
  Salad,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Users,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const benefits: { icon: LucideIcon; title: string; copy: string }[] = [
  { icon: Sparkles, title: "Relax & rejuvenate", copy: "Step away from busy routines and restore your energy in a peaceful setting." },
  { icon: HeartHandshake, title: "Personalised wellness", copy: "Programmes shaped around your goals, lifestyle and practitioner guidance." },
  { icon: Leaf, title: "Traditional therapies", copy: "Experience time-honoured Ayurvedic practices with professional supervision." },
  { icon: Flower2, title: "Mind & body balance", copy: "Bring together Ayurveda, yoga, meditation and mindful daily routines." },
  { icon: Salad, title: "Nourishing guidance", copy: "Explore practical approaches to food, sleep and habits for lasting wellbeing." },
  { icon: Compass, title: "A complete journey", copy: "Combine your wellness programme, stay, food and Kerala experiences." },
];

const programmes = [
  {
    eyebrow: "Reset & restore",
    title: "Rejuvenation & wellness",
    copy: "A gentle, restorative programme for travellers who want to unwind, refresh and focus on overall wellbeing.",
    image: "/brands/rejuvanation.jpg",
    alt: "Guest meditating beside a nourishing Ayurvedic meal",
    items: ["Ayurvedic consultation", "Traditional therapies", "Yoga and meditation", "Ayurvedic diet guidance"],
  },
  {
    eyebrow: "Deeply traditional",
    title: "Panchakarma wellness",
    copy: "A practitioner-led experience planned after individual assessment, with preparation, recommended procedures and aftercare.",
    image: "/brands/panchakarma_wellness_program.jpg",
    alt: "Traditional Ayurvedic herbs, oils and treatment preparations",
    items: ["Professional assessment", "Preparatory therapies", "Guided diet and rest", "Post-programme routine"],
  },
  {
    eyebrow: "Slow down",
    title: "Stress relief & relaxation",
    copy: "A calmer rhythm of massage, movement, breathing, nourishing meals and unhurried time to rest.",
    image: "/brands/ayurvedic_wellness.jpg",
    alt: "Woman meditating beside the Kerala backwaters at sunrise",
    items: ["Relaxation therapies", "Yoga and breathwork", "Healthy meals", "Rest and leisure"],
  },
];

const journeySteps = [
  ["01", "Tell us what you need", "Share your dates, preferred duration, wellness interests and stay preferences."],
  ["02", "Programme consultation", "We identify suitable options with the relevant wellness professionals."],
  ["03", "Your personal itinerary", "Review a proposed plan for your programme, stay and selected experiences."],
  ["04", "Prepare for travel", "We help coordinate programme information and practical travel arrangements."],
  ["05", "Arrive and begin", "Meet your practitioner and settle into your recommended wellness routine."],
  ["06", "Experience Kerala", "Add suitable nature, culture or leisure moments around your programme."],
  ["07", "Take wellness home", "Continue with any lifestyle and diet guidance provided by your practitioner."],
];

const durations = [
  { days: "3–5 days", title: "Short wellness escape", copy: "A peaceful introduction to Ayurvedic wellness and relaxation.", tone: "bg-[#f4ead2] text-[#75531f]" },
  { days: "7–14 days", title: "Rejuvenation journey", copy: "A more immersive blend of therapies, yoga, nutrition and rest.", tone: "bg-[#dfe9d4] text-[#37563a]" },
  { days: "14–28 days", title: "Extended programme", copy: "For longer, practitioner-recommended programmes where appropriate.", tone: "bg-[#d8e8df] text-[#27564a]" },
];

const faqs = [
  ["What is Ayurvedic tourism?", "It combines travel with an Ayurveda-focused wellness experience. A programme may include consultation, traditional therapies, yoga, meditation, dietary guidance, accommodation and selected leisure activities."],
  ["How long should I stay?", "It depends on your goals and programme. Introductory stays may last 3–5 days, while more comprehensive experiences often require 7–14 days or longer."],
  ["Can international travellers join?", "Yes. We can assist with pre-arrival coordination, accommodation, transfers, local transport and general travel planning, depending on the package."],
  ["Can my programme be personalised?", "Where available, programmes can be adapted to individual requirements and the recommendations of qualified Ayurvedic professionals."],
  ["Can couples or families travel together?", "Yes. Stays and itineraries can be planned for solo travellers, couples and families, subject to availability and programme requirements."],
  ["Can I combine Ayurveda with sightseeing?", "Yes. Where appropriate, sightseeing and leisure activities can be arranged before, after or during suitable periods of your stay."],
  ["Do I need an Ayurvedic consultation?", "A professional assessment is important for personalised therapies, Panchakarma and programmes intended to address specific health concerns."],
];

const partnerLogos = [
  { name: "Ayush Jyothi", src: "/brands/ayushjyothi.png" },
  { name: "Kottakkal", src: "/brands/kottakkal.png" },
  { name: "Nagarjuna", src: "/brands/nagarjuna.png" },
];

const SectionHeading = ({ eyebrow, title, copy, center = false, light = false }: { eyebrow: string; title: string; copy?: string; center?: boolean; light?: boolean }) => (
  <div className={`${center ? "mx-auto text-center" : ""} max-w-3xl`}>
    <p className={`text-xs font-black uppercase tracking-[0.24em] ${light ? "text-[#e7c982]" : "text-[#9a6b2f]"}`}>{eyebrow}</p>
    <h2 className={`mt-3 text-3xl font-black leading-[1.08] tracking-[-0.035em] sm:text-4xl lg:text-5xl ${light ? "text-white" : "text-[#173d32]"}`}>{title}</h2>
    {copy ? <p className={`mt-5 text-base leading-8 sm:text-lg ${light ? "text-white/70" : "text-[#627068]"}`}>{copy}</p> : null}
  </div>
);

const AyurvedicTourism = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen overflow-x-clip bg-[#fcfaf4] text-[#173d32]">
      {isMobile ? (
        <header className="sticky top-0 z-50 border-b border-[#e7dfcc] bg-[#fcfaf4]/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link to="/" aria-label="Back to home"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9a6b2f]">Evercare Med Group</p>
              <p className="text-sm font-bold leading-none">Ayurvedic Tourism</p>
            </div>
          </div>
        </header>
      ) : (
        <><Header /><MegaMenu /></>
      )}

      <main>
        <section className="relative isolate min-h-[660px] overflow-hidden bg-[#12362c] lg:min-h-[680px]">
          <img src="/brands/ayurvedic_tourisum.png.jpg" alt="Ayurvedic wellness therapy beside Kerala backwaters" className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-[58%_center]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,36,28,.99)_0%,rgba(7,36,28,.94)_32%,rgba(7,36,28,.7)_48%,rgba(7,36,28,.18)_76%,rgba(7,36,28,.08)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,29,23,.82)_0%,transparent_45%,rgba(5,29,23,.15)_100%)] lg:bg-[linear-gradient(0deg,rgba(5,29,23,.48)_0%,transparent_46%,rgba(5,29,23,.1)_100%)]" />
          <div className="absolute -left-48 top-1/2 h-[620px] w-[620px] -translate-y-1/2 rounded-full border border-white/[.06]" aria-hidden="true" />
          <div className="site-container relative z-10 flex min-h-[660px] items-end px-5 py-10 sm:px-8 sm:py-14 lg:min-h-[680px] lg:items-center lg:px-12">
            <div className="w-full max-w-[680px] rounded-[1.75rem] border border-white/10 bg-[#082c23]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,.2)] backdrop-blur-[3px] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#eed18c]/35 bg-[#f0d58d]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f2d795] backdrop-blur-md sm:text-xs">
                <Leaf className="h-4 w-4" /> Wellness, the Kerala way
              </span>
              <h1 className="mt-5 max-w-[650px] text-[2.85rem] font-black leading-[.98] tracking-[-0.05em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.2)] sm:text-6xl lg:mt-6 lg:text-[4.85rem]">
                Return to your<br className="hidden sm:block" /> <span className="text-[#e9ca7e]">natural rhythm.</span>
              </h1>
              <p className="mt-5 max-w-[590px] text-base font-medium leading-7 text-[rgba(255,255,255,0.86)] sm:text-lg sm:leading-8 lg:mt-6">
                Experience wellness through the timeless tradition of Ayurveda—where restorative therapies, mindful living, nourishing food and Kerala&apos;s peaceful landscapes come together.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/contact?service=ayurvedic-tourism" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e0b65e] px-7 py-3.5 text-sm font-black text-[#12362c] shadow-[0_14px_35px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5 hover:bg-[#edca7d] focus:outline-none focus:ring-2 focus:ring-[#f0d58d] focus:ring-offset-2 focus:ring-offset-[#12362c]">
                  Plan your wellness journey <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#experiences" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/[.12] px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-white/55 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#12362c]">Explore experiences <ChevronDown className="h-4 w-4" /></a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-5 text-xs font-bold text-[rgba(255,255,255,0.78)] sm:mt-8">
                {["Personalised planning", "Professional guidance", "Travel assistance"].map((item) => <span key={item} className="flex items-center gap-2"><CircleCheckBig className="h-4 w-4 shrink-0 text-[#e9ca7e]" />{item}</span>)}
              </div>
            </div>
          </div>
        </section>

        <section className="site-container px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_.9fr] lg:gap-20">
            <div>
              <SectionHeading eyebrow="Travel. Rejuvenate. Rediscover." title="More than a holiday" copy="Ayurvedic tourism creates space to step away from everyday routines and focus on physical and mental wellbeing. Evercare Med Group connects travellers with thoughtfully planned wellness experiences and supports the journey from first conversation to return home." />
              <blockquote className="mt-8 border-l-4 border-[#d4a958] pl-5 text-xl font-bold italic leading-8 text-[#35574d]">Caring Beyond Treatment — Inspiring Lifelong Wellness.</blockquote>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-[2rem] shadow-[0_24px_70px_rgba(27,56,44,.18)]"><img src="/brands/consultations (1).jpg" alt="Personal Ayurvedic consultation in Kerala" className="aspect-square h-full w-full object-cover" /></div>
              <div className="absolute -bottom-5 -left-4 max-w-[250px] rounded-2xl border border-white/60 bg-[#f2e7cc]/95 p-4 shadow-xl backdrop-blur sm:-left-8 sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a602b]">Your programme starts here</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#35574d]">A personal consultation helps shape an experience suited to you.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#edf1e7] py-16 lg:py-24">
          <div className="site-container px-5 sm:px-8 lg:px-12">
            <SectionHeading eyebrow="Why Ayurveda" title="Wellbeing, considered as a whole" copy="Traditional practices, restorative surroundings and personal guidance come together to support a calmer, more intentional way of living." center />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map(({ icon: Icon, title, copy }) => (
                <article key={title} className="rounded-[1.5rem] border border-[#dce4d5] bg-[#fbfcf8] p-6 shadow-[0_12px_35px_rgba(37,67,52,.06)] sm:p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dfe8d6] text-[#3b684e]"><Icon className="h-6 w-6" /></span>
                  <h3 className="mt-5 text-xl font-black">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#657069]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="experiences" className="site-container scroll-mt-28 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <SectionHeading eyebrow="Our wellness experiences" title="Choose the rhythm that feels right" copy="Every journey can be tailored to your interests, stay duration and the recommendations of qualified professionals." />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {programmes.map((programme) => (
              <article key={programme.title} className="group overflow-hidden rounded-[1.75rem] border border-[#e4ddca] bg-white shadow-[0_15px_45px_rgba(48,62,48,.08)]">
                <div className="overflow-hidden"><img src={programme.image} alt={programme.alt} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" /></div>
                <div className="p-6 sm:p-7">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b2f]">{programme.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-black">{programme.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#667069]">{programme.copy}</p>
                  <ul className="mt-5 grid gap-2 border-t border-[#eee8d9] pt-5">
                    {programme.items.map((item) => <li key={item} className="flex items-center gap-2 text-sm font-semibold text-[#496057]"><Check className="h-4 w-4 text-[#8b7138]" strokeWidth={3} />{item}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-[#dfd6be] bg-[#f8f2e4] p-5 text-sm leading-6 text-[#6e624c]">
            <strong className="text-[#594925]">Please note:</strong> Professional consultation is required before Panchakarma or other intensive Ayurvedic procedures.
          </div>
        </section>

        <section className="bg-[#173d32] py-16 text-white lg:py-24">
          <div className="site-container grid gap-12 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-12 lg:gap-20">
            <div className="relative">
              <img src="/brands/hospitality.jpg" alt="A warm welcome at an Ayurvedic resort in Kerala" className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl" loading="lazy" />
              <div className="absolute -bottom-5 right-4 rounded-2xl bg-[#d4a958] p-5 text-[#173d32] shadow-xl sm:right-[-1.5rem]">
                <Map className="h-6 w-6" /><p className="mt-2 max-w-[190px] text-sm font-black leading-5">Ayurveda, nature and Kerala hospitality in one seamless journey.</p>
              </div>
            </div>
            <div>
              <SectionHeading eyebrow="Where tradition meets nature" title="Experience Ayurveda in Kerala" light copy="Kerala's tropical landscapes, peaceful backwaters and long tradition of Ayurvedic practice offer a distinctive setting for a wellness-focused escape." />
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[{ icon: Waves, label: "Backwaters" }, { icon: SunMedium, label: "Beaches" }, { icon: Compass, label: "Hill country" }, { icon: Flower2, label: "Culture" }, { icon: Salad, label: "Kerala cuisine" }, { icon: BedDouble, label: "Peaceful stays" }].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><Icon className="h-5 w-5 text-[#e7c982]" /><p className="mt-3 text-sm font-bold">{label}</p></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="site-container px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
            <div>
              <SectionHeading eyebrow="Specialised experiences" title="Care for every season of life" copy="Wellness can look different for every traveller. We help you explore programmes designed around your stage of life, comfort and individual requirements." />
              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-[#e4ddca] bg-white p-6"><div className="flex gap-4"><Users className="mt-1 h-6 w-6 shrink-0 text-[#9a6b2f]" /><div><h3 className="text-xl font-black">Women&apos;s wellness retreat</h3><p className="mt-2 text-sm leading-6 text-[#667069]">Traditional wellness practices, relaxation therapies, yoga, nutrition and lifestyle support thoughtfully brought together.</p></div></div></div>
                <div className="rounded-2xl border border-[#e4ddca] bg-white p-6"><div className="flex gap-4"><HeartHandshake className="mt-1 h-6 w-6 shrink-0 text-[#9a6b2f]" /><div><h3 className="text-xl font-black">Postpartum wellness & recovery</h3><p className="mt-2 text-sm leading-6 text-[#667069]">A comfortable environment for rest, gentle therapies, nutritional guidance and mother-and-baby support, planned with qualified professionals.</p></div></div></div>
                <div className="rounded-2xl border border-[#e4ddca] bg-white p-6"><div className="flex gap-4"><Flower2 className="mt-1 h-6 w-6 shrink-0 text-[#9a6b2f]" /><div><h3 className="text-xl font-black">Yoga & meditation retreat</h3><p className="mt-2 text-sm leading-6 text-[#667069]">Guided movement, breathing, meditation and mindful routines, with beginner-friendly options available.</p></div></div></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src="/brands/banner_PRENATAL_CARE.jpg" alt="Supportive wellness care for motherhood" className="col-span-2 aspect-[16/8] w-full rounded-[1.75rem] object-cover object-center" loading="lazy" />
              <img src="/brands/ayurvedic_resorts.jpg" alt="Ayurvedic resort surrounded by greenery" className="aspect-square w-full rounded-[1.75rem] object-cover" loading="lazy" />
              <img src="/brands/ayurvedic_wellness.jpg" alt="Yoga and meditation by the Kerala backwaters" className="aspect-square w-full rounded-[1.75rem] object-cover" loading="lazy" />
            </div>
          </div>
        </section>

        <section className="bg-[#efe8d7] py-16 lg:py-24">
          <div className="site-container px-5 sm:px-8 lg:px-12">
            <SectionHeading eyebrow="From planning to home" title="Your complete journey" copy="A simple, supported path from your first enquiry to the daily wellness practices you bring home." center />
            <div className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {journeySteps.map(([number, title, copy], index) => (
                <article key={number} className={`rounded-2xl border border-[#ded4bd] bg-[#fcfaf4] p-6 ${index === 6 ? "lg:col-start-2" : ""}`}>
                  <span className="text-3xl font-black text-[#c29a4d]">{number}</span><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#687169]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="site-container px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <SectionHeading eyebrow="Choose your stay" title="Give wellbeing the time it needs" copy="Programme duration depends on your goals, professional recommendations and the selected experience." />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {durations.map((duration) => (
              <article key={duration.days} className="rounded-[1.5rem] border border-[#e4ddca] bg-white p-7">
                <span className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${duration.tone}`}><Clock3 className="mr-2 h-4 w-4" />{duration.days}</span>
                <h3 className="mt-5 text-2xl font-black">{duration.title}</h3><p className="mt-3 text-sm leading-6 text-[#667069]">{duration.copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 grid gap-6 overflow-hidden rounded-[2rem] bg-[#e6eee3] p-6 sm:p-8 lg:grid-cols-[1fr_.8fr] lg:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6d6b35]">Travelling from abroad?</p>
              <h3 className="mt-3 text-3xl font-black">We make the journey easier.</h3>
              <p className="mt-4 max-w-2xl leading-7 text-[#607068]">Depending on your package, assistance can include pre-arrival programme coordination, accommodation, airport transfers, local transport, customised itineraries and sightseeing.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Pre-arrival help", "Airport transfers", "Local transport", "Stay coordination"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-white/70 p-3 text-sm font-bold"><Plane className="h-4 w-4 shrink-0 text-[#44705b]" />{item}</div>)}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 lg:py-20">
          <div className="site-container px-5 sm:px-8 lg:px-12">
            <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-[#8b7a58]">Ayurvedic brands you may recognise</p>
            <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-4">
              {partnerLogos.map((logo) => <div key={logo.name} className="flex min-h-24 items-center justify-center rounded-2xl border border-[#ece7db] bg-[#fcfbf7] p-5"><img src={logo.src} alt={`${logo.name} logo`} className="max-h-12 max-w-full object-contain" loading="lazy" /></div>)}
            </div>
          </div>
        </section>

        <section className="site-container px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <SectionHeading eyebrow="Good to know" title="Frequently asked questions" copy="Helpful answers as you begin considering an Ayurveda-focused journey." />
            <div className="divide-y divide-[#e6dfce] border-y border-[#e6dfce]">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-black marker:hidden sm:text-lg">{question}<ChevronDown className="h-5 w-5 shrink-0 text-[#9a6b2f] transition group-open:rotate-180" /></summary>
                  <p className="max-w-2xl pb-5 pr-10 text-sm leading-7 text-[#667069]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="site-container px-5 pb-8 sm:px-8 lg:px-12">
          <div className="flex gap-4 rounded-2xl border border-[#e2d7bc] bg-[#f8f1e2] p-6 sm:p-8">
            <ShieldCheck className="mt-1 h-7 w-7 shrink-0 text-[#7b6737]" />
            <div><h2 className="text-lg font-black">Important health information</h2><p className="mt-2 text-sm leading-7 text-[#6c6659]">Ayurvedic tourism and wellness programmes do not replace necessary diagnosis, emergency care or treatment from qualified healthcare professionals. Professional assessment is particularly important if you are pregnant, postpartum, taking medication, living with a medical condition or considering intensive procedures such as Panchakarma.</p></div>
          </div>
        </section>

        <section className="site-container px-5 py-12 sm:px-8 lg:px-12 lg:py-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#173d32] px-6 py-14 text-center text-white sm:px-10 lg:py-20">
            <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border border-white/10" /><div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full border border-[#d4a958]/20" />
            <div className="relative mx-auto max-w-3xl"><Leaf className="mx-auto h-8 w-8 text-[#e7c982]" /><p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-[#e7c982]">Ayurveda. Nature. Culture. Wellness.</p><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Your journey to wellness starts here.</h2><p className="mx-auto mt-5 max-w-2xl leading-8 text-white/70">Tell us what kind of experience you&apos;re looking for. We&apos;ll help you explore suitable programmes and shape a journey around you.</p><Link to="/contact?service=ayurvedic-tourism" className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#d4a958] px-8 py-4 text-sm font-black text-[#173d32] transition hover:-translate-y-0.5 hover:bg-[#e6c273]">Enquire about wellness packages <ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AyurvedicTourism;
