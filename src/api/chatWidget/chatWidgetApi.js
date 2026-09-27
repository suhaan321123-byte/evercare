import customerAxios from "@/lib/axios/customerAxios";

export const websiteVerifySessionOnServer = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/check_verification`, data);
    return response.data; 
}

export const websiteChatWidgetSendPhoneNumberOtpApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/send_phone_number_otp`, data);
    return response.data;
}

export const websiteChatWidgetVerifyPhoneNumberOtpApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/verify_phone_number_otp`, data);
    return response.data;
}

export const websiteChatWidgetGetChatMessagesApi = async (params) =>{
    const response = await customerAxios.get(`/business_website/chat_widget/get_chat_messages`, {params}); 
    return response.data;
}

export const websiteChatWidgetSendMessageApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/send_new_message`, data);
    return response.data;
}

export const websiteChatWidgetSendMessageQuickReplyApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/send_new_message_quick_reply`, data);
    return response.data;
}

export const getChatWidgetSideTopicsCatalogueApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/get_chat_widget_side_topics_catalogue`, data);
    return response.data;
}

export const getChatWidgetSideTopicsCatalogueItemsApi = async (params) => {
    const response = await customerAxios.get(`/business_website/chat_widget/get_chat_widget_side_topics_catalogue_items`, {params});
    return response.data;
}

export const createCatalogueOrderFromChatWidgetApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/create_catalogue_order_from_chat_widget`, data);
    return response.data;
}

export const getChatWidgetSideGetOrdersApi = async (params) => {
    const response = await customerAxios.get(`/business_website/chat_widget/get_chat_widget_side_get_orders`, {params});
    return response.data;
}

export const getChatWidgetSideOrderDetailsApi = async (params) => {
    const response = await customerAxios.get(`/business_website/chat_widget/get_chat_widget_side_order_details`, {params});
    return response.data;
}

export const getChatWidgetSideCartApi = async (params) => {
    const response = await customerAxios.get(`/business_website/chat_widget/get_chat_widget_side_cart`, {params});
    return response.data;
}


export const chatWidgetSideAddToCartApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/add`, data);
    return response.data;
}

export const chatWidgetSideRemoveFromCartItemApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/remove`, data);
    return response.data;
}

export const chatWidgetSideUpdateCartItemApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/update`, data);
    return response.data;
}

export const chatWidgetSideClearCartItemApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/clear`, data);
    return response.data;
}

export const websiteChatWidgetCancelOrderApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cancel_order`, data);
    return response.data;
}

export const websiteChatWidgetCancelOrderRequestApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cancel_order_request`, data);
    return response.data;
}

export const websiteCartSaveMergedCartApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/save_merged_cart`, data);
    return response.data;
}

export const websiteGetCustomerDeliveryAddressApi = async (params) => {
    const response = await customerAxios.get(`/business_website/chat_widget/chat_widget_side_cart/get_delivery_address`, {params});
    return response.data;
}

export const websiteAddDeliveryAddressApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/add_delivery_address`, data);
    return response.data;
}

export const websiteUpdateDeliveryAddressApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/update_delivery_address`, data);
    return response.data;
}

export const websiteDeleteDeliveryAddressApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/delete_delivery_address`, data);
    return response.data;
}

export const getCatalogueProductsTotalAmountApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/chat_widget_side_cart/get_catalogue_products_total_amount`, data);
    return response.data;
}

export const customerLogoutApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/logout`, data);
    return response.data;
}

export const websiteTemplateCallbackApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/template_callback`, data);
    return response.data;
}

export const websiteSubmitLoanApplicationApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/submit_loan_application`, data);
    return response.data;
}

export const getPaymentIntegrationDataInChatWidgetApi = async (params) => {
    const response = await customerAxios.get(`/business_website/chat_widget/get_payment_integration_data`, {params});
    return response.data;
} 

export const websiteTemplateContactUsApi = async (data) =>{
    const response = await customerAxios.post(`/business_website/chat_widget/template_contact_us`, data);
    return response.data;
}

export const websiteChatWidInitPaymentSessionApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/init_order_payment_session`, data);
    return response.data;
}

export const websiteChatWidgetVerifyPaymentApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/verify_order_payment`, data);
    return response.data;
}

export const websiteChatWidInitPaymentWithCreateOrderSessionApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/init_payment_with_order_session`, data);
    return response.data;
}

export const websiteChatWidgetVerifyPaymentAndCreateOrderApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/verify_payment_create_order`, data);
    return response.data;
}

export const addCatalogueProductReviewsApi = async (data) => {
    const response = await customerAxios.post(`/business_website/chat_widget/add_catalogue_product_reviews`, data);
    return response.data; // data
}

export const updateCatalogueProductReviewApi = async (id, data) => {
    const response = await customerAxios.patch(`/business_website/chat_widget/update_catalogue_product_reviews/${id}`, data);
    return response.data; // data
}

export const deleteCatalogueProductReviewApi = async (id) => {
    const response = await customerAxios.delete(`/business_website/chat_widget/delete_catalogue_product_reviews/${id}`);
    return response.data; // data
}