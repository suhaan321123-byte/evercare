import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getCachedActiveBanners,
  useActiveBanners,
  type BannerSlide,
} from "@/services/banners";

type HeroSliderProps = {
  initialDesktopSlides?: BannerSlide[];
  initialMobileSlides?: BannerSlide[];
};

const HeroSlider = ({ initialDesktopSlides, initialMobileSlides }: HeroSliderProps) => {
  const [idx, setIdx] = useState(0);
  const isMobile = useIsMobile();
  const deviceType = isMobile ? "Mobile" : "Desktop";
  const hasServerSlides =
    (initialDesktopSlides?.length ?? 0) > 0 || (initialMobileSlides?.length ?? 0) > 0;
  const { data: apiSlides = [], isLoading, isFetching } = useActiveBanners(deviceType, !hasServerSlides);
  const cachedSlides = useMemo(() => getCachedActiveBanners(deviceType), [deviceType]);
  const serverSlides = useMemo(
    () => (isMobile ? initialMobileSlides ?? [] : initialDesktopSlides ?? []),
    [initialDesktopSlides, initialMobileSlides, isMobile]
  );
  const slides = useMemo(
    () => (hasServerSlides ? serverSlides : apiSlides.length > 0 ? apiSlides : cachedSlides),
    [apiSlides, cachedSlides, hasServerSlides, serverSlides],
  );
  const primarySlide = slides[0] || null;
  const primaryImageSrc = useMemo(() => {
    if (!primarySlide) return "";
    return (isMobile ? primarySlide.mobileImage : primarySlide.desktopImage) ?? primarySlide.image;
  }, [isMobile, primarySlide]);

  useEffect(() => {
    if (primaryImageSrc) {
      const preload = new Image();
      preload.src = primaryImageSrc;
    }
  }, [primaryImageSrc]);

  useEffect(() => {
    if (slides.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    setIdx(0);
  }, [slides.length]);

  return (
    <section className="w-full">
      <div className="relative aspect-[1024/560] overflow-hidden bg-slate-100 md:aspect-[2622/650] dark:bg-slate-900">
        {slides.length > 0 ? (
          slides.map((s, i) => (
            <div
              key={`${s.alt || "slide"}-${i}`}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <img
                src={(isMobile ? s.mobileImage : s.desktopImage) ?? s.image}
                alt={s.alt ?? `Hero slide ${i + 1}`}
                className="block h-full w-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
            <div className="absolute inset-0 bg-black/5" />
            <div className="absolute inset-x-6 bottom-6 max-w-md rounded-2xl bg-white/70 p-4 backdrop-blur-sm dark:bg-slate-900/60">
              <div className="h-4 w-32 rounded bg-slate-300/80 dark:bg-slate-700" />
              <div className="mt-3 h-8 w-3/4 rounded bg-slate-300/80 dark:bg-slate-700" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-300/70 dark:bg-slate-700/70" />
            </div>
            {!hasServerSlides && (isLoading || isFetching) ? (
              <div className="absolute right-4 top-4 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/75 dark:text-slate-200">
                Loading banner…
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSlider;
