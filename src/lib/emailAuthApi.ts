import { apiClient } from "@/lib/apiClient";
import { ACCOUNT_TYPE_ID } from "@/services/catalogues";

export async function sendWebsiteEmailOtp(params: {
  email: string;
  origin: string;
  returnTo: string;
  subdomain: string;
}) {
  return apiClient.post<{
    success?: boolean;
    message?: string;
    instructions?: string;
  }>("/auth/email/website/send_otp", {
    email: params.email,
    origin: params.origin,
    returnTo: params.returnTo,
    subdomain: params.subdomain,
    accountTypeId: ACCOUNT_TYPE_ID,
  });
}

export async function verifyWebsiteEmailOtp(params: {
  email: string;
  otp: string;
  origin: string;
  returnTo: string;
  subdomain: string;
}) {
  return apiClient.post<{
    success?: boolean;
    message?: string;
    token?: string;
    customerId?: string;
    customerData?: { _id?: string; name?: string; email?: string; image?: string };
    returnTo?: string;
  }>("/auth/email/website/verify_otp", {
    email: params.email,
    otp: params.otp,
    origin: params.origin,
    returnTo: params.returnTo,
    subdomain: params.subdomain,
    accountTypeId: ACCOUNT_TYPE_ID,
  });
}
