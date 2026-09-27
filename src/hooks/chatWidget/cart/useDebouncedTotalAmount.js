import { useState, useEffect } from "react";
import { getCatalogueProductsTotalAmountApi } from "@/api/chatWidget/chatWidgetApi";

const useDebouncedTotalAmount = (cart, deliveryAddress) => {
  const [totalSummary, setTotalSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If cart is empty, reset summary and loading state, then exit.
    if (!cart || cart.length === 0) {
      setTotalSummary(null);
      setLoading(false);
      return;
    }

    // Set loading to true immediately when a calculation is pending.
    setLoading(true);

    const handler = setTimeout(async () => {
      try {
        const response = await getCatalogueProductsTotalAmountApi({
          products: cart,
          deliveryAddress: deliveryAddress,
        });

        if (response?.message === "success") {
          setTotalSummary(response.data);
        } else {
          // If API call succeeds but business logic fails, reset summary.
          setTotalSummary(null);
        }
      } catch (error) {
        console.error("Failed to get total amount:", error);
        setTotalSummary(null); // Reset on error to avoid showing stale data.
      } finally {
        // Set loading to false after the API call is complete (success or fail).
        setLoading(false);
      }
    }, 500); // Debounce API call by 500ms

    return () => clearTimeout(handler);
  }, [cart, deliveryAddress]);

  return { totalSummary, loading };
};

export default useDebouncedTotalAmount;
