import { Award, Clock3, ShieldCheck, Truck } from "lucide-react";

const benefits = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "On orders above ₹499",
  },
  {
    icon: ShieldCheck,
    title: "100% Authentic",
    description: "Direct from brands",
  },
  {
    icon: Award,
    title: "Certified",
    description: "GMP & AYUSH approved",
  },
  {
    icon: Clock3,
    title: "Fast Delivery",
    description: "2-4 business days",
  },
];

const TrustBenefits = () => (
  <section
    aria-label="Shopping benefits"
    className="bg-transparent px-4 pb-5 pt-9 sm:px-6 sm:pt-10 lg:px-8 lg:pb-6 lg:pt-12"
  >
    <div className="site-container">
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 lg:gap-4">
        {benefits.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="flex min-w-[255px] snap-start items-center gap-4 rounded-2xl border border-[#dce8d4] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(28,66,39,0.07)] transition duration-300 hover:-translate-y-0.5 hover:border-[#aac99a] hover:shadow-[0_12px_30px_rgba(28,66,39,0.12)] sm:min-w-0 sm:px-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e5f2dc] text-[#4f8138]">
              <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-5 text-[#173d28] sm:text-base">
                {title}
              </span>
              <span className="block text-xs font-medium leading-5 text-[#667563] sm:text-sm">
                {description}
              </span>
            </span>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default TrustBenefits;
