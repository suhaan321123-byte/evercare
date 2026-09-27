import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import frozenSnacksImage from "@/assets/Frozen Snacks-1.jpg.jpeg";
import chickenBiriyaniImage from "@/assets/Chicken Biriyani.jpg (1).jpeg";
import spicesImage from "@/assets/Spices.jpg.jpeg";
import snacksImage from "@/assets/Snacks.jpg.jpeg";
import riceCollectionsImage from "@/assets/Rice Collections.jpg (1).jpeg";
import porottaChapatiImage from "@/assets/Porotta and Chapati-1.jpg.jpeg";

const galleryItems = [
  { title: "Wellness Essentials", image: frozenSnacksImage, link: "/products?category=Frozen%20Items" },
  { title: "Chicken Biriyani", image: chickenBiriyaniImage, link: "/products?category=ready-to-eat-cook" },
  { title: "Ayurvedic Medicines", image: spicesImage, link: "/products?category=Spices" },
  { title: "Herbal Wellness", image: snacksImage, link: "/products?category=snacks-sweets" },
  { title: "Therapy Equipment", image: riceCollectionsImage, link: "/products?category=Rice%20%26%20Rice%20Products" },
  {
    title: "Porotta & Chapati",
    image: porottaChapatiImage,
    link: "/products?category=frozen-items&itemCategories=6a108bd99bc10b65943e77c2",
  },
];

const toSrc = (image: string | { src: string }) => (typeof image === "string" ? image : image.src);

const ScrollingImageShowcase = () => {
  const items = [...galleryItems, ...galleryItems];
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const card = scroller.querySelector<HTMLElement>("[data-gallery-card]");
    const cardWidth = card?.getBoundingClientRect().width ?? 242;
    const gap = 16;
    scroller.scrollBy({
      left: direction === "left" ? -(cardWidth + gap) : cardWidth + gap,
      behavior: "smooth",
    });
  };

  return (
    <section className="site-container py-6 sm:py-10">
      <div className="relative overflow-hidden rounded-none border-0 bg-transparent shadow-none sm:rounded-[2rem] sm:border sm:border-border sm:bg-gradient-to-br sm:from-background sm:via-card sm:to-muted/60 sm:shadow-card">
        <div className="absolute inset-0 hidden sm:block bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_32%)]" />
        <div className="relative p-0 sm:p-6 lg:p-8">
          <div className="mb-3 flex flex-col gap-4 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2 hidden sm:block">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Bringing the Taste of India to Your Home
              </h2>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Carefully sourced Ayurvedic medicines, wellness essentials, and healthcare equipment for your needs.
              </p>
            </div>
            <Button asChild variant="outline" className="hidden sm:inline-flex bg-background/80 backdrop-blur">
              <Link to="/products">
                Explore Products <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-card to-transparent sm:w-16" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-card to-transparent sm:w-16" />
            <button
              type="button"
              onClick={() => scrollByCard("left")}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-card backdrop-blur transition-smooth hover:scale-105"
              aria-label="Scroll gallery left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard("right")}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-card backdrop-blur transition-smooth hover:scale-105"
              aria-label="Scroll gallery right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div ref={scrollerRef} className="no-scrollbar overflow-x-auto pb-2">
              <div className="marquee hover:[animation-play-state:paused]">
                <div className="flex w-max gap-4 pr-4">
                {items.map((item, index) => (
                  <Link
                    key={`${item.title}-${index}`}
                    to={item.link}
                    data-gallery-card
                    className="group w-[242px] shrink-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/70 shadow-soft backdrop-blur transition-smooth hover:-translate-y-1 hover:shadow-card dark:bg-black/20"
                    aria-label={`Shop ${item.title}`}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={toSrc(item.image)}
                        alt={item.title}
                        className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                        loading={index < 4 ? "eager" : "lazy"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-lg font-bold text-white drop-shadow">{item.title}</h3>
                      </div>
                    </div>
                  </Link>
                ))}
                {items.map((item, index) => (
                  <Link
                    key={`${item.title}-dup-${index}`}
                    to={item.link}
                    data-gallery-card
                    className="group w-[242px] shrink-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/70 shadow-soft backdrop-blur transition-smooth hover:-translate-y-1 hover:shadow-card dark:bg-black/20"
                    aria-hidden="true"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={toSrc(item.image)}
                        alt=""
                        className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-lg font-bold text-white drop-shadow">{item.title}</h3>
                      </div>
                    </div>
                  </Link>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScrollingImageShowcase;
