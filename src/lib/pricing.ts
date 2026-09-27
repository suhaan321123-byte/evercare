import type { Product } from "@/data/catalog";

export type ProductVariant = {
  id: string;
  label: string;
  weight: string;
  price: number;
  mrp: number;
  preorder?: boolean;
  preOrder?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  orderRules?: {
    minimumQuantity?: number;
    maximumQuantity?: number;
  };
};

export function getTaxRateForProduct(product: Product) {
  // Match Thach behavior: tax only when pricing.taxApplicable is true and taxRate is %.
  if (!product?.pricing?.taxApplicable) return 0;
  const rate = Number(product?.pricing?.taxRate || 0) || 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return rate / 100;
}

export function money(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);

  return formatted;
}

export function priceWithTax(price: number, taxRate: number) {
  const p = Number(price) || 0;
  const r = Number(taxRate) || 0;
  return p + p * r;
}

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const toPositiveInteger = (value: unknown) => {
  const quantity = Math.floor(Number(value) || 0);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
};

const getQuantityBoundsFromOrderRules = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return { minQuantity: null, maxQuantity: null };
  }

  const rules = value as {
    minimumQuantity?: unknown;
    maximumQuantity?: unknown;
  };

  return {
    minQuantity: toPositiveInteger(rules.minimumQuantity),
    maxQuantity: toPositiveInteger(rules.maximumQuantity),
  };
};

const getPreorderMeta = (value: unknown) => {
  if (typeof value === "boolean") {
    return { enabled: value, maximumAcceptablePreOrders: null, acceptedPreOrderCount: 0, tier: "" };
  }
  if (!value || typeof value !== "object") {
    return { enabled: false, maximumAcceptablePreOrders: null, acceptedPreOrderCount: 0, tier: "" };
  }

  const preorder = value as {
    enabled?: unknown;
    maximumAcceptablePreOrders?: unknown;
    acceptedPreOrderCount?: unknown;
    tier?: unknown;
  };

  const enabled = preorder.enabled === true;
  const maximumAcceptablePreOrders =
    preorder.maximumAcceptablePreOrders === null ||
    preorder.maximumAcceptablePreOrders === undefined ||
    preorder.maximumAcceptablePreOrders === ""
      ? null
      : toPositiveInteger(preorder.maximumAcceptablePreOrders);
  const acceptedPreOrderCount = Math.max(
    0,
    Math.floor(Number(preorder.acceptedPreOrderCount || 0) || 0),
  );

  return {
    enabled,
    maximumAcceptablePreOrders,
    acceptedPreOrderCount,
    tier: String(preorder.tier || "").trim(),
  };
};

const getPreorderSource = (
  resolvedVariant: unknown,
  product: Product,
  pricing: Product["pricing"],
) => {
  if (resolvedVariant && typeof resolvedVariant === "object" && "preorder" in resolvedVariant) {
    return (resolvedVariant as { preorder?: unknown }).preorder;
  }
  if (product && Object.prototype.hasOwnProperty.call(product, "preorder")) {
    return product.preorder;
  }
  if (product && Object.prototype.hasOwnProperty.call(product, "preOrder")) {
    return product.preOrder;
  }
  if (pricing && Object.prototype.hasOwnProperty.call(pricing, "preorder")) {
    return pricing.preorder;
  }
  return undefined;
};

const getVariantOrProductSource = (product: Product, variant?: Product["variants"][number] | null) => {
  if (variant) return variant;
  const selectedVariantId = String(product?.selectedVariantId || "").trim();
  if (selectedVariantId && Array.isArray(product?.variants) && product.variants.length > 0) {
    const hit =
      product.variants.find((item) =>
        [item?._id, item?.id, (item as any)?.groupId, (item as any)?.variantId, item?.name]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .includes(selectedVariantId),
      ) || null;
    if (hit) return hit;
  }
  return Array.isArray(product?.variants) && product.variants.length > 0 ? product.variants[0] : null;
};

