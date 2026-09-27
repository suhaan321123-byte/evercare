"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  Baby,
  Check,
  Heart,
  HeartHandshake,
  Leaf,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import CarePackages from "@/components/CarePackages";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const prenatalSupport = [
  "Nutritional support for the growing baby",
  "Maternal health and well-being guidance",
  "Healthy lifestyle and dietary habits during pregnancy",
  "Strength and vitality in preparation for childbirth and breastfeeding",
  "Guidance for pregnancy-related concerns, where appropriate",
];

const postnatalSupport = [
  "Ayurvedic oil massage",
  "Post-massage herbal bath guidance",
  "Nourishing and easily digestible Ayurvedic meals",
  "Personalized dietary recommendations",
  "Lifestyle, rest, and self-care guidance",
  "Ayurvedic herbal formulations, where appropriate",
  "Supportive guidance for recovery, breastfeeding, and lactation",
];

const emotionalSupport = [
  {
    title: "Prenatal counselling",
    copy: "Guidance and emotional preparation throughout pregnancy and for the transition to motherhood.",
  },
  {
    title: "Emotional wellness",
    copy: "Support for stress management, emotional balance, self-care, and adjustment before and after childbirth.",
  },
  {
    title: "Postpartum depression support",
    copy: "Compassionate support for mood changes, anxiety, excessive stress, or sleep-related emotional concerns.",
  },
  {
    title: "Family & motherhood adjustment",
    copy: "Guidance for new responsibilities, breastfeeding challenges, lifestyle changes, and caring for a newborn.",
  },
];

const RadioQuestion = ({
  number,
  label,
  options,
  other,
}: {
  number: number;
  label: string;
  options: string[];
  other?: boolean;
}) => (
  <fieldset className="rounded-2xl border border-[#eadfd7] bg-white p-5 sm:p-6">
    <legend className="w-full text-base font-bold leading-6 text-[#3c4235]">
      <span className="mr-2 text-[#a34f5e]">{number}.</span>
      {label}
    </legend>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#eee4dd] bg-[#fffdfb] px-4 py-3 text-sm text-[#5b6253] transition hover:border-[#d9aeb5] hover:bg-[#fff8f7]"
        >
          <input
            type="radio"
            name={`question-${number}`}
            value={option}
            className="h-4 w-4 accent-[#a34f5e]"
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
    {other ? (
      <input
        type="text"
        name={`question-${number}-details`}
        aria-label={`${label} details`}
        placeholder="Please add details"
        className="mt-3 h-11 w-full rounded-xl border border-[#e4d6ce] bg-white px-4 text-sm outline-none transition placeholder:text-[#9b9c95] focus:border-[#a34f5e] focus:ring-2 focus:ring-[#a34f5e]/15"
      />
    ) : null}
  </fieldset>
);

const CheckboxQuestion = ({
  number,
  label,
  options,
}: {
  number: number;
  label: string;
  options: string[];
}) => (
  <fieldset className="rounded-2xl border border-[#eadfd7] bg-white p-5 sm:p-6">
    <legend className="w-full text-base font-bold leading-6 text-[#3c4235]">
      <span className="mr-2 text-[#a34f5e]">{number}.</span>
      {label}
    </legend>
    <p className="mt-1 text-sm text-[#7b8075]">Select all that apply.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#eee4dd] bg-[#fffdfb] px-4 py-3 text-sm text-[#5b6253] transition hover:border-[#d9aeb5] hover:bg-[#fff8f7]"
        >
          <input type="checkbox" name="support-needs" value={option} className="h-4 w-4 rounded accent-[#a34f5e]" />
          <span>{option}</span>
        </label>
      ))}
    </div>
    <input
      type="text"
      name="support-needs-other"
      aria-label="Other support needs"
      placeholder="Other support you would like"
      className="mt-3 h-11 w-full rounded-xl border border-[#e4d6ce] bg-white px-4 text-sm outline-none transition placeholder:text-[#9b9c95] focus:border-[#a34f5e] focus:ring-2 focus:ring-[#a34f5e]/15"
    />
  </fieldset>
);

