import { apiClient } from "@/lib/apiClient";

export type RemoteCartItem = Record<string, unknown> & {
  _id?: string;
  id?: string;
  name?: string;
  price?: number;
  mrp?: number;
  image?: string;
  qty?: number;
  quantity?: number;
};

export async function getRemoteCart(params: { customerId: string }) {
  return apiClient.get<{
    success?: boolean;
    message?: string;
    data?: RemoteCartItem[];
    totalItems?: number;
    totalAmount?: number;
  }>("/business_website/chat_widget/get_chat_widget_side_cart", {
    query: { customerId: params.customerId },
  });
}

export async function saveMergedRemoteCart(params: {
  customerId: string;
  cart: RemoteCartItem[];
}) {
  return apiClient.post<{
    success?: boolean;
    message?: string;
    data?: RemoteCartItem[];
  }>("/business_website/chat_widget/chat_widget_side_cart/save_merged_cart", {
    customerId: params.customerId,
    cart: params.cart,
  });
}

export async function addRemoteCartItem(params: {
  customerId: string;
  item: RemoteCartItem;
}) {
  return apiClient.post<{
    success?: boolean;
    message?: string;
    data?: RemoteCartItem[];
  }>("/business_website/chat_widget/chat_widget_side_cart/add", {
    customerId: params.customerId,
    item: params.item,
  });
}

export async function updateRemoteCartItem(params: {
  customerId: string;
  index: number;
  field: string;
  value: unknown;
}) {
  return apiClient.post<{
    success?: boolean;
    message?: string;
    data?: RemoteCartItem[];
  }>("/business_website/chat_widget/chat_widget_side_cart/update", {
    customerId: params.customerId,
    index: params.index,
    field: params.field,
    value: params.value,
  });
}

export async function removeRemoteCartItem(params: {
  customerId: string;
  index: number;
}) {
  return apiClient.post<{
    success?: boolean;
    message?: string;
    data?: RemoteCartItem[];
  }>("/business_website/chat_widget/chat_widget_side_cart/remove", {
    customerId: params.customerId,
    index: params.index,
  });
}

export async function clearRemoteCart(params: { customerId: string }) {
  return apiClient.post<{ success?: boolean; message?: string }>(
    "/business_website/chat_widget/chat_widget_side_cart/clear",
    { customerId: params.customerId },
  );
}

