import "server-only";

import { unstable_cache } from "next/cache";
import {
  getPublishedWebsitePageApi,
} from "@/api/websitePage/websitePageApi";

const CACHE_REVALIDATE_SECONDS = Number(
  process.env.WEBSITE_DATA_REVALIDATE_SECONDS || 300
);
const currentDomain = "evercare.app.colaber.in";

const normalizeDomain = (domain = currentDomain) => {
  const value = String(domain || "").trim().toLowerCase();
  return value || "unknown-domain";
};

const cacheWith = ({ keyParts, tags, fn }) =>
  unstable_cache(fn, keyParts, {
    revalidate: CACHE_REVALIDATE_SECONDS,
    tags,
  })();

export const getCachedPublishedWebsitePage = async ({ domain = currentDomain, params }) => {
  const domainKey = normalizeDomain(domain);
  const customRoute = params?.customRoute || "/";
  const callingPage = params?.callingPage || "unknown-page";

  return cacheWith({
    keyParts: ["published-website-page", domainKey, customRoute, callingPage],
    tags: [
      `published-website:${domainKey}`,
      `published-website-page:${domainKey}:${customRoute}`,
    ],
    fn: async () => {
      return getPublishedWebsitePageApi(params);
    },
  });
};
