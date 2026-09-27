import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Product } from "@/data/catalog";
import { apiClient } from "@/lib/apiClient";
import {
  getProductVariants,
  getStockBadgeLabel,
  taxIncludedPriceForProduct,
} from "@/lib/pricing";

export type CatalogueCategory = {
  _id: string;
  name: string;
  type: string;
  image?: string;
};

export type Catalogue = {
  _id: string;
  name: string;
  route: string;
  slug: string;
  image?: string;
  indexPosition: number;
  categories: CatalogueCategory[];
};

export type CatalogueGroup = {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  type: string;
  indexPosition: number;
  categories: CatalogueCategory[];
};

export type ProductBrand = {
  _id: string;
  name: string;
  image?: string;
};
export const ACCOUNT_TYPE_ID = "6ab6509e6b5eed1fddd778ca";

const CATALOGUES_ENDPOINT =
  `/business_profile_website/public/get_product_services_catalogues?accountTypeId=${ACCOUNT_TYPE_ID}&limit=50&includeCategories=true`;
const CATALOGUE_GROUPS_ENDPOINT =
  `/business_profile_website/public/get_catalogue_groups_for_public?accountTypeId=${ACCOUNT_TYPE_ID}&includeCategories=true&type=all&page=1&limit=50`;
const CATALOGUE_PRODUCT_ITEMS_ENDPOINT =
  "/business_website/catalogue/product/get_catalogue_product_items_for_public";
const OFFER_PRODUCTS_ENDPOINT =
  "/business_website/catalogue/product/get_offer_products_for_public";
const WEBSITE_SUBDOMAIN = "evercare.app.colaber.in";
const PRODUCT_BRANDS_ENDPOINT =
  "/business_website/catalogue/product/get_catalogue_product_brands_for_public";
const FALLBACK_PRODUCT_IMAGE =
  "https://png.pngtree.com/png-clipart/20230917/original/pngtree-no-image-available-icon-flatvector-illustration-thumbnail-graphic-illustration-vector-png-image_12323920.png";
const PRODUCT_DETAILS_ENDPOINT =
  "/business_website/catalogue/product/get_catalogue_product_details_for_public";
const PRODUCT_DETAILS_BY_ID_ENDPOINT =
  "/business_website/catalogue/product/get_catalogue_product_details_for_public_by_id";
const DISPATCH_POINT_BY_ID_ENDPOINT =
  "/business_website/catalogue/shipping/manual/dispatch/get_public_by_id";
const CATALOGUE_PRODUCTS_PAGE_LIMIT = 50;
const MAX_CATALOGUE_PRODUCT_PAGES = 25;

const extractList = (payload: unknown): unknown[] => {
  const value = payload as {
    data?: unknown;
    result?: unknown;
    catalogues?: unknown;
    groups?: unknown;
  };

  return Array.isArray(payload)
    ? payload
    : Array.isArray(value.data)
      ? value.data
      : Array.isArray(value.result)
        ? value.result
        : Array.isArray(value.catalogues)
          ? value.catalogues
          : Array.isArray(value.groups)
            ? value.groups
            : typeof value.data === "object" && value.data && Array.isArray((value.data as { data?: unknown }).data)
              ? (value.data as { data: unknown[] }).data
              : [];
};

const extractCategories = (categories: unknown): CatalogueCategory[] =>
  Array.isArray(categories)
    ? categories
        .map((category) => {
          const item = category as Partial<CatalogueCategory> & {
            categoryId?: Partial<CatalogueCategory> & {
              imageUrl?: string;
              thumbnail?: string;
              icon?: string;
            };
            imageUrl?: string;
            thumbnail?: string;
            icon?: string;
          };
          const categoryDetails =
            item.categoryId && typeof item.categoryId === "object"
              ? item.categoryId
              : item;

          return {
            _id: categoryDetails._id ?? item._id ?? "",
            name: categoryDetails.name ?? item.name ?? "",
            type: categoryDetails.type ?? item.type ?? "",
            image:
              categoryDetails.image ??
              categoryDetails.imageUrl ??
              categoryDetails.thumbnail ??
              categoryDetails.icon ??
              item.image ??
              item.imageUrl ??
              item.thumbnail ??
              item.icon,
          };
        })
        .filter((category) => category._id && category.name)
    : [];

