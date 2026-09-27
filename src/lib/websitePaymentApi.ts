import { apiClient } from "@/lib/apiClient";

export type WebsiteCheckoutAddress = {
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  countryCode?: string;
  phone?: string;
};

export type WebsiteCheckoutItem = {
  itemId?: string;
  description?: string;
  name?: string;
  quantity?: number;
  quantityUnit?: string;
  amount?: number;
  basePrice?: number;
  salePrice?: number;
  rate?: number;
  gstPercentage?: number;
  gstAmount?: number;
  image?: string;
  imageUrl?: string;
  thumbnail?: string;
  productImage?: string;
};

export type WebsiteCheckoutOrder = {
  _id?: string;
  orderId?: string;
  currency?: string;
  currencyInfo?: {
    code?: string;
    symbol?: string;
    name?: string;
    defaultFormat?: string;
  };
  title?: string;
  status?: string;
  source?: string;
  createdAt?: string;
  deliveryMode?: string;
  deliveryModeLabel?: string;
  shippingMethod?: string;
  isExpressDelivery?: boolean;
  expressDeliveryMessage?: string;
  zoneNote?: string;
  client?: {
    name?: string;
    email?: string;
    phone?: string;
    countryCode?: string;
  };
  billingAddress?: WebsiteCheckoutAddress;
  deliveryAddress?: WebsiteCheckoutAddress;
  items?: WebsiteCheckoutItem[];
  shippingDetails?: Array<{
    fulfillmentMode?: string;
    deliveryMode?: string;
    isExpressDelivery?: boolean;
    expressDeliveryMessage?: string;
    zoneNote?: string;
    pickupDateTime?: string;
    shippingMethod?: string;
    shippingCost?: number;
    shippingStatus?: string;
    trackingNumber?: string;
    shipToAddress?: WebsiteCheckoutAddress;
    billToAddress?: WebsiteCheckoutAddress;
  }>;
  summary?: {
    subtotal?: number;
    discount?: number;
    promotionDiscount?: number;
    promotionCode?: string;
    tax?: number;
    shipping?: number;
    total?: number;
    paidAmount?: number;
    amountDue?: number;
    isPaid?: boolean;
    currency?: string;
  };
  payment?: {
    gatewayAvailable?: boolean;
    gatewayId?: string;
    gatewayName?: string;
    currency?: string;
    orderCurrency?: string;
    gatewayCurrency?: string;
    testMode?: boolean;
  };
};

export type WebsiteCheckoutOrderResponse = {
  success?: boolean;
  message?: string;
  data?: WebsiteCheckoutOrder;
};

export type WebsiteCheckoutInitPaymentResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  data?: {
    gateway?: "stripe" | "razorpay" | string;
    paymentUrl?: string;
    sessionId?: string;
    keyId?: string;
    order_id?: string;
    paymentAttemptId?: string;
    amount?: number;
    currency?: string;
    businessName?: string;
  };
};

export type WebsiteCheckoutVerifyPaymentResponse = {
  success?: boolean;
  message?: string;
  alreadyVerified?: boolean;
  data?: {
    orderId?: string;
    providerPaymentId?: string;
  };
};

export function getWebsiteCheckoutOrderDetails(orderId: string) {
  return apiClient.get<WebsiteCheckoutOrderResponse>(
    `/business_website/chat_widget/website_checkout/order/${orderId}`,
  );
}

export function initWebsiteCheckoutOrderPayment(data: {
  orderId: string;
  returnUrl: string;
}) {
  return apiClient.post<WebsiteCheckoutInitPaymentResponse>(
    "/business_website/chat_widget/website_checkout/init_payment",
    data,
  );
}

export function verifyWebsiteCheckoutOrderPayment(data: {
  paymentAttemptId?: string;
  stripe_session_id?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}) {
  return apiClient.post<WebsiteCheckoutVerifyPaymentResponse>(
    "/business_website/chat_widget/website_checkout/verify_payment",
    data,
  );
}
