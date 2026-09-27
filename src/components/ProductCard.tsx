import { useMemo, useState } from "react";
import { Plus, Minus, Heart, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/data/catalog";
import ImagePlaceholder from "./ImagePlaceholder";
import {
  getProductVariants,
  getOrderQuantityBounds,
  getPreorderBadgeLabel,
  getTaxRateForProduct,
  isOutOfStockProduct,
  money,
  priceWithTax,
  toTaxIncludedProduct,
} from "@/lib/pricing";
import { trackSelectItem } from "@/lib/analytics";

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const variants = useMemo(() => getProductVariants(product), [product]);
  const hasVariants = variants.length > 0;
  const displayVariant = variants[0] || null;
  const orderBounds = getOrderQuantityBounds(product, displayVariant);
  const preorderBadge = getPreorderBadgeLabel(product);
  const taxRate = getTaxRateForProduct(product);
  const priceIncTax = priceWithTax(displayVariant?.price ?? product.price, taxRate);
  const mrpIncTax = priceWithTax(displayVariant?.mrp ?? product.mrp, taxRate);
  const baseDiscountMrp = displayVariant?.mrp ?? product.mrp;
  const baseDiscountPrice = displayVariant?.price ?? product.price;
  const discount =
    baseDiscountMrp > 0 && baseDiscountMrp > baseDiscountPrice
      ? Math.round(((baseDiscountMrp - baseDiscountPrice) / baseDiscountMrp) * 100)
      : 0;
  const { add, remove, items } = useCart();
  const cartQty = useMemo(() => {
    const baseId = String(product.id);
    let sum = 0;
    for (const item of items) {
      const id = String(item.id || "");
      if (id === baseId || id.startsWith(`${baseId}-`)) {
        sum += Number(item.qty || 0) || 0;
      }
    }
    return sum;
  }, [items, product.id]);
  const [flying, setFlying] = useState(false);
  const [added, setAdded] = useState(false);
  const productPath = `/product/${product.slug ?? product.id}`;
  const outOfStock = isOutOfStockProduct(product);
  const productImage = String(product.image || "").trim();

  // Get expiry date from product
  const getExpiryDate = () => {
    // Check if variant has expiry date
    if (displayVariant) {
      const variantData = (product as any)?.variants?.find(
        (v: any) => String(v._id || v.id) === displayVariant.id
      );
      if (variantData?.expiryDate) {
        return variantData.expiryDate;
      }
    }
    // Fallback to main product expiry date
    return (product as any)?.productExpiryDate || (product as any)?.pricing?.expiryDate || null;
  };

  const expiryDate = getExpiryDate();

  // Format expiry date
  const formatExpiryDate = (date: string) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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

  // Get expiry badge color
  const getExpiryBadgeColor = () => {
    if (isExpiredValue) return "bg-red-500 text-white";
    return "bg-green-500 text-white";
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    if (hasVariants) {
      navigate(productPath);
      return;
    }
    add(toTaxIncludedProduct(product), orderBounds.minQuantity);
    setFlying(true);
    setAdded(true);
    setTimeout(() => setFlying(false), 700);
    setTimeout(() => setAdded(false), 1400);
  };

  const openProduct = () => {
    trackSelectItem({
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      value: priceIncTax,
      currency: "INR",
    });
    navigate(productPath);
  };

  const handleAdjustQty = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();

    if (outOfStock && delta > 0) return;
    // Variant products: quantity adjustments happen inside the product page/cart sheet.
    if (hasVariants) {
      navigate(productPath);
      return;
    }

    if (delta < 0 && cartQty <= 1) {
      remove(product.id);
      return;
    }

    add(toTaxIncludedProduct(product), delta);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProduct();
        }
      }}
      className="block cursor-pointer touch-manipulation grid"
    >
      <div className=" group relative bg-card rounded-xl border border-border overflow-hidden shadow-soft transition-smooth md:rounded-2xl md:hover:-translate-y-1 md:hover:shadow-card">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {productImage ? (
            <img
              src={productImage}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-smooth duration-500 md:group-hover:scale-110"
            />
          ) : (
            <ImagePlaceholder label={`${product.name} image unavailable`} />
          )}
          {!preorderBadge && product.badge && (
            <Badge
              className={`absolute left-2 top-2 text-[10px] font-bold md:left-3 md:top-3 md:text-xs ${
                product.badge === "Selling Fast"
                  ? "bg-emerald-600 text-white hover:bg-emerald-600"
                  : "bg-accent text-accent-foreground hover:bg-accent"
              }`}
            >
              {product.badge}
            </Badge>
          )}
          {discount > 0 && (
            <div className="absolute right-2 top-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-soft md:right-3 md:top-3 md:px-2 md:py-1 md:text-xs">
              {discount}% OFF
            </div>
          )}
          <button
            onClick={(event) => event.stopPropagation()}
            className="absolute bottom-3 right-3 hidden h-9 w-9 rounded-full bg-card/90 backdrop-blur items-center justify-center opacity-0 transition-smooth md:flex md:group-hover:opacity-100 md:hover:bg-card md:hover:text-accent"
            aria-label="Add to wishlist"
          >
            <Heart className="h-4 w-4" />
          </button>

          {flying && (
            <span className="pointer-events-none absolute bottom-3 right-3 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center fly-to-cart shadow-glow">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="space-y-1.5 p-3 md:space-y-2 md:p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{product.category}</p>
          <h3 className="min-h-[2.25rem] text-[13px] font-semibold leading-snug line-clamp-2 transition-smooth md:min-h-[2.5rem] md:text-sm md:group-hover:text-primary">
            {product.name}
          </h3>
          
          {/* Best Before Badge */}
          {formattedExpiryDate && (
            <div className="flex items-center gap-1.5">
              <Badge 
                className={`text-[9px] font-medium px-1.5 py-0.5 ${getExpiryBadgeColor()}`}
              >
                {isExpiredValue ? 'Expired' : 'Best Before'}
              </Badge>
              <span className={`text-[10px] font-medium ${
                isExpiredValue ? 'text-red-600' : 'text-green-600'
              }`}>
                {formattedExpiryDate}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="flex flex-col items-start gap-0.5 md:flex-row md:items-baseline md:gap-1.5">
                <span className="text-base font-extrabold text-foreground md:text-lg">{money(priceIncTax)}</span>
                {mrpIncTax > priceIncTax ? (
                  <span className="text-xs text-muted-foreground line-through">{money(mrpIncTax)}</span>
                ) : null}
              </div>
              {/* <div className="text-[10px] text-muted-foreground">incl. tax</div> */}
            </div>
            {hasVariants ? (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(productPath);
                }}
                className="h-8 rounded-full px-3 text-xs font-bold md:h-9"
              >
                {cartQty > 0 ? `${cartQty} in cart` : "Choose"}
              </Button>
            ) : cartQty > 0 ? (
              <div
                className="flex items-center overflow-hidden rounded-full border border-border bg-background shadow-soft"
                onClick={(event) => event.stopPropagation()}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => handleAdjustQty(e, -1)}
                  className="h-8 w-8 rounded-none md:h-9 md:w-9"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-7 text-center text-sm font-bold md:min-w-8">{cartQty}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => handleAdjustQty(e, 1)}
                  disabled={outOfStock}
                  className="h-8 w-8 rounded-none md:h-9 md:w-9"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
            <Button
              size="icon"
              onClick={handleAdd}
              disabled={outOfStock}
              className={`h-8 w-8 rounded-full shadow-soft transition-transform md:h-9 md:w-9 ${added ? "scale-110 bg-accent hover:bg-accent" : ""}`}
              aria-label="Add to cart"
            >
                {added ? <Check className="h-4 w-4 animate-scale-in" /> : <Plus className="h-4 w-4" />}
            </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
