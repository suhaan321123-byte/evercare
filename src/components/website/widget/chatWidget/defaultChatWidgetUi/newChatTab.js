import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ArrowLeft, Chrome, Mail, Phone, Send } from "lucide-react";
import { setCustomerToken, removeCustomerToken } from "@/utils/tokenKey";
import {
  getCatalogueProductsTotalAmountApi,
  websiteChatWidgetCancelOrderRequestApi,
  websiteChatWidgetGetChatMessagesApi,
  websiteChatWidgetSendMessageApi,
  websiteChatWidgetSendMessageQuickReplyApi,
  websiteChatWidgetSendPhoneNumberOtpApi,
  websiteChatWidgetVerifyPhoneNumberOtpApi,
  websiteVerifySessionOnServer,
} from "@/api/chatWidget/chatWidgetApi";
import { decryptData, encryptData } from "@/utils/cryptoJS/cryptoJs";
import AlertModal from "@/components/ui/modal/alertModal";
import { socket } from "@/socket";
import { CiMenuKebab } from "react-icons/ci";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DirectBuySummary from "@/components/website/widget/chatWidget/defaultChatWidgetUi/directBuy/directBuySummary";
import SendEnquiryRequestSummary from "@/components/website/widget/chatWidget/defaultChatWidgetUi/sendEnquiryRequest/sendEnquiryRequestSummary";
import WithoutLoginCartSummary from "@/components/website/widget/chatWidget/defaultChatWidgetUi/withoutLoginCartSummary/withoutLoginCartSummary";
import ChatWidgetPayment from "@/components/website/widget/chatWidget/defaultChatWidgetUi/chatWidgetPayment/chatWidgetPayment";
import ChatInput from "@/components/website/widget/chatWidget/defaultChatWidgetUi/chatInput";
import TypingIndicator from "@/components/website/widget/chatWidget/defaultChatWidgetUi/typingIndicator";
import CountryCodeSelector from "@/components/website/widget/chatWidget/defaultChatWidgetUi/countryCodeSelector";
import MessageBubble from "@/components/website/widget/chatWidget/defaultChatWidgetUi/messageBubble";
import TopicSelector from "@/components/website/widget/chatWidget/defaultChatWidgetUi/topicSelector/topicSelector";
import { useCart } from "@/context/CartContext";
import {
  sendWebsiteEmailOtp,
  verifyWebsiteEmailOtp,
} from "@/lib/emailAuthApi";
// import {
//   clearStoredCtaLeadRequest,
//   getStoredCtaLeadRequest,
// } from "@/utils/classroomTemplate/ctaLead";
import { money } from "@/lib/pricing";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { ACCOUNT_TYPE_ID } from "@/services/catalogues";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildCtaLeadMessage = (lead) => {
  if (!lead?.name || !lead?.message) return "";

  const ctaLabel = escapeHtml(lead.ctaLabel || "Website Enquiry");
  const ctaSource = escapeHtml(lead.ctaSource || "classroom_cta");
  const name = escapeHtml(lead.name);
  const phone = escapeHtml(
    `${lead.countryCode || ""} ${lead.phone || ""}`.trim(),
  );
  const email = escapeHtml(lead.email || "");
  const place = escapeHtml(lead.place || "");
  const message = escapeHtml(lead.message || "");
  const sourcePage = escapeHtml(lead.sourcePage || "/");

  return `
    <div class="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-gray-700 max-w-sm">
      <div class="flex items-center justify-between border-b border-amber-200 pb-2">
        <div>
          <h3 class="font-semibold text-amber-900">CTA Lead Request</h3>
          <p class="text-xs text-amber-700">${ctaLabel}</p>
        </div>
        <span class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          ${ctaSource}
        </span>
      </div>
      <div class="space-y-2">
        <div><span class="font-semibold">Name:</span> ${name}</div>
        <div><span class="font-semibold">Phone:</span> ${phone}</div>
        <div><span class="font-semibold">Email:</span> ${email}</div>
        ${
          place
            ? `<div><span class="font-semibold">Place:</span> ${place}</div>`
            : ""
        }
        <div><span class="font-semibold">Message:</span> ${message}</div>
      </div>
    </div>
  `;
};