const extractCatalogues = (payload: unknown): Catalogue[] => {
  return extractList(payload)
    .map((item) => {
      const catalogue = item as Partial<Catalogue>;
      return {
        _id: catalogue._id ?? catalogue.slug ?? catalogue.route ?? catalogue.name ?? "",
        name: catalogue.name ?? "",
        route: catalogue.slug ?? catalogue.route ?? "",
        slug: catalogue.slug ?? catalogue.route ?? "",
        image: catalogue.image,
        indexPosition: Number(catalogue.indexPosition ?? 0),
        categories: extractCategories(catalogue.categories),
      };
    })
    .filter((catalogue) => catalogue.name)
    .sort((a, b) => a.indexPosition - b.indexPosition);
};

const extractCatalogueGroups = (payload: unknown): CatalogueGroup[] =>
  extractList(payload)
    .map((item) => {
      const group = item as Partial<CatalogueGroup>;
      return {
        _id: group._id ?? group.slug ?? group.name ?? "",
        name: group.name ?? "",
        slug: group.slug ?? "",
        image: group.image,
        type: group.type ?? "",
        indexPosition: Number(group.indexPosition ?? 0),
        categories: extractCategories(group.categories),
      };
    })
    .filter((group) => group._id && group.name)
    .sort((a, b) => a.indexPosition - b.indexPosition);

export const getCatalogues = async (): Promise<Catalogue[]> => {
  const payload = await apiClient.get(CATALOGUES_ENDPOINT);
  return extractCatalogues(payload);
};

export const useCatalogues = (enabled = true) =>
  useQuery({
    queryKey: ["catalogues"],
    queryFn: getCatalogues,
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });

export const getCatalogueGroups = async (): Promise<CatalogueGroup[]> => {
  const payload = await apiClient.get(CATALOGUE_GROUPS_ENDPOINT);
  return extractCatalogueGroups(payload);
};

export const useCatalogueGroups = (enabled = true) =>
  useQuery({
    queryKey: ["catalogue-groups"],
    queryFn: getCatalogueGroups,
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });

const extractBrandName = (brand: unknown): string => {
  if (!brand) return "";
  if (typeof brand === "string") return brand.trim();
  if (Array.isArray(brand)) return extractBrands(brand).join(",");
  if (typeof brand === "object") {
    const value = brand as { name?: unknown; title?: unknown; label?: unknown; brand?: unknown };
    return extractBrandName(value.name ?? value.title ?? value.label ?? value.brand);
  }

  return String(brand).trim();
};

