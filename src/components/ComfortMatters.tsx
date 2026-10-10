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
    iconStyle: "bg-[#f3ddd8] text-[#a34f5e]",
  },
  {
    icon: HeartHandshake,
    title: "Personal consultation",
    description: "Your treatment plan begins with time to understand your needs.",
    iconStyle: "bg-[#e8eddc] text-[#71813d]",
  },
  {
    icon: Leaf,
    title: "Authentic ingredients",
    description: "We use carefully selected oils and herbs prepared for each therapy.",
    iconStyle: "bg-[#f3e5dc] text-[#8d665f]",
  },
  {
    icon: ConciergeBell,
    title: "Thoughtful hospitality",
    description: "Arrive early, settle in, and leave with simple aftercare guidance.",
    iconStyle: "bg-[#eef1e5] text-[#56613e]",
  },
];

const ComfortMatters = () => (
  <section
    className="border-y border-[#eadfd7] bg-[linear-gradient(135deg,#fffaf6_0%,#f8f2ec_52%,#e8eddc_100%)] py-12 sm:py-14 lg:py-16"
    aria-labelledby="comfort-matters-heading"
  >
    <div className="site-container px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#8f4653] sm:text-sm">
        Your comfort matters
      </p>
      <h2
        id="comfort-matters-heading"
        className="mt-2 text-2xl font-black leading-tight text-[#293327] sm:text-3xl"
      >
        A calm, personal way to heal
      </h2>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {comfortItems.map(({ icon: Icon, title, description, iconStyle }) => (
          <article
            key={title}
            className="min-h-[174px] rounded-2xl border border-[#eadfd7] bg-[#fffdf9] p-5 shadow-[0_10px_30px_rgba(91,61,47,0.07)] transition duration-300 hover:-translate-y-0.5 hover:border-[#d9aeb5] hover:shadow-[0_14px_34px_rgba(91,61,47,0.12)] sm:p-6"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${iconStyle}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-base font-extrabold text-[#293327]">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[#62685d]">
              {description}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default ComfortMatters;
