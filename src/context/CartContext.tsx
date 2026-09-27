import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode, useCallback } from "react";
import { findProduct, type Product } from "@/data/catalog";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { getEffectivePurchaseLimit, getOrderQuantityBounds } from "@/lib/pricing";
import {
  addRemoteCartItem,
  clearRemoteCart,
  getRemoteCart,
  removeRemoteCartItem,
  saveMergedRemoteCart,
  updateRemoteCartItem,
  type RemoteCartItem,
} from "@/lib/cartApi";
import { getCatalogueProductDetailsById, getManualShippingDispatchPointById } from "@/services/catalogues";
import { trackAddToCart, trackEvent, trackRemoveFromCart } from "@/lib/analytics";
import { getActiveBogoPromotions } from "@/lib/promotionsApi";

type CartItem = Product & { qty: number };
type CartCtx = {
  items: CartItem[];
  add: (p: Product, qty?: number) => void;
  remove: (id: string, variantId?: string) => void;
  setQty: (id: string, qty: number, variantId?: string) => void;
  clear: () => void;
  count: number;
  total: number;
  hydrated: boolean;
  syncing: boolean;
};

const Ctx = createContext<CartCtx | null>(null);

const CART_STORAGE_KEY = "ecom:cart:v1";
const GUEST_CART_PENDING_MERGE_KEY = "ecom:cart:guest_pending_merge:v1";

const extractMongoObjectId = (value: unknown) => {
  const match = String(value || "").match(/[a-f0-9]{24}/i);
  return match ? match[0] : "";
};

const productBaseId = (item: Partial<Product>) => extractMongoObjectId(item.id) || String(item.id || "");

const cartProductId = (item: Partial<Product>) => {
  const bogoFreeProductId = String(item.bogoFreeProductId || "").trim();
  if (item.isBogoOfferItem && bogoFreeProductId) return bogoFreeProductId;
  return extractMongoObjectId(item.id) || String(item.id || "").split("-")[0].trim();
};

const productVariantId = (item: Partial<Product>) => {
  const selectedVariantId = String(item.selectedVariantId || "").trim();
  if (selectedVariantId) return selectedVariantId;
  const parts = String(item.id || "").split("-");
  return parts.length > 1 ? extractMongoObjectId(parts[1]) : "";
};

const normalizeId = (value: unknown) => String((value as any)?._id || value || "").trim();

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const variantMatchesId = (variant: any, id = "") => {
  const targetId = normalizeId(id);
  if (!targetId) return false;
  return [variant?._id, variant?.id, variant?.groupId, variant?.variantId, variant?.name]
    .map((value) => normalizeId(value))
    .filter(Boolean)
    .includes(targetId);
};

const getBogoBuyTargets = (promotion: any) => {
  const targets = Array.isArray(promotion?.bogo?.buyItems)
    ? promotion.bogo.buyItems
        .map((item: any) => ({
          productId: normalizeId(item?.productId || item?.itemId),
          groupId: normalizeId(item?.groupId || item?.variantId || item?.freeGroupId || item?.freeVariantId),
        }))
        .filter((item: any) => item.productId)
    : [];

  if (!targets.length && promotion?.bogo?.buyProductId) {
    targets.push({
      productId: normalizeId(promotion.bogo.buyProductId),
      groupId: normalizeId(promotion?.bogo?.buyGroupId || promotion?.bogo?.buyVariantId),
    });
  }

  return targets;
};

const getFiniteStockQuantity = (value: unknown) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.max(0, quantity) : null;
};

const getCartItemQty = (item: Partial<Product> & { qty?: number }) =>
  Math.max(0, Number(item?.qty || 0) || 0);

const getReservedQuantityForProduct = (
  productId: string,
  cartItems: Array<Partial<Product> & { qty?: number }> = [],
  currentItem: Partial<Product> | null = null,
) =>
  (Array.isArray(cartItems) ? cartItems : [])
    .filter((item) => {
      if (!item) return false;
      if (currentItem && isSameCartLine(item, currentItem as Partial<Product> & { variantId?: string })) {
        return false;
      }
      return cartProductId(item) === productId;
    })
    .reduce((sum, item) => sum + getCartItemQty(item), 0);

const getProductAvailableQuantity = (product: any, groupId = "") => {
  if (!product) return 0;
  const variant = Array.isArray(product?.variants)
    ? product.variants.find((item: any) => variantMatchesId(item, groupId))
    : null;

  if (variant) {
    const variantStock = getFiniteStockQuantity(
      variant?.stock ?? variant?.quantity ?? variant?.inventory?.totalQuantity ?? variant?.inventory?.quantity,
    );
    if (variantStock !== null) return variantStock;
  }

  const stockStatus = String(product?.inventory?.stockStatus || "").toLowerCase();
  if (stockStatus.includes("out")) return 0;

  const productStock = getFiniteStockQuantity(
    product?.inventory?.totalQuantity ?? product?.inventory?.quantity ?? product?.stock ?? product?.quantity,
  );

  return productStock !== null ? productStock : Number.POSITIVE_INFINITY;
};

const getSameItemBogoMaxPaidQuantity = ({
  availableQuantity,
  buyQty,
  getQty,
  maxGetQty = null,
}: {
  availableQuantity: number;
  buyQty: number;
  getQty: number;
  maxGetQty?: number | null;
}) => {
  const stock = Math.max(0, Math.floor(Number(availableQuantity || 0) || 0));
  const buy = Math.max(1, Math.floor(Number(buyQty || 1) || 1));
  const get = Math.max(1, Math.floor(Number(getQty || 1) || 1));
  const maxFree =
    maxGetQty === null || maxGetQty === undefined
      ? null
      : Math.max(0, Math.floor(Number(maxGetQty || 0) || 0));

  if (stock <= buy) return stock;

  for (let paidQty = buy; paidQty <= stock; paidQty += 1) {
    const earnedFreeQty = Math.floor(paidQty / buy) * get;
    const cappedEarnedFreeQty =
      maxFree === null ? earnedFreeQty : Math.min(earnedFreeQty, maxFree);
    const availableFreeQty = Math.min(cappedEarnedFreeQty, stock - paidQty);

    if (paidQty + availableFreeQty >= stock) return paidQty;
  }

  return stock;
};

