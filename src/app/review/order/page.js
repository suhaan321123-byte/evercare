"use client";
// pages/OrderReview.jsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Edit,
  Trash2,
  Plus,
  MessageSquare,
  ShoppingBag,
  Calendar,
  Package,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  addCatalogueProductReviewsApi,
  deleteCatalogueProductReviewApi,
  updateCatalogueProductReviewApi,
} from "@/api/chatWidget/chatWidgetApi";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useSearchParams } from "next/navigation";
import { getCustomerOrderDetails } from "@/lib/ordersApi";
import { money } from "@/lib/pricing";
import { ACCOUNT_TYPE_ID } from "@/services/catalogues";

// ============ UTILITY FUNCTIONS ============
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

// ============ STAR RATING COMPONENT ============
const StarRating = ({ rating, onChange, readonly = false, size = "md" }) => {
  const [hover, setHover] = useState(0);
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`focus:outline-none transition-transform ${
            !readonly && "hover:scale-110"
          }`}
          disabled={readonly}
        >
          <Star
            className={`${sizeClasses[size]} transition-colors ${
              star <= (hover || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        </button>
      ))}
      {!readonly && (
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          {rating > 0 ? `${rating}/5` : "Select rating"}
        </span>
      )}
    </div>
  );
};

// ============ REVIEW CARD COMPONENT ============
const ReviewCard = ({ review, onEdit, onDelete, isExpanded, onToggle }) => {
  return (
    <div className="border border-border rounded-xl p-4 bg-muted/5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <StarRating rating={review?.rating || 0} readonly size="sm" />
          </div>

          <div className="mt-2">
            <p
              className={`text-sm text-muted-foreground ${
                !isExpanded && "line-clamp-2"
              }`}
            >
              {review?.description || "No description provided"}
            </p>
            {review?.description?.length > 100 && (
              <button
                onClick={onToggle}
                className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Read more <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {review?.createdAt
                ? new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(review)}
            className="h-8 px-2 text-xs"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(review)}
            className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============ REVIEW FORM COMPONENT ============
const ReviewForm = ({
  product,
  initialData = {},
  onSubmit,
  onCancel,
  isEditing = false,
  isSubmitting = false,
}) => {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (rating === 0) newErrors.rating = "Please select a rating";
    if (!description.trim()) newErrors.description = "Please write a review";
    if (description.length < 10)
      newErrors.description = "Review must be at least 10 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ rating, description });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product Info */}
      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {product?.description || "Product"}
            </p>
            <p className="text-xs text-muted-foreground">
              Qty: {product?.quantity || 1} • {money(product?.salePrice || 0)}
            </p>
          </div>
          {isEditing && (
            <Badge variant="outline" className="text-xs">
              Editing Review
            </Badge>
          )}
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Your Rating <span className="text-red-500">*</span>
        </label>
        <StarRating rating={rating} onChange={setRating} size="lg" />
        {errors.rating && (
          <p className="text-xs text-red-500 mt-1">{errors.rating}</p>
        )}
      </div>

      {/* Review Text */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          placeholder="Share your experience with this product. What did you like or dislike?"
          rows="4"
          className="resize-none"
        />
        <div className="flex justify-between mt-1">
          {errors.description && (
            <p className="text-xs text-red-500">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground ml-auto">
            {description.length}/500 characters
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditing ? "Updating..." : "Submitting..."}
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {isEditing ? "Update Review" : "Submit Review"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// ============ MAIN ORDER REVIEW PAGE ============
const OrderReviewPage = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const router = useRouter();
  const { toast } = useToast();
  const { isLoggedIn, session } = useCustomerAuth();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [expandedReviews, setExpandedReviews] = useState({});
  const [refetching, setRefetching] = useState(false);

  // Review form states
  const [activeReviewForm, setActiveReviewForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerId = session?.customerId ? String(session.customerId) : "";
  // ============ FETCH ORDER DATA ============
  const fetchOrderData = async () => {
    if (!customerId || !orderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getCustomerOrderDetails({
        customerId,
        orderId,
      });

      // Handle different response structures
      const data = response?.data || response;

      setOrder(data.orderDetails || data);
      setReviews(data.reviews?.list || []);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Failed to load order",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.push(`?id=${orderId}&chat=open`);
    }
  }, [isLoggedIn]);

  // Initial fetch
  useEffect(() => {
    if (orderId && customerId) {
      fetchOrderData();
    }
  }, [orderId, customerId]);

  // Check if user can review (order must be delivered/completed)
  const canReview =
    order?.status === "Delivered" || order?.status === "Completed";

  // Get items that can be reviewed (no existing review)
  const getReviewableItems = () => {
    if (!order?.items) return [];
    return order.items.filter((item) => {
      const hasReview = reviews.some(
        (r) => r.productId?._id === item.itemId || r.productId === item.itemId,
      );
      return !hasReview;
    });
  };

  // Toggle review expansion
  const toggleReviewExpansion = (reviewId) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  // ============ REVIEW CRUD HANDLERS ============

  // Open add review form
  const openAddReview = (item) => {
    setActiveReviewForm({
      itemId: item.itemId,
      product: item,
      isEditing: false,
      reviewData: null,
    });
  };

  // Open edit review form
  const openEditReview = (review) => {
    const product = order?.items?.find(
      (item) =>
        item.itemId === review.productId?._id ||
        item.itemId === review.productId,
    );
    setActiveReviewForm({
      itemId: review.productId?._id || review.productId,
      product: product || { description: review.productName || "Product" },
      isEditing: true,
      reviewData: review,
    });
  };

  // Close review form
  const closeReviewForm = () => {
    setActiveReviewForm(null);
  };

  // Handle add/update review
  const handleReviewSubmit = async (formData) => {
    if (!activeReviewForm) return;

    setIsSubmitting(true);
    try {
      const { itemId, product, isEditing, reviewData } = activeReviewForm;

      if (isEditing) {
        // Update existing review - match RenderOrderDetails pattern
        const updateData = {
          rating: formData.rating,
          description: formData.description,
        };
        await updateCatalogueProductReviewApi(reviewData._id, updateData);

        // Update local reviews
        setReviews((prev) =>
          prev.map((r) =>
            r._id === reviewData._id ? { ...r, ...updateData } : r,
          ),
        );

        toast({
          title: "Review updated successfully!",
          description: "Your changes have been saved.",
        });
      } else {
        // Create new review - match RenderOrderDetails pattern
        const reviewPayload = {
          orderId: order?.orderId,
          productId: itemId,
          variantId: product?.groupId || null,
          customerId: customerId,
          accountTypeId: ACCOUNT_TYPE_ID,
          rating: formData.rating,
          description: formData.description,
          images: [],
        };

        const response = await addCatalogueProductReviewsApi(reviewPayload);
        const newReview = response?.data?.review || response;

        // Add to local reviews
        setReviews((prev) => [...prev, newReview]);

        toast({
          title: "Review submitted successfully!",
          description: "Your review is pending approval.",
        });
      }

      closeReviewForm();
      // Refetch to get latest data
      setRefetching(true);
      await fetchOrderData();
    } catch (error) {
      toast({
        title: isEditing
          ? "Failed to update review"
          : "Failed to submit review",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete review
  const handleDeleteReview = async () => {
    if (!deleteTarget) return;

    setIsSubmitting(true);
    try {
      await deleteCatalogueProductReviewApi(deleteTarget._id);

      // Remove from local reviews
      setReviews((prev) => prev.filter((r) => r._id !== deleteTarget._id));

      toast({
        title: "Review deleted successfully",
        description: "Your review has been removed.",
      });
      setDeleteTarget(null);
      // Refetch to get latest data
      setRefetching(true);
      await fetchOrderData();
    } catch (error) {
      toast({
        title: "Failed to delete review",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ LOADING STATE ============
  if (loading || refetching) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ NO ORDER FOUND ============
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Order Not Found</h3>
            <p className="text-muted-foreground mt-2">
              We couldn't find the order you're looking for.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reviewableItems = getReviewableItems();
  const hasReviewableItems = reviewableItems.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="h-8 w-8 p-0 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order Reviews</h1>
            <p className="text-sm text-muted-foreground">
              Order #{order?.orderId || order?._id}
            </p>
          </div>
        </div>
      </div>

      {/* Order Info Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Order Summary</CardTitle>
            <span className="text-xs text-muted-foreground">
              Placed on {formatDate(order?.createdDate)}
            </span>
          </div>
          <CardDescription className="text-xs">
            Status:{" "}
            <span className="font-medium">{order?.status || "Pending"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="font-medium">{order?.items?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reviews</p>
              <p className="font-medium">{reviews.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviewable Items Section */}
      {canReview && hasReviewableItems && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Items to Review
            </h2>
            <Badge variant="outline" className="text-xs">
              {reviewableItems.length} item
              {reviewableItems.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="space-y-3">
            {reviewableItems.map((item) => (
              <Card key={item.itemId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">
                        {item?.description || "Product"}
                      </h4>
                    </div>
                    <Button
                      onClick={() => openAddReview(item)}
                      variant="default"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Write Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Your Reviews
          </h2>
          <Badge variant="outline" className="text-xs">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Reviews Yet</h3>
              <p className="text-muted-foreground text-sm">
                {canReview
                  ? "Write reviews for the items you've purchased."
                  : "Reviews will appear here once your order is delivered."}
              </p>
              {canReview && reviewableItems.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    const firstItem = reviewableItems[0];
                    if (firstItem) openAddReview(firstItem);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Write First Review
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                onEdit={() => openEditReview(review)}
                onDelete={() => setDeleteTarget(review)}
                isExpanded={expandedReviews[review._id] || false}
                onToggle={() => toggleReviewExpansion(review._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ REVIEW FORM MODAL ============ */}
      {activeReviewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {activeReviewForm.isEditing
                    ? "Edit Review"
                    : "Write a Review"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeReviewForm}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  ✕
                </Button>
              </div>
              <ReviewForm
                product={activeReviewForm.product}
                initialData={activeReviewForm.reviewData || {}}
                onSubmit={handleReviewSubmit}
                onCancel={closeReviewForm}
                isEditing={activeReviewForm.isEditing}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION DIALOG ============ */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be
              undone.
              {deleteTarget?.description && (
                <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    "{deleteTarget.description}"
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Review"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrderReviewPage;
