import DeliveryAddressUI from "../topicSelector/deliveryAddressUi";
import { useEffect, useState } from "react";
import {
  createCatalogueOrderFromChatWidgetApi,
  getCatalogueProductsTotalAmountApi,
  websiteChatWidgetVerifyPaymentAndCreateOrderApi,
  websiteChatWidInitPaymentWithCreateOrderSessionApi,
} from "@/api/chatWidget/chatWidgetApi";
import { Loader2, Trash2 } from "lucide-react";
import AlertModal from "@/components/ui/modal/alertModal";
import useDebouncedTotalAmount from "@/hooks/chatWidget/cart/useDebouncedTotalAmount";
import { money } from "@/lib/pricing";
const STORAGE_KEY = "webOrderItemData";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const DirectBuySummary = ({
  customerAuthData,
  widgetData,
  onTopicSelect,
  simulateTyping,
  addMessage,
  onClose,
  handleQuickReply,
  paymentIntegrationData = {},
}) => {
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [cart, setCart] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("initial"); // 'initial', 'processing', 'redirecting', 'success', 'failed'
  const [error, setError] = useState(null);

  const { totalSummary, loading: totalSummaryLoading } =
    useDebouncedTotalAmount(cart, deliveryAddress);

  useEffect(() => {
    // Prefer sessionStorage over localStorage
    const rawData =
      sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);

    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);

      // Validate required fields
      if (!data?.slug && !data?.productId) return;

      setCart([data]);
    } catch (error) {
      console.error("Failed to parse order item data:", error);
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
    // Clean up storage
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    onClose?.();
  };

  const clearCart = () => {
    setCart([]);
    // Clean up storage
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    onClose?.();
  };

  const isDeliveryAddressRequired = cart?.some(
    (item) => item.itemType === "product" && item?.shipping?.available,
  );

  const getOrderItemsTotalAmount = async (orderItems) => {
    if (!customerAuthData?.customerId) return null;
    const response = await getCatalogueProductsTotalAmountApi({
      products: orderItems,
      customerId: customerAuthData?.customerId,
      deliveryAddress: deliveryAddress,
    });

    return response.data || null;
  };

  // Group cart items by shipping availability and dispatch point
  const groupCartItems = (cart) => {
    const orders = [];

    // Split into product vs service
    const products = cart.filter((i) => i.itemType === "product");
    const services = cart.filter((i) => i.itemType === "service");

    // --- Handle Products ---
    const shippable = products.filter((i) => i.shipping?.available);
    const nonShippable = products.filter((i) => !i.shipping?.available);

    // Group shippable products by dispatchPoint
    const groupedByDispatch = shippable.reduce((acc, item) => {
      const key = item?.dispatchPoints?.[0] || "default";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    // Convert groups into orders
    Object.keys(groupedByDispatch).forEach((dispatchPoint) => {
      orders.push({
        dispatchPoint,
        items: groupedByDispatch[dispatchPoint],
        shippingAvailable: true,
        type: "product",
      });
    });

    // Add non-shippable products as a separate order
    if (nonShippable.length > 0) {
      orders.push({
        dispatchPoint: null,
        items: nonShippable,
        shippingAvailable: false,
        type: "product",
      });
    }

    // --- Handle Services (always separate order) ---
    if (services.length > 0) {
      orders.push({
        dispatchPoint: null,
        items: services,
        shippingAvailable: false, // services don’t need shipping
        type: "service",
      });
    }

    return orders;
  };

  const calculateTotals = (orderData) => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    // Get shipping cost from the first shipping detail (if exists)
    let shippingCost = orderData.shippingDetails?.[0]?.shippingCost || 0;

    orderData.items.forEach((item) => {
      const qty = item.quantity || 0;
      const base = item.basePrice || 0;
      const sale = item.salePrice || 0;
      const gstRate = item.gstPercentage || 0;

      // before discount = base * qty
      const itemSubtotal = base * qty;

      // discount = (base - sale) * qty
      const itemDiscount = (base - sale) * qty;

      // GST = (sale * qty * gst%) / 100
      const itemGst = (sale * qty * gstRate) / 100;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalGst += itemGst;
    });

    const afterDiscount = subtotal - totalDiscount;
    // Add shipping cost to the final amount
    const finalAmount = afterDiscount + totalGst + shippingCost;

    return {
      subtotal,
      totalDiscount,
      afterDiscount,
      totalGst,
      shippingCost,
      finalAmount,
    };
  };

  const handleSubmitOrder = async () => {
    const groupedOrders = groupCartItems(cart);
    let orderResponses = [];

    for (const order of groupedOrders) {
      const totalSummary = order?.shippingAvailable
        ? await getOrderItemsTotalAmount(order?.items)
        : null;

      // let subtotal = 0;
      // let totalDiscount = 0;
      let orderGstPercentage = null;

      let totalWeight = 0;
      let totalLength = 0;
      let totalWidth = 0;
      let totalHeight = 0;

      if (order?.shippingAvailable) {
        order.items.forEach((item) => {
          const qty = item.quantity || 1;

          if (item?.shipping) {
            if (item?.selectedVariant && item?.selectedVariant?.weight) {
              totalWeight += (item?.selectedVariant?.weight || 0) * qty;
              totalLength +=
                (item?.selectedVariant?.dimensions?.length || 0) * qty;
              totalWidth +=
                (item?.selectedVariant?.dimensions?.width || 0) * qty;
              totalHeight +=
                (item?.selectedVariant?.dimensions?.height || 0) * qty;
            } else if (item?.shipping?.weight) {
              totalWeight += (item?.shipping?.weight || 0) * qty;
              totalLength += (item?.shipping?.dimensions?.length || 0) * qty;
              totalWidth += (item?.shipping?.dimensions?.width || 0) * qty;
              totalHeight += (item?.shipping?.dimensions?.height || 0) * qty;
            }
          }
        });
      }

      const items = order.items.map((item) => {
        const qty = item?.itemType === "product" ? item?.quantity || 1 : 1;

        let originalUnit = 0;
        let discountUnit = 0;
        let finalUnit = 0;
        let undiscPreTax = 0;

        let gstPercentage = 0;
        let gstAmount = 0;
        let groupId = null;
        if (item?.itemType === "product") {
          let variant = item.selectedVariant ||
            item.variants?.[0] || {
              basePrice: item.pricing?.basePrice || 0,
              salePrice: item.pricing?.salePrice,
            };

          undiscPreTax = variant.basePrice || 0;
          const discPreTax = variant.salePrice || undiscPreTax;
          groupId = variant?._id || null;

          gstPercentage = item.pricing?.taxApplicable
            ? item.pricing?.taxRate || 0
            : 0;

          gstAmount = undiscPreTax * (gstPercentage / 100) * qty;

          originalUnit = undiscPreTax;
          finalUnit = discPreTax;
          discountUnit = originalUnit - finalUnit;
        } else {
          let pkg = item?.selectedPackage ||
            item?.packages?.[0] || { price: 0, discountPercentage: 0 };

          const preTax = pkg.price || 0;

          gstPercentage = item.taxApplicable ? item?.taxRate || 0 : 0;
          gstAmount = preTax * (gstPercentage / 100) * qty;
          groupId = pkg?._id || null;
          originalUnit = preTax;
          finalUnit = originalUnit * (1 - (pkg.discountPercentage || 0) / 100);
          discountUnit = originalUnit - finalUnit;
        }

        const discountTotal = discountUnit * qty;
        const finalTotal = finalUnit * qty;

        // Track gstPercentage consistency
        if (orderGstPercentage === null) {
          orderGstPercentage = gstPercentage;
        } else if (orderGstPercentage !== gstPercentage) {
          orderGstPercentage = 0; // Mixed GST → reset
        }

        return {
          itemId: item?._id || item?.id,
          type: `catalog-${item?.itemType}`,
          description: item?.name,
          quantity: qty,
          quantityUnit: "pcs",
          groupId: groupId,

          basePrice: originalUnit,
          salePrice: finalUnit,
          gstPercentage,
          gstAmount,
          amount: finalTotal,
          discount: discountTotal,
        };
      });
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const {
        subtotal,
        totalDiscount,
        afterDiscount,
        totalGst,
        shippingCost,
        finalAmount,
      } = calculateTotals({
        ...order,
        items,
        shippingDetails: [{ shippingCost: totalSummary?.shippingCost || 0 }],
      });

      const orderData = {
        title: `${items?.[0]?.description || items?.[0]?.name || ""}`,
        items,
        paymentStatus: "Pending",
        shippingDetails: order?.shippingAvailable
          ? [
              {
                carrier: "",
                ...totalSummary, // shippingDetails shippingMethod
                shippingCost: totalSummary?.shippingCost || 0,
                weight: totalWeight,
                dimensions: {
                  length: totalLength,
                  width: totalWidth,
                  height: totalHeight,
                },
                shipToAddress: {
                  ...deliveryAddress,
                },
                dispatchPoint: {
                  dispatchPointId: order?.dispatchPoint || "",
                },
              },
            ]
          : [],
        subtotal,
        totalDiscount,
        afterDiscount,
        totalGst,
        shippingCost,
        finalAmount,
        source: "Website",
        paymentMilestones: [
          {
            id: "1",
            label: `${items?.[0]?.description || items?.[0]?.name || ""}`,
            amount: finalAmount,
            dueDate: dueDate,
            status: "Pending",
          },
        ],
      };

      const response = await createCatalogueOrderFromChatWidgetApi({
        customerId: customerAuthData?.customerId,
        orderData,
      });
      orderResponses.push({
        orderId: response?.data?.orderId,
      });
    }

    return orderResponses?.[0];
  };

  const handleOnlinePaymentOrderClick = async () => {
    setIsLoading(true);
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      console.error("Razorpay SDK failed to load");
      setIsLoading(false);
      setPaymentStatus("failed");
      return;
    }
    const groupedOrders = groupCartItems(cart);

    try {
      let allOrdersData = [];
      let totalAmount = 0;
      for (const order of groupedOrders) {
        const totalSummary = order?.shippingAvailable
          ? await getOrderItemsTotalAmount(order?.items)
          : null;

        // let subtotal = 0;
        // let totalDiscount = 0;
        let orderGstPercentage = null;

        let totalWeight = 0;
        let totalLength = 0;
        let totalWidth = 0;
        let totalHeight = 0;

        if (order?.shippingAvailable) {
          order.items.forEach((item) => {
            const qty = item.quantity || 1;
            if (item?.shipping) {
              if (item?.selectedVariant && item?.selectedVariant?.weight) {
                totalWeight += (item?.selectedVariant?.weight || 0) * qty;
                totalLength +=
                  (item?.selectedVariant?.dimensions?.length || 0) * qty;
                totalWidth +=
                  (item?.selectedVariant?.dimensions?.width || 0) * qty;
                totalHeight +=
                  (item?.selectedVariant?.dimensions?.height || 0) * qty;
              } else if (item?.shipping?.weight) {
                totalWeight += (item?.shipping?.weight || 0) * qty;
                totalLength += (item?.shipping?.dimensions?.length || 0) * qty;
                totalWidth += (item?.shipping?.dimensions?.width || 0) * qty;
                totalHeight += (item?.shipping?.dimensions?.height || 0) * qty;
              }
            }
          });
        }

        const items = order.items.map((item) => {
          const qty = item?.itemType === "product" ? item?.quantity || 1 : 1;

          let originalUnit = 0;
          let discountUnit = 0;
          let finalUnit = 0;
          let undiscPreTax = 0;

          let gstPercentage = 0;
          let gstAmount = 0;
          let groupId = null;
          if (item?.itemType === "product") {
            let variant = item.selectedVariant ||
              item.variants?.[0] || {
                basePrice: item.pricing?.basePrice || 0,
                salePrice: item.pricing?.salePrice,
              };

            undiscPreTax = variant.basePrice || 0;
            const discPreTax = variant.salePrice || undiscPreTax;
            groupId = variant?._id || null;

            gstPercentage = item.pricing?.taxApplicable
              ? item.pricing?.taxRate || 0
              : 0;

            gstAmount = undiscPreTax * (gstPercentage / 100) * qty;

            originalUnit = undiscPreTax;
            finalUnit = discPreTax;
            discountUnit = originalUnit - finalUnit;
          } else {
            let pkg = item?.selectedPackage ||
              item?.packages?.[0] || { price: 0, discountPercentage: 0 };

            const preTax = pkg.price || 0;

            gstPercentage = item.taxApplicable ? item?.taxRate || 0 : 0;
            gstAmount = preTax * (gstPercentage / 100) * qty;
            groupId = pkg?._id || null;
            originalUnit = preTax;
            finalUnit =
              originalUnit * (1 - (pkg.discountPercentage || 0) / 100);
            discountUnit = originalUnit - finalUnit;
          }

          const discountTotal = discountUnit * qty;
          const finalTotal = finalUnit * qty;

          // Track gstPercentage consistency
          if (orderGstPercentage === null) {
            orderGstPercentage = gstPercentage;
          } else if (orderGstPercentage !== gstPercentage) {
            orderGstPercentage = 0; // Mixed GST → reset
          }

          return {
            itemId: item?._id || item?.id,
            type: `catalog-${item?.itemType}`,
            description: item?.name,
            quantity: qty,
            quantityUnit: "pcs",
            groupId: groupId,

            basePrice: originalUnit,
            salePrice: finalUnit,
            gstPercentage,
            gstAmount,
            amount: finalTotal,
            discount: discountTotal,
          };
        });
        const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        const {
          subtotal,
          totalDiscount,
          afterDiscount,
          totalGst,
          shippingCost,
          finalAmount,
        } = calculateTotals({
          ...order,
          items,
          shippingDetails: [{ shippingCost: totalSummary?.shippingCost || 0 }],
        });

        const orderData = {
          title: `${items?.[0]?.description || items?.[0]?.name || ""}`,
          items,
          paymentStatus: "Pending",
          shippingDetails: order?.shippingAvailable
            ? [
                {
                  carrier: "",
                  ...totalSummary, // shippingDetails shippingMethod
                  shippingCost: totalSummary?.shippingCost || 0,
                  weight: totalWeight,
                  dimensions: {
                    length: totalLength,
                    width: totalWidth,
                    height: totalHeight,
                  },
                  shipToAddress: {
                    ...deliveryAddress,
                  },
                  dispatchPoint: {
                    dispatchPointId: order?.dispatchPoint || "",
                  },
                },
              ]
            : [],
          subtotal,
          totalDiscount,
          afterDiscount,
          totalGst,
          shippingCost,
          finalAmount,
          source: "Website",
          paymentMilestones: [
            {
              id: "1",
              label: `${items?.[0]?.description || items?.[0]?.name || ""}`,
              amount: finalAmount,
              dueDate: dueDate,
              status: "Paid",
            },
          ],
        };
        totalAmount += finalAmount;
        allOrdersData.push(orderData);
      }

      const values = {
        gatewayId: widgetData?.settings?.payment?.selectedGatewayId,
        customerId: customerAuthData.customerId,
        subdomain: window.location.hostname,
        orderData: allOrdersData, // Pass orders with calculated totals and shipping
        deliveryAddress: deliveryAddress,
        totalAmount: totalAmount, // Pass calculated total with shipping
      };

      const response =
        await websiteChatWidInitPaymentWithCreateOrderSessionApi(values);
      if (response?.message !== "success") {
        throw new Error(response.message || "Payment initialization failed");
      }
      let messageContent = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm dark:bg-blue-900/20 dark:border-blue-800">
                  <div class="text-center">
                    <h3 class="font-bold text-blue-800 text-lg mb-1 dark:text-blue-300">Payment Initiated</h3>
                    <p class="text-blue-600 text-sm mb-3 dark:text-blue-400">Your payment session is ready</p>
                  </div>
                    
                  <div class="mb-4">
                    <h4 class="font-medium text-gray-700 mb-2 dark:text-gray-300">Order Items (${cart.length})</h4>
                    <div class="space-y-2">
                `;

      // Add each cart item to the message
      cart.forEach((item) => {
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

        // Handle different media types
        let mediaContent = "";
        if (item?.images?.[0]) {
          mediaContent = `<img src="${item?.images[0]}" alt="${item?.name}" class="w-12 h-12 object-cover rounded-lg" />`;
        } else if (item?.video) {
          mediaContent = `
                    <div class="relative w-12 h-12 bg-gray-200 rounded-lg overflow-hidden dark:bg-gray-700">
                      <video src="${item?.video}" class="w-full h-full object-cover" muted></video>
                      <div class="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  `;
        } else {
          mediaContent = `
                    <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center dark:bg-gray-700">
                      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  `;
        }

        messageContent += `
                  <div class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-gray-700/50">
                    ${mediaContent}
                    <div class="flex-1 min-w-0">
                      <h5 class="font-medium text-gray-900 truncate dark:text-white">${
                        item?.name
                      }</h5>
                      <div class="flex items-center space-x-2 mt-1">
                        ${
                          item?.itemType === "product" && item?.selectedVariant
                            ? `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">${item?.selectedVariant.name}</span>`
                            : ""
                        }
                        ${
                          item?.itemType === "service" && item?.selectedPackage
                            ? `<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-200">${item?.selectedPackage.name}</span>`
                            : ""
                        }
                        <span class="text-xs text-gray-500 dark:text-gray-400">×${qty}</span>
                      </div>
                    </div>
                    <div class="text-right">
                      ${
                        discountTotal > 0
                          ? `<div class="text-xs text-gray-400 line-through dark:text-gray-500">${money(
                              originalTotal.toFixed(2),
                            )}</div>`
                          : ""
                      }
                      <div class="font-semibold text-gray-900 dark:text-white">${money(
                        finalTotal.toFixed(2),
                      )}</div>
                    </div>
                  </div>
                `;
      });

      // Close the divs properly and add total
      messageContent += `
                  </div>
                </div>
                  
                <div class="border-t border-gray-200 dark:border-gray-600 pt-3 mt-2 text-sm text-gray-700 dark:text-gray-300">
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
                      totalSummary?.isShippingAvailable &&
                      !totalSummary?.shippingIssues
                        ? `
                    <div class="flex justify-between items-center">
                      <span>Shipping Cost:</span>
                      ${
                        totalSummary?.shippingCost == 0
                          ? `
                        <span class="text-green-500 dark:text-green-400">Free Shipping</span>
                        `
                          : `<span>${money(
                              totalSummary?.shippingCost,
                            )}</span>`
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
              </div>
              `;

      onTopicSelect(messageContent);
      const optionsData = response?.data;
      const options = {
        key: optionsData.keyId,
        amount: optionsData.amount,
        currency: optionsData.currency,
        name: optionsData?.businessName || "",
        order_id: optionsData.order_id,
        handler: async function (response) {
          try {
            // ✅ Verify payment and CREATE ORDER after successful payment
            const verifyResponse =
              await websiteChatWidgetVerifyPaymentAndCreateOrderApi({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                paymentAttemptId: optionsData.paymentAttemptId,
              });

            if (verifyResponse?.message == "success") {
              const orderIds = verifyResponse?.orderIds || [];

              let messageContent = `
                <div class="flex flex-col gap-3 
                  bg-gray-50 dark:bg-gray-700
                  border border-gray-200 dark:border-gray-600
                  rounded-lg p-4 text-sm 
                  text-gray-700 dark:text-gray-200 max-w-sm">
                  <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
                        Order Successful
                      </h3>
                    </div>
                    <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      Payment Received
                    </span>
                  </div>
                  ${orderIds
                    .map(
                      (orderId, index) => `
                      <div class="flex items-center justify-between pb-2 ${
                        orderIds.length - 1 === index
                          ? "border-b border-gray-200 dark:border-gray-600"
                          : ""
                      }">
                        <div class="flex items-center gap-2">
                          <h3 class="font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
                            ${index === 0 ? "Order ID:" : ""}
                          </h3>
                        </div>
                        <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          ${orderId}
                        </span>
                      </div>
                    `,
                    )
                    .join("")}
              `;

              // Add each cart item to the message
              cart.forEach((item, index) => {
                let originalUnit = 0;
                let discountUnit = 0;
                let finalUnit = 0;
                const qty =
                  item?.itemType === "product" ? item?.quantity || 1 : 1;

                if (item?.itemType === "product") {
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
                  <div class="flex items-start gap-3 ${
                    index > 0 ? "pt-2" : ""
                  }">
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
                                  originalTotal.toFixed(2),
                                )}</div>`
                              : ""
                          }
                          <div class="text-xs font-medium">${money(
                            finalTotal.toFixed(2),
                          )}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              });

              // Add order total
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
                      totalSummary?.isShippingAvailable &&
                      !totalSummary?.shippingIssues
                        ? `
                    <div class="flex justify-between items-center">
                      <span>Shipping Cost:</span>
                      ${
                        totalSummary?.shippingCost == 0
                          ? `
                        <span class="text-green-500 dark:text-green-400">Free Shipping</span>
                        `
                          : `<span>${money(
                              totalSummary?.shippingCost,
                            )}</span>`
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
                  
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-3">
                    <p>Thank you for your order! We'll process it shortly.</p>
                  </div>
                  <div class="text-center">
                    <a href="/chat?" 
                       class="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 no-underline dark:bg-blue-500 dark:hover:bg-blue-600">
                      Track Your Order
                    </a>
                  </div>
                </div>
              </div>
            `;

              // On success, send the order summary message
              onTopicSelect(messageContent);
            } else {
              // ❌ Payment verification failed
              setPaymentStatus("failed");
              setError(
                verifyResponse.message ||
                  "Error verifying payment. Please check your payment status.",
              );
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            setPaymentStatus("failed");
            setError(
              error.message ||
                "Error verifying payment. Please check your payment status.",
            );
          }
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Error initializing Razorpay:", error);
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    setLoading(true);
    const orderItems = cart;
    if (paymentIntegrationData && paymentIntegrationData?.type === "online") {
      handleOnlinePaymentOrderClick();
      return;
    }
    try {
      setLoading(true);
      const responseOrder = await handleSubmitOrder(orderItems, totalSummary);
      const orderId = responseOrder?.orderId;
      if (!orderId) {
        setLoading(false);
        return setSnackbar({
          open: true,
          message: "Failed to create order",
          type: "error",
        });
      }

      let messageContent = `
      <div class="flex flex-col gap-3 
        bg-gray-50 dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-lg p-4 text-sm 
        text-gray-700 dark:text-gray-200 max-w-sm">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
              Order Summary 
            </h3>
          </div>
            <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                #${orderId}
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
                      originalTotal.toFixed(2),
                    )}</div>`
                  : ""
              }
              <div class="text-xs font-medium">${money(
                finalTotal.toFixed(2),
              )}</div>
            </div>
          </div>
        </div>
      </div>
    `;
      });

      // Add order total
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
          
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <p>Thank you for your order! We'll process it shortly.</p>
          </div>
        </div>
      </div>
    `;

      // On success, send the order summary message
      onTopicSelect(messageContent);

      const quickReply = `
          <div class="flex items-center gap-3 
            bg-gray-50 dark:bg-gray-700
            border border-gray-200 dark:border-gray-600
            rounded-lg p-3 text-left text-sm 
            text-gray-700 dark:text-gray-200">
            Your order has been received. We'll contact you soon for payment details.
          </div>
        `;
      setTimeout(() => {
        handleQuickReply(quickReply);
      }, 1000);
    } catch (error) {
      console.error("Error creating order:", error);
      setSnackbar({
        open: true,
        message:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Error creating order.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const productItemIsNotAvailableForDelivery = (itemId) => {
    if (!itemId || !Array.isArray(totalSummary?.shippingIssues)) return null;

    for (const issue of totalSummary?.shippingIssues) {
      if (issue?.productsIds?.includes(itemId.toString())) {
        return (
          issue.message || "This product cannot be shipped to your address."
        );
      }
    }

    return null; // No issue found for this product
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Summary
        </h3>
        {cart?.length > 0 && (
          <button
            onClick={clearCart}
            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {cart?.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-gray-500">Your cart is empty</p>
        </div>
      ) : (
        <>
          {isDeliveryAddressRequired && (
            <DeliveryAddressUI
              customerAuthData={customerAuthData}
              selectedAddress={deliveryAddress}
              setSelectedAddress={setDeliveryAddress}
            />
          )}
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
                      <p className="text-xs text-red-600">
                        {productItemIsNotAvailableForDelivery(item?._id)}
                      </p>
                      <h4 className="text-sm font-medium line-clamp-2">
                        {item?.name}
                      </h4>
                      {item?.itemType === "product" &&
                        item?.selectedVariant && (
                          <div className="mt-2 flex-1">
                            <select
                              value={item?.selectedVariant?._id}
                              onChange={(e) => {
                                const variant = item?.variants.find(
                                  (v) => v._id === e.target.value,
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
                                  variant,
                                );
                                updateCartItem(index, "quantity", 1);
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
                      {item?.itemType === "service" &&
                        item?.selectedPackage && (
                          <div className="mt-2">
                            <select
                              value={item?.selectedPackage._id}
                              onChange={(e) => {
                                const pkg = item?.packages.find(
                                  (p) => p._id === e.target.value,
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

                    {item?.itemType === "product" && (
                      <div className="flex items-center mt-3">
                        <button
                          onClick={() =>
                            updateCartItem(
                              index,
                              "quantity",
                              Math.max(1, item?.quantity - 1),
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
                              Math.min(item?.quantity + 1, maxQty),
                            );
                          }}
                          className="w-6 h-6 flex items-center justify-center border rounded-r bg-gray-100 hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
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

          <div className="border-t pt-4 mt-4">
            <div className="space-y-1 mb-4">
              {isDeliveryAddressRequired && !deliveryAddress ? (
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
              <div className="flex justify-between font-medium text-base pt-2 border-t">
                <span>Total:</span>
                {totalSummaryLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    <span className="ml- font-mono text-gray-500">
                      Loading...
                    </span>
                  </div>
                ) : (
                  <span>{money(totalSummary?.total || 0)}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleCreateOrder}
              disabled={
                loading ||
                isLoading ||
                cart.length === 0 ||
                totalSummary?.shippingIssues ||
                (isDeliveryAddressRequired && !deliveryAddress)
              }
              type="button"
              className="w-full bg-[var(--primary-color)] text-white py-2.5 rounded-md transition-colors font-medium
             hover:bg-[color-mix(in oklab, var(--primary-color) 85%, black)]
             disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--primary-color)] flex justify-center items-center"
            >
              {loading || isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />{" "}
                  <span className="ml-2">Placing Order...</span>
                </>
              ) : (
                <>Place Order</>
              )}
            </button>
          </div>
        </>
      )}

      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </div>
  );
};

export default DirectBuySummary;
