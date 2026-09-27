// components/ProductReviews.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Star,
  StarHalf,
  ThumbsUp,
  Calendar,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getProductReviewsApi } from "@/api/product/productApi";

// ============ HELPER FUNCTIONS ============

const renderStars = (rating) => {
  const stars = [];
  const numRating = Number(rating) || 0;
  for (let i = 1; i <= 5; i++) {
    if (i <= numRating) {
      stars.push(
        <Star
          key={i}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 dark:fill-yellow-300 dark:text-yellow-300"
        />,
      );
    } else if (i - 0.5 <= numRating) {
      stars.push(
        <StarHalf
          key={i}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 dark:fill-yellow-300 dark:text-yellow-300"
        />,
      );
    } else {
      stars.push(
        <Star
          key={i}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 dark:text-gray-600"
        />,
      );
    }
  }
  return stars;
};

const formatDate = (date) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getCustomerName = (review) => {
  if (review?.customerId?.name) return review.customerId.name;
  if (review?.name) return review.name;
  return "Anonymous";
};

const getCustomerEmail = (review) => {
  if (review?.customerId?.email) return review.customerId.email;
  return null;
};

const getCustomerImage = (review) => {
  if (review?.customerId?.image) return review.customerId.image;
  return null;
};

// ============ REVIEW CARD COMPONENT ============

