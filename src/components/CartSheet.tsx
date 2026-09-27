import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getOrderQuantityBounds, money, taxIncludedPriceForProduct } from "@/lib/pricing";
import ImagePlaceholder from "./ImagePlaceholder";

const CartSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { items, remove, setQty } = useCart();
  const { hydrated: authHydrated, isLoggedIn } = useCustomerAuth();

  const subtotal = items.reduce((sum, item) => {
    const basePrice = Math.max(Number(item.mrp) || 0, Number(item.price) || 0);
    return sum + basePrice * item.qty;
  }, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const savings = Math.max(0, subtotal - total);

  const handleQuantityChange = (productId: string, variantId: string | undefined, newQty: number) => {
    const item = items.find(
      (i) => i.id === productId && String(i.selectedVariantId || "") === String(variantId || ""),
    );
    const orderBounds = item ? getOrderQuantityBounds(item as any) : null;
    const minQuantity = Math.max(1, Number(orderBounds?.minQuantity || 1) || 1);
    const currentQty = Math.max(0, Number(item?.qty || 0) || 0);

    if (!item) return;

    if (newQty < minQuantity) {
      remove(productId, variantId);
      return;
    }

    if (currentQty <= minQuantity && newQty < currentQty) {
      remove(productId, variantId);
      return;
    }

    setQty(productId, newQty, variantId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[100vw] max-w-full sm:w-96 flex flex-col p-0">
        <SheetHeader className="px-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-2xl font-bold">Shopping Cart</SheetTitle>
            <Badge variant="secondary" className="shrink-0">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Badge>
          </div>
        </SheetHeader>

        <Separator />

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-2">Add some delicious items to get started!</p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="space-y-3 p-4 sm:space-y-4 sm:p-6">
                {items.map((item) => {
                  const isBogoOfferItem = Boolean(item.isBogoOfferItem);
                  const orderBounds = getOrderQuantityBounds(item as any);

                  return (
                  <div key={`${item.id}__${item.selectedVariantId || "default"}`} className="flex gap-3 pb-4 border-b last:border-b-0 sm:gap-4">
                    {/* Product Image */}
                    <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0 sm:h-20 sm:w-20">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlaceholder label={`${item.name} image unavailable`} iconClassName="h-6 w-6" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="line-clamp-2 break-words text-sm font-semibold leading-snug">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{item.weight}</p>
                      {isBogoOfferItem ? (
                        <Badge className="mt-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                          BOGO offer
                          {/* {item.bogoPromotionCode ? ` · ${item.bogoPromotionCode}` : ""} */}
                        </Badge>
                      ) : null}
                      {!isBogoOfferItem && orderBounds.preorder ? (
                        <Badge variant="secondary" className="mt-1">
                          Pre-order
                        </Badge>
                      ) : null}
                      {item.shippingAvailable !== true ? (
                        <p className="mt-1 text-xs font-semibold text-destructive">Shipping not available</p>
                      ) : null}

                      {/* Price */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                        {isBogoOfferItem ? (
                          <>
                            <span className="font-bold text-primary">
                              {money(taxIncludedPriceForProduct(item as any, item.price))}
                            </span>
                            {item.mrp > item.price ? (
                              <>
                                <span className="text-xs text-muted-foreground line-through">
                                  {money(taxIncludedPriceForProduct(item as any, item.mrp))}
                                </span>
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% off
                                </Badge>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-primary">{money(item.price)}</span>
                            {item.mrp > item.price ? (
                              <>
                                <span className="text-xs text-muted-foreground line-through">{money(item.mrp)}</span>
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% off
                                </Badge>
                              </>
                            ) : null}
                          </>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-3 bg-muted rounded-lg p-1 w-fit">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleQuantityChange(item.id, item.selectedVariantId, item.qty - 1)}
                          disabled={isBogoOfferItem}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-semibold min-w-8 text-center">{item.qty}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleQuantityChange(item.id, item.selectedVariantId, item.qty + 1)}
                          disabled={isBogoOfferItem}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => remove(item.id, item.selectedVariantId)}
                      disabled={isBogoOfferItem}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  );
                })}
              </div>
            </ScrollArea>

            <Separator />

            {/* Summary */}
            <div className="px-4 py-4 space-y-3 sm:px-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>

              {savings > 0 && (
                <div className="flex justify-between text-sm text-accent font-semibold">
                  <span>Your Savings</span>
                  <span>-{money(savings)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{money(total)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 sm:gap-3">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-sm font-semibold rounded-lg sm:text-base"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(isMobile && (!authHydrated || !isLoggedIn) ? "/checkout-login" : "/checkout");
                  }}
                >
                  Proceed
                </Button>

                <Button variant="outline" className="w-full h-12 rounded-lg text-sm sm:text-base" onClick={() => onOpenChange(false)}>
                  Continue Shopping
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
