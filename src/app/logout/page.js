"use client";

import { useEffect } from "react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const Page = () => {
  const { logout } = useCustomerAuth();
  const router = useRouter();

  const clearSession = () => {
    localStorage.removeItem("chatSession");
    localStorage.removeItem("userAccessToken");
    localStorage.removeItem("chatWidgetOpened");
    document.cookie = "chatSession=; Max-Age=0; path=/";
    document.cookie = "userAccessToken=; Max-Age=0; path=/";
  };

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Clear local session
        clearSession();
        
        // Call logout API
        await logout();
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        // Always redirect to home
        router.push("/");
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Logging out...</p>
      </div>
    </div>
  );
};

export default Page;