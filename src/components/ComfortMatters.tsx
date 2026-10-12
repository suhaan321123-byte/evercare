import {
  ConciergeBell,
  HeartHandshake,
  Leaf,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type ComfortItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconStyle: string;
};

const comfortItems: ComfortItem[] = [
  {
    icon: ShieldCheck,
    title: "Qualified practitioners",
    description: "Every session is guided by trained Ayurvedic professionals.",
    iconStyle: "bg-[#e2f0d8] text-[#4f8138]",
  },
  {
    icon: HeartHandshake,
    title: "Personal consultation",
    description: "Your treatment plan begins with time to understand your needs.",
    iconStyle: "bg-[#edf5e7] text-[#638d4b]",
  },
  {
    icon: Leaf,
    title: "Authentic ingredients",
    description: "We use carefully selected oils and herbs prepared for each therapy.",
    iconStyle: "bg-[#dcebd3] text-[#315f2a]",
  },
  {
    icon: ConciergeBell,
    title: "Thoughtful hospitality",
    description: "Arrive early, settle in, and leave with simple aftercare guidance.",
    iconStyle: "bg-[#f0f6eb] text-[#527647]",
  },
];

const ComfortMatters = () => (
  <section
    className="border-y border-[#dce8d4] bg-[linear-gradient(135deg,#f9fcf6_0%,#f1f7ec_52%,#e4f0d9_100%)] py-12 sm:py-14 lg:py-16"
    aria-labelledby="comfort-matters-heading"
  >
    <div className="site-container px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#4f8138] sm:text-sm">
        Your comfort matters
      </p>
      <h2
        id="comfort-matters-heading"
        className="mt-2 text-2xl font-black leading-tight text-[#173d28] sm:text-3xl"
      >
        A calm, personal way to heal
      </h2>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {comfortItems.map(({ icon: Icon, title, description, iconStyle }) => (
          <article
            key={title}
            className="min-h-[174px] rounded-2xl border border-[#dce8d4] bg-white p-5 shadow-[0_10px_30px_rgba(28,66,39,0.07)] transition duration-300 hover:-translate-y-0.5 hover:border-[#aac99a] hover:shadow-[0_14px_34px_rgba(28,66,39,0.12)] sm:p-6"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${iconStyle}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-base font-extrabold text-[#173d28]">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[#667563]">
              {description}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default ComfortMatters;
