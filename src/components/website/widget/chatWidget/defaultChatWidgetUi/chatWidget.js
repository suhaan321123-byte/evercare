import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, MessageCircle, LogOut, ArrowLeft } from "lucide-react";
import ChatTabs from "./chatTabs";
import NewChatTab from "./newChatTab";
import HistoryTab from "./historyTab";
import "./chatWidget.css";
import { decryptData } from "@/utils/cryptoJS/cryptoJs";
import { socket } from "@/socket";
import { FaPowerOff } from "react-icons/fa";
import { customerLogoutApi } from "@/api/chatWidget/chatWidgetApi";

const ChatWidget = ({
  viewMode = "desktop",
  widgetData = {},
  allowedAllActions = false,
  defaultWidgetOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const socketRef = useRef(null);
  const [login, setLogin] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [customerAuthData, setCustomerAuthData] = useState(null);

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
    // Disconnect socket if active
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null; // Optional: clear the ref
    }
    await customerLogoutApi({
      customerId: customerAuthData?.customerId,
    });
    toggleWidget();
    setActiveTab("history");
  };

  const checkLoginOrNot = async () => {
    const sessionEncrypted = localStorage.getItem("chatSession");
    if (!sessionEncrypted) {
      setLogin(false);
      return;
    }

    // Decrypt and validate session structure
    const session = await decryptData(JSON.parse(sessionEncrypted));
    if (!session?.customerId) {
      setLogin(false);
      return;
    }

    const expiresAt = new Date(session.expiresAt);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const sessionDuration = 100 * 60 * 60 * 1000; // 100 hours in milliseconds
    const isValidTime =
      expiresAt > new Date(now.getTime() - bufferTime) &&
      now - new Date(session.expiresAt) < sessionDuration;

    if (!isValidTime) {
      setCustomerAuthData(null);
      clearSession();
      return;
    }
    setCustomerAuthData(session);
    setLogin(true);
  };

  useEffect(() => {
    checkLoginOrNot();
  }, []);

  const toggleWidget = () => {
    if (!allowedAllActions) return;
    setIsOpen(!isOpen);
    setActiveTab("chat");
  };

  const handleTabChange = (tab) => {
    if (!allowedAllActions) return;
    setActiveTab(tab);
  };

  const initializeSocketConnection = async () => {
    if (!allowedAllActions) return;

    const sessionEncrypted = localStorage.getItem("chatSession");
    if (!sessionEncrypted) return;

    const session = await decryptData(JSON.parse(sessionEncrypted));
    if (!session) return;

    const customerId = session?.customerId || null;
    if (!customerId) return;

    if (customerId) {
      if (!socketRef.current) {
        socketRef.current = socket;
      }

      socketRef.current.emit("new-user-add", customerId);

      socketRef.current.on("connect", () => {
        socketRef.current.emit("new-user-add", customerId);
      });

      socketRef.current.on("connect_error", (err) => {
        console.log("Socket connection error: ", err.message);
      });
    }
  };

  useEffect(() => {
    initializeSocketConnection();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      window.removeEventListener("beforeunload", () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      });
    };
  }, [allowedAllActions]);

  const handleIncomingMessage = useCallback((message) => {
    setMessageCount((prevCount) => prevCount + 1);
  }, []);

  useEffect(() => {
    if (!allowedAllActions) return;
    if (!socketRef.current) return;

    socketRef.current.on(
      "get-website-chat-widget-message",
      handleIncomingMessage
    );
  }, [allowedAllActions, socketRef.current, handleIncomingMessage]);

  useEffect(() => {
    if (!allowedAllActions) return;

    if (messageCount > 0 && isOpen && activeTab === "chat") {
      setMessageCount(0);
    }
  }, [allowedAllActions, isOpen, activeTab, messageCount]);

  if (viewMode === "mobile" && widgetData?.settings?.showOnMobile === true) {
    return (
      <>
        <div className="chat-widget-container">
          {/* Widget Toggle Button */}
          <div
            className={`chat-toggle-button ${isOpen ? "open" : ""} ${
              !allowedAllActions ? "disabled" : ""
            }`}
            onClick={toggleWidget}
            style={{ "--primary-color": primaryColor }}
          >
            {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            {messageCount > 0 && (
              <span className="absolute right-0 top-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {messageCount}
              </span>
            )}
          </div>

          {/* Chat Widget */}
          <div className={`chat-widget ${isOpen ? "open" : "closed"}`}>
            <div
              className="chat-header"
              style={{ "--primary-color": primaryColor }}
            >
              <div className="header-content">
                <div className="header-avatar">
                  <MessageCircle size={20} />
                </div>
                <div className="header-info">
                  <h3>{widgetData?.settings?.headerTitle || "Chat with us"}</h3>
                  <span className="status">Online</span>
                </div>
              </div>
              {login && (
                <button
                  className="close-button"
                  onClick={clearSession}
                  disabled={!allowedAllActions}
                >
                  <FaPowerOff size={18} className="ml-1" />
                </button>
              )}
            </div>

            <ChatTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              primaryColor={primaryColor}
              disabled={!allowedAllActions}
            />

            {allowedAllActions && (
              <div className="chat-content">
                {activeTab === "chat" ? (
                  <NewChatTab
                    primaryColor={primaryColor}
                    disabled={!allowedAllActions}
                    widgetData={widgetData}
                    checkLoginOrNot={checkLoginOrNot}
                    viewMode={viewMode}
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
      </>
    );
  }

  return viewMode == "desktop" && !isMobile ? (
    <div className="chat-widget-container">
      {/* Widget Toggle Button */}
      <div
        className={`chat-toggle-button ${isOpen ? "open" : ""} ${
          !allowedAllActions ? "disabled" : ""
        }`}
        onClick={toggleWidget}
        style={{ "--primary-color": primaryColor }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {messageCount > 0 && (
          <span className="absolute right-0 top-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {messageCount}
          </span>
        )}
      </div>

      {/* Chat Widget */}
      <div
        className={`chat-widget ${
          isOpen ? "open" : "closed"
        } min-h-[60vh] max-h-[80vh]`}
      >
        <div
          className="chat-header"
          style={{ "--primary-color": primaryColor }}
        >
          <div className="header-content">
            <div className="header-avatar">
              <MessageCircle size={20} />
            </div>
            <div className="header-info">
              <h3>{widgetData?.settings?.headerTitle || "Chat with us"}</h3>
              <span className="status">Online</span>
            </div>
          </div>
          {login && (
            <button
              className="close-button"
              onClick={clearSession}
              disabled={!allowedAllActions}
            >
              <FaPowerOff size={18} className="ml-1" />
            </button>
          )}
        </div>

        <ChatTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          primaryColor={primaryColor}
          disabled={!allowedAllActions}
        />

        {allowedAllActions && (
          <div className="chat-content">
            {activeTab === "chat" ? (
              <NewChatTab
                primaryColor={primaryColor}
                disabled={!allowedAllActions}
                widgetData={widgetData}
                checkLoginOrNot={checkLoginOrNot}
                viewMode={viewMode}
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
  ) : viewMode == "mobile" ? (
    <>
      <div className="bg-gray-50 h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-3 py-3 flex items-center justify-between flex-shrink-0 safe-area-inset-top">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.history.back()}
              className="text-black hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="font-semibold text-black text-lg">Crafics</h1>
              <p className="text-xs text-green-600">Online</p>
            </div>
          </div>
          {login && (
            <button
              onClick={clearSession}
              className="text-gray-600 hover:text-black hover:bg-gray-100 rounded-full p-2.5 transition-colors"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-3 flex-shrink-0">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("chat")}
              className={`py-3 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "chat"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-3 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "history"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-50 min-h-0">
          {activeTab === "chat" ? (
            <NewChatTab
              primaryColor={primaryColor}
              disabled={!allowedAllActions}
              widgetData={widgetData}
              checkLoginOrNot={checkLoginOrNot}
              viewMode={viewMode}
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
    </>
  ) : null;
};

export default ChatWidget;
