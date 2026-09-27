import { ArrowRight, Baby, HeartPulse, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
const CareHighlights = () => {

  return (
    <section className="site-container pb-10">
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="group relative min-h-[320px] overflow-hidden rounded-[2rem] border-2 border-[#55B4C7] bg-[#F8FCFA] text-[#087A96] shadow-[0_10px_30px_rgba(8,122,150,0.14)] ring-1 ring-[#55B4C7]/20">
          <img
            src="/Beyond_Delivery.jpg"
            alt="A mother holding her sleeping newborn baby"
            className="absolute inset-0 h-full w-full object-cover object-[72%_center] transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(248,252,250,0.98)_0%,rgba(248,252,250,0.94)_34%,rgba(248,252,250,0.68)_50%,rgba(248,252,250,0.1)_72%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -bottom-40 left-[25%] h-80 w-80 rounded-full border border-[#1686A6]/15" />
          <Baby className="pointer-events-none absolute right-8 top-8 h-16 w-16 -rotate-12 text-[#1686A6]/25" />

          <div className="relative z-10 flex min-h-[320px] w-[78%] flex-col items-start p-5 sm:w-[68%] sm:p-6 lg:w-1/2 lg:pr-3">
            <span className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[#CFE7E1] bg-white/90 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#16728C] shadow-sm backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ayurvedic wellness
            </span>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] lg:text-[1.7rem]">
              Caring for Mothers Beyond Delivery
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[#486F7A] sm:text-base lg:text-sm lg:leading-5">
              Discover personalized Ayurvedic guidance for pregnancy, birth preparation, and postnatal recovery.
            </p>
            <Link
              to="/prenatal-postnatal-care"
              className="mt-auto inline-flex items-center gap-3 rounded-full bg-[#BBD94C] px-6 py-2.5 text-sm font-bold text-[#496414] shadow-sm transition-smooth hover:-translate-y-0.5 hover:bg-[#CDE66D]"
            >
              Learn about care
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>

        <article className="group relative min-h-[320px] overflow-hidden rounded-[2rem] border-2 border-[#E59A70] bg-[#FFFDFC] text-[#99420E] shadow-[0_10px_30px_rgba(161,69,16,0.14)] ring-1 ring-[#E59A70]/20">
          <img
            src="/ayur_equipments.jpg"
            alt="Ayurvedic healthcare equipment in a wellness room"
            className="absolute inset-0 h-full w-full object-cover object-[68%_center] transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,253,252,0.98)_0%,rgba(255,253,252,0.94)_34%,rgba(255,253,252,0.68)_50%,rgba(255,253,252,0.1)_72%,transparent_100%)]" />
          <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full border border-[#E95A2B]/15" />
          <div className="pointer-events-none absolute -bottom-40 left-[30%] h-72 w-72 rounded-full border border-[#0B416E]/10" />

          <div className="relative z-10 flex min-h-[320px] w-[78%] flex-col items-start p-5 sm:w-[68%] sm:p-6 lg:w-1/2 lg:pr-3">
            <span className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[#F1DFD1] bg-[#FFF8F3]/90 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9B461A] shadow-sm backdrop-blur-sm">
              <HeartPulse className="h-3.5 w-3.5" />
              Home healthcare
            </span>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] lg:text-[1.7rem]">
              <span className="text-[#A14510]">Healthcare Essentials,</span>{" "}
              <span className="text-[#0A4777]">Delivered to You</span>
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[#5D6268] sm:text-base lg:text-sm lg:leading-5">
              Reliable medical equipment and healthcare essentials for safe, convenient home care.
            </p>
            <Link
              to="/equipment"
              className="mt-auto inline-flex items-center gap-3 rounded-full bg-[#E7552E] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-smooth hover:-translate-y-0.5 hover:bg-[#C94420]"
            >
              Shop Equipment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
};

export default CareHighlights;
