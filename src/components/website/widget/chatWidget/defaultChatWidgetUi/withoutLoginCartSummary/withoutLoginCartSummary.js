const STORAGE_LIMIT = 4.5 * 1024 * 1024; // 4.5MB (leave 0.5MB buffer)
const MAX_CART_ITEMS = 100; // Reasonable limit for guest cart

import React, { useEffect, useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import AlertModal from "@/components/ui/modal/alertModal";
import { useRouter } from "next/navigation";
import DeliveryAddressUI from "@/components/website/widget/chatWidget/defaultChatWidgetUi/topicSelector/deliveryAddressUi";
import useDebouncedTotalAmount from "@/hooks/chatWidget/cart/useDebouncedTotalAmount";
import { useCart } from "@/context/CartContext";
import { money } from "@/lib/pricing";

const WithoutLoginCartSummary = ({ baseUrl = "", goBack, setAllMessages }) => {
  const { cart, customerAuthData, removeFromCart, updateCartItem } = useCart();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [loading, setLoading] = useState(cart?.length > 0 ? false : true);
  const router = useRouter();
  const { totalSummary, loading: totalSummaryLoading } =
    useDebouncedTotalAmount(cart, deliveryAddress);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const isDeliveryAddressRequired = cart?.some(
    (item) => item.itemType === "product" && item?.shipping?.available
  );

    const handleViewItemDetails = (item) => {
    router.push(
      `${baseUrl}/${item?.itemType === "product" ? "product" : "service"}/${
        item?.slug
      }`
    );
  };

  const saveToLocalStorage = (cartData) => {
    try {
      // Enforce item limit
      if (cartData.length > MAX_CART_ITEMS) {
        // Keep only the most recent items (based on addition time if you track it)
        cartData = cartData.slice(-MAX_CART_ITEMS);
        // Optional: show message to user about cart limit
      }

      const cartString = JSON.stringify(cartData);

      // Check storage limit
      if (cartString.length > STORAGE_LIMIT) {
        // Remove older items to free up space (simple approach)
        cartData = cartData.slice(Math.floor(cartData.length * 0.2)); // Keep newer 80%
        return saveToLocalStorage(cartData); // Recursively try again
      }

      localStorage.setItem("webCart", cartString);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "webCart",
          newValue: cartString,
          oldValue: null,
        })
      );
      return true;
    } catch (error) {
      console.error("Error saving to localStorage:", error);

      // Fallback strategies
      try {
        // Try sessionStorage as fallback
        sessionStorage.setItem("webCart", JSON.stringify(cartData));
      } catch (sessionError) {
        console.error("Also failed to save to sessionStorage:", sessionError);
      }

      return false;
    }
  };

  const handleProceedToCheckout = async () => {
    // Start order block
    let messageContent = `
          <div class="flex flex-col gap-3 
            bg-gray-50 dark:bg-gray-700
            border border-gray-200 dark:border-gray-600
            rounded-lg p-4 text-sm 
            text-gray-700 dark:text-gray-200 max-w-sm">
            <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
              <h3 class="font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
                Your Cart
              </h3>
            </div>
          `;
    // Items inside each group
    cart?.forEach((item, index) => {
      let originalUnit = 0;
      let discountUnit = 0;
      let finalUnit = 0;
      const qty = item?.itemType === "product" ? item?.quantity || 1 : 1;

      if (item?.itemType === "product") {
        let variant = item.selectedVariant ||
          item.variants?.[0] || {
            basePrice: item.pricing?.basePrice || 0,
            salePrice: item.pricing?.salePrice,
          };

        const undiscPreTax = variant.basePrice || 0;
        const discPreTax = variant.salePrice || undiscPreTax;
        const taxMult = item.pricing?.taxApplicable
          ? 1 + (item.pricing?.taxRate || 0) / 100
          : 1;

        originalUnit = undiscPreTax * taxMult;
        finalUnit = discPreTax * taxMult;
        discountUnit = originalUnit - finalUnit;
      } else {
        let pkg = item?.selectedPackage ||
          item?.packages?.[0] || { price: 0, discountPercentage: 0 };
        const preTax = pkg.price;
        const taxMult = item.taxApplicable ? 1 + (item.taxRate || 0) / 100 : 1;
        originalUnit = preTax * taxMult;
        finalUnit = originalUnit * (1 - (pkg.discountPercentage || 0) / 100);
        discountUnit = originalUnit - finalUnit;
      }

      const originalTotal = originalUnit * qty;
      const discountTotal = discountUnit * qty;
      const finalTotal = finalUnit * qty;

      // ✅ restore media content block
      let mediaContent = "";
      if (item?.images?.[0]) {
        mediaContent = `<img src="${item?.images[0]}" alt="${item?.name}" class="w-10 h-10 object-cover rounded" />`;
      } else if (item?.video) {
        mediaContent = `
              <video src="${item?.video}" class="w-10 h-10 object-cover rounded" controls muted></video>
            `;
      } else {
        mediaContent = `
              <div class="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                <span class="text-gray-500 dark:text-gray-400 text-xs">No Image</span>
              </div>
            `;
      }

      // ✅ restore variant / package details in UI
      messageContent += `
            <div class="flex items-start gap-3 ${index > 0 ? "pt-2" : ""}">
              ${mediaContent}
              <div class="flex-1">
                <h4 class="font-medium">${item?.name}</h4>
                ${
                  item?.itemType === "product" && item?.selectedVariant
                    ? `<p class="text-xs text-gray-500 dark:text-gray-400">Variant: ${item?.selectedVariant.name}</p>`
                    : ""
                }
                ${
                  item?.itemType === "service" && item?.selectedPackage
                    ? `<p class="text-xs text-gray-500 dark:text-gray-400">Package: ${item?.selectedPackage.name}</p>`
                    : ""
                }
                <div class="flex justify-between items-start mt-1">
                  <span class="text-xs text-gray-500 dark:text-gray-400">Qty: ${qty}</span>
                  <div class="flex flex-wrap gap-1 text-right">
                    ${
                      discountTotal > 0
                        ? `<div class="text-xs text-gray-500 dark:text-gray-400 line-through">${money(
                            originalTotal.toFixed(2)
                          )}</div>`
                        : ""
                    }
                    <span class="text-xs font-medium">${money(
                      finalTotal.toFixed(2)
                    )}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
    });

    // const totalSummary = await getOrderItemsTotalAmount(order?.items);
    messageContent += `
        <div class="border-t border-gray-200 dark:border-gray-600 pt-3 mt-2">
          <div class="space-y-1">
            <div class="flex justify-between items-center">
              <span>Subtotal:</span>
              <span>${money(totalSummary?.subtotal)}</span>
            </div>
            ${
              totalSummary?.totalDiscount > 0
                ? `
            <div class="flex justify-between items-center text-green-500 dark:text-green-400">
              <span>Discount:</span>
              <span>-${money(totalSummary?.totalDiscount)}</span>
            </div>
            `
                : ""
            }
            ${
              totalSummary?.isShippingAvailable && !totalSummary?.shippingIssues
                ? `
            <div class="flex justify-between items-center">
              <span>Shipping Cost:</span>
              ${
                totalSummary?.shippingCost == 0
                  ? `
                <span class="text-green-500 dark:text-green-400">Free Shipping</span>
                `
                  : `<span>${money(totalSummary?.shippingCost)}</span>`
              }
            </div>
            `
                : ""
            }
            <div class="flex justify-between items-center font-medium border-t border-gray-200 dark:border-gray-600 pt-2">
              <span>Total:</span>
              <span>${money(totalSummary?.total)}</span>
            </div>
          </div>
        </div>
          `;
    // End of order block
    messageContent += `</div>`;
    const newMessage = {
      _id: "id-cart-1",
      message: messageContent,
      type: "component",
      senderId: "user",
      clientId: "user",
      createdAt: new Date(),
    };

    let message2 = `
         <div class="flex flex-col gap-3 
        bg-white dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-xl p-4 px-6 text-sm 
        text-gray-700 dark:text-gray-200">
            <h3 class="text-green-600 font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
              Your order is ready to be processed
            </h3>
        </div>
        `;

    const newMessage2 = {
      _id: "id-1",
      message: message2,
      type: "component",
      senderId: "system",
      clientId: "user",
      createdAt: new Date(),
    };
    setAllMessages((prev) => {
      return [
        newMessage,
        newMessage2,
        {
          _id: "1",
          message: "Please enter your WhatsApp number to log in",
          sender: "system",
          createdAt: new Date(),
        },
      ];
    });
    goBack();
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col bg-gray-50"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex-grow px-4 pt-4 animate-pulse">
          {/* Repeat skeleton items to match expected cart length */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-start gap-3">
                  {/* Image/video skeleton */}
                  <div className="w-16 h-16 bg-gray-100 rounded" />

                  {/* Title + variant select skeleton */}
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                    <div className="h-8 bg-gray-100 rounded w-full" />
                  </div>
                </div>

                {/* Price block skeleton */}
                <div className="text-right w-24">
                  <div className="h-3 bg-gray-100 rounded w-20 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              </div>

              {/* Quantity skeleton */}
              <div className="flex items-center mt-3 justify-end gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded" />
                <div className="w-10 h-6 bg-gray-100 rounded" />
                <div className="w-6 h-6 bg-gray-100 rounded" />
              </div>

              {/* Remove link skeleton */}
              <div className="flex justify-end mt-2">
                <div className="h-3 w-12 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary - Sticky bottom skeleton */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="space-y-2 animate-pulse">
            <div className="flex justify-between text-sm">
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
            <div className="flex justify-between text-sm">
              <div className="h-4 bg-gray-100 rounded w-16" />
              <div className="h-4 bg-gray-100 rounded w-20" />
            </div>
            <div className="h-10 bg-gray-100 rounded w-full mt-2" />
            <button
              disabled
              className="w-full bg-gray-200 text-white py-3 rounded-xl font-medium mt-3"
              aria-disabled="true"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
        <p className="text-gray-500 text-center mb-6">
          Start shopping to add items to your cart
        </p>
        <button
          onClick={() => router.push(`${baseUrl}/`)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-grow px-4 pt-4">
        <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
          <span>Your Cart ({cart.length})</span>
        </h3>
        {/* Cart Items */}
        {customerAuthData?.customerId && isDeliveryAddressRequired && (
          <DeliveryAddressUI
            selectedAddress={deliveryAddress}
            setSelectedAddress={setDeliveryAddress}
            customerAuthData={customerAuthData}
          />
        )}

        <div className="space-y-4 mb-6 h-full flex flex-col">
          {cart.map((item, index) => (
            <div
              key={`cart-item-${index}-${item?._id || index}`}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
              // className="border-b pb-4 last:border-b-0"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-start gap-3">
                  {item?.images?.[0] ? (
                    <img
                      src={item?.images[0]}
                      alt={item?.name}
                      className="w-16 h-16 object-cover rounded"
                      onClick={() => handleViewItemDetails(item)}
                    />
                  ) : item?.video ? (
                    <video
                      src={item?.video}
                      alt={item?.name}
                      className="w-16 h-16 object-cover rounded"
                      controls
                      muted
                      loop
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Image</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 onClick={() => handleViewItemDetails(item)} className="text-sm font-medium line-clamp-2">{item?.name}</h4>
                    {item?.description ? (
                      <p onClick={() => handleViewItemDetails(item)} className="text-xs text-gray-500 mb-3 line-clamp-2">
                        {item?.description || ""}
                      </p>
                    ) : null}
                    {item?.itemType === "product" && item?.selectedVariant && (
                      <div className="mt-2 flex-1">
                        <select
                          value={item?.selectedVariant?._id}
                          onChange={(e) => {
                            const variant = item?.variants.find(
                              (v) => v._id === e.target.value
                            );
                            if (variant?.stock <= 0) {
                              setSnackbar({
                                open: true,
                                message: "Out of stock",
                                severity: "error",
                              });
                              return;
                            }
                            updateCartItem(index, "selectedVariant", variant);
                          }}
                          className="text-xs p-1.5 border rounded bg-white w-full"
                        >
                          {item?.variants.map((variant) => {
                            let basePrice = variant?.basePrice || 0;
                            let salePrice = variant?.salePrice || basePrice;

                            // 👉 Apply tax if applicable at product level
                            if (item?.pricing?.taxApplicable) {
                              const taxMultiplier =
                                1 + (item?.pricing?.taxRate || 0) / 100;
                              basePrice = basePrice * taxMultiplier;
                              salePrice = salePrice * taxMultiplier;
                            }

                            return (
                              <option key={variant?._id} value={variant?._id}>
                                {variant?.name} (
                                {money(salePrice || basePrice)})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                    {item?.itemType === "service" && item?.selectedPackage && (
                      <div className="mt-2">
                        <select
                          value={item?.selectedPackage._id}
                          onChange={(e) => {
                            const pkg = item?.packages.find(
                              (p) => p._id === e.target.value
                            );
                            updateCartItem(index, "selectedPackage", pkg);
                          }}
                          className="text-xs p-1.5 border rounded bg-white w-full"
                        >
                          {item?.packages.map((pkg) => {
                            let pkgPrice = pkg.price || 0;

                            // Apply tax if applicable
                            if (item?.taxApplicable) {
                              const taxMultiplier =
                                1 + (item?.taxRate || 0) / 100;
                              pkgPrice = pkgPrice * taxMultiplier;
                            }

                            // Apply discount if applicable
                            const finalPrice =
                              pkg.discountPercentage > 0
                                ? pkgPrice * (1 - pkg.discountPercentage / 100)
                                : pkgPrice;

                            return (
                              <option key={pkg._id} value={pkg._id}>
                                {pkg.name} ({money(finalPrice)})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {(() => {
                    let originalUnit = 0;
                    let discountUnit = 0;
                    let finalUnit = 0;

                    if (item.itemType === "product") {
                      let variant = item.selectedVariant;
                      if (!variant && item.variants?.length > 0)
                        variant = item.variants[0];
                      if (!variant)
                        variant = {
                          basePrice: item.pricing?.basePrice || 0,
                          salePrice: item.pricing?.salePrice,
                        };

                      const undiscPreTax = variant.basePrice || 0;
                      const discPreTax = variant.salePrice || undiscPreTax;
                      const taxMult = item.pricing?.taxApplicable
                        ? 1 + (item.pricing?.taxRate || 0) / 100
                        : 1;

                      originalUnit = undiscPreTax * taxMult;
                      finalUnit = discPreTax * taxMult;
                      discountUnit = originalUnit - finalUnit;
                    } else if (item.itemType === "service") {
                      let pkg = item.selectedPackage;
                      if (!pkg && item.packages?.length > 0)
                        pkg = item.packages[0];
                      if (!pkg) pkg = { price: 0, discountPercentage: 0 };

                      const preTax = pkg.price || 0;
                      const taxMult = item.taxApplicable
                        ? 1 + (item.taxRate || 0) / 100
                        : 1;

                      originalUnit = preTax * taxMult;
                      const discPercent = pkg.discountPercentage || 0;
                      finalUnit = originalUnit * (1 - discPercent / 100);
                      discountUnit = originalUnit - finalUnit;
                    }

                    return (
                      <div className="text-right">
                        {discountUnit > 0 && (
                          <div className="text-xs text-gray-500 line-through">
                            {money(originalUnit)}
                          </div>
                        )}
                        <div className="text-sm font-medium">
                          {money(finalUnit)}
                        </div>
                        {discountUnit > 0 && (
                          <div className="text-xs text-green-600">
                            Save {money(discountUnit)}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {item?.itemType === "product" && (
                    <>
                      <div className="flex items-center mt-3">
                        <button
                          onClick={() =>
                            updateCartItem(
                              index,
                              "quantity",
                              Math.max(1, item?.quantity - 1)
                            )
                          }
                          className="w-6 h-6 flex items-center justify-center border rounded-l bg-gray-100 hover:bg-gray-200"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={
                            item?.variants?.length > 0
                              ? item?.selectedVariant
                                ? item?.selectedVariant?.stock
                                : item?.variants?.[0]?.stock
                              : item?.inventory?.totalQuantity
                          }
                          value={item?.quantity}
                          onChange={(e) => {
                            let value = Number(e.target.value);
                            const maxQty =
                              item?.variants?.length > 0
                                ? item?.selectedVariant
                                  ? item?.selectedVariant?.stock
                                  : item?.variants?.[0]?.stock
                                : item?.inventory?.totalQuantity;
                            if (isNaN(value)) value = 1;
                            if (value < 1) value = 1;
                            if (value > maxQty) value = maxQty;
                            updateCartItem(index, "quantity", value);
                          }}
                          className="w-10 h-6 text-center border-t border-b text-sm"
                        />
                        <button
                          onClick={() => {
                            const maxQty =
                              item?.variants?.length > 0
                                ? item?.selectedVariant
                                  ? item?.selectedVariant?.stock
                                  : item?.variants?.[0]?.stock
                                : item?.inventory?.totalQuantity;
                            updateCartItem(
                              index,
                              "quantity",
                              Math.min(item?.quantity + 1, maxQty)
                            );
                          }}
                          className="w-6 h-6 flex items-center justify-center border rounded-r bg-gray-100 hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => removeFromCart(index)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary - Fixed at bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="space-y-1 mb-4">
          {customerAuthData?.customerId &&
          isDeliveryAddressRequired &&
          !deliveryAddress ? (
            <p className="text-sm text-red-600 text-center">
              Delivery Address Required
            </p>
          ) : null}
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{money(totalSummary?.subtotal || 0)}</span>
          </div>
          {totalSummary?.totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount:</span>
              <span>-{money(totalSummary?.totalDiscount || 0)}</span>
            </div>
          )}
          {totalSummary?.isShippingAvailable &&
          !totalSummary?.shippingIssues ? (
            <div className="flex justify-between text-sm">
              <span>Shipping Cost:</span>
              <span>
                {totalSummary?.shippingCost == 0 ? (
                  <span className="text-green-600">Free Shipping</span>
                ) : (
                  money(totalSummary?.shippingCost || 0)
                )}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Loading...</span>
              </div>
            ) : (
              <span>{money(totalSummary?.total)}</span>
            )}
          </div>
        </div>

        <button
          onClick={handleProceedToCheckout}
          disabled={
            cart.length === 0
            // ||
            // totalSummary?.shippingIssues ||
            // (isDeliveryAddressRequired && !deliveryAddress)
          }
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Proceed to Checkout
        </button>
      </div>

      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </div>
  );
};

export default WithoutLoginCartSummary;
