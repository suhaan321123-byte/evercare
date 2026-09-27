import AlertModal from "@/components/ui/modal/alertModal";
import { Check, Copy, CreditCard, ExternalLink, QrCode, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

const getPaymentAmount = (order) => {
  if (order?.paymentMilestones?.length > 0) {
    return order?.paymentMilestones?.find((p) => p.status === "Pending")?.amount || 0;
  }
  return order?.finalAmount;
}

const ManualPaymentModal = ({
  paymentIntegrationData,
  orders,
  setShowPaymentModal,
}) => {
  const manualDetails = paymentIntegrationData?.manualDetails || {};
  const amount = getPaymentAmount(orders?.[0]) || 0;
  const [copiedField, setCopiedField] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const availableMethods = [
    {
      key: "qrCode",
      condition: manualDetails?.qrCode,
      label: "Scan QR Code",
      description: "Scan with any UPI app",
      icon: "qrCode",
    },
    {
      key: "upi",
      condition: manualDetails?.upiId,
      label: "UPI Payment",
      description: "Pay using UPI ID",
      icon: "upi",
    },
    {
      key: "phone",
      condition: manualDetails?.phoneNumber,
      label: "Phone Payment",
      description: "Use PhonePe, PayTM, etc.",
      icon: "phone",
    },
  ].filter((method) => method.condition);

  // Auto-select first available method
  useEffect(() => {
    if (availableMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(availableMethods[0].key);
    }
  }, [availableMethods, selectedMethod]);

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "qrCode":
        return <QrCode size={20} className="text-blue-600" />;
      case "upi":
        return <Smartphone size={20} className="text-purple-600" />;
      case "phone":
        return <Smartphone size={20} className="text-green-600" />;
      default:
        return <CreditCard size={20} className="text-gray-600" />;
    }
  };

    const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setSnackbar({
        open: true,
        message: "Failed to copy to clipboard",
        severity: "error",
      });
    }
  };

  const openUpiApp = (upiId, amount) => {
    if (!upiId) {
      setSnackbar({
        open: true,
        message: "UPI ID not available",
        severity: "error",
      });
      return;
    }

    const upiUrl = `upi://pay?pa=${upiId}&am=${amount}&pn=Merchant&cu=INR`;
    window.open(upiUrl, "_blank");
  };

  const handleScreenshotShare = () => {
    setSnackbar({
      open: true,
      message: "Please share the payment screenshot in the chat below",
      severity: "info",
    });
    setShowPaymentModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white dark:bg-gray-800 w-full max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Complete Payment
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Choose your payment method
              </p>
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Payment Amount */}
          <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Total Amount
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {money(amount)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Order #{orders?.[0]?.orderId || "N/A"}
              </p>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              Select Payment Method
            </h4>

            {availableMethods.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard size={48} className="text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No payment methods available
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Please contact support for payment details
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableMethods.map((method) => (
                  <div
                    key={method.key}
                    onClick={() => setSelectedMethod(method.key)}
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedMethod === method.key
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg ${
                        selectedMethod === method.key
                          ? "bg-blue-100 dark:bg-blue-800"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}
                    >
                      {getPaymentMethodIcon(method.icon)}
                    </div>

                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 dark:text-white">
                        {method.label}
                      </h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {method.description}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === method.key
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-500"
                      }`}
                    >
                      {selectedMethod === method.key && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Method Details */}
            {selectedMethod && availableMethods.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                {/* QR Code Details */}

                {selectedMethod === "qrCode" && manualDetails?.qrCode && (
                  <div className="text-center">
                    <div className="flex items-center gap-2 mb-4 justify-center">
                      {getPaymentMethodIcon("qrCode")}
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Scan QR Code
                      </h4>
                    </div>
                    <img
                      src={manualDetails.qrCode}
                      alt="UPI QR Code"
                      className="w-48 h-48 mx-auto border-2 border-gray-200 dark:border-gray-600 rounded-lg shadow-sm"
                      loading="lazy"
                    />
                    {manualDetails.qrCodeAccountName && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Account Holder
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                          {manualDetails.qrCodeAccountName}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                      Open any UPI app and scan the QR code to pay
                    </p>
                  </div>
                )}

                {/* UPI ID Details */}
                {selectedMethod === "upi" && manualDetails?.upiId && (
                  <div className="space-y-4">
                    {/* Header with Account Name */}
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon("upi")}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          UPI Payment
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Account Information Card */}
                      <div className="bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500 p-4 space-y-3">
                        {/* Account Holder Name */}
                        {manualDetails.upiAccountName && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                              Account Holder Name
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {manualDetails.upiAccountName}
                            </p>
                          </div>
                        )}

                        {/* UPI ID */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                            UPI ID
                          </p>
                          <div className="flex items-center justify-between">
                            <code className="font-mono text-sm break-all text-gray-900 dark:text-white flex-1">
                              {manualDetails.upiId}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(manualDetails.upiId, "upi")
                              }
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 rounded transition-colors flex-shrink-0 ml-2"
                              title="Copy UPI ID"
                            >
                              {copiedField === "upi" ? (
                                <Check size={16} className="text-green-600" />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Open UPI App Button */}
                      <button
                        onClick={() => openUpiApp(manualDetails.upiId, amount)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        <ExternalLink size={16} />
                        Open UPI App
                      </button>
                    </div>
                  </div>
                )}

                {/* Phone Number Details */}
                {selectedMethod === "phone" && manualDetails?.phoneNumber && (
                  <div className="space-y-4">
                    {/* Header with Account Name */}
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon("phone")}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Phone Payment
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Account Information Card */}
                      <div className="bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500 p-4 space-y-3">
                        {/* Account Holder Name */}
                        {manualDetails.phoneNumberAccountName && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                              Account Holder Name
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {manualDetails.phoneNumberAccountName}
                            </p>
                          </div>
                        )}

                        {/* Phone Number */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                            Phone Number
                          </p>
                          <div className="flex items-center justify-between">
                            <code className="font-mono text-sm break-all text-gray-900 dark:text-white flex-1">
                              {manualDetails.phoneNumber}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  manualDetails.phoneNumber,
                                  "phone"
                                )
                              }
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 rounded transition-colors flex-shrink-0 ml-2"
                              title="Copy Phone Number"
                            >
                              {copiedField === "phone" ? (
                                <Check size={16} className="text-green-600" />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Use this number in PhonePe, PayTM, Google Pay, or any
                        UPI app
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Share2
                  size={18}
                  className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Important: Share Payment Proof
                  </p>
                  <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    <p>• Complete payment using selected method</p>
                    <p>• Take screenshot of successful payment</p>
                    <p>• Share it in the chat below for confirmation</p>
                    <p className="font-semibold pt-1">
                      Do not pay again - wait for provider confirmation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="p-3">
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleScreenshotShare}
                disabled={!selectedMethod}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {"I've Made Payment"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </div>
  );
};

export default ManualPaymentModal;
