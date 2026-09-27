"use client";
import { useEffect, useState } from "react";
import DefaultChatWidget from "./defaultChatWidgetUi/chatWidget";
import ArtstudioV1ChatWidget from "../../templates/artStudioTemplate/widget/chatWidget/chatWidget";
import ECommerceChatWidget from "../../templates/eCommerceCatalogsTemplate/widget/chatWidget/chatWidget";
import ECommerceV2ChatWidget from "../../templates/eCommerceV2/widget/chatWidget/chatWidget";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CHAT_WIDGET_COMPONENTS = {
  "artstudio-v1": ArtstudioV1ChatWidget,
  "e-commerce-catalogue": ECommerceChatWidget,
  "e-commerce-v2": ECommerceV2ChatWidget,
  "online-classroom": ECommerceChatWidget,
  // Add other templates as needed
};

const ChatWidgetLayout = ({
  pageDetails,
  viewMode = "desktop",
  widgetData = {},
  allowedAllActions = false,
  baseUrl = "",
}) => {
  const [defaultWidgetOpen, setDefaultWidgetOpen] = useState(false);
  const searchParams = useSearchParams();
  const chatOpen = searchParams.get("chat") || "";
  const router = useRouter();
  const pathname = usePathname();

  const slug = pageDetails?.templateId?.slug;
  const ChatUI = CHAT_WIDGET_COMPONENTS[slug] || DefaultChatWidget;

  const reopenWidget = () => {
    setDefaultWidgetOpen(true);
    const params = new URLSearchParams(searchParams);
    params.delete("chat");
    params.delete("source");
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Handle chat open from URL parameter
  useEffect(() => {
    if (!allowedAllActions) return;

    if (chatOpen === "open") {
      if (!defaultWidgetOpen) {
        reopenWidget();
      } else {
        setDefaultWidgetOpen(false);
        const timeout = setTimeout(reopenWidget, 10);
        return () => clearTimeout(timeout);
      }
    }
  }, [chatOpen, allowedAllActions]);

  // Initialize widget open state
  useEffect(() => {
    if (!allowedAllActions) return;

    const hasWidgetBeenOpened = localStorage.getItem("chatWidgetOpened");
    if (!hasWidgetBeenOpened) {
      setDefaultWidgetOpen(true);
      localStorage.setItem("chatWidgetOpened", "true");
    }
  }, [allowedAllActions]);

  // Handle desktop view mode routing
  useEffect(() => {
    if (viewMode === "desktop" && pathname === "/chat") {
      const prevUrl =
        document.referrer &&
        document.referrer.startsWith(window.location.origin)
          ? document.referrer.replace(window.location.origin, "")
          : null;

      let targetUrl = "/"; // default
      if (prevUrl) {
        targetUrl = prevUrl.includes("?")
          ? `${prevUrl}&chat=open`
          : `${prevUrl}?chat=open`;
      } else {
        targetUrl = "/?chat=open";
      }

      router.replace(`${baseUrl}${targetUrl}`);
    }
  }, [viewMode, pathname, router, baseUrl]);

  // Validate widget data
  useEffect(() => {
    if (!allowedAllActions) return;
    if (!widgetData?.settings) {
      router.push(`${baseUrl}/`);
    }
  }, [widgetData, allowedAllActions, router, baseUrl]);

  // Early return if no widget data
  if (!widgetData) {
    return null;
  }

  return (
    <ChatUI
      viewMode={viewMode}
      widgetData={widgetData}
      allowedAllActions={allowedAllActions}
      defaultWidgetOpen={defaultWidgetOpen}
    />
  );
};

export default ChatWidgetLayout;