const getBogoStockAwareMaxQuantity = ({
  item,
  cartItems = [],
  bogoPromotions = [],
  bogoProductsById = {},
}: {
  item: CartItem;
  cartItems?: CartItem[];
  bogoPromotions?: any[];
  bogoProductsById?: Record<string, any>;
}) => {
  const baseMaxQuantity = resolveAvailableStock(item, cartItems, item);
  const baseMax = typeof baseMaxQuantity === "number" ? baseMaxQuantity : undefined;
  if (!item || item.isBogoOfferItem || item.isOfferItem) return baseMax;

  const itemId = productBaseId(item);
  const groupId = normalizeId(productVariantId(item));
  if (!itemId) return baseMax;

  let adjustedMax = baseMax;

  (Array.isArray(bogoPromotions) ? bogoPromotions : []).forEach((promotion) => {
    const bogo = promotion?.bogo || {};
    const buyTargets = getBogoBuyTargets(promotion);
    const isBuyTarget = buyTargets.some((target) => {
      const sameProduct = itemId === normalizeId(target.productId);
      const sameVariant = !target.groupId || groupId === normalizeId(target.groupId);
      return sameProduct && sameVariant;
    });
    if (!isBuyTarget) return;

    const freeProductId = normalizeId(bogo.freeProductId);
    const freeGroupId = normalizeId(bogo.freeGroupId || bogo.freeVariantId || bogo.freeVariant?._id);
    const sameFreeProduct = itemId === freeProductId;
    const sameFreeGroup = !freeGroupId || !groupId || groupId === freeGroupId;
    if (!sameFreeProduct || !sameFreeGroup) return;

    const freeProduct = bogoProductsById[freeProductId] || null;
    const rawFreeStock = getProductAvailableQuantity(freeProduct, freeGroupId || groupId);
    const itemStock = typeof baseMax === "number" ? baseMax : rawFreeStock;
    const freeStock = Number.isFinite(rawFreeStock)
      ? Math.max(Number(rawFreeStock), Number(itemStock || 0))
      : itemStock;
    if (typeof freeStock !== "number" || !Number.isFinite(freeStock)) return;

    const reservedQuantity = (Array.isArray(cartItems) ? cartItems : [])
      .filter((row) => {
        if (!row || row.id === item.id) return false;
        const sameProduct = productBaseId(row) === freeProductId;
        const rowGroupId = normalizeId(productVariantId(row));
        const sameGroup = !freeGroupId || !rowGroupId || rowGroupId === freeGroupId;
        const sameAutoBogo =
          row.isBogoOfferItem &&
          normalizeId(row.bogoPromotionId) === normalizeId(promotion?._id);
        return sameProduct && sameGroup && !sameAutoBogo;
      })
      .reduce((sum, row) => sum + Math.max(0, Number(row.qty || 0) || 0), 0);

    const availableForThisLine = Math.max(0, freeStock - reservedQuantity);
    const buyQty = Math.max(1, Number(bogo.buyQty || 1) || 1);
    const getQty = Math.max(1, Number(bogo.getQty || 1) || 1);
    const maxGetQty =
      bogo.maxGetQty === null || bogo.maxGetQty === ""
        ? null
        : Math.max(0, Number(bogo.maxGetQty || 0) || 0);
    const bogoMax = getSameItemBogoMaxPaidQuantity({
      availableQuantity: availableForThisLine,
      buyQty,
      getQty,
      maxGetQty,
    });

    adjustedMax =
      typeof adjustedMax === "number" ? Math.min(adjustedMax, bogoMax) : bogoMax;
  });

  return adjustedMax;
};

const getVariantPrice = (product: any, groupId = "") => {
  const variant = Array.isArray(product?.variants)
    ? product.variants.find((item: any) => variantMatchesId(item, groupId))
    : null;
  const pricing = product?.pricing || {};
  const basePrice = Number(variant?.basePrice ?? pricing?.basePrice ?? pricing?.salePrice ?? 0) || 0;
  const salePrice = Number(variant?.salePrice ?? variant?.basePrice ?? pricing?.salePrice ?? basePrice) || 0;
  return { basePrice, salePrice };
};

const getProductVariant = (product: any, groupId = "") => {
  if (!groupId || !Array.isArray(product?.variants)) return null;
  return product.variants.find((item: any) => variantMatchesId(item, groupId)) || null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStorePickupDispatchPoint(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;

  const id = String(value._id ?? value.id ?? "").trim();
  if (!id) return undefined;

  return {
    _id: id,
    id,
    name: typeof value.name === "string" ? value.name : "",
    address: typeof value.address === "string" ? value.address : "",
    pincode: typeof value.pincode === "string" ? value.pincode : "",
    contactPerson: typeof value.contactPerson === "string" ? value.contactPerson : "",
    countryCode: typeof value.countryCode === "string" ? value.countryCode : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    operatingHours: typeof value.operatingHours === "string" ? value.operatingHours : "",
    lat: typeof value.lat === "string" ? value.lat : "",
    lng: typeof value.lng === "string" ? value.lng : "",
    locationAddress: value.locationAddress ?? null,
    isActive: value.isActive !== false,
  };
}

function normalizeDispatchPoints(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((dispatchPoint) => {
      if (typeof dispatchPoint === "string") return dispatchPoint.trim();
      if (!isRecord(dispatchPoint)) return "";
      return String(dispatchPoint._id ?? dispatchPoint.id ?? "").trim();
    })
    .filter(Boolean);
}

function extractStorePickupDispatchPointId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (!isRecord(value)) return "";
  return String(value._id ?? value.id ?? "").trim();
}

function hasStorePickupDispatchPointDetails(value: unknown) {
  if (!value || typeof value === "string") return false;
  if (!isRecord(value)) return false;
  return Boolean(
    String(value.name || "").trim() ||
      String(value.address || "").trim() ||
      String(value.pincode || "").trim() ||
      String(value.phone || "").trim() ||
      String(value.operatingHours || "").trim() ||
      value.locationAddress,
  );
}

function normalizeResolvedPickupDispatchPoint(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;

  const id = String(value._id ?? value.id ?? "").trim();
  if (!id) return undefined;

  return {
    _id: id,
    id,
    name: typeof value.name === "string" ? value.name : "",
    address: typeof value.address === "string" ? value.address : "",
    pincode: typeof value.pincode === "string" ? value.pincode : "",
    contactPerson: typeof value.contactPerson === "string" ? value.contactPerson : "",
    countryCode: typeof value.countryCode === "string" ? value.countryCode : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    operatingHours: typeof value.operatingHours === "string" ? value.operatingHours : "",
    lat: typeof value.lat === "string" ? value.lat : "",
    lng: typeof value.lng === "string" ? value.lng : "",
    locationAddress: value.locationAddress ?? null,
    isActive: value.isActive !== false,
  };
}

