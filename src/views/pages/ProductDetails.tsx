import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Minus,
  Plus,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingCart,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  findProduct,
  allProducts,
  sortOutOfStockLast,
  type Product,
} from "@/data/catalog";
import {
  useCatalogueProductDetails,
  usePagedCatalogueProducts,
} from "@/services/catalogues";
import { useCart } from "@/context/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CartSheet from "@/components/CartSheet";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import {
  getAvailableStock,
  getOrderQuantityBounds,
  getPreorderBadgeLabel,
  getProductVariants,
  getStockBadgeLabel,
  getTaxRateForProduct,
  isOutOfStockProduct,
  money,
  priceWithTax,
  taxAmount,
  taxIncludedPriceForProduct,
  toTaxIncludedProduct,
} from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { trackEvent, trackViewProduct } from "@/lib/analytics";
import ProductReviews from "./productReviews/productReviews";
// WhatsApp seller phone number - replace with actual seller number
const SELLER_PHONE = "918951982743"; // WhatsApp requires the country code without a leading +

const ProductDetails = () => {
  const { id } = useParams();
  const productId = Array.isArray(id) ? id[0] : id;
  const navigate = useNavigate();
  const productDetails = useCatalogueProductDetails(productId);
  const product = productDetails.data?.product;
  const reviews = productDetails.data?.reviews;
  const isMobile = useIsMobile();
  const { add, remove, items, count } = useCart();
  const [qty, setQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const modalSearchPage = usePagedCatalogueProducts({
    search: searchQuery.trim() || undefined,
    page: 1,
    limit: 50,
    enabled: searchOpen,
  });
  const viewedProductRef = useRef("");
  const variants = useMemo(
    () => (product ? getProductVariants(product) : []),
    [product],
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const orderBounds = product
    ? getOrderQuantityBounds(
        product,
        variants.find((variant) => variant.id === selectedVariantId) as any,
      )
    : { preorder: false, minQuantity: 1, maxQuantity: null };

  // Reset selected image index when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product]);

  useEffect(() => {
    const fallback = variants[0]?.id ?? "";
    if (!fallback) {
      setSelectedVariantId("");
      return;
    }

    // Default select: first in-stock variant (if stock exists), otherwise the first variant.
    const rawVariants: any[] = Array.isArray((product as any)?.variants)
      ? ((product as any).variants as any[])
      : [];
    if (rawVariants.length > 0) {
      for (const v of variants) {
        const hit =
          rawVariants.find(
            (rv) => String(rv?._id || rv?.id || "").trim() === v.id,
          ) ||
          rawVariants.find((rv) => String(rv?.name || "").trim() === v.id) ||
          null;
        const stock = hit?.stock;
        const preorderAllowed = getOrderQuantityBounds(
          product as Product,
          hit || undefined,
        ).preorder;
        if (
          (typeof stock === "number" && Number.isFinite(stock) && stock > 0) ||
          preorderAllowed
        ) {
          setSelectedVariantId(v.id);
          return;
        }
      }
    }

    setSelectedVariantId(fallback);
  }, [product, variants]);

  useEffect(() => {
    if (!product) return;
    const viewKey = `${product.id}:${product.name}`;
    if (viewedProductRef.current === viewKey) return;
    viewedProductRef.current = viewKey;

    trackViewProduct({
      itemId: product.id,
      itemName: product.name,
      itemCategory: product.category,
      price: product.price,
      currency: "INR",
    });
  }, [product]);

  useEffect(() => {
    if (!product) return;
    setQty(orderBounds.minQuantity);
  }, [orderBounds.minQuantity, product, selectedVariantId]);

  const selectedCartItem = useMemo(() => {
    const baseProductId = String(product?.id || "").trim();
    const variantId = String(selectedVariantId || "").trim();
    if (!baseProductId) return null;

    return (
      items.find((item) => {
        const sameProduct = String(item.id || "").trim() === baseProductId;
        if (!sameProduct) return false;
        if (!variantId) return !String(item.selectedVariantId || "").trim();
        return String(item.selectedVariantId || "").trim() === variantId;
      }) || null
    );
  }, [items, product?.id, selectedVariantId]);

  if (!product && productDetails.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {!isMobile && (
          <>
            <Header />
            <MegaMenu />
          </>
        )}
        <main className={isMobile ? "px-4 py-4" : "container py-8"}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={`product-detail-thumb-${index}`}
                    className="aspect-square rounded-xl"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-10 w-4/5 rounded-full" />
              <Skeleton className="h-4 w-40 rounded-full" />
              <div className="border-y border-border py-4">
                <Skeleton className="h-10 w-40 rounded-full" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-11/12 rounded-full" />
                <Skeleton className="h-4 w-3/4 rounded-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-14 flex-1 rounded-full" />
                <Skeleton className="h-14 flex-1 rounded-full" />
                <Skeleton className="h-14 w-14 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={`product-detail-info-${index}`}
                    className="h-24 rounded-xl"
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Product not found</p>
          <Link to="/" className="text-primary underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const hasVariants = variants.length > 0;
  const basePrice = hasVariants
    ? (selectedVariant?.mrp ?? product.mrp)
    : product.mrp;
  const salePrice = hasVariants
    ? (selectedVariant?.price ?? product.price)
    : product.price;
  const discount =
    basePrice > salePrice
      ? Math.round(((basePrice - salePrice) / basePrice) * 100)
      : 0;
  const products = allProducts();
  const relatedSource =
    productDetails.data?.relatedItems &&
    productDetails.data.relatedItems.length > 0
      ? productDetails.data.relatedItems
      : products.filter((p) => p.id !== product.id);
  const related = sortOutOfStockLast(relatedSource).slice(0, isMobile ? 4 : 6);
  const modalProducts = modalSearchPage.data?.products?.length
    ? modalSearchPage.data.products
    : products;
  const searchResults = normalizedSearch
    ? modalProducts
        .filter((p) =>
          [p.name, p.category, p.weight, p.badge]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch)),
        )
        .slice(0, 50)
    : modalProducts.slice(0, 50);
  const selectedProductBase: Product =
    hasVariants && selectedVariant
      ? {
          ...product,
          name: `${product.name} (${selectedVariant.label})`,
          weight: selectedVariant.weight,
          price: salePrice,
          mrp: basePrice,
          selectedVariantId: selectedVariant.id,
        }
      : {
          ...product,
          price: salePrice,
          mrp: basePrice,
        };

  // Store tax-included prices in cart items (matches Thach behavior).
  const selectedProduct: Product = toTaxIncludedProduct(selectedProductBase, {
    salePrice,
    basePrice,
  });

  const taxRate = getTaxRateForProduct(product);
  const priceIncTax = priceWithTax(salePrice, taxRate);
  const mrpIncTax = priceWithTax(basePrice, taxRate);
  const tax = taxAmount(salePrice, taxRate);
  const cartQty = selectedCartItem?.qty ?? 0;

  const availableStockResolved = getAvailableStock(selectedProduct);
  const stockBadgeLabel = orderBounds.preorder
    ? getPreorderBadgeLabel(selectedProduct)
    : getStockBadgeLabel(availableStockResolved);
  const isOutOfStock = isOutOfStockProduct(selectedProduct);
  const selectedQtyLimit =
    typeof availableStockResolved === "number"
      ? availableStockResolved
      : undefined;
  const canIncreaseSelectedQty =
    typeof selectedQtyLimit === "number" ? qty < selectedQtyLimit : true;

  // Get images based on selected variant
  const getProductImages = () => {
    // If there's a selected variant and it has images, use those
    if (hasVariants && selectedVariant) {
      const variantData = (product as any)?.variants?.find(
        (v: any) => String(v._id || v.id) === selectedVariant.id,
      );
      if (variantData?.images && variantData.images.length > 0) {
        return variantData.images
          .map((image: string) => String(image || "").trim())
          .filter(Boolean);
      }
    }

    // Fallback to main product images
    return (
      product.images && product.images.length > 0
        ? product.images
        : [product.image]
    )
      .map((image) => String(image || "").trim())
      .filter(Boolean);
  };

  const productImages = getProductImages();
  const productDescription = product.description;
  const additionalProductDescription = product.additionalDescription;
  const crossSellProducts = productDetails.data?.crossSellProducts ?? [];

  // Get expiry date from selected variant or main product
  const getExpiryDate = () => {
    // Check if selected variant has expiry date
    if (hasVariants && selectedVariant) {
      const variantData = (product as any)?.variants?.find(
        (v: any) => String(v._id || v.id) === selectedVariant.id,
      );
      if (variantData?.expiryDate) {
        return variantData.expiryDate;
      }
    }
    // Fallback to main product expiry date
    return product.productExpiryDate || product.pricing?.expiryDate || null;
  };

  const expiryDate = getExpiryDate();

  // Format expiry date
  const formatExpiryDate = (date: string) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Check if expiry date is expired
  const isExpired = (date: string) => {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    return expiry < now;
  };

  const formattedExpiryDate = expiryDate ? formatExpiryDate(expiryDate) : null;
  const isExpiredValue = expiryDate ? isExpired(expiryDate) : false;

  // WhatsApp message function
  const handleWhatsAppClick = () => {
    // Get product details for the message
    const productName = product.name;
    const variantName =
      hasVariants && selectedVariant ? ` (${selectedVariant.label})` : "";
    const weight = selectedVariant?.weight ?? product.weight;
    const price = money(priceIncTax);
    const productUrl = window.location.href;

    // Create the message
    const message =
      `Hi! I'm interested in: %0A%0A` +
      `📦 *${productName}${variantName}*%0A` +
      `⚖️ Weight: ${weight}g%0A` +
      `💰 Price: ${price}%0A` +
      `🔗 Product Link: ${productUrl}%0A%0A` +
      `Could you please provide more information?`;

    // WhatsApp URL
    const whatsappUrl = `https://wa.me/${SELLER_PHONE}?text=${message}`;

    // Open WhatsApp in new window
    window.open(whatsappUrl, "_blank");
  };

  const handleCartQtyChange = (delta: number) => {
    // Prefer variant stock when available, fallback to inventory.
    const availableStock =
      typeof availableStockResolved === "number"
        ? availableStockResolved
        : hasVariants &&
            selectedVariant &&
            typeof (selectedVariant as any).stock === "number"
          ? Math.max(0, Math.floor(Number((selectedVariant as any).stock) || 0))
          : undefined;
    if (typeof availableStock === "number") {
      if (availableStock <= 0) {
        toast({ title: "Out of stock", variant: "destructive" });
        return;
      }
      if (delta > 0 && cartQty + delta > availableStock) {
        toast({
          title: "Limited stock",
          description: `Only ${availableStock} left`,
          variant: "destructive",
        });
        return;
      }
    }

    if (delta < 0 && cartQty <= orderBounds.minQuantity) {
      remove(selectedProduct.id, selectedProduct.selectedVariantId);
      return;
    }

    add(selectedProduct, delta);
  };

  const canIncreaseQty =
    !isOutOfStock &&
    (typeof availableStockResolved !== "number" ||
      cartQty < availableStockResolved);

  const crossSellSection = crossSellProducts.length > 0 && (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Frequently Bought Together
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {crossSellProducts.slice(0, 4).map((item: any) => {
          const productItem = item.itemId || item;
          return (
            <div
              key={productItem.id || productItem._id}
              role="link"
              tabIndex={0}
              onClick={() =>
                navigate(`/product/${productItem.slug ?? productItem.id}`)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/product/${productItem.slug ?? productItem.id}`);
                }
              }}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-2 text-left shadow-soft transition-smooth hover:border-primary"
            >
              {productItem.images && productItem.images.length > 0 ? (
                <img
                  src={productItem.images[0]}
                  alt={productItem.name}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <ImagePlaceholder
                  label={`${productItem.name} image unavailable`}
                  className="h-14 w-14 shrink-0 rounded-lg"
                  iconClassName="h-6 w-6"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-bold leading-snug text-foreground">
                  {productItem.name}
                </p>
                <p className="mt-1 text-sm font-extrabold text-primary">
                  {money(
                    taxIncludedPriceForProduct(
                      productItem,
                      productItem.price || productItem.pricing?.salePrice,
                    ),
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  add(toTaxIncludedProduct(productItem));
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft"
                aria-label={`Add ${productItem.name} to cart`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---------------- MOBILE ----------------
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background border-b border-border flex items-center justify-between px-3 py-2">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <a href="/" className="flex items-center gap-2">
            <img
              src="/evercaremed_logo.png"
              alt="EvercareMed"
              className="block h-10 w-auto max-w-[120px] object-contain"
            />
          </a>
          <div className="flex items-center gap-2">
            <button
              className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
              aria-label="Share product"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="relative bg-muted">
          {productImages[selectedImageIndex] ? (
            <img
              src={productImages[selectedImageIndex]}
              alt={product.name}
              className="w-full aspect-square object-cover"
            />
          ) : (
            <ImagePlaceholder
              label={`${product.name} image unavailable`}
              className="aspect-square"
              iconClassName="h-14 w-14"
            />
          )}
          {product.badge &&
            !["Selling Fast", "Limited Stock"].includes(product.badge) &&
            !/^Only \d+ Left$/.test(product.badge) && (
              <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
                {product.badge}
              </Badge>
            )}
          {discount > 0 && (
            <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
              {discount}% OFF
            </div>
          )}
          <button className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-card flex items-center justify-center shadow-card">
            <Heart className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Thumbnail Gallery */}
        {productImages.length > 1 && (
          <div className="px-4 py-3">
            <div className="product-image-scrollbar flex gap-2 overflow-x-auto pb-2">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-smooth ${
                    selectedImageIndex === index
                      ? "border-primary"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {product.category}
          </p>
          <h1 className="text-xl font-extrabold text-foreground">
            {product.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedVariant?.weight ?? product.weight}
          </p>
          <div className="flex flex-col items-start gap-1">
            <span className="text-2xl font-extrabold text-primary">
              {money(priceIncTax)}
            </span>
            {mrpIncTax > priceIncTax ? (
              <span className="text-sm text-muted-foreground line-through">
                {money(mrpIncTax)}
              </span>
            ) : null}
            {discount > 0 && (
              <span className="text-xs font-bold text-accent">
                Save {discount}%
              </span>
            )}
          </div>

          {/* Best Before Date - Mobile */}
          {formattedExpiryDate && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                isExpiredValue
                  ? "border-red-500/30 bg-red-500/10 text-red-600"
                  : "border-green-500/30 bg-green-500/10 text-green-700"
              }`}
            >
              {isExpiredValue ? (
                <>Expired: {formattedExpiryDate}</>
              ) : (
                <>Best Before: {formattedExpiryDate}</>
              )}
            </div>
          )}

          {additionalProductDescription ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 shadow-sm">
              <div
                className="text-sm leading-relaxed text-amber-950 [&_a]:font-semibold [&_a]:text-amber-800 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_em]:italic [&_h1]:mb-3 [&_h1]:text-base [&_h1]:font-extrabold [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-amber-950 [&_span]:text-inherit [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{
                  __html: additionalProductDescription,
                }}
              />
            </div>
          ) : null}

          {stockBadgeLabel ? (
            <div
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                stockBadgeLabel === "Selling Fast"
                  ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                  : stockBadgeLabel === "Out of Stock"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-accent/30 bg-accent/10 text-accent"
              }`}
            >
              {stockBadgeLabel}
            </div>
          ) : null}

          {variants.length > 1 && (
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Select Variant
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const active = variant.id === selectedVariant?.id;
                  const rawVariants: any[] = Array.isArray(
                    (product as any)?.variants,
                  )
                    ? ((product as any).variants as any[])
                    : [];
                  const hit =
                    rawVariants.find(
                      (rv) =>
                        String(rv?._id || rv?.id || "").trim() === variant.id,
                    ) ||
                    rawVariants.find(
                      (rv) => String(rv?.name || "").trim() === variant.id,
                    ) ||
                    null;
                  const preorderAllowed = hit
                    ? getOrderQuantityBounds(product as Product, hit).preorder
                    : false;
                  const disabled =
                    !preorderAllowed &&
                    typeof hit?.stock === "number" &&
                    Number.isFinite(hit.stock) &&
                    hit.stock <= 0;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setSelectedImageIndex(0);
                      }}
                      disabled={disabled}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition-smooth disabled:opacity-50 disabled:cursor-not-allowed ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary"
                      }`}
                    >
                      {variant.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm font-semibold">Qty</span>
            <div className="inline-flex items-center border border-border rounded-full overflow-hidden">
              <button
                onClick={() =>
                  setQty((q) => Math.max(orderBounds.minQuantity, q - 1))
                }
                disabled={qty <= orderBounds.minQuantity}
                className="h-9 w-9 flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button
                onClick={() =>
                  setQty((current) =>
                    typeof selectedQtyLimit === "number"
                      ? Math.min(current + 1, selectedQtyLimit)
                      : current + 1,
                  )
                }
                disabled={isOutOfStock || !canIncreaseSelectedQty}
                className="h-9 w-9 flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* WhatsApp Button - Mobile */}
          <Button
            onClick={handleWhatsAppClick}
            className="w-full rounded-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="white"
              className="mr-2"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat with Seller
          </Button>
        </div>

        <div className="px-4 py-3 grid grid-cols-3 gap-2 border-y border-border bg-muted/40">
          <div className="flex flex-col items-center text-center gap-1">
            <Truck className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-semibold">
              Free over {money(49)}
            </span>
          </div>
          <div className="flex flex-col items-center text-center gap-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-semibold">Quality assured</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1">
            <RotateCcw className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-semibold">Easy returns</span>
          </div>
        </div>

        {crossSellSection && (
          <div className="px-4 py-5">{crossSellSection}</div>
        )}

        <div className="px-4 py-5">
          <h2 className="text-base font-bold mb-2">About this product</h2>
          {productDescription ? (
            <div
              className="text-sm text-muted-foreground leading-relaxed [&_strong]:font-bold [&_strong]:text-foreground [&_span]:text-inherit [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: productDescription }}
            />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quality {product.name.toLowerCase()} sourced from trusted suppliers
              and carefully packed for dependable Ayurvedic care and wellness use.
              Please follow the product label and professional guidance where applicable.
            </p>
          )}
        </div>

        {reviews?.list?.length > 0 && (
          <div className="px-4 py-3">
            <ProductReviews
              productSlug={product?.slug}
              initialReviews={reviews?.list || []}
              initialStats={reviews?.statistics}
              initialPagination={reviews?.pagination}
              productId={product?._id}
            />
          </div>
        )}

        <div className="px-4 py-3">
          <h2 className="text-base font-bold mb-3">You may also like</h2>
          <div className="grid grid-cols-2 gap-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-card">
          <div className="flex items-center gap-2 p-3">
            {cartQty > 0 ? (
              <div className="flex flex-1 h-12 items-center justify-between rounded-full border border-primary text-primary overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCartQtyChange(-1)}
                  className="h-12 w-12 rounded-none"
                  aria-label="Decrease cart quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-10 text-center font-bold text-base">
                  {cartQty}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCartQtyChange(1)}
                  disabled={!canIncreaseQty}
                  className="h-12 w-12 rounded-none"
                  aria-label="Increase cart quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => add(selectedProduct, qty)}
                variant="outline"
                className="flex-1 h-12 rounded-full font-bold border-primary text-primary"
                disabled={isOutOfStock}
              >
                {isOutOfStock
                  ? "Out of Stock"
                  : orderBounds.preorder
                    ? "Pre-order"
                    : "Add to Cart"}
              </Button>
            )}
            <Button
              onClick={() => setCartOpen(true)}
              className="flex-1 h-12 rounded-full font-bold bg-primary hover:bg-primary/90"
            >
              View Cart
              {count > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                  {count}
                </span>
              )}
            </Button>
          </div>
        </div>

        <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
        <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
          <SheetContent
            side="right"
            className="w-full p-0 flex flex-col"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <SheetHeader className="border-b border-border px-4 pb-4 pt-5 text-left">
              <SheetTitle className="text-xl font-bold">Search</SheetTitle>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search Ayurvedic products..."
                  className="h-11 rounded-full pl-10"
                />
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    {normalizedSearch ? "Search Results" : "All Products"}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {searchResults.length} shown
                  </span>
                </div>

                {modalSearchPage.isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={`search-product-skeleton-${index}`}
                        className="flex gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-4/5 rounded-full" />
                          <Skeleton className="h-3 w-1/2 rounded-full" />
                          <Skeleton className="h-4 w-20 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                        navigate(`/product/${item.slug ?? item.id}`);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-soft"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <ImagePlaceholder
                          label={`${item.name} image unavailable`}
                          className="h-16 w-16 shrink-0 rounded-lg"
                          iconClassName="h-6 w-6"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.category}
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-primary">
                          {money(taxIncludedPriceForProduct(item, item.price))}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
                    <p className="text-sm font-semibold">No products found</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Try searching medicines, oils, supplements, or therapy equipment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ---------------- DESKTOP ----------------
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MegaMenu />
      <main className="container py-8">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>{product.category}</span>
          <span className="mx-2">/</span>
          <span className="text-foreground font-semibold">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="relative bg-muted rounded-2xl overflow-hidden shadow-card">
              {productImages[selectedImageIndex] ? (
                <img
                  src={productImages[selectedImageIndex]}
                  alt={product.name}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <ImagePlaceholder
                  label={`${product.name} image unavailable`}
                  className="aspect-square"
                  iconClassName="h-16 w-16"
                />
              )}
              {discount > 0 && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-full">
                  {discount}% OFF
                </div>
              )}
            </div>

            {/* Desktop Thumbnail Gallery */}
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-xl bg-muted overflow-hidden border-2 transition-smooth ${
                      selectedImageIndex === index
                        ? "border-primary"
                        : "border-transparent hover:border-primary"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {reviews?.list?.length > 0 && (
              <div className="pt-5">
                <ProductReviews
                  productSlug={product?.slug}
                  initialReviews={reviews?.list || []}
                  initialStats={reviews?.statistics}
                  initialPagination={reviews?.pagination}
                  productId={product?._id}
                />
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
                {product.category}
              </p>
              <h1 className="text-4xl font-extrabold text-foreground mb-2">
                {product.name}
              </h1>
            </div>

            <div className="py-2 border-y border-border">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-primary">
                  {money(priceIncTax)}
                </span>
                {mrpIncTax > priceIncTax ? (
                  <span className="text-lg text-muted-foreground line-through">
                    {money(mrpIncTax)}
                  </span>
                ) : null}
                {discount > 0 && (
                  <Badge className="bg-accent text-accent-foreground">
                    Save {discount}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Best Before Date - Desktop */}
            {formattedExpiryDate && (
              <div
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  isExpiredValue
                    ? "border-red-500/30 bg-red-500/10 text-red-600"
                    : "border-green-500/30 bg-green-500/10 text-green-700"
                }`}
              >
                {isExpiredValue ? (
                  <>Expired: {formattedExpiryDate}</>
                ) : (
                  <>Best Before: {formattedExpiryDate}</>
                )}
              </div>
            )}

            {additionalProductDescription ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 shadow-sm">
                <div
                  className="text-foreground/80 leading-relaxed [&_a]:font-semibold [&_a]:text-amber-800 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_em]:italic [&_h1]:mb-3 [&_h1]:text-base [&_h1]:font-extrabold [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-foreground [&_span]:text-inherit [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{
                    __html: additionalProductDescription,
                  }}
                />
              </div>
            ) : null}

            {stockBadgeLabel ? (
              <div
                className={`w-fit rounded-xl border px-3 py-2 text-sm font-semibold ${
                  stockBadgeLabel === "Selling Fast"
                    ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                    : stockBadgeLabel === "Out of Stock"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-accent/30 bg-accent/10 text-accent"
                }`}
              >
                {stockBadgeLabel}
              </div>
            ) : null}

            {variants.length > 1 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
                  Select Variant
                </p>
                <div className="flex flex-wrap gap-3">
                  {variants.map((variant) => {
                    const active = variant.id === selectedVariant?.id;
                    const rawVariants: any[] = Array.isArray(
                      (product as any)?.variants,
                    )
                      ? ((product as any).variants as any[])
                      : [];
                    const hit =
                      rawVariants.find(
                        (rv) =>
                          String(rv?._id || rv?.id || "").trim() === variant.id,
                      ) ||
                      rawVariants.find(
                        (rv) => String(rv?.name || "").trim() === variant.id,
                      ) ||
                      null;
                    const preorderAllowed = hit
                      ? getOrderQuantityBounds(product as Product, hit).preorder
                      : false;
                    const disabled =
                      !preorderAllowed &&
                      typeof hit?.stock === "number" &&
                      Number.isFinite(hit.stock) &&
                      hit.stock <= 0;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setSelectedImageIndex(0);
                        }}
                        disabled={disabled}
                        className={`min-w-24 rounded-full border px-4 py-3 text-sm font-semibold transition-smooth disabled:opacity-50 disabled:cursor-not-allowed ${
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-soft"
                            : "border-border bg-background text-foreground hover:border-primary"
                        }`}
                      >
                        <div>{variant.label}</div>
                        <div
                          className={`text-[11px] mt-0.5 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                        >
                          {money(priceWithTax(variant.price, taxRate))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {productDescription ? (
              <div
                className="text-foreground/80 leading-relaxed [&_strong]:font-bold [&_strong]:text-foreground [&_span]:text-inherit [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: productDescription }}
              />
            ) : (
              <p className="text-foreground/80 leading-relaxed">
                Quality {selectedProduct.name.toLowerCase()} sourced from trusted
                suppliers and carefully packed for dependable Ayurvedic care and
                wellness use. Please follow the product label and professional
                guidance where applicable.
              </p>
            )}

            <div className="flex gap-3">
              {cartQty > 0 ? (
                <div className="flex flex-1 h-14 items-center justify-between rounded-full border-2 border-primary text-primary overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCartQtyChange(-1)}
                    className="h-14 w-14 rounded-none"
                    aria-label="Decrease cart quantity"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <span className="min-w-12 text-center font-bold text-lg">
                    {cartQty}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCartQtyChange(1)}
                    disabled={!canIncreaseQty}
                    className="h-14 w-14 rounded-none"
                    aria-label="Increase cart quantity"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => add(selectedProduct, qty)}
                  size="lg"
                  disabled={isOutOfStock}
                  className="flex-1 rounded-full font-bold h-14 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-5 w-5" />{" "}
                  {isOutOfStock
                    ? "Out of Stock"
                    : orderBounds.preorder
                      ? "Pre-order"
                      : "Add to Cart"}
                </Button>
              )}
              <Button
                onClick={() => {
                  trackEvent("buy_now_click", {
                    item_id: selectedProduct.id,
                    item_name: selectedProduct.name,
                    item_category: selectedProduct.category,
                    quantity: qty,
                    value: selectedProduct.price * qty,
                    currency: "INR",
                  });
                  add(selectedProduct, qty);
                  navigate("/checkout");
                }}
                size="lg"
                variant="secondary"
                disabled={isOutOfStock}
                className="flex-1 rounded-full font-bold h-14 text-base"
              >
                {orderBounds.preorder ? "Pre-order Now" : "Buy Now"}
              </Button>

              {/* WhatsApp Button - Desktop (Replacing Heart Icon) */}
              <Button
                onClick={handleWhatsAppClick}
                size="icon"
                className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700"
                aria-label="Chat with seller on WhatsApp"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </Button>
            </div>

            {crossSellSection}

            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-muted/50">
                <Truck className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold">
                  Free delivery over {money(49)}
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-muted/50">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold">
                  100% Quality assured
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-muted/50">
                <RotateCcw className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold">
                  Easy 7-day returns
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-extrabold mb-6">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetails;
