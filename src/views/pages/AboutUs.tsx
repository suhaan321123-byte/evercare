import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Check,
  HeartHandshake,
  HeartPulse,
  Leaf,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const categories = [
  {
    title: "Ayurvedic Medicines",
    description:
      "Explore a range of Ayurvedic medicines and wellness products selected to support traditional and holistic approaches to health.",
    image: "/ayurvedic_medicines.jpg",
    imageAlt: "A selection of Ayurvedic medicines and wellness products",
    href: "/products?search=Ayurvedic%20Medicines",
    cta: "Shop medicines",
    icon: Leaf,
  },
  {
    title: "Postpartum Care",
    description:
      "Dedicated care solutions for new mothers, focusing on recovery, nourishment, strength and overall wellbeing after childbirth.",
    image: "/Beyond_Delivery.jpg",
    imageAlt: "A mother caring for her newborn baby",
    href: "/prenatal-postnatal-care",
    cta: "Explore care",
    icon: Baby,
  },
  {
    title: "Medical Equipment",
    description:
      "Essential medical equipment and healthcare products suitable for home care, monitoring, mobility, recovery and daily healthcare needs.",
    image: "/ayur_equipments.jpg",
    imageAlt: "Ayurvedic and healthcare equipment in a wellness room",
    href: "/products?search=Medical%20Equipment",
    cta: "Browse equipment",
    icon: Stethoscope,
  },
];

const benefits = [
  "Convenient online access to healthcare and wellness products",
  "Ayurvedic medicines and traditional wellness solutions",
  "Dedicated postpartum care support",
  "Medical equipment for home and personal healthcare",
  "Quality-focused products and services",
  "Personalised customer assistance",
  "Convenient ordering and delivery",
  "A holistic approach to healthcare and wellbeing",
];

const reasons = [
  {
    title: "Care You Can Trust",
    description:
      "We focus on providing dependable healthcare and wellness solutions with care and attention to every customer.",
    icon: ShieldCheck,
  },
  {
    title: "Holistic Approach",
    description:
      "We bring traditional wellness and practical healthcare solutions together under one platform.",
    icon: Sparkles,
  },
  {
    title: "Convenience",
    description:
      "From medicines to medical equipment and postpartum care, we make essential healthcare services easier to access.",
    icon: PackageCheck,
  },
  {
    title: "Personalised Support",
    description:
      "Every individual has different healthcare needs. Our approach focuses on understanding those needs and helping customers find appropriate solutions.",
    icon: UserRoundCheck,
  },
];

const AboutUs = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link to="/" aria-label="Back to home">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-xl font-bold leading-none">About Us</span>
          </div>
        </header>
      ) : (
        <>
          <Header />
          <MegaMenu />
        </>
      )}

      <main className="overflow-hidden">
        <section className="relative bg-[#F3FAF5]">
          <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="site-container grid items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-8 lg:py-20">
            <div className="relative z-10 max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary shadow-sm">
                <HeartHandshake className="h-4 w-4" />
                Healthcare with heart
              </div>
              <h1 className="text-4xl font-extrabold leading-[1.08] text-foreground sm:text-5xl lg:text-6xl">
                Welcome to <span className="text-primary">Evercare Med Group</span>
              </h1>
              <div className="mt-6 max-w-2xl space-y-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                <p>
                  At Evercare Med Group, we believe healthcare goes beyond treating an illness — it is about caring for
                  people at every stage of life.
                </p>
                <p>
                  We bring together Ayurvedic medicines, postpartum care services and medical equipment under one
                  trusted platform, making essential healthcare and wellness solutions more accessible and convenient.
                </p>
                <p>
                  With a focus on quality, care and personalised support, we strive to make your healthcare journey
                  simpler, safer and more comfortable.
                </p>
              </div>
              <p className="mt-7 border-l-4 border-secondary pl-4 text-lg font-extrabold italic text-foreground sm:text-xl">
                Caring Beyond Treatment – Inspiring Lifelong Wellness.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-[0_24px_70px_-24px_rgba(21,90,49,0.35)]">
                <img
                  src="/aboutus.jpg"
                  alt="Evercare Med Group supporting family wellness through every stage of life"
                  className="aspect-[5/4] h-full w-full object-cover"
                />
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <HeartPulse className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-foreground">One trusted healthcare platform</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">Wellness solutions for every stage of life</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="site-container px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">What we offer</p>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">Key Categories</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Thoughtfully selected products and services that support your health, recovery and everyday wellbeing.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <article
                  key={category.title}
                  className="group flex overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-card"
                >
                  <div className="flex w-full flex-col">
                    <div className="relative h-52 overflow-hidden bg-muted">
                      <img
                        src={category.image}
                        alt={category.imageAlt}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-primary shadow-md backdrop-blur">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-xl font-extrabold text-foreground">{category.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{category.description}</p>
                      <Link
                        to={category.href}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary/75"
                      >
                        {category.cta}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-[#F8F5EE]">
          <div className="site-container grid gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:px-8">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Designed around you</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
                Key Features &amp; Benefits
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
                Everything we offer is guided by one goal: making dependable healthcare and wellbeing support easier to
                access.
              </p>
              <div className="mt-7 flex items-center gap-3 text-sm font-bold text-foreground">
                <Truck className="h-5 w-5 text-primary" />
                Convenient ordering and delivery
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-xl border border-[#E8E1D3] bg-white p-4 shadow-sm">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <p className="text-sm font-semibold leading-6 text-foreground">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-container px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0B5D32] via-primary to-[#14934D] px-6 py-12 text-center text-white shadow-[0_24px_60px_-28px_rgba(20,120,62,0.7)] sm:px-10 md:py-16">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border-[40px] border-white/5" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full border-[40px] border-white/5" />
            <div className="relative mx-auto max-w-3xl">
              <HeartHandshake className="mx-auto h-9 w-9 text-[#D7ED79]" />
              <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#D7ED79]">Your Wellness, Our Care</p>
              <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Discover healthcare solutions designed around your needs.</h2>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button asChild size="lg" className="rounded-full bg-white text-primary hover:bg-white/90">
                  <Link to="/products?search=Ayurvedic%20Medicines">Shop Ayurvedic Medicines</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link to="/prenatal-postnatal-care">Explore Postpartum Care</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link to="/products?search=Medical%20Equipment">Browse Medical Equipment</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="site-container px-4 pb-14 sm:px-6 md:pb-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">The Evercare difference</p>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">Why Choose Evercare Med Group?</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason) => {
              const Icon = reason.icon;
              return (
                <article key={reason.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-foreground">{reason.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{reason.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-primary/10 bg-[#ECF7EF]">
          <div className="site-container flex flex-col items-center px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
            <ShoppingBag className="h-9 w-9 text-primary" />
            <h2 className="mt-5 text-3xl font-extrabold text-foreground md:text-4xl">Your Health. Your Wellness. Our Care.</h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
              Whether you are looking for Ayurvedic medicines, postpartum support or essential medical equipment,
              Evercare Med Group is here to make your healthcare journey more convenient.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full px-8 shadow-lg">
              <Link to="/products">
                Explore Our Services Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
