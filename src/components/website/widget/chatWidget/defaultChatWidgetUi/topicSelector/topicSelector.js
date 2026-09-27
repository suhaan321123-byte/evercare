import {
  chatWidgetSideClearCartItemApi,
  createCatalogueOrderFromChatWidgetApi,
  getCatalogueProductsTotalAmountApi,
  getChatWidgetSideTopicsCatalogueApi,
  getChatWidgetSideTopicsCatalogueItemsApi,
  websiteChatWidgetVerifyPaymentAndCreateOrderApi,
  websiteChatWidInitPaymentWithCreateOrderSessionApi,
} from "@/api/chatWidget/chatWidgetApi";
import { Loader2, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { IoCartOutline } from "react-icons/io5";
import DeliveryAddressUI from "./deliveryAddressUi";
import { useRouter, useSearchParams } from "next/navigation";
import AlertModal from "@/components/ui/modal/alertModal";
import useDebouncedTotalAmount from "@/hooks/chatWidget/cart/useDebouncedTotalAmount";
import { useCart } from "@/context/CartContext";
import { money } from "@/lib/pricing";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const TopicSelector = ({
  // customerAuthData,
  widgetData,
  onTopicSelect,
  simulateTyping,
  addMessage,
  onClose,
  handleQuickReply,
  defaultView = "topic",
  viewMode,
  paymentIntegrationData,
  baseUrl = "",
}) => {
  const {
    cart,
    setCart,
    addToCart,
    customerAuthData,
    removeFromCart,
    updateCartItem,
  } = useCart();
  const [view, setView] = useState(defaultView || "topic");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [catalogues, setCatalogues] = useState([]);
  const [catalogueItems, setCatalogueItems] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState({});
  const [selectedPackage, setSelectedPackage] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("initial"); // 'initial', 'processing', 'redirecting', 'success', 'failed'
  const [error, setError] = useState(null);

  const { totalSummary, loading: totalSummaryLoading } =
    useDebouncedTotalAmount(cart, deliveryAddress);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Filter items based on search term
  const filteredItems = catalogueItems.filter(
    (item) =>
      item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item?.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item?.categoryId?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  const getChatWidgetSideTopicsCatalogueData = async (topic) => {
    try {
      const values = {
        selectedTopic: topic,
      };
      const response = await getChatWidgetSideTopicsCatalogueApi(values);
      if (response.message == "success") {
        setCatalogues(response?.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getChatWidgetSideCatalogueItems = async (topic) => {
    try {
      const values = {
        catalogueId: topic?._id,
        type: topic?.type,
      };
      const response = await getChatWidgetSideTopicsCatalogueItemsApi(values);
      if (response.message == "success") {
        const items = response?.data || [];
        setCatalogueItems(items);

        // Initialize selected variants and packages
        const variantsInit = {};
        const packagesInit = {};
        const quantitiesInit = {};

        items.forEach((item) => {
          if (
            selectedTopic?.catalogueType === "product" &&
            item?.variants?.length > 0
          ) {
            const inStockVariant = item.variants.find((v) => v.stock > 0);
            variantsInit[item._id] = inStockVariant || item.variants[0];
          }
          if (
            selectedTopic?.catalogueType === "service" &&
            item?.packages?.length > 0
          ) {
            packagesInit[item?._id] = item?.packages[0];
          }
          quantitiesInit[item?._id] = 1;
        });

        setSelectedVariant(variantsInit);
        setSelectedPackage(packagesInit);
      }
    } catch (error) {
      console.error(error);
    }
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
              totalLength += (item?.selectedVariant?.dimensions?.length || 0) * qty;
              totalWidth += (item?.selectedVariant?.dimensions?.width || 0) * qty;
              totalHeight += (item?.selectedVariant?.dimensions?.height || 0) * qty;
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
        title:
          items[0]?.description ||
          `Catalogue: ${selectedTopic?.name || ""} Order`,
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
            label: `Catalogue: ${selectedTopic?.name || ""} Order`,
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

    return orderResponses;
  };

  const handleOnlinePaymentOrderClick = async () => {
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
              totalLength += (item?.selectedVariant?.dimensions?.length || 0) * qty;
              totalWidth += (item?.selectedVariant?.dimensions?.width || 0) * qty;
              totalHeight += (item?.selectedVariant?.dimensions?.height || 0) * qty;
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
                        <span>-${money(
                          totalSummary?.totalDiscount,
                        )}</span>
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
                      ${
                        totalSummary?.subtotal
                          ? `<div class="flex justify-between items-center">
                        <span>Subtotal:</span>
                        <span>${money(totalSummary?.subtotal)}</span>
                      </div>`
                          : ""
                      }
                      ${
                        totalSummary?.totalDiscount > 0
                          ? `
                      <div class="flex justify-between items-center text-green-500 dark:text-green-400">
                        <span>Discount:</span>
                        <span>-${money(
                          totalSummary?.totalDiscount,
                        )}</span>
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
                      ${
                        totalSummary?.total
                          ? `<div class="flex justify-between items-center font-medium border-t border-gray-200 dark:border-gray-600 pt-2">
                        <span>Total:</span>
                        <span>${money(totalSummary?.total)}</span>
                      </div>`
                          : ""
                      }
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

              // 4. Clear cart from backend and frontend
              await chatWidgetSideClearCartItemApi({
                customerId: customerAuthData?.customerId,
              });
              setCart([]);
              localStorage.setItem("webCartTotalCount", JSON.stringify(0));
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
    setIsLoading(true);
    if (paymentIntegrationData && paymentIntegrationData?.type === "online") {
      handleOnlinePaymentOrderClick();
      return;
    }
    const groupedOrdersForDisplay = groupCartItems(cart);
    const cartNotEmpty = cart.length > 0;

    try {
      // 1. Submit the order(s) to the backend first.
      const orderResponses = await handleSubmitOrder();

      // 2. On success, display the order summaries in the chat.
      for (let i = 0; i < groupedOrdersForDisplay.length; i++) {
        const order = groupedOrdersForDisplay[i];
        const orderResponse = orderResponses[i];
        const orderId = orderResponse?.orderId || `ORD-${Date.now()}-${i}`;

        // Start order block
        let messageContent = `
      <div class="flex flex-col gap-3 
        bg-gray-50 dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-lg p-4 text-sm 
        text-gray-700 dark:text-gray-200 max-w-sm">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
          <h3 class="font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
            Order Summary
          </h3>
          <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
            #${orderId}
          </span>
        </div>
      `;
        // Items inside each group
        order?.items.forEach((item, index) => {
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
            const taxMult = item.taxApplicable
              ? 1 + (item.taxRate || 0) / 100
              : 1;
            originalUnit = preTax * taxMult;
            finalUnit =
              originalUnit * (1 - (pkg.discountPercentage || 0) / 100);
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

        const totalSummary = await getOrderItemsTotalAmount(order?.items);
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
      `;
        // End of order block
        messageContent += `</div>`;

        // ✅ Send each grouped order message
        onTopicSelect(messageContent);
      }

      // 3. Show final confirmation and clear the cart.
      if (cartNotEmpty) {
        const quickReply = `
      <div class="flex items-center gap-3 
        bg-gray-50 dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-lg p-3 text-left text-sm 
        text-gray-700 dark:text-gray-200">
        Your orders have been received. We'll contact you soon for payment details.
      </div>
    `;
        setTimeout(() => handleQuickReply(quickReply), 1000);
        onClose();
      }

      // 4. Clear cart from backend and frontend
      await chatWidgetSideClearCartItemApi({
        customerId: customerAuthData?.customerId,
      });
      setCart([]);
      localStorage.setItem("webCartTotalCount", JSON.stringify(0));
    } catch (error) {
      // 5. On failure, show an error message to the user.
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
      setIsLoading(false);
    }
  };

  const handleSelectOption = (topic) => {
    if (topic?.type === "custom") {
      let messageContent = `
    <div class="flex items-center gap-3 
      bg-gray-50 dark:bg-gray-700
      border border-gray-200 dark:border-gray-600
      rounded-lg p-3 text-left text-sm 
      text-gray-700 dark:text-gray-200">
  `;

      if (topic?.image) {
        messageContent += `
      <img src="${topic.image}" alt="${topic.name}" 
        class="w-6 h-6 object-contain" />
    `;
      }

      messageContent += `
    <div class="flex-1">
      <h3 class="font-medium">${topic?.name || ""}</h3>
  `;

      if (topic?.description) {
        messageContent += `
      <p class="text-xs text-gray-500 dark:text-gray-400">
        ${topic.description}
      </p>
    `;
      }

      messageContent += `</div>`;

      if (topic?.price) {
        messageContent += `
      <span class="text-xs 
        bg-white dark:bg-gray-800
        text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]
        px-2 py-1 rounded">
        ${topic.price}
      </span>
    `;
      }

      messageContent += `</div>`;
      onTopicSelect(messageContent);

      if (topic?.quickReply) {
        const quickReply =
          `<div class="flex items-center gap-3 
        bg-gray-50 dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-lg p-3 text-left text-sm 
        text-gray-700 dark:text-gray-200">${topic?.quickReply}</div>` || "";
        setTimeout(() => {
          handleQuickReply(quickReply);
        }, 1000);
        onClose();
      }
    } else if (topic?.type === "catalogue") {
      setSelectedTopic(topic);
      getChatWidgetSideTopicsCatalogueData(topic);
      setView("catalogue");
    } else if (topic?.type === "template") {
      setView("template");
      if (topic?.templateKey == "order_status") {
        let messageContent = `
      <div class="flex items-center gap-3 
        bg-gray-50 
        border border-gray-200 
        rounded-lg p-3 text-left text-sm 
        text-gray-700">
        <div class="flex-1">
          <h3 class="font-medium">${topic?.name || ""}</h3>
        </div>`;
        onTopicSelect(topic);
      }
    }
  };

  const handleSelectCatalogueItem = (item) => {
    if (selectedTopic?.catalogueType === "product") {
      setView("catalogueProductItem");
    } else {
      setView("catalogueServiceItem");
    }
    getChatWidgetSideCatalogueItems(item);
  };

  const handleVariantChange = (productId, variant) => {
    setSelectedVariant((prev) => ({
      ...prev,
      [productId]: variant,
    }));
  };

  const handlePackageChange = (serviceId, pkg) => {
    setSelectedPackage((prev) => ({
      ...prev,
      [serviceId]: pkg,
    }));
  };
  const sendEnquiryRequest = async (item, catalogueType = "Product") => {
    if (!item) return;

    let messageContent = `
    <div class="flex items-start gap-3 
      bg-blue-50 dark:bg-blue-900/20
      border border-blue-200 dark:border-blue-700
      rounded-lg p-3 text-left 
      text-gray-800 dark:text-gray-100
      max-w-sm mx-auto">
      
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
          <h3 class="font-semibold text-sm truncate">${item?.name || ""}</h3>
          <span class="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 capitalize">
    ${catalogueType} Enquiry
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
              catalogueType || ""
            }. Please share more details about availability, pricing, and delivery options.
          </p>
        </div>
      </div>
    </div>
    `;

    onTopicSelect(messageContent);

    // Add a small delay before showing the confirmation
    setTimeout(() => {
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
            <p class="mt-1 text-xs">Our team will respond to you shortly.</p>
          </div>
        </div>
      `;
      handleQuickReply(quickReply);
    }, 1000);
    onClose();
  };

  const renderPrice = (item) => {
    if (selectedTopic?.catalogueType === "product") {
      if (!item?.pricing?.priceVisible) {
        return null;
      }

      const variant = selectedVariant[item?._id];
      let basePrice = variant?.basePrice || item?.pricing?.basePrice || 0;
      let price =
        variant?.salePrice ||
        variant?.basePrice ||
        item?.pricing?.salePrice ||
        item?.pricing?.basePrice ||
        0;

      // 👉 Apply tax if applicable
      if (item?.pricing?.taxApplicable) {
        const taxMultiplier = 1 + (item?.pricing?.taxRate || 0) / 100;
        basePrice = basePrice * taxMultiplier;
        price = price * taxMultiplier;
      }

      const discountPercentage =
        variant?.discountPercentage || ((basePrice - price) / basePrice) * 100;

      return (
        <div className="flex flex-col items-end">
          {discountPercentage > 0 ? (
            <>
              <span className="text-sm font-medium text-gray-900">
                {money(price)}
              </span>
              <span className="text-xs line-through text-gray-500">
                {money(basePrice)}
              </span>
              <span className="text-xs text-green-600">
                {Math.round(discountPercentage)}% off
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-gray-900">
              {money(price)}
            </span>
          )}
        </div>
      );
    } else {
      if (!item?.priceVisible) {
        return null;
      }

      // 👉 Service item pricing
      const pkg = selectedPackage[item?._id] || item?.packages?.[0];
      let price = pkg?.price || 0;
      const discountPercentage = pkg?.discountPercentage || 0;

      // 👉 Apply tax if applicable
      if (item?.taxApplicable) {
        const taxMultiplier = 1 + (item?.taxRate || 0) / 100;
        price = price * taxMultiplier;
      }

      const discountedPrice = price * (1 - discountPercentage / 100);

      return (
        <div className="flex flex-col items-end">
          {discountPercentage > 0 ? (
            <>
              <span className="text-sm font-medium text-gray-900">
                {money(discountedPrice)}
              </span>
              <span className="text-xs line-through text-gray-500">
                {money(price)}
              </span>
              <span className="text-xs text-green-600">
                {discountPercentage}% off
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-gray-900">
              {money(price)}
            </span>
          )}
        </div>
      );
    }
  };

  const renderBackButton = () => (
    <button
      onClick={() => {
        if (
          view === "catalogueProductItem" ||
          view === "catalogueServiceItem"
        ) {
          setView("catalogue");
        } else if (view === "catalogue") {
          setView("topic");
        } else if (view === "cartSummary") {
          onClose();
          // setView("catalogue");
        }
      }}
      className="flex items-center gap-1 text-sm text-[var(--primary-color)] hover:text-[var(--primary-color-dark)] px-2 py-1 rounded hover:bg-gray-100"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      Back
    </button>
  );

  const renderCartButton = () => (
    <button
      onClick={() => setView("cartSummary")}
      className={`relative p-2 rounded-full ${
        cart.length > 0
          ? "bg-[var(--primary-color)] text-white"
          : "bg-gray-200 text-gray-500"
      }`}
    >
      <IoCartOutline size={18} />
      {cart.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-white text-[var(--primary-color)] text-xs rounded-full h-5 w-5 flex items-center justify-center border border-[var(--primary-color)]">
          {cart.length}
        </span>
      )}
    </button>
  );

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

  const handleViewItemDetails = (item) => {
    router.push(
      `${baseUrl}/${item?.itemType === "product" ? "product" : "service"}/${
        item?.slug
      }`,
    );
  };
  const renderCartSummary = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
        <span>Your Cart ({cart.length})</span>
        {renderCartButton()}
      </h3>

      {cart.length === 0 ? (
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
                        className="w-16 h-16 object-cover rounded cursor-pointer"
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
                      <p className="text-xs text-red-600">
                        {productItemIsNotAvailableForDelivery(item?._id)}
                      </p>
                      {item?.warningMessage && (
                        <p className="text-xs text-red-600 mt-1">
                          {item.warningMessage}
                        </p>
                      )}
                      <h4
                        onClick={() => handleViewItemDetails(item)}
                        className="text-sm font-medium line-clamp-2 cursor-pointer"
                      >
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

                  {/* Price & Quantity controls */}
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

                    {/* Quantity controls */}
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

                {/* Remove button */}
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
                isLoading ||
                cart.length === 0 ||
                totalSummary?.shippingIssues ||
                (isDeliveryAddressRequired && !deliveryAddress)
              }
              type="button"
              className="w-full bg-[var(--primary-color)] text-white py-2.5 px-4 rounded-md transition-all duration-200 font-medium
    hover:bg-[color-mix(in_oklab,var(--primary-color)_85%,black)] hover:shadow-md
    active:bg-[color-mix(in_oklab,var(--primary-color)_70%,black)] active:scale-[0.995]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--primary-color)] disabled:shadow-none disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Placing Order...</span>
                </div>
              ) : (
                <span>Place Order</span>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderProductItem = (item) => {
    // Add these calculations before the return JSX
    const hasVariants = item?.variants?.length > 0;
    const selectedVar = hasVariants ? selectedVariant[item?._id] : null; // Adjust if using packages
    const existingIndex = cart.findIndex((cartItem) => {
      if (cartItem?._id === item?._id) {
        if (selectedTopic?.catalogueType === "product") {
          return cartItem?.selectedVariant?._id === selectedVar?._id;
        } else {
          return (
            cartItem?.selectedPackage?._id === selectedPackage[item?._id]?._id
          );
        }
      }
      return false;
    });
    const isInCart = existingIndex >= 0;
    const currentQuantity = isInCart ? cart[existingIndex].quantity : 1;
    const maxQty = selectedVar
      ? selectedVar.stock
      : item?.inventory?.totalQuantity || Infinity; // Fallback to Infinity if no stock limit

    return (
      <div
        key={item?._id || ""}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      >
        <div className="flex gap-4">
          {item?.images?.[0] ? (
            <img
              src={item?.images[0]}
              alt={item?.name}
              className="w-12 h-12 object-cover rounded-lg"
            />
          ) : item?.video ? (
            <video
              src={item?.video}
              alt={item?.name}
              className="w-12 h-12 object-cover rounded-lg"
              muted
              loop
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-xs">No Image</span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
              {item?.name}
            </h3>
            {/* <p className="text-xs text-gray-500 mb-3 line-clamp-2">
              {item?.description}
            </p> */}
          </div>
          {renderPrice(item)}
        </div>

        {item?.pricing?.priceVisible ? (
          <div
            className={`mt-4 flex items-center gap-2 ${
              hasVariants ? "justify-between" : "justify-end"
            }`}
          >
            {hasVariants && (
              <div className="mb-3 flex-1">
                <label className="text-xs text-gray-600 block mb-1">
                  {item?.variantTitle || "Variant"}:
                </label>
                <select
                  value={selectedVariant[item?._id]?._id}
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
                    handleVariantChange(item?._id, variant);
                  }}
                  className="text-xs w-full p-2 border rounded bg-white"
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
                        {variant?.name} ({money(salePrice || basePrice)})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {item?.button == "Chat" || item?.button == "Contact" ? (
              <button
                className="flex items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-2 text-sm font-medium text-white transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-2"
                aria-label="Send Enquiry Request"
                onClick={() => handleProductButtonClick(item)}
                // onClick={() => handleSendEnquiryRequest(item, "webOrderSendEnquiryRequestItemWithPriceData")}
              >
                Send Enquiry Request
              </button>
            ) : (
              <div>
                {isInCart ? (
                  <div className="flex items-center">
                    {/* Minus Button with icon */}
                    <button
                      onClick={() => {
                        const newQty = currentQuantity - 1;
                        if (newQty <= 0) {
                          removeFromCart(existingIndex);
                        } else {
                          updateCartItem(existingIndex, "quantity", newQty);
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center border rounded-l bg-gray-100 hover:bg-gray-200"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>

                    {/* Quantity display or input */}
                    <input
                      type="number"
                      min="1"
                      value={currentQuantity}
                      onChange={(e) => {
                        let value = Number(e.target.value);
                        if (isNaN(value) || value < 1) value = 1;
                        if (value > maxQty) value = maxQty;
                        updateCartItem(existingIndex, "quantity", value);
                      }}
                      className="w-12 h-8 text-center border-t border-b text-sm"
                    />

                    {/* Plus Button with icon */}
                    <button
                      onClick={() => {
                        const newQty = currentQuantity + 1;
                        if (newQty <= maxQty) {
                          updateCartItem(existingIndex, "quantity", newQty);
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center border rounded-r bg-gray-100 hover:bg-gray-200"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item)}
                    className="flex items-center gap-2 bg-[var(--primary-color)] hover:shadow-md text-white px-4 py-2 rounded text-sm font-medium"
                    aria-label="Add to Cart"
                  >
                    <FaShoppingCart />
                    Add to Cart
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <button
              className="flex items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-2 text-sm font-medium text-white transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-2"
              aria-label="Send Enquiry Request"
              onClick={() => handleProductButtonClick(item)}
            >
              Send Enquiry Request
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderServiceItem = (item) => {
    // Add these calculations before the return JSX (similar to renderProductItem)
    const hasPackages = item?.packages?.length > 0;
    const selectedPkg = hasPackages ? selectedPackage[item?._id] : null;

    const existingIndex = cart.findIndex((cartItem) => {
      if (cartItem?._id === item?._id) {
        return cartItem?.selectedPackage?._id === selectedPkg?._id;
      }
      return false;
    });

    const isInCart = existingIndex >= 0;
    const currentQuantity = isInCart ? cart[existingIndex].quantity : 1;

    // For services, we might not have stock limits, but if we do, use it
    const maxQty = selectedPkg
      ? selectedPkg.stock || Infinity
      : item?.inventory?.totalQuantity || Infinity;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4">
          {item?.images?.[0] ? (
            <img
              src={item?.images[0]}
              alt={item?.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
          ) : item?.video ? (
            <video
              src={item?.video}
              alt={item?.name}
              className="w-20 h-20 object-cover rounded-lg"
              controls
              muted
              loop
            />
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-xs">No Image</span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {item?.name}
            </h3>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">
              {item?.description}
            </p>
          </div>
          {renderPrice(item)}
        </div>

        {item?.priceVisible ? (
          <div
            className={`mt-4 flex items-center gap-2 ${
              hasPackages ? "justify-between" : "justify-end"
            }`}
          >
            {hasPackages && (
              <div className="mb-3">
                <label className="text-xs text-gray-600 block mb-1">
                  Package:
                </label>
                <select
                  value={selectedPackage[item?._id]?._id}
                  onChange={(e) => {
                    const pkg = item?.packages.find(
                      (p) => p._id === e.target.value,
                    );
                    handlePackageChange(item?._id, pkg);
                  }}
                  className="text-xs w-full p-2 border rounded bg-white"
                >
                  {item?.packages.map((pkg) => {
                    let pkgPrice = pkg.price || 0;

                    // Apply tax if applicable
                    if (item?.taxApplicable) {
                      const taxMultiplier = 1 + (item?.taxRate || 0) / 100;
                      pkgPrice = pkgPrice * taxMultiplier;
                    }

                    // Apply discount if applicable
                    const finalPrice =
                      pkg.discountPercentage > 0
                        ? pkgPrice * (1 - pkg.discountPercentage / 100)
                        : pkgPrice;

                    return (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} ({money(finalPrice.toFixed(2))})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <div>
              {isInCart ? (
                <div className="flex items-center">
                  {/* Minus Button */}
                  <button
                    onClick={() => {
                      const newQty = currentQuantity - 1;
                      if (newQty <= 0) {
                        removeFromCart(existingIndex);
                      } else {
                        updateCartItem(existingIndex, "quantity", newQty);
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center border rounded-l bg-gray-100 hover:bg-gray-200"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>

                  {/* Quantity display or input */}
                  <input
                    type="number"
                    min="1"
                    value={currentQuantity}
                    onChange={(e) => {
                      let value = Number(e.target.value);
                      if (isNaN(value) || value < 1) value = 1;
                      if (value > maxQty) value = maxQty;
                      updateCartItem(existingIndex, "quantity", value);
                    }}
                    className="w-12 h-8 text-center border-t border-b text-sm"
                  />

                  {/* Plus Button */}
                  <button
                    // onClick={() => {
                    //   const newQty = currentQuantity + 1;
                    //   if (newQty <= maxQty) {
                    //     updateCartItem(existingIndex, "quantity", newQty);
                    //   }
                    // }}
                    className="w-8 h-8 flex items-center justify-center border rounded-r bg-gray-100 hover:bg-gray-200"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(item)}
                  className="flex items-center gap-2 bg-[var(--primary-color)] hover:shadow-md text-white px-4 py-2 rounded text-sm font-medium"
                  aria-label="Add to Cart"
                >
                  <FaShoppingCart />
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <button
              className="flex items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-2 text-sm font-medium text-white transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-2"
              aria-label="Send Enquiry Request"
              onClick={() => sendEnquiryRequest(item, "Service")}
            >
              Send Enquiry Request
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleSendEnquiryRequest = (
    item,
    enquiryMode = "webOrderSendEnquiryRequestItemData",
  ) => {
    localStorage.setItem(
      enquiryMode || "webOrderSendEnquiryRequestItemData",
      JSON.stringify(item),
    );
    if (enquiryMode == "webOrderSendEnquiryRequestItemData") {
      sessionStorage.removeItem("webOrderSendEnquiryRequestItemWithPriceData");
      localStorage.removeItem("webOrderSendEnquiryRequestItemWithPriceData");
    } else {
      sessionStorage.removeItem("webOrderSendEnquiryRequestItemData");
      localStorage.removeItem("webOrderSendEnquiryRequestItemData");
    }

    if (viewMode == "desktop") {
      // Get current pathname and query params
      const currentPath = window.location.pathname;
      const params = new URLSearchParams(searchParams.toString());

      // Add or update query params
      params.set("chat", "open");
      params.set("source", "send_enquiry_request");

      // Construct new URL
      const newUrl = `${currentPath}?${params.toString()}`;

      // Navigate
      router.push(newUrl);
    } else if (viewMode == "mobile") {
      router.push(`${baseUrl}/chat?source=send_enquiry_request`);
    } else {
      router.push(`${baseUrl}/chat?source=send_enquiry_request`);
    }
  };

  const handleProductButtonClick = (product) => {
    const button = product.button;
    if (
      button == "Chat" ||
      (button == "Contact" && product?.pricing?.priceVisible)
    ) {
      const itemDetails = {
        ...product,
        quantity: 1,
        selectedVariant:
          selectedVariant?.[product?._id] || product?.variants[0] || null,
        selectedPackage: null,
        itemType: "product",
        addedAt: Date.now(),
      };
      handleSendEnquiryRequest(
        itemDetails,
        "webOrderSendEnquiryRequestItemWithPriceData",
      );
    } else {
      handleSendEnquiryRequest(product, "webOrderSendEnquiryRequestItemData");
    }
  };

  return (
    <>
      <div className="w-full h-full flex flex-col overflow-y-auto min-h-96 relative">
        {/* Header with back button and cart */}
        <div className="flex justify-between items-center mb-3 overflow-x-hidden">
          {view !== "topic" && renderBackButton()}
          {(view === "catalogueProductItem" ||
            view === "catalogueServiceItem") && (
            <div className="relative">{renderCartButton()}</div>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          {view === "topic" ? (
            <div>
              <div className="flex justify-between items-center gap-2 mb-4">
                <h4 className="text-base font-semibold text-gray-800">
                  {widgetData?.settings?.topicHeaderTitle || "Choose a topic"}
                </h4>

                <button
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors duration-200 text-gray-500 hover:text-gray-700"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="grid gap-3">
                {widgetData?.settings?.topics?.map((topic, index) => (
                  <button
                    key={`${topic?.name}-${index}`}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 text-left hover:border-[var(--primary-color)] hover:shadow-sm transition-all w-full group"
                    onClick={() => handleSelectOption(topic)}
                  >
                    {topic?.image && (
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={topic?.image}
                          alt={topic?.name}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-800 group-hover:text-[var(--primary-color)]">
                        {topic?.name}
                      </h3>
                      {topic?.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {topic?.description}
                        </p>
                      )}
                    </div>
                    {topic?.price && (
                      <span className="text-xs bg-gray-100 text-[var(--primary-color)] px-2 py-1 rounded whitespace-nowrap">
                        {topic?.price}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : view === "template" ? (
            <div className="text-center py-8">
              <p>Template view content goes here</p>
            </div>
          ) : view === "catalogue" ? (
            <div>
              <h4 className="mb-4 text-base font-semibold text-gray-800">
                {selectedTopic?.name || "Categories"}
              </h4>
              <div className="grid gap-3">
                {catalogues?.map((item, index) => (
                  <button
                    key={`${item?.name}-${index}`}
                    onClick={() => handleSelectCatalogueItem(item)}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 text-left hover:border-[var(--primary-color)] hover:shadow-sm transition-all w-full group"
                  >
                    {item?.image && (
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={item?.image}
                          alt={item?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-800 group-hover:text-[var(--primary-color)]">
                        {item?.name}
                      </h3>
                      {item?.totalItems && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item?.totalItems}{" "}
                          {item?.type || selectedTopic?.catalogueType || ""}
                        </p>
                      )}
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : view === "catalogueProductItem" ? (
            <div>
              <h4 className="mb-1 text-base font-semibold text-gray-800">
                Products
              </h4>
              <div className="relative mb-2 px-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid gap-4">
                {filteredItems?.map((item) => renderProductItem(item))}
                {filteredItems?.length === 0 && (
                  <div className="text-center py-8">
                    <p>No products found</p>
                  </div>
                )}
                <div className="sticky bottom-0 h-14 bg-white dark:bg-gray-900 dark:border-gray-700 flex items-center justify-center z-10 px-4">
                  <button
                    onClick={() => setView("cartSummary")}
                    disabled={cart?.length === 0}
                    className={`relative rounded-xl w-full max-w-md py-3 px-4 font-medium flex items-center justify-center gap-2 ${
                      cart?.length > 0
                        ? "bg-[var(--primary-color)] text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <IoCartOutline size={20} />
                    Go to Cart
                    {cart?.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
                        {cart?.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : view === "catalogueServiceItem" ? (
            <div>
              <h4 className="mb-1 text-base font-semibold text-gray-800">
                Services
              </h4>
              <div className="relative mb-2 px-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid gap-4">
                {filteredItems?.map((item) => renderServiceItem(item))}
                {filteredItems?.length === 0 && (
                  <div className="text-center py-8">
                    <p>No services found</p>
                  </div>
                )}
                <div className="sticky bottom-0 h-14 bg-white dark:bg-gray-900 dark:border-gray-700 flex items-center justify-center z-10 px-4">
                  <button
                    onClick={() => setView("cartSummary")}
                    disabled={cart?.length === 0}
                    className={`relative rounded-xl w-full max-w-md py-3 px-4 font-medium flex items-center justify-center gap-2 ${
                      cart?.length > 0
                        ? "bg-[var(--primary-color)] text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <IoCartOutline size={20} />
                    Go to Cart
                    {cart?.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
                        {cart?.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : view === "cartSummary" ? (
            renderCartSummary()
          ) : null}
        </div>
      </div>
      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </>
  );
};

export default TopicSelector;
