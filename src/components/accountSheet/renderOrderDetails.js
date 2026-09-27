// components/RenderOrderDetails.jsx

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Star,
  Edit,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
} from "lucide-react";
import {
  addCatalogueProductReviewsApi,
  deleteCatalogueProductReviewApi,
  updateCatalogueProductReviewApi,
} from "@/api/chatWidget/chatWidgetApi";
import { useToast } from "@/hooks/use-toast";
import { ACCOUNT_TYPE_ID } from "@/services/catalogues";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getErrorMessage = (err) =>
  err instanceof Error ? err.message : "Please try again";

const money = (value) =>
  typeof value === "number" && isFinite(value)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(value)
    : "—";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getOrderItemTaxedPrices = (item) => {
  const quantity = Math.max(1, Number(item?.quantity || 1) || 1);
  const saleLine = Number.isFinite(Number(item?.amount))
    ? Number(item.amount)
    : (Number(item?.salePrice || 0) || 0) * quantity;
  const baseUnit = Number(item?.basePrice ?? item?.salePrice ?? 0) || 0;
  const saleUnit = Number(item?.salePrice ?? item?.basePrice ?? 0) || 0;
  const baseLine = baseUnit * quantity;
  const taxRate = Number(item?.gstPercentage || 0) || 0;
  const savedTax = Number(item?.gstAmount);
  const saleTax =
    taxRate > 0
      ? (saleLine * taxRate) / 100
      : Number.isFinite(savedTax)
        ? savedTax
        : 0;
  const hasDiscount = baseUnit > saleUnit + 0.009;
  const baseTax = hasDiscount ? (baseLine * taxRate) / 100 : saleTax;
  const saleWithTax = roundMoney(saleLine + saleTax);
  const baseWithTax = roundMoney(baseLine + baseTax);

  return {
    saleLine,
    baseLine,
    saleTax,
    saleWithTax,
    baseWithTax,
    hasDiscount,
  };
};

const getOrderTaxedSummary = (items) => {
  const itemList = Array.isArray(items) ? items : [];
  return itemList.reduce(
    (summary, item) => {
      const pricedItem = getOrderItemTaxedPrices(item);
      summary.subtotal += pricedItem.baseWithTax;
      summary.saleSubtotal += pricedItem.saleWithTax;
      summary.itemDiscount += pricedItem.hasDiscount
        ? Math.max(0, pricedItem.baseWithTax - pricedItem.saleWithTax)
        : 0;
      return summary;
    },
    { subtotal: 0, saleSubtotal: 0, itemDiscount: 0 },
  );
};

const formatAddress = (address) =>
  [
    address?.fullName,
    address?.addressLine1,
    [address?.city, address?.state, address?.pincode]
      .filter(Boolean)
      .join(", "),
    address?.phone,
  ]
    .filter(Boolean)
    .join("\n");

const getPaymentStatus = (order) =>
  order?.paymentMilestones?.find((milestone) => milestone.status)?.status ||
  "Pending";

// ============ REVIEW COMPONENTS ============

