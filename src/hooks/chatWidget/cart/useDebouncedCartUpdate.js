import useDebouncedApi from "./useDebouncedApi";
import { chatWidgetSideUpdateCartItemApi } from "@/api/chatWidget/chatWidgetApi";

const useDebouncedCartUpdate = (cart, setCart) => {
  const { callApi, loading } = useDebouncedApi(chatWidgetSideUpdateCartItemApi, 300);

  const debouncedUpdateCartItem = (index, field, value, customerId) => {
    let originalValue;

    // ✅ Local state update first
    setCart((prevCart) => {
      originalValue = prevCart[index]?.[field] ?? null;
      const newCart = [...prevCart];
      if (newCart[index]) {
        newCart[index] = { ...newCart[index], [field]: value };
      }
      if(field === "selectedVariant") {
         newCart[index] = {...newCart[index], quantity : 1}
      }
      return newCart;
    });

    // ✅ Debounced API call
    callApi(
      { index, field, value, customerId },
      (response) => {
        if (response?.message === "success" && response?.data) {
          // setCart(response.data || []);
          localStorage.setItem(
            "webCartTotalCount",
            JSON.stringify(response.data.length || 0)
          );
        }
      },
      () => {
        // Rollback if API fails
        setCart((prevCart) => {
          const rollbackCart = [...prevCart];
          if (rollbackCart[index]) {
            rollbackCart[index] = {
              ...rollbackCart[index],
              [field]: originalValue,
            };
          }
          return rollbackCart;
        });
      }
    );
  };

  return { debouncedUpdateCartItem, loading };
};

export default useDebouncedCartUpdate;
