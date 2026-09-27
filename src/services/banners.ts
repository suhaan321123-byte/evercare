import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { ACCOUNT_TYPE_ID } from "./catalogues";

export type BannerSlide = {
  image: string;
  mobileImage?: string;
  desktopImage?: string;
  alt?: string;
};

type ApiBanner = {
  image?: unknown;
  imageUrl?: unknown;
  imageURL?: unknown;
  bannerImage?: unknown;
  bannerImageUrl?: unknown;
  bannerImageURL?: unknown;
  desktopImage?: unknown;
  desktopImageUrl?: unknown;
  mobileImage?: unknown;
  mobileImageUrl?: unknown;
  title?: unknown;
  name?: unknown;
  alt?: unknown;
  indexPosition?: unknown;
  sortOrder?: unknown;
  order?: unknown;
  images?: unknown;
  desktop?: unknown;
  mobile?: unknown;
};

const ACTIVE_BANNERS_ENDPOINT =
  `/business_website/banner/get_active_banners?accountTypeId=${ACCOUNT_TYPE_ID}`;

const bannerCache: Record<"Mobile" | "Desktop", BannerSlide[]> = {
  Mobile: [],
  Desktop: [],
};

const extractList = (payload: unknown): unknown[] => {
  const value = payload as {
    data?: unknown;
    result?: unknown;
    banners?: unknown;
    items?: unknown;
  };

  return Array.isArray(payload)
    ? payload
    : Array.isArray(value.data)
      ? value.data
      : Array.isArray(value.result)
        ? value.result
        : Array.isArray(value.banners)
          ? value.banners
          : Array.isArray(value.items)
            ? value.items
            : typeof value.data === "object" && value.data && Array.isArray((value.data as { data?: unknown }).data)
              ? (value.data as { data: unknown[] }).data
              : [];
};

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const imageFromObject = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const item = value as ApiBanner;
  return (
    stringValue(item.image) ??
    stringValue(item.imageUrl) ??
    stringValue(item.imageURL) ??
    stringValue(item.bannerImage) ??
    stringValue(item.bannerImageUrl) ??
    stringValue(item.bannerImageURL)
  );
};

const imageFromImages = (images: unknown): string | undefined => {
  if (!Array.isArray(images)) return undefined;

  for (const image of images) {
    const url = stringValue(image) ?? imageFromObject(image);
    if (url) return url;
  }

  return undefined;
};

const extractBanners = (payload: unknown): BannerSlide[] =>
  extractList(payload)
    .map((item) => {
      const banner = item as ApiBanner;
      const desktopImage =
        stringValue(banner.desktopImage) ?? stringValue(banner.desktopImageUrl) ?? imageFromObject(banner.desktop);
      const mobileImage =
        stringValue(banner.mobileImage) ?? stringValue(banner.mobileImageUrl) ?? imageFromObject(banner.mobile);
      const image =
        desktopImage ??
        mobileImage ??
        imageFromImages(banner.images) ??
        imageFromObject(banner);
      const sortOrder = Number(banner.indexPosition ?? banner.sortOrder ?? banner.order ?? 0);

      return {
        image: image ?? "",
        mobileImage,
        desktopImage,
        alt: stringValue(banner.alt) ?? stringValue(banner.title) ?? stringValue(banner.name),
        sortOrder,
      };
    })
    .filter((banner) => banner.image)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _sortOrder, ...banner }) => banner);

export const getActiveBanners = async (deviceType: "Mobile" | "Desktop"): Promise<BannerSlide[]> => {
  const payload = await apiClient.get(
    `${ACTIVE_BANNERS_ENDPOINT}&deviceType=${encodeURIComponent(deviceType)}`,
  );
  const banners = extractBanners(payload);
  bannerCache[deviceType] = banners;
  return banners;
};

export const getCachedActiveBanners = (deviceType: "Mobile" | "Desktop") =>
  bannerCache[deviceType] || [];

export const useActiveBanners = (deviceType: "Mobile" | "Desktop", enabled = true) =>
  useQuery({
    queryKey: ["active-banners", deviceType],
    queryFn: () => getActiveBanners(deviceType),
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
