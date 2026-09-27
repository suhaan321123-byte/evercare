import { apiClient } from "@/lib/apiClient";

export type DeliveryAddress = {
  _id: string;
  type?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
};

export async function getCustomerDeliveryAddresses(params: { customerId: string }) {
  const json = await apiClient.get<{
    message?: string;
    data?: DeliveryAddress[];
    success?: boolean;
  }>("/business_website/chat_widget/chat_widget_side_cart/get_delivery_address", {
    query: { customerId: params.customerId },
  });

  return json?.data || [];
}

export async function getCustomerBillingAddresses(params: { customerId: string }) {
  const json = await apiClient.get<{
    message?: string;
    data?: DeliveryAddress[];
    success?: boolean;
  }>("/business_website/chat_widget/chat_widget_side_cart/get_billing_address", {
    query: { customerId: params.customerId },
  });

  return json?.data || [];
}

export async function addCustomerDeliveryAddress(params: {
  customerId: string;
  deliveryAddress: Omit<DeliveryAddress, "_id">;
}) {
  const json = await apiClient.post<{
    message?: string;
    data?: DeliveryAddress[];
    success?: boolean;
  }>("/business_website/chat_widget/chat_widget_side_cart/add_delivery_address", {
    customerId: params.customerId,
    deliveryAddress: params.deliveryAddress,
  });

  if (json?.success === false) {
    throw new Error(json?.message || "Failed to save address");
  }

  return json?.data || [];
}

export async function addCustomerBillingAddress(params: {
  customerId: string;
  billingAddress: Omit<DeliveryAddress, "_id">;
}) {
  const json = await apiClient.post<{
    message?: string;
    data?: DeliveryAddress[];
    success?: boolean;
  }>("/business_website/chat_widget/chat_widget_side_cart/add_billing_address", {
    customerId: params.customerId,
    deliveryAddress: params.billingAddress,
    addressType: "billing",
  });

  if (json?.success === false) {
    throw new Error(json?.message || "Failed to save billing address");
  }

  return json?.data || [];
}

export async function updateCustomerDeliveryAddress(params: {
  customerId: string;
  addressId: string;
  deliveryAddress: Partial<Omit<DeliveryAddress, "_id">>;
}) {
  const json = await apiClient.post<{
    message?: string;
    data?: DeliveryAddress[];
    success?: boolean;
  }>("/business_website/chat_widget/chat_widget_side_cart/update_delivery_address", {
    customerId: params.customerId,
    addressId: params.addressId,
    updatedAddress: params.deliveryAddress,
  });

  if (json?.success === false) {
    throw new Error(json?.message || "Failed to update address");
  }

  return json?.data || [];
}

export async function updateCustomerBillingAddress(params: {
  customerId: string;
  addressId: string;
  billingAddress: Partial<Omit<DeliveryAddress, "_id">>;
}) {
  const json = await apiClient.post<{
    message?: string;
    data?: DeliveryAddress[];
    success?: boolean;
  }>("/business_website/chat_widget/chat_widget_side_cart/update_billing_address", {
    customerId: params.customerId,
    addressId: params.addressId,
    updatedAddress: params.billingAddress,
    addressType: "billing",
  });

  if (json?.success === false) {
    throw new Error(json?.message || "Failed to update billing address");
  }

  return json?.data || [];
}

export async function deleteCustomerDeliveryAddress(params: {
  customerId: string;
  addressId: string;
}) {
  const json = await apiClient.post<{
    message?: string;
    data?: DeliveryAddress[];
    success?: boolean;
  }>("/business_website/chat_widget/chat_widget_side_cart/delete_delivery_address", {
    customerId: params.customerId,
    addressId: params.addressId,
  });

  if (json?.success === false) {
    throw new Error(json?.message || "Failed to delete address");
  }

  return json?.data || [];
}

export async function deleteCustomerBillingAddress(params: {
  customerId: string;
  addressId: string;
}) {
  const json = await apiClient.post<{
    message?: string;
    data?: DeliveryAddress[];
    success?: boolean;
  }>("/business_website/chat_widget/chat_widget_side_cart/delete_billing_address", {
    customerId: params.customerId,
    addressId: params.addressId,
    addressType: "billing",
  });

  if (json?.success === false) {
    throw new Error(json?.message || "Failed to delete billing address");
  }

  return json?.data || [];
}
