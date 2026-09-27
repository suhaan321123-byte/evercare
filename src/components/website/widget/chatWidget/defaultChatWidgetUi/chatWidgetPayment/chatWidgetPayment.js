// components/ChatWidgetPayment.jsx
import React, { useState } from "react";
import { CreditCard, X, Loader } from "lucide-react";
import AlertModal from "@/components/ui/modal/alertModal";
import ManualPaymentModal from "./manualPaymentModal";
import OnlinePaymentModal from "./onlinePaymentModal";

const getNextPayment = (order) => {
  if (order?.paymentMilestones?.length > 0) {
    return order?.paymentMilestones?.find((p) => p.status === "Pending");
  }
  return null;
};

const ChatWidgetPayment = ({
  widgetData,
  orders,
  paymentIntegrationData,
  handleCancelOrder,
  isLoading = false,
  customerAuthData,
  getWebsiteChatWidgetMessages,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);

  const handleCancelClick = (order) => {
    setOrderToCancel(order);
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    if (orderToCancel) {
      handleCancelOrder?.(orderToCancel);
    }
    setShowCancelConfirm(false);
    setOrderToCancel(null);
  };

  const handleCloseCancelConfirm = () => {
    setShowCancelConfirm(false);
    setOrderToCancel(null);
  };

  const handlePayButtonClick = (order) => {
    if (!paymentIntegrationData) {
      setSnackbar({
        open: true,
        message: "Payment gateway not configured properly",
        severity: "error",
      });
      return;
    }
    setShowPaymentModal(true);
  };

  const paymentDetails = getNextPayment(orders[0]);

  // Cancel Confirmation Modal
  const CancelConfirmationModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-sm w-full p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cancel Order?
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel order{" "}
              <span className="font-medium">#{orderToCancel?.orderId}</span>?
              This action cannot be undone.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCloseCancelConfirm}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Go Back
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Cancelling..." : "Yes, Cancel"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (
    !paymentIntegrationData ||
    !orders?.[0] ||
    orders[0]?.status === "Cancelled" ||
    !paymentDetails || orders[0]?.userCancellationRequests?.length > 0
  ) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-xs mb-3">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="font-medium text-gray-900 text-sm block">
              #{orders[0]?.orderId || "N/A"}
            </span>
            <span className="text-xs text-gray-500">
              {orders[0]?.items?.length || 0} item
              {orders[0]?.items?.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="font-bold text-gray-900">
            {money(paymentDetails?.amount || 0)}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handlePayButtonClick(orders[0])}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <CreditCard size={14} />
            )}
            {isLoading ? "Processing" : "Pay"}
          </button>
          <button
            onClick={() => handleCancelClick?.(orders[0])}
            // onClick={() => handleCancelOrder?.(orders[0])}
            disabled={isLoading}
            className="px-3 bg-gray-100 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal &&
        (paymentIntegrationData?.type === "manual" ? (
          <ManualPaymentModal
            paymentIntegrationData={paymentIntegrationData}
            orders={orders}
            setShowPaymentModal={setShowPaymentModal}
          />
        ) : (
          <OnlinePaymentModal
            paymentIntegrationData={paymentIntegrationData}
            orders={orders}
            setShowPaymentModal={setShowPaymentModal}
            customerAuthData={customerAuthData}
            widgetData={widgetData}
            getWebsiteChatWidgetMessages={getWebsiteChatWidgetMessages}
          />
        ))}

      {showCancelConfirm && <CancelConfirmationModal />}

      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </>
  );
};

export default ChatWidgetPayment;