function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const next: CartItem[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const id = typeof raw.id === "string" ? raw.id : typeof raw._id === "string" ? raw._id : "";
    const name = typeof raw.name === "string" ? raw.name : "";
    const price = typeof raw.price === "number" && Number.isFinite(raw.price) ? raw.price : 0;
    const mrp = typeof raw.mrp === "number" && Number.isFinite(raw.mrp) ? raw.mrp : price;
    const image = typeof raw.image === "string" ? raw.image : "";
    const catalogId =
      typeof raw.catalogId === "string"
        ? raw.catalogId
        : typeof raw.catalogueId === "string"
          ? raw.catalogueId
          : undefined;
    const catalogueId =
      typeof raw.catalogueId === "string"
        ? raw.catalogueId
        : typeof raw.catalogId === "string"
          ? raw.catalogId
          : undefined;
    const selectedVariantId =
      typeof raw.selectedVariantId === "string" ? raw.selectedVariantId : undefined;
    const bogoMeta = {
      isOfferItem: raw.isOfferItem === true,
      isBogoOfferItem: raw.isBogoOfferItem === true,
      hasBogoOffer: raw.hasBogoOffer === true,
      bogoApplied: raw.bogoApplied === true,
      isBogoApplied: raw.isBogoApplied === true,
      offerType: typeof raw.offerType === "string" ? raw.offerType : undefined,
      bogoPromotionId: typeof raw.bogoPromotionId === "string" ? raw.bogoPromotionId : undefined,
      bogoPromotionCode: typeof raw.bogoPromotionCode === "string" ? raw.bogoPromotionCode : undefined,
      bogoSourceItemId: typeof raw.bogoSourceItemId === "string" ? raw.bogoSourceItemId : undefined,
      bogoFreeProductId: typeof raw.bogoFreeProductId === "string" ? raw.bogoFreeProductId : undefined,
      bogoFreeGroupId: typeof raw.bogoFreeGroupId === "string" ? raw.bogoFreeGroupId : undefined,
      bogoDiscountPercent:
        typeof raw.bogoDiscountPercent === "number" && Number.isFinite(raw.bogoDiscountPercent)
          ? raw.bogoDiscountPercent
          : undefined,
    };
    const flags = resolveFulfillmentFlags(id, raw.shippingAvailable, raw.storePickupAvailable);
    const dispatchPoints = normalizeDispatchPoints(raw.dispatchPoints);
    const storePickupDispatchPoint = normalizeStorePickupDispatchPoint(raw.storePickupDispatchPoint);
    const pricing = isRecord(raw.pricing) ? raw.pricing : undefined;
    const variants = Array.isArray(raw.variants) ? raw.variants : undefined;
    const preorder = (raw as { preorder?: unknown }).preorder;
    const preOrder = (raw as { preOrder?: unknown }).preOrder;
    const qtyRaw = (raw as { qty?: unknown; quantity?: unknown }).qty ?? (raw as { quantity?: unknown }).quantity;
    const qty = typeof qtyRaw === "number" && Number.isFinite(qtyRaw) ? Math.floor(qtyRaw) : 1;
    if (!id || !name || qty <= 0) continue;
    next.push(
      {
        id,
        name,
        price,
        mrp,
        image,
        ...(catalogId ? { catalogId } : {}),
        ...(catalogueId ? { catalogueId } : {}),
        ...(selectedVariantId ? { selectedVariantId } : {}),
        ...(pricing ? { pricing: pricing as Product["pricing"] } : {}),
        ...(variants ? { variants: variants as Product["variants"] } : {}),
        ...(typeof preorder !== "undefined" ? { preorder } : {}),
        ...(typeof preOrder !== "undefined" ? { preOrder } : {}),
        ...(bogoMeta.isOfferItem ? { isOfferItem: true } : {}),
        ...(bogoMeta.isBogoOfferItem ? { isBogoOfferItem: true } : {}),
        ...(bogoMeta.hasBogoOffer ? { hasBogoOffer: true } : {}),
        ...(bogoMeta.bogoApplied ? { bogoApplied: true } : {}),
        ...(bogoMeta.isBogoApplied ? { isBogoApplied: true } : {}),
        ...(bogoMeta.offerType ? { offerType: bogoMeta.offerType } : {}),
        ...(bogoMeta.bogoPromotionId ? { bogoPromotionId: bogoMeta.bogoPromotionId } : {}),
        ...(bogoMeta.bogoPromotionCode ? { bogoPromotionCode: bogoMeta.bogoPromotionCode } : {}),
        ...(bogoMeta.bogoSourceItemId ? { bogoSourceItemId: bogoMeta.bogoSourceItemId } : {}),
        ...(bogoMeta.bogoFreeProductId ? { bogoFreeProductId: bogoMeta.bogoFreeProductId } : {}),
        ...(bogoMeta.bogoFreeGroupId ? { bogoFreeGroupId: bogoMeta.bogoFreeGroupId } : {}),
        ...(typeof bogoMeta.bogoDiscountPercent === "number"
          ? { bogoDiscountPercent: bogoMeta.bogoDiscountPercent }
          : {}),
        ...(typeof flags.shippingAvailable === "boolean" ? { shippingAvailable: flags.shippingAvailable } : {}),
        ...(typeof flags.storePickupAvailable === "boolean" ? { storePickupAvailable: flags.storePickupAvailable } : {}),
        ...(dispatchPoints.length > 0 ? { dispatchPoints } : {}),
        ...(storePickupDispatchPoint ? { storePickupDispatchPoint } : {}),
        qty,
      } as CartItem,
    );
  }

  const merged = new Map<string, CartItem>();
  for (const item of next) {
    const key = getCartLineKey(item);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, qty: existing.qty + item.qty } : item);
  }
  return Array.from(merged.values())
    .map((i, index, arr) => ({ ...i, qty: clampQuantityToStock(i, i.qty, arr, i) }))
    .filter((i) => i.qty > 0);
}

function resolveAvailableStock(
  product: Product,
  cartItems: Array<Partial<Product> & { qty?: number }> = [],
  currentItem: Partial<Product> | null = null,
) {
  const bounds = getOrderQuantityBounds(
    product,
    getProductVariant(product, String(product.selectedVariantId || "").trim()) || null,
  );
  if (bounds.preorder) {
    const remaining = getEffectivePurchaseLimit(
      product,
      getProductVariant(product, String(product.selectedVariantId || "").trim()) || null,
    );
    if (typeof remaining !== "number") return remaining;
    const productId = cartProductId(product);
    const reserved = getReservedQuantityForProduct(productId, cartItems, currentItem);
    return Math.max(0, remaining - reserved);
  }

  const variantId = String(product.selectedVariantId || "").trim();
  let stockLimit: number | undefined;
  if (variantId && Array.isArray(product.variants) && product.variants.length > 0) {
    const hit = product.variants.find((v) => variantMatchesId(v, variantId)) || null;
    const raw = hit?.stock;
    if (typeof raw === "number" && Number.isFinite(raw)) stockLimit = Math.max(0, Math.floor(raw));
  }

  if (stockLimit === undefined) {
    const inv = product.inventory?.totalQuantity;
    if (typeof inv === "number" && Number.isFinite(inv)) {
      stockLimit = Math.max(0, Math.floor(inv));
    }
  }

  if (stockLimit === undefined) {
    const status = String(product.inventory?.stockStatus || "").toLowerCase();
    if (status === "out of stock") return 0;
  }

  if (typeof stockLimit === "number") {
    return bounds.maxQuantity === null ? stockLimit : Math.min(stockLimit, bounds.maxQuantity);
  }

  return bounds.maxQuantity ?? undefined;
}

