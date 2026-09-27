const fallbackProductImage = "";

const riceImage = fallbackProductImage;
const mattaImage = fallbackProductImage;
const chipsImage = fallbackProductImage;
const attaImage = fallbackProductImage;
const dalImage = fallbackProductImage;
const pickleImage = fallbackProductImage;
const gheeImage = fallbackProductImage;
const masalaImage = fallbackProductImage;
const biscuitImage = fallbackProductImage;

export const categories = [];

const defaultStorePickupDispatchPoint = {};

export type Product = {
  _id?: string;
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  categoryImage?: string;
  weight: string;
  price: number;
  mrp: number;
  rating: number;
  image: string;
  badge?: string;
  createdAt?: string;
  stockStatus?: string;
  slug?: string;
  description?: string;
  additionalDescription?: string;
  images?: string[];
  brand?: string;
  catalogId?: string;
  catalogueId?: string;
  isOfferItem?: boolean;
  isBogoOfferItem?: boolean;
  hasBogoOffer?: boolean;
  bogoApplied?: boolean;
  isBogoApplied?: boolean;
  offerType?: string;
  bogoPromotionId?: string;
  bogoPromotionCode?: string;
  bogoSourceItemId?: string;
  bogoFreeProductId?: string;
  bogoFreeGroupId?: string;
  bogoDiscountPercent?: number;
  pricing?: {
    expiryDate?: any;
    basePrice?: number;
    salePrice?: number | null;
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
  orderRules?: {
    minimumQuantity?: number;
    maximumQuantity?: number;
  };
  shippingAvailable?: boolean;
  storePickupAvailable?: boolean;
  dispatchPoints?: string[];
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
  inventory?: {
    stockStatus?: string;
    totalQuantity?: number;
  };
  variants?: Array<{
    _id?: string;
    id?: string;
    groupId?: string;
    variantId?: string;
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
  // cart-only helper for variant items
  selectedVariantId?: string;
  expiryDate?: any;
  productExpiryDate?: any;
};

export const isOutOfStock = (
  product: Pick<Product, "stockStatus" | "badge">,
) => {
  const status = product.stockStatus ?? product.badge ?? "";
  return status.toLowerCase() === "out of stock";
};

export const sortOutOfStockLast = <
  T extends Pick<Product, "stockStatus" | "badge">,
>(
  products: T[],
) =>
  [...products].sort(
    (a, b) => Number(isOutOfStock(a)) - Number(isOutOfStock(b)),
  );

const make = (arr: Omit<Product, "id">[]): Product[] =>
  arr.map((p, i) => ({
    ...p,
    shippingAvailable: p.shippingAvailable ?? true,
    storePickupAvailable: p.storePickupAvailable ?? true,
    dispatchPoints: p.dispatchPoints ?? [],
    storePickupDispatchPoint:
      p.storePickupDispatchPoint ?? defaultStorePickupDispatchPoint,
    id: `${p.name}-${i}`.replace(/\s+/g, "-").toLowerCase(),
  }));

export const allProducts = (): Product[] => [
  ...newArrivals,
  ...mattaProducts,
  ...chipsProducts,
];
export const findProduct = (id: string) =>
  allProducts().find((p) => p.id === id);

export const newArrivals = make([]);

export const mattaProducts = make([]);

export const chipsProducts = make([]);
