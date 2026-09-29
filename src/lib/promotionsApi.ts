import { apiClient } from "@/lib/apiClient";

const TEMPLATE_WEBSITE_SUBDOMAIN = "evercare-two.vercel.app";

export const getActiveBogoPromotions = async () =>
  apiClient.get<{
    success?: boolean;
    data?: {
      promotions?: any[];
      productsById?: Record<string, any>;
    };
  }>("/business_website/chat_widget/chat_widget_side_cart/get_active_bogo_promotions?subdomain=" + TEMPLATE_WEBSITE_SUBDOMAIN);
// export const getActiveBogoPromotions = async () =>
//   apiClient.get<{
//     success?: boolean;
//     data?: {
//       promotions?: any[];
//       productsById?: Record<string, any>;
//     };
//   }>("/business_website/chat_widget/chat_widget_side_cart/get_active_bogo_promotions", params : {
//     subdomain: TEMPLATE_WEBSITE_SUBDOMAIN,
//   });