function clampQuantityToStock(
  product: Product,
  requestedQty: number,
  currentCartItems: Array<Partial<Product> & { qty?: number }> = [],
  currentItem: Partial<Product> | null = null,
) {
  const qty = Math.floor(Number(requestedQty || 1) || 0);
  if (qty <= 0) return 0;
  const bounds = getOrderQuantityBounds(
    product,
    getProductVariant(product, String(product.selectedVariantId || "").trim()) || null,
  );
  const available = resolveAvailableStock(product, currentCartItems, currentItem);
  if (
    !bounds.preorder &&
    bounds.preorderMeta?.enabled &&
    bounds.preorderMeta.maximumAcceptablePreOrders !== null &&
    bounds.preorderMeta.acceptedPreOrderCount >= bounds.preorderMeta.maximumAcceptablePreOrders
  ) {
    return 0;
  }
  if (bounds.preorder) {
    const availablePreorder =
      typeof available === "number" ? available : bounds.maxQuantity ?? undefined;
    if (typeof availablePreorder === "number") {
      if (availablePreorder < bounds.minQuantity) return 0;
      const cappedQty = Math.min(qty, availablePreorder);
      const preorderQty = Math.max(bounds.minQuantity, cappedQty);
      return Math.min(preorderQty, availablePreorder);
    }
  }
  if (typeof available === "number") {
    if (available < bounds.minQuantity) return 0;
    if (!bounds.preorder) {
      const cappedQty = Math.min(qty, available);
      return Math.max(bounds.minQuantity, cappedQty);
    }
    const cappedQty = Math.min(qty, available);
    const preorderQty = Math.max(bounds.minQuantity, cappedQty);
    return Math.min(preorderQty, available);
  }

  let nextQty = qty;
  if (bounds.maxQuantity != null) {
    nextQty = Math.min(nextQty, bounds.maxQuantity);
  }
  nextQty = Math.max(bounds.minQuantity, nextQty);
  if (bounds.maxQuantity != null) nextQty = Math.min(nextQty, bounds.maxQuantity);
  return nextQty;
}

function resolveFulfillmentFlags(id: string, shippingAvailable: unknown, storePickupAvailable: unknown) {
  const localProduct = findProduct(id) || findProduct(id.split("-")[0] || "");
  return {
    shippingAvailable:
      typeof shippingAvailable === "boolean"
        ? shippingAvailable
        : typeof localProduct?.shippingAvailable === "boolean"
        ? localProduct.shippingAvailable
        : undefined,
    storePickupAvailable:
      typeof storePickupAvailable === "boolean"
        ? storePickupAvailable
        : typeof localProduct?.storePickupAvailable === "boolean"
        ? localProduct.storePickupAvailable
        : undefined,
  };
}

function toRemoteCartItem(item: CartItem): RemoteCartItem {
  const { qty, ...product } = item;
  const baseProductId = cartProductId(item) || item.id;
  const variantId = String(productVariantId(item) || "").trim();
  const selectedVariant = variantId ? getProductVariant(item, variantId) : null;
  return {
    ...product,
    itemType: "product",
    _id: baseProductId,
    id: baseProductId,
    ...(variantId ? { selectedVariantId: variantId, groupId: variantId, variantId } : {}),
    ...(selectedVariant ? { selectedVariant } : {}),
    ...(item.orderRules ? { orderRules: item.orderRules } : {}),
    quantity: qty,
  } as unknown as RemoteCartItem;
}

const isSameCartLine = (
  item: Partial<Product>,
  target: Partial<Product> & { variantId?: string },
) =>
  cartProductId(item) === cartProductId(target) &&
  normalizeId(productVariantId(item)) === normalizeId(target.variantId ?? productVariantId(target)) &&
  Boolean(item.isBogoOfferItem) === Boolean(target.isBogoOfferItem);

const getCartLineKey = (item: Partial<Product>) =>
  [
    cartProductId(item),
    normalizeId(productVariantId(item)),
    item.isBogoOfferItem ? "bogo" : "paid",
    normalizeId(item.bogoPromotionId),
  ].join("__");

