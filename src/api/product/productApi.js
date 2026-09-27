import customerAxios from "@/lib/axios/customerAxios";
export const getProductReviewsApi = async (params) => {
    const response = await customerAxios.get(`/business_website/catalogue/product/get_product_reviews`, {params}); 
    return response.data;
}