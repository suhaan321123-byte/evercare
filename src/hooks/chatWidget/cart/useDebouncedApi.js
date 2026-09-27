import { useRef, useState, useCallback } from "react";

const useDebouncedApi = (apiFn, delay = 300) => {
  const timeoutRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const callApi = useCallback(
    (params, onSuccess, onError) => {
        
      // Clear any pending call
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const response = await apiFn(params);
          onSuccess?.(response);
        } catch (error) {
          console.error("Debounced API error:", error);
          onError?.(error);
        } finally {
          setLoading(false);
        }
      }, delay);
    },
    [apiFn, delay]
  );

  return { callApi, loading };
};

export default useDebouncedApi;