const SectionHeading = ({
  eyebrow,
  title,
  children,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  inverse?: boolean;
}) => (
  <div className="max-w-3xl">
    <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#a34f5e]">{eyebrow}</p>
    <h2 className={`mt-3 text-3xl font-black leading-tight sm:text-4xl ${inverse ? "text-white" : "text-[#293327]"}`}>{title}</h2>
    {children ? <div className="mt-5 text-base leading-8 text-[#62685d]">{children}</div> : null}
  </div>
);

const PrenatalPostnatalCare = () => {
  const isMobile = useIsMobile();
  const [submitted, setSubmitted] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("questionnaire") === "open") {
      setQuestionnaireOpen(true);
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    document.getElementById("questionnaire-status")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-[#fffdf9]">
      {isMobile ? (
        <header className="sticky top-0 z-50 border-b border-[#eadfd7] bg-[#fffdf9]/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link to="/" aria-label="Back to home">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#a34f5e]">Evercare Med Group</p>
              <p className="text-sm font-bold leading-none text-[#293327]">Mother & Baby Care</p>
            </div>
          </div>
        </header>
      ) : (
        <>
          <Header />
          <MegaMenu />
        </>
      )}

      <main>
        <section className="w-full">
          <div className="relative overflow-hidden border-y border-[#eadfd4] bg-[#f7efe8] shadow-[0_24px_70px_rgba(79,54,42,0.12)] lg:min-h-[620px]">
            <div className="relative h-[310px] overflow-hidden sm:h-[400px] lg:absolute lg:inset-0 lg:h-full">
              <img
                src="/brands/banner_PRENATAL_CARE.jpg"
                alt="Expectant mother resting beside traditional Ayurvedic preparations"
                className="h-full w-full object-cover object-[28%_center] lg:object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#f7efe8] via-transparent to-transparent lg:bg-[linear-gradient(90deg,transparent_0%,transparent_43%,rgba(247,239,232,0.24)_57%,rgba(247,239,232,0.96)_75%,#f7efe8_100%)]" />
            </div>

            <div className="relative z-10 -mt-6 px-5 pb-7 sm:-mt-10 sm:px-9 sm:pb-10 lg:ml-auto lg:mr-[max(2rem,calc((100vw-1400px)/2))] lg:mt-0 lg:flex lg:min-h-[620px] lg:w-[min(52%,720px)] lg:items-center lg:px-12 lg:py-12 xl:px-16">
              <div className="w-full rounded-[1.5rem] border border-white/80 bg-[#fffaf6]/95 p-6 shadow-[0_18px_55px_rgba(91,61,47,0.13)] backdrop-blur-md sm:p-9 lg:bg-[#fffaf6]/88 lg:p-10">
                <h1 className="max-w-xl text-[2.6rem] font-black leading-[0.98] tracking-[-0.045em] text-[#293327] sm:text-6xl lg:text-[4rem] xl:text-[4.5rem]">
                  Care that grows <span className="text-[#a34f5e]">with you.</span>
                </h1>
                <p className="mt-5 max-w-lg text-base font-medium leading-7 text-[#5f665a] sm:text-lg sm:leading-8">
                  Personalised prenatal and postnatal support rooted in Ayurveda—for nourishment, recovery, and emotional well-being at every stage.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setQuestionnaireOpen(true)}
                    className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#8f4653] px-6 py-3 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(143,70,83,0.24)] transition hover:-translate-y-0.5 hover:bg-[#773945] focus:outline-none focus:ring-2 focus:ring-[#8f4653] focus:ring-offset-2"
                  >
                    Start your care questionnaire <ArrowDown className="h-4 w-4" />
                  </button>
                  <a
                    href="#care-approach"
                    className="inline-flex min-h-12 items-center justify-center rounded-full px-5 py-3 text-sm font-extrabold text-[#4f5b40] transition hover:bg-[#eef1e5]"
                  >
                    Explore our approach
                  </a>
                </div>

                <div className="mt-7 grid grid-cols-3 border-t border-[#e9ddd3] pt-5">
                  {["Personalised", "Compassionate", "Whole-person"].map((item) => (
                    <div key={item} className="flex flex-col items-center gap-2 border-r border-[#e9ddd3] px-1 text-center last:border-r-0 sm:flex-row sm:justify-center sm:px-3 sm:text-left">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8eddc] text-[#71813d]">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      <span className="text-[10px] font-bold leading-tight text-[#687063] sm:text-xs">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="care-approach" className="site-container scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
            <div>
              <SectionHeading eyebrow="A thoughtful beginning" title="Care for pregnancy, birth, and recovery">
                <p>
                  Pregnancy and childbirth are transformative experiences that call for thoughtful care, nourishment, and support. Ayurveda has traditionally placed great importance on women&apos;s health at every stage of life.
                </p>
                <p className="mt-4">
                  Through personalized dietary guidance, supportive routines, therapeutic practices, and emotional care, our approach promotes the well-being of both mother and baby throughout pregnancy, childbirth, and recovery.
                </p>
              </SectionHeading>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[{ icon: Leaf, label: "Personalized" }, { icon: Heart, label: "Compassionate" }, { icon: ShieldCheck, label: "Supportive" }].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-2xl border border-[#e8ded2] bg-white px-3 py-5 text-center shadow-[0_8px_30px_rgba(70,55,40,0.06)]">
                    <Icon className="mx-auto h-5 w-5 text-[#8c9a58]" />
                    <p className="mt-2 text-xs font-bold text-[#4f5748] sm:text-sm">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] bg-[#e8eee0] shadow-[0_20px_50px_rgba(61,73,48,0.14)]">
              <img
                src="/brands/PRENATAL_CARE.jpg"
                alt="Two expectant mothers walking together in a garden"
                className="aspect-[4/3] h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <CarePackages onEnquire={() => setQuestionnaireOpen(true)} />

        <section className="bg-[#f5eee7] py-16 lg:py-24">
          <div className="site-container grid gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <article className="rounded-[2rem] border border-[#ead8cf] bg-[#fffaf7] p-7 sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5d9d5] text-[#934957]">
                <Baby className="h-6 w-6" />
              </div>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#a34f5e]">During pregnancy</p>
              <h2 className="mt-2 text-3xl font-black text-[#293327]">Garbhini Paricharya</h2>
              <p className="mt-4 leading-7 text-[#666b61]">
                Traditional Ayurvedic prenatal care encompasses diet, lifestyle, suitable therapeutic practices, and guidance for emotional and mental well-being.
              </p>
              <ul className="mt-6 space-y-3">
                {prenatalSupport.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-[#50574d]">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#88984e]" /> {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[2rem] border border-[#dce4cf] bg-[#fbfdf7] p-7 sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5eccf] text-[#71813d]">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#71813d]">After childbirth</p>
              <h2 className="mt-2 text-3xl font-black text-[#293327]">Sutika Paricharya</h2>
              <p className="mt-4 leading-7 text-[#666b61]">
                The postnatal period is a time of healing, nourishment, and adjustment. Traditional care emphasizes warmth, rest, digestion, and rebuilding strength—especially during the first six weeks, or approximately 42 days.
              </p>
              <ul className="mt-6 space-y-3">
                {postnatalSupport.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-[#50574d]">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#88984e]" /> {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="site-container px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#f6e4df]">
              <img
                src="/brands/POSTNATAL_CARE.jpg"
                alt="Mother holding her sleeping newborn baby"
                className="aspect-square h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div>
              <SectionHeading eyebrow="Nourishment, recovery & self-care" title="Care that nurtures the mother, too">
                <p>
                  After delivery, mothers may experience fatigue, physical discomfort, emotional changes, and the demands of caring for a newborn. Adequate rest, warm and nourishing food, and appropriate support are essential.
                </p>
                <p className="mt-4">
                  Our Vaidyas offer individualized guidance designed to promote comfort, encourage gradual recovery, and help mothers feel supported as they adjust physically and emotionally.
                </p>
              </SectionHeading>
              <div className="mt-8 rounded-2xl border-l-4 border-[#a34f5e] bg-[#fff6f3] p-5 text-sm leading-6 text-[#6e5d58]">
                Care recommendations and duration vary according to individual circumstances, health history, and the advice of your maternity care professional.
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#313c31] py-16 text-white lg:py-24">
          <div className="site-container px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Emotional wellness support" title="A safe space for every feeling" inverse>
              <p className="text-white/70">
                Emotional care is an important part of maternal wellness. Our guidance supports confidence, resilience, relaxation, and adjustment throughout pregnancy and early motherhood.
              </p>
            </SectionHeading>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {emotionalSupport.map((item, index) => (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6c9c3] text-sm font-black text-[#68343e]">{index + 1}</span>
                  <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">{item.copy}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 max-w-4xl text-sm leading-6 text-white/60">
              If you are experiencing persistent sadness, severe anxiety, thoughts of harming yourself or your baby, or feel unsafe, please seek urgent help from a doctor or emergency service. Ayurvedic wellness support does not replace medical or mental-health care.
            </p>
          </div>
        </section>

        <Sheet open={questionnaireOpen} onOpenChange={setQuestionnaireOpen}>
          <SheetContent
            side="right"
            aria-describedby={undefined}
            className="w-full overflow-hidden border-l border-[#e1d4ca] bg-[#fff8f5] p-0 sm:max-w-2xl lg:max-w-3xl"
          >
            <div className="flex h-full flex-col">
              <SheetHeader className="shrink-0 border-b border-[#eadfd7] bg-[#fffaf7] px-6 py-6 pr-14 text-left sm:px-8">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f3ddd8] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8f4553]">
                  <Sparkles className="h-3.5 w-3.5" /> Personalized care begins here
                </span>
                <SheetTitle className="text-2xl font-black leading-tight text-[#293327] sm:text-3xl">
                  Prenatal / Pre-delivery Questionnaire
                </SheetTitle>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-7 sm:px-8 sm:py-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <section>
                  <h3 className="mb-4 text-xl font-black text-[#293327]">1. Basic information</h3>
                  <div className="grid gap-4 rounded-2xl border border-[#eadfd7] bg-white p-5 sm:grid-cols-2 sm:p-6">
                    {[
                      ["Full name", "name", "text"],
                      ["Age", "age", "number"],
                      ["Contact number", "contact", "tel"],
                      ["Height / weight", "height-weight", "text"],
                      ["Expected date of delivery", "due-date", "date"],
                    ].map(([label, name, type]) => (
                      <label key={name} className={name === "due-date" ? "sm:col-span-2" : ""}>
                        <span className="mb-2 block text-sm font-bold text-[#50574d]">{label}</span>
                        <input
                          type={type}
                          name={name}
                          className="h-11 w-full rounded-xl border border-[#e4d6ce] bg-[#fffdfb] px-4 text-sm outline-none transition focus:border-[#a34f5e] focus:ring-2 focus:ring-[#a34f5e]/15"
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xl font-black text-[#293327]">Pregnancy overview</h3>
                  <RadioQuestion number={2} label="Is this your first pregnancy?" options={["Yes", "No"]} />
                  <RadioQuestion number={3} label="How many months pregnant are you?" options={["Less than 6 months", "6–7 months", "7–8 months", "8–9 months", "9 months / near delivery"]} />
                  <RadioQuestion number={4} label="How has your pregnancy been overall?" options={["Very comfortable", "Mostly comfortable", "Some discomfort", "Difficult"]} />
                  <RadioQuestion number={5} label="Have you had any health problems or complications, or advice from a consultant?" options={["No", "Yes"]} other />
                  <RadioQuestion number={6} label="Are you taking medicines, supplements, Ayurvedic medicines, or herbal products?" options={["No", "Yes"]} other />
                </section>

                <section className="space-y-4">
                  <h3 className="text-xl font-black text-[#293327]">Current health</h3>
                  <RadioQuestion number={7} label="How is your appetite?" options={["Good", "Normal", "Reduced", "Very poor", "Changes frequently"]} />
                  <RadioQuestion number={8} label="How is your digestion?" options={["Good, no problems", "Gas or bloating", "Acidity / heartburn", "Indigestion", "Nausea / vomiting", "Other"]} other />
                  <RadioQuestion number={9} label="How are your bowel movements?" options={["Regular and comfortable", "Sometimes constipated", "Frequently constipated", "Loose stools", "Other"]} other />
                  <RadioQuestion number={10} label="How well are you sleeping?" options={["Sleeping well", "Sometimes disturbed", "Frequently disturbed", "Very poor sleep"]} />
                  <RadioQuestion number={11} label="How is your energy level during the day?" options={["Good", "Slightly tired", "Frequently tired", "Very weak / exhausted"]} />

                  <fieldset className="rounded-2xl border border-[#eadfd7] bg-white p-5 sm:p-6">
                    <legend className="w-full text-base font-bold leading-6 text-[#3c4235]"><span className="mr-2 text-[#a34f5e]">12.</span>Please upload your latest pregnancy or medical reports.</legend>
                    <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#dcc8bf] bg-[#fffaf7] px-4 py-8 text-center transition hover:border-[#a34f5e]">
                      <Upload className="h-6 w-6 text-[#a34f5e]" />
                      <span className="mt-3 text-sm font-bold text-[#50574d]">Choose report files</span>
                      <span className="mt-1 text-xs text-[#85897f]">PDF, JPG, or PNG</span>
                      <input type="file" name="medical-reports" accept=".pdf,.jpg,.jpeg,.png" multiple className="sr-only" />
                    </label>
                  </fieldset>

                  <RadioQuestion number={13} label="How old is your existing child?" options={["No previous child", "Less than 1 year", "1–2 years", "3–5 years", "More than 5 years"]} />
                  <RadioQuestion number={14} label="Do you smoke, use tobacco, or drink alcohol?" options={["No", "Yes"]} />
                  <RadioQuestion number={15} label="What type of food do you usually eat?" options={["Vegetarian", "Non-vegetarian", "Eggetarian"]} />
                  <RadioQuestion number={16} label="Do you have allergies to food or medicines?" options={["No", "Yes"]} other />
                  <RadioQuestion number={17} label="Are you experiencing pain or physical discomfort?" options={["No", "Back pain", "Leg / foot pain", "Pelvic discomfort", "Body / joint pain", "Other"]} other />
                  <RadioQuestion number={18} label="Do you have swelling of your feet, legs, hands, or face?" options={["No", "Mild", "Moderate", "Significant", "Not sure"]} />
                  <RadioQuestion number={19} label="How are you feeling emotionally during pregnancy?" options={["Calm and happy", "Occasionally worried", "Frequently worried or stressed", "Often sad or emotionally low"]} />
                </section>

                <section className="space-y-4">
                  <h3 className="text-xl font-black text-[#293327]">Preparing for delivery & postpartum care</h3>
                  <RadioQuestion number={20} label="Are you worried or anxious about childbirth?" options={["Not at all", "A little", "Moderately", "Very much"]} />
                  <RadioQuestion number={21} label="Are you doing pregnancy-safe exercise, walking, yoga, or breathing practices?" options={["Regularly", "Sometimes", "No", "Not advised by my doctor"]} />
                  <CheckboxQuestion number={22} label="What would you most like help with before delivery and after childbirth?" options={["Pregnancy diet", "Preparing for delivery", "Ayurvedic pregnancy care", "Stress and relaxation", "Sleep and rest", "Breastfeeding preparation", "Postpartum diet", "Ayurvedic postpartum care", "Recovery after delivery", "Baby care"]} />
                </section>

                <div className="rounded-2xl bg-[#313c31] p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
                  <div>
                    <p className="font-bold">Ready for a personalized conversation?</p>
                    <p className="mt-1 text-sm leading-6 text-white/65">Review your answers, then continue with the Evercare Med care team.</p>
                  </div>
                  <Button type="submit" className="mt-5 w-full rounded-full bg-[#f6c9c3] px-7 font-bold text-[#68343e] hover:bg-white sm:mt-0 sm:w-auto">
                    Review questionnaire
                  </Button>
                </div>

                <div id="questionnaire-status" aria-live="polite">
                  {submitted ? (
                    <div className="rounded-2xl border border-[#cdd9ba] bg-[#f4f8ea] p-5 text-sm leading-6 text-[#4e5d37]">
                      <p className="font-bold">Your questionnaire is ready for review.</p>
                      <p className="mt-1">No information has been sent yet. Please contact the Evercare Med care team to continue securely.</p>
                    </div>
                  ) : null}
                </div>
              </form>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <section className="bg-[#f3e5dc] py-12">
          <div className="site-container px-4 text-center sm:px-6 lg:px-8">
            <Heart className="mx-auto h-6 w-6 fill-[#a34f5e] text-[#a34f5e]" />
            <p className="mt-4 text-xl font-black text-[#384137] sm:text-2xl">Caring Beyond Treatment, Inspiring Lifelong Wellness.</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-[#8d665f]">Evercare Med Group</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrenatalPostnatalCare;