export function getOrderQuantityBounds(
  product: Product,
  variant?: Product["variants"][number] | null,
) {
  const resolvedVariant = getVariantOrProductSource(product, variant) as
    | (Product["variants"][number] & {
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
      })
    | null;
  const pricing = product?.pricing || {};
  const preorderSource = getPreorderSource(resolvedVariant, product, pricing);
  const preorderMeta = getPreorderMeta(preorderSource);
  const preorder =
    preorderMeta.enabled &&
    (preorderMeta.maximumAcceptablePreOrders === null ||
      preorderMeta.acceptedPreOrderCount < preorderMeta.maximumAcceptablePreOrders);
  const variantOrderRules = getQuantityBoundsFromOrderRules(resolvedVariant?.orderRules);
  const productOrderRules = getQuantityBoundsFromOrderRules((product as { orderRules?: unknown })?.orderRules);
  const pricingOrderRules = getQuantityBoundsFromOrderRules((pricing as { orderRules?: unknown })?.orderRules);
  const minQuantity =
    variantOrderRules.minQuantity ??
    toPositiveInteger(
      resolvedVariant?.minQuantity ??
        resolvedVariant?.minOrderQuantity ??
        product?.minQuantity ??
        product?.minOrderQuantity ??
        pricing?.minQuantity ??
        pricing?.minOrderQuantity,
    ) ??
    productOrderRules.minQuantity ??
    pricingOrderRules.minQuantity ??
    1;
  let maxQuantity =
    variantOrderRules.maxQuantity ??
    toPositiveInteger(
      resolvedVariant?.maxQuantity ??
        resolvedVariant?.maxOrderQuantity ??
        product?.maxQuantity ??
        product?.maxOrderQuantity ??
        pricing?.maxQuantity ??
        pricing?.maxOrderQuantity,
    ) ??
    productOrderRules.maxQuantity ??
    pricingOrderRules.maxQuantity ??
    null;

  if (maxQuantity !== null && maxQuantity < minQuantity) {
    maxQuantity = minQuantity;
  }

  return {
    preorder,
    preorderMeta,
    minQuantity,
    maxQuantity,
  };
}

export function getEffectivePurchaseLimit(
  product: Product,
  variant?: Product["variants"][number] | null,
) {
  const bounds = getOrderQuantityBounds(product, variant);
  const variantId = String(product.selectedVariantId || "").trim();
  const hasSelectedVariant = Boolean(
    variant || (variantId && Array.isArray(product.variants) && product.variants.length > 0),
  );
  const resolvedVariant =
    variant ||
    (hasSelectedVariant && Array.isArray(product.variants)
      ? product.variants.find((item) =>
          [item?._id, item?.id, (item as any)?.groupId, (item as any)?.variantId, item?.name]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .includes(variantId),
        ) || null
      : null);
  const stockLimit = (() => {
    if (resolvedVariant) {
      const raw = resolvedVariant?.stock;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        return Math.max(0, Math.floor(raw));
      }
    }
    const inv = product.inventory?.totalQuantity;
    if (typeof inv === "number" && Number.isFinite(inv)) {
      return Math.max(0, Math.floor(inv));
    }
    const status = String(product.inventory?.stockStatus || "").toLowerCase();
    if (status === "out of stock") return 0;
    return undefined;
  })();

  if (bounds.preorder) {
    const limit = bounds.preorderMeta?.maximumAcceptablePreOrders;
    const preorderRemaining =
      limit === null || limit === undefined
        ? undefined
        : Math.max(0, limit - (bounds.preorderMeta?.acceptedPreOrderCount || 0));
    if (typeof preorderRemaining === "number" && preorderRemaining < bounds.minQuantity) {
      return 0;
    }
    if (preorderRemaining === undefined) {
      return bounds.maxQuantity ?? undefined;
    }
    if (bounds.maxQuantity === null || bounds.maxQuantity === undefined) {
      return preorderRemaining;
    }
    return Math.min(preorderRemaining, bounds.maxQuantity);
  }

  if (typeof stockLimit === "number") {
    if (stockLimit < bounds.minQuantity) return 0;
    return bounds.maxQuantity == null ? stockLimit : Math.min(stockLimit, bounds.maxQuantity);
  }

  if (bounds.maxQuantity != null && bounds.maxQuantity < bounds.minQuantity) {
    return 0;
  }

  return bounds.maxQuantity ?? undefined;
}