function fromRemoteCartItem(item: RemoteCartItem): CartItem | null {
  const id = String(item._id || item.id || "").trim();
  if (!id) return null;
  const name = String(item.name || "").trim();
  const price = Number(item.price || 0) || 0;
  const mrp = Number(item.mrp || price) || price;
  const image = String(item.image || "").trim();
  const extra = item as unknown as Partial<Product> & { images?: unknown };
  const category = String(extra.category || "").trim();
  const weight = String(extra.weight || "").trim();
  const rating = Number(extra.rating || 0) || 0;
  const badge = extra.badge;
  const createdAt = extra.createdAt;
  const stockStatus = extra.stockStatus;
  const slug = extra.slug;
  const description = extra.description;
  const images = extra.images;
  const brand = extra.brand;
  const catalogId = (extra as { catalogId?: unknown; catalogueId?: unknown }).catalogId;
  const catalogueId = (extra as { catalogId?: unknown; catalogueId?: unknown }).catalogueId;
  const selectedVariantId =
    (extra as {
      selectedVariantId?: unknown;
      groupId?: unknown;
      variantId?: unknown;
      selectedVariant?: { _id?: unknown; id?: unknown; name?: unknown };
    }).selectedVariantId ??
    (extra as { groupId?: unknown }).groupId ??
    (extra as { variantId?: unknown }).variantId ??
    (extra as { selectedVariant?: { _id?: unknown; id?: unknown; name?: unknown } }).selectedVariant?._id ??
    (extra as { selectedVariant?: { _id?: unknown; id?: unknown; name?: unknown } }).selectedVariant?.id;
  const pricing = (extra as { pricing?: unknown }).pricing;
  const variants = (extra as { variants?: unknown }).variants;
  const preorder = (extra as { preorder?: unknown }).preorder;
  const preOrder = (extra as { preOrder?: unknown }).preOrder;
  const orderRules = (extra as { orderRules?: unknown }).orderRules;
  const minQuantity =
    typeof (extra as { minQuantity?: unknown }).minQuantity === "number"
      ? (extra as { minQuantity?: number }).minQuantity
      : typeof (extra as { minOrderQuantity?: unknown }).minOrderQuantity === "number"
        ? (extra as { minOrderQuantity?: number }).minOrderQuantity
        : undefined;
  const maxQuantity =
    typeof (extra as { maxQuantity?: unknown }).maxQuantity === "number"
      ? (extra as { maxQuantity?: number }).maxQuantity
      : typeof (extra as { maxOrderQuantity?: unknown }).maxOrderQuantity === "number"
        ? (extra as { maxOrderQuantity?: number }).maxOrderQuantity
        : undefined;
  const flags = resolveFulfillmentFlags(id, extra.shippingAvailable, extra.storePickupAvailable);
  const dispatchPoints = normalizeDispatchPoints(extra.dispatchPoints);
  const storePickupDispatchPoint = normalizeStorePickupDispatchPoint(extra.storePickupDispatchPoint);
  const qty = Math.max(1, Math.floor(Number(item.quantity ?? item.qty ?? 1) || 1));
  if (!name) return null;
  return {
    id,
    name,
    category,
    weight,
    price,
    mrp,
    rating,
    image,
    ...(typeof badge === "string" ? { badge } : {}),
    ...(typeof createdAt === "string" ? { createdAt } : {}),
    ...(typeof stockStatus === "string" ? { stockStatus } : {}),
    ...(typeof slug === "string" ? { slug } : {}),
    ...(typeof description === "string" ? { description } : {}),
    ...(Array.isArray(images) ? { images } : {}),
    ...(typeof brand === "string" ? { brand } : {}),
    ...(typeof catalogId === "string" ? { catalogId } : {}),
    ...(typeof catalogueId === "string" ? { catalogueId } : {}),
    ...(typeof selectedVariantId === "string" ? { selectedVariantId } : {}),
    ...(isRecord(pricing) ? { pricing: pricing as Product["pricing"] } : {}),
    ...(Array.isArray(variants) ? { variants: variants as Product["variants"] } : {}),
    ...(typeof preorder !== "undefined" ? { preorder } : {}),
    ...(typeof preOrder !== "undefined" ? { preOrder } : {}),
    ...(orderRules && typeof orderRules === "object" ? { orderRules } : {}),
    ...(typeof minQuantity === "number" ? { minQuantity } : {}),
    ...(typeof maxQuantity === "number" ? { maxQuantity } : {}),
    ...(typeof (extra as { minOrderQuantity?: unknown }).minOrderQuantity === "number"
      ? { minOrderQuantity: (extra as { minOrderQuantity?: number }).minOrderQuantity }
      : {}),
    ...(typeof (extra as { maxOrderQuantity?: unknown }).maxOrderQuantity === "number"
      ? { maxOrderQuantity: (extra as { maxOrderQuantity?: number }).maxOrderQuantity }
      : {}),
    ...(extra.isOfferItem === true ? { isOfferItem: true } : {}),
    ...(extra.isBogoOfferItem === true ? { isBogoOfferItem: true } : {}),
    ...(extra.hasBogoOffer === true ? { hasBogoOffer: true } : {}),
    ...(extra.bogoApplied === true ? { bogoApplied: true } : {}),
    ...(extra.isBogoApplied === true ? { isBogoApplied: true } : {}),
    ...(typeof extra.offerType === "string" ? { offerType: extra.offerType } : {}),
    ...(typeof extra.bogoPromotionId === "string" ? { bogoPromotionId: extra.bogoPromotionId } : {}),
    ...(typeof extra.bogoPromotionCode === "string" ? { bogoPromotionCode: extra.bogoPromotionCode } : {}),
    ...(typeof extra.bogoSourceItemId === "string" ? { bogoSourceItemId: extra.bogoSourceItemId } : {}),
    ...(typeof extra.bogoFreeProductId === "string" ? { bogoFreeProductId: extra.bogoFreeProductId } : {}),
    ...(typeof extra.bogoFreeGroupId === "string" ? { bogoFreeGroupId: extra.bogoFreeGroupId } : {}),
    ...(typeof extra.bogoDiscountPercent === "number" && Number.isFinite(extra.bogoDiscountPercent)
      ? { bogoDiscountPercent: extra.bogoDiscountPercent }
      : {}),
    ...(typeof flags.shippingAvailable === "boolean" ? { shippingAvailable: flags.shippingAvailable } : {}),
    ...(typeof flags.storePickupAvailable === "boolean" ? { storePickupAvailable: flags.storePickupAvailable } : {}),
    ...(dispatchPoints.length > 0 ? { dispatchPoints } : {}),
    ...(storePickupDispatchPoint ? { storePickupDispatchPoint } : {}),
    qty,
  } as CartItem;
}

function mapRemoteItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.map(fromRemoteCartItem).filter((item): item is CartItem => Boolean(item));
}