const extractBrands = (payload: unknown): string[] => {
  const value = payload as { brands?: unknown; data?: unknown; result?: unknown };
  const possibleList = Array.isArray(value.brands)
    ? value.brands
    : Array.isArray(value.data)
      ? value.data
      : Array.isArray(value.result)
        ? value.result
        : Array.isArray(payload)
          ? payload
          : [];

  return Array.from(
    new Set(
      possibleList
        .map(extractBrandName)
        .map((brand) => brand.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
};

const extractProductBrands = (payload: unknown): ProductBrand[] => {
  const value = payload as { brands?: unknown; data?: unknown; result?: unknown };
  const possibleList = Array.isArray(value.brands)
    ? value.brands
    : Array.isArray(value.data)
      ? value.data
      : Array.isArray(value.result)
        ? value.result
        : Array.isArray(payload)
          ? payload
          : [];

  const uniqueBrands = new Map<string, ProductBrand>();

  possibleList.forEach((brand, index) => {
    const item = brand as {
      _id?: unknown;
      name?: unknown;
      title?: unknown;
      label?: unknown;
      brand?: unknown;
      image?: unknown;
      imageUrl?: unknown;
      logo?: unknown;
    };
    const name = extractBrandName(item);

    if (!name) return;

    const image = item.image ?? item.imageUrl ?? item.logo;
    uniqueBrands.set(name.toLowerCase(), {
      _id: typeof item._id === "string" && item._id ? item._id : `${name}-${index}`,
      name,
      ...(typeof image === "string" && image.trim() ? { image: image.trim() } : {}),
    });
  });

  return Array.from(uniqueBrands.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const getProductBrandsPayload = async (catalogueId?: string): Promise<unknown> => {
  const params = new URLSearchParams({
    accountTypeId: ACCOUNT_TYPE_ID,
  });

  if (catalogueId) {
    params.set("catalogId", catalogueId);
  }
  params.set("limit", "30");

  return apiClient.get(`${PRODUCT_BRANDS_ENDPOINT}?${params.toString()}`);
};

export const getProductBrands = async (catalogueId?: string): Promise<string[]> => {
  const payload = await getProductBrandsPayload(catalogueId);
  return extractBrands(payload);
};

export const getProductBrandsWithImages = async (
  catalogueId?: string,
): Promise<ProductBrand[]> => {
  const payload = await getProductBrandsPayload(catalogueId);
  return extractProductBrands(payload);
};

export const useProductBrands = (catalogueId?: string, enabled = true) =>
  useQuery({
    queryKey: ["product-brands", catalogueId ?? "all"],
    queryFn: () => getProductBrands(catalogueId),
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });

type ApiCatalogueProduct = {
  _id?: string;
  id?: string;
  catalogId?: string;
  catalogueId?: string;
  name?: string;
  categoryName?: string;
  categoryId?: {
    _id?: string;
    name?: string;
    image?: string;
  };
  productCode?: string;
  pricing?: {
    basePrice?: number;
    salePrice?: number;
    taxApplicable?: boolean;
    taxRate?: number;
    priceVisible?: boolean;
    preorder?:
      | boolean
      | {
          enabled?: boolean;
          maximumAcceptablePreOrders?: number | null;
          acceptedPreOrderCount?: number;
          tier?: string;
        };
    minQuantity?: number;
    maxQuantity?: number;
    minOrderQuantity?: number;
    maxOrderQuantity?: number;
  };
  inventory?: {
    stockStatus?: string;
    totalQuantity?: number;
  };
  images?: string[];
  slug?: string;
  status?: string;
  effectivePrice?: number;
  createdAt?: string;
  createdDate?: string;
  created_at?: string;
  description?: string;
  additionalDescription?: string;
  brand?: string;
  shipping?: {
    available?: boolean;
  };
  coupon?: {
    _id?: string;
    code?: string;
    name?: string;
    bogo?: {
      buyProductId?: string;
      freeProductId?: string;
      buyItems?: Array<{
        productId?: string;
        groupId?: string;
      }>;
    };
    freeProduct?: {
      itemId?: string;
      name?: string;
      slug?: string;
      images?: string[];
    } | null;
  };
  dispatchPoints?: Array<string | { _id?: string; id?: string }>;
  storePickupAvailable?: boolean;
  storePickupDispatchPoint?:
    | {
        _id?: string;
        id?: string;
        name?: string;
        address?: string;
        pincode?: string;
        contactPerson?: string;
        countryCode?: string;
        phone?: string;
        operatingHours?: string;
        lat?: string;
        lng?: string;
        locationAddress?: unknown;
        isActive?: boolean;
      }
    | string;
  variants?: Array<{
    _id?: string;
    id?: string;
    name?: string;
    basePrice?: number;
    salePrice?: number | null;
    stock?: number;
    weight?: string | number;
    preorder?: boolean;
    preOrder?: boolean;
    minQuantity?: number;
    maxQuantity?: number;
    orderRules?: {
      minimumQuantity?: number;
      maximumQuantity?: number;
    };
  }>;
  preorder?:
    | boolean
    | {
        enabled?: boolean;
        maximumAcceptablePreOrders?: number | null;
        acceptedPreOrderCount?: number;
        tier?: string;
      };
  preOrder?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  orderRules?: {
    minimumQuantity?: number;
    maximumQuantity?: number;
  };
  relatedItems?: ApiCatalogueProduct[];
  crossSellProducts?: (ApiCatalogueProduct | { itemId?: string | ApiCatalogueProduct })[];
};

type ApiProductDetailsPayload = {
  data?: ApiCatalogueProduct;
  reviews?: [any]
};

type PaginationMeta = {
  currentPage?: number;
  page?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasNextPage?: boolean;
  total?: number;
  totalItems?: number;
  totalCount?: number;
  totalRecords?: number;
  count?: number;
  limit?: number;
  pageSize?: number;
};

export type CatalogueProductPageParams = {
  catalogueId?: string;
  category?: string;
  search?: string;
  brands?: string[];
  priceRange?: string;
  freeShipping?: boolean;
  onSale?: boolean;
  sortBy?: "name" | "newest" | "price-low" | "price-high" | string;
  page?: number;
  limit?: number;
  enabled?: boolean;
};

export type CatalogueProductPage = {
  products: Product[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
};

const formatProductDescription = (description?: string) =>
  description
    ?.replace(/\\n/g, "")
    .replace(/\r?\n/g, "<br />")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br /><br />")
    .trim();

const normalizeStorePickupDispatchPoint = (value: ApiCatalogueProduct["storePickupDispatchPoint"]) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;

  const id = String(value._id ?? value.id ?? "").trim();
  if (!id) return undefined;

  return {
    _id: id,
    id,
    name: value.name ?? "",
    address: value.address ?? "",
    pincode: value.pincode ?? "",
    contactPerson: value.contactPerson ?? "",
    countryCode: value.countryCode ?? "",
    phone: value.phone ?? "",
    operatingHours: value.operatingHours ?? "",
    lat: value.lat ?? "",
    lng: value.lng ?? "",
    locationAddress: value.locationAddress ?? null,
    isActive: value.isActive ?? true,
  };
};

const normalizeDispatchPoints = (value: ApiCatalogueProduct["dispatchPoints"]) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((dispatchPoint) => {
      if (typeof dispatchPoint === "string") return dispatchPoint.trim();
      if (!dispatchPoint) return "";
      return String(dispatchPoint._id ?? dispatchPoint.id ?? "").trim();
    })
    .filter(Boolean);
};

const stockBadgeFor = (inventory?: ApiCatalogueProduct["inventory"]) => {
  const stockStatus = String(inventory?.stockStatus || "").trim();
  const stockStatusLower = stockStatus.toLowerCase();
  const stockCount = Number(inventory?.totalQuantity);

  if (stockStatusLower === "out of stock" || (Number.isFinite(stockCount) && stockCount <= 0)) {
    return "Out of Stock";
  }

  return getStockBadgeLabel(stockCount);
};

const mapCatalogueProduct = (product: ApiCatalogueProduct): Product => {
  const price = Number(product.effectivePrice ?? product.pricing?.salePrice ?? product.pricing?.basePrice ?? 0);
  const mrp = Number(product.pricing?.basePrice ?? price);
  const stockStatus = product.inventory?.stockStatus ?? "";
  const stockBadge = stockBadgeFor(product.inventory);
  const image = product.images?.find((image) => image.trim());
  const shippingAvailable = Boolean(product.shipping?.available);
  const storePickupAvailable = Boolean(product.storePickupAvailable);
  const dispatchPoints = normalizeDispatchPoints(product.dispatchPoints);
  const storePickupDispatchPoint = normalizeStorePickupDispatchPoint(product.storePickupDispatchPoint);
  const preorder = product.preorder ?? product.preOrder;
  const hasBogoOffer = Boolean(
    product.coupon?._id ||
      product.coupon?.code ||
      product.coupon?.bogo?.buyProductId ||
      product.coupon?.bogo?.buyItems?.some((item) => Boolean(String(item?.productId ?? "").trim())),
  );
  const bogoFreeProductId = String(
    product.coupon?.freeProduct?.itemId ?? product.coupon?.bogo?.freeProductId ?? "",
  ).trim();

  return {
    id: product._id ?? product.id ?? product.slug ?? product.name ?? "",
    name: product.name ?? "",
    category: product.categoryName ?? product.categoryId?.name ?? "",
    categoryId: product.categoryId?._id,
    categoryImage: product.categoryId?.image,
    weight: product.productCode ?? product.inventory?.stockStatus ?? "",
    price,
    mrp,
    rating: 0,
    image: image ?? FALLBACK_PRODUCT_IMAGE,
    images: product.images?.filter((image) => image.trim()) ?? [],
    badge: stockBadge,
    stockStatus,
    slug: product.slug,
    description: formatProductDescription(product.description),
    additionalDescription: formatProductDescription(product.additionalDescription),
    brand: product.brand,
    ...(typeof preorder !== "undefined" ? { preorder } : {}),
    ...(typeof product.preOrder !== "undefined" ? { preOrder: product.preOrder } : {}),
    ...(product.orderRules ? { orderRules: product.orderRules } : {}),
    minQuantity: product.minQuantity ?? product.minOrderQuantity ?? product.pricing?.minQuantity,
    maxQuantity: product.maxQuantity ?? product.maxOrderQuantity ?? product.pricing?.maxQuantity,
    minOrderQuantity:
      product.minOrderQuantity ?? product.minQuantity ?? product.pricing?.minQuantity,
    maxOrderQuantity:
      product.maxOrderQuantity ?? product.maxQuantity ?? product.pricing?.maxQuantity,
    catalogId: product.catalogId ?? product.catalogueId ?? "",
    catalogueId: product.catalogueId ?? product.catalogId ?? "",
    shippingAvailable,
    storePickupAvailable,
    ...(dispatchPoints.length > 0 ? { dispatchPoints } : {}),
    ...(storePickupDispatchPoint ? { storePickupDispatchPoint } : {}),
    ...(hasBogoOffer
      ? {
          hasBogoOffer: true,
          offerType: "bogo",
          bogoPromotionId: String(product.coupon?._id ?? "").trim() || undefined,
          bogoPromotionCode: String(product.coupon?.code ?? "").trim() || undefined,
          ...(bogoFreeProductId ? { bogoFreeProductId } : {}),
        }
      : {}),
    createdAt: product.createdAt ?? product.createdDate ?? product.created_at,
    ...(product.pricing ? { pricing: product.pricing } : {}),
    ...(product.inventory ? { inventory: product.inventory } : {}),
    ...(Array.isArray(product.variants) ? { variants: product.variants } : {}),
  };
};

const extractCatalogueProductList = (payload: unknown): unknown[] => {
  const value = payload as { data?: unknown; result?: unknown; items?: unknown; products?: unknown };
  const possibleList =
    Array.isArray(payload)
      ? payload
      : Array.isArray(value.data)
        ? value.data
        : Array.isArray(value.result)
          ? value.result
          : Array.isArray(value.items)
            ? value.items
            : Array.isArray(value.products)
              ? value.products
              : typeof value.data === "object" && value.data
                ? extractCatalogueProductList(value.data)
                : [];

  return possibleList;
};

const extractCatalogueProducts = (payload: unknown): Product[] => {
  return extractCatalogueProductList(payload)
    .map((item) => {
      const product = item as ApiCatalogueProduct;
      return mapCatalogueProduct(product);
    })
    .filter((product) => product.id && product.name);
};

const getNumber = (...values: unknown[]) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue >= 0) return numberValue;
  }

  return undefined;
};

const extractPaginationMeta = (payload: unknown): PaginationMeta | undefined => {
  if (!payload || typeof payload !== "object") return undefined;

  const value = payload as {
    data?: unknown;
    pagination?: PaginationMeta;
    meta?: PaginationMeta;
    page?: unknown;
    currentPage?: unknown;
    totalPages?: unknown;
    hasNext?: unknown;
    hasNextPage?: unknown;
    total?: unknown;
    totalItems?: unknown;
    totalCount?: unknown;
    totalRecords?: unknown;
    count?: unknown;
    limit?: unknown;
    pageSize?: unknown;
  };

  const nested = value.pagination ?? value.meta;
  if (nested) return nested;

  if (value.data && typeof value.data === "object" && !Array.isArray(value.data)) {
    const nestedMeta = extractPaginationMeta(value.data);
    if (nestedMeta) return nestedMeta;
  }

  return {
    page: getNumber(value.page),
    currentPage: getNumber(value.currentPage),
    totalPages: getNumber(value.totalPages),
    hasNext: typeof value.hasNext === "boolean" ? value.hasNext : undefined,
    hasNextPage: typeof value.hasNextPage === "boolean" ? value.hasNextPage : undefined,
    total: getNumber(value.total),
    totalItems: getNumber(value.totalItems),
    totalCount: getNumber(value.totalCount),
    totalRecords: getNumber(value.totalRecords),
    count: getNumber(value.count),
    limit: getNumber(value.limit),
    pageSize: getNumber(value.pageSize),
  };
};

const hasMoreCatalogueProductPages = (payload: unknown, page: number, pageSize: number) => {
  const meta = extractPaginationMeta(payload);
  const productsOnPage = extractCatalogueProductList(payload).length;
  const currentPage = getNumber(meta?.currentPage, meta?.page) ?? page;
  const totalPages = getNumber(meta?.totalPages);
  const totalItems = getNumber(meta?.totalItems, meta?.totalCount, meta?.totalRecords, meta?.total, meta?.count);
  const resolvedPageSize = getNumber(meta?.pageSize, meta?.limit) ?? pageSize;

  if (typeof meta?.hasNext === "boolean") return meta.hasNext;
  if (typeof meta?.hasNextPage === "boolean") return meta.hasNextPage;
  if (totalPages !== undefined) return currentPage < totalPages;
  if (totalItems !== undefined && resolvedPageSize > 0) return currentPage * resolvedPageSize < totalItems;

  return productsOnPage >= pageSize;
};

const extractCatalogueProductPage = (payload: unknown, page: number, pageSize: number): CatalogueProductPage => {
  const products = extractCatalogueProducts(payload);
  const meta = extractPaginationMeta(payload);
  const currentPage = getNumber(meta?.currentPage, meta?.page) ?? page;
  const resolvedPageSize = getNumber(meta?.pageSize, meta?.limit) ?? pageSize;
  const totalItems = getNumber(meta?.totalItems, meta?.totalCount, meta?.totalRecords, meta?.total, meta?.count) ?? products.length;
  const totalPages = getNumber(meta?.totalPages) ?? Math.max(1, Math.ceil(totalItems / resolvedPageSize));

  return {
    products,
    pagination: {
      currentPage,
      pageSize: resolvedPageSize,
      totalItems,
      totalPages,
      hasPrev: currentPage > 1,
      hasNext:
        typeof meta?.hasNext === "boolean"
          ? meta.hasNext
          : typeof meta?.hasNextPage === "boolean"
            ? meta.hasNextPage
            : currentPage < totalPages,
    },
  };
};

const buildCatalogueProductPageParams = (params: CatalogueProductPageParams) => {
  const query = new URLSearchParams({
    subdomain: WEBSITE_SUBDOMAIN,
    accountTypeId: ACCOUNT_TYPE_ID,
    page: String(params.page ?? 1),
    limit: String(params.limit ?? CATALOGUE_PRODUCTS_PAGE_LIMIT),
  });

  if (params.catalogueId) query.set("catalogId", params.catalogueId);
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.brands && params.brands.length > 0) query.set("brand", params.brands.join(","));
  if (params.priceRange) query.set("priceRange", params.priceRange);
  if (params.freeShipping) query.set("freeShipping", "true");
  if (params.onSale) query.set("onSale", "true");
  if (params.sortBy) query.set("sortBy", params.sortBy);

  return query;
};

