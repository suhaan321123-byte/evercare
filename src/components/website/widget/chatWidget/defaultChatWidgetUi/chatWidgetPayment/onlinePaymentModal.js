import { websiteChatWidgetVerifyPaymentApi, websiteChatWidInitPaymentSessionApi } from "@/api/chatWidget/chatWidgetApi";
import { money } from "@/lib/pricing";
import { CreditCard, Loader, X, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

const getPaymentAmount = (order) => {
  if (order?.paymentMilestones?.length > 0) {
    return (
      order?.paymentMilestones?.find((p) => p.status === "Pending")?.amount || 0
    );
  }
  return order?.finalAmount;
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const OnlinePaymentModal = ({
  paymentIntegrationData,
  orders,
  setShowPaymentModal,
  customerAuthData,
  widgetData,
  getWebsiteChatWidgetMessages
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("initial"); // 'initial', 'processing', 'redirecting', 'success', 'failed'
  const [error, setError] = useState(null);

  // Initialize payment when modal opens
  useEffect(() => {
    if (paymentIntegrationData?.type === "online") {
      initializePayment();
    }
  }, []);

  const initializePayment = async () => {
    setIsLoading(true);
    setPaymentStatus("processing");
    setError(null);
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      console.error("Razorpay SDK failed to load");
      setIsLoading(false);
      setPaymentStatus("failed");
      return;
    }

    try {
      const values = {
        gatewayId: widgetData?.settings?.payment?.selectedGatewayId,
        customerId: customerAuthData.customerId,
        subdomain: window.location.hostname,
        orderId: orders?.[0]?._id,
      };
      const response = await websiteChatWidInitPaymentSessionApi(values);
      if (response?.message !== "success") {
        throw new Error(response.message || "Payment initialization failed");
      }

      // razorpay
      const optionsData = response?.data;
      const options = {
        key: optionsData.keyId, // razorpay key_id
        amount: optionsData.amount,
        currency: optionsData.currency,
        name: optionsData?.businessName || "",
        order_id: optionsData.order_id,
        handler: async function (response) {

          try {
            // ✅ Verify payment with your backend
            const verifyResponse = await websiteChatWidgetVerifyPaymentApi({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              paymentAttemptId: optionsData.paymentAttemptId,
            });
      
            if (verifyResponse?.message == "success") {
              // ✅ Payment verified successfully
              setShowPaymentModal(false);
              getWebsiteChatWidgetMessages?.();
            } else {
              // ❌ Payment verification failed
              setPaymentStatus("failed");
              setError(verifyResponse.message || "Error verifying payment. Please check your payment status.");
              console.error("Verification failed:", verification.message);
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            setPaymentStatus("failed");
            setError(error.message || "Error verifying payment. Please check your payment status.");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment initialization error:", error);
      setError(error.message);
      setPaymentStatus("failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowPaymentModal(false);
  };

  const amount = getPaymentAmount(orders?.[0]) || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {paymentStatus === "failed" ? "Payment Failed" : "Secure Payment"}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center py-6">
          {/* Loading State */}
          {isLoading && paymentStatus === "processing" && (
            <>
              <Loader
                size={48}
                className="animate-spin text-blue-600 mx-auto mb-3"
              />
              <p className="text-gray-600">Initializing payment...</p>
              <p className="text-sm text-gray-500 mt-2">
                Setting up secure connection with {paymentIntegrationData?.name}
              </p>
            </>
          )}

          {/* Redirecting State */}
          {paymentStatus === "redirecting" && (
            <>
              <ExternalLink size={48} className="text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600 mb-3">
                Redirecting to payment gateway...
              </p>
              <p className="text-sm text-gray-500 mb-4">
                You will be redirected to {paymentIntegrationData?.name} to
                complete your payment securely.
              </p>
            </>
          )}

          {/* Error State */}
          {paymentStatus === "failed" && (
            <>
              <X size={48} className="text-red-600 mx-auto mb-3" />
              <p className="text-gray-600 mb-3">
                Payment initialization failed
              </p>
              <p className="text-sm text-red-500 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={initializePayment}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Initial State (Fallback) */}
          {paymentStatus === "initial" && (
            <>
              <CreditCard size={48} className="text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                You will be redirected to a secure payment gateway
              </p>
              <p className="text-sm text-gray-500">
                Amount: {money(amount || 0)}
              </p>
            </>
          )}
        </div>

        {/* Payment Gateway Info */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Payment Gateway:</span>
            <span className="font-medium capitalize">
              {paymentIntegrationData?.name}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
            <span>Amount:</span>
            <span className="font-medium">{money(amount || 0)}</span>
          </div>
          {paymentIntegrationData?.config?.testMode && (
            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-2">
              ⚠️ Test Mode: Using test credentials
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlinePaymentModal;
