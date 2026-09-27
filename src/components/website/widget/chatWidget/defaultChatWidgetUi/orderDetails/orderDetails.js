import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  RefreshCw,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getChatWidgetSideOrderDetailsApi,
  getPaymentIntegrationDataInChatWidgetApi,
  websiteChatWidgetCancelOrderRequestApi,
  websiteChatWidgetSendMessageApi,
} from "@/api/chatWidget/chatWidgetApi";
import { formatDateToDDMMYYYY } from "@/utils/dateUtils/dateUtils";
import AlertModal from "@/components/ui/modal/alertModal";
import OnlinePaymentModal from "../chatWidgetPayment/onlinePaymentModal";
import ManualPaymentModal from "../chatWidgetPayment/manualPaymentModal";
import { money } from "@/lib/pricing";

const statusConfig = {
  Active: {
    icon: Clock,
    label: "Active",
    variant: "default",
    color: "text-blue-500",
  },
  Completed: {
    icon: CheckCircle,
    label: "Completed",
    variant: "success",
    color: "text-green-500",
  },
  Cancelled: {
    icon: XCircle,
    label: "Cancelled",
    variant: "destructive",
    color: "text-red-500",
  },
  Processing: {
    icon: RefreshCw,
    label: "Processing",
    variant: "secondary",
    color: "text-purple-500",
  },
  Shipped: {
    icon: Truck,
    label: "Shipped",
    variant: "default",
    color: "text-orange-500",
  },
  Delivered: {
    icon: CheckCircle,
    label: "Delivered",
    variant: "success",
    color: "text-green-500",
  },
};

const getNextPayment = (order) => {
  if (order?.status === "Cancelled") {
    return null;
  }
  if (order?.paymentMilestones?.length > 0) {
    return order?.paymentMilestones?.find((p) => p.status === "Pending");
  }
  return null;
};