export const getPagedCatalogueProducts = async (
  params: CatalogueProductPageParams,
): Promise<CatalogueProductPage> => {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.max(1, Math.floor(params.limit ?? CATALOGUE_PRODUCTS_PAGE_LIMIT));

  if (params.priceRange) {
    const ranges = params.priceRange
      .split(",")
      .map((range) => {
        const [rawMin, rawMax] = range.split("-");
        const min = Number(rawMin);
        const max = rawMax === "" || rawMax === undefined ? undefined : Number(rawMax);

        return {
          min: Number.isFinite(min) ? min : 0,
          max: max !== undefined && Number.isFinite(max) ? max : undefined,
        };
      });
    const productsById = new Map<string, Product>();

    for (let sourcePage = 1; sourcePage <= MAX_CATALOGUE_PRODUCT_PAGES; sourcePage += 1) {
      const sourceParams = {
        ...params,
        priceRange: undefined,
        page: sourcePage,
        limit: CATALOGUE_PRODUCTS_PAGE_LIMIT,
      };
      const sourceQuery = buildCatalogueProductPageParams(sourceParams);
      const payload = await apiClient.get(
        `${CATALOGUE_PRODUCT_ITEMS_ENDPOINT}?${sourceQuery.toString()}`,
      );

      extractCatalogueProducts(payload).forEach((product) =>
        productsById.set(product.id, product),
      );

      if (!hasMoreCatalogueProductPages(payload, sourcePage, CATALOGUE_PRODUCTS_PAGE_LIMIT)) {
        break;
      }
    }

    const filteredProducts = Array.from(productsById.values()).filter((product) => {
      const displayedPrice = taxIncludedPriceForProduct(
        product,
        getProductVariants(product)[0]?.price ?? product.price,
      );

      return ranges.some(
        ({ min, max }) => displayedPrice >= min && (max === undefined || displayedPrice <= max),
      );
    });
    const totalItems = filteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * limit;

    return {
      products: filteredProducts.slice(start, start + limit),
      pagination: {
        currentPage,
        pageSize: limit,
        totalItems,
        totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
      },
    };
  }

  const query = buildCatalogueProductPageParams({ ...params, page, limit });
  const payload = await apiClient.get(`${CATALOGUE_PRODUCT_ITEMS_ENDPOINT}?${query.toString()}`);

  return extractCatalogueProductPage(payload, page, limit);
};