const ReviewCard = ({ review, isFullWidth = false }) => {
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const customerName = getCustomerName(review);
  const customerImage = getCustomerImage(review);
  const customerEmail = getCustomerEmail(review);
  const description = review?.description || "";
  const title = review?.title || "";
  const rating = Number(review?.rating) || 0;
  const images = review?.images || [];
  const helpfulCount = review?.helpfulCount || 0;
  const isVerified = review?.isVerifiedPurchase || false;
  const createdAt = review?.createdAt || review?.date;
  const adminResponse = review?.adminResponse || null;

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 transition-all duration-200 flex-shrink-0 h-full",
        isFullWidth ? "w-full" : "w-[280px] sm:w-[320px] md:w-[360px]",
      )}
    >
      {/* Header: Avatar + Name */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden">
            {customerImage && !imageError ? (
              <img
                src={customerImage}
                alt={customerName}
                className="w-full h-full rounded-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="text-xs sm:text-sm">
                {getInitials(customerName)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {customerName}
            </p>
            {/* {customerEmail && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {customerEmail}
              </p>
            )} */}
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-0.5">
                {renderStars(rating)}
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {rating}
              </span>
            </div>
          </div>
        </div>

        {/* Verified Purchase Badge */}
        {isVerified && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-medium flex-shrink-0 ml-2">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      {/* Review Content */}
      <div className="mt-3">
        {title && (
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
            {title}
          </h4>
        )}
        <p
          className={cn(
            "text-gray-600 dark:text-gray-300 text-xs sm:text-sm mt-1 leading-relaxed",
            !isExpanded && "line-clamp-3",
          )}
        >
          {description || ""}
        </p>
        {description && description.length > 120 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 font-medium"
          >
            {isExpanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Review Images */}
      {images && images.length > 0 && (
        <div className="mt-3 flex gap-1.5 flex-wrap">
          {images.slice(0, 3).map((image, index) => (
            <div
              key={index}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src={image}
                alt={`Review image ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
          {images.length > 3 && (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              +{images.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Footer: Date + Helpful */}
      <div className="mt-3 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2.5">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(createdAt)}
        </span>
        {helpfulCount > 0 && (
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            {helpfulCount}
          </span>
        )}
      </div>

      {/* Admin Response */}
      {adminResponse?.text && (
        <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 border border-blue-100 dark:border-blue-800/30">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-semibold text-blue-800 dark:text-blue-300">
              Admin Response
            </span>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 line-clamp-2">
            {adminResponse.text}
          </p>
        </div>
      )}
    </div>
  );
};

// ============ REVIEW SKELETON ============

const ReviewCardSkeleton = ({ isFullWidth = false }) => (
  <div
    className={cn(
      "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 flex-shrink-0",
      isFullWidth ? "w-full" : "w-[280px] sm:w-[320px] md:w-[360px]",
    )}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-3 w-32 rounded-full mt-1" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <div className="mt-3 space-y-2">
      <Skeleton className="h-4 w-3/4 rounded-full" />
      <Skeleton className="h-3 w-full rounded-full" />
      <Skeleton className="h-3 w-2/3 rounded-full" />
    </div>
    <div className="mt-3 flex gap-1.5">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <Skeleton className="w-12 h-12 rounded-lg" />
      <Skeleton className="w-12 h-12 rounded-lg" />
    </div>
    <div className="mt-3 flex items-center justify-between">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-3 w-16 rounded-full" />
    </div>
  </div>
);

// ============ RATING SUMMARY COMPONENT ============

const RatingSummary = ({ stats }) => {
  if (!stats) return null;

  const {
    totalReviews = 0,
    averageRating = 0,
    ratingDistribution = [],
  } = stats;

  if (totalReviews === 0) return null;

  // Create a map for quick lookup
  const ratingCounts = {};
  ratingDistribution.forEach((item) => {
    ratingCounts[item.rating] = item.count;
  });

  const maxCount = Math.max(...Object.values(ratingCounts), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Average Rating */}
        <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 flex-shrink-0">
          <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {Number(averageRating).toFixed(1)}
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              {renderStars(Math.round(averageRating))}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 min-w-0 space-y-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingCounts[rating] || 0;
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 w-10 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                  {rating}
                </div>
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="w-8 text-xs font-medium text-gray-600 dark:text-gray-400 text-right">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============ NAVIGATION BUTTONS ============

const NavigationButtons = ({ onPrev, onNext, showPrev, showNext }) => {
  return (
    <>
      {showPrev && (
        <button
          onClick={onPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Previous reviews"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}
      {showNext && (
        <button
          onClick={onNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 md:-mr-4 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Next reviews"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}
    </>
  );
};

// ============ SCROLL INDICATOR ============

const ScrollIndicator = ({ currentIndex, totalItems }) => {
  if (totalItems <= 1) return null;

  const dotCount = Math.min(totalItems, 8);

  return (
    <div className="flex justify-center gap-1.5 mt-4">
      {Array.from({ length: dotCount }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === currentIndex
              ? "w-6 bg-blue-600 dark:bg-blue-400"
              : "w-1.5 bg-gray-300 dark:bg-gray-600",
          )}
        />
      ))}
      {totalItems > 8 && (
        <div className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
      )}
    </div>
  );
};

// ============ NO REVIEWS COMPONENT ============

const NoReviews = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 sm:mb-4">
        <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
        No Reviews Yet
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
        Be the first to share your experience with this product!
      </p>
    </div>
  </div>
);

// ============ ERROR COMPONENT ============

const ReviewsError = ({ error, onRetry }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800/30 p-6 text-center">
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3 sm:mb-4">
        <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
        Could not load reviews
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
        {error?.message || "Something went wrong. Please try again."}
      </p>
      <button
        onClick={onRetry}
        className="mt-3 sm:mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// ============ MAIN COMPONENT ============

const ProductReviews = ({
  productSlug,
  initialReviews = [],
  initialStats = null,
  initialPagination = null,
  productId,
}) => {
  const [reviews, setReviews] = useState(initialReviews || []);
  const [stats, setStats] = useState(
    initialStats || {
      totalReviews: 0,
      averageRating: 0,
      minRating: 0,
      maxRating: 0,
      ratingDistribution: [],
    },
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Query for fetching all reviews (no pagination)
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["product-reviews", productSlug],
    queryFn: async () => {
      const params = {
        productSlug,
        limit: 50, // Fetch all reviews
      };
      const response = await getProductReviewsApi(params);
      return response.data;
    },
    enabled: !!productSlug && (!initialReviews || initialReviews.length === 0),
    staleTime: 1000 * 60 * 5,
  });

  // Update state when data changes
  useEffect(() => {
    if (data) {
      setReviews(data.reviews || []);
      setStats(data.stats || stats);
    }
  }, [data]);

  // Check scroll position for arrows
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  // Update current index based on scroll
  const updateCurrentIndex = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || reviews.length === 0) return;

    const firstCard = container.querySelector("div");
    if (!firstCard) return;

    const cardWidth = firstCard.offsetWidth || 320;
    const gap = 16; // gap-4 = 16px
    const scrollPosition = container.scrollLeft;
    const index = Math.round(scrollPosition / (cardWidth + gap));
    setCurrentIndex(Math.min(index, reviews.length - 1));
  }, [reviews.length]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const firstCard = container.querySelector("div");
    if (!firstCard) return;

    const cardWidth = firstCard.offsetWidth || 320;
    const gap = 16;
    const scrollPosition = index * (cardWidth + gap);
    container.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
    setCurrentIndex(index);
  }, []);

  // Handle navigation
  const handlePrev = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < reviews.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  // Handle mouse drag for touch-like scrolling on desktop
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1.5;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    checkScrollPosition();
    updateCurrentIndex();
  };

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      checkScrollPosition();
      updateCurrentIndex();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkScrollPosition, updateCurrentIndex, reviews]);

  // Check scroll on mount and updates
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScrollPosition();
      updateCurrentIndex();
    }
  }, [checkScrollPosition, updateCurrentIndex, reviews]);

  // Check if we have reviews
  const hasReviews = stats.totalReviews > 0 || reviews.length > 0;
  const showInitialLoading =
    isLoading && !reviews.length && !initialReviews?.length;

  // Get visible reviews
  const visibleReviews = reviews;

  // Determine if we need slider or full width
  const isSingleReview = visibleReviews.length === 1;
  const showSlider = visibleReviews.length > 1;

  return (
    <div id="reviews-section" className="space-y-5">
      {/* Reviews Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Customer Reviews
          </h2>
          {stats.totalReviews > 0 && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {/* {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'} •{' '} */}
              {Number(stats.averageRating).toFixed(1)} average rating
            </p>
          )}
        </div>
        {/* {hasReviews && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {visibleReviews.length} shown
          </div>
        )} */}
      </div>

      {/* Rating Summary */}
      {hasReviews && <RatingSummary stats={stats} />}

      {/* Reviews Slider */}
      {showInitialLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from({ length: 3 }).map((_, index) => (
            <ReviewCardSkeleton key={index} isFullWidth={isSingleReview} />
          ))}
        </div>
      ) : error && !reviews.length ? (
        <ReviewsError error={error} onRetry={() => refetch()} />
      ) : !hasReviews ? (
        <NoReviews />
      ) : (
        <div className="relative">
          {/* Slider Container */}
          <div
            ref={scrollContainerRef}
            onScroll={() => {
              checkScrollPosition();
              updateCurrentIndex();
            }}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseUp}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={cn(
              "flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory",
              showSlider ? "px-0" : "px-0",
              isDragging && "cursor-grabbing",
            )}
            style={{
              scrollSnapType: showSlider ? "x mandatory" : "none",
              scrollBehavior: "smooth",
              cursor: isDragging ? "grabbing" : "grab",
            }}
          >
            {visibleReviews.map((review, index) => (
              <div
                key={review._id || index}
                className={cn(
                  "snap-start",
                  showSlider ? "flex-shrink-0" : "w-full",
                )}
                style={{
                  width: showSlider ? "auto" : "100%",
                }}
              >
                <ReviewCard
                  review={review}
                  isFullWidth={!showSlider || isSingleReview}
                />
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          {showSlider && visibleReviews.length > 1 && (
            <NavigationButtons
              onPrev={handlePrev}
              onNext={handleNext}
              showPrev={showLeftArrow && currentIndex > 0}
              showNext={
                showRightArrow && currentIndex < visibleReviews.length - 1
              }
            />
          )}
        </div>
      )}

      {/* Scroll Indicator */}
      {showSlider && visibleReviews.length > 1 && (
        <ScrollIndicator
          currentIndex={currentIndex}
          totalItems={visibleReviews.length}
        />
      )}

      {/* Show total reviews count */}
      {/* {hasReviews && (
        <div className="text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 pt-1">
          Showing {visibleReviews.length} of {stats.totalReviews} reviews
        </div>
      )} */}
    </div>
  );
};

export default ProductReviews;