const NewChatTab = ({
  primaryColor,
  widgetData,
  viewMode,
  userId,
  accountTypeId = ACCOUNT_TYPE_ID,
  baseUrl = "",
}) => {
  const { hydrated: authHydrated, isLoggedIn, session: customerAuthData, setSession: setCustomerAuthData } = useCustomerAuth();
  const [currentStep, setCurrentStep] = useState(
    (customerAuthData || isLoggedIn) ? "chat-active" : "initial",
  );
  const [authStep, setAuthStep] = useState("buttons");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [verificationCode, setVerificationCode] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [topicSelectionDefaultView, setTopicSelectionDefaultView] =
    useState("topic");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [paymentIntegrationData, setPaymentIntegrationData] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const returnTo = useMemo(() => {
    const query = searchParams?.toString?.() || "";
    return query ? `${pathname}?${query}` : pathname || "/";
  }, [pathname, searchParams]);
  const [recallQuerySource, setRecallQuerySource] = useState(null);

  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [allMessages, setAllMessages] = useState([]);
  const [orders, setOrders] = useState([]);

  const scrollAreaRef = useRef(null);
  const socketRef = useRef(null);
  socketRef.current = socket;

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // const scrollAreaRef = useRef(null);
  const scrollHeightRef = useRef(0);
  const currentScrollTopRef = useRef(0);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (customerAuthData && currentStep == "initial") {
      setCurrentStep("chat-active");
    }
  }, [customerAuthData]);

  const checkSession = async () => {
    try {
      const sessionEncrypted = localStorage.getItem("chatSession");
      if (!sessionEncrypted) {
        clearSession();
        return;
      }

      // Decrypt and validate session structure
      const session = await decryptData(JSON.parse(sessionEncrypted));
      if (!session?.customerId) {
        clearSession();
        return;
      }

      // Normalize domains for comparison
      const normalizeDomain = (domain) =>
        domain.replace(/^www\./, "").toLowerCase();

      const currentDomain = normalizeDomain(window.location.hostname);
      const sessionDomain = normalizeDomain(session.hostname);

      // Check expiration with 100-hour validity and 5-minute buffer
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      const sessionDuration = 100 * 60 * 60 * 1000; // 100 hours in milliseconds

      // Session is valid if:
      // 1. Current time is before expiration (with buffer)
      // 2. Session hasn't existed longer than 100 hours
      const isValidTime =
        expiresAt > new Date(now.getTime() - bufferTime) &&
        now - new Date(session.expiresAt) < sessionDuration;

      if (currentDomain !== sessionDomain || !isValidTime) {
        clearSession();
        return;
      }

      if (session?.authMethod === "google" || session?.authMethod === "email") {
        setCustomerAuthData(session);
        if (session?.token) {
          setCustomerToken(session.token);
        }
        setPhoneNumber(session.phoneNumber || "");
        setCountryCode(session.countryCode || "+91");
        setAuthStep("buttons");
        if (widgetData?.settings?.topics?.length > 0) {
          setCurrentStep("topic-selection");
        } else {
          setCurrentStep("chat-active");
        }
        return;
      }

      try {
        const response = await websiteVerifySessionOnServer({
          customerId: session.customerId,
          phoneNumber: session.phoneNumber,
          countryCode: session.countryCode,
          subdomain: session.hostname,
        });

        if (response?.message === "success") {
          setCustomerAuthData(session);
          setPhoneNumber(session.phoneNumber);
          setCountryCode(session.countryCode);
          setCurrentStep("chat-active");
          handleConnectSocket(response.customerData?._id);
          return; // Exit on success
        }
      } catch (error) {
        console.error(
          "Session verification failed (attempt left: ${retries})",
          error,
        );
      }

      // If all retries fail
      clearSession();
    } catch (error) {
      console.error("Session check error:", error);
      clearSession();
    }
  };

  // useEffect(() => {
  //   checkSession();
  // }, []);

  useEffect(() => {
    if (scrollAreaRef.current && page === 1) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [allMessages, page]);

  const loadMessages = useCallback(
    async (pageNum = 1, isLoadMore = false) => {
      if (currentStep !== "chat-active") {
        return;
      }
      if (!customerAuthData?.accountTypeId) {
        return;
      }
      try {
        if (!isLoadMore) {
          setLoading(true);
        } else {
          setIsLoadingMore(true);

          // Save current scroll position before loading more
          if (scrollAreaRef.current) {
            currentScrollTopRef.current = scrollAreaRef.current.scrollTop;
            scrollHeightRef.current = scrollAreaRef.current.scrollHeight;
          }
        }
        const response = await websiteChatWidgetGetChatMessagesApi({
          page: pageNum,
          limit: 30, // Increased for better loading
        });

        if (response?.messages?.length > 0) {
          const newMessages = response.messages.filter(
            (message) => message.providerId === customerAuthData?.accountTypeId,
          );
          const total = response.pagination?.totalMessages || 0;

          if (!isLoadMore) {
            // Initial load - set messages as is
            setAllMessages(newMessages);
          } else {
            // Load more - add older messages at the beginning
            setAllMessages((prev) => {
              // Filter out duplicates
              const existingIds = new Set(prev.map((msg) => msg._id));
              const uniqueNewMessages = newMessages.filter(
                (msg) => !existingIds.has(msg._id),
              );

              return [...uniqueNewMessages, ...prev];
            });
          }

          // Check if more messages exist
          const loadedCount = pageNum * 30;
          setHasMore(loadedCount < total);

          // if (pageNum == 1) {
          //   setTimeout(() => {
          //     if (scrollAreaRef.current) {
          //       scrollAreaRef.current.scrollTop =
          //         scrollAreaRef.current.scrollHeight;
          //     }
          //   }, 100);
          // }
        } else {
          setAllMessages([
            {
              _id: "1",
              message: "Please enter your WhatsApp number to start chat",
              sender: "system",
              createdAt: response?.messages[0]?.createdAt || new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [currentStep, customerAuthData?.accountTypeId],
  );
  // 2. Fixed handleScroll with debounce
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current || isLoadingMore || !hasMore || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;

    // If user scrolls to top (within 100px), load more messages
    if (scrollTop < 100 && !isLoadingMore) {
      loadMoreMessages();
    }
  }, [isLoadingMore, hasMore, loading]);

  // 3. Separate function for loading more messages
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);
    await loadMessages(nextPage, true);
  }, [page, isLoadingMore, hasMore, loadMessages]);

  // 4. Preserve scroll position after loading more
  useEffect(() => {
    if (!isLoadingMore && scrollAreaRef.current && page > 1) {
      const newScrollHeight = scrollAreaRef.current.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeightRef.current;

      // Set scroll position to maintain user's position
      scrollAreaRef.current.scrollTop =
        currentScrollTopRef.current + heightDifference;
    }
  }, [isLoadingMore, page]);

  // 5. Load initial messages
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      setPage(1);
      loadMessages(1, false);
    }
  }, [loadMessages]);

  // 6. Reset when customer changes
  useEffect(() => {
    if (currentStep == "chat-active") {
      if (isInitialMountRef.current) return;
      if (page == 1 && allMessages?.length >= 20) return;
      setAllMessages([]);
      setPage(1);
      setHasMore(true);
      isInitialMountRef.current = true;
      loadMessages(1, false);
    }
  }, [currentStep]);

  // 7. Add scroll listener with throttling
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    let timeoutId;
    const throttledHandleScroll = () => {
      if (timeoutId) return;

      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 100); // Throttle to 100ms
    };

    scrollArea.addEventListener("scroll", throttledHandleScroll);
    return () => {
      scrollArea.removeEventListener("scroll", throttledHandleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  // Enhanced storage management
  const storeVerifiedSession = (values) => {
    const { expiration } = values;
    const sessionData = {
      ...values,
      expiresAt: new Date(Date.now() + expiration).toISOString(),
    };
    const encryptedData = encryptData(sessionData);
    localStorage.setItem("chatSession", JSON.stringify(encryptedData));
    document.cookie = `chatSession=${JSON.stringify(
      encryptedData,
    )}; Secure; SameSite=Strict; max-age=${expiration / 1000}`;
  };

  const clearSession = () => {
    localStorage.removeItem("chatSession");
    removeCustomerToken();
    document.cookie = "chatSession=; Max-Age=0; path=/";
    setAuthStep("buttons");
    setEmailAddress("");
    setEmailOtp("");
    setPhoneNumber("");
    setVerificationCode("");

    setAllMessages([
      {
        _id: "1",
        message: "Please enter your WhatsApp number to start chat",
        sender: "system",
        createdAt: new Date(),
      },
    ]);
    setCurrentStep("phone-entry");
    // Disconnect socket if active
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null; // Optional: clear the ref
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [isTyping]);

  const addMessage = (text, sender) => {
    const newMessage = {
      _id: Date.now().toString(),
      message: text,
      type: "text",
      sender: sender,
      createdAt: new Date(),
    };
    setAllMessages((prev) => [...prev, newMessage]);
    // setMessages((prev) => [...prev, newMessage]);
  };

  const simulateTyping = (callback) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, 2000);
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber.trim()) return;

    const fullNumber = `${countryCode} ${phoneNumber}`;
    addMessage(fullNumber, "user");

    try {
      simulateTyping(() => {
        addMessage(
          "We are establishing communication in shared WhatsApp number",
          "user",
        );
      });
      const response = await websiteChatWidgetSendPhoneNumberOtpApi({
        phoneNumber: phoneNumber,
        countryCode: countryCode,
        subdomain: window.location.hostname,
      });

      if (response?.message == "success") {
        setCurrentStep("code-verification");
        addMessage(
          "We have sent a verification code to your WhatsApp number.",
          "system",
        );
      } else {
        addMessage(
          "Failed to send verification code. Please check your number and try again.",
          "system",
        );
        return;
      }
    } catch (error) {
      console.error("Error verifying phone number:", error);
      addMessage("Failed to verify phone number. Please try again.", "system");
      return;
    }
  };

  const handleConnectSocket = async (customerId) => {
    if (!customerId) {
      return;
    }
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
    // if (customerId) {
    //   if (!socketRef.current) {
    //     socketRef.current = socket;
    //   }

    //   if (!socketRef.current.connected) {
    //     socketRef.current.connect();
    //   }

    //   socketRef.current.off("connect").off("connect_error"); // clear old listeners

    //   socketRef.current.on("connect", async () => {
    //     socketRef.current.emit("new-user-add", customerId);
    //   });

    //   socketRef.current.on("connect_error", (err) => {
    //     console.error("Socket connection error:", err.message);
    //   });
    // }
  };

  const handleQuerySourceToDoAction = async () => {
    let source = recallQuerySource || searchParams.get("source");
    if (!source) return;
    if (!customerAuthData?.customerId) {
      if (source === "cart_summary") {
        setCurrentStep("without-login-cart-summary");
      }
      if (source === "direct_buy" && typeof window !== "undefined") {
        const STORAGE_KEY = "webOrderItemData";
        const raw =
          sessionStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem(STORAGE_KEY);

        if (!raw) return;

        const data = JSON.parse(raw);

        // basic validation
        if (!data?.slug && !data?.productId) return;
        let totalSummary = null;
        const response = await getCatalogueProductsTotalAmountApi({
          products: [data],
          customerId: null,
          deliveryAddress: null,
        });

        if (response?.message === "success") {
          totalSummary = response.data;
        } else {
          // If API call succeeds but business logic fails, reset summary.
          totalSummary = null;
        }

        let messageContent = `
      <div class="flex flex-col gap-3 
        bg-gray-50 dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-lg p-4 text-sm 
        text-gray-700 dark:text-gray-200 max-w-sm">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
              Your Cart
            </h3>
          </div>
        </div>
      `;

        // Add each cart item to the message
        [data].forEach((item, index) => {
          let originalUnit = 0;
          let discountUnit = 0;
          let finalUnit = 0;
          const qty = item?.itemType === "product" ? item?.quantity || 1 : 1;

          if (item?.itemType === "product") {
            let variant = item.selectedVariant;
            if (!variant && item.variants?.length > 0)
              variant = item.variants[0];
            if (!variant)
              variant = {
                basePrice: item.pricing?.basePrice || 0,
                salePrice: item.pricing?.salePrice,
              };

            const undiscPreTax = variant.basePrice || 0;
            const discPreTax = variant.salePrice || undiscPreTax;
            const taxMult = item.pricing?.taxApplicable
              ? 1 + (item.pricing?.taxRate || 0) / 100
              : 1;

            originalUnit = undiscPreTax * taxMult;
            finalUnit = discPreTax * taxMult;
            discountUnit = originalUnit - finalUnit;
          } else {
            // Service
            let pkg = item?.selectedPackage || item?.packages?.[0];
            if (!pkg) pkg = { price: 0, discountPercentage: 0 };

            const preTax = pkg.price || 0;
            const taxMult = item.taxApplicable
              ? 1 + (item.taxRate || 0) / 100
              : 1;

            originalUnit = preTax * taxMult;
            const discPercent = pkg.discountPercentage || 0;
            finalUnit = originalUnit * (1 - discPercent / 100);
            discountUnit = originalUnit - finalUnit;
          }

          const originalTotal = originalUnit * qty;
          const discountTotal = discountUnit * qty;
          const finalTotal = finalUnit * qty;

          // Handle different media types (video, image, or placeholder)
          let mediaContent = "";
          if (item?.images?.[0]) {
            mediaContent = `<img src="${item?.images[0]}" alt="${item?.name}" class="w-10 h-10 object-cover rounded" />`;
          } else if (item?.video) {
            mediaContent = `
        <video 
          src="${item?.video}" 
          class="w-10 h-10 object-cover rounded" 
          controls 
          muted 
          style="object-fit: cover;"
        ></video>
      `;
          } else {
            mediaContent = `
        <div class="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
          <span class="text-gray-500 dark:text-gray-400 text-xs">No Image</span>
        </div>
      `;
          }

          messageContent += `
      <div class="flex items-start gap-3 ${index > 0 ? "pt-2" : ""}">
        ${mediaContent}
        <div class="flex-1">
          <h4 class="font-medium">${item?.name}</h4>
          ${
            item?.itemType === "product" && item?.selectedVariant
              ? `<p class="text-xs text-gray-500 dark:text-gray-400">Variant: ${item?.selectedVariant.name}</p>`
              : ""
          }
          ${
            item?.itemType === "service" && item?.selectedPackage
              ? `<p class="text-xs text-gray-500 dark:text-gray-400">Package: ${item?.selectedPackage.name}</p>`
              : ""
          }
          <div class="flex justify-between items-start mt-1">
            <span class="text-xs text-gray-500 dark:text-gray-400">Qty: ${qty}</span>
            <div class="flex flex-wrap gap-1 text-right">
              ${
                discountTotal > 0
                  ? `<div class="text-xs text-gray-500 dark:text-gray-400 line-through">${money(
                      originalTotal.toFixed(2),
                    )}</div>`
                  : ""
              }
              <div class="text-xs font-medium">${money(
                finalTotal.toFixed(2),
              )}</div>
            </div>
          </div>
        </div>
      </div>
    `;
        });
        messageContent += `
     <div class="border-t border-gray-200 dark:border-gray-600 pt-3 mt-2">
       <div class="space-y-1">
         <div class="flex justify-between items-center">
           <span>Subtotal:</span>
           <span>${money(totalSummary?.subtotal)}</span>
         </div>
         ${
           totalSummary?.totalDiscount > 0
             ? `
         <div class="flex justify-between items-center text-green-500 dark:text-green-400">
           <span>Discount:</span>
           <span>-${money(totalSummary?.totalDiscount)}</span>
         </div>
         `
             : ""
         }
         ${
           totalSummary?.isShippingAvailable && !totalSummary?.shippingIssues
             ? `
         <div class="flex justify-between items-center">
           <span>Shipping Cost:</span>
           ${
             totalSummary?.shippingCost == 0
               ? `
             <span class="text-green-500 dark:text-green-400">Free Shipping</span>
             `
               : `<span>${money(totalSummary?.shippingCost)}</span>`
           }
         </div>
         `
             : ""
         }
         <div class="flex justify-between items-center font-medium border-t border-gray-200 dark:border-gray-600 pt-2">
           <span>Total:</span>
           <span>${money(totalSummary?.total)}</span>
         </div>
       </div>
     </div>
   </div>
 `;

        const newMessage = {
          _id: "id-1",
          message: messageContent,
          type: "component",
          senderId: "user",
          clientId: "user",
          createdAt: new Date(),
        };

        let message2 = `
         <div class="flex flex-col gap-3 
        bg-white dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-xl p-4 px-6 text-sm 
        text-gray-700 dark:text-gray-200">
            <h3 class="text-green-600 font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
              Your order is ready to be processed
            </h3>
        </div>
        `;

        const newMessage2 = {
          _id: "id-1",
          message: message2,
          type: "component",
          senderId: "system",
          clientId: "user",
          createdAt: new Date(),
        };
        setAllMessages((prev) => {
          return [
            newMessage,
            newMessage2,
            {
              _id: "1",
              message: "Please enter your WhatsApp number to log in",
              sender: "system",
              createdAt: new Date(),
            },
          ];
        });
      }

      if (
        source === "product_details_request" &&
        typeof window !== "undefined"
      ) {
        let message1 = `
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-blue-800 dark:text-blue-200 font-medium text-sm">
                Login Required
              </p>
              <p class="text-blue-600 dark:text-blue-400 text-xs mt-1">
                Your product inquiry is ready to be sent. Please log in to complete the process.
              </p>
            </div>
          </div>
        </div>
      `;

        const newMessage1 = {
          _id: "id-1",
          message: message1,
          type: "component",
          senderId: "system",
          clientId: "user",
          createdAt: new Date(),
        };
        setAllMessages((prev) => {
          return [
            newMessage1,
            {
              _id: "1",
              message: "Please enter your WhatsApp number to log in",
              sender: "system",
              createdAt: new Date(),
            },
          ];
        });
      }
      // if (source === "cta_lead_request" && typeof window !== "undefined") {
      //   const lead = getStoredCtaLeadRequest();

      //   if (!lead?.name || !lead?.message) return;

      //   const loginMessage = `
      //   <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
      //     <div class="flex items-start gap-3">
      //       <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
      //         <svg class="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      //           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
      //         </svg>
      //       </div>
      //       <div class="flex-1">
      //         <p class="text-amber-900 font-medium text-sm">
      //           Login required to continue this enquiry
      //         </p>
      //         <p class="text-amber-700 text-xs mt-1">
      //           Your request is saved. Verify OTP and the chat will send it automatically.
      //         </p>
      //       </div>
      //     </div>
      //   </div>
      // `;

      //   setAllMessages((prev) => [
      //     {
      //       _id: `cta-lead-login-${Date.now()}`,
      //       message: loginMessage,
      //       type: "component",
      //       senderId: "system",
      //       clientId: "user",
      //       createdAt: new Date(),
      //     },
      //     ...prev.filter((message) => message?._id !== "1"),
      //     {
      //       _id: "1",
      //       message: "Please enter your WhatsApp number to log in",
      //       sender: "system",
      //       createdAt: new Date(),
      //     },
      //   ]);
      // }
      setRecallQuerySource(source);
      return;
    }
    try {
      // if (source === "cta_lead_request" && typeof window !== "undefined") {
      //   const lead = getStoredCtaLeadRequest();
      //   const messageContent = buildCtaLeadMessage(lead);

      //   if (!messageContent) return;

      //   const sendSuccess = await handleSendMessage({
      //     type: "component",
      //     content: messageContent,
      //   });

      //   if (!sendSuccess) {
      //     return;
      //   }

      //   setCurrentStep("chat-active");
      //   clearStoredCtaLeadRequest();

      //   const params = new URLSearchParams(searchParams);
      //   params.delete("chat");
      //   params.delete("source");

      //   router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      //   return;
      // }

      if (source === "send_enquiry_request" && typeof window !== "undefined") {
        try {
          const STORAGE_KEY = "webOrderSendEnquiryRequestItemData";
          const STORAGE_KEY2 = "webOrderSendEnquiryRequestItemWithPriceData";
          const raw =
            sessionStorage.getItem(STORAGE_KEY) ||
            localStorage.getItem(STORAGE_KEY) ||
            sessionStorage.getItem(STORAGE_KEY2) ||
            localStorage.getItem(STORAGE_KEY2);

          if (!raw) return;

          const data = JSON.parse(raw);

          // basic validation
          if (!data?.slug && !data?.productId) return;

          // perform request
          // sendEnquiryRequest(data, "Product");

          // clear after use to prevent duplicate sends
          // sessionStorage.removeItem(STORAGE_KEY);
          // localStorage.removeItem(STORAGE_KEY);
          // Remove chat and source but keep others
          setCurrentStep("send-enquiry-request");

          const params = new URLSearchParams(searchParams);
          params.delete("chat");
          params.delete("source");

          router.replace(`${pathname}?${params.toString()}`, undefined, {
            shallow: true,
          });
        } catch (e) {
          console.error(e);
          // optional: toast parse/submit error
          // sessionStorage.removeItem(STORAGE_KEY);
          // localStorage.removeItem(STORAGE_KEY);
        }
      } else if (source === "direct_buy" && typeof window !== "undefined") {
        try {
          const STORAGE_KEY = "webOrderItemData";
          const raw =
            sessionStorage.getItem(STORAGE_KEY) ||
            localStorage.getItem(STORAGE_KEY);

          if (!raw) return;

          const data = JSON.parse(raw);

          // basic validation
          if (!data?.slug && !data?.productId) return;

          // perform request
          // handleCreateOrder([data]);
          setCurrentStep("direct-buy");

          // clear after use to prevent duplicate sends
          // sessionStorage.removeItem(STORAGE_KEY);
          // localStorage.removeItem(STORAGE_KEY);
          // Remove chat and source but keep others
          const params = new URLSearchParams(searchParams);
          params.delete("chat");
          params.delete("source");

          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        } catch (e) {
          console.error(e);
          // optional: toast parse/submit error
          sessionStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_KEY);
        }
      } else if (source === "cart_summary" && typeof window !== "undefined") {
        try {
          setTopicSelectionDefaultView("cartSummary");
          setCurrentStep("topic-selection");
          // Remove chat and source but keep others
          const params = new URLSearchParams(searchParams);
          params.delete("chat");
          params.delete("source");

          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        } catch (e) {
          console.error(e);
          // optional: toast parse/submit error
          sessionStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_KEY);
        }
      } else if (
        source === "product_details_request" &&
        typeof window !== "undefined"
      ) {
        const STORAGE_KEY = "webProductDetailsRequest";
        const raw =
          sessionStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem(STORAGE_KEY);

        if (!raw) return;

        const data = JSON.parse(raw);

        // basic validation
        if (!data?.slug && !data?.productId) return;

        let messageContent = `
          <div class="flex flex-col gap-3 
            bg-gray-50 dark:bg-gray-700
            border border-gray-200 dark:border-gray-600
            rounded-lg p-4 text-sm 
            text-gray-700 dark:text-gray-200 max-w-sm">
            <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-blue-600 dark:text-blue-400">
                  Product Details Request
                </h3>
              </div>
            </div>
          `;

        // Add product information
        if (data) {
          // Handle different media types (video, image, or placeholder)
          let mediaContent = "";
          if (data?.images?.[0]) {
            mediaContent = `<img src="${data.images[0]}" alt="${data.name}" class="w-16 h-16 object-cover rounded-lg" />`;
          } else if (data?.video) {
            mediaContent = `
              <video 
                src="${data.video}" 
                class="w-16 h-16 object-cover rounded-lg" 
                muted 
                style="object-fit: cover;"
              ></video>
            `;
          } else {
            mediaContent = `
              <div class="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                <span class="text-gray-500 dark:text-gray-400 text-xs">No Image</span>
              </div>
            `;
          }

          messageContent += `
            <div class="flex items-start gap-3">
              ${mediaContent}
              <div class="flex-1">
                <h4 class="font-medium text-gray-900 dark:text-white mb-1">${
                  data.name || "No Name"
                }</h4>
                ${
                  data.categoryId?.name
                    ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Category: ${data.categoryId.name}</p>`
                    : ""
                }
                ${
                  data.description
                    ? `<p class="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">${data.description}</p>`
                    : ""
                }
              </div>
            </div>
          `;

          // Add tags/features if available
          if (data?.tags && data?.tags?.length > 0) {
            messageContent += `
              <div class="mt-2">
                <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Features:</p>
                <div class="flex flex-wrap gap-1">
                  ${data.tags
                    .map(
                      (tag) =>
                        `<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">${tag}</span>`,
                    )
                    .join("")}
                </div>
              </div>
            `;
          }
        }

        messageContent += `</div>`; // Close the main div

        handleSendMessage({ type: "component", content: messageContent });
        setCurrentStep("chat-active");
      } else if (
        source === "travelEnquiryRequest" &&
        typeof window !== "undefined"
      ) {
        const STORAGE_KEY = "webProductDetailsRequest";
        const raw =
          sessionStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem(STORAGE_KEY);

        if (!raw) return;

        const enquiryData = JSON.parse(raw);

        // Basic validation
        if (!enquiryData?._id) return;

        let messageContent = `
    <div class="flex flex-col gap-3 
      bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-700 dark:to-gray-800
      border border-blue-200 dark:border-gray-600
      rounded-lg p-4 text-sm 
      text-gray-700 dark:text-gray-200 max-w-sm">
  `;

        // Handle media (images array or single image)
        let mediaContent = "";
        if (enquiryData?.images?.[0]) {
          // If images is an array, use the first image
          mediaContent = `<img src="${enquiryData.images[0]}" alt="${enquiryData.name}" class="w-16 h-16 object-cover rounded-lg" />`;
        } else if (enquiryData?.image) {
          // If single image field exists
          mediaContent = `<img src="${enquiryData.image}" alt="${enquiryData.name}" class="w-16 h-16 object-cover rounded-lg" />`;
        } else {
          // No image available
          mediaContent = `
      <div class="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
        <span class="text-gray-500 dark:text-gray-400 text-xs">No Image</span>
      </div>
    `;
        }

        // Header with Image and Title
        messageContent += `
    <div class="flex items-start gap-3 border-b border-blue-200 dark:border-gray-600 pb-3">
      ${mediaContent}
      
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h3 class="font-semibold text-blue-600 dark:text-blue-400 text-base">
            ${enquiryData.name}
          </h3>
        </div>
        
        ${
          enquiryData.category
            ? `
        <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
          <span>${enquiryData.category}</span>
        </div>
        `
            : ""
        }
      </div>
    </div>
  `;

        // Add service details
        messageContent += `
    <div class="space-y-2">
      ${
        enquiryData.location
          ? `
      <div class="flex justify-between">
        <span class="font-medium text-gray-600 dark:text-gray-300">Location:</span>
        <span>${enquiryData.location}</span>
      </div>
      `
          : ""
      }
      
      <!-- Price Section - Conditionally show based on priceVisible -->
      ${
        enquiryData.priceVisible
          ? `
        <div>
          ${
            enquiryData.discount > 0
              ? `
          <div class="flex justify-between items-center mb-1">
            <span class="font-medium text-gray-600 dark:text-gray-300">Original Price:</span>
            <span class="text-gray-500 line-through">${enquiryData.totalPriceWithoutDiscount}</span>
          </div>
          <div class="flex justify-between items-center mb-1">
            <span class="font-medium text-gray-600 dark:text-gray-300">Discount:</span>
            <span class="text-orange-600 dark:text-orange-400 font-semibold">${enquiryData.discount}% OFF</span>
          </div>
          `
              : ""
          }
          
          <div class="flex justify-between items-center">
            <span class="font-medium text-gray-600 dark:text-gray-300">Total Amount:</span>
            <span class="text-green-600 dark:text-green-400 font-semibold text-lg">${
              enquiryData.price
            }</span>
          </div>
        </div>
      `
          : `
        <!-- Price not visible - show alternative message -->
        <div class="border-t border-blue-200 dark:border-gray-600 pt-2 mt-2">
          <div class="text-center text-gray-500 dark:text-gray-400 italic py-1">
            Contact for pricing details
          </div>
        </div>
      `
      }
  `;

        // Add variant inclusions if available
        if (
          enquiryData.variant?.inclusions &&
          enquiryData.variant.inclusions.length > 0
        ) {
          messageContent += `
      <div class="border-t border-blue-200 dark:border-gray-600 pt-2 mt-2">
        <div class="font-medium text-gray-600 dark:text-gray-300 mb-1">Package Includes:</div>
        <ul class="text-xs space-y-1">
          ${enquiryData.variant.inclusions
            .map(
              (inclusion) =>
                `<li class="flex items-start gap-1">
              <span class="text-green-500 mt-0.5">•</span>
              <span>${inclusion}</span>
            </li>`,
            )
            .join("")}
        </ul>
      </div>
    `;
        }

        messageContent += `
      <div class="flex justify-between border-t border-blue-200 dark:border-gray-600 pt-2 mt-2">
        <span class="font-medium text-gray-600 dark:text-gray-300">Status:</span>
        <span class="text-green-600 dark:text-green-400 font-semibold">New Booking Request</span>
      </div>
    </div>
  `;

        messageContent += `</div>`; // Close the main div

        handleSendMessage({
          type: "component",
          content: messageContent,
        });
        setCurrentStep("chat-active");

        // Clear the enquiry data after sending
        localStorage.removeItem("webProductDetailsRequest");
        sessionStorage.removeItem("webProductDetailsRequest");
      } else if (
        source === "customPackageRequest" &&
        typeof window !== "undefined"
      ) {
        const STORAGE_KEY = "webProductDetailsRequest";
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
          console.log("No enquiry data found");
          return;
        }

        let enquiryData;
        try {
          enquiryData = JSON.parse(raw);
        } catch (error) {
          console.error("Error parsing enquiry data:", error);
          return;
        }

        // Validate required fields
        if (!enquiryData?._id || !enquiryData?.name) {
          console.log("Invalid enquiry data structure");
          return;
        }

        // Parse date safely
        let formattedDate = "";
        if (enquiryData.selectedDate) {
          try {
            // Handle different date formats
            const date = new Date(enquiryData.selectedDate);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            }
          } catch (error) {
            console.error("Error parsing date:", error);
          }
        }

        // Get inclusions from variant or direct inclusions array
        const inclusions =
          enquiryData?.variant?.inclusions ||
          enquiryData?.inclusions ||
          enquiryData.variant?.originalPackage?.inclusions ||
          [];

        // Get variant name
        const variantName = enquiryData?.variant?.name || enquiryData.name;

        // Get duration from variant
        const duration =
          enquiryData?.variant?.duration ||
          enquiryData?.duration ||
          (enquiryData.variant?.duration_days
            ? `${enquiryData.variant.duration_days} Days`
            : "Custom");

        // Get discount percentage
        const discountPercentage =
          enquiryData?.variant?.discountPercentage ||
          enquiryData?.discount ||
          0;

        // Check if price is visible
        const isPriceVisible = enquiryData?.priceVisible !== false;

        // Build message content
        let messageContent = `
<div class="flex flex-col gap-3 
  bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-700 dark:to-gray-800
  border border-blue-200 dark:border-gray-600
  rounded-lg p-4 text-sm 
  text-gray-700 dark:text-gray-200 max-w-sm">
`;

        // Handle media
        let mediaContent = "";
        if (enquiryData?.images?.[0]) {
          mediaContent = `<img src="${enquiryData.images[0]}" alt="${enquiryData.name}" class="w-16 h-16 object-cover rounded-lg" />`;
        } else {
          mediaContent = `
<div class="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center">
  <span class="text-blue-500 dark:text-blue-300 text-xs">✈️</span>
</div>
`;
        }

        // Header section
        messageContent += `
<div class="flex items-start gap-3 border-b border-blue-200 dark:border-gray-600 pb-3">
  ${mediaContent}
  
  <div class="flex-1">
    <div class="flex items-center gap-2 mb-1">
      <div class="w-6 h-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
        </svg>
      </div>
      <h3 class="font-semibold text-blue-600 dark:text-blue-400 text-base">
        ${variantName}
      </h3>
    </div>
    
    <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
      </svg>
      <span>${enquiryData.category || "Travel Package"}</span>
    </div>
  </div>
</div>
`;

        // Add service details
        messageContent += `
<div class="space-y-2">
  ${
    formattedDate
      ? `
  <div class="flex justify-between">
    <span class="font-medium text-gray-600 dark:text-gray-300">Travel Date:</span>
    <span>${formattedDate}</span>
  </div>
  `
      : ""
  }
  
  ${
    enquiryData.passengerCount
      ? `
  <div class="flex justify-between">
    <span class="font-medium text-gray-600 dark:text-gray-300">Passengers:</span>
    <span>${enquiryData.passengerCount} ${
      enquiryData.passengerCount === 1 ? "person" : "people"
    }</span>
  </div>
  `
      : ""
  }
  
  ${
    duration
      ? `
  <div class="flex justify-between">
    <span class="font-medium text-gray-600 dark:text-gray-300">Duration:</span>
    <span>${duration}</span>
  </div>
  `
      : ""
  }
  
  ${
    enquiryData.location
      ? `
  <div class="flex justify-between">
    <span class="font-medium text-gray-600 dark:text-gray-300">Destination:</span>
    <span class="text-blue-600 dark:text-blue-400 font-medium">${enquiryData.location}</span>
  </div>
  `
      : ""
  }
  
  <!-- Price Section -->
  <div class="border-t border-blue-200 dark:border-gray-600 pt-2 mt-2">
    ${
      isPriceVisible
        ? `
      ${
        discountPercentage > 0
          ? `
        <div class="flex justify-between items-center mb-1">
          <span class="font-medium text-gray-600 dark:text-gray-300">Original Price:</span>
          <span class="text-gray-500 line-through text-sm">${
            enquiryData.totalPriceWithoutDiscount || enquiryData.price
          }</span>
        </div>
        <div class="flex justify-between items-center mb-1">
          <span class="font-medium text-gray-600 dark:text-gray-300">Discount:</span>
          <span class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 px-2 py-0.5 rounded-full text-xs font-semibold">${discountPercentage}% OFF</span>
        </div>
        `
          : ""
      }
      
      <div class="flex justify-between items-center">
        <span class="font-medium text-gray-600 dark:text-gray-300">Estimated Price:</span>
        <span class="text-green-600 dark:text-green-400 font-bold text-lg">
          ${
            enquiryData.price
              ? `${enquiryData.price}<span class="text-sm font-medium">/person</span>`
              : "Contact for price"
          }
        </span>
      </div>
      `
        : `
      <!-- Price not visible - show contact message -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <span class="font-semibold text-blue-600 dark:text-blue-300">Custom Pricing</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Contact us for personalized pricing based on your preferences. We'll provide a custom quote within 24 hours.
        </p>
      </div>
      `
    }
  </div>
`;

        // Package details section
        messageContent += `
<div class="border-t border-blue-200 dark:border-gray-600 pt-2 mt-2">
  <div class="flex justify-between">
    <span class="font-medium text-gray-600 dark:text-gray-300">Package Type:</span>
    <span class="text-blue-600 dark:text-blue-400 font-medium">${
      enquiryData.deliveryType || "Standard"
    }</span>
  </div>
  <div class="flex justify-between border-t border-blue-200 dark:border-gray-600 pt-2 mt-2">
    <span class="font-medium text-gray-600 dark:text-gray-300">Status:</span>
    <span class="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-semibold">
      ${isPriceVisible ? "✨ New Booking Request" : "📧 Custom Quote Request"}
    </span>
  </div>
</div>
`;

        messageContent += `</div>`;

        handleSendMessage("component", messageContent);
        setCurrentStep("chat-active");

        // Clear storage after sending
        localStorage.removeItem("webProductDetailsRequest");
      } else if (
        source === "customPackageRequest" &&
        typeof window !== "undefined"
      ) {
        const STORAGE_KEY = "webProductDetailsRequest";
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
          return;
        }

        let requestData;
        try {
          requestData = JSON.parse(raw);
        } catch (error) {
          console.error("Error parsing custom package data:", error);
          return;
        }

        // Check if it's a custom package request
        if (requestData.type !== "custom_request") {
          return;
        }

        // Use pre-generated chat message if available
        if (requestData.chatMessage) {
          handleSendMessage({
            type: "component",
            content: requestData.chatMessage,
            messageNotificationType: "WC-SERVICE-Custom-Booking-Request",
          });
          setCurrentStep("chat-active");

          // Clear storage after sending
          localStorage.removeItem("webProductDetailsRequest");
          return;
        }

        // Fallback: Generate message from form data
        const formConfig = requestData.formConfig;

        let messageContent = `
    <div class="flex flex-col gap-3 
      bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-700 dark:to-gray-800
      border border-blue-200 dark:border-gray-600
      rounded-lg p-4 text-sm 
      text-gray-700 dark:text-gray-200 max-w-sm">
      
      <!-- Header -->
      <div class="flex items-start gap-3 border-b border-blue-200 dark:border-gray-600 pb-3">
        
        
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-6 h-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <h3 class="font-semibold text-blue-600 dark:text-blue-400 text-base">
              ${requestData.name || "Custom Package Request"}
            </h3>
          </div>
          
          <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span>Submitted: ${new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      <!-- Form Data -->
      <div class="space-y-2">
  `;

        // Add all form fields to message
        const formData = requestData.formData || {};

        Object.keys(formData).forEach((fieldId) => {
          const value = formData[fieldId];
          if (value !== undefined && value !== null && value !== "") {
            // Find field configuration
            const fieldConfig = formConfig.fields?.find(
              (f) => f.id === fieldId,
            );
            const fieldLabel = fieldConfig?.label || fieldId.replace(/_/g, " ");

            let displayValue = value;

            // Format date
            if (fieldConfig?.type === "date") {
              try {
                const date = new Date(value);
                displayValue = date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              } catch (error) {
                displayValue = value;
              }
            }

            messageContent += `
        <div class="flex justify-between">
          <span class="font-medium text-gray-600 dark:text-gray-300">${fieldLabel}:</span>
          <span class="${
            fieldConfig?.required
              ? "font-semibold text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }">
            ${displayValue}
          </span>
        </div>
      `;
          }
        });

        handleSendMessage({ type: "component", content: messageContent });
        setCurrentStep("chat-active");

        // Clear storage after sending
        localStorage.removeItem("webProductDetailsRequest");
      } else if (
        source === "course_offline_request" &&
        typeof window !== "undefined"
      ) {
        const STORAGE_KEY = "webProductDetailsRequest";
        const raw =
          sessionStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem(STORAGE_KEY);

        if (!raw) return;

        const data = JSON.parse(raw);

        // basic validation
        if (!data?._id && !data?.title) return;

        let messageContent = `
    <div class="flex flex-col gap-3 
      bg-gray-50 dark:bg-gray-700
      border border-gray-200 dark:border-gray-600
      rounded-lg p-4 text-sm 
      text-gray-700 dark:text-gray-200 max-w-sm">
      <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-green-600 dark:text-green-400">
            Course Enquiry
          </h3>
        </div>
      </div>
  `;

        // Add course information
        if (data) {
          // Handle course image or placeholder
          let mediaContent = "";
          const courseImage =
            data.image || data.thumbnailS3Key || data.media?.[0]?.url;

          if (courseImage) {
            mediaContent = `<img src="${courseImage}" alt="${data.title}" class="w-16 h-16 object-cover rounded-lg" />`;
          } else {
            mediaContent = `
        <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
          <span class="text-white text-xs font-bold">Course</span>
        </div>
      `;
          }

          messageContent += `
      <div class="flex items-start gap-3">
        ${mediaContent}
        <div class="flex-1">
          <h4 class="font-medium text-gray-900 dark:text-white mb-1">${
            data.title || "No Title"
          }</h4>
          ${
            data.category?.name || data.category
              ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Category: ${
                  data.category?.name || data.category
                }</p>`
              : ""
          }
          ${
            data.type
              ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Type: ${data.type}</p>`
              : ""
          }
          ${
            data.metadata?.difficulty
              ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Level: ${data.metadata.difficulty}</p>`
              : ""
          }
          ${
            data.description
              ? `<p class="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">${data.description}</p>`
              : ""
          }
        </div>
      </div>
    `;

          // Add pricing information if available
          const price = data.subscriptionPlans?.[0]?.price;
          if (price !== undefined && price !== null) {
            messageContent += `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Pricing:</p>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-green-600 dark:text-green-400">
              ${price === 0 ? "Free" : `₹${price}`}
            </span>
            ${
              data.subscriptionPlans?.[0]?.discount?.value
                ? `<span class="text-xs line-through text-gray-500">₹${(
                    price /
                    (1 - data.subscriptionPlans[0].discount.value / 100)
                  ).toFixed(2)}</span>`
                : ""
            }
          </div>
        </div>
      `;
          }

          // Add course features if available
          if (data?.features && data?.features?.length > 0) {
            messageContent += `
        <div class="mt-2">
          <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Course Features:</p>
          <div class="flex flex-wrap gap-1">
            ${data.features
              .slice(0, 4) // Limit to 4 features
              .map(
                (feature) =>
                  `<span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">${feature}</span>`,
              )
              .join("")}
            ${
              data.features.length > 4
                ? `<span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">+${
                    data.features.length - 4
                  } more</span>`
                : ""
            }
          </div>
        </div>
      `;
          }

          // Add duration and students info if available
          const duration = data.metadata?.totalDuration;
          const students = data.subscribersCount;

          if (duration || students) {
            messageContent += `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            ${duration ? `<span>⏱️ ${duration} hours</span>` : ""}
            ${students ? `<span>👥 ${students} students</span>` : ""}
          </div>
        </div>
      `;
          }
        }

        messageContent += `</div>`; // Close the main div

        handleSendMessage({ type: "component", content: messageContent });
        setCurrentStep("chat-active");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRecallQuerySource(null);
    }
  };

  useEffect(() => {
    if (!source && !customerAuthData) return;
    handleQuerySourceToDoAction();
  }, [source, customerAuthData]);

  const resetLoginState = () => {
    setAuthStep("buttons");
    setEmailAddress("");
    setEmailOtp("");
    setVerificationCode("");
  };

  const handleGoogleLogin = async () => {
    try {
      const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      if (!backendBaseUrl) {
        throw new Error("Backend URL is not configured.");
      }

      setLoading(true);
      const url = new URL("/auth/google/website/login/url", backendBaseUrl);
      url.searchParams.set("origin", window.location.origin);
      url.searchParams.set("returnTo", returnTo || "/");

      const res = await fetch(url.toString(), { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Failed to start Google login");
      }
      if (!json?.authUrl) {
        throw new Error("Missing authUrl from server");
      }

      window.location.href = String(json.authUrl);
    } catch (error) {
      addMessage(
        error instanceof Error ? error.message : "Google login failed.",
        "system",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const value = String(emailAddress || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      addMessage("Please enter a valid email address.", "system");
      return;
    }

    setLoading(true);
    try {
      const response = await sendWebsiteEmailOtp({
        email: value,
        origin: window.location.origin,
        returnTo: returnTo || "/",
        subdomain: window.location.hostname,
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Failed to send OTP");
      }

      setEmailOtp("");
      setAuthStep("emailOtp");
      addMessage("We sent a verification code to your email.", "system");
    } catch (error) {
      addMessage(
        error instanceof Error ? error.message : "Failed to send email OTP.",
        "system",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const value = String(emailAddress || "").trim().toLowerCase();
    const code = String(emailOtp || "").trim();
    if (!code) {
      addMessage("Please enter the email verification code.", "system");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyWebsiteEmailOtp({
        email: value,
        otp: code,
        origin: window.location.origin,
        returnTo: returnTo || "/",
        subdomain: window.location.hostname,
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Email verification failed");
      }

      if (!response?.customerId || !response?.token) {
        throw new Error("Login failed");
      }

      const sessionData = {
        customerId: response.customerId,
        email: value,
        name: response?.customerData?.name || "",
        image: response?.customerData?.image || "",
        authMethod: "email",
        hostname: window.location.hostname,
        expiration: 240 * 60 * 60 * 1000,
        ...response?.customerData,
      };

      setCustomerAuthData(sessionData);
      storeVerifiedSession({
        ...sessionData,
        expiration: 240 * 60 * 60 * 1000,
      });
      setCustomerToken(response.token);
      resetLoginState();
      if (recallQuerySource) {
        handleQuerySourceToDoAction();
      } else if (widgetData?.settings?.topics?.length > 0) {
        setCurrentStep("topic-selection");
      } else {
        setCurrentStep("chat-active");
      }
      addMessage("You are now signed in with email.", "system");
    } catch (error) {
      addMessage(
        error instanceof Error ? error.message : "Email login failed.",
        "system",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!verificationCode.trim()) return;

    try {
      const response = await websiteChatWidgetVerifyPhoneNumberOtpApi({
        phoneNumber: phoneNumber,
        countryCode: countryCode,
        otp: verificationCode,
        subdomain: window.location.hostname,
      });

      if (
        response?.message == "success" &&
        response?.customerId &&
        response?.token &&
        response?.customerData
      ) {
        const sessionData = {
          customerId: response.customerId,
          phoneNumber: phoneNumber,
          countryCode: countryCode,
          hostname: window.location.hostname,
          expiration: 240 * 60 * 60 * 1000,
          ...response?.customerData,
        };
        setCustomerAuthData(sessionData);
        storeVerifiedSession(sessionData);

        if (typeof window !== "undefined" && response?.token) {
          setCustomerToken(response.token);
        }

        setPhoneNumber(phoneNumber);
        resetLoginState();
        if (recallQuerySource) {
          handleQuerySourceToDoAction();
        } else {
          if (widgetData?.settings?.topics?.length > 0) {
            setCurrentStep("topic-selection");
          } else {
            setCurrentStep("chat-active");
          }
        }
        // setCurrentStep("chat-active");
        addMessage(
          "We have established your WhatsApp communication. Please continue chat.",
          "user",
        );
        handleConnectSocket(response.customerId);
        // addWelcomeBackMessage(phoneNumber);
      } else {
        addMessage("Invalid verification code. Please try again.", "system");
        return;
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      addMessage("Failed to verify OTP. Please try again.", "system");
      return;
    } finally {
      setVerificationCode("");
    }
  };

  const handleCancelOrder = async (order) => {
    try {
      if (order?.userCancellationRequests?.length > 0) {
        setSnackbar({
          open: true,
          message:
            "You have already submitted a cancellation request for this order.",
          severity: "error",
        });
        return;
      }
      // const response = await websiteChatWidgetCancelOrderApi({
      const response = await websiteChatWidgetCancelOrderRequestApi({
        mode: order.mode,
        orderId: order?._id,
        customerId: customerAuthData?.customerId,
      });

      if (response?.message == "success") {
        setOrders([]);
        setOrders(response.data);

        const quickReplyOld = `
          <div class="flex items-start gap-3 
            bg-gray-50 dark:bg-gray-700
            border border-gray-200 dark:border-gray-600
            rounded-lg p-4 text-sm 
            text-gray-700 dark:text-gray-200 
            shadow-sm">

            <div class="text-red-600 dark:text-red-400 text-lg">❌</div>
            <div class="flex flex-col">
              <span class="font-semibold text-red-600 dark:text-red-400">
                Order Cancelled
              </span>
              <span>
                Your order <strong>#${
                  order?.orderId || "N/A"
                }</strong> has been successfully cancelled.
              </span>
            </div>
          </div>
        `;

        const quickReply = `
<div class="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200 shadow-sm">
  <div class="text-amber-600 dark:text-amber-400 text-lg flex-shrink-0">⚠️</div>
  <div class="flex flex-col">
    <span class="font-semibold text-amber-700 dark:text-amber-300 mb-1">Cancellation Request Submitted</span>
    <span class="mb-2 text-amber-700 dark:text-amber-300">Your cancellation request for order <strong class="text-amber-800 dark:text-amber-200">#${
      order?.orderId || "N/A"
    }</strong> has been submitted successfully.</span>
    <div class="text-xs text-amber-600 dark:text-amber-400 space-y-1">
      <div class="flex justify-between">
        <span>Status:</span>
        <span class="font-medium">Pending Approval</span>
      </div>
      <div class="flex justify-between">
        <span>Submitted:</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
    </div>
  </div>
