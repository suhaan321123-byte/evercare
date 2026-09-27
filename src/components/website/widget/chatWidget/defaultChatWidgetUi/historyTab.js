import React, { useCallback, useEffect, useState } from "react";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { getChatWidgetSideGetOrdersApi } from "@/api/chatWidget/chatWidgetApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OrderDetails from "./orderDetails/orderDetails";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const statusConfig = {
  Active: { icon: Clock, label: "Active", variant: "warning" },
  Completed: { icon: CheckCircle, label: "Completed", variant: "success" },
  Draft: { icon: AlertCircle, label: "Draft", variant: "secondary" },
  Cancelled: { icon: XCircle, label: "Cancelled", variant: "destructive" },
  Processing: { icon: Package, label: "Processing", variant: "info" },
  Shipped: { icon: Package, label: "Shipped", variant: "info" },
  Delivered: { icon: CheckCircle, label: "Delivered", variant: "success" },
};

const statusIcons = {
  Active: <Clock size={14} className="text-blue-500" />,
  Completed: <CheckCircle size={14} className="text-green-500" />,
  Draft: <AlertCircle size={14} className="text-yellow-500" />,
  Cancelled: <XCircle size={14} className="text-red-500" />,
  Processing: <Package size={14} className="text-purple-500" />,
  Shipped: <Package size={14} className="text-indigo-500" />,
  Delivered: <CheckCircle size={14} className="text-emerald-500" />,
};

const HistoryTab = ({ primaryColor = "#3B82F6", login }) => {
    const {
      session: customerAuthData,
    } = useCustomerAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdDate");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const onOrderClick = (order) => {
    setSelectedOrder(order);
  };

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateProgress = (order) => {
    return order.progress || 0;
  };

  const getPaymentStatus = (order) => {
    if (!order.paymentMilestones?.length) return "No payments";

    const paidCount = order.paymentMilestones.filter(
      (m) => m.status === "Paid"
    ).length;
    const totalCount = order.paymentMilestones.length;

    return `${paidCount}/${totalCount} paid`;
  };

  const getRefundStatus = (order) => {
    if (!order.paymentMilestones?.length) return null;

    const totalRefunded = order.paymentMilestones.reduce(
      (sum, m) => sum + (m.totalRefunded || 0),
      0
    );
    const totalPaid = order.paymentMilestones.reduce(
      (sum, m) => (m.status === "Paid" ? sum + m.amount : sum),
      0
    );

    if (totalRefunded === 0) return null;
    if (totalRefunded >= totalPaid) return "Fully Refunded";
    return "Partially Refunded";
  };

  const hasRefunds = (order) => {
    if (!order.paymentMilestones?.length) return false;
    return order.paymentMilestones.some(
      (milestone) => milestone.refunds && milestone.refunds.length > 0
    );
  };

  const getTotalRefundedAmount = (order) => {
    if (!order.paymentMilestones?.length) return 0;
    return order.paymentMilestones.reduce(
      (sum, m) => sum + (m.totalRefunded || 0),
      0
    );
  };

  const getChatWidgetSideGetOrders = useCallback(async () => {
    if (!customerAuthData?.customerId || !login) {
      setIsInitialLoading(false);
      return;
    }
    try {
      const filterData = {
        customerId: customerAuthData?.customerId,
        page: page,
        search: searchTerm,
        sortBy: sortBy,
        statusFilter: statusFilter !== "all" ? statusFilter : undefined,
      };
      const response = await getChatWidgetSideGetOrdersApi(filterData);
      if (response?.message === "success") {
        setOrders(response?.orders || []);
        setTotalPages(response?.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [
    page,
    searchTerm,
    statusFilter,
    sortBy,
    customerAuthData?.customerId,
    login,
  ]);

  useEffect(() => {
    getChatWidgetSideGetOrders();
  }, [getChatWidgetSideGetOrders]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, sortBy]);

  return selectedOrder ? (
    <OrderDetails
      orderId={selectedOrder?._id}
      customerAuthData={customerAuthData}
      onClose={() => setSelectedOrder(null)}
    />
  ) : (
    <div className="history-tab p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-y-auto">
      {/* Search and Filters */}
      {login && (
        <div className="mb-3">
          <div className="relative mb-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex items-center text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <Filter className="h-3 w-3 mr-1" />
            Filters{" "}
            {isFiltersOpen ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>

          {isFiltersOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="createdDate">Sort by Date</option>
                <option value="finalAmount">Sort by Amount</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-2">
        {!login ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 min-h-56 flex flex-col justify-center items-center">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm">You are not logged in</p>
          </div>
        ) : isInitialLoading ? (
          // Loading skeleton
          [...Array(3)].map((_, index) => (
            <div
              key={index}
              className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-3"
            >
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
              <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-full mb-1"></div>
              <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          orders.map((order) => {
            const progress = calculateProgress(order);
            const statusInfo =
              statusConfig[order?.status] || statusConfig.Draft;
            const refundStatus = getRefundStatus(order);
            const hasRefund = hasRefunds(order);
            const totalRefunded = getTotalRefundedAmount(order);

            return (
              <Card
                key={order._id}
                className="p-4 cursor-pointer transition-all hover:shadow-elevated active:scale-[0.98] border border-gray-200 dark:border-gray-700"
                style={{ boxShadow: "var(--shadow-card)" }}
                onClick={() => onOrderClick?.(order)}
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground dark:text-white text-sm">
                      {order.orderId}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1 line-clamp-1">
                      {order.title}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400 whitespace-nowrap">
                    {formatDate(order.createdDate)}
                  </p>
                </div>

                {/* Order Details */}
                <div className="mb-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">
                      Amount:
                    </span>
                    <span className="font-semibold text-foreground dark:text-white">
                      {formatCurrency(order.finalAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">
                      Payments:
                    </span>
                    <span className="font-medium">
                      {getPaymentStatus(order)}
                    </span>
                  </div>

                  {/* Refund Status */}
                  {refundStatus && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground dark:text-gray-400">
                        Refund:
                      </span>
                      <span
                        className={`font-medium ${
                          refundStatus === "Fully Refunded"
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {refundStatus}
                      </span>
                    </div>
                  )}

                  {/* Show total refunded amount if any */}
                  {totalRefunded > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground dark:text-gray-400">
                        Refunded:
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(totalRefunded)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {progress > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center text-xs text-muted-foreground dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300 bg-blue-500 dark:bg-blue-400"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Order Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusInfo.variant}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span className="text-xs">
                        {statusIcons[order.status]}
                      </span>
                      {statusInfo.label}
                    </Badge>

                    {/* Refund Badge */}
                    {refundStatus && (
                      <Badge
                        variant={
                          refundStatus === "Fully Refunded"
                            ? "default"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {refundStatus === "Fully Refunded"
                          ? "💸 Refunded"
                          : "↩️ Partial Refund"}
                      </Badge>
                    )}

                    {/* Simple refund indicator */}
                    {hasRefund && !refundStatus && (
                      <Badge variant="outline" className="text-xs">
                        ↩️ Refund Processed
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground dark:text-white text-sm">
                      {formatCurrency(order.finalAmount)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!isInitialLoading && orders.length > 0 && totalPages > 1 && (
        <div className="mt-3 flex justify-between items-center text-xs">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded ${
              page === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
            }`}
          >
            Previous
          </button>
          <span className="text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded ${
              page === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
