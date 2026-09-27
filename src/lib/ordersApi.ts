import { apiClient } from "@/lib/apiClient";

export type CustomerOrderSummary = {
  _id?: string;
  orderId?: string;
  createdDate?: string;
  title?: string;
  subtotal?: number;
  totalDiscount?: number;
  promotionDiscount?: number;
  promotion?: {
    code?: string;
    discountAmount?: number;
  } | null;
  totalGst?: number;
  shippingCost?: number;
  finalAmount?: number;
  paymentMilestones?: Array<{
    status?: string;
    amount?: number;
    label?: string;
    dueDate?: string;
    paymentMode?: string;
    paymentType?: string;
  }>;
  items?: Array<{
    itemId?: string;
    description?: string;
    quantity?: number;
    quantityUnit?: string;
    basePrice?: number;
    salePrice?: number;
    amount?: number;
    gstPercentage?: number;
    gstAmount?: number;
  }>;
  shippingDetails?: Array<{
    fulfillmentMode?: string;
    pickupDateTime?: string;
    shippingMethod?: string;
    shippingCost?: number;
    shippingStatus?: string;
    trackingNumber?: string;
    shipToAddress?: {
      fullName?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      pincode?: string;
      phone?: string;
    };
    dispatchPoint?: {
      name?: string;
      address?: string;
      pincode?: string;
      phone?: string;
      contactPerson?: string;
      operatingHours?: string;
    };
  }>;
  progress?: string;
  status?: string;
  sourceCollection?: string;
  collectionType?: string;
};

export type CustomerOrdersResponse = {
  message?: string;
  orders?: CustomerOrderSummary[];
  pagination?: {
    currentPage?: number;
    totalPages?: number;
    totalRecords?: number;
    pageSize?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
};

export type CustomerOrderDetailsResponse = {
  message?: string;
  orderDetails?: CustomerOrderSummary;
  reviews?:[any]
};

export async function getCustomerOrders(params: {
  customerId: string;
  page?: number;
  search?: string;
  statusFilter?: string;
}) {
  return apiClient.get<CustomerOrdersResponse>(
    "/business_website/chat_widget/get_chat_widget_side_get_orders",
    {
      query: {
        customerId: params.customerId,
        page: params.page ?? 1,
        search: params.search || undefined,
        statusFilter: params.statusFilter || "all",
      },
    },
  );
}

export async function getCustomerOrderDetails(params: {
  customerId: string;
  orderId: string;
}) {
  return apiClient.get<CustomerOrderDetailsResponse>(
    "/business_website/chat_widget/get_chat_widget_side_order_details",
    {
      query: {
        customerId: params.customerId,
        orderId: params.orderId,
      },
    },
  );
}