export const usePagedCatalogueProducts = (params: CatalogueProductPageParams) =>
  useQuery({
    queryKey: ["catalogue-products", "paged", params],
    queryFn: () => getPagedCatalogueProducts(params),
    enabled: params.enabled ?? true,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

export const getPagedOfferProducts = async (
  params: CatalogueProductPageParams,
): Promise<CatalogueProductPage> => {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.max(1, Math.floor(params.limit ?? CATALOGUE_PRODUCTS_PAGE_LIMIT));
  const query = buildCatalogueProductPageParams({ ...params, page, limit, onSale: false });
  const payload = await apiClient.get(`${OFFER_PRODUCTS_ENDPOINT}?${query.toString()}`);

  return extractCatalogueProductPage(payload, page, limit);
};

export const usePagedOfferProducts = (params: CatalogueProductPageParams) =>
  useQuery({
    queryKey: ["offer-products", "paged", params],
    queryFn: () => getPagedOfferProducts(params),
    enabled: params.enabled ?? true,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

const getCatalogueProductsPage = async (catalogueId: string, page: number) => {
  return getCatalogueProductsPageByParams({ catalogueId, page });
};

const getCatalogueProductsPageByParams = async ({
  catalogueId,
  brands = [],
  page,
}: {
  catalogueId?: string;
  brands?: string[];
  page: number;
}) => {
  const params = new URLSearchParams({
    subdomain: WEBSITE_SUBDOMAIN,
    accountTypeId: ACCOUNT_TYPE_ID,
    page: String(page),
    limit: String(CATALOGUE_PRODUCTS_PAGE_LIMIT),
  });

  if (catalogueId) {
    params.set("catalogId", catalogueId);
  }

  if (brands.length > 0) {
    params.set("brand", brands.join(","));
  }

  return apiClient.get(`${CATALOGUE_PRODUCT_ITEMS_ENDPOINT}?${params.toString()}`);
};

const getCatalogueProductsCollection = async ({
  catalogueId,
  brands = [],
}: {
  catalogueId?: string;
  brands?: string[];
}): Promise<Product[]> => {
  const productsById = new Map<string, Product>();

  for (let page = 1; page <= MAX_CATALOGUE_PRODUCT_PAGES; page += 1) {
    const payload = await getCatalogueProductsPageByParams({ catalogueId, brands, page });
    const pageProducts = extractCatalogueProducts(payload);

    pageProducts.forEach((product) => productsById.set(product.id, product));

    if (!hasMoreCatalogueProductPages(payload, page, CATALOGUE_PRODUCTS_PAGE_LIMIT)) {
      break;
    }
  }

  return Array.from(productsById.values());
};

export const getCatalogueProducts = async (catalogueId: string, brands: string[] = []): Promise<Product[]> =>
  getCatalogueProductsCollection({ catalogueId, brands });

export const useCatalogueProducts = (catalogueId?: string, brands: string[] = []) =>
  useQuery({
    queryKey: ["catalogue-products", catalogueId, brands],
    queryFn: () => getCatalogueProducts(catalogueId ?? "", brands),
    enabled: Boolean(catalogueId),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });

export const useAllCatalogueProducts = (_catalogueIds: string[] = [], brands: string[] = []) =>
  useQuery({
    queryKey: ["catalogue-products", "all", brands],
    queryFn: () => getAllCatalogueProducts(brands),
    enabled: true,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });

export const getAllCatalogueProducts = async (brands: string[] = []) =>
  getCatalogueProductsCollection({ brands });

const mapProductCollection = (products: (ApiCatalogueProduct | { itemId?: string | ApiCatalogueProduct })[] = []) =>
  products
    .map((item) => {
      const product = "itemId" in item && typeof item.itemId === "object" ? item.itemId : item;
      return typeof product === "object" ? mapCatalogueProduct(product as ApiCatalogueProduct) : undefined;
    })
    .filter((item): item is Product => Boolean(item?.id && item.name));

export const getCatalogueProductDetails = async (
  productSlug: string
): Promise<{ product: Product; relatedItems: Product[]; crossSellProducts: Product[]; reviews: any }> => {
  const params = new URLSearchParams({
    productSlug,
    needRelatedItems: "true",
    needCrossSellProducts: "true",
  });
  const payload = (await apiClient.get(`${PRODUCT_DETAILS_ENDPOINT}?${params.toString()}`)) as ApiProductDetailsPayload;
  const product = payload.data;
  const reviews = payload?.reviews;

  if (!product) {
    throw new Error("Product details not found");
  }

  return {
    product: mapCatalogueProduct(product),
    relatedItems: mapProductCollection(product.relatedItems),
    crossSellProducts: mapProductCollection(product.crossSellProducts),
    reviews: reviews,
  };
};

export const getCatalogueProductDetailsById = async (productId: string): Promise<Product> => {
  const id = String(productId || "").trim();
  if (!id) {
    throw new Error("Product ID is required");
  }

  const payload = (await apiClient.get(`${PRODUCT_DETAILS_BY_ID_ENDPOINT}/${encodeURIComponent(id)}`)) as ApiProductDetailsPayload;
  const product = payload.data;

  if (!product) {
    throw new Error("Product details not found");
  }

  return mapCatalogueProduct(product);
};

export type ManualShippingDispatchPoint = {
  _id?: string;
  id?: string;
  name?: string;
  address?: string;
  pincode?: string;
  contactPerson?: string;
  countryCode?: string;
  phone?: string;
  operatingHours?: string;
  lat?: string;
  lng?: string;
  locationAddress?: unknown;
  isActive?: boolean;
};

export const getManualShippingDispatchPointById = async (
  dispatchPointId: string,
): Promise<ManualShippingDispatchPoint> => {
  const id = String(dispatchPointId || "").trim();
  if (!id) {
    throw new Error("Dispatch point ID is required");
  }

  const payload = (await apiClient.get(`${DISPATCH_POINT_BY_ID_ENDPOINT}/${encodeURIComponent(id)}`)) as {
    data?: ManualShippingDispatchPoint;
  };

  if (!payload?.data) {
    throw new Error("Dispatch point not found");
  }

  const dispatchPoint = payload.data;
  const resolvedId = String(dispatchPoint._id ?? dispatchPoint.id ?? "").trim();
  return {
    ...dispatchPoint,
    _id: resolvedId || id,
    id: resolvedId || id,
  };
};

export const useCatalogueProductDetails = (productSlug?: string) =>
  useQuery({
    queryKey: ["catalogue-product-details", productSlug],
    queryFn: () => getCatalogueProductDetails(productSlug ?? ""),
    enabled: Boolean(productSlug),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  });
