import { usePublishedScrollingBarItems } from "@/services/scrollingBar";
import { useState, useEffect, useRef, useCallback } from "react";

const offers = [
  "Welcome to EvercareMed - Your Ayurvedic Wellness Store \u{1F33F}",
  "\u{1F6D2} Trusted Ayurvedic Medicines, Wellness Products & Equipment",
  "\u{1F69A} FREE Delivery on orders above ₹49 to Kempsey & Port Macquarie",
  "\u26A1 Same Day Delivery available within Kempsey",
  "\u{1F4E6} Saturday Special Delivery to Port Macquarie",
  "\u{1F381} Buy 2 Get 1 FREE on selected products",
  "\u{2764}\uFE0F Bringing the Taste of Home to Your Doorstep",
];

interface OfferBarProps {
  speed?: "default" | "slow";
  initialItems?: string[];
}

const OfferBar = ({ speed = "default", initialItems }: OfferBarProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const positionRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);

  // Drag state
  const dragStartX = useRef(0);
  const dragStartPosition = useRef(0);
  const velocityRef = useRef(0);
  const lastMoveTime = useRef(0);
  const lastMovePosition = useRef(0);
  const isDraggingRef = useRef(false);

  const shouldFetch = initialItems === undefined;
  const { data: scrollingItems = [] } =
    usePublishedScrollingBarItems(shouldFetch);
  const offerTexts =
    initialItems ??
    (shouldFetch && scrollingItems.length > 0
      ? scrollingItems.map((item) => item.text)
      : offers);
  const items = [...offerTexts, ...offerTexts];

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get speed based on device
  const getSpeed = useCallback(() => {
    if (isDragging || isPaused) return 0;

    if (isMobile) {
      return speed === "slow" ? 0.5 : 0.8;
    }
    return speed === "slow" ? 1.0 : 1.5;
  }, [isMobile, speed, isDragging, isPaused]);

  // Animation function
  const animate = useCallback(() => {
    if (!contentRef.current || !containerRef.current) return;

    const contentWidth = contentRef.current.scrollWidth / 2;

    // Apply velocity from drag
    if (isDraggingRef.current) {
      // If dragging, use velocity for smooth deceleration
      if (Math.abs(velocityRef.current) > 0.01) {
        positionRef.current += velocityRef.current;
        velocityRef.current *= 0.98; // Friction
      } else {
        velocityRef.current = 0;
      }
    } else {
      // Normal auto-scroll
      const speedValue = getSpeed();
      positionRef.current -= speedValue;
    }

    // Smooth looping
    if (Math.abs(positionRef.current) >= contentWidth) {
      positionRef.current += contentWidth;
    }
    if (positionRef.current > 0) {
      positionRef.current -= contentWidth;
    }

    containerRef.current.style.transform = `translateX(${positionRef.current}px)`;

    animationRef.current = requestAnimationFrame(animate);
  }, [getSpeed]);

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Mouse/Touch drag handlers
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    isDraggingRef.current = true;
    setIsPaused(true);
    dragStartX.current = clientX;
    dragStartPosition.current = positionRef.current;
    velocityRef.current = 0;
    lastMoveTime.current = Date.now();
    lastMovePosition.current = positionRef.current;
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDraggingRef.current) return;

    const deltaX = clientX - dragStartX.current;
    const newPosition = dragStartPosition.current + deltaX;
    positionRef.current = newPosition;

    // Calculate velocity
    const now = Date.now();
    const timeDelta = now - lastMoveTime.current;
    if (timeDelta > 0) {
      const positionDelta = positionRef.current - lastMovePosition.current;
      velocityRef.current = (positionDelta / timeDelta) * 0.5; // Smooth velocity
    }
    lastMoveTime.current = now;
    lastMovePosition.current = positionRef.current;
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
    setIsPaused(false);
  }, []);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX);
    },
    [handleDragStart],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };
    const handleMouseUp = () => {
      handleDragEnd();
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleDragStart(touch.clientX);
      }
    },
    [handleDragStart],
  );

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleDragMove(touch.clientX);
      }
    };
    const handleTouchEnd = () => {
      handleDragEnd();
    };

    if (isDragging) {
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("touchcancel", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Hover pause
  const handleHoverStart = useCallback(() => {
    if (!isDragging) {
      setIsPaused(true);
    }
  }, [isDragging]);

  const handleHoverEnd = useCallback(() => {
    if (!isDragging) {
      setIsPaused(false);
    }
  }, [isDragging]);

  return (
    <div className="w-full">
      <div
        className="relative cursor-grab select-none overflow-hidden border-b border-[#29ABE2]/20 bg-[#E4F8E5] active:cursor-grabbing"
        onMouseEnter={handleHoverStart}
        onMouseLeave={handleHoverEnd}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          ref={containerRef}
          className="flex w-max whitespace-nowrap py-2.5 sm:py-3"
          style={{
            willChange: "transform",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
          }}
        >
          <div ref={contentRef} className="flex">
            {items.map((text, i) => (
              <div
                key={i}
                className="flex shrink-0 items-center px-3 text-[11px] font-semibold tracking-wide text-[#29ABE2] sm:px-8 sm:text-sm"
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
              >
                <span>{text}</span>
                <span className="ml-3 select-none text-[#29ABE2]/45 sm:ml-6">
                  •
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferBar;