const cartEventParams = (item: Pick<Product, "id" | "name" | "category" | "price">, quantity: number) => ({
  item_id: item.id,
  item_name: item.name,
  item_category: item.category,
  quantity,
  value: item.price * quantity,
  currency: "INR",
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bogoPromotions, setBogoPromotions] = useState<any[]>([]);
  const [bogoProductsById, setBogoProductsById] = useState<Record<string, any>>({});
  const { hydrated: authHydrated, isLoggedIn, session } = useCustomerAuth();
  const mergingCustomerRef = useRef("");
  const mergeStartVersionRef = useRef(0);
  const cartMutationVersionRef = useRef(0);
  const authSyncInitializedRef = useRef(false);
  const lastSyncedCustomerRef = useRef("");
  const itemsRef = useRef<CartItem[]>([]);
  const productDetailsByIdRef = useRef(new Map<string, Promise<Product>>());
  const dispatchPointByIdRef = useRef(
    new Map<string, Promise<Awaited<ReturnType<typeof getManualShippingDispatchPointById>>>>(),
  );

  const markUserCartMutation = useCallback(() => {
    cartMutationVersionRef.current += 1;
    return cartMutationVersionRef.current;
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const getProductDetailsByIdCached = useCallback((productId: string) => {
    const id = String(productId || "").trim();
    if (!id) return Promise.reject(new Error("Product ID is required"));

    const cached = productDetailsByIdRef.current.get(id);
    if (cached) return cached;

    const request = getCatalogueProductDetailsById(id).catch((error) => {
      productDetailsByIdRef.current.delete(id);
      throw error;
    });
    productDetailsByIdRef.current.set(id, request);
    return request;
  }, []);

  const getDispatchPointByIdCached = useCallback((dispatchPointId: string) => {
    const id = String(dispatchPointId || "").trim();
    if (!id) return Promise.reject(new Error("Dispatch point ID is required"));

    const cached = dispatchPointByIdRef.current.get(id);
    if (cached) return cached;

    const request = getManualShippingDispatchPointById(id).catch((error) => {
      dispatchPointByIdRef.current.delete(id);
      throw error;
    });
    dispatchPointByIdRef.current.set(id, request);
    return request;
  }, []);

  const customerId = session?.customerId ? String(session.customerId) : "";
  const canSyncRemote = hydrated && authHydrated && isLoggedIn && Boolean(customerId);

  const reconcileRemoteCart = useCallback((remoteItems: unknown, mutationVersion: number) => {
    if (cartMutationVersionRef.current !== mutationVersion) return;
    setItems(mapRemoteItems(remoteItems));
  }, []);

  const syncRemoteAction = useCallback(
    async (mutationVersion: number, action: () => Promise<{ data?: RemoteCartItem[]; success?: boolean }>) => {
      if (!canSyncRemote) return;
      try {
        setSyncing(true);
        const res = await action();
        if (res?.success === false) return;
        reconcileRemoteCart(res?.data, mutationVersion);
      } catch {
        // Keep optimistic local cart when remote cart update fails.
      } finally {
        setSyncing(false);
      }
    },
    [canSyncRemote, reconcileRemoteCart],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) setItems(sanitizeCartItems(JSON.parse(raw)));
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated || !authHydrated) return;
    try {
      if (!isLoggedIn && items.length > 0) {
        window.localStorage.setItem(GUEST_CART_PENDING_MERGE_KEY, "1");
      } else if (!isLoggedIn) {
        window.localStorage.removeItem(GUEST_CART_PENDING_MERGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [authHydrated, hydrated, isLoggedIn, items.length]);

  // When user logs in, merge guest cart into server cart and then hydrate from server (best-effort).
  useEffect(() => {
    if (!hydrated) return;
    if (!authHydrated) return;
    if (!isLoggedIn) {
      authSyncInitializedRef.current = true;
      lastSyncedCustomerRef.current = "";
      return;
    }
    if (!customerId) return;

    let cancelled = false;
    mergingCustomerRef.current = customerId;
    mergeStartVersionRef.current = cartMutationVersionRef.current;
    (async () => {
      setSyncing(true);
      try {
        const hasPendingGuestCart =
          typeof window !== "undefined" &&
          window.localStorage.getItem(GUEST_CART_PENDING_MERGE_KEY) === "1";
        const shouldMergeLocal =
          (authSyncInitializedRef.current && lastSyncedCustomerRef.current !== customerId) ||
          hasPendingGuestCart;
        const localCart = shouldMergeLocal ? itemsRef.current.map(toRemoteCartItem) : [];
        if (shouldMergeLocal && localCart.length) {
          await saveMergedRemoteCart({ customerId, cart: localCart });
        }
        const remote = await getRemoteCart({ customerId });
        if (!cancelled && cartMutationVersionRef.current === mergeStartVersionRef.current) {
          setItems(mapRemoteItems(remote?.data));
        }
        if (!cancelled) {
          authSyncInitializedRef.current = true;
          lastSyncedCustomerRef.current = customerId;
          window.localStorage.removeItem(GUEST_CART_PENDING_MERGE_KEY);
        }
      } catch {
        // ignore sync failures; local cart still works
      } finally {
        if (mergingCustomerRef.current === customerId) {
          mergingCustomerRef.current = "";
        }
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, authHydrated, isLoggedIn, customerId]);

  useEffect(() => {
    if (!hydrated) return;

    const missingPickupPointIds = Array.from(
      new Set(
        items
          .filter((item) => item.storePickupAvailable === true && !hasStorePickupDispatchPointDetails(item.storePickupDispatchPoint))
          .map((item) => cartProductId(item))
          .filter((id) => id.length > 0),
      ),
    );

    if (missingPickupPointIds.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          missingPickupPointIds.map(async (productId) => {
            const product = await getProductDetailsByIdCached(productId);
            const directPointId = extractStorePickupDispatchPointId(product.storePickupDispatchPoint);
            const storePickupDispatchPoint = directPointId
              ? normalizeResolvedPickupDispatchPoint(await getDispatchPointByIdCached(directPointId))
              : normalizeResolvedPickupDispatchPoint(product.storePickupDispatchPoint);
            return { productId, storePickupDispatchPoint };
          }),
        );

        if (cancelled) return;

        const resultMap = new Map(results.map((result) => [result.productId, result.storePickupDispatchPoint] as const));
        setItems((prev) => {
          let changed = false;
          const next = prev.map((item) => {
            if (item.storePickupAvailable !== true) return item;
            if (hasStorePickupDispatchPointDetails(item.storePickupDispatchPoint)) return item;
            const productId = cartProductId(item);
            const storePickupDispatchPoint = resultMap.get(productId);
            if (!storePickupDispatchPoint) return item;
            changed = true;
            return { ...item, storePickupDispatchPoint };
          });
          return changed ? next : prev;
        });
      } catch {
        // ignore; checkout can still retry resolution
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getDispatchPointByIdCached, getProductDetailsByIdCached, hydrated, items]);

  useEffect(() => {
    if (!hydrated) return;

    const missingDispatchPointIds = Array.from(
      new Set(
        items
          .filter((item) => item.shippingAvailable === true && normalizeDispatchPoints(item.dispatchPoints).length === 0)
          .map((item) => cartProductId(item))
          .filter((id) => id.length > 0),
      ),
    );

    if (missingDispatchPointIds.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          missingDispatchPointIds.map(async (productId) => {
            const product = await getProductDetailsByIdCached(productId);
            return {
              productId,
              dispatchPoints: normalizeDispatchPoints((product as Partial<Product>)?.dispatchPoints),
            };
          }),
        );

        if (cancelled) return;

        const resultMap = new Map(results.map((result) => [result.productId, result.dispatchPoints] as const));
        setItems((prev) => {
          let changed = false;
          const next = prev.map((item) => {
            if (item.shippingAvailable !== true) return item;
            const existing = normalizeDispatchPoints(item.dispatchPoints);
            if (existing.length > 0) return item;
            const productId = cartProductId(item);
            const dispatchPoints = resultMap.get(productId) || [];
            if (dispatchPoints.length === 0) return item;
            changed = true;
            return { ...item, dispatchPoints };
          });
          return changed ? next : prev;
        });
      } catch {
        // ignore; checkout can still retry resolution
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getProductDetailsByIdCached, hydrated, items]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await getActiveBogoPromotions();
        if (cancelled) return;
        const data = response?.data || {};
        setBogoPromotions(Array.isArray(data.promotions) ? data.promotions : []);
        setBogoProductsById(data.productsById && typeof data.productsById === "object" ? data.productsById : {});
      } catch {
        if (!cancelled) {
          setBogoPromotions([]);
          setBogoProductsById({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const bogoOfferSummaries = useMemo(() => {
    if (!bogoPromotions.length || !items.length) return [];

    return bogoPromotions
      .map((promotion) => {
        const bogo = promotion?.bogo || {};
        const freeProductId = normalizeId(bogo.freeProductId);
        const freeGroupId = normalizeId(bogo.freeGroupId || bogo.freeVariantId || bogo.freeVariant?._id);
        const freeProduct = bogoProductsById[freeProductId] || null;
        if (!freeProductId || !freeProduct) return null;

        const buyQty = Math.max(1, Number(bogo.buyQty || 1) || 1);
        const getQty = Math.max(1, Number(bogo.getQty || 1) || 1);
        const maxGetQty =
          bogo.maxGetQty === null || bogo.maxGetQty === ""
            ? null
            : Math.max(0, Number(bogo.maxGetQty || 0) || 0);
        const buyTargets = getBogoBuyTargets(promotion);
        if (!buyTargets.length) return null;

        const eligibleBuyRows = items.filter((item) => {
          if (item.isBogoOfferItem || item.isOfferItem) return false;
          return buyTargets.some((target) => {
            const sameProduct = productBaseId(item) === target.productId;
            const sameVariant = !target.groupId || normalizeId(productVariantId(item)) === normalizeId(target.groupId);
            return sameProduct && sameVariant;
          });
        });

        if (!eligibleBuyRows.length) return null;

        let freeQty = eligibleBuyRows.reduce((sum, item) => {
          const buyQuantity = Math.max(0, Number(item.qty || 0) || 0);
          return sum + Math.floor(buyQuantity / buyQty) * getQty;
        }, 0);
        if (maxGetQty !== null) freeQty = Math.min(freeQty, maxGetQty);

        const rawFreeStock = getProductAvailableQuantity(freeProduct, freeGroupId);
        const freeItemIsSameAsBuyItem = eligibleBuyRows.some((item) => {
          const sameProduct = productBaseId(item) === freeProductId;
          const sameVariant =
            !freeGroupId ||
            !normalizeId(productVariantId(item)) ||
            normalizeId(productVariantId(item)) === freeGroupId;
          return sameProduct && sameVariant;
        });
        const sameItemAvailableQty = freeItemIsSameAsBuyItem
          ? eligibleBuyRows.reduce((maxQty, item) => {
              const sameProduct = productBaseId(item) === freeProductId;
              const sameVariant =
                !freeGroupId ||
                !normalizeId(productVariantId(item)) ||
                normalizeId(productVariantId(item)) === freeGroupId;
              if (!sameProduct || !sameVariant) return maxQty;
              const itemStock = resolveAvailableStock(item);
              return typeof itemStock === "number" && itemStock > maxQty
                ? itemStock
                : maxQty;
            }, 0)
          : 0;
        const freeStock =
          freeItemIsSameAsBuyItem && sameItemAvailableQty > 0
            ? Math.max(
                sameItemAvailableQty,
                Number.isFinite(rawFreeStock) ? Number(rawFreeStock) : 0,
              )
            : rawFreeStock;
        const eligibleBuyRowIds = new Set(eligibleBuyRows.map((item) => item.id));
        const buyQuantity = eligibleBuyRows.reduce(
          (sum, item) => sum + Math.max(0, Number(item.qty || 0) || 0),
          0,
        );
        const reservedNormalQty = items.reduce((sum, item) => {
          if (item.isBogoOfferItem || item.isOfferItem) return sum;
          if (eligibleBuyRowIds.has(item.id)) return sum;
          const sameProduct = productBaseId(item) === freeProductId;
          const sameVariant = normalizeId(productVariantId(item)) === normalizeId(freeGroupId);
          return sameProduct && sameVariant ? sum + Math.max(0, Number(item.qty || 0) || 0) : sum;
        }, 0);
        const freeRemaining = Number.isFinite(freeStock)
          ? Math.max(
              0,
              Number(freeStock) -
                reservedNormalQty -
                (freeItemIsSameAsBuyItem ? buyQuantity : 0),
            )
          : Number.POSITIVE_INFINITY;
        if (Number.isFinite(freeRemaining)) freeQty = Math.min(freeQty, freeRemaining);
        freeQty = Math.max(0, freeQty);
        if (freeQty <= 0) return null;

        return {
          promotion,
          sourceItemId: eligibleBuyRows[0]?.id || "",
          sourceItemIds: eligibleBuyRows.map((item) => item.id).filter(Boolean),
          sourceProductId: productBaseId(eligibleBuyRows[0] || {}),
          sourceGroupId: productVariantId(eligibleBuyRows[0] || {}),
          freeProduct,
          freeProductId,
          freeGroupId,
          freeQty,
          offerRowId: `bogo:${normalizeId(promotion._id)}:${freeProductId}:${freeGroupId || "default"}`,
        };
      })
      .filter(Boolean);
  }, [bogoProductsById, bogoPromotions, items]);

  const buildBogoCartItem = useCallback((summary: any): CartItem | null => {
    const { promotion, freeProduct, freeProductId, freeGroupId, freeQty, offerRowId, sourceItemId } = summary || {};
    if (!promotion || !freeProduct || !freeProductId || !freeQty) return null;

    const freeVariant = getProductVariant(freeProduct, freeGroupId);
    const freeDiscountPercent = Math.max(
      0,
      Math.min(100, Number(promotion?.bogo?.freeDiscountPercent ?? 100) || 100),
    );
    const image = String(freeProduct.image || freeProduct.images?.[0] || "").trim();
    const variantLabel = String(freeVariant?.name || freeVariant?.label || "").trim();
    const baseName = String(freeProduct.name || "Free item").trim();
    const displayName =
      variantLabel && !baseName.toLowerCase().includes(variantLabel.toLowerCase())
        ? `${baseName} - ${variantLabel}`
        : baseName;
    const name = `${displayName} (BOGO offer)`;

    return {
      id: offerRowId,
      name,
      category: "",
      weight: variantLabel,
      price: 0,
      mrp: 0,
      pricing: {
        ...(freeProduct.pricing || {}),
        basePrice: 0,
        salePrice: 0,
      },
      rating: 0,
      image,
      images: image ? [image] : [],
      catalogId: String(freeProduct.catalogId || freeProduct.catalogueId || ""),
      catalogueId: String(freeProduct.catalogueId || freeProduct.catalogId || ""),
      selectedVariantId: freeGroupId || undefined,
      shippingAvailable: freeProduct?.shipping?.available === true,
      storePickupAvailable: freeProduct?.storePickupAvailable === true,
      dispatchPoints: normalizeDispatchPoints(freeProduct.dispatchPoints),
      storePickupDispatchPoint: normalizeStorePickupDispatchPoint(freeProduct.storePickupDispatchPoint),
      isOfferItem: true,
      isBogoOfferItem: true,
      hasBogoOffer: true,
      bogoApplied: true,
      isBogoApplied: true,
      offerType: "bogo",
      bogoPromotionId: normalizeId(promotion._id),
      bogoPromotionCode: String(promotion.code || ""),
      bogoSourceItemId: sourceItemId,
      bogoFreeProductId: freeProductId,
      bogoFreeGroupId: freeGroupId,
      bogoDiscountPercent: freeDiscountPercent,
      qty: freeQty,
    } as CartItem;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    setItems((prev) => {
      const summaryByRowId = new Map(bogoOfferSummaries.map((summary) => [summary.offerRowId, summary]));
      const qualifyingBuyIds = new Set(
        bogoOfferSummaries.flatMap((summary) =>
          Array.isArray(summary.sourceItemIds) ? summary.sourceItemIds.map(String) : [String(summary.sourceItemId)],
        ),
      );
      let changed = false;

      const next = prev
        .map((item) => {
          if (!item.isBogoOfferItem) {
            const shouldFlag = qualifyingBuyIds.has(item.id);
            const currentlyFlagged = item.hasBogoOffer || item.bogoApplied || item.isBogoApplied;
            if (shouldFlag && !currentlyFlagged) {
              changed = true;
              return { ...item, hasBogoOffer: true, bogoApplied: true, isBogoApplied: true };
            }
            if (!shouldFlag && currentlyFlagged) {
              const { hasBogoOffer, bogoApplied, isBogoApplied, ...rest } = item;
              changed = true;
              return rest as CartItem;
            }
            return item;
          }

          const summary = summaryByRowId.get(item.id);
          if (!summary) {
            changed = true;
            return null;
          }

          const offerItem = buildBogoCartItem(summary);
          if (
            offerItem &&
            (item.qty !== summary.freeQty ||
              !item.pricing ||
              item.name !== offerItem.name ||
              item.selectedVariantId !== offerItem.selectedVariantId ||
              item.bogoFreeGroupId !== offerItem.bogoFreeGroupId ||
              item.mrp !== offerItem.mrp ||
              item.price !== offerItem.price)
          ) {
            changed = true;
            return {
              ...item,
              ...offerItem,
            };
          }

          return item;
        })
        .filter((item): item is CartItem => Boolean(item));

      bogoOfferSummaries.forEach((summary) => {
        if (next.some((item) => item.id === summary.offerRowId)) return;
        const offerItem = buildBogoCartItem(summary);
        if (!offerItem) return;
        changed = true;
        next.push(offerItem);
      });

      return changed ? next : prev;
    });
  }, [bogoOfferSummaries, buildBogoCartItem, hydrated]);

  const add = useCallback((p: Product, qty = 1) => {
    if (p?.isBogoOfferItem) return;
    const mutationVersion = markUserCartMutation();
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => isSameCartLine(i, p));
      const ex = existingIndex >= 0 ? prev[existingIndex] : null;
      if (ex) {
        const stockQty = clampQuantityToStock(p, ex.qty + qty, prev, ex);
        const bogoMaxQty = getBogoStockAwareMaxQuantity({
          item: ex,
          cartItems: prev,
          bogoPromotions,
          bogoProductsById,
        });
        const nextQty =
          typeof bogoMaxQty === "number" ? Math.min(stockQty, bogoMaxQty) : stockQty;
        if (canSyncRemote) {
          const action =
            nextQty > 0
              ? () =>
                  updateRemoteCartItem({
                    customerId,
                    index: existingIndex,
                    field: "quantity",
                    value: nextQty,
                  })
              : () => removeRemoteCartItem({ customerId, index: existingIndex });
          void syncRemoteAction(mutationVersion, action);
        }
        const delta = nextQty - ex.qty;
        if (delta > 0) {
          trackAddToCart(cartEventParams(p, delta));
        } else if (delta < 0) {
          trackRemoveFromCart(cartEventParams(p, Math.abs(delta)));
        }
        return prev
          .map((i) => (isSameCartLine(i, p) ? { ...i, qty: nextQty } : i))
          .filter((i) => i.qty > 0);
      }

      if (qty <= 0) return prev;
      const stockQty = clampQuantityToStock(p, qty, prev, p);
      const bogoMaxQty = getBogoStockAwareMaxQuantity({
        item: { ...p, qty: stockQty } as CartItem,
        cartItems: prev,
        bogoPromotions,
        bogoProductsById,
      });
      const nextQty =
        typeof bogoMaxQty === "number" ? Math.min(stockQty, bogoMaxQty) : stockQty;
      if (nextQty <= 0) return prev;
      if (canSyncRemote) {
        void syncRemoteAction(mutationVersion, () =>
          addRemoteCartItem({
            customerId,
            item: toRemoteCartItem({ ...p, qty: nextQty } as CartItem),
          }),
        );
      }
      trackAddToCart(cartEventParams(p, nextQty));
      return [...prev, { ...p, qty: nextQty }];
    });
  }, [bogoProductsById, bogoPromotions, canSyncRemote, customerId, markUserCartMutation, syncRemoteAction]);

  const remove = useCallback((id: string, variantId?: string) => {
    const mutationVersion = markUserCartMutation();
    setItems((prev) => {
      const index = prev.findIndex((i) => isSameCartLine(i, { id, variantId }));
      if (index >= 0 && prev[index]?.isBogoOfferItem) return prev;
      if (index >= 0 && canSyncRemote) {
        void syncRemoteAction(mutationVersion, () => removeRemoteCartItem({ customerId, index }));
      }
      const item = index >= 0 ? prev[index] : null;
      if (item) {
        trackRemoveFromCart(cartEventParams(item, item.qty));
      }
      return prev.filter((i) => !isSameCartLine(i, { id, variantId }));
    });
  }, [canSyncRemote, customerId, markUserCartMutation, syncRemoteAction]);

  const setQty = useCallback((id: string, qty: number, variantId?: string) => {
    const mutationVersion = markUserCartMutation();
    setItems((prev) => {
      const index = prev.findIndex((i) => isSameCartLine(i, { id, variantId }));
      if (index < 0) return prev;
      const target = prev[index];
      if (target?.isBogoOfferItem) return prev;
      const stockQty = clampQuantityToStock(target, qty, prev, target);
      const bogoMaxQty = getBogoStockAwareMaxQuantity({
        item: target,
        cartItems: prev,
        bogoPromotions,
        bogoProductsById,
      });
      const nextQty =
        typeof bogoMaxQty === "number" ? Math.min(stockQty, bogoMaxQty) : stockQty;
      if (canSyncRemote) {
        const action =
          nextQty > 0
            ? () =>
                updateRemoteCartItem({
                  customerId,
                  index,
                  field: "quantity",
                  value: nextQty,
                })
            : () => removeRemoteCartItem({ customerId, index });
        void syncRemoteAction(mutationVersion, action);
      }
      const delta = nextQty - target.qty;
      if (delta > 0) {
        trackAddToCart(cartEventParams(target, delta));
      } else if (delta < 0) {
        trackRemoveFromCart(cartEventParams(target, Math.abs(delta)));
      }
      return prev
        .map((i) => (isSameCartLine(i, { id, variantId }) ? { ...i, qty: nextQty } : i))
        .filter((i) => i.qty > 0);
    });
  }, [bogoProductsById, bogoPromotions, canSyncRemote, customerId, markUserCartMutation, syncRemoteAction]);

  const clear = useCallback(() => {
    const mutationVersion = markUserCartMutation();
    if (canSyncRemote) {
      void syncRemoteAction(mutationVersion, () =>
        clearRemoteCart({ customerId }).then((res) => ({ ...res, data: [] })),
      );
    }
    if (itemsRef.current.length > 0) {
      trackEvent("cart_clear", {
        value: itemsRef.current.reduce((sum, item) => sum + item.price * item.qty, 0),
        items_count: itemsRef.current.length,
        currency: "INR",
      });
    }
    setItems([]);
  }, [canSyncRemote, customerId, markUserCartMutation, syncRemoteAction]);

  // If user logs out, keep local cart (already persisted).
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);

  // Clear remote cart when local cart becomes empty while logged-in (best-effort).
  useEffect(() => {
    if (!hydrated) return;
    if (!authHydrated || !isLoggedIn) return;
    const customerId = session?.customerId ? String(session.customerId) : "";
    if (!customerId) return;
    if (items.length !== 0) return;

    (async () => {
      try {
        await clearRemoteCart({ customerId });
      } catch {
        // ignore
      }
    })();
  }, [items.length, hydrated, authHydrated, isLoggedIn, session?.customerId]);

  return (
    <Ctx.Provider value={{ items, add, remove, setQty, clear, count, total, hydrated, syncing }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
};