</div>
      `;

        setTimeout(() => {
          handleQuickReply(quickReply);
        }, 1000);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async ({
    type = "text",
    content,
    caption,
    contentType,
    retryCount = 0,
  }) => {
    try {
      const values = {
        senderId: customerAuthData?.customerId,
        message: content,
        type: type,
        caption: caption || "",
        contentType: contentType || "",
        customerId: customerAuthData?.customerId,
      };
      const response = await websiteChatWidgetSendMessageApi(values);
      if (response?.message !== "success") {
        setSnackbar({
          open: true,
          message: response.message || "Error sending message.",
          severity: "error",
        });
        return false;
      }
      if (response?.newMessage) {
        setAllMessages((prev) => {
          if (prev.some((msg) => msg._id === response.newMessage._id))
            return prev;
          return [...prev, response.newMessage];
        });

        // Scroll to bottom after sending
        setTimeout(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop =
              scrollAreaRef.current.scrollHeight;
          }
        }, 100);
      }
      return true;
    } catch (error) {
      console.error("Error sending message:", error);

      if (
        error?.response?.data?.message ===
        "Unauthorized: You can only access your own data"
      ) {
        if (retryCount < 3) {
          // Limit to 3 retries
          await checkSession();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return handleSendMessage({
            type,
            content,
            caption,
            contentType,
            retryCount: retryCount + 1,
          });
        } else {
          setSnackbar({
            open: true,
            message: "Session expired. Please refresh the page.",
            severity: "error",
          });
          clearSession();
          return false;
        }
      } else {
        // Handle other errors
        setSnackbar({
          open: true,
          message: "Failed to send message. Please try again.",
          severity: "error",
        });
        return false;
      }
    }
  };

  const handleQuickReply = async (messageContent) => {
    try {
      setIsTyping(true);

      // Send the message
      if (messageContent) {
        const values = {
          senderId: customerAuthData?.customerId,
          message: messageContent,
          type: "component",
          caption: "",
          contentType: "",
          customerId: customerAuthData?.customerId,
        };
        const response =
          await websiteChatWidgetSendMessageQuickReplyApi(values);
        if (response?.newMessage) {
          setAllMessages((prevMessages) => [
            ...prevMessages,
            response.newMessage,
          ]);
          setTimeout(() => {
            if (scrollAreaRef.current) {
              scrollAreaRef.current.scrollTop =
                scrollAreaRef.current.scrollHeight;
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error handling quick reply:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTopicSelect = async (messageContent) => {
    try {
      // Send the message
      if (messageContent) {
        handleSendMessage({ type: "component", content: messageContent });
      }

      setCurrentStep("chat-active");
    } catch (error) {
      console.error("Error handling topic selection:", error);
    }
  };

  // useEffect(() => {
  //   if (scrollAreaRef.current) {
  //     scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
  //   }
  // }, [allMessages]);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = socket;
    }

    const handleIncomingMessage = (message) => {
      if (
        message?.clientId &&
        message.clientId !== customerAuthData.customerId // customerId from state/session
      ) {
        return; // ignore if not for this customer
      }
      setAllMessages((prevMessages) => {
        const isDuplicate = prevMessages?.some(
          (prevMsg) => prevMsg?._id === message?._id,
        );

        if (!isDuplicate) {
          return [...prevMessages, message];
        }

        return prevMessages;
      });
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    };

    socketRef.current.off(
      "get-website-chat-widget-message",
      handleIncomingMessage,
    );
    socketRef.current.on(
      "get-website-chat-widget-message",
      handleIncomingMessage,
    );

    return () => {
      socketRef.current.off(
        "get-website-chat-widget-message",
        handleIncomingMessage,
      );
    };
  }, [customerAuthData?.customerId, scrollAreaRef.current]);

  const goBack = () => {
    if (currentStep === "without-login-cart-summary" && !customerAuthData) {
      setCurrentStep("initial");
    } else {
      setCurrentStep("topic-selection");
    }
  };
  const memoizedMessages = useMemo(() => allMessages, [allMessages]);

  if (currentStep === "without-login-cart-summary") {
    return (
      <div className="new-chat-tab">
        <div className="chat-messages">
          <WithoutLoginCartSummary
            goBack={goBack}
            setAllMessages={setAllMessages}
            userId={userId}
            accountTypeId={accountTypeId}
            baseUrl={baseUrl}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="new-chat-tab">
      <div className="chat-messages">
        <div
          className="flex-grow overflow-y-auto px-2 pt-2"
          ref={scrollAreaRef}
        >
          <MessageBubble allMessages={memoizedMessages} />
        </div>
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="chat-input-area overflow-y-auto"
        style={{ "--primary-color": primaryColor }}
      >
        {isCheckingSession ? (
          <div className="flex flex-col items-center justify-center py-10 px-6">
            {/* Animated chat bubble */}
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
              </div>

              {/* Pulsing ring animation */}
              <div className="absolute inset-0 border-4 border-blue-200 rounded-2xl animate-ping opacity-20"></div>
            </div>

            {/* Loading text with typing animation */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center justify-center">
                Loading chat
                <span className="typing-dots ml-1">
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </span>
              </h3>
              <p className="text-sm text-gray-500">
                Checking your session security
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs mt-8">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-progress"></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Verifying</span>
                <span>Securing connection</span>
              </div>
            </div>
          </div>
        ) : currentStep === "initial" || currentStep === "phone-entry" ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {authStep === "buttons" ? (
              <>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Login Required
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Use Google, email OTP, or WhatsApp OTP to continue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Chrome className="h-4 w-4" />
                  {loading ? "Opening Google..." : "Login with Google"}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthStep("email")}
                  className="flex h-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  <Mail className="h-4 w-4" />
                  Login with Email
                </button>
                {/* <button
                  type="button"
                  onClick={() => setAuthStep("phone")}
                  className="flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--primary-color)] bg-[var(--primary-color)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <Phone className="h-4 w-4" />
                  Login with WhatsApp
                </button> */}
              </>
            ) : authStep === "email" ? (
              <>
                <button
                  type="button"
                  onClick={() => setAuthStep("buttons")}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Login with Email
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    We’ll send a one-time code to your email address.
                  </p>
                </div>
                <input
                  autoFocus
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-full border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[var(--primary-color)]"
                  onKeyDown={(e) => e.key === "Enter" && handleSendEmailOtp()}
                />
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={loading}
                  className="flex h-11 items-center justify-center rounded-full bg-[var(--primary-color)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending OTP..." : "Send Email OTP"}
                </button>
              </>
            ) : authStep === "emailOtp" ? (
              <>
                <button
                  type="button"
                  onClick={() => setAuthStep("email")}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Verify Email OTP
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the code sent to {emailAddress || "your email"}.
                  </p>
                </div>
                <input
                  autoFocus
                  type="text"
                  value={emailOtp}
                  onChange={(e) =>
                    setEmailOtp(
                      String(e.target.value || "")
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    )
                  }
                  placeholder="Enter code"
                  className="rounded-full border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[var(--primary-color)]"
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyEmailOtp()}
                />
                <button
                  type="button"
                  onClick={handleVerifyEmailOtp}
                  disabled={loading || !emailOtp.trim()}
                  className="flex h-11 items-center justify-center rounded-full bg-[var(--primary-color)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAuthStep("buttons")}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Login with WhatsApp
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Continue with the current phone number OTP flow.
                  </p>
                </div>
                <div className="phone-input-container">
                  <CountryCodeSelector
                    countryCode={countryCode}
                    onChange={setCountryCode}
                  />
                  <input
                    autoFocus
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const cleanedValue = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(cleanedValue);
                    }}
                    placeholder="Enter phone number"
                    className="phone-input"
                    onKeyPress={(e) => e.key === "Enter" && handlePhoneSubmit()}
                  />
                  <button
                    className="send-button"
                    onClick={handlePhoneSubmit}
                    disabled={!phoneNumber.trim()}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : currentStep === "code-verification" ? (
          <div className="code-input-container">
            <input
              type="text"
              autoFocus
              value={verificationCode}
              onChange={(e) => {
                // Remove any non-digit characters
                const numbersOnly = e.target.value.replace(/\D/g, "");

                // Limit to 4 digits
                const limitedValue = numbersOnly.slice(0, 4);
                setVerificationCode(limitedValue);
              }}
              placeholder="Enter 4-digit code"
              className="code-input"
              onKeyPress={(e) => {
                if (e.key === "Enter" && verificationCode.length === 4) {
                  handleCodeSubmit();
                }
              }}
              maxLength={4}
            />
            <button
              className="send-button"
              onClick={handleCodeSubmit}
              disabled={verificationCode.length !== 4} // Only enable when exactly 4 digits
            >
              <Send size={18} />
            </button>
          </div>
        ) : currentStep === "topic-selection" ? (
          <TopicSelector
            customerAuthData={customerAuthData}
            widgetData={widgetData}
            onTopicSelect={handleTopicSelect}
            simulateTyping={simulateTyping}
            addMessage={addMessage}
            onClose={() => setCurrentStep("chat-active")}
            handleQuickReply={handleQuickReply}
            defaultView={topicSelectionDefaultView}
            viewMode={viewMode}
            paymentIntegrationData={paymentIntegrationData}
            baseUrl={baseUrl}
          />
        ) : currentStep === "direct-buy" ? (
          <DirectBuySummary
            customerAuthData={customerAuthData}
            widgetData={widgetData}
            onTopicSelect={handleTopicSelect}
            simulateTyping={simulateTyping}
            addMessage={addMessage}
            onClose={() => setCurrentStep("chat-active")}
            handleQuickReply={handleQuickReply}
            defaultView={topicSelectionDefaultView}
            paymentIntegrationData={paymentIntegrationData}
          />
        ) : currentStep === "send-enquiry-request" ? (
          <SendEnquiryRequestSummary
            customerAuthData={customerAuthData}
            widgetData={widgetData}
            onTopicSelect={handleTopicSelect}
            simulateTyping={simulateTyping}
            addMessage={addMessage}
            onClose={() => setCurrentStep("chat-active")}
            handleQuickReply={handleQuickReply}
            defaultView={topicSelectionDefaultView}
            onBack={() => setCurrentStep("chat-active")}
          />
        ) : (
          <>
            {orders?.length > 0 && paymentIntegrationData ? (
              <ChatWidgetPayment
                handleCancelOrder={handleCancelOrder}
                paymentIntegrationData={paymentIntegrationData}
                orders={orders}
                widgetData={widgetData}
                customerAuthData={customerAuthData}
                getWebsiteChatWidgetMessages={loadMessages}
                // getWebsiteChatWidgetMessages={getWebsiteChatWidgetMessages}
              />
            ) : (
              ""
            )}
            <div className="flex gap-2">
              {widgetData?.settings?.topics?.length > 0 ? (
                <button onClick={() => setCurrentStep("topic-selection")}>
                  <CiMenuKebab />
                </button>
              ) : null}
              <ChatInput
                handleSendMessage={(
                  type = "text",
                  content,
                  caption,
                  contentType,
                  retryCount,
                ) =>
                  handleSendMessage({
                    type,
                    content,
                    caption,
                    contentType,
                    retryCount,
                  })
                }
                primaryColor={primaryColor}
              />
            </div>
          </>
        )}
      </div>
      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </div>
  );
};

export default NewChatTab;