const OrderDetails = ({ onClose, orderId, customerAuthData }) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentIntegrationData, setPaymentIntegrationData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

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

  const handleQuickReply = async (messageContent) => {
    try {
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
        await websiteChatWidgetSendMessageApi(values);
      }
    } catch (error) {
      console.error("Error handling quick reply:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const getPaymentIntegrationData = useCallback(async () => {
    if (!customerAuthData?.customerId) return;
    try {
      const response = await getPaymentIntegrationDataInChatWidgetApi({
        customerId: customerAuthData.customerId,
        subdomain: window.location.hostname,
      });
      if (response?.message === "success" && response?.data) {
        setPaymentIntegrationData(response?.data);
      }
    } catch (error) {
      console.error("Error getting payment integration data:", error);
    }
  }, [customerAuthData?.customerId]);

  useEffect(() => {
    getPaymentIntegrationData();
  }, [getPaymentIntegrationData]);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    if (!customerAuthData?.customerId) return;
    setLoading(true);
    try {
      const response = await getChatWidgetSideOrderDetailsApi({
        orderId,
        customerId: customerAuthData?.customerId,
      });
      if (response?.message == "success" && response?.orderDetails) {
        setOrder(response?.orderDetails || {});
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      // toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }, [orderId, customerAuthData?.customerId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const canCancel =
    order?.status === "Active" || order?.status === "Processing";

  const handleCancelOrder = async () => {
    if (!customerAuthData?.customerId) return;
    if (!order) return;
    if (order?.userCancellationRequests?.length > 0) {
      setSnackbar({
        open: true,
        message:
          "You have already submitted a cancellation request for this order.",
        severity: "error",
      });
      setShowCancelDialog(false);
      return;
    }
    try {
      const response = await websiteChatWidgetCancelOrderRequestApi({
        mode: order.mode,
        orderId: order?._id,
        customerId: customerAuthData?.customerId,
      });

      if (response?.message == "success") {
        fetchOrderDetails();
        setShowCancelDialog(false);
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

      const quickReply = `
<div class="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-200 shadow-sm">
  <div class="text-red-600 dark:text-red-400 text-lg flex-shrink-0">❌</div>
  <div class="flex flex-col">
    <span class="font-semibold text-red-700 dark:text-red-300 mb-1">Request Failed</span>
    <span class="text-red-700 dark:text-red-300">Failed to submit cancellation request. Please try again or contact support.</span>
  </div>
</div>
    `;

      setTimeout(() => {
        handleQuickReply(quickReply);
      }, 1000);
    }
  };

  // Calculate GST for workflow orders
  const calculateWorkflowOrderGST = (order) => {
    if (order?.mode === "Workflow Order") {
      const subtotal = order?.subtotal || 0;
      const gstPercentage = order?.gstPercentage || 0;
      return (subtotal * gstPercentage) / 100;
    }
    return order?.totalGst || 0;
  };

  // Calculate final amount for workflow orders
  const calculateWorkflowFinalAmount = (order) => {
    if (order?.mode === "Workflow Order") {
      const subtotal = order?.subtotal || 0;
      const gstAmount = calculateWorkflowOrderGST(order);
      const shippingCost = order?.shippingCost || 0;
      return subtotal + gstAmount + shippingCost;
    }
    return order?.finalAmount || 0;
  };
  const paymentDetails = getNextPayment(order);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card className="p-6 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading order details...</p>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">
            {`The order you're looking for doesn't exist.`}
          </p>
          <Button onClick={onClose}>Back to Orders</Button>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[order?.status] || statusConfig.Active;
  const StatusIcon = statusInfo.icon;
  const isStandardOrder = order?.mode === "Standard Order";
  const isWorkflowOrder = order?.mode === "Workflow Order";

  const gstAmount = calculateWorkflowOrderGST(order);
  const finalAmount = calculateWorkflowFinalAmount(order);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100"
            onClick={onClose}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Order Details</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">{order?.orderId}</p>
            </div>
          </div>
          <Badge
            variant={statusInfo.variant}
            className="flex items-center gap-1.5"
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {/* Order Items */}
          <Card className="p-6 border border-gray-200">
            <h2 className="font-semibold text-lg mb-4 text-gray-900">
              Items ({order?.items?.length || 0})
            </h2>

            <div className="space-y-4">
              {order?.items?.map((item, index) => {
                const quantity = item?.quantity || 1;

                // Standard Order calculations
                if (isStandardOrder) {
                  const basePrice = item?.basePrice || 0;
                  const salePrice = item?.salePrice || item?.amount || 0;
                  const netAmount = salePrice * quantity;
                  const discount = basePrice - salePrice;
                  const discountPercent =
                    basePrice > 0
                      ? Math.round((discount / basePrice) * 100)
                      : 0;
                  const totalDiscount = basePrice * quantity - netAmount;
                  const gstAmount =
                    (netAmount * (item?.gstPercentage || 0)) / 100;
                  const totalAmount = netAmount + gstAmount;

                  return (
                    <div
                      key={item?.itemId || index}
                      className="py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex gap-3 mb-2">
                        <div className="h-12 w-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {item?.image ? (
                            <img
                              src={item?.image}
                              alt={item?.description}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item?.description || item?.itemId || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm ml-15">
                        <div>
                          <p className="text-gray-600">
                            Quantity: {quantity} {item?.quantityUnit || "pcs"}
                          </p>
                          {basePrice > 0 && (
                            <p className="text-gray-400 line-through mt-1">
                              Original: {money(basePrice)}
                            </p>
                          )}
                          <p className="text-gray-900 font-medium mt-1">
                            Sale Price: {money(salePrice)}
                          </p>
                        </div>

                        <div className="text-right">
                          {totalDiscount > 0 && (
                            <p className="text-red-600">
                              Discount: -{money(totalDiscount)}
                              {discountPercent > 0 && ` (${discountPercent}%)`}
                            </p>
                          )}
                          <p className="text-gray-900 mt-1">
                            Net: {money(netAmount)}
                          </p>
                          <p className="text-gray-600 mt-1">
                            GST ({item?.gstPercentage || 0}%):{" "}
                            {money(gstAmount)}
                          </p>
                          <p className="font-semibold text-gray-900 mt-2">
                            Total: {money(totalAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Workflow Order calculations (simpler)
                if (isWorkflowOrder) {
                  const rate = item?.rate || item?.amount || 0;
                  const total = rate * quantity;

                  return (
                    <div
                      key={item?.itemId || index}
                      className="py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex gap-3 mb-2">
                        <div className="h-12 w-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {item?.image ? (
                            <img
                              src={item?.image}
                              alt={item?.description}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item?.description || item?.itemId || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm ml-15">
                        <div>
                          <p className="text-gray-600">
                            Quantity: {quantity} {item?.quantityUnit || "pcs"}
                          </p>
                          <p className="text-gray-900 font-medium mt-1">
                            Rate: {money(rate)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-gray-900 mt-2">
                            Total: {money(total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Fallback for unknown modes
                return (
                  <div
                    key={item?.itemId || index}
                    className="py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex gap-3">
                      <div className="h-12 w-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        <Package className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item?.description || item?.itemId || "N/A"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {quantity} {item?.quantityUnit || "pcs"} ×{" "}
                          {money(item?.amount || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {money((item?.amount || 0) * quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">
                Order Summary
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sub Total:</span>
                  <span className="text-gray-900">
                    {money(order?.subtotal || 0)}
                  </span>
                </div>

                {/* Standard Order Specific Fields */}
                {isStandardOrder && order?.totalDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Total Discount:</span>
                    <span>-{money(order?.totalDiscount || 0)}</span>
                  </div>
                )}

                {isStandardOrder && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Amount:</span>
                    <span className="text-gray-900">
                      {money(order?.afterDiscount || 0)}
                    </span>
                  </div>
                )}

                {/* GST Calculation */}
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {isWorkflowOrder
                      ? `GST (${order?.gstPercentage || 0}%)`
                      : "Total GST"}
                    :
                  </span>
                  <span className="text-gray-900">
                    {money(
                      isWorkflowOrder ? gstAmount : order?.totalGst || 0
                    )}
                  </span>
                </div>

                {order?.shippingCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping Cost:</span>
                    <span className="text-gray-900">
                      {money(order?.shippingCost || 0)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-base font-semibold mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-900">Grand Total:</span>
                  <span className="text-gray-900">
                    {money(
                      isWorkflowOrder ? finalAmount : order?.finalAmount || 0
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Shipping Address */}
          {order?.shippingDetails?.[0]?.shipToAddress && (
            <Card className="p-6 border border-gray-200">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-gray-900">
                <MapPin className="h-5 w-5 text-red-500" />
                Shipping Address
              </h2>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-900">
                  {order?.shippingDetails[0].shipToAddress?.name}
                </p>
                <p className="text-gray-600">
                  {order?.shippingDetails[0].shipToAddress?.addressLine1}
                </p>
                <p className="text-gray-600">
                  {order?.shippingDetails[0].shipToAddress?.city},{" "}
                  {order?.shippingDetails[0].shipToAddress?.state}
                </p>
                <p className="text-gray-600">
                  {order?.shippingDetails[0].shipToAddress?.pincode}
                </p>
                <div className="flex items-center gap-2 mt-3 text-gray-600">
                  <span>{order?.shippingDetails[0].shipToAddress?.phone}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  {order?.shippingDetails[0].weight && (
                    <span className="text-gray-600">
                      Weight: {order?.shippingDetails[0].weight}g
                    </span>
                  )}
                  {order?.shippingDetails[0].dimensions && (
                    <span className="text-gray-600">
                      Dimensions: {order?.shippingDetails[0].dimensions.length}×
                      {order?.shippingDetails[0].dimensions.width}×
                      {order?.shippingDetails[0].dimensions.height}cm
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Payment Milestones */}
          {order?.paymentMilestones?.length > 0 && (
            <Card className="p-6 border border-gray-200">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-gray-900">
                <CreditCard className="h-5 w-5 text-green-500" />
                Payment Details
              </h2>
              <div className="space-y-3">
                {order?.paymentMilestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {milestone.label}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {formatDateToDDMMYYYY(milestone.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {money(milestone.amount)}
                        </p>
                        <Badge
                          variant={
                            milestone.status === "Paid"
                              ? "success"
                              : milestone.status === "Cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {milestone.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Refund Information */}
                    {milestone.totalRefunded > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-red-700">Refunded:</span>
                          <span className="font-semibold text-red-700">
                            {money(milestone.totalRefunded)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Refund History */}
                    {milestone.refunds?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">
                          Refund History:
                        </p>
                        {milestone.refunds.map((refund, rIndex) => (
                          <div
                            key={rIndex}
                            className="text-xs text-gray-600 flex justify-between"
                          >
                            <span>
                              {money(refund.refundAmount)} -{" "}
                              {refund.reason}
                            </span>
                            <span>
                              {new Date(refund.refundDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        {order?.userCancellationRequests?.length >
        0 ? null : (paymentIntegrationData && paymentDetails) || canCancel ? (
          <div className="flex gap-2 w-full bg-white sticky bottom-0  p-4">
            {paymentIntegrationData && paymentDetails && (
              <button
                onClick={() => handlePayButtonClick(order)}
                className="w-full flex-1 flex items-center justify-center gap-1 bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard size={14} />
                Pay
              </button>
            )}

            {/* Cancel Order Button */}
            {canCancel && (
              <button
                className="w-full flex-1 flex items-center justify-center gap-1 bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel Order
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Cancel Order Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Cancel Order</h3>
            <p className="text-gray-600 mb-4">
              {`Your order cancellation and refund depend on the current order
              status. The seller may decline your cancellation request if the
              order is already processed or out for delivery. This order may or
              may not be refundable based on the seller’s policy. Please
              communicate with the seller before requesting a refund to avoid
              delays or misunderstandings.`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCancelDialog(false)}
              >
                Keep Order
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancelOrder}
              >
                Cancel Order
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showPaymentModal &&
        (paymentIntegrationData?.type === "manual" ? (
          <ManualPaymentModal
            paymentIntegrationData={paymentIntegrationData}
            orders={[order]}
            setShowPaymentModal={setShowPaymentModal}
          />
        ) : (
          <OnlinePaymentModal
            paymentIntegrationData={paymentIntegrationData}
            orders={[order]}
            setShowPaymentModal={setShowPaymentModal}
            customerAuthData={customerAuthData}
            widgetData={{
              settings: {
                payment: { selectedGatewayId: paymentIntegrationData?._id },
              },
            }}
            getWebsiteChatWidgetMessages={fetchOrderDetails}
          />
        ))}

      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </div>
  );
};

export default OrderDetails;
