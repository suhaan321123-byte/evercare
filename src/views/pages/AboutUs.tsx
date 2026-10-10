import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseMedical,
  Building2,
  CheckCircle2,
  ClipboardPlus,
  Globe2,
  HeartHandshake,
  HeartPulse,
  Hospital,
  Leaf,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const services = [
  { title: "Medical Tourism Assistance", icon: Globe2 },
  { title: "Ayurvedic Consultation & Wellness Programs", icon: Leaf },
  { title: "Preventive Health Check-up Coordination", icon: ClipboardPlus },
  { title: "Specialist Doctor Consultations", icon: Stethoscope },
  { title: "Hospital & Treatment Coordination", icon: Hospital },
  { title: "Second Medical Opinion", icon: CheckCircle2 },
  { title: "Health & Wellness Counseling", icon: MessageCircleHeart },
  { title: "Patient Care Management", icon: HeartHandshake },
  { title: "Online Healthcare Support", icon: BriefcaseMedical },
  { title: "Corporate Health & Wellness Solutions", icon: Building2 },
];

const directors = [
  {
    name: "Dr. Anjali",
    role: "Co-Founder & Director",
    initials: "DA",
    description:
      "With a passion for holistic healthcare and patient wellness, Dr. Anjali brings valuable clinical expertise and a commitment to delivering ethical, evidence-based care. Her vision is to make quality healthcare accessible while promoting preventive and integrative wellness.",
    icon: HeartPulse,
  },
  {
    name: "R. Catharine Pathia",
    role: "Co-Founder & Director",
    initials: "RC",
    description:
      "With extensive experience in sales, marketing, business development, and client relationship management, she oversees strategic partnerships, patient coordination, and organizational growth. Her focus is on creating seamless healthcare experiences and building trusted relationships with patients and healthcare providers.",
    icon: UsersRound,
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
          <div className="pointer-events-none absolute -left-28 top-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
          <div className="site-container grid items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-20">
            <div className="relative z-10 max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary shadow-sm">
                <HeartHandshake className="h-4 w-4" />
                Compassion. Trust. Excellence.
              </div>
              <h1 className="text-4xl font-extrabold leading-[1.08] text-foreground sm:text-5xl lg:text-6xl">
                Healthcare centred around <span className="text-primary">you</span>
              </h1>
              <div className="mt-6 max-w-2xl space-y-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                <p>
                  Evercare MedGroup was established with a vision to bridge the gap between patients and quality
                  healthcare services. We believe every individual deserves reliable medical care, transparent
                  guidance, and personalized support throughout their healthcare journey.
                </p>
                <p>
                  We partner with experienced healthcare professionals, hospitals, and wellness experts to deliver
                  ethical, patient-centred support with compassion and professionalism.
                </p>
              </div>
              <Button asChild size="lg" className="mt-8 rounded-full px-7 shadow-lg">
                <Link to="/contact">
                  Talk to our care team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-[0_24px_70px_-24px_rgba(21,90,49,0.35)]">
                <img
                  src="/aboutus.jpg"
                  alt="Evercare MedGroup supporting patients and families"
                  className="aspect-[5/4] h-full w-full object-cover"
                />
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-foreground">Trusted healthcare guidance</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">Personal support at every step</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="site-container px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Our purpose</p>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">Care with a clear purpose</h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-[#ECF7EF] p-7 shadow-soft sm:p-9">
              <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full border-[28px] border-primary/5" />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-md">
                <HeartPulse className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-2xl font-extrabold text-foreground">Our Mission</h3>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                To make quality healthcare accessible, affordable, and patient-focused by connecting people with
                trusted medical services, holistic wellness solutions, and compassionate care. We strive to improve
                lives through excellence, integrity, and innovation.
              </p>
            </article>
            <article className="relative overflow-hidden rounded-[1.75rem] border border-[#E8E1D3] bg-[#F8F5EE] p-7 shadow-soft sm:p-9">
              <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full border-[28px] border-secondary/10" />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-2xl font-extrabold text-foreground">Our Vision</h3>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                To become a trusted global healthcare partner, recognized for delivering comprehensive medical care,
                wellness solutions, and medical tourism services while maintaining the highest standards of ethics,
                quality, and patient satisfaction.
              </p>
            </article>
          </div>
        </section>

        <section className="bg-[#F8F5EE]">
          <div className="site-container px-4 py-14 sm:px-6 md:py-20 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">How we help</p>
              <h2 className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">Our Services</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Comprehensive medical, wellness, and care coordination services designed around each patient’s needs.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <article
                    key={service.title}
                    className="group rounded-2xl border border-[#E8E1D3] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-card"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-base font-extrabold leading-6 text-foreground">{service.title}</h3>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="site-container px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Meet our leadership</p>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">Our Directors</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Experienced leadership united by a commitment to ethical, accessible, and compassionate healthcare.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-2">
            {directors.map((director) => {
              const Icon = director.icon;
              return (
                <article key={director.name} className="rounded-[1.75rem] border border-border bg-card p-7 shadow-soft sm:p-8">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-white shadow-md">
                      {director.initials}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-foreground">{director.name}</h3>
                      <p className="mt-1 text-sm font-bold text-primary">{director.role}</p>
                    </div>
                    <div className="ml-auto hidden h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-6 text-sm leading-7 text-muted-foreground sm:text-base">{director.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-primary/15 bg-[#ECF7EF] px-6 py-5 text-center">
            <p className="font-semibold leading-7 text-foreground">
              Together, the leadership team is dedicated to building a healthcare organization founded on compassion,
              trust, transparency, and excellence.
            </p>
          </div>
        </section>

        <section className="border-y border-primary/10 bg-gradient-to-br from-[#0B5D32] via-primary to-[#14934D] text-white">
          <div className="site-container flex flex-col items-center px-4 py-14 text-center sm:px-6 md:py-16 lg:px-8">
            <HeartHandshake className="h-9 w-9 text-[#D7ED79]" />
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#D7ED79]">Here when you need us</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-extrabold md:text-4xl">
              Your health journey deserves trusted support.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 md:text-lg">
              Connect with Evercare MedGroup for personalized guidance across medical care, wellness, and treatment
              coordination.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full bg-white px-8 text-primary shadow-lg hover:bg-white/90">
              <Link to="/contact">
                Contact Us
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
