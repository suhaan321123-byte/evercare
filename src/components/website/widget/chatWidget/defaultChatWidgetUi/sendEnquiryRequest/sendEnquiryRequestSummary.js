"use client";
import AlertModal from "@/components/ui/modal/alertModal";
import { money } from "@/lib/pricing";
// SendEnquiryRequestSummary.js
import { useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";

const STORAGE_KEY = "webOrderSendEnquiryRequestItemData";
const STORAGE_KEY2 = "webOrderSendEnquiryRequestItemWithPriceData";

const SendEnquiryRequestSummary = ({
  customerAuthData,
  widgetData,
  onTopicSelect,
  simulateTyping,
  addMessage,
  onClose,
  handleQuickReply,
}) => {
  const [cart, setCart] = useState([]);
  const [isWithPrice, setIsWithPrice] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const getValidatedData = () => {
      // Define the keys in order of priority
      const keyPriorityList = [
        { key: STORAGE_KEY2, withPrice: true },
        { key: STORAGE_KEY, withPrice: false },
      ];

      // Loop through the priority list
      for (const { key, withPrice } of keyPriorityList) {
        // Check sessionStorage first, then localStorage for each key
        const rawData =
          sessionStorage.getItem(key) || localStorage.getItem(key);

        if (rawData) {
          try {
            // Attempt to parse the data
            const data = JSON.parse(rawData);

            // Validate the parsed data structure
            const isValid = data && (data.slug || data.productId);
            if (isValid) {
              return { data, withPrice };
            } else {
              console.warn(
                `Data found for key "${key}" is invalid. Required fields missing.`
              );
              // Continue to the next key in the priority list
              continue;
            }
          } catch (error) {
            // Handle JSON parsing errors
            console.error(`Failed to parse data from key "${key}":`, error);
            // Purge the invalid data to prevent future errors
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
            // Continue to the next key in the loop
            continue;
          }
        }
      }

      // Return null if no valid data was found in any key
      return null;
    };

    // Execute the function and handle the result
    const result = getValidatedData();

    if (result) {
      setCart([result.data]);
      setIsWithPrice(result.withPrice);
    }
  }, []);

  const updateCartItem = (index, field, value) => {
    setCart((prevCart) => {
      const newCart = [...prevCart];
      newCart[index] = { ...newCart[index], [field]: value };
      return newCart;
    });
  };

  const removeFromCart = (index) => {
    setCart((prevCart) => {
      const newCart = [...prevCart];
      newCart.splice(index, 1);
      return newCart;
    });
    // Clean up both storage keys
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY2);
    localStorage.removeItem(STORAGE_KEY2);
    onClose?.();
  };

  const clearCart = () => {
    setCart([]);
    // Clean up both storage keys
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY2);
    localStorage.removeItem(STORAGE_KEY2);
    onClose?.();
  };

  const sendEnquiryRequest = async (orderItems = []) => {
    if (!orderItems?.length) return;

    let messageContent = "";

    if (isWithPrice) {
      // Enhanced UI with pricing and quantity details
      messageContent = `
        <div class="flex flex-col gap-3 
          bg-blue-50 dark:bg-blue-900/20
          border border-blue-200 dark:border-blue-700
          rounded-lg p-4 text-sm 
          text-gray-700 dark:text-gray-200 max-w-sm">
          <div class="flex items-center justify-between border-b border-blue-200 dark:border-blue-600 pb-2">
            <h3 class="font-semibold text-blue-700 dark:text-blue-300">
              Enquiry Request
            </h3>
            <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
              Pending
            </span>
          </div>
      `;

      // Add each cart item to the message
      orderItems.forEach((item, index) => {
        let originalUnit = 0;
        let discountUnit = 0;
        let finalUnit = 0;
        const qty = item?.itemType === "product" ? item?.quantity || 1 : 1;

        if (item?.itemType === "product") {
          let variant = item.selectedVariant;
          if (!variant && item.variants?.length > 0) variant = item.variants[0];
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
        } else {
          // Service
          let pkg = item?.selectedPackage || item?.packages?.[0];
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

        const originalTotal = originalUnit * qty;
        const discountTotal = discountUnit * qty;
        const finalTotal = finalUnit * qty;

        // Handle different media types (video, image, or placeholder)
        let mediaContent = "";
        if (item?.images?.[0]) {
          mediaContent = `<img src="${item?.images[0]}" alt="${item?.name}" class="w-10 h-10 object-cover rounded" />`;
        } else if (item?.video) {
          mediaContent = `
          <video 
            src="${item?.video}" 
            class="w-10 h-10 object-cover rounded" 
            controls 
            muted 
            style="object-fit: cover;"
          ></video>
        `;
        } else {
          mediaContent = `
          <div class="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
            <span class="text-gray-500 dark:text-gray-400 text-xs">No Image</span>
          </div>
        `;
        }

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
                <div class="text-xs font-medium">${money(
                  finalTotal.toFixed(2)
                )}</div>
              </div>
            </div>
          </div>
        </div>
      `;
      });

      // Add enquiry message section
      messageContent += `
       <div class="border-t border-blue-200 dark:border-blue-600 pt-3 mt-2">
         <div class="bg-white dark:bg-gray-700 rounded-md p-3 border border-gray-200 dark:border-gray-600">
           <p class="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Buyer's Message:</p>
           <p class="text-xs text-gray-700 dark:text-gray-300 leading-tight">
             I'm interested in the above items with specified variants and quantities. Please provide detailed quotation including availability, delivery timeline, and any additional costs.
           </p>
         </div>
         
         <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
           <p>Enquiry request sent for review and quotation</p>
         </div>
       </div>
     </div>
   `;
    } else {
      // Basic UI without pricing
      const item = orderItems[0];
      messageContent = `
        <div class="flex items-start gap-3 
          bg-blue-50 dark:bg-blue-900/20
          border border-blue-200 dark:border-blue-700
          rounded-lg p-3 text-left 
          text-gray-800 dark:text-gray-100 max-w-sm">
          ${
            item?.images?.[0]
              ? `<img src="${item?.images?.[0]}" alt="${item?.name}" 
            class="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-gray-200 dark:border-gray-600" />`
              : item?.video
              ? `<video src="${item?.video}" alt="${item?.name}" 
            class="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-gray-200 dark:border-gray-600" controls></video>`
              : ""
          }
          
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start mb-2 gap-2">
              <h3 class="font-semibold text-sm truncate">${
                item?.name || ""
              }</h3>
              <span class="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 capitalize">
                ${item?.itemType === "service" ? "Service" : "Product"} Enquiry
              </span>
            </div>
            
            ${
              item?.description
                ? `
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
              ${item.description}
            </p>
            `
                : ""
            }
            
            <div class="bg-white dark:bg-gray-600 rounded-md p-2 text-xs border border-gray-200 dark:border-gray-500">
              <p class="text-gray-600 dark:text-gray-300 mb-1 font-medium">
                Buyer's Message:
              </p>
              <p class="text-gray-700 dark:text-gray-200 leading-tight">
                I'm interested in this ${
                  item?.itemType === "service" ? "service" : "product"
                }. Please share more details about availability, pricing, and delivery options.
              </p>
            </div>
          </div>
        </div>
      `;
    }

    // Send the enquiry message
    onTopicSelect(messageContent);

    const quickReply = `
      <div class="flex items-start gap-2 
        bg-gray-100 dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-lg p-3 text-sm 
        text-gray-700 dark:text-gray-300 mx-auto max-w-md">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-medium">Enquiry received!</p>
          <p class="mt-1 text-xs">Our team will respond to you shortly with detailed quotation and availability.</p>
        </div>
      </div>
    `;
    setTimeout(() => {
      handleQuickReply(quickReply);
    }, 1000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Send Enquiry Request
        </h3>
        {cart?.length > 0 && (
          <button
            onClick={clearCart}
            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <IoMdClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {cart?.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-gray-500">Your cart is empty</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            {cart.map((item, index) => (
              <div
                key={`cart-item-${index}-${item?._id || index}`}
                className="border-b pb-4 last:border-b-0"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3">
                    {item?.images?.[0] ? (
                      <img
                        src={item?.images[0]}
                        alt={item?.name}
                        className="w-16 h-16 object-cover rounded"
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
                      <h4 className="text-sm font-medium">{item?.name}</h4>
                      <p className="text-sm line-clamp-2 whitespace-pre-line">
                        {item?.description || ""}
                      </p>
                      {/* Variant Selection for Products */}
                      {item?.itemType === "product" &&
                        item?.variants?.length > 0 && (
                          <div className="mt-2 flex-1">
                            <select
                              value={
                                item?.selectedVariant?._id ||
                                item?.variants?.[0]?._id
                              }
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
                                updateCartItem(
                                  index,
                                  "selectedVariant",
                                  variant
                                );
                                updateCartItem(index, "quantity", 1);
                              }}
                              className="text-xs p-1.5 border rounded bg-white w-full"
                            >
                              {item?.variants.map((variant) => {
                                let basePrice = variant?.basePrice || 0;
                                let salePrice = variant?.salePrice || basePrice;

                                // Apply tax if applicable at product level
                                if (item?.pricing?.taxApplicable) {
                                  const taxMultiplier =
                                    1 + (item?.pricing?.taxRate || 0) / 100;
                                  basePrice = basePrice * taxMultiplier;
                                  salePrice = salePrice * taxMultiplier;
                                }

                                return (
                                  <option
                                    key={variant?._id}
                                    value={variant?._id}
                                  >
                                    {variant?.name} (
                                    {money(salePrice || basePrice)})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}

                      {/* Package Selection for Services */}
                      {item?.itemType === "service" &&
                        item?.packages?.length > 0 && (
                          <div className="mt-2">
                            <select
                              value={
                                item?.selectedPackage?._id ||
                                item?.packages?.[0]?._id
                              }
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
                                    ? pkgPrice *
                                      (1 - pkg.discountPercentage / 100)
                                    : pkgPrice;

                                return (
                                  <option key={pkg._id} value={pkg._id}>
                                    {pkg.name} (
                                    {money(finalPrice.toFixed(2))})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                    </div>
                  </div>
                  {isWithPrice ? (
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
                                {money(originalUnit.toFixed(2))}
                              </div>
                            )}
                            <div className="text-sm font-medium">
                              {money(finalUnit.toFixed(2))}
                            </div>
                            {discountUnit > 0 && (
                              <div className="text-xs text-green-600">
                                Save {money(discountUnit.toFixed(2))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Quantity Controls for Products */}
                      {item?.itemType === "product" && (
                        <div className="flex items-center mt-3">
                          <button
                            onClick={() =>
                              updateCartItem(
                                index,
                                "quantity",
                                Math.max(1, (item?.quantity || 1) - 1)
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
                              item?.selectedVariant?.stock ||
                              (item?.variants?.length > 0
                                ? item?.variants?.[0]?.stock
                                : item?.inventory?.totalQuantity)
                            }
                            value={item?.quantity || 1}
                            onChange={(e) => {
                              let value = Number(e.target.value);
                              const maxQty =
                                item?.selectedVariant?.stock ||
                                (item?.variants?.length > 0
                                  ? item?.variants?.[0]?.stock
                                  : item?.inventory?.totalQuantity);
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
                                item?.selectedVariant?.stock ||
                                (item?.variants?.length > 0
                                  ? item?.variants?.[0]?.stock
                                  : item?.inventory?.totalQuantity);
                              updateCartItem(
                                index,
                                "quantity",
                                Math.min((item?.quantity || 1) + 1, maxQty)
                              );
                            }}
                            className="w-6 h-6 flex items-center justify-center border rounded-r bg-gray-100 hover:bg-gray-200"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
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

          <div className="border-t pt-4 mt-4">
            {isWithPrice && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-1">
                  Detailed Enquiry Request
                </p>
                <p className="text-xs text-gray-600">
                  This enquiry includes pricing, variants, and quantity details
                  for accurate quotation.
                </p>
              </div>
            )}
            <button
              onClick={() => sendEnquiryRequest(cart)}
              disabled={cart.length === 0}
              type="button"
              className="w-full bg-blue-600 text-white py-2.5 rounded-md transition-colors font-medium
               hover:bg-blue-700
               disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-blue-600"
            >
              {isWithPrice
                ? "Send Detailed Enquiry Request"
                : "Send Enquiry Request"}
            </button>
          </div>
        </>
      )}

      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </div>
  );
};

export default SendEnquiryRequestSummary;
