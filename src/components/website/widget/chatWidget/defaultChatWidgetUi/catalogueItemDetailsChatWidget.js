"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, MessageCircle, ArrowLeft } from "lucide-react";
import "./chatWidget.css";

import { decryptData } from "@/utils/cryptoJS/cryptoJs";
import ChatTabs from "@/components/website/widget/chatWidget/defaultChatWidgetUi/chatTabs";
import HistoryTab from "@/components/website/widget/chatWidget/defaultChatWidgetUi/historyTab";
import { FaPowerOff } from "react-icons/fa";
import { socket } from "@/socket";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import NewChatTab from "./newChatTab";
import { customerLogoutApi } from "@/api/chatWidget/chatWidgetApi";
import Link from "next/link";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { ACCOUNT_TYPE_ID } from "@/services/catalogues";

function CatalogueItemDetailsChatWidget({
  viewMode = "desktop",
  widgetData = {},
  allowedAllActions = true,
  defaultWidgetOpen = true,
  userId = null,
  accountTypeId = ACCOUNT_TYPE_ID,
  baseUrl = "",
}) {
  const {
    hydrated: authHydrated,
    isLoggedIn,
    session: customerAuthData,
    setSession: setCustomerAuthData,
  } = useCustomerAuth();

  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const chatOpen = searchParams.get("chat") || "";
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(
    source ? (source == "orders" ? "history" : "chat") : "chat",
  );
  const socketRef = useRef(null);
  const [login, setLogin] = useState(customerAuthData ? true : false);
  const [messageCount, setMessageCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (!login && customerAuthData) {
      setLogin(true);
    }
  }, [customerAuthData]);

  // Handle chat open from URL parameter
  useEffect(() => {
    if (chatOpen === "open") {
      setIsOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("chat");
      params.delete("source");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [chatOpen]);

  useEffect(() => {
    if (defaultWidgetOpen) {
      setIsOpen(true);
    }
  }, [defaultWidgetOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const primaryColor = widgetData?.settings?.themeColor
    ? widgetData.settings.themeColor
    : "#10B981";

  const clearSession = async () => {
    localStorage.removeItem("chatSession");
    localStorage.removeItem("userAccessToken");
    localStorage.removeItem("chatWidgetOpened");
    document.cookie = "chatSession=; Max-Age=0; path=/";
    setLogin(false);
    setIsSocketConnected(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    await customerLogoutApi({
      customerId: customerAuthData?.customerId,
    });
    setCustomerAuthData(null);
    if (isMobile) {
      if (typeof window !== "undefined") {
        window.location.replace(`${baseUrl}/`);
        return;
      }
    } else {
      setIsOpen(false);
      setActiveTab("history");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const initializeSocketConnection = useCallback(async () => {
    // Check if socket already connected to avoid duplicate connections
    if (isSocketConnected && socketRef.current?.connected) {
      return;
    }

    // First try to get customerId from customerAuthData (context)
    let customerId = customerAuthData?.customerId;

    // If not available in context, try from localStorage
    if (!customerId) {
      try {
        const sessionEncrypted = localStorage.getItem("chatSession");
        if (sessionEncrypted) {
          const session = await decryptData(JSON.parse(sessionEncrypted));
          customerId = session?.customerId || null;
        }
      } catch (error) {
        console.error("Error decrypting session:", error);
      }
    }

    if (!customerId) {
      console.log("No customer ID found, skipping socket connection");
      return;
    }

    // Initialize socket connection
    if (!socketRef.current) {
      socketRef.current = socket;
    }

    // Remove existing listeners to avoid duplicates
    socketRef.current.off("connect");
    socketRef.current.off("connect_error");

    // Set up connection handlers
    socketRef.current.on("connect", () => {
      console.log("Socket connected successfully");
      socketRef.current.emit("new-user-add", customerId);
      setIsSocketConnected(true);
    });

    socketRef.current.on("connect_error", (err) => {
      console.log("Socket connection error: ", err.message);
      setIsSocketConnected(false);
    });

    // If socket is already connected, emit immediately
    if (socketRef.current.connected) {
      console.log("Socket already connected, emitting new-user-add");
      socketRef.current.emit("new-user-add", customerId);
      setIsSocketConnected(true);
    } else {
      // Connect if not already connecting
      if (!socketRef.current.connecting && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    }
  }, [customerAuthData, isSocketConnected]);

  const handleIncomingMessage = useCallback((message) => {
    setMessageCount((prevCount) => prevCount + 1);
  }, []);

  // Effect to initialize socket connection when customerAuthData changes
  useEffect(() => {
    if (customerAuthData?.customerId) {
      initializeSocketConnection();
    }
  }, [customerAuthData, initializeSocketConnection]);

  // Effect to set up message listener
  useEffect(() => {
    if (!socketRef.current) return;

    // Remove existing listener to avoid duplicates
    socketRef.current.off("get-website-chat-widget-message");

    socketRef.current.on(
      "get-website-chat-widget-message",
      handleIncomingMessage,
    );

    return () => {
      if (socketRef.current) {
        socketRef.current.off("get-website-chat-widget-message");
      }
    };
  }, [handleIncomingMessage]);

  // Effect to handle component mount and cleanup
  useEffect(() => {
    // Initialize on mount if customerAuthData exists
    if (customerAuthData?.customerId) {
      initializeSocketConnection();
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");
        socketRef.current.off("get-website-chat-widget-message");
        // Don't disconnect here if you want socket to persist
        // socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (messageCount > 0 && isOpen && activeTab === "chat") {
      setMessageCount(0);
    }
  }, [isOpen, activeTab, messageCount]);

  const onClose = () => {
    setIsOpen(false);
  };

  const handleChatClick = () => {
    setIsOpen(!isOpen);
    setActiveTab("chat");
    // Re-initialize socket when opening chat if not connected
    if (!isSocketConnected && customerAuthData?.customerId) {
      initializeSocketConnection();
    }
  };

  // Mobile view
  if (viewMode === "mobile" || isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed top-0 left-0 right-0 bottom-0 inset-0 z-50 bg-white flex flex-col max-h-screen h-full">
            {/* Header */}
            <div
              className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center space-x-3">
                <Link
                  href={`${baseUrl || "/"}`}
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <ArrowLeft size={22} />
                </Link>
                <div>
                  <h1 className="font-semibold text-white text-lg">
                    {widgetData?.settings?.headerTitle || "Chat with us"}
                  </h1>
                  <p className="text-xs text-white/90">Online</p>
                </div>
              </div>
              {login && (
                <button
                  onClick={clearSession}
                  disabled={!allowedAllActions}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <FaPowerOff size={20} />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-50">
              {activeTab === "chat" ? (
                <NewChatTab
                  userId={userId}
                  accountTypeId={accountTypeId}
                  primaryColor={primaryColor}
                  disabled={!allowedAllActions}
                  widgetData={widgetData}
                  viewMode="mobile"
                  baseUrl={baseUrl}
                />
              ) : (
                <HistoryTab
                  primaryColor={primaryColor}
                  disabled={!allowedAllActions}
                  login={login}
                />
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop view - Floating widget
  return (
    <>
      {!isOpen && viewMode === "desktop" && !isMobile && (
        <button
          onClick={handleChatClick}
          style={{ backgroundColor: primaryColor }}
          className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg hover:opacity-90 transition-all duration-300 hover:scale-110 z-40 flex items-center justify-center group"
        >
          <MessageCircle className="h-6 w-6" />
          {messageCount > 0 && (
            <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {messageCount}
            </span>
          )}

          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Need help? Chat with us!
          </div>
        </button>
      )}

      {isOpen && viewMode === "desktop" && !isMobile && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/65 bg-opacity-50"
            onClick={onClose}
          />

          <div
            className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div
                style={{ backgroundColor: primaryColor }}
                className="flex items-center justify-between p-4 border-b text-white"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {widgetData?.settings?.headerTitle || "Chat with us"}
                    </h2>
                    <p className="text-sm opacity-90">{`We're here to help!`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {login && (
                    <button
                      onClick={clearSession}
                      disabled={!allowedAllActions}
                      className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                    >
                      <FaPowerOff size={18} />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {allowedAllActions && (
                <div className="flex-1 overflow-hidden">
                  {activeTab === "chat" ? (
                    <NewChatTab
                      userId={userId}
                      accountTypeId={accountTypeId}
                      primaryColor={primaryColor}
                      disabled={!allowedAllActions}
                      widgetData={widgetData}
                      viewMode={viewMode}
                      baseUrl={baseUrl}
                    />
                  ) : (
                    <HistoryTab
                      primaryColor={primaryColor}
                      disabled={!allowedAllActions}
                      login={login}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CatalogueItemDetailsChatWidget;
