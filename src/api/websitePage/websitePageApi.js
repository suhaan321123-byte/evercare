import userAxios from "@/lib/axios/axios";
import { ACCOUNT_TYPE_ID } from "@/services/catalogues";
// import { apiClient as userAxios } from "@/lib/apiClient";

export const getWebsitePagesApi = async (params) => {
    const response = await userAxios.get(`/business_website/page/get_website_pages`, { params }); 
    return response.data; // pages count
}

export const updatedWebsitePageKeyValueApi = async (data) => {
    const response = await userAxios.put(`/business_website/page/update_website_page_key_value`, data);
    return response.data;
}

export const deleteWebsitePageApi = async (data) => {
    const response = await userAxios.delete(`/business_website/page/delete_website_page`, { data });
    return response.data;
}

export const updatePageSectionDataApi = async (data) => {
    const response = await userAxios.post(`/business_website/page/update_page_section_data`, data);
    return response.data; // 
}

export const duplicateWebsitePageSectionApi = async (data) => {
    const response = await userAxios.post(`/business_website/page/duplicate_website_page_section`, data);
    return response.data;
}

export const updateWebsitePageAndSectionsApi = async (data) => {
    const response = await userAxios.post(`/business_website/page/update_website_page_and_sections`, data);
    return response.data;
}

export const duplicateWebsitePageApi = async (data) =>{
    const response = await userAxios.post(`/business_website/page/duplicate_website_page`, data);
    return response.data;
}

export const updateWebsitePageSettingsApi = async (data) => {
    const response = await userAxios.post(`/business_website/page/update_website_page_settings`, data); 
    return response.data;
}

export const getPublishedWebsitePagesApi = async (params) => { // all pages
    const response = await userAxios.get(`/business_website/page/get_published_website_pages`, { params }); 
    return response.data;
}

export const getPublishedWebsitePageApi = async (params) => { // specific page only hostname customRoute
    const response = await userAxios.get(`/business_website/page/get_published_website_specific_page`, { params }); 
    return response.data;
}

export const getPublishedWebsitePagMetaDataApi = async (params) => { // specific page only hostname customRoute
    const response = await userAxios.get(`/business_website/page/get_published_website_specific_page_metadata`, { params }); 
    return response.data;
}

export const getPublishedWebsiteSitemapApi = async (params) => { // specific page only hostname customRoute
    const response = await userAxios.get(`/business_website/page/get_published_website_sitemap`, { params }); 
    return response.data;
}

export const getWebsiteSettingsApi = async () => {
    const response = await userAxios.get(`/business_website/get_website_settings`, { params: { accountTypeId: ACCOUNT_TYPE_ID } }); 
    return response.data;
}

export const getActiveRobotsTxtApi = async (params) => { // specific page only hostname customRoute
    const response = await userAxios.get(`/business_website/page/get_active_robots_txt`, { params }); 
    return response.data;
}
