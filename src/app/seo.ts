import type { Metadata } from "next";

export const SITE_NAME = "EvercareMed";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://evercare-two.vercel.app";

export const DEFAULT_TITLE = "EvercareMed | Ayurvedic Medicines & Wellness Products";
export const DEFAULT_DESCRIPTION =
  "Shop trusted Ayurvedic medicines, wellness products, therapy essentials, and healthcare equipment online at EvercareMed.";
export const DEFAULT_SOCIAL_IMAGE = "/evercaremed_logo.png";

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  absoluteTitle?: boolean;
  noIndex?: boolean;
};

export const stripHtml = (value?: string) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildPageMetadata = ({
  title,
  description,
  path = "/",
  image = DEFAULT_SOCIAL_IMAGE,
  keywords,
  absoluteTitle = false,
  noIndex = false,
}: PageMetadataOptions): Metadata => ({
  title: absoluteTitle ? { absolute: title } : title,
  description,
  keywords,
  alternates: {
    canonical: path,
  },
  openGraph: {
    title,
    description,
    url: path,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: image,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
  },
  robots: noIndex
    ? {
        index: false,
        follow: false,
      }
    : {
        index: true,
        follow: true,
      },
});
