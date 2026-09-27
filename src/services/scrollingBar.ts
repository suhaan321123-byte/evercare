import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { ACCOUNT_TYPE_ID } from "@/services/catalogues";

export type ScrollingBarItem = {
  id: string;
  text: string;
  sortOrder: number;
};

type ApiScrollingBarItem = {
  _id?: unknown;
  id?: unknown;
  title?: unknown;
  name?: unknown;
  message?: unknown;
  text?: unknown;
  description?: unknown;
  content?: unknown;
  label?: unknown;
  scrollingText?: unknown;
  offerText?: unknown;
  indexPosition?: unknown;
  sortOrder?: unknown;
  order?: unknown;
  position?: unknown;
};

const SCROLLING_BAR_ITEMS_ENDPOINT = "/business_website/offers/get_published_scrolling_bar_items";

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const extractList = (payload: unknown): unknown[] => {
  const value = payload as {
    data?: unknown;
    result?: unknown;
    items?: unknown;
    offers?: unknown;
    scrollingBarItems?: unknown;
  };

  return Array.isArray(payload)
    ? payload
    : Array.isArray(value.data)
      ? value.data
      : Array.isArray(value.result)
        ? value.result
        : Array.isArray(value.items)
          ? value.items
          : Array.isArray(value.offers)
            ? value.offers
            : Array.isArray(value.scrollingBarItems)
              ? value.scrollingBarItems
              : typeof value.data === "object" && value.data && Array.isArray((value.data as { data?: unknown }).data)
                ? (value.data as { data: unknown[] }).data
                : [];
};

const extractItemText = (item: ApiScrollingBarItem) =>
  stringValue(item.scrollingText) ??
  stringValue(item.offerText) ??
  stringValue(item.message) ??
  stringValue(item.text) ??
  stringValue(item.title) ??
  stringValue(item.name) ??
  stringValue(item.description) ??
  stringValue(item.content) ??
  stringValue(item.label);

const extractScrollingBarItems = (payload: unknown): ScrollingBarItem[] =>
  extractList(payload)
    .map((item, index) => {
      const scrollingItem = item as ApiScrollingBarItem;
      const text = typeof item === "string" ? stringValue(item) : extractItemText(scrollingItem);
      const id = stringValue(scrollingItem._id) ?? stringValue(scrollingItem.id) ?? `${index}-${text ?? ""}`;
      const sortOrder = Number(
        scrollingItem.indexPosition ?? scrollingItem.sortOrder ?? scrollingItem.order ?? scrollingItem.position ?? index,
      );

      return {
        id,
        text: text ?? "",
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
      };
    })
    .filter((item) => item.text)
    .sort((a, b) => a.sortOrder - b.sortOrder);

export const getPublishedScrollingBarItems = async (): Promise<ScrollingBarItem[]> => {
  const payload = await apiClient.get(SCROLLING_BAR_ITEMS_ENDPOINT, {
    query: { accountTypeId: ACCOUNT_TYPE_ID },
  });
  return extractScrollingBarItems(payload);
};

export const usePublishedScrollingBarItems = (enabled = true) =>
  useQuery({
    queryKey: ["published-scrolling-bar-items", ACCOUNT_TYPE_ID],
    queryFn: getPublishedScrollingBarItems,
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