export function taxIncludedPriceForProduct(product: Product, price: number) {
  return round2(priceWithTax(price, getTaxRateForProduct(product)));
}

export function taxIncludedPricesForProduct(
  product: Product,
  opts?: { salePrice?: number; basePrice?: number },
) {
  const sale = opts?.salePrice ?? product.price;
  const base = opts?.basePrice ?? product.mrp;

  return {
    price: taxIncludedPriceForProduct(product, sale),
    mrp: taxIncludedPriceForProduct(product, base),
  };
}

export function taxAmount(price: number, taxRate: number) {
  const p = Number(price) || 0;
  const r = Number(taxRate) || 0;
  return p * r;
}

export function toTaxIncludedProduct(product: Product, opts?: { salePrice?: number; basePrice?: number }) {
  const { price: saleInc, mrp: baseInc } = taxIncludedPricesForProduct(product, opts);
  return {
    ...product,
    price: saleInc,
    mrp: baseInc,
  } as Product;
}

const makeVariant = (id: string, label: string, weight: string, price: number, mrp: number): ProductVariant => ({
  id,
  label,
  weight,
  price: Math.max(0, round2(price)),
  mrp: Math.max(0, round2(mrp)),
});

export function buildDefaultVariants(product: Product): ProductVariant[] {
  // Template: no implicit variants. Only show variants if backend provides them.
  return [];
}

export function getProductVariants(product: Product): ProductVariant[] {
  const fromProduct = product?.variants;
  if (!Array.isArray(fromProduct) || fromProduct.length === 0) return [];

  const mapped = fromProduct
    .map((row) => {
      const id = String(row._id || row.id || row.name || "").trim();
      const label = String(row.name || id).trim();
      const weight = String(row.weight ?? label).trim();
      const base = Number(row.basePrice ?? 0) || 0;
      const sale =
        row.salePrice == null ? base : Number(row.salePrice ?? base) || base;
      const price = sale || base;
      const mrp = base || price;
      if (!id || !label) return null;
      return {
        ...makeVariant(id, label, weight || label, price, mrp),
        ...(row.orderRules ? { orderRules: row.orderRules } : {}),
      };
    })
    .filter(Boolean) as ProductVariant[];

  return mapped.length ? mapped : [];
}

export function getAvailableStock(product: Product) {
  return getEffectivePurchaseLimit(product);
}

export function isOutOfStockProduct(product: Product) {
  const bounds = getOrderQuantityBounds(product);
  const available = getAvailableStock(product);
  if (typeof available === "number") return available <= 0;
  if (bounds.preorder) return false;
  if (bounds.preorderMeta?.enabled) return true;
  const status = String(product.inventory?.stockStatus || "").toLowerCase();
  if (status === "out of stock") return true;
  return false;
}

export function getStockBadgeLabel(stockCount?: number) {
  if (typeof stockCount !== "number" || !Number.isFinite(stockCount)) return undefined;
  const safeStock = Math.max(0, Math.floor(stockCount));
  if (safeStock <= 0) return "Out of Stock";
  if (safeStock < 3) return `Only ${safeStock} Left`;
  if (safeStock < 6) return "Limited Stock";
  if (safeStock < 10) return "Selling Fast";
  return undefined;
}

export function getPreorderBadgeLabel(product: Product) {
  const bounds = getOrderQuantityBounds(product);
  if (!bounds.preorder) return undefined;
  const limit = bounds.preorderMeta?.maximumAcceptablePreOrders;
  const remaining =
    limit === null || limit === undefined
      ? null
      : Math.max(0, limit - (bounds.preorderMeta?.acceptedPreOrderCount || 0));
  if (remaining !== null) {
    return remaining > 0 ? `Pre-order ${remaining} left` : "Pre-order closed";
  }
  return "Pre-order";
}
