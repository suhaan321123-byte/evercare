import { ArrowRight, Baby, HeartPulse, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

type CareHighlightsProps = {
  variant?: "all" | "maternal" | "home";
};

const CareHighlights = ({ variant = "all" }: CareHighlightsProps) => {

  return (
    <section className="site-container px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
      <div className={`grid gap-5 ${variant === "all" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {variant !== "home" ? (
        <article className="group relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[#cfe0c5] bg-[#f8fcf5] text-[#173d28] shadow-[0_18px_45px_rgba(28,66,39,0.1)]">
          <img
            src="/brands/care.png"
            alt="A mother gently holding her sleeping newborn baby"
            className="absolute inset-0 h-full w-full object-cover object-right transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(248,252,245,0.99)_0%,rgba(248,252,245,0.95)_34%,rgba(238,247,232,0.72)_50%,rgba(238,247,232,0.12)_72%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -bottom-40 left-[25%] h-80 w-80 rounded-full border border-[#639747]/15" />
          <Baby className="pointer-events-none absolute right-8 top-8 h-16 w-16 -rotate-12 text-[#639747]/25" />

          <div className="relative z-10 flex min-h-[320px] w-[78%] flex-col items-start p-5 sm:w-[68%] sm:p-6 lg:w-1/2 lg:pr-3">
            <span className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[#d7e6ce] bg-white/90 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#4f8138] shadow-sm backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ayurvedic wellness
            </span>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] lg:text-[1.7rem]">
              Caring for Mothers Beyond Delivery
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[#667563] sm:text-base lg:text-sm lg:leading-5">
              Discover personalized Ayurvedic guidance for pregnancy, birth preparation, and postnatal recovery.
            </p>
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Ayurvedic wellness highlights">
              <span className="rounded-full border border-[#cfe0c5] bg-[#e4f0d9]/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#315f2a] backdrop-blur-sm">
                Prenatal care
              </span>
              <span className="rounded-full border border-[#d7e6ce] bg-[#edf5e7]/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#527647] backdrop-blur-sm">
                Postnatal recovery
              </span>
              <span className="rounded-full border border-[#dce8d4] bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#54705b] backdrop-blur-sm">
                Mother &amp; baby wellness
              </span>
            </div>
            <Link
              to="/prenatal-postnatal-care"
              className="mt-auto inline-flex items-center gap-3 rounded-full bg-[#4f8138] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-smooth hover:-translate-y-0.5 hover:bg-[#315f2a]"
            >
              Learn about care
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
        ) : null}

        {variant !== "maternal" ? (
        <article className="group relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[#d2e3c8] bg-gradient-to-r from-[#fbfdf9] via-[#f1f7ec] to-[#dfeecf] text-[#315f2a] shadow-[0_18px_45px_rgba(28,66,39,0.11)]">
          <img
            src="/brands/Polished%20Wooden%20Shirodhara%20Massage%20Table%20Set%20(1).png"
            alt="Polished wooden Shirodhara massage table set"
            className="absolute bottom-0 right-0 h-[94%] w-[62%] object-contain object-right-bottom transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(251,253,249,0.99)_0%,rgba(251,253,249,0.96)_34%,rgba(241,247,236,0.72)_50%,rgba(223,238,207,0.08)_72%,transparent_100%)]" />
          <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full border border-[#639747]/15" />
          <div className="pointer-events-none absolute -bottom-40 left-[30%] h-72 w-72 rounded-full border border-[#315f2a]/10" />

          <div className="relative z-10 flex min-h-[320px] w-[78%] flex-col items-start p-5 sm:w-[68%] sm:p-6 lg:w-1/2 lg:pr-3">
            <span className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[#d2e3c8] bg-white/90 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#4f8138] shadow-sm backdrop-blur-sm">
              <HeartPulse className="h-3.5 w-3.5" />
              Home healthcare
            </span>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] lg:text-[1.7rem]">
              <span className="text-[#173d28]">Healthcare Essentials,</span>{" "}
              <span className="text-[#4f8138]">Delivered to You</span>
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[#667563] sm:text-base lg:text-sm lg:leading-5">
              Reliable medical equipment and healthcare essentials for safe, convenient home care.
            </p>
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Home healthcare highlights">
              <span className="rounded-full border border-[#d7e6ce] bg-[#edf5e7]/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#527647] backdrop-blur-sm">
                Therapy equipment
              </span>
              <span className="rounded-full border border-[#cfe0c5] bg-[#e4f0d9]/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#315f2a] backdrop-blur-sm">
                Home wellness
              </span>
              <span className="rounded-full border border-[#dce8d4] bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#54705b] backdrop-blur-sm">
                Care essentials
              </span>
            </div>
            <Link
              to="/equipment"
              className="mt-auto inline-flex items-center gap-3 rounded-full bg-[#4f8138] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-smooth hover:-translate-y-0.5 hover:bg-[#315f2a]"
            >
              Shop Equipment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
        ) : null}
      </div>
    </section>
  );
};

export default CareHighlights;