// Review Item Component
const ReviewItem = ({ review, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      APPROVED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      REJECTED: { color: "bg-red-100 text-red-800", icon: XCircle },
      HIDDEN: { color: "bg-gray-100 text-gray-800", icon: Eye },
    };
    const StatusIcon = statusMap[status]?.icon || AlertCircle;
    return {
      className: `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusMap[status]?.color || "bg-gray-100 text-gray-800"}`,
      icon: StatusIcon,
    };
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const statusBadge = getStatusBadge(review?.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              {renderStars(review?.rating || 0)}
              <span className="text-sm font-medium ml-1">
                {/* {review?.rating || 0} */}
              </span>
            </div>
            {/* <span className={statusBadge.className}>
              <StatusIcon className="w-3 h-3" />
              {review?.status || "PENDING"}
            </span> */}
          </div>

          {review?.title && (
            <h4 className="text-sm font-bold mt-1">{review.title}</h4>
          )}

          <p
            className={`text-sm text-muted-foreground mt-1 ${
              !isExpanded && "line-clamp-2"
            }`}
          >
            {review?.description || "No description provided"}
          </p>

          {review?.description?.length > 100 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary hover:underline mt-1"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span>
              {review?.createdAt
                ? new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </span>
            {review?.customerId?.name && (
              <span>By {review.customerId.name}</span>
            )}
            {review?.helpfulCount > 0 && (
              <span>👍 {review.helpfulCount} helpful</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(review)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(review)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Admin Response */}
      {review?.adminResponse?.text && (
        <div className="mt-3 bg-muted/30 rounded-lg p-3 text-sm">
          <p className="font-medium text-foreground">Admin Response:</p>
          <p className="text-muted-foreground">{review.adminResponse.text}</p>
          {review.adminResponse.date && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(review.adminResponse.date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Review Form Component
const ReviewForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  isEditing = false,
  productName,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    rating: initialData?.rating || 5,
    description: initialData?.description || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {productName && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm text-muted-foreground">Reviewing:</p>
          <p className="font-medium">{productName}</p>
        </div>
      )}

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium mb-1">Rating *</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= formData.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 font-medium">{formData.rating}</span>
        </div>
      </div>
      <div>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              description: e.target.value.slice(0, 500),
            }))
          }
          placeholder="Share your detailed experience with this product"
          rows="4"
          maxLength={500}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEditing
              ? "Updating..."
              : "Submitting..."
            : isEditing
              ? "Update Review"
              : "Submit Review"}
        </Button>
      </div>
    </form>
  );
};

// Review List Component
const ReviewList = ({ reviews, onEdit, onDelete }) => {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No reviews yet</p>
        <p className="text-sm text-muted-foreground">
          Be the first to review this order
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <ReviewItem
          key={review._id}
          review={review}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

// ============ MAIN RENDER ORDER DETAILS COMPONENT ============

const RenderOrderDetails = ({
  orderDetailsQuery,
  customerId,
  setView,
  selectedOrderId,
}) => {
  const { toast } = useToast();
  const order = orderDetailsQuery?.data?.orderDetails;
  const reviews = orderDetailsQuery?.data?.reviews;

  const shippingDetail = order?.shippingDetails?.[0];
  const dispatchPoint = shippingDetail?.dispatchPoint;
  const shippingAddress = formatAddress(shippingDetail?.shipToAddress);

  const couponDiscount = Math.max(
    0,
    Number(order?.promotionDiscount ?? order?.promotion?.discountAmount ?? 0) ||
      0,
  );
  const itemDiscount = Math.max(
    0,
    (Number(order?.totalDiscount || 0) || 0) - couponDiscount,
  );
  const couponCode = String(order?.promotion?.code || "").trim();
  const taxedSummary = getOrderTaxedSummary(order?.items);

  const summarySubtotal =
    taxedSummary.subtotal > 0
      ? taxedSummary.subtotal
      : (Number(order?.subtotal || 0) || 0) +
        (Number(order?.totalGst || 0) || 0);

  const summaryItemDiscount =
    taxedSummary.subtotal > 0 ? taxedSummary.itemDiscount : itemDiscount;

  const summaryShipping = Number(order?.shippingCost || 0) || 0;
  const preCouponTotal =
    summarySubtotal - summaryItemDiscount + summaryShipping;
  const displayCouponDiscount =
    couponDiscount > 0 && Number.isFinite(Number(order?.finalAmount))
      ? Math.max(0, preCouponTotal - Number(order?.finalAmount || 0))
      : couponDiscount;

  // ============ REVIEW STATE MANAGEMENT ============
  const [showAddReview, setShowAddReview] = useState(false);
  const [showEditReview, setShowEditReview] = useState(false);
  const [showDeleteReview, setShowDeleteReview] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user can add review
  const canAddReview =
    order?.status === "Delivered" || order?.status === "Completed";

  // Get reviewable items (items without reviews)
  const reviewableItems =
    order?.items?.filter((item) => {
      const isReviewed = reviews?.list?.some(
        (r) =>
          r.productId?._id === item.productId || r.productId === item.productId,
      );
      return !isReviewed;
    }) || [];

  // ============ REVIEW HANDLERS ============

  // Add Review Handler
  const handleAddReview = async (formData) => {
    setIsSubmitting(true);
    try {
      const reviewData = {
        orderId: order?.orderId,
        productId: selectedProduct?.itemId || null,
        variantId: selectedProduct?.groupId || null,
        customerId: customerId,
        accountTypeId: ACCOUNT_TYPE_ID,
        rating: formData.rating,
        description: formData.description,
        images: formData.images || [],
      };

      await addCatalogueProductReviewsApi(reviewData);
      toast({
        title: "Review submitted successfully!",
        description: "Your review is pending approval.",
      });
      setShowAddReview(false);
      setSelectedProduct(null);
      orderDetailsQuery.refetch();
    } catch (error) {
      toast({
        title: "Failed to submit review",
        description: error?.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Review Handler
  const handleEditReview = async (formData) => {
    setIsSubmitting(true);
    try {
      const updateData = {
        rating: formData.rating,
        title: formData.title,
        description: formData.description,
      };

      await updateCatalogueProductReviewApi(selectedReview._id, updateData);
      toast({
        title: "Review updated successfully!",
        description: "Your changes have been saved.",
      });
      setShowEditReview(false);
      setSelectedReview(null);
      orderDetailsQuery.refetch();
    } catch (error) {
      toast({
        title: "Failed to update review",
        description: error?.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Review Handler
  const handleDeleteReview = async () => {
    setIsSubmitting(true);
    try {
      await deleteCatalogueProductReviewApi(selectedReview._id);
      toast({
        title: "Review deleted successfully",
        description: "Your review has been removed.",
      });
      setShowDeleteReview(false);
      setSelectedReview(null);
      orderDetailsQuery.refetch();
    } catch (error) {
      toast({
        title: "Failed to delete review",
        description: error?.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Add Review Modal
  const openAddReview = (item) => {
    setSelectedProduct(item);
    setShowAddReview(true);
  };

  // Open Edit Review Modal
  const openEditReview = (review) => {
    setSelectedReview(review);
    setShowEditReview(true);
  };

  // Open Delete Review Modal
  const openDeleteReview = (review) => {
    setSelectedReview(review);
    setShowDeleteReview(true);
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setView("orders")}
        className="-ml-2 gap-2 rounded-full"
      >
        <ArrowLeft className="h-4 w-4" />
        Orders
      </Button>

      {orderDetailsQuery?.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : orderDetailsQuery?.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-bold text-destructive">
            Could not load order details
          </p>
          <p className="mt-1 text-muted-foreground">
            {getErrorMessage(orderDetailsQuery.error)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => orderDetailsQuery.refetch()}
            className="mt-3 rounded-full"
          >
            Try again
          </Button>
        </div>
      ) : order ? (
        <>
          {/* ===== ORDER HEADER ===== */}
          <div>
            <h3 className="text-lg font-extrabold text-foreground">
              {order.title || "Website Order"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              #{String(order.orderId || order._id || selectedOrderId)}
            </p>
          </div>

          {/* ===== ORDER SUMMARY ===== */}
          <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="mt-1 font-bold">
                  {formatDate(order.createdDate)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="mt-1 font-bold">
                  {order.status || order.progress || "Pending"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment</p>
                <p className="mt-1 font-bold">{getPaymentStatus(order)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="mt-1 font-bold">{money(order.finalAmount)}</p>
              </div>
            </div>
          </div>

          {/* ===== ORDER ITEMS WITH REVIEW BUTTONS ===== */}
          {order.items && order.items.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-extrabold">Items</h4>
                {canAddReview && reviewableItems.length > 0 && (
                  <span className="text-xs text-primary">
                    {reviewableItems.length} item
                    {reviewableItems.length > 1 ? "s" : ""} can be reviewed
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-3">
                {order.items.map((item, index) => {
                  const pricedItem = getOrderItemTaxedPrices(item);
                  const isReviewed = reviews?.list?.some(
                    (r) =>
                      r.productId?._id === item.itemId
                  );
                  const itemReview = reviews?.list?.find(
                    (r) =>
                      r.productId?._id === item.productId ||
                      r.productId === item.productId,
                  );

                  return (
                    <div
                      key={`${item.itemId || item.description || "item"}-${index}`}
                      className="border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-bold">
                            {item.description || "Item"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Qty {item.quantity ?? 1}{" "}
                            {item.quantityUnit || "pcs"}
                          </p>

                          {/* Review Status Badge */}
                          {isReviewed && itemReview && (
                            <span
                              className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                itemReview.status === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : itemReview.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : itemReview.status === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {itemReview.status === "APPROVED" && (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              {itemReview.status === "PENDING" && (
                                <Clock className="w-3 h-3" />
                              )}
                              {itemReview.status === "REJECTED" && (
                                <XCircle className="w-3 h-3" />
                              )}
                              {itemReview.status}
                            </span>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-extrabold">
                            {money(pricedItem.saleWithTax)}
                          </p>
                          {pricedItem.hasDiscount ? (
                            <p className="text-xs font-semibold text-muted-foreground line-through">
                              {money(pricedItem.baseWithTax)}
                            </p>
                          ) : null}

                          {/* Review Action Buttons */}
                          <div className="mt-2 flex justify-end gap-1">
                            {!isReviewed && canAddReview && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAddReview(item)}
                                className="h-7 px-2 text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Review
                              </Button>
                            )}
                            {isReviewed &&
                              itemReview &&
                              itemReview.status !== "HIDDEN" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditReview(itemReview)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteReview(itemReview)}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ===== REVIEWS SECTION ===== */}
          {reviews?.list?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-extrabold">Reviews</h4>
                <span className="text-xs text-muted-foreground">
                  {reviews?.statistics?.totalReviews || 0} review
                  {reviews?.statistics?.totalReviews !== 1 ? "s" : ""}
                  {reviews?.statistics?.averageRating > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {reviews.statistics.averageRating.toFixed(1)}
                    </span>
                  )}
                </span>
              </div>

              <ReviewList
                reviews={reviews?.list || []}
                onEdit={openEditReview}
                onDelete={openDeleteReview}
              />
            </div>
          )}

          {/* ===== ORDER SUMMARY ===== */}
          <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
            <h4 className="text-sm font-extrabold">Summary</h4>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold">{money(summarySubtotal)}</span>
              </div>
              {summaryItemDiscount > 0 ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-bold text-green-600">
                    -{money(summaryItemDiscount)}
                  </span>
                </div>
              ) : null}
              {displayCouponDiscount > 0 ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Coupon Discount{couponCode ? ` (${couponCode})` : ""}
                  </span>
                  <span className="font-bold text-green-600">
                    -{money(displayCouponDiscount)}
                  </span>
                </div>
              ) : null}
              {order?.shippingCost > 0 ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-bold">{money(order.shippingCost)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 border-t border-border pt-2 text-base">
                <span className="font-extrabold">Total</span>
                <span className="font-extrabold text-primary">
                  {money(order.finalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* ===== SHIPPING DETAILS ===== */}
          {shippingDetail ? (
            <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
              <h4 className="text-sm font-extrabold">
                {shippingDetail.fulfillmentMode === "store-pickup"
                  ? "Pickup Details"
                  : "Delivery Details"}
              </h4>
              <div className="mt-3 space-y-2 text-sm">
                {shippingDetail.pickupDateTime ? (
                  <p>
                    <span className="text-muted-foreground">Pickup time: </span>
                    <span className="font-bold">
                      {shippingDetail.pickupDateTime}
                    </span>
                  </p>
                ) : null}
                {shippingDetail.trackingNumber ? (
                  <p>
                    <span className="text-muted-foreground">Tracking: </span>
                    <span className="font-bold">
                      {shippingDetail.trackingNumber}
                    </span>
                  </p>
                ) : null}
                {shippingAddress ? (
                  <p className="whitespace-pre-line text-muted-foreground">
                    {shippingAddress}
                  </p>
                ) : null}
                {shippingDetail.fulfillmentMode === "store-pickup" &&
                dispatchPoint &&
                (dispatchPoint?.name || dispatchPoint?.address) ? (
                  <div className="rounded-md bg-muted/50 p-2 text-xs">
                    <p className="font-bold text-foreground">
                      {dispatchPoint.name || "Dispatch Point"}
                    </p>
                    {dispatchPoint.address ? (
                      <p className="mt-1 text-muted-foreground">
                        {dispatchPoint.address}
                      </p>
                    ) : null}
                    {dispatchPoint.pincode ? (
                      <p className="text-muted-foreground">
                        {dispatchPoint.pincode}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ============ ADD REVIEW MODAL ============ */}
          <Dialog open={showAddReview} onOpenChange={setShowAddReview}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Review</DialogTitle>
              </DialogHeader>
              <ReviewForm
                productName={
                  selectedProduct?.description || selectedProduct?.name
                }
                onSubmit={handleAddReview}
                onCancel={() => {
                  setShowAddReview(false);
                  setSelectedProduct(null);
                }}
                isEditing={false}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>

          {/* ============ EDIT REVIEW MODAL ============ */}
          <Dialog open={showEditReview} onOpenChange={setShowEditReview}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Review</DialogTitle>
              </DialogHeader>
              <ReviewForm
                initialData={selectedReview}
                onSubmit={handleEditReview}
                onCancel={() => {
                  setShowEditReview(false);
                  setSelectedReview(null);
                }}
                isEditing={true}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>

          {/* ============ DELETE REVIEW MODAL ============ */}
          <Dialog open={showDeleteReview} onOpenChange={setShowDeleteReview}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Review</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                <p className="text-center text-muted-foreground">
                  Are you sure you want to delete this review? This action
                  cannot be undone.
                </p>
                {selectedReview && (
                  <div className="mt-4 bg-muted/30 rounded-lg p-3">
                    <p className="text-sm font-medium">
                      {selectedReview.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rating: {selectedReview.rating} stars
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteReview(false);
                    setSelectedReview(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteReview}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Deleting..." : "Delete Review"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-5 text-center">
          <p className="text-sm font-bold">Order details not found</p>
        </div>
      )}
    </div>
  );
};

export default RenderOrderDetails;
