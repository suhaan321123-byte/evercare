import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MapPin,
  Clock,
  Truck,
  Store,
  Plus,
  CreditCard,
  Loader2,
  Mail,
  ShoppingCart,
} from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSheet from "@/components/CartSheet";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { getBackendBaseUrl } from "@/lib/backendUrl";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import {
  addCustomerBillingAddress,
  addCustomerDeliveryAddress,
  getCustomerBillingAddresses,
  getCustomerDeliveryAddresses,
  type DeliveryAddress,
} from "@/lib/deliveryAddressApi";
import { apiClient } from "@/lib/apiClient";
import { money, taxIncludedPriceForProduct } from "@/lib/pricing";
import { sendWebsiteEmailOtp, verifyWebsiteEmailOtp } from "@/lib/emailAuthApi";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import {
  trackBeginCheckout,
  trackCheckoutProgress,
  trackPurchase,
} from "@/lib/analytics";
import { Switch } from "@/components/ui/switch";
import { setCustomerToken } from "@/utils/tokenKey";
import { encryptData } from "@/utils/cryptoJS/cryptoJs";
// pickup dispatch points are resolved in CartContext

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on?: (eventName: string, handler: (response: any) => void) => void;
    };
  }
}

const getErrorMessage = (err: any) =>
  err ? err?.response?.data?.message || err.message : "Please try again";

const isAuthError = (value: unknown) => {
  const code =
    typeof value === "object" && value !== null && "code" in value
      ? String((value as { code?: unknown }).code || "")
      : "";
  const message = getErrorMessage(value);

  return (
    code === "TOKEN_EXPIRED" ||
    code === "TOKEN_INVALID" ||
    code === "NO_TOKEN" ||
    /token expired|unauthorized|no token/i.test(message)
  );
};

function extractMongoObjectId(value: unknown) {
  const s = String(value || "").trim();
  const match = s.match(/[a-f0-9]{24}/i);
  return match ? match[0] : "";
}

const LAST_ORDER_STORAGE_KEY = "ecom:last_order:v1";
const STRIPE_PENDING_ORDER_STORAGE_KEY = "ecom:pending_stripe_checkout:v1";
const CHECKOUT_DRAFT_STORAGE_KEY = "ecom:checkout_draft:v1";
const TEMPLATE_WEBSITE_SUBDOMAIN = "evercare-two.vercel.app";
// window.location.hostname || "template-e-commerce-7-5-26.vercel.app";
const SPECIAL_DELIVERY_PINCODE_RULES = [
  {
    pincodes: new Set(["2444", "2445", "2446"]),
    message:
      "🚚 Port Macquarie & Wauchope: Daily Quick Delivery (12 PM) for orders ₹99+. Orders below ₹99 delivered Saturday 4:30–7:00 PM.",
  },
  {
    pincodes: new Set(["2450", "2452", "2447"]),
    message:
      "🚚 Coffs Harbour Delivery every Saturday at 12:00 PM. Place your order before 11:00 AM Saturday. FREE delivery on orders ₹99+.",
  },
] as const;
const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const EXTERNAL_CHECKOUT_LAYER_RELEASE_MS = 250;

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), {
        once: true,
      });
      existingScript.addEventListener("error", () => resolve(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const waitForExternalCheckoutLayerRelease = () =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    window.setTimeout(resolve, EXTERNAL_CHECKOUT_LAYER_RELEASE_MS);
  });

type DeliveryType = "delivery" | "pickup";
type PaymentMethod = "cod" | "online";
type EmailLoginStep = "buttons" | "email" | "otp";
type AddressKind = "billing" | "shipping";
type AddressField =
  | "firstName"
  | "email"
  | "phone"
  | "address"
  | "city"
  | "state"
  | "pincode"
  | "addressSelection";
type CheckoutFieldErrors = Partial<
  Record<`${AddressKind}.${AddressField}` | "pickup.location", string>
>;

type CheckoutDraft = {
  deliveryType?: DeliveryType;
  selectedBillingAddress?: string;
  selectedShippingAddress?: string;
  useBillingAsShipping?: boolean;
  pickupDate?: string;
  pickupTime?: string;
  couponCode?: string;
  appliedCouponCode?: string;
  appliedCouponMeta?: { code: string; discountAmount: number } | null;
  newBillingAddress?: Partial<Address>;
  newShippingAddress?: Partial<Address>;
};

interface Address {
  id: string;
  type: "billing" | "shipping";
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

const mapDeliveryAddressToCheckoutAddress = (
  address: DeliveryAddress,
  fallbackType: "billing" | "shipping",
): Address => ({
  id: String(address._id),
  type: fallbackType,
  name: String(address.fullName || address.name || "Address"),
  firstName:
    String(address.fullName || address.name || "")
      .trim()
      .split(/\s+/)[0] || "",
  lastName: String(address.fullName || address.name || "")
    .trim()
    .split(/\s+/)
    .slice(1)
    .join(" "),
  email: address.email ? String(address.email) : "",
  phone: `${address.countryCode || ""}${address.phone || ""}`.trim(),
  address: String(address.addressLine1 || ""),
  city: String(address.city || ""),
  state: String(address.state || ""),
  pincode: String(address.pincode || ""),
});

const combineName = (
  firstName?: string,
  lastName?: string,
  fallbackName?: string,
) => {
  const combined = [firstName, lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");

  return combined || String(fallbackName || "").trim();
};

type PickupDispatchPoint = {
  _id?: string;
  id?: string;
  name?: string;
  address?: string;
  pincode?: string;
  contactPerson?: string;
  countryCode?: string;
  phone?: string;
  operatingHours?: string;
  lat?: string;
  lng?: string;
  locationAddress?: unknown;
  isActive?: boolean;
};

type PickupLocationGroup = {
  dispatchPoint: PickupDispatchPoint;
};

type ShippingIssue = {
  message?: string;
  productsIds?: string[];
};

type CheckoutTotalSummary = {
  subtotal: number;
  itemDiscount?: number;
  totalDiscount: number;
  promotionDiscount?: number;
  totalGst?: number;
  tax?: number;
  promotion?: {
    valid?: boolean;
    code?: string;
    message?: string;
    discountAmount?: number;
    itemDiscounts?: Array<{
      lineId?: string;
      itemId?: string;
      groupId?: string;
      catalogId?: string;
      key?: string;
      discountAmount?: number;
    }>;
  } | null;
  shippingCost: number;
  total: number;
  isShippingAvailable: boolean;
  isExpressDeliveryAvailable?: boolean;
  message?: string;
  shippingIssues?: Array<{ message: string; productsIds?: any[] }>;
  shippingMethod?: string;
  zoneNote?: string;
  zoneNotes?: string[];
  expressDeliveryMessage?: string;
  expressDeliveryMessages?: string[];
  shippingTax?: {
    enabled?: boolean;
    includedInRates?: boolean;
    percentage?: number;
    amount?: number;
    costExclTax?: number;
    costInclTax?: number;
  } | null;
  display?: {
    subtotal?: number;
    finalBeforeShipping?: number;
    savings?: number;
    couponDiscount?: number;
    shipping?: number;
    total?: number;
  } | null;
};

const normalizePickupDispatchPoint = (
  value: unknown,
): PickupDispatchPoint | null => {
  if (!value) return null;

  if (typeof value === "string") {
    const id = value.trim();
    return id ? { _id: id, id } : null;
  }

  if (typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = String(raw._id ?? raw.id ?? "").trim();
  if (!id) return null;

  return {
    _id: id,
    id,
    name: typeof raw.name === "string" ? raw.name : "",
    address: typeof raw.address === "string" ? raw.address : "",
    pincode: typeof raw.pincode === "string" ? raw.pincode : "",
    contactPerson:
      typeof raw.contactPerson === "string" ? raw.contactPerson : "",
    countryCode: typeof raw.countryCode === "string" ? raw.countryCode : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    operatingHours:
      typeof raw.operatingHours === "string" ? raw.operatingHours : "",
    lat: typeof raw.lat === "string" ? raw.lat : "",
    lng: typeof raw.lng === "string" ? raw.lng : "",
    locationAddress: raw.locationAddress ?? null,
    isActive: raw.isActive !== false,
  };
};

const hasPickupDispatchPointDetails = (value: unknown) => {
  const dispatchPoint = normalizePickupDispatchPoint(value);
  if (!dispatchPoint) return false;

  return Boolean(
    String(dispatchPoint.name || "").trim() ||
    String(dispatchPoint.address || "").trim() ||
    String(dispatchPoint.pincode || "").trim() ||
    String(dispatchPoint.phone || "").trim() ||
    String(dispatchPoint.operatingHours || "").trim() ||
    dispatchPoint.locationAddress,
  );
};

const formatPickupDispatchPointLine = (dispatchPoint: PickupDispatchPoint) => {
  const formattedAddress =
    dispatchPoint.locationAddress &&
    typeof dispatchPoint.locationAddress === "object"
      ? String(
          (dispatchPoint.locationAddress as { formatted_address?: string })
            .formatted_address || "",
        ).trim()
      : "";
  const addressLine = String(dispatchPoint.address || formattedAddress).trim();
  const cityStatePincode = [dispatchPoint.pincode].filter(Boolean).join(" ");

  return {
    title: String(
      dispatchPoint.name ||
        dispatchPoint.contactPerson ||
        dispatchPoint.address ||
        "Pickup location",
    ).trim(),
    address: addressLine,
    contact: String(dispatchPoint.phone || "").trim(),
    extra: [String(dispatchPoint.operatingHours || "").trim(), cityStatePincode]
      .filter(Boolean)
      .join(" • "),
  };
};

const getAddressPreviewLine = (address: Address) =>
  [
    String(address.address || "").trim(),
    String(address.city || "").trim(),
    String(address.state || "").trim(),
    String(address.pincode || "").trim(),
  ]
    .filter(Boolean)
    .join(", ");

const getAddressPayloadLine = (address?: {
  fullName?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) =>
  [
    String(address?.fullName || "").trim(),
    String(address?.addressLine1 || "").trim(),
    String(address?.city || "").trim(),
    String(address?.state || "").trim(),
    String(address?.pincode || "").trim(),
  ]
    .filter(Boolean)
    .join(", ");

type AddressOptionRowProps = {
  address: Address;
  radioId: string;
  selected: boolean;
};

const AddressOptionRow = ({
  address,
  radioId,
  selected,
}: AddressOptionRowProps) => (
  <div className="flex items-start space-x-2">
    <RadioGroupItem value={address.id} id={radioId} className="mt-1" />
    <Label htmlFor={radioId} className="flex-1 cursor-pointer">
      <div
        className={[
          "border rounded-lg p-4 transition-colors",
          selected ? "bg-muted/60 ring-1 ring-primary/10" : "hover:bg-muted/50",
        ].join(" ")}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="font-medium">{address.name}</div>
            <div className="text-sm mt-1 text-muted-foreground">
              {selected
                ? getAddressPreviewLine(address) ||
                  "Address details not available"
                : String(address.address || "").trim() || "Address line 1"}
            </div>
            {selected ? (
              <>
                {address.email ? (
                  <div className="text-sm text-muted-foreground">
                    {address.email}
                  </div>
                ) : null}
                {address.phone ? (
                  <div className="text-sm text-muted-foreground">
                    {address.phone}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {address.isDefault && <Badge variant="secondary">Default</Badge>}
            {selected && <Badge variant="outline">Selected</Badge>}
          </div>
        </div>
      </div>
    </Label>
  </div>
);

const getPickupGoogleMapsUrl = (dispatchPoint: PickupDispatchPoint) => {
  const lat = String(dispatchPoint.lat || "").trim();
  const lng = String(dispatchPoint.lng || "").trim();
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  const formattedAddress =
    dispatchPoint.locationAddress &&
    typeof dispatchPoint.locationAddress === "object"
      ? String(
          (dispatchPoint.locationAddress as { formatted_address?: string })
            .formatted_address || "",
        ).trim()
      : "";
  const query = String(
    dispatchPoint.address || formattedAddress || dispatchPoint.name || "",
  ).trim();
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : "";
};

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stripeVerificationStarted = useRef(false);
  const stripeReturnHandled = useRef("");
  const checkoutStartedRef = useRef(false);
  const [checkoutDraftHydrated, setCheckoutDraftHydrated] = useState(false);
  const isMobile = useIsMobile();
  const { items, count, clear } = useCart();
  const { toast } = useToast();
  const {
    hydrated: authHydrated,
    isLoggedIn,
    session,
    logout,
    setSession,
  } = useCustomerAuth();
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [selectedBillingAddress, setSelectedBillingAddress] =
    useState<string>("new");
  const [selectedShippingAddress, setSelectedShippingAddress] =
    useState<string>("new");
  const [useBillingAsShipping, setUseBillingAsShipping] = useState(true);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [verifyingStripePayment, setVerifyingStripePayment] = useState(() =>
    Boolean(
      !String(searchParams.get("payment_cancelled") || "").trim() &&
      String(searchParams.get("stripe_session_id") || "").trim() &&
      String(searchParams.get("paymentAttemptId") || "").trim(),
    ),
  );
  const [emailLoginOpen, setEmailLoginOpen] = useState(false);
  const [emailLoginStep, setEmailLoginStep] =
    useState<EmailLoginStep>("buttons");
  const [emailLoginLoading, setEmailLoginLoading] = useState(false);
  const [emailLoginEmail, setEmailLoginEmail] = useState("");
  const [emailLoginOtp, setEmailLoginOtp] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  // No demo addresses – start empty; load real saved addresses for logged-in customers.
  const [billingSavedAddresses, setBillingSavedAddresses] = useState<Address[]>(
    [],
  );
  const [shippingSavedAddresses, setShippingSavedAddresses] = useState<
    Address[]
  >([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [checkoutSummary, setCheckoutSummary] =
    useState<CheckoutTotalSummary | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponBlockMessage, setCouponBlockMessage] = useState("");
  const [appliedCouponMeta, setAppliedCouponMeta] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);

  const [newBillingAddress, setNewBillingAddress] = useState<Partial<Address>>({
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [newShippingAddress, setNewShippingAddress] = useState<
    Partial<Address>
  >({
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const checkoutAddressDraftRef = useRef({
    selectedBillingAddress: "new",
    selectedShippingAddress: "new",
    newBillingAddress: {} as Partial<Address>,
    newShippingAddress: {} as Partial<Address>,
  });

  const [isExpressDelivery, setIsExpressDelivery] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const isExpressDeliveryAvailable = Boolean(
    checkoutSummary?.isExpressDeliveryAvailable,
  );

  const hasAddressDraftValue = (address: Partial<Address>) =>
    Boolean(
      String(address.firstName || "").trim() ||
      String(address.lastName || "").trim() ||
      String(address.name || "").trim() ||
      String(address.email || "").trim() ||
      String(address.phone || "").trim() ||
      String(address.address || "").trim() ||
      String(address.city || "").trim() ||
      String(address.state || "").trim() ||
      String(address.pincode || "").trim(),
    );

  const clearFieldError = (kind: AddressKind, field: AddressField) => {
    const key = `${kind}.${field}` as const;
    setFieldErrors((prev) => {
      if (!prev[key] && !prev[`${kind}.addressSelection`]) return prev;
      const next = { ...prev };
      delete next[key];
      delete next[`${kind}.addressSelection`];
      return next;
    });
  };

  const updateDraftField = (
    kind: AddressKind,
    field: keyof Address,
    value: string,
  ) => {
    clearFieldError(kind, field as AddressField);
    if (kind === "billing") {
      setNewBillingAddress((prev) => ({ ...prev, [field]: value }));
    } else {
      setNewShippingAddress((prev) => ({ ...prev, [field]: value }));
    }
  };

  const updateSelectedAddress = (kind: AddressKind, value: string) => {
    clearFieldError(kind, "addressSelection");
    if (kind === "billing") {
      setSelectedBillingAddress(value);
    } else {
      setSelectedShippingAddress(value);
    }
  };

  const getFieldError = (kind: AddressKind, field: AddressField) =>
    fieldErrors[`${kind}.${field}`];

  const getFieldErrorClass = (kind: AddressKind, field: AddressField) =>
    getFieldError(kind, field)
      ? "border-destructive focus-visible:ring-destructive"
      : "";

  const renderFieldError = (kind: AddressKind, field: AddressField) => {
    const error = getFieldError(kind, field);
    return error ? (
      <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
    ) : null;
  };

  const updateDraftName = (
    kind: AddressKind,
    field: "firstName" | "lastName",
    value: string,
  ) => {
    if (field === "firstName") clearFieldError(kind, "firstName");
    const updater = (prev: Partial<Address>) => {
      const next = { ...prev, [field]: value };
      return {
        ...next,
        name: combineName(next.firstName, next.lastName, next.name),
      };
    };

    if (kind === "billing") {
      setNewBillingAddress(updater);
    } else {
      setNewShippingAddress(updater);
    }
  };

  const renderNameFields = (kind: "billing" | "shipping", idPrefix: string) => {
    const draft = kind === "billing" ? newBillingAddress : newShippingAddress;

    return (
      <>
        <div>
          <Label htmlFor={`${idPrefix}-first-name`}>First Name</Label>
          <Input
            id={`${idPrefix}-first-name`}
            value={draft.firstName || ""}
            onChange={(e) => updateDraftName(kind, "firstName", e.target.value)}
            placeholder="First name"
            className={getFieldErrorClass(kind, "firstName")}
          />
          {renderFieldError(kind, "firstName")}
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-last-name`}>Last Name</Label>
          <Input
            id={`${idPrefix}-last-name`}
            value={draft.lastName || ""}
            onChange={(e) => updateDraftName(kind, "lastName", e.target.value)}
            placeholder="Last name"
          />
        </div>
      </>
    );
  };

  const saveCheckoutDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    const draft: CheckoutDraft = {
      deliveryType,
      selectedBillingAddress,
      selectedShippingAddress,
      useBillingAsShipping,
      pickupDate,
      pickupTime,
      couponCode,
      appliedCouponCode,
      appliedCouponMeta,
      newBillingAddress,
      newShippingAddress,
    };
    try {
      window.sessionStorage.setItem(
        CHECKOUT_DRAFT_STORAGE_KEY,
        JSON.stringify(draft),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    deliveryType,
    selectedBillingAddress,
    selectedShippingAddress,
    useBillingAsShipping,
    pickupDate,
    pickupTime,
    couponCode,
    appliedCouponCode,
    appliedCouponMeta,
    newBillingAddress,
    newShippingAddress,
  ]);

  const clearCheckoutDraft = () => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
      const draft = raw ? (JSON.parse(raw) as CheckoutDraft) : null;
      if (draft && typeof draft === "object") {
        // Store pickup is no longer offered at checkout. Older saved drafts
        // may still contain "pickup", so always restore delivery instead.
        setDeliveryType("delivery");
        setSelectedBillingAddress(draft.selectedBillingAddress || "new");
        setSelectedShippingAddress(draft.selectedShippingAddress || "new");
        setUseBillingAsShipping(draft.useBillingAsShipping ?? true);
        setPickupDate(String(draft.pickupDate || ""));
        setPickupTime(String(draft.pickupTime || ""));
        setCouponCode(String(draft.couponCode || ""));
        setAppliedCouponCode(String(draft.appliedCouponCode || ""));
        setAppliedCouponMeta(draft.appliedCouponMeta || null);
        setNewBillingAddress((prev) => ({
          ...prev,
          ...(draft.newBillingAddress || {}),
        }));
        setNewShippingAddress((prev) => ({
          ...prev,
          ...(draft.newShippingAddress || {}),
        }));
      }
    } catch {
      // Ignore invalid draft data.
    } finally {
      setCheckoutDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!checkoutDraftHydrated) return;
    saveCheckoutDraft();
    checkoutAddressDraftRef.current = {
      selectedBillingAddress,
      selectedShippingAddress,
      newBillingAddress,
      newShippingAddress,
    };
  }, [
    checkoutDraftHydrated,
    deliveryType,
    selectedBillingAddress,
    selectedShippingAddress,
    newBillingAddress,
    newShippingAddress,
    saveCheckoutDraft,
  ]);

  const hasShippingUnavailableItems = items.some(
    (item) => item.shippingAvailable !== true,
  );
  const shippingSupported = items.every(
    (item) => item.shippingAvailable === true,
  );
  const pickupSupported = false;
  const hasFulfillmentOptions = shippingSupported || pickupSupported;
  const billingOnly = !hasFulfillmentOptions;
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingAvailabilityMessage, setShippingAvailabilityMessage] =
    useState<string>("");
  const [shippingIssues, setShippingIssues] = useState<ShippingIssue[]>([]);
  const summaryDisplay =
    checkoutSummary?.display && typeof checkoutSummary.display === "object"
      ? checkoutSummary.display
      : null;
  const promotion = checkoutSummary?.promotion || null;
  const displaySubtotal = Number(summaryDisplay?.subtotal ?? 0) || 0;
  const promotionDiscount =
    Number(
      summaryDisplay?.couponDiscount ?? checkoutSummary?.promotionDiscount ?? 0,
    ) || 0;
  const displayShippingCost =
    Number(summaryDisplay?.shipping ?? checkoutSummary?.shippingCost ?? 0) || 0;
  const totalSavings = Number(summaryDisplay?.savings ?? 0) || 0;
  const finalTotal =
    Number(summaryDisplay?.total ?? checkoutSummary?.total ?? 0) || 0;
  const zoneNotes = useMemo(() => {
    const values = Array.isArray(checkoutSummary?.zoneNotes)
      ? checkoutSummary.zoneNotes
      : checkoutSummary?.zoneNote
        ? [checkoutSummary.zoneNote]
        : [];

    return Array.from(
      new Set(
        values.map((value) => String(value || "").trim()).filter(Boolean),
      ),
    );
  }, [checkoutSummary?.zoneNote, checkoutSummary?.zoneNotes]);
  const expressDeliveryMessages = useMemo(() => {
    const values = Array.isArray(checkoutSummary?.expressDeliveryMessages)
      ? checkoutSummary.expressDeliveryMessages
      : checkoutSummary?.expressDeliveryMessage
        ? [checkoutSummary.expressDeliveryMessage]
        : [];

    return Array.from(
      new Set(
        values.map((value) => String(value || "").trim()).filter(Boolean),
      ),
    );
  }, [
    checkoutSummary?.expressDeliveryMessage,
    checkoutSummary?.expressDeliveryMessages,
  ]);

  useEffect(() => {
    if (!isExpressDeliveryAvailable && isExpressDelivery) {
      setIsExpressDelivery(false);
    }
  }, [isExpressDeliveryAvailable, isExpressDelivery]);
  const checkoutAnalyticsPayload = useMemo(
    () => ({
      value: finalTotal,
      currency: "INR",
      items_count: items.length,
      cart_quantity: count,
    }),
    [count, finalTotal, items.length],
  );

  useEffect(() => {
    if (items.length === 0 || checkoutStartedRef.current) return;
    checkoutStartedRef.current = true;
    trackBeginCheckout(checkoutAnalyticsPayload);
  }, [checkoutAnalyticsPayload, items.length]);

  const shippingIssuesByProductId = useMemo(() => {
    const map = new Map<string, string[]>();

    shippingIssues.forEach((issue) => {
      const message = String(issue.message || "Shipping not available").trim();
      (Array.isArray(issue.productsIds) ? issue.productsIds : []).forEach(
        (productId) => {
          const key = String(productId || "").trim();
          if (!key) return;
          const next = map.get(key) || [];
          if (!next.includes(message)) next.push(message);
          map.set(key, next);
        },
      );
    });

    return map;
  }, [shippingIssues]);

  const pickupDispatchPointGroups = useMemo(() => {
    const groups = new Map<string, PickupLocationGroup>();
    const awaitingResolution = items.some((item) => {
      if (item.storePickupAvailable !== true) return false;
      const directDispatchPoint = normalizePickupDispatchPoint(
        item.storePickupDispatchPoint,
      );
      const dispatchPoint = hasPickupDispatchPointDetails(directDispatchPoint)
        ? directDispatchPoint
        : null;
      return !dispatchPoint;
    });

    for (const item of items) {
      if (item.storePickupAvailable !== true) continue;
      const directDispatchPoint = normalizePickupDispatchPoint(
        item.storePickupDispatchPoint,
      );
      const dispatchPoint = hasPickupDispatchPointDetails(directDispatchPoint)
        ? directDispatchPoint
        : null;
      if (!dispatchPoint) continue;

      const key = String(dispatchPoint._id || dispatchPoint.id || "").trim();
      if (!key) continue;

      if (!groups.has(key)) {
        groups.set(key, {
          dispatchPoint,
        });
      }
    }

    return {
      groups: Array.from(groups.values()),
      awaitingResolution,
    };
  }, [items]);

  const primaryPickupDispatchPoint =
    pickupDispatchPointGroups.groups[0]?.dispatchPoint || null;
  const primaryPickupDispatchPointPayload = primaryPickupDispatchPoint
    ? {
        dispatchPointId: String(
          primaryPickupDispatchPoint._id || primaryPickupDispatchPoint.id || "",
        ),
        name: String(
          primaryPickupDispatchPoint.name ||
            primaryPickupDispatchPoint.contactPerson ||
            "",
        ).trim(),
        address: String(primaryPickupDispatchPoint.address || "").trim(),
        pincode: String(primaryPickupDispatchPoint.pincode || "").trim(),
        countryCode: String(
          primaryPickupDispatchPoint.countryCode || "",
        ).trim(),
        phone: String(primaryPickupDispatchPoint.phone || "").trim(),
        operatingHours: String(
          primaryPickupDispatchPoint.operatingHours || "",
        ).trim(),
        contactPerson: String(
          primaryPickupDispatchPoint.contactPerson || "",
        ).trim(),
      }
    : null;

  const extractDispatchPointIds = (dispatchPoints: unknown): string[] => {
    if (!Array.isArray(dispatchPoints)) return [];
    return dispatchPoints
      .map((dispatchPoint) => {
        if (!dispatchPoint) return "";
        if (typeof dispatchPoint === "string") return dispatchPoint.trim();
        if (typeof dispatchPoint === "number") return String(dispatchPoint);
        const id =
          (
            dispatchPoint as {
              _id?: unknown;
              id?: unknown;
              dispatchPointId?: unknown;
            }
          )._id ??
          (
            dispatchPoint as {
              _id?: unknown;
              id?: unknown;
              dispatchPointId?: unknown;
            }
          ).id ??
          (
            dispatchPoint as {
              _id?: unknown;
              id?: unknown;
              dispatchPointId?: unknown;
            }
          ).dispatchPointId;
        return id ? String(id).trim() : "";
      })
      .filter(Boolean);
  };

  const getCommonDispatchPointId = useCallback(
    (cartItems: typeof items): string => {
      let common: Set<string> | null = null;
      for (const cartItem of cartItems || []) {
        const ids = new Set(
          extractDispatchPointIds(
            (cartItem as { dispatchPoints?: unknown }).dispatchPoints,
          ),
        );
        if (ids.size === 0) continue;
        common = common
          ? new Set([...common].filter((id) => ids.has(id)))
          : ids;
        if (common.size === 0) return "";
      }
      if (!common || common.size !== 1) return "";
      return [...common][0] || "";
    },
    [],
  );

  const renderPickupLocationCard = () => (
    <div className="border rounded-lg p-4 bg-muted/30">
      <h3 className="font-semibold mb-2">Pickup Location</h3>
      {pickupDispatchPointGroups.groups.length > 0 ? (
        <div className="space-y-3 text-sm">
          {pickupDispatchPointGroups.groups.map(({ dispatchPoint }) => {
            const details = formatPickupDispatchPointLine(dispatchPoint);
            return (
              <div
                key={String(dispatchPoint._id || dispatchPoint.id)}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="font-medium">{details.title}</div>
                {details.address ? <div>{details.address}</div> : null}
                {details.extra ? (
                  <div className="text-muted-foreground">{details.extra}</div>
                ) : null}
                {details.contact ? (
                  <div className="mt-1 text-muted-foreground">
                    Phone: {details.contact}
                  </div>
                ) : null}
                {getPickupGoogleMapsUrl(dispatchPoint) ? (
                  <a
                    href={getPickupGoogleMapsUrl(dispatchPoint)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Open in Google Maps
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {pickupDispatchPointGroups.awaitingResolution
            ? "Loading pickup location from the item dispatch point…"
            : "Pickup location will be shown once the item-level dispatch point is available."}
        </div>
      )}
      {fieldErrors["pickup.location"] ? (
        <p className="mt-2 text-xs font-medium text-destructive">
          {fieldErrors["pickup.location"]}
        </p>
      ) : null}
    </div>
  );

  const renderCouponBox = () => {
    const promotionMessage = String(promotion?.message || "").trim();
    const promotionValid = promotion?.valid !== false;

    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <Label htmlFor="checkout-coupon-code" className="text-sm font-semibold">
          Coupon Code
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="checkout-coupon-code"
            value={couponCode}
            onChange={(event) => {
              const nextValue = event.target.value;
              setCouponCode(nextValue);
              if (couponBlockMessage) setCouponBlockMessage("");
              setCheckoutSummary((prev) =>
                prev && prev.promotion && prev.promotion.valid === false
                  ? {
                      ...prev,
                      promotion: null,
                      promotionDiscount: 0,
                    }
                  : prev,
              );
              if (!nextValue.trim()) {
                setAppliedCouponCode("");
                setAppliedCouponMeta(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyCoupon();
              }
            }}
            placeholder="Enter coupon"
            className="uppercase"
          />
          {appliedCouponCode ? (
            <Button type="button" variant="outline" onClick={clearCoupon}>
              Clear
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => applyCoupon()}
              disabled={!couponCode.trim() || couponApplying}
            >
              {couponApplying ? "Applying..." : "Apply"}
            </Button>
          )}
        </div>
        {couponBlockMessage ? (
          <div className="mt-2 text-xs font-medium text-destructive">
            {couponBlockMessage}
          </div>
        ) : null}
        {promotion && promotion.valid === false ? (
          <div className="mt-2 text-xs font-medium text-destructive">
            {promotionMessage || "Invalid coupon code."}
          </div>
        ) : null}
        {/* {appliedCouponCode ? (
          <div className={`mt-2 text-xs font-medium ${promotionValid ? "text-accent" : "text-destructive"}`}>
            {promotionValid && promotionDiscount > 0
              ? `${appliedCouponCode} applied. You saved ${money(promotionDiscount)}.`
              : promotionMessage || "Coupon will be checked with the order total."}
          </div>
        ) : null} */}
      </div>
    );
  };

  useEffect(() => {
    if (billingOnly) return;
    if (!shippingSupported && pickupSupported) {
      setDeliveryType("pickup");
      return;
    }
    if (!pickupSupported && shippingSupported) {
      setDeliveryType("delivery");
    }
  }, [billingOnly, pickupSupported, shippingSupported]);

  const returnToCheckout = useMemo(
    () =>
      typeof window === "undefined"
        ? "/checkout"
        : `${window.location.pathname}${window.location.search}`,
    [],
  );

  const handleGoogleLogin = async () => {
    try {
      const origin = window.location.origin;
      const url = new URL(
        `${getBackendBaseUrl()}/auth/google/website/login/url`,
      );
      url.searchParams.set("origin", origin);
      url.searchParams.set("returnTo", returnToCheckout || "/checkout");
      const res = await fetch(url.toString(), { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || "Failed to start Google login");
      if (!json?.authUrl) throw new Error("Missing authUrl from server");
      saveCheckoutDraft();
      window.location.href = String(json.authUrl);
    } catch (err: unknown) {
      toast({
        title: "Google login failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  const handleEmailLogin = (
    prefillEmail?: string,
    initialStep: EmailLoginStep = "buttons",
  ) => {
    const nextEmail = String(prefillEmail || "")
      .trim()
      .toLowerCase();
    if (nextEmail) setEmailLoginEmail(nextEmail);
    setEmailLoginOpen(true);
    setEmailLoginStep(initialStep);
  };

  const handleSendEmailOtp = async () => {
    const value = String(emailLoginEmail || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }

    setEmailLoginLoading(true);
    try {
      const res = await sendWebsiteEmailOtp({
        email: value,
        origin: window.location.origin,
        returnTo: returnToCheckout || "/checkout",
        subdomain: window.location.hostname,
      });
      if ((res as { success?: boolean; message?: string })?.success === false) {
        throw new Error(
          (res as { message?: string })?.message || "Failed to send OTP",
        );
      }
      setEmailLoginStep("otp");
      toast({
        title: "OTP sent",
        description: "Check your email for the verification code.",
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to send OTP",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setEmailLoginLoading(false);
    }
  };

  const storeVerifiedSession = (values) => {
    const { expiration } = values;
    const sessionData = {
      ...values,
      expiresAt: new Date(Date.now() + expiration).toISOString(),
    };
    const encryptedData = encryptData(sessionData);
    localStorage.setItem("chatSession", JSON.stringify(encryptedData));
    document.cookie = `chatSession=${JSON.stringify(
      encryptedData,
    )}; Secure; SameSite=Strict; max-age=${expiration / 1000}`;
  };

  const handleVerifyEmailOtp = async () => {
    const value = String(emailLoginEmail || "")
      .trim()
      .toLowerCase();
    const code = String(emailLoginOtp || "").trim();
    if (!code) {
      toast({ title: "Enter OTP", variant: "destructive" });
      return;
    }

    setEmailLoginLoading(true);
    try {
      const res = await verifyWebsiteEmailOtp({
        email: value,
        otp: code,
        origin: window.location.origin,
        returnTo: returnToCheckout || "/checkout",
        subdomain: window.location.hostname,
      });
      if ((res as { success?: boolean; message?: string })?.success === false) {
        throw new Error(
          (res as { message?: string })?.message || "OTP verification failed",
        );
      }
      if (!res?.token || !res?.customerId) {
        throw new Error("Login failed");
      }

      setSession({
        token: res.token,
        customerId: res.customerId,
        email: res.customerData?.email || value,
        name: res.customerData?.name,
        image: res.customerData?.image,
        ...res.customerData,
        createdAt: Date.now(),
      });
      const sessionData = {
        customerId: res.customerId,
        hostname: window.location.hostname,
        expiration: 240 * 60 * 60 * 1000,
        ...res?.customerData,
      };
      storeVerifiedSession(sessionData);
      setCustomerToken(res.token);
      
      setEmailLoginOpen(false);
      setEmailLoginStep("email");
      setEmailLoginOtp("");
      toast({ title: "Logged in" });
    } catch (err: unknown) {
      toast({
        title: "OTP verification failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setEmailLoginLoading(false);
    }
  };

  const handleOrderAuthExpired = () => {
    const billing = getSelectedAddress("billing");
    const email = String(billing?.email || session?.email || "").trim();

    logout();
    setPlacingOrder(false);
    handleEmailLogin(email, "buttons");
    toast({
      title: "Login required",
      description: "Please log in to place your order.",
      variant: "destructive",
    });
  };

  useEffect(() => {
    const stripeSessionId = String(
      searchParams.get("stripe_session_id") || "",
    ).trim();
    const paymentAttemptId = String(
      searchParams.get("paymentAttemptId") || "",
    ).trim();
    const paymentCancelled = String(
      searchParams.get("payment_cancelled") || "",
    ).trim();

    const clearStripeSearchParams = () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("stripe_session_id");
      nextParams.delete("paymentAttemptId");
      nextParams.delete("payment_cancelled");
      const query = nextParams.toString();
      navigate(
        query
          ? `${window.location.pathname}?${query}`
          : window.location.pathname,
        { replace: true },
      );
    };

    if (paymentCancelled === "stripe") {
      const cancelKey = `cancel:${paymentAttemptId || "stripe"}`;
      if (stripeReturnHandled.current === cancelKey) return;
      stripeReturnHandled.current = cancelKey;

      stripeVerificationStarted.current = false;
      setVerifyingStripePayment(false);
      setPlacingOrder(false);
      window.sessionStorage.removeItem(STRIPE_PENDING_ORDER_STORAGE_KEY);
      clearStripeSearchParams();
      toast({
        title: "Payment cancelled",
        description:
          "Your cart is still available. You can try online payment again.",
      });
      return;
    }

    if (
      !stripeSessionId ||
      !paymentAttemptId ||
      stripeVerificationStarted.current
    )
      return;

    stripeReturnHandled.current = `verify:${paymentAttemptId}`;
    stripeVerificationStarted.current = true;
    (async () => {
      try {
        setVerifyingStripePayment(true);
        setPlacingOrder(true);
        const json = await apiClient.post<any>(
          "/business_website/chat_widget/verify_payment_create_order",
          {
            stripe_session_id: stripeSessionId,
            paymentAttemptId,
          },
        );

        if (!json?.success) {
          throw new Error(
            json?.message || "Stripe payment verification failed",
          );
        }

        const orderId = String(json?.orderIds?.[0] || json?.orderId || "");
        let pendingOrder: any = {};
        try {
          pendingOrder = JSON.parse(
            window.sessionStorage.getItem(STRIPE_PENDING_ORDER_STORAGE_KEY) ||
              "{}",
          );
        } catch {
          pendingOrder = {};
        }
        trackPurchase({
          transaction_id: orderId || paymentAttemptId,
          value:
            Number(pendingOrder?.total ?? pendingOrder?.finalTotal ?? 0) || 0,
          currency: "INR",
          payment_method: "online",
          gateway: "stripe",
        });

        window.sessionStorage.setItem(
          LAST_ORDER_STORAGE_KEY,
          JSON.stringify({
            orderId,
            paymentMethod: "online",
            finalAmount: pendingOrder?.finalAmount,
            name: pendingOrder?.name,
            email: pendingOrder?.email,
            deliveryType: pendingOrder?.deliveryType,
            billingAddressLine: pendingOrder?.billingAddressLine,
            shippingAddressLine: pendingOrder?.shippingAddressLine,
            pickupDateTime: pendingOrder?.pickupDateTime,
            couponCode: pendingOrder?.couponCode,
            itemCount: pendingOrder?.itemCount,
          }),
        );
        window.sessionStorage.removeItem(STRIPE_PENDING_ORDER_STORAGE_KEY);

        clearCheckoutDraft();
        clear();
        clearStripeSearchParams();
        navigate(`/order-success?orderId=${encodeURIComponent(orderId)}`, {
          replace: true,
        });
      } catch (err: unknown) {
        console.error(err);
        window.sessionStorage.removeItem(STRIPE_PENDING_ORDER_STORAGE_KEY);
        clearStripeSearchParams();
        toast({
          title: "Payment verification failed",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      } finally {
        setVerifyingStripePayment(false);
        setPlacingOrder(false);
      }
    })();
  }, [clear, navigate, searchParams, toast]);

  const handleProceedToPay = () => {
    const billing = getSelectedAddress("billing");
    const shipping =
      !billingOnly && deliveryType === "delivery"
        ? getSelectedAddress("shipping")
        : null;

    if (hasShippingUnavailableItems) {
      toast({
        title: "Shipping not available",
        description:
          "Remove shipping unavailable items before proceeding to pay.",
        variant: "destructive",
      });
      return;
    }

    if (!validateCheckoutFields()) {
      toast({
        title: "Required fields missing",
        description: "Please fill the highlighted checkout fields.",
        variant: "destructive",
      });
      return;
    }

    if (!authHydrated) {
      toast({
        title: "Checking login",
        description: "Please wait a moment and try again.",
      });
      return;
    }

    if (!session?.token) {
      handleEmailLogin(billing?.email, "buttons");
      toast({
        title: "Login required",
        description: "Please log in before proceeding to payment.",
      });
      return;
    }

    trackCheckoutProgress({
      ...checkoutAnalyticsPayload,
      step: "payment_selected",
      delivery_type: deliveryType,
      payment_method: paymentMethod,
    });
    placeOrder(paymentMethod);
  };

  const canProceedToPay = () => {
    const billing = getSelectedAddress("billing");
    const shipping =
      !billingOnly && deliveryType === "delivery"
        ? getSelectedAddress("shipping")
        : null;

    if (!isAddressComplete(billing)) return false;
    if (billingOnly) return true;
    if (deliveryType === "delivery" && shippingIssues.length > 0) return false;
    if (deliveryType === "delivery") return isAddressComplete(shipping);
    return true;
  };

  const isAddressComplete = (
    address: Partial<Address> | null | undefined,
    requirePhone = false,
  ) =>
    Boolean(
      String(address?.name || "").trim() &&
      String(address?.email || "").trim() &&
      (!requirePhone || String(address?.phone || "").trim()) &&
      String(address?.address || "").trim() &&
      String(address?.city || "").trim() &&
      String(address?.state || "").trim() &&
      String(address?.pincode || "").trim(),
    );

  const getAddressValidationErrors = (
    kind: AddressKind,
    address: Partial<Address> | null | undefined,
  ): CheckoutFieldErrors => {
    const errors: CheckoutFieldErrors = {};
    const label = kind === "billing" ? "billing" : "shipping";

    if (
      !address ||
      (address.id && address.id !== "new" && !isAddressComplete(address, false))
    ) {
      errors[`${kind}.addressSelection`] =
        `Select a complete ${label} address or add a new one.`;
      return errors;
    }

    if (!String(address?.name || "").trim())
      errors[`${kind}.firstName`] = "First name is required.";
    if (!String(address?.email || "").trim())
      errors[`${kind}.email`] = "Email is required.";
    if (
      (address?.id || "new") === "new" &&
      !String(address?.phone || "").trim()
    ) {
      errors[`${kind}.phone`] = "Phone number is required.";
    }
    if (!String(address?.address || "").trim())
      errors[`${kind}.address`] = "Address is required.";
    if (!String(address?.city || "").trim())
      errors[`${kind}.city`] = "City is required.";
    if (!String(address?.state || "").trim())
      errors[`${kind}.state`] = "State is required.";
    if (!String(address?.pincode || "").trim())
      errors[`${kind}.pincode`] = "Pincode is required.";

    return errors;
  };

  const validateCheckoutFields = () => {
    const billing = getSelectedAddress("billing");
    const shipping =
      !billingOnly && deliveryType === "delivery"
        ? getSelectedAddress("shipping")
        : null;
    const nextErrors: CheckoutFieldErrors = {
      ...getAddressValidationErrors("billing", billing),
    };

    if (!billingOnly && deliveryType === "delivery") {
      Object.assign(
        nextErrors,
        getAddressValidationErrors("shipping", shipping),
      );
    }

    if (
      !billingOnly &&
      deliveryType === "pickup" &&
      !primaryPickupDispatchPointPayload
    ) {
      nextErrors["pickup.location"] = "Pickup location is required.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getSelectedAddress = (kind: "billing" | "shipping") => {
    if (
      kind === "shipping" &&
      useBillingAsShipping &&
      !billingOnly &&
      deliveryType === "delivery"
    ) {
      const billing = getSelectedAddress("billing");
      return billing
        ? {
            ...billing,
            id: billing.id || "billing-as-shipping",
            type: "shipping" as const,
          }
        : null;
    }

    const list = kind === "billing" ? billingAddresses : shippingAddresses;
    const selectedId =
      kind === "billing" ? selectedBillingAddress : selectedShippingAddress;
    const draft = kind === "billing" ? newBillingAddress : newShippingAddress;

    if (selectedId && selectedId !== "new") {
      return list.find((a) => a.id === selectedId) || null;
    }

    return {
      id: "new",
      type: kind,
      firstName: String(draft.firstName || "").trim(),
      lastName: String(draft.lastName || "").trim(),
      name: combineName(draft.firstName, draft.lastName, draft.name),
      email: String(draft.email || "").trim(),
      phone: String(draft.phone || "").trim(),
      address: String(draft.address || "").trim(),
      city: String(draft.city || "").trim(),
      state: String(draft.state || "").trim(),
      pincode: String(draft.pincode || "").trim(),
    } as Address;
  };

  const getItemShippingIssueMessages = (item: (typeof items)[number]) => {
    const lookupIds = new Set<string>();
    const rawId = String(item.id || "").trim();
    const isBogoOfferItem = Boolean((item as any)?.isBogoOfferItem);
    const selectedVariantId = String(
      isBogoOfferItem
        ? (item as any)?.bogoFreeGroupId ||
            (item as any)?.selectedVariantId ||
            ""
        : (item as any)?.selectedVariantId || "",
    ).trim();
    const bogoFreeProductId = String(
      (item as any)?.bogoFreeProductId || "",
    ).trim();

    if (rawId) {
      lookupIds.add(rawId);
      const extractedItemId = extractMongoObjectId(rawId);
      if (extractedItemId) lookupIds.add(extractedItemId);
    }

    if (bogoFreeProductId) {
      lookupIds.add(bogoFreeProductId);
      const extractedFreeProductId = extractMongoObjectId(bogoFreeProductId);
      if (extractedFreeProductId) lookupIds.add(extractedFreeProductId);
    }

    if (selectedVariantId) {
      lookupIds.add(selectedVariantId);
      const extractedVariantId = extractMongoObjectId(selectedVariantId);
      if (extractedVariantId) lookupIds.add(extractedVariantId);
    }

    const messages: string[] = [];
    lookupIds.forEach((id) => {
      const next = shippingIssuesByProductId.get(id) || [];
      next.forEach((message) => {
        if (!messages.includes(message)) messages.push(message);
      });
    });

    return messages;
  };

  const getShippingDetailDispatchPoints = () => {
    const seen = new Set<string>();
    const points: unknown[] = [];

    items.forEach((item) => {
      const list = Array.isArray((item as any)?.dispatchPoints)
        ? (item as any).dispatchPoints
        : [];
      list.forEach((dispatchPoint) => {
        const id = String(
          (
            dispatchPoint as {
              _id?: unknown;
              id?: unknown;
              dispatchPointId?: unknown;
            }
          )?._id ??
            (
              dispatchPoint as {
                _id?: unknown;
                id?: unknown;
                dispatchPointId?: unknown;
              }
            )?.id ??
            (
              dispatchPoint as {
                _id?: unknown;
                id?: unknown;
                dispatchPointId?: unknown;
              }
            )?.dispatchPointId ??
            dispatchPoint ??
            "",
        ).trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        points.push(dispatchPoint);
      });
    });

    if (!points.length && primaryPickupDispatchPointPayload) {
      points.push(primaryPickupDispatchPointPayload);
    }

    return points;
  };

  const normalizeCouponCode = (code: string) =>
    String(code || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");

  const getApiPricingForItem = (
    item: any,
    selectedVariant: any,
    isBogoOfferItem: boolean,
  ) => {
    const pricing =
      item?.pricing && typeof item.pricing === "object" ? item.pricing : {};
    if (isBogoOfferItem) {
      return {
        ...pricing,
        basePrice: 0,
        salePrice: 0,
      };
    }
    const taxRate =
      pricing?.taxApplicable === true && Number(pricing?.taxRate || 0) > 0
        ? Number(pricing.taxRate || 0) / 100
        : 0;
    const removeTax = (value: unknown) => {
      const amount = Number(value || 0) || 0;
      if (!taxRate) return amount;
      return Math.round((amount / (1 + taxRate)) * 100) / 100;
    };
    const rawBase = Number(pricing?.basePrice ?? selectedVariant?.basePrice);
    const rawSale = Number(pricing?.salePrice ?? selectedVariant?.salePrice);
    const basePrice =
      Number.isFinite(rawBase) && rawBase >= 0 ? rawBase : removeTax(item?.mrp);
    const salePrice = isBogoOfferItem
      ? 0
      : Number.isFinite(rawSale) && rawSale >= 0
        ? rawSale
        : removeTax(item?.price);
    const preorder =
      selectedVariant?.preorder ??
      selectedVariant?.preOrder ??
      item?.preorder ??
      item?.preOrder ??
      pricing?.preorder ??
      pricing?.preOrder ??
      false;
    const minQuantity =
      selectedVariant?.minQuantity ??
      selectedVariant?.minOrderQuantity ??
      item?.minQuantity ??
      item?.minOrderQuantity ??
      pricing?.minQuantity ??
      pricing?.minOrderQuantity ??
      undefined;
    const maxQuantity =
      selectedVariant?.maxQuantity ??
      selectedVariant?.maxOrderQuantity ??
      item?.maxQuantity ??
      item?.maxOrderQuantity ??
      pricing?.maxQuantity ??
      pricing?.maxOrderQuantity ??
      undefined;
    const orderRules =
      selectedVariant?.orderRules ??
      item?.orderRules ??
      pricing?.orderRules ??
      undefined;

    return {
      ...pricing,
      basePrice,
      salePrice,
      preorder,
      minQuantity,
      maxQuantity,
      ...(orderRules ? { orderRules } : {}),
    };
  };

  const getCheckoutItemLineIdentity = (item: (typeof items)[number]) => {
    const isBogoOfferItem = Boolean((item as any)?.isBogoOfferItem);
    const itemId = isBogoOfferItem
      ? String((item as any)?.bogoFreeProductId || "").trim()
      : extractMongoObjectId(item.id) || String(item.id || "");
    const groupId = isBogoOfferItem
      ? String((item as any)?.bogoFreeGroupId || "").trim()
      : String((item as any)?.selectedVariantId || "").trim() ||
        (() => {
          const parts = String(item.id || "").split("-");
          return parts.length > 1 ? extractMongoObjectId(parts[1]) : "";
        })();
    const catalogId = String(
      (item as any)?.catalogId || (item as any)?.catalogueId || "",
    ).trim();
    const lineId = `${itemId}:${groupId || "default"}`;

    return { itemId, groupId, catalogId, lineId };
  };

  const getCouponDiscountForItem = (item: (typeof items)[number]) => {
    if ((item as any)?.isBogoOfferItem || (item as any)?.isOfferItem) return 0;

    const itemDiscounts = Array.isArray(
      checkoutSummary?.promotion?.itemDiscounts,
    )
      ? checkoutSummary?.promotion?.itemDiscounts
      : [];
    if (!itemDiscounts.length) return 0;

    const identity = getCheckoutItemLineIdentity(item);
    const match = itemDiscounts.find((discount) => {
      const discountLineId = String(discount?.lineId || "").trim();
      if (discountLineId && discountLineId === identity.lineId) return true;

      const discountItemId = String(discount?.itemId || "").trim();
      const discountGroupId = String(discount?.groupId || "").trim();
      const discountCatalogId = String(discount?.catalogId || "").trim();
      const sameItem = discountItemId && discountItemId === identity.itemId;
      const sameGroup =
        !discountGroupId || discountGroupId === identity.groupId;
      const sameCatalog =
        !discountCatalogId ||
        !identity.catalogId ||
        discountCatalogId === identity.catalogId;
      return sameItem && sameGroup && sameCatalog;
    });

    return Math.max(0, Number(match?.discountAmount || 0) || 0);
  };

  const getDisplayLineTotals = (item: (typeof items)[number]) => {
    const isBogoOfferItem = Boolean((item as any)?.isBogoOfferItem);
    const saleUnitPrice = isBogoOfferItem
      ? taxIncludedPriceForProduct(item as any, Number(item.price || 0) || 0)
      : Number(item.price || 0) || 0;
    const baseUnitPrice = isBogoOfferItem
      ? taxIncludedPriceForProduct(
          item as any,
          Math.max(Number(item.mrp) || 0, Number(item.price) || 0),
        )
      : Math.max(Number(item.mrp) || 0, Number(item.price) || 0);
    const saleLineTotalBeforeCoupon = saleUnitPrice * item.qty;
    const couponDiscount = getCouponDiscountForItem(item);
    const saleLineTotal = Math.max(
      0,
      saleLineTotalBeforeCoupon - couponDiscount,
    );
    const baseLineTotal = baseUnitPrice * item.qty;

    return {
      saleLineTotal,
      baseLineTotal,
      couponDiscount,
      saleLineTotalBeforeCoupon,
      hasDiscount: baseLineTotal > saleLineTotal,
    };
  };

  const variantMatchesId = (variant: any, id = "") => {
    const targetId = String(id || "").trim();
    if (!targetId) return false;
    return [
      variant?._id,
      variant?.id,
      variant?.groupId,
      variant?.variantId,
      variant?.name,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .includes(targetId);
  };

  const buildProductsPayload = useCallback(
    () =>
      items.map((item) => {
        const isBogoOfferItem = Boolean((item as any)?.isBogoOfferItem);
        const baseItemId = isBogoOfferItem
          ? String((item as any)?.bogoFreeProductId || "").trim()
          : extractMongoObjectId(item.id) || String(item.id || "");
        const selectedVariantId = isBogoOfferItem
          ? String((item as any)?.bogoFreeGroupId || "").trim()
          : String((item as any)?.selectedVariantId || "").trim();
        const selectedVariant =
          selectedVariantId && Array.isArray((item as any)?.variants)
            ? (item as any).variants.find((variant: any) =>
                variantMatchesId(variant, selectedVariantId),
              ) || null
            : null;
        const pricing = getApiPricingForItem(
          item,
          selectedVariant,
          isBogoOfferItem,
        );

        return {
          _id: baseItemId,
          itemId: baseItemId,
          id: baseItemId,
          lineId: `${baseItemId}:${selectedVariantId || "default"}`,
          ...(selectedVariantId
            ? { groupId: selectedVariantId, variantId: selectedVariantId }
            : {}),
          catalogId:
            (item as any)?.catalogId || (item as any)?.catalogueId || "",
          catalogueId:
            (item as any)?.catalogueId || (item as any)?.catalogId || "",
          itemType: "product",
          quantity: item.qty,
          hasBogoOffer: Boolean(
            (item as any)?.hasBogoOffer ||
            (item as any)?.bogoApplied ||
            (item as any)?.isBogoApplied,
          ),
          isOfferItem: Boolean((item as any)?.isOfferItem),
          isBogoOfferItem,
          offerType: isBogoOfferItem ? (item as any)?.offerType || "bogo" : "",
          bogoPromotionId: isBogoOfferItem
            ? (item as any)?.bogoPromotionId || ""
            : "",
          bogoPromotionCode: isBogoOfferItem
            ? (item as any)?.bogoPromotionCode || ""
            : "",
          bogoSourceItemId: isBogoOfferItem
            ? (item as any)?.bogoSourceItemId || ""
            : "",
          bogoFreeProductId: isBogoOfferItem
            ? (item as any)?.bogoFreeProductId || ""
            : "",
          bogoFreeGroupId: isBogoOfferItem
            ? (item as any)?.bogoFreeGroupId || ""
            : "",
          bogoDiscountPercent: isBogoOfferItem
            ? Number((item as any)?.bogoDiscountPercent || 0) || 0
            : 0,
          pricing,
          shipping: {
            available: item.shippingAvailable === true,
            ...((item as any)?.shipping || {}),
          },
          preorder:
            (selectedVariant as any)?.preorder ??
            (selectedVariant as any)?.preOrder ??
            (item as any)?.preorder ??
            (item as any)?.preOrder ??
            (item as any)?.pricing?.preorder ??
            (item as any)?.pricing?.preOrder ??
            false,
          minQuantity:
            (selectedVariant as any)?.minQuantity ??
            (selectedVariant as any)?.minOrderQuantity ??
            (item as any)?.minQuantity ??
            (item as any)?.minOrderQuantity ??
            (item as any)?.pricing?.minQuantity ??
            (item as any)?.pricing?.minOrderQuantity ??
            undefined,
          maxQuantity:
            (selectedVariant as any)?.maxQuantity ??
            (selectedVariant as any)?.maxOrderQuantity ??
            (item as any)?.maxQuantity ??
            (item as any)?.maxOrderQuantity ??
            (item as any)?.pricing?.maxQuantity ??
            (item as any)?.pricing?.maxOrderQuantity ??
            undefined,
          orderRules:
            (selectedVariant as any)?.orderRules ??
            (item as any)?.orderRules ??
            (item as any)?.pricing?.orderRules ??
            undefined,
          dispatchPoints: Array.isArray((item as any)?.dispatchPoints)
            ? (item as any).dispatchPoints
            : [],
          variants: Array.isArray((item as any)?.variants)
            ? (item as any).variants
            : [],
          selectedVariant,
          name: item.name,
        };
      }),
    [items],
  );

  const applyCoupon = async (overrideCode?: string) => {
    const nextCode = normalizeCouponCode(overrideCode ?? couponCode);
    if (!nextCode) {
      toast({ title: "Enter coupon code", variant: "destructive" });
      return;
    }

    setCouponApplying(true);
    try {
      const res = await apiClient.post<any>(
        "/business_website/chat_widget/chat_widget_side_cart/preview_promotion",
        {
          subdomain: TEMPLATE_WEBSITE_SUBDOMAIN,
          customerId: session?.customerId ? String(session.customerId) : "",
          promotionCode: nextCode,
          products: buildProductsPayload(),
        },
      );
      const promotion = (res as any)?.data?.promotion;

      if (promotion?.valid) {
        const appliedCode = String(promotion?.code || nextCode);
        const discountAmount = Number(promotion?.discountAmount || 0) || 0;
        setAppliedCouponCode(appliedCode);
        setAppliedCouponMeta({ code: appliedCode, discountAmount });
        setCouponCode(appliedCode);
        toast({
          title: "Coupon applied",
          description: `Discount: ${money(discountAmount)}`,
        });
        return;
      }

      setAppliedCouponCode("");
      setAppliedCouponMeta(null);
      setCheckoutSummary((prev) =>
        prev
          ? {
              ...prev,
              promotion: promotion || {
                code: nextCode,
                valid: false,
                message: "Invalid coupon code.",
              },
              promotionDiscount: 0,
            }
          : prev,
      );
      toast({
        title: "Coupon not valid",
        description: promotion?.message || "Invalid coupon code.",
        variant: "destructive",
      });
    } catch (err: any) {
      setAppliedCouponCode("");
      setAppliedCouponMeta(null);
      toast({
        title: "Could not apply coupon",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCouponApplying(false);
    }
  };

  const clearCoupon = () => {
    setCouponCode("");
    setAppliedCouponCode("");
    setAppliedCouponMeta(null);
    setCouponBlockMessage("");
    setCheckoutSummary((prev) =>
      prev
        ? {
            ...prev,
            promotion: null,
            promotionDiscount: 0,
          }
        : prev,
    );
  };

  const saveNewAddressIfNeeded = async (kind: "billing" | "shipping") => {
    if (!authHydrated || !isLoggedIn || !session?.customerId) return;

    const selectedId =
      kind === "billing" ? selectedBillingAddress : selectedShippingAddress;
    if (selectedId !== "new") return;

    const draft = kind === "billing" ? newBillingAddress : newShippingAddress;
    const phoneDigits = String(draft.phone || "").replace(/[^\d]/g, "");
    const addressLine1 = String(draft.address || "").trim();
    const city = String(draft.city || "").trim();
    const state = String(draft.state || "").trim();
    const pincode = String(draft.pincode || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 20);

    if (!state) {
      toast({
        title: "State is required",
        description: "Enter state to save this address.",
        variant: "destructive",
      });
      return;
    }

    const existingAddresses =
      kind === "billing" ? billingAddresses : shippingAddresses;
    const duplicate = existingAddresses.some((address) => {
      const samePin = String(address?.pincode || "") === pincode;
      const sameLine =
        String(address?.address || "")
          .trim()
          .toLowerCase() === addressLine1.toLowerCase();
      return samePin && sameLine;
    });

    if (duplicate) return;

    try {
      const addressPayload = {
        type: kind,
        name: kind,
        fullName: combineName(draft.firstName, draft.lastName, draft.name),
        email: String(draft.email || "").trim() || undefined,
        phone: phoneDigits,
        addressLine1,
        city,
        state,
        pincode,
        countryCode: "",
      };
      const next =
        kind === "billing"
          ? await addCustomerBillingAddress({
              customerId: session.customerId,
              billingAddress: addressPayload,
            })
          : await addCustomerDeliveryAddress({
              customerId: session.customerId,
              deliveryAddress: addressPayload,
            });

      const mapped: Address[] = (Array.isArray(next) ? next : []).map(
        (address: DeliveryAddress) =>
          mapDeliveryAddressToCheckoutAddress(address, kind),
      );

      if (kind === "billing") {
        setBillingSavedAddresses(mapped);
      } else {
        setShippingSavedAddresses(mapped);
      }
    } catch (err: unknown) {
      // toast({
      //   title: "Could not save address",
      //   description: getErrorMessage(err),
      // });
    }
  };

  const placeOrder = async (paymentMethod: PaymentMethod) => {
    if (placingOrder) return;

    trackCheckoutProgress({
      ...checkoutAnalyticsPayload,
      step: "place_order",
      delivery_type: deliveryType,
      payment_method: paymentMethod,
    });

    try {
      setPlacingOrder(true);

      const billing = getSelectedAddress("billing");
      const shipping =
        !billingOnly && deliveryType === "delivery"
          ? getSelectedAddress("shipping")
          : null;
      const contactAddress = billingOnly
        ? billing
        : deliveryType === "delivery"
          ? shipping || billing
          : billing;

      if (!validateCheckoutFields()) {
        toast({
          title: "Required fields missing",
          description: "Please fill the highlighted checkout fields.",
          variant: "destructive",
        });
        return;
      }

      if (
        !billingOnly &&
        deliveryType === "delivery" &&
        shippingIssues.length > 0
      ) {
        toast({
          title: "Shipping not available",
          description:
            shippingAvailabilityMessage ||
            "Some items cannot be shipped to this address.",
          variant: "destructive",
        });
        return;
      }

      if (
        !billingOnly &&
        deliveryType === "pickup" &&
        !primaryPickupDispatchPointPayload
      ) {
        toast({
          title: "Pickup location required",
          description:
            "We could not find a pickup location for the items in your cart.",
          variant: "destructive",
        });
        return;
      }

      await saveNewAddressIfNeeded("billing");
      if (
        !billingOnly &&
        deliveryType === "delivery" &&
        !useBillingAsShipping
      ) {
        await saveNewAddressIfNeeded("shipping");
      }

      const name = String(contactAddress?.name || billing?.name || "").trim();
      const email = String(
        contactAddress?.email || billing?.email || "",
      ).trim();
      const phoneNumber = String(
        contactAddress?.phone || billing?.phone || "",
      ).trim();
      const address = String(
        (billingOnly
          ? billing
          : deliveryType === "delivery"
            ? shipping
            : billing
        )?.address ||
          billing?.address ||
          "",
      ).trim();
      const city = String(
        (billingOnly
          ? billing
          : deliveryType === "delivery"
            ? shipping
            : billing
        )?.city ||
          billing?.city ||
          "",
      ).trim();
      const pincode = String(
        (billingOnly
          ? billing
          : deliveryType === "delivery"
            ? shipping
            : billing
        )?.pincode ||
          billing?.pincode ||
          "",
      ).trim();

      if (!name) {
        toast({ title: "Name required", variant: "destructive" });
        return;
      }
      if (!email) {
        toast({ title: "Email required", variant: "destructive" });
        return;
      }
      if (
        !billingOnly &&
        deliveryType === "delivery" &&
        (!address || !city || !pincode)
      ) {
        toast({ title: "Shipping address required", variant: "destructive" });
        return;
      }

      const subdomain = TEMPLATE_WEBSITE_SUBDOMAIN;
      const countryCode = "";
      const customerId = session?.customerId ? String(session.customerId) : "";

      const orderItems = items.map((i) => {
        const isBogoOfferItem = Boolean((i as any)?.isBogoOfferItem);
        const baseId = isBogoOfferItem
          ? String((i as any)?.bogoFreeProductId || "").trim()
          : extractMongoObjectId(i.id) || String(i.id || "");
        const variantId =
          (isBogoOfferItem &&
            String((i as any)?.bogoFreeGroupId || "").trim()) ||
          (typeof (i as any)?.selectedVariantId === "string" &&
            (i as any).selectedVariantId) ||
          (() => {
            const parts = String(i.id || "").split("-");
            return parts.length > 1 ? extractMongoObjectId(parts[1]) : "";
          })();

        const unitPrice = isBogoOfferItem ? 0 : Number(i.price || 0) || 0;
        const basePrice = isBogoOfferItem
          ? 0
          : Number(i.mrp || 0) > 0
            ? Number(i.mrp || 0)
            : unitPrice;
        const quantity = Number(i.qty || 0) || 0;

        return {
          itemId: baseId,
          type: "catalog-product",
          itemType: "product",
          ...(variantId ? { groupId: variantId } : {}),
          description: i.name,
          quantity,
          quantityUnit: "pcs",
          amount: isBogoOfferItem ? 0 : unitPrice * quantity,
          basePrice,
          salePrice: unitPrice,
          shippingAvailable: i.shippingAvailable === true,
          storePickupAvailable: i.storePickupAvailable === true,
          dispatchPoints: Array.isArray((i as any)?.dispatchPoints)
            ? (i as any).dispatchPoints
            : [],
          storePickupDispatchPoint:
            (i as any)?.storePickupDispatchPoint ?? null,
          lineId: `${baseId}:${variantId || "default"}`,
          catalogId: (i as any)?.catalogId || (i as any)?.catalogueId || "",
          catalogueId: (i as any)?.catalogueId || (i as any)?.catalogId || "",
          hasBogoOffer: Boolean(
            (i as any)?.hasBogoOffer ||
            (i as any)?.bogoApplied ||
            (i as any)?.isBogoApplied,
          ),
          isOfferItem: Boolean((i as any)?.isOfferItem),
          isBogoOfferItem,
          offerType: isBogoOfferItem ? (i as any)?.offerType || "bogo" : "",
          bogoPromotionId: isBogoOfferItem
            ? (i as any)?.bogoPromotionId || ""
            : "",
          bogoPromotionCode: isBogoOfferItem
            ? (i as any)?.bogoPromotionCode || ""
            : "",
          bogoSourceItemId: isBogoOfferItem
            ? (i as any)?.bogoSourceItemId || ""
            : "",
          bogoFreeProductId: isBogoOfferItem
            ? (i as any)?.bogoFreeProductId || ""
            : "",
          bogoFreeGroupId: isBogoOfferItem
            ? (i as any)?.bogoFreeGroupId || ""
            : "",
          bogoDiscountPercent: isBogoOfferItem
            ? Number((i as any)?.bogoDiscountPercent || 0) || 0
            : 0,
        };
      });

      const saleSubtotal = orderItems.reduce(
        (sum, i) => sum + (Number(i.amount) || 0),
        0,
      );
      const subtotal = orderItems.reduce(
        (sum, i) =>
          sum +
          (Number(i.basePrice || 0) || 0) * (Number(i.quantity || 0) || 0),
        0,
      );
      const shippingCostResolved =
        !billingOnly && deliveryType === "delivery"
          ? Number(
              summaryDisplay?.shipping ?? checkoutSummary?.shippingCost ?? 0,
            ) || 0
          : 0;
      const finalAmount =
        Number(summaryDisplay?.total ?? checkoutSummary?.total ?? 0) || 0;
      const dueDate = new Date().toISOString().split("T")[0];
      const billingAddressPayload = {
        fullName: billing?.name || name,
        addressLine1: billing?.address || address,
        city: billing?.city || city,
        state: billing?.state || "",
        pincode: billing?.pincode || pincode,
        countryCode,
        phone: billing?.phone || phoneNumber,
      };
      const shippingAddressPayload = {
        fullName: name,
        addressLine1: address,
        city,
        state: shipping?.state || billing?.state || "",
        pincode,
        countryCode,
        phone: phoneNumber,
      };
      const fulfillmentMode = billingOnly
        ? "billing-only"
        : deliveryType === "delivery"
          ? "shipping"
          : "store-pickup";
      const orderDeliveryMode = billingOnly
        ? "billing-only"
        : deliveryType === "delivery"
          ? isExpressDelivery
            ? "express"
            : "standard"
          : "store-pickup";
      const primaryExpressDeliveryMessage =
        expressDeliveryMessages.length > 0 ? expressDeliveryMessages[0] : "";
      const primaryZoneNote = zoneNotes.length > 0 ? zoneNotes[0] : "";
      const shippingDispatchPointId = getCommonDispatchPointId(items);
      const successItems = orderItems.map((item) => ({
        itemId: item.itemId,
        description: item.description,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        amount: item.amount,
        basePrice: item.basePrice,
        salePrice: item.salePrice,
        gstPercentage: (item as any)?.gstPercentage ?? 0,
        gstAmount: (item as any)?.gstAmount ?? 0,
      }));
      const checkoutTax =
        Number(
          (checkoutSummary as any)?.totalGst ??
            (checkoutSummary as any)?.tax ??
            0,
        ) || 0;
      const orderSuccessPayload = {
        finalAmount,
        name,
        email,
        deliveryType: billingOnly ? "billing-only" : deliveryType,
        deliveryMode: orderDeliveryMode,
        isExpressDelivery:
          !billingOnly && deliveryType === "delivery" && isExpressDelivery,
        expressDeliveryMessage: primaryExpressDeliveryMessage,
        zoneNote: primaryZoneNote,
        items: successItems,
        subtotal:
          Number(summaryDisplay?.subtotal ?? checkoutSummary?.subtotal ?? 0) ||
          0,
        itemDiscount: Number(checkoutSummary?.itemDiscount ?? 0) || 0,
        promotionDiscount:
          Number(
            summaryDisplay?.couponDiscount ??
              checkoutSummary?.promotionDiscount ??
              0,
          ) || 0,
        totalDiscount: Number(checkoutSummary?.totalDiscount ?? 0) || 0,
        taxAmount: checkoutTax,
        shippingCost: shippingCostResolved,
        billingAddressLine: getAddressPayloadLine(billingAddressPayload),
        shippingAddressLine:
          !billingOnly && deliveryType === "delivery"
            ? getAddressPayloadLine(shippingAddressPayload)
            : "",
        pickupDateTime:
          !billingOnly && deliveryType === "pickup"
            ? [pickupDate, pickupTime].filter(Boolean).join(" ")
            : "",
        couponCode: appliedCouponCode || "",
        itemCount: count,
      };

      const chatWidgetPayload = {
        customerId,
        promotionCode: appliedCouponCode || "",
        orderData: {
          mode: "Standard Order",
          source: "Website",
          title: orderItems?.[0]?.description || "Website Order",
          deliveryMode: orderDeliveryMode,
          fulfillmentMode,
          items: orderItems,
          promotionCode: appliedCouponCode || "",
          subtotal,
          shippingCost: shippingCostResolved,
          finalAmount,
          billingAddress: billingAddressPayload,
          pickupDetails:
            !billingOnly && deliveryType === "pickup"
              ? {
                  pickupDate,
                  pickupTime,
                  pickupLocation: primaryPickupDispatchPointPayload,
                }
              : undefined,
          notes:
            !billingOnly && deliveryType === "pickup"
              ? `Payment: ${paymentMethod}; Pickup: ${pickupDate} ${pickupTime}`
              : `Payment: ${paymentMethod}`,
          paymentMilestones: [
            {
              label: "Website Order",
              amount: finalAmount,
              dueDate,
              status: "Pending",
              paymentMode: paymentMethod === "online" ? "Online" : "COD",
              paymentType: paymentMethod === "online" ? "Online" : "Offline",
              whatsappNotification: {
                pending: false,
                paid: false,
                overdue: false,
              },
            },
          ],
          shippingDetails: [
            billingOnly
              ? {
                  fulfillmentMode: "billing-only",
                  shippingStatus: "Pending",
                  shippingMethod: "Billing Only",
                  dispatchPoint: { dispatchPointId: null },
                  dispatchPoints: [],
                  billToAddress: billingAddressPayload,
                  ...(checkoutSummary || {}),
                }
              : deliveryType === "pickup"
                ? {
                    fulfillmentMode: "store-pickup",
                    shippingStatus: "Pending",
                    shippingMethod: "Store Pickup",
                    dispatchPoint: primaryPickupDispatchPointPayload
                      ? {
                          ...primaryPickupDispatchPointPayload,
                        }
                      : { dispatchPointId: null },
                    dispatchPoints: getShippingDetailDispatchPoints(),
                    pickupLocation: primaryPickupDispatchPointPayload,
                    pickupDate,
                    pickupTime,
                    billToAddress: billingAddressPayload,
                    ...(checkoutSummary || {}),
                  }
                : {
                    fulfillmentMode: "shipping",
                    shippingStatus: "Pending",
                    shippingMethod: "Local Delivery",
                    deliveryMode: isExpressDelivery ? "express" : "standard",
                    isExpressDelivery,
                    expressDeliveryMessage: primaryExpressDeliveryMessage,
                    zoneNote: primaryZoneNote,
                    dispatchPoint: shippingDispatchPointId
                      ? { dispatchPointId: shippingDispatchPointId }
                      : { dispatchPointId: null },
                    dispatchPointId: shippingDispatchPointId || null,
                    dispatchPoints: getShippingDetailDispatchPoints(),
                    shipToAddress: shippingAddressPayload,
                    billToAddress: billingAddressPayload,
                    ...(checkoutSummary || {}),
                  },
          ],
        },
      };

      if (paymentMethod === "online") {
        const json = await apiClient.post<any>(
          "/business_website/chat_widget/init_payment_with_order_session",
          {
            customerId,
            subdomain,
            orderData: [chatWidgetPayload.orderData],
            deliveryAddress:
              deliveryType === "delivery"
                ? shippingAddressPayload
                : billingAddressPayload,
            totalAmount: finalAmount,
            promotionCode: appliedCouponCode || "",
            returnUrl: `${window.location.origin}${window.location.pathname}`,
          },
        );

        if (!json?.success) {
          if (isAuthError(json)) {
            handleOrderAuthExpired();
            return;
          }
          throw new Error(json?.message || "Failed to start online payment");
        }

        const paymentData = (json as any)?.data || {};
        const gateway = String(paymentData?.gateway || "")
          .trim()
          .toLowerCase();

        if (gateway === "stripe") {
          if (!paymentData?.paymentUrl) {
            throw new Error("Stripe payment URL is missing.");
          }

          try {
            window.sessionStorage.setItem(
              STRIPE_PENDING_ORDER_STORAGE_KEY,
              JSON.stringify({
                ...orderSuccessPayload,
                paymentAttemptId: paymentData.paymentAttemptId,
              }),
            );
          } catch {
            // ignore
          }

          window.location.href = String(paymentData.paymentUrl);
          return;
        }

        if (gateway === "razorpay") {
          await waitForExternalCheckoutLayerRelease();

          const isLoaded = await loadRazorpayScript();
          const RazorpayCheckout = window.Razorpay;
          if (!isLoaded || !RazorpayCheckout) {
            throw new Error(
              "Razorpay checkout failed to load. Please try again.",
            );
          }

          document.body.style.pointerEvents = "";

          const razorpayCurrency = String(
            paymentData.currency || "",
          ).toUpperCase();
          if (razorpayCurrency && razorpayCurrency !== "INR") {
            toast({
              title: "Razorpay card checkout",
              description:
                "Razorpay may show only card payments for non-INR currency. Use Stripe for full international checkout.",
            });
          }

          await new Promise<void>((resolve, reject) => {
            const razorpay = new RazorpayCheckout({
              key: paymentData.keyId,
              amount: paymentData.amount,
              currency: razorpayCurrency || paymentData.currency,
              name: paymentData.businessName || "Website Order",
              description: "Website Order",
              order_id: paymentData.order_id,
              prefill: {
                name,
                email,
                ...(phoneNumber ? { contact: phoneNumber } : {}),
              },
              retry: {
                enabled: true,
                max_count: 1,
              },
              notes: {
                paymentAttemptId: String(paymentData.paymentAttemptId || ""),
              },
              handler: async (response: any) => {
                try {
                  const verifyResponse = await apiClient.post<any>(
                    "/business_website/chat_widget/verify_payment_create_order",
                    {
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_signature: response.razorpay_signature,
                      paymentAttemptId: paymentData.paymentAttemptId,
                    },
                  );

                  if (!verifyResponse?.success) {
                    throw new Error(
                      verifyResponse?.message || "Payment verification failed",
                    );
                  }

                  const orderId = String(
                    verifyResponse?.orderIds?.[0] ||
                      verifyResponse?.orderId ||
                      "",
                  );
                  trackPurchase({
                    transaction_id:
                      orderId || String(paymentData?.order_id || ""),
                    value: finalTotal,
                    currency: "INR",
                    payment_method: "online",
                    gateway: "razorpay",
                  });
                  window.sessionStorage.setItem(
                    LAST_ORDER_STORAGE_KEY,
                    JSON.stringify({
                      orderId,
                      paymentMethod: "online",
                      ...orderSuccessPayload,
                    }),
                  );

                  clearCheckoutDraft();
                  clear();
                  navigate(
                    `/order-success?orderId=${encodeURIComponent(orderId)}`,
                    { replace: true },
                  );
                  resolve();
                } catch (verifyError) {
                  reject(verifyError);
                }
              },
              modal: {
                ondismiss: () => {
                  reject(new Error("Payment cancelled"));
                },
              },
            });

            if (typeof razorpay.on === "function") {
              razorpay.on("payment.failed", (failure: any) => {
                const reason =
                  failure?.error?.description ||
                  failure?.error?.reason ||
                  failure?.error?.code ||
                  "Razorpay payment failed";
                reject(new Error(reason));
              });
            }

            razorpay.open();
          });
          return;
        }

        throw new Error(
          "Online payment gateway is not configured for this checkout.",
        );
      }

      const json = await apiClient.post<any>(
        "/business_website/chat_widget/create_catalogue_order_from_chat_widget",
        chatWidgetPayload,
      );

      if (!json?.success) {
        if (isAuthError(json)) {
          handleOrderAuthExpired();
          return;
        }
        throw new Error(json?.message || "Failed to place order");
      }

      const createdOrder = (json as any)?.data || (json as any)?.order || null;
      const createdOrderId = String(
        (json as any)?.orderId || createdOrder?.orderId || "",
      );
      trackPurchase({
        transaction_id: createdOrderId,
        value: finalTotal,
        currency: "INR",
        payment_method: paymentMethod,
        gateway: paymentMethod,
      });

      try {
        const finalAmount =
          typeof createdOrder?.finalAmount === "number"
            ? createdOrder.finalAmount
            : typeof createdOrder?.totalAmount === "number"
              ? createdOrder.totalAmount
              : undefined;
        window.sessionStorage.setItem(
          LAST_ORDER_STORAGE_KEY,
          JSON.stringify({
            orderId: createdOrderId,
            paymentMethod,
            ...orderSuccessPayload,
          }),
        );
      } catch {
        // ignore
      }

      clearCheckoutDraft();
      clear();
      navigate(`/order-success?orderId=${encodeURIComponent(createdOrderId)}`);
    } catch (err: unknown) {
      console.error(err);
      if (isAuthError(err)) {
        handleOrderAuthExpired();
        return;
      }
      const errorMessage = getErrorMessage(err);
      toast({
        title: "Order failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleMobileBack = () => {
    if (mobileStep === 2) {
      setMobileStep(1);
      return;
    }

    navigate(-1);
  };

  const billingAddresses = useMemo(
    () => billingSavedAddresses,
    [billingSavedAddresses],
  );
  const shippingAddresses = useMemo(
    () => shippingSavedAddresses,
    [shippingSavedAddresses],
  );
  const selectedShippingPincode = useMemo(() => {
    if (useBillingAsShipping) {
      if (selectedBillingAddress === "new") {
        return String(newBillingAddress.pincode || "").trim();
      }

      return String(
        billingAddresses.find(
          (address) => address.id === selectedBillingAddress,
        )?.pincode || "",
      ).trim();
    }

    if (selectedShippingAddress === "new") {
      return String(newShippingAddress.pincode || "").trim();
    }

    return String(
      shippingAddresses.find(
        (address) => address.id === selectedShippingAddress,
      )?.pincode || "",
    ).trim();
  }, [
    billingAddresses,
    newBillingAddress.pincode,
    newShippingAddress.pincode,
    selectedBillingAddress,
    selectedShippingAddress,
    shippingAddresses,
    useBillingAsShipping,
  ]);
  const showSaturdayDeliveryMessage =
    deliveryType === "delivery" &&
    SPECIAL_DELIVERY_PINCODE_RULES.some((rule) =>
      rule.pincodes.has(selectedShippingPincode),
    );
  const specialDeliveryMessage =
    deliveryType === "delivery"
      ? (SPECIAL_DELIVERY_PINCODE_RULES.find((rule) =>
          rule.pincodes.has(selectedShippingPincode),
        )?.message ?? "")
      : "";
  const selectedFulfillmentLabel = billingOnly
    ? "Billing Only"
    : deliveryType === "delivery"
      ? "Home Delivery"
      : "Store Pickup";
  const renderMobileDeliveryPincodeMessages = () => {
    if (deliveryType !== "delivery" || billingOnly) return null;
    if (shippingIssues.length === 0 && !showSaturdayDeliveryMessage)
      return null;

    return (
      <div className="space-y-2">
        {shippingIssues.length > 0 ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="font-semibold">Shipping not available</div>
            <div className="mt-1">
              {shippingAvailabilityMessage ||
                "Some items cannot be shipped to this pincode."}
            </div>
          </div>
        ) : null}
        {showSaturdayDeliveryMessage ? (
          <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            {specialDeliveryMessage}
          </div>
        ) : null}
      </div>
    );
  };

  // Load saved delivery addresses for logged-in customers.
  useEffect(() => {
    if (!authHydrated || !isLoggedIn) return;
    const customerId = session?.customerId ? String(session.customerId) : "";
    if (!customerId) return;

    let cancelled = false;
    (async () => {
      setAddressesLoading(true);
      try {
        const [billingList, shippingList] = await Promise.all([
          getCustomerBillingAddresses({ customerId }),
          getCustomerDeliveryAddresses({ customerId }),
        ]);
        if (cancelled) return;
        const mappedBilling: Address[] = (
          Array.isArray(billingList) ? billingList : []
        ).map((a: DeliveryAddress) =>
          mapDeliveryAddressToCheckoutAddress(a, "billing"),
        );
        const mappedShipping: Address[] = (
          Array.isArray(shippingList) ? shippingList : []
        ).map((a: DeliveryAddress) =>
          mapDeliveryAddressToCheckoutAddress(a, "shipping"),
        );

        setBillingSavedAddresses(mappedBilling);
        setShippingSavedAddresses(mappedShipping);

        const currentDraft = checkoutAddressDraftRef.current;
        const keepTypedBillingAddress =
          currentDraft.selectedBillingAddress === "new" &&
          hasAddressDraftValue(currentDraft.newBillingAddress);
        const keepTypedShippingAddress =
          currentDraft.selectedShippingAddress === "new" &&
          hasAddressDraftValue(currentDraft.newShippingAddress);

        if (mappedBilling.length && !keepTypedBillingAddress) {
          setSelectedBillingAddress(mappedBilling[0].id);
        }
        if (mappedShipping.length && !keepTypedShippingAddress) {
          setSelectedShippingAddress(mappedShipping[0].id);
        }
      } catch {
        if (cancelled) return;
        setBillingSavedAddresses([]);
        setShippingSavedAddresses([]);
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authHydrated, isLoggedIn, session?.customerId]);

  const cartSignature = useMemo(
    () =>
      items
        .map((i) => {
          const dispatchPoints = (i as { dispatchPoints?: unknown })
            .dispatchPoints;
          const dispatchPointsSignature = Array.isArray(dispatchPoints)
            ? dispatchPoints
                .map((dp) => {
                  if (!dp) return "";
                  if (typeof dp === "string") return dp.trim();
                  if (typeof dp === "number") return String(dp);
                  return String(
                    (
                      dp as {
                        _id?: unknown;
                        id?: unknown;
                        dispatchPointId?: unknown;
                      }
                    )._id ??
                      (
                        dp as {
                          _id?: unknown;
                          id?: unknown;
                          dispatchPointId?: unknown;
                        }
                      ).id ??
                      (
                        dp as {
                          _id?: unknown;
                          id?: unknown;
                          dispatchPointId?: unknown;
                        }
                      ).dispatchPointId ??
                      "",
                  ).trim();
                })
                .filter(Boolean)
                .sort()
                .join(",")
            : "";
          return `${i.id}:${i.qty}:${i.price}:${i.mrp}:${dispatchPointsSignature}`;
        })
        .sort()
        .join("|"),
    [items],
  );

  const emailLoginSheet = (
    <Sheet
      open={emailLoginOpen}
      onOpenChange={(open) => !emailLoginLoading && setEmailLoginOpen(open)}
    >
      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <SheetTitle className="text-xl font-bold">
              Login to your account
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {emailLoginStep === "buttons" ? (
              <>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">
                    Login to your account
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use Google or email OTP to continue.
                  </p>
                </div>
                <Button
                  onClick={handleGoogleLogin}
                  disabled={emailLoginLoading}
                  className="h-11 w-full rounded-full font-bold"
                >
                  <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full border border-primary-foreground/40 text-xs font-bold">
                    G
                  </span>
                  Login with Google
                </Button>
                <Button
                  onClick={() => setEmailLoginStep("email")}
                  disabled={emailLoginLoading}
                  variant="outline"
                  className="h-11 w-full rounded-full border-primary/40 font-bold"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email with OTP
                </Button>
              </>
            ) : emailLoginStep === "email" ? (
              <>
                <div>
                  <Label htmlFor="checkout-login-email">Email</Label>
                  <Input
                    id="checkout-login-email"
                    value={emailLoginEmail}
                    onChange={(event) => setEmailLoginEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleSendEmailOtp}
                  disabled={emailLoginLoading}
                  className="h-11 w-full rounded-full font-bold"
                >
                  {emailLoginLoading ? "Sending..." : "Send OTP"}
                </Button>
                <Button
                  onClick={() => setEmailLoginStep("buttons")}
                  disabled={emailLoginLoading}
                  variant="ghost"
                  className="w-full rounded-full"
                >
                  Back
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="checkout-login-otp">OTP</Label>
                  <Input
                    id="checkout-login-otp"
                    value={emailLoginOtp}
                    onChange={(event) =>
                      setEmailLoginOtp(event.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="Enter OTP"
                    inputMode="numeric"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sent to{" "}
                    {String(emailLoginEmail || "")
                      .trim()
                      .toLowerCase()}
                  </p>
                </div>
                <Button
                  onClick={handleVerifyEmailOtp}
                  disabled={emailLoginLoading}
                  className="h-11 w-full rounded-full font-bold"
                >
                  {emailLoginLoading ? "Verifying..." : "Verify and Login"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendEmailOtp}
                    disabled={emailLoginLoading}
                    variant="outline"
                    className="flex-1 rounded-full"
                  >
                    Resend
                  </Button>
                  <Button
                    onClick={() => setEmailLoginStep("email")}
                    disabled={emailLoginLoading}
                    variant="ghost"
                    className="flex-1 rounded-full"
                  >
                    Change email
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Calculate shipping cost using backend when delivery + pincode is available.
  useEffect(() => {
    const hasCoupon = Boolean(appliedCouponCode);
    const needsShippingQuote = deliveryType === "delivery";

    if (!needsShippingQuote && !hasCoupon) {
      setShippingCost(0);
      setShippingAvailabilityMessage("");
      setShippingIssues([]);
      setCheckoutSummary(null);
      // return;
    }

    const picked = useBillingAsShipping
      ? selectedBillingAddress && selectedBillingAddress !== "new"
        ? billingAddresses.find((a) => a.id === selectedBillingAddress)
        : null
      : selectedShippingAddress && selectedShippingAddress !== "new"
        ? shippingAddresses.find((a) => a.id === selectedShippingAddress)
        : null;

    const pincode = String(
      picked?.pincode ||
        (useBillingAsShipping
          ? newBillingAddress.pincode
          : newShippingAddress.pincode) ||
        "",
    ).trim();
    const city = String(
      picked?.city ||
        (useBillingAsShipping
          ? newBillingAddress.city
          : newShippingAddress.city) ||
        "",
    ).trim();
    const address = String(
      picked?.address ||
        (useBillingAsShipping
          ? newBillingAddress.address
          : newShippingAddress.address) ||
        "",
    ).trim();

    if (needsShippingQuote && !pincode && !hasCoupon) {
      setShippingCost(0);
      setShippingAvailabilityMessage("");
      setShippingIssues([]);
      setCheckoutSummary(null);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(async () => {
      setShippingLoading(true);
      try {
        const subdomain = TEMPLATE_WEBSITE_SUBDOMAIN;
        const products = buildProductsPayload();
        const dispatchPointId = getCommonDispatchPointId(items);
        const body: Record<string, unknown> = {
          subdomain,
          customerId: session?.customerId ? String(session.customerId) : "",
          products,
          promotionCode: appliedCouponCode || undefined,
          paymentMode: paymentMethod,
          deliveryMode: isExpressDelivery ? "express" : "standard",
        };

        if (needsShippingQuote && pincode) {
          body.deliveryAddress = { pincode, city, address };
          body.dispatchPointId = dispatchPointId;
        }

        const res = await apiClient.post<any>(
          "/business_website/chat_widget/chat_widget_side_cart/get_catalogue_products_total_amount",
          body,
        );

        if (cancelled) return;
        const summary = (res as any)?.data || res;
        setCheckoutSummary(summary || null);
        const nextCost = needsShippingQuote
          ? Number(summary?.shippingCost ?? 0) || 0
          : 0;
        setShippingCost(nextCost);
        const nextIssues =
          needsShippingQuote && Array.isArray(summary?.shippingIssues)
            ? summary.shippingIssues
            : [];
        setShippingIssues(nextIssues);
        setShippingAvailabilityMessage(
          nextIssues.length > 0
            ? String(
                summary?.message ||
                  "Some items cannot be shipped to this address.",
              )
            : "",
        );
      } catch {
        if (!cancelled) {
          setShippingCost(0);
          setShippingIssues([]);
          setShippingAvailabilityMessage("");
        }
        setCheckoutSummary(null);
      } finally {
        if (!cancelled) setShippingLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [
    deliveryType,
    useBillingAsShipping,
    selectedBillingAddress,
    selectedShippingAddress,
    newBillingAddress.pincode,
    newBillingAddress.city,
    newBillingAddress.address,
    newShippingAddress.pincode,
    newShippingAddress.city,
    newShippingAddress.address,
    cartSignature,
    items,
    billingAddresses,
    shippingAddresses,
    appliedCouponCode,
    session?.customerId,
    buildProductsPayload,
    getCommonDispatchPointId,
    isExpressDelivery,
    paymentMethod,
  ]);

  if (verifyingStripePayment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="site-container flex min-h-[60vh] items-center justify-center py-16">
          <Card className="w-full max-w-md border-primary/20 shadow-card">
            <CardContent className="space-y-5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Verifying your payment</h1>
                <p className="text-sm text-muted-foreground">
                  Please wait while we confirm your Stripe payment and create
                  your order.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Do not refresh or close this page. This usually takes a few
                seconds.
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="site-container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">
            Add some items to your cart before checkout
          </p>
          <Button onClick={() => navigate("/")}>Continue Shopping</Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMobileBack}
              className="h-10 w-10 shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold leading-none">Checkout</h1>
              </div>
              {mobileStep === 2 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedFulfillmentLabel}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCartOpen(true)}
              className="h-10 w-10 shrink-0"
              aria-label="Edit cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-28">
          {mobileStep === 1 ? (
            <div className="space-y-4">
              {billingOnly ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={selectedBillingAddress}
                      onValueChange={(value) =>
                        updateSelectedAddress("billing", value)
                      }
                    >
                      {billingAddresses.map((address) => (
                        <AddressOptionRow
                          key={address.id}
                          address={address}
                          radioId={`billing-only-${address.id}`}
                          selected={selectedBillingAddress === address.id}
                        />
                      ))}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="billing-only-new" />
                        <Label
                          htmlFor="billing-only-new"
                          className="cursor-pointer"
                        >
                          <Plus className="h-4 w-4 inline mr-2" />
                          Add New Billing Address
                        </Label>
                      </div>
                    </RadioGroup>
                    {renderFieldError("billing", "addressSelection")}

                    {selectedBillingAddress === "new" && (
                      <div className="border rounded-lg p-4 space-y-4 mt-4">
                        <div className="grid grid-cols-1 gap-4">
                          {renderNameFields("billing", "billing-only")}
                          <div>
                            <Label htmlFor="billing-only-email">Email</Label>
                            <Input
                              id="billing-only-email"
                              value={newBillingAddress.email}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "email",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter email"
                              inputMode="email"
                              autoComplete="email"
                              className={getFieldErrorClass("billing", "email")}
                            />
                            {renderFieldError("billing", "email")}
                          </div>
                          <div>
                            <Label htmlFor="billing-only-phone">
                              Phone Number *
                            </Label>
                            <Input
                              id="billing-only-phone"
                              value={newBillingAddress.phone}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "phone",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter phone number"
                              inputMode="tel"
                              autoComplete="tel"
                              required
                            />
                          </div>
                        </div>
                        <AddressAutocomplete
                          id="billing-only-address"
                          label="Address"
                          placeholder="Enter full address"
                          value={newBillingAddress.address}
                          onChange={(value) =>
                            updateDraftField("billing", "address", value)
                          }
                          onPlaceSelect={(place) => {
                            if (place.address_components) {
                              const components = place.address_components;
                              const city =
                                components.find((c) =>
                                  c.types.includes("locality"),
                                )?.long_name || "";
                              const state =
                                components.find((c) =>
                                  c.types.includes(
                                    "administrative_area_level_1",
                                  ),
                                )?.long_name || "";
                              const pincode =
                                components.find((c) =>
                                  c.types.includes("postal_code"),
                                )?.long_name || "";

                              setNewBillingAddress((prev) => ({
                                ...prev,
                                address:
                                  place.formatted_address || prev.address,
                                city: city || prev.city,
                                state: state || prev.state,
                                pincode: pincode || prev.pincode,
                              }));
                            }
                          }}
                        />
                        {renderFieldError("billing", "address")}
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor="billing-only-city">City</Label>
                            <Input
                              id="billing-only-city"
                              value={newBillingAddress.city}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "city",
                                  e.target.value,
                                )
                              }
                              placeholder="City"
                              className={getFieldErrorClass("billing", "city")}
                            />
                            {renderFieldError("billing", "city")}
                          </div>
                          <div>
                            <Label htmlFor="billing-only-state">State</Label>
                            <Input
                              id="billing-only-state"
                              value={newBillingAddress.state}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "state",
                                  e.target.value,
                                )
                              }
                              placeholder="State"
                              className={getFieldErrorClass("billing", "state")}
                            />
                            {renderFieldError("billing", "state")}
                          </div>
                          <div>
                            <Label htmlFor="billing-only-pincode">
                              Pincode
                            </Label>
                            <Input
                              id="billing-only-pincode"
                              value={newBillingAddress.pincode}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "pincode",
                                  e.target.value,
                                )
                              }
                              placeholder="Pincode"
                              className={getFieldErrorClass(
                                "billing",
                                "pincode",
                              )}
                            />
                            {renderFieldError("billing", "pincode")}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : deliveryType === "delivery" ? (
                <>
                  <section className="space-y-4">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <MapPin className="h-5 w-5" />
                        Delivery Address
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {addressesLoading && (
                        <div className="text-sm text-muted-foreground">
                          Loading saved addresses…
                        </div>
                      )}
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="mobile-use-billing-as-shipping"
                            checked={useBillingAsShipping}
                            onCheckedChange={(checked) =>
                              setUseBillingAsShipping(checked === true)
                            }
                            className="mt-0.5"
                          />
                          <div className="space-y-1">
                            <Label
                              htmlFor="mobile-use-billing-as-shipping"
                              className="cursor-pointer font-semibold"
                            >
                              Use billing address as delivery address
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Shipping cost and delivery availability will be
                              checked using your billing address.
                            </p>
                          </div>
                        </div>
                      </div>

                      {!useBillingAsShipping && (
                        <>
                          <RadioGroup
                            value={selectedShippingAddress}
                            onValueChange={(value) =>
                              updateSelectedAddress("shipping", value)
                            }
                          >
                            {shippingAddresses.map((address) => (
                              <AddressOptionRow
                                key={address.id}
                                address={address}
                                radioId={`mobile-shipping-${address.id}`}
                                selected={
                                  selectedShippingAddress === address.id
                                }
                              />
                            ))}
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="new"
                                id="mobile-shipping-new"
                              />
                              <Label
                                htmlFor="mobile-shipping-new"
                                className="cursor-pointer"
                              >
                                <Plus className="h-4 w-4 inline mr-2" />
                                Add New Address
                              </Label>
                            </div>
                          </RadioGroup>
                          {renderFieldError("shipping", "addressSelection")}
                        </>
                      )}

                      {!useBillingAsShipping &&
                        selectedShippingAddress === "new" && (
                          <div className="border rounded-lg p-4 space-y-4 mt-4">
                            <div className="grid grid-cols-1 gap-4">
                              {renderNameFields("shipping", "mobile-shipping")}
                              <div>
                                <Label htmlFor="mobile-shipping-email">
                                  Email
                                </Label>
                                <Input
                                  id="mobile-shipping-email"
                                  value={newShippingAddress.email}
                                  onChange={(e) =>
                                    updateDraftField(
                                      "shipping",
                                      "email",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Enter email"
                                  inputMode="email"
                                  autoComplete="email"
                                  className={getFieldErrorClass(
                                    "shipping",
                                    "email",
                                  )}
                                />
                                {renderFieldError("shipping", "email")}
                              </div>
                              <div>
                                <Label htmlFor="mobile-shipping-phone">
                                  Phone Number *
                                </Label>
                                <Input
                                  id="mobile-shipping-phone"
                                  value={newShippingAddress.phone}
                                  onChange={(e) =>
                                    updateDraftField(
                                      "shipping",
                                      "phone",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Enter phone number"
                                  inputMode="tel"
                                  autoComplete="tel"
                                  required
                                />
                              </div>
                            </div>
                            <AddressAutocomplete
                              id="mobile-shipping-address"
                              label="Address"
                              placeholder="Enter full address"
                              value={newShippingAddress.address}
                              onChange={(value) =>
                                updateDraftField("shipping", "address", value)
                              }
                              onPlaceSelect={(place) => {
                                if (place.address_components) {
                                  const components = place.address_components;
                                  const city =
                                    components.find((c) =>
                                      c.types.includes("locality"),
                                    )?.long_name || "";
                                  const state =
                                    components.find((c) =>
                                      c.types.includes(
                                        "administrative_area_level_1",
                                      ),
                                    )?.long_name || "";
                                  const pincode =
                                    components.find((c) =>
                                      c.types.includes("postal_code"),
                                    )?.long_name || "";

                                  setNewShippingAddress((prev) => ({
                                    ...prev,
                                    address:
                                      place.formatted_address || prev.address,
                                    city: city || prev.city,
                                    state: state || prev.state,
                                    pincode: pincode || prev.pincode,
                                  }));
                                }
                              }}
                            />
                            {renderFieldError("shipping", "address")}
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <Label htmlFor="mobile-shipping-city">
                                  City
                                </Label>
                                <Input
                                  id="mobile-shipping-city"
                                  value={newShippingAddress.city}
                                  onChange={(e) =>
                                    updateDraftField(
                                      "shipping",
                                      "city",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="City"
                                  className={getFieldErrorClass(
                                    "shipping",
                                    "city",
                                  )}
                                />
                                {renderFieldError("shipping", "city")}
                              </div>
                              <div>
                                <Label htmlFor="mobile-shipping-state">
                                  State
                                </Label>
                                <Input
                                  id="mobile-shipping-state"
                                  value={newShippingAddress.state}
                                  onChange={(e) =>
                                    updateDraftField(
                                      "shipping",
                                      "state",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="State"
                                  className={getFieldErrorClass(
                                    "shipping",
                                    "state",
                                  )}
                                />
                                {renderFieldError("shipping", "state")}
                              </div>
                              <div>
                                {deliveryType === "delivery" &&
                                !billingOnly &&
                                zoneNotes.length > 0 ? (
                                  <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                                    {zoneNotes.join(" ")}
                                  </div>
                                ) : null}
                                {!useBillingAsShipping
                                  ? renderMobileDeliveryPincodeMessages()
                                  : null}
                                <Label htmlFor="mobile-shipping-pincode">
                                  Pincode
                                </Label>
                                <Input
                                  id="mobile-shipping-pincode"
                                  value={newShippingAddress.pincode}
                                  onChange={(e) =>
                                    updateDraftField(
                                      "shipping",
                                      "pincode",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Pincode"
                                  className={getFieldErrorClass(
                                    "shipping",
                                    "pincode",
                                  )}
                                />
                                {renderFieldError("shipping", "pincode")}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <MapPin className="h-5 w-5" />
                        Billing Address
                      </h2>
                    </div>
                    <div className="space-y-4">
                      <RadioGroup
                        value={selectedBillingAddress}
                        onValueChange={(value) =>
                          updateSelectedAddress("billing", value)
                        }
                      >
                        {billingAddresses.map((address) => (
                          <AddressOptionRow
                            key={address.id}
                            address={address}
                            radioId={`mobile-billing-${address.id}`}
                            selected={selectedBillingAddress === address.id}
                          />
                        ))}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="mobile-billing-new" />
                          <Label
                            htmlFor="mobile-billing-new"
                            className="cursor-pointer"
                          >
                            <Plus className="h-4 w-4 inline mr-2" />
                            Add New Billing Address
                          </Label>
                        </div>
                      </RadioGroup>
                      {renderFieldError("billing", "addressSelection")}

                      {selectedBillingAddress === "new" && (
                        <div className="border rounded-lg p-4 space-y-4 mt-4">
                          <div className="grid grid-cols-1 gap-4">
                            {renderNameFields("billing", "mobile-billing")}
                            <div>
                              <Label htmlFor="mobile-billing-email">
                                Email
                              </Label>
                              <Input
                                id="mobile-billing-email"
                                value={newBillingAddress.email}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "email",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter email"
                                inputMode="email"
                                autoComplete="email"
                                className={getFieldErrorClass(
                                  "billing",
                                  "email",
                                )}
                              />
                              {renderFieldError("billing", "email")}
                            </div>
                            <div>
                              <Label htmlFor="mobile-billing-phone">
                                Phone Number *
                              </Label>
                              <Input
                                id="mobile-billing-phone"
                                value={newBillingAddress.phone}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "phone",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter phone number"
                                inputMode="tel"
                                autoComplete="tel"
                                required
                              />
                            </div>
                          </div>
                          <AddressAutocomplete
                            id="mobile-billing-address"
                            label="Address"
                            placeholder="Enter full address"
                            value={newBillingAddress.address}
                            onChange={(value) =>
                              updateDraftField("billing", "address", value)
                            }
                            onPlaceSelect={(place) => {
                              if (place.address_components) {
                                const components = place.address_components;
                                const city =
                                  components.find((c) =>
                                    c.types.includes("locality"),
                                  )?.long_name || "";
                                const state =
                                  components.find((c) =>
                                    c.types.includes(
                                      "administrative_area_level_1",
                                    ),
                                  )?.long_name || "";
                                const pincode =
                                  components.find((c) =>
                                    c.types.includes("postal_code"),
                                  )?.long_name || "";

                                setNewBillingAddress((prev) => ({
                                  ...prev,
                                  address:
                                    place.formatted_address || prev.address,
                                  city: city || prev.city,
                                  state: state || prev.state,
                                  pincode: pincode || prev.pincode,
                                }));
                              }
                            }}
                          />
                          {renderFieldError("billing", "address")}
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label htmlFor="mobile-billing-city">City</Label>
                              <Input
                                id="mobile-billing-city"
                                value={newBillingAddress.city}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "city",
                                    e.target.value,
                                  )
                                }
                                placeholder="City"
                                className={getFieldErrorClass(
                                  "billing",
                                  "city",
                                )}
                              />
                              {renderFieldError("billing", "city")}
                            </div>
                            <div>
                              <Label htmlFor="mobile-billing-state">
                                State
                              </Label>
                              <Input
                                id="mobile-billing-state"
                                value={newBillingAddress.state}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "state",
                                    e.target.value,
                                  )
                                }
                                placeholder="State"
                                className={getFieldErrorClass(
                                  "billing",
                                  "state",
                                )}
                              />
                              {renderFieldError("billing", "state")}
                            </div>
                            <div>
                              {useBillingAsShipping
                                ? renderMobileDeliveryPincodeMessages()
                                : null}
                              <Label htmlFor="mobile-billing-pincode">
                                Pincode
                              </Label>
                              <Input
                                id="mobile-billing-pincode"
                                value={newBillingAddress.pincode}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "pincode",
                                    e.target.value,
                                  )
                                }
                                placeholder="Pincode"
                                className={getFieldErrorClass(
                                  "billing",
                                  "pincode",
                                )}
                              />
                              {renderFieldError("billing", "pincode")}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <section className="space-y-5">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Store className="h-5 w-5" />
                    Pickup Options
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Billing Address
                      </h3>
                      <RadioGroup
                        value={selectedBillingAddress}
                        onValueChange={(value) =>
                          updateSelectedAddress("billing", value)
                        }
                      >
                        {billingAddresses.map((address) => (
                          <AddressOptionRow
                            key={address.id}
                            address={address}
                            radioId={`mobile-pickup-billing-${address.id}`}
                            selected={selectedBillingAddress === address.id}
                          />
                        ))}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="new"
                            id="mobile-pickup-billing-new"
                          />
                          <Label
                            htmlFor="mobile-pickup-billing-new"
                            className="cursor-pointer"
                          >
                            <Plus className="h-4 w-4 inline mr-2" />
                            Add New Billing Address
                          </Label>
                        </div>
                      </RadioGroup>
                      {renderFieldError("billing", "addressSelection")}

                      {selectedBillingAddress === "new" && (
                        <div className="border rounded-lg p-4 space-y-4 mt-4">
                          <div className="grid grid-cols-1 gap-4">
                            {renderNameFields(
                              "billing",
                              "mobile-pickup-billing",
                            )}
                            <div>
                              <Label htmlFor="mobile-pickup-billing-email">
                                Email
                              </Label>
                              <Input
                                id="mobile-pickup-billing-email"
                                value={newBillingAddress.email}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "email",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter email"
                                inputMode="email"
                                autoComplete="email"
                                className={getFieldErrorClass(
                                  "billing",
                                  "email",
                                )}
                              />
                              {renderFieldError("billing", "email")}
                            </div>
                            <div>
                              <Label htmlFor="mobile-pickup-billing-phone">
                                Phone Number *
                              </Label>
                              <Input
                                id="mobile-pickup-billing-phone"
                                value={newBillingAddress.phone}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "phone",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter phone number"
                                inputMode="tel"
                                autoComplete="tel"
                                required
                              />
                            </div>
                          </div>
                          <AddressAutocomplete
                            id="mobile-pickup-billing-address"
                            label="Address"
                            placeholder="Enter full address"
                            value={newBillingAddress.address}
                            onChange={(value) =>
                              updateDraftField("billing", "address", value)
                            }
                            onPlaceSelect={(place) => {
                              if (place.address_components) {
                                const components = place.address_components;
                                const city =
                                  components.find((c) =>
                                    c.types.includes("locality"),
                                  )?.long_name || "";
                                const state =
                                  components.find((c) =>
                                    c.types.includes(
                                      "administrative_area_level_1",
                                    ),
                                  )?.long_name || "";
                                const pincode =
                                  components.find((c) =>
                                    c.types.includes("postal_code"),
                                  )?.long_name || "";

                                setNewBillingAddress((prev) => ({
                                  ...prev,
                                  address:
                                    place.formatted_address || prev.address,
                                  city: city || prev.city,
                                  state: state || prev.state,
                                  pincode: pincode || prev.pincode,
                                }));
                              }
                            }}
                          />
                          {renderFieldError("billing", "address")}
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label htmlFor="mobile-pickup-billing-city">
                                City
                              </Label>
                              <Input
                                id="mobile-pickup-billing-city"
                                value={newBillingAddress.city}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "city",
                                    e.target.value,
                                  )
                                }
                                placeholder="City"
                                className={getFieldErrorClass(
                                  "billing",
                                  "city",
                                )}
                              />
                              {renderFieldError("billing", "city")}
                            </div>
                            <div>
                              <Label htmlFor="mobile-pickup-billing-state">
                                State
                              </Label>
                              <Input
                                id="mobile-pickup-billing-state"
                                value={newBillingAddress.state}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "state",
                                    e.target.value,
                                  )
                                }
                                placeholder="State"
                                className={getFieldErrorClass(
                                  "billing",
                                  "state",
                                )}
                              />
                              {renderFieldError("billing", "state")}
                            </div>
                            <div>
                              <Label htmlFor="mobile-pickup-billing-pincode">
                                Pincode
                              </Label>
                              <Input
                                id="mobile-pickup-billing-pincode"
                                value={newBillingAddress.pincode}
                                onChange={(e) =>
                                  updateDraftField(
                                    "billing",
                                    "pincode",
                                    e.target.value,
                                  )
                                }
                                placeholder="Pincode"
                                className={getFieldErrorClass(
                                  "billing",
                                  "pincode",
                                )}
                              />
                              {renderFieldError("billing", "pincode")}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {renderPickupLocationCard()}

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="mobile-pickup-date">
                          Pickup Date (optional)
                        </Label>
                        <Input
                          id="mobile-pickup-date"
                          type="date"
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobile-pickup-time">
                          Pickup Time (optional)
                        </Label>
                        <Select
                          value={pickupTime}
                          onValueChange={setPickupTime}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                            <SelectItem value="11:00">11:00 AM</SelectItem>
                            <SelectItem value="12:00">12:00 PM</SelectItem>
                            <SelectItem value="13:00">1:00 PM</SelectItem>
                            <SelectItem value="14:00">2:00 PM</SelectItem>
                            <SelectItem value="15:00">3:00 PM</SelectItem>
                            <SelectItem value="16:00">4:00 PM</SelectItem>
                            <SelectItem value="17:00">5:00 PM</SelectItem>
                            <SelectItem value="18:00">6:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Store hours: 9:00 AM - 7:00 PM (Mon-Sat)</span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                  <Badge variant="secondary" className="shrink-0">
                    {count} {count === 1 ? "item" : "items"}
                  </Badge>
                </div>
                <div className="space-y-3 max-h-[56vh] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="h-12 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlaceholder
                            label={`${item.name} image unavailable`}
                            iconClassName="h-5 w-5"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="line-clamp-1 text-sm font-medium"
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                        {item.isBogoOfferItem ? (
                          <Badge
                            variant="secondary"
                            className="mt-1 text-[10px]"
                          >
                            BOGO offer
                            {/* {item.bogoPromotionCode
                              ? ` · ${item.bogoPromotionCode}`
                              : ""} */}
                          </Badge>
                        ) : null}
                        {(() => {
                          const issues = getItemShippingIssueMessages(item);
                          if (!issues.length && item.shippingAvailable === true)
                            return null;

                          const fallbackMessage =
                            item.shippingAvailable !== true
                              ? "Shipping not available"
                              : "Shipping not available for this address";
                          const displayIssues = issues.length
                            ? issues
                            : [fallbackMessage];

                          return (
                            <div className="mt-1 space-y-1">
                              {displayIssues.map((message) => (
                                <p
                                  key={message}
                                  className="text-xs font-semibold text-destructive"
                                >
                                  {message}
                                </p>
                              ))}
                            </div>
                          );
                        })()}
                        {(() => {
                          const {
                            saleLineTotal,
                            baseLineTotal,
                            couponDiscount,
                            hasDiscount,
                          } = getDisplayLineTotals(item);

                          return (
                            <div className="flex justify-between items-center gap-3 mt-1">
                              <span className="text-sm text-muted-foreground">
                                Qty: {item.qty}
                              </span>
                              <div className="text-right">
                                <span className="text-sm font-semibold">
                                  {money(saleLineTotal)}
                                </span>
                                {hasDiscount ? (
                                  <span className="ml-2 text-xs text-muted-foreground line-through">
                                    {money(baseLineTotal)}
                                  </span>
                                ) : null}
                                {couponDiscount > 0 ? (
                                  <p className="text-[11px] font-medium text-accent">
                                    Coupon -{money(couponDiscount)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {renderCouponBox()}

                <div className="space-y-2">
                  {isExpressDeliveryAvailable &&
                    deliveryType === "delivery" &&
                    !billingOnly && (
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              Express Delivery
                            </span>
                          </div>
                          <Switch
                            checked={isExpressDelivery}
                            onCheckedChange={setIsExpressDelivery}
                            disabled={!isExpressDeliveryAvailable}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                        {deliveryType === "delivery" &&
                        !billingOnly &&
                        isExpressDelivery &&
                        expressDeliveryMessages.length > 0 ? (
                          <p className="text-sm text-primary">
                            {expressDeliveryMessages.join(" ")}
                          </p>
                        ) : null}
                        {!isExpressDeliveryAvailable && (
                          <p className="text-xs text-muted-foreground">
                            Express delivery not available for your location
                          </p>
                        )}
                      </div>
                    )}

                  <div className="rounded-lg border p-4 space-y-3">
                    <label className="font-medium text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Payment Method
                    </label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) =>
                        setPaymentMethod(value as PaymentMethod)
                      }
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cod" id="mobile-cod" />
                        <Label
                          htmlFor="mobile-cod"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <span>Cash on Delivery</span>
                          {paymentMethod === "cod" && (
                            <Badge variant="outline" className="text-xs">
                              Pay when delivered
                            </Badge>
                          )}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="online" id="mobile-online" />
                        <Label
                          htmlFor="mobile-online"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <span>Pay Online</span>
                          {paymentMethod === "online" && (
                            <Badge variant="outline" className="text-xs">
                              Instant payment
                            </Badge>
                          )}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {deliveryType === "delivery" &&
                  !billingOnly &&
                  shippingIssues.length > 0 ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <div className="font-semibold">
                        Shipping not available
                      </div>
                      <div className="mt-1">
                        {shippingAvailabilityMessage ||
                          "Some items cannot be shipped to this address."}
                      </div>
                    </div>
                  ) : null}

                  {deliveryType === "delivery" &&
                  !billingOnly &&
                  zoneNotes.length > 0 ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                      {zoneNotes.join(" ")}
                    </div>
                  ) : null}

                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{money(displaySubtotal)}</span>
                  </div>

                  {deliveryType === "delivery" && !billingOnly && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>
                        {shippingLoading
                          ? "Calculating…"
                          : money(displayShippingCost)}
                      </span>
                    </div>
                  )}
                  {totalSavings > 0 && (
                    <div className="flex justify-between rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
                      <span>Your Savings</span>
                      <span>{money(totalSavings)}</span>
                    </div>
                  )}
                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{money(finalTotal)}</span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>

        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur">
          <div className="px-4 py-3">
            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-base font-semibold rounded-lg"
              disabled={
                placingOrder ||
                (mobileStep === 2 && hasShippingUnavailableItems)
              }
              onClick={() => {
                if (mobileStep === 1) {
                  if (!canProceedToPay()) {
                    handleProceedToPay();
                    return;
                  }
                  trackCheckoutProgress({
                    ...checkoutAnalyticsPayload,
                    step: "review_order",
                    delivery_type: deliveryType,
                  });
                  setMobileStep(2);
                  return;
                }

                handleProceedToPay();
              }}
            >
              {placingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : mobileStep === 1 ? (
                "Continue"
              ) : paymentMethod === "cod" ? (
                "Place Order"
              ) : (
                "Proceed to Pay"
              )}
            </Button>
          </div>
        </footer>

        {emailLoginSheet}
        <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="site-container py-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <Badge variant="secondary" className="shrink-0">
            {selectedFulfillmentLabel}
          </Badge>
        </div>

        {authHydrated && isLoggedIn ? null : (
          <div className="hidden">
            <Card className="border-primary/30 bg-primary/5 shadow-card lg:col-span-2">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <Badge className="mb-2 bg-accent text-accent-foreground hover:bg-accent">
                      Recommended
                    </Badge>
                    <h2 className="text-xl font-bold text-primary">
                      Sign in for faster checkout
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Use your account to save addresses and view order updates.
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 md:w-auto">
                  <Button
                    className="h-11 w-full min-w-44 gap-2 bg-primary hover:bg-primary/90"
                    onClick={handleGoogleLogin}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold">
                      G
                    </span>
                    Login with Google
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 w-full min-w-44 gap-2 border-primary/40 bg-background hover:bg-primary/10"
                    onClick={() => handleEmailLogin()}
                  >
                    <Mail className="h-4 w-4" />
                    Email with OTP
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {authHydrated && !isLoggedIn ? (
              <Card className="border-primary/30 bg-primary/5 shadow-card">
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <Badge className="mb-2 bg-accent text-accent-foreground hover:bg-accent">
                        Recommended
                      </Badge>
                      <h2 className="text-xl font-bold text-primary">
                        Sign in for faster checkout
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Use your account to save addresses and view order
                        updates.
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-3 md:w-auto">
                    <Button
                      className="h-11 w-full min-w-44 gap-2 bg-primary hover:bg-primary/90"
                      onClick={handleGoogleLogin}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold">
                        G
                      </span>
                      Login with Google
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 w-full min-w-44 gap-2 border-primary/40 bg-background hover:bg-primary/10"
                      onClick={() => handleEmailLogin()}
                    >
                      <Mail className="h-4 w-4" />
                      Email with OTP
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {billingOnly ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup
                    value={selectedBillingAddress}
                    onValueChange={(value) =>
                      updateSelectedAddress("billing", value)
                    }
                  >
                    {billingAddresses.map((address) => (
                      <AddressOptionRow
                        key={address.id}
                        address={address}
                        radioId={`billing-only-desktop-${address.id}`}
                        selected={selectedBillingAddress === address.id}
                      />
                    ))}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="new"
                        id="billing-only-desktop-new"
                      />
                      <Label
                        htmlFor="billing-only-desktop-new"
                        className="cursor-pointer"
                      >
                        <Plus className="h-4 w-4 inline mr-2" />
                        Add New Billing Address
                      </Label>
                    </div>
                  </RadioGroup>
                  {renderFieldError("billing", "addressSelection")}

                  {selectedBillingAddress === "new" && (
                    <div className="border rounded-lg p-4 space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {renderNameFields("billing", "billing-only-desktop")}
                        <div>
                          <Label htmlFor="billing-only-desktop-email">
                            Email
                          </Label>
                          <Input
                            id="billing-only-desktop-email"
                            value={newBillingAddress.email}
                            onChange={(e) =>
                              updateDraftField(
                                "billing",
                                "email",
                                e.target.value,
                              )
                            }
                            placeholder="Enter email"
                            inputMode="email"
                            autoComplete="email"
                            className={getFieldErrorClass("billing", "email")}
                          />
                          {renderFieldError("billing", "email")}
                        </div>
                        <div>
                          <Label htmlFor="billing-only-desktop-phone">
                            Phone Number *
                          </Label>
                          <Input
                            id="billing-only-desktop-phone"
                            value={newBillingAddress.phone}
                            onChange={(e) =>
                              updateDraftField(
                                "billing",
                                "phone",
                                e.target.value,
                              )
                            }
                            placeholder="Enter phone number"
                            inputMode="tel"
                            autoComplete="tel"
                            required
                          />
                        </div>
                      </div>
                      <AddressAutocomplete
                        id="billing-only-desktop-address"
                        label="Address"
                        placeholder="Enter full address"
                        value={newBillingAddress.address}
                        onChange={(value) =>
                          updateDraftField("billing", "address", value)
                        }
                        onPlaceSelect={(place) => {
                          if (place.address_components) {
                            const components = place.address_components;
                            const city =
                              components.find((c) =>
                                c.types.includes("locality"),
                              )?.long_name || "";
                            const state =
                              components.find((c) =>
                                c.types.includes("administrative_area_level_1"),
                              )?.long_name || "";
                            const pincode =
                              components.find((c) =>
                                c.types.includes("postal_code"),
                              )?.long_name || "";

                            setNewBillingAddress((prev) => ({
                              ...prev,
                              address: place.formatted_address || prev.address,
                              city: city || prev.city,
                              state: state || prev.state,
                              pincode: pincode || prev.pincode,
                            }));
                          }
                        }}
                      />
                      {renderFieldError("billing", "address")}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="billing-only-desktop-city">
                            City
                          </Label>
                          <Input
                            id="billing-only-desktop-city"
                            value={newBillingAddress.city}
                            onChange={(e) =>
                              updateDraftField(
                                "billing",
                                "city",
                                e.target.value,
                              )
                            }
                            placeholder="City"
                            className={getFieldErrorClass("billing", "city")}
                          />
                          {renderFieldError("billing", "city")}
                        </div>
                        <div>
                          <Label htmlFor="billing-only-desktop-state">
                            State
                          </Label>
                          <Input
                            id="billing-only-desktop-state"
                            value={newBillingAddress.state}
                            onChange={(e) =>
                              updateDraftField(
                                "billing",
                                "state",
                                e.target.value,
                              )
                            }
                            placeholder="State"
                            className={getFieldErrorClass("billing", "state")}
                          />
                          {renderFieldError("billing", "state")}
                        </div>
                        <div>
                          <Label htmlFor="billing-only-desktop-pincode">
                            Pincode
                          </Label>
                          <Input
                            id="billing-only-desktop-pincode"
                            value={newBillingAddress.pincode}
                            onChange={(e) =>
                              updateDraftField(
                                "billing",
                                "pincode",
                                e.target.value,
                              )
                            }
                            placeholder="Pincode"
                            className={getFieldErrorClass("billing", "pincode")}
                          />
                          {renderFieldError("billing", "pincode")}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : deliveryType === "delivery" ? (
              <>
                {/* Billing Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={selectedBillingAddress}
                      onValueChange={(value) =>
                        updateSelectedAddress("billing", value)
                      }
                    >
                      {billingAddresses.map((address) => (
                        <AddressOptionRow
                          key={address.id}
                          address={address}
                          radioId={`billing-${address.id}`}
                          selected={selectedBillingAddress === address.id}
                        />
                      ))}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="billing-new" />
                        <Label htmlFor="billing-new" className="cursor-pointer">
                          <Plus className="h-4 w-4 inline mr-2" />
                          Add New Billing Address
                        </Label>
                      </div>
                    </RadioGroup>
                    {renderFieldError("billing", "addressSelection")}

                    {selectedBillingAddress === "new" && (
                      <div className="border rounded-lg p-4 space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {renderNameFields("billing", "billing")}
                          <div>
                            <Label htmlFor="billing-email">Email</Label>
                            <Input
                              id="billing-email"
                              value={newBillingAddress.email}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "email",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter email"
                              inputMode="email"
                              autoComplete="email"
                              className={getFieldErrorClass("billing", "email")}
                            />
                            {renderFieldError("billing", "email")}
                          </div>
                          <div>
                            <Label htmlFor="billing-phone">
                              Phone Number *
                            </Label>
                            <Input
                              id="billing-phone"
                              value={newBillingAddress.phone}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "phone",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter phone number"
                              inputMode="tel"
                              autoComplete="tel"
                              required
                            />
                          </div>
                        </div>
                        <AddressAutocomplete
                          id="billing-address"
                          label="Address"
                          placeholder="Enter full address"
                          value={newBillingAddress.address}
                          onChange={(value) =>
                            updateDraftField("billing", "address", value)
                          }
                          onPlaceSelect={(place) => {
                            // Auto-fill city, state, pincode from Google Places result
                            if (place.address_components) {
                              const components = place.address_components;
                              const city =
                                components.find((c) =>
                                  c.types.includes("locality"),
                                )?.long_name || "";
                              const state =
                                components.find((c) =>
                                  c.types.includes(
                                    "administrative_area_level_1",
                                  ),
                                )?.long_name || "";
                              const pincode =
                                components.find((c) =>
                                  c.types.includes("postal_code"),
                                )?.long_name || "";

                              setNewBillingAddress((prev) => ({
                                ...prev,
                                address:
                                  place.formatted_address || prev.address,
                                city: city || prev.city,
                                state: state || prev.state,
                                pincode: pincode || prev.pincode,
                              }));
                            }
                          }}
                        />
                        {renderFieldError("billing", "address")}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="billing-city">City</Label>
                            <Input
                              id="billing-city"
                              value={newBillingAddress.city}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "city",
                                  e.target.value,
                                )
                              }
                              placeholder="City"
                              className={getFieldErrorClass("billing", "city")}
                            />
                            {renderFieldError("billing", "city")}
                          </div>
                          <div>
                            <Label htmlFor="billing-state">State</Label>
                            <Input
                              id="billing-state"
                              value={newBillingAddress.state}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "state",
                                  e.target.value,
                                )
                              }
                              placeholder="State"
                              className={getFieldErrorClass("billing", "state")}
                            />
                            {renderFieldError("billing", "state")}
                          </div>
                          <div>
                            <Label htmlFor="billing-pincode">Pincode</Label>
                            <Input
                              id="billing-pincode"
                              value={newBillingAddress.pincode}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "pincode",
                                  e.target.value,
                                )
                              }
                              placeholder="Pincode"
                              className={getFieldErrorClass(
                                "billing",
                                "pincode",
                              )}
                            />
                            {renderFieldError("billing", "pincode")}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {addressesLoading && (
                      <div className="text-sm text-muted-foreground">
                        Loading saved addresses…
                      </div>
                    )}
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="use-billing-as-shipping"
                          checked={useBillingAsShipping}
                          onCheckedChange={(checked) =>
                            setUseBillingAsShipping(checked === true)
                          }
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <Label
                            htmlFor="use-billing-as-shipping"
                            className="cursor-pointer font-semibold"
                          >
                            Use billing address as delivery address
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Shipping cost and delivery availability will be
                            checked using your billing address.
                          </p>
                        </div>
                      </div>
                    </div>

                    {!useBillingAsShipping && (
                      <>
                        <RadioGroup
                          value={selectedShippingAddress}
                          onValueChange={(value) =>
                            updateSelectedAddress("shipping", value)
                          }
                        >
                          {shippingAddresses.map((address) => (
                            <AddressOptionRow
                              key={address.id}
                              address={address}
                              radioId={`shipping-${address.id}`}
                              selected={selectedShippingAddress === address.id}
                            />
                          ))}
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new" id="shipping-new" />
                            <Label
                              htmlFor="shipping-new"
                              className="cursor-pointer"
                            >
                              <Plus className="h-4 w-4 inline mr-2" />
                              Add New Shipping Address
                            </Label>
                          </div>
                        </RadioGroup>
                        {renderFieldError("shipping", "addressSelection")}
                      </>
                    )}

                    {!useBillingAsShipping &&
                      selectedShippingAddress === "new" && (
                        <div className="border rounded-lg p-4 space-y-4 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {renderNameFields("shipping", "shipping")}
                            <div>
                              <Label htmlFor="shipping-email">Email</Label>
                              <Input
                                id="shipping-email"
                                value={newShippingAddress.email}
                                onChange={(e) =>
                                  updateDraftField(
                                    "shipping",
                                    "email",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter email"
                                inputMode="email"
                                autoComplete="email"
                                className={getFieldErrorClass(
                                  "shipping",
                                  "email",
                                )}
                              />
                              {renderFieldError("shipping", "email")}
                            </div>
                            <div>
                              <Label htmlFor="shipping-phone">
                                Phone Number *
                              </Label>
                              <Input
                                id="shipping-phone"
                                value={newShippingAddress.phone}
                                onChange={(e) =>
                                  updateDraftField(
                                    "shipping",
                                    "phone",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter phone number"
                                inputMode="tel"
                                autoComplete="tel"
                                required
                              />
                            </div>
                          </div>
                          <AddressAutocomplete
                            id="shipping-address"
                            label="Address"
                            placeholder="Enter full address"
                            value={newShippingAddress.address}
                            onChange={(value) =>
                              updateDraftField("shipping", "address", value)
                            }
                            onPlaceSelect={(place) => {
                              // Auto-fill city, state, pincode from Google Places result
                              if (place.address_components) {
                                const components = place.address_components;
                                const city =
                                  components.find((c) =>
                                    c.types.includes("locality"),
                                  )?.long_name || "";
                                const state =
                                  components.find((c) =>
                                    c.types.includes(
                                      "administrative_area_level_1",
                                    ),
                                  )?.long_name || "";
                                const pincode =
                                  components.find((c) =>
                                    c.types.includes("postal_code"),
                                  )?.long_name || "";

                                setNewShippingAddress((prev) => ({
                                  ...prev,
                                  address:
                                    place.formatted_address || prev.address,
                                  city: city || prev.city,
                                  state: state || prev.state,
                                  pincode: pincode || prev.pincode,
                                }));
                              }
                            }}
                          />
                          {renderFieldError("shipping", "address")}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="shipping-city">City</Label>
                              <Input
                                id="shipping-city"
                                value={newShippingAddress.city}
                                onChange={(e) =>
                                  updateDraftField(
                                    "shipping",
                                    "city",
                                    e.target.value,
                                  )
                                }
                                placeholder="City"
                                className={getFieldErrorClass(
                                  "shipping",
                                  "city",
                                )}
                              />
                              {renderFieldError("shipping", "city")}
                            </div>
                            <div>
                              <Label htmlFor="shipping-state">State</Label>
                              <Input
                                id="shipping-state"
                                value={newShippingAddress.state}
                                onChange={(e) =>
                                  updateDraftField(
                                    "shipping",
                                    "state",
                                    e.target.value,
                                  )
                                }
                                placeholder="State"
                                className={getFieldErrorClass(
                                  "shipping",
                                  "state",
                                )}
                              />
                              {renderFieldError("shipping", "state")}
                            </div>
                            <div>
                              <Label htmlFor="shipping-pincode">Pincode</Label>
                              <Input
                                id="shipping-pincode"
                                value={newShippingAddress.pincode}
                                onChange={(e) =>
                                  updateDraftField(
                                    "shipping",
                                    "pincode",
                                    e.target.value,
                                  )
                                }
                                placeholder="Pincode"
                                className={getFieldErrorClass(
                                  "shipping",
                                  "pincode",
                                )}
                              />
                              {renderFieldError("shipping", "pincode")}
                            </div>
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Pickup Details */
              <section className="space-y-5">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Store className="h-5 w-5" />
                  Pickup Details
                </div>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Billing Address
                    </h3>
                    <RadioGroup
                      value={selectedBillingAddress}
                      onValueChange={(value) =>
                        updateSelectedAddress("billing", value)
                      }
                    >
                      {billingAddresses.map((address) => (
                        <AddressOptionRow
                          key={address.id}
                          address={address}
                          radioId={`pickup-billing-${address.id}`}
                          selected={selectedBillingAddress === address.id}
                        />
                      ))}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="pickup-billing-new" />
                        <Label
                          htmlFor="pickup-billing-new"
                          className="cursor-pointer"
                        >
                          <Plus className="h-4 w-4 inline mr-2" />
                          Add New Billing Address
                        </Label>
                      </div>
                    </RadioGroup>
                    {renderFieldError("billing", "addressSelection")}

                    {selectedBillingAddress === "new" && (
                      <div className="border rounded-lg p-4 space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {renderNameFields("billing", "pickup-billing")}
                          <div>
                            <Label htmlFor="pickup-billing-email">Email</Label>
                            <Input
                              id="pickup-billing-email"
                              value={newBillingAddress.email}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "email",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter email"
                              inputMode="email"
                              autoComplete="email"
                              className={getFieldErrorClass("billing", "email")}
                            />
                            {renderFieldError("billing", "email")}
                          </div>
                          <div>
                            <Label htmlFor="pickup-billing-phone">
                              Phone Number *
                            </Label>
                            <Input
                              id="pickup-billing-phone"
                              value={newBillingAddress.phone}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "phone",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter phone number"
                              inputMode="tel"
                              autoComplete="tel"
                              required
                            />
                          </div>
                        </div>
                        <AddressAutocomplete
                          id="pickup-billing-address"
                          label="Address"
                          placeholder="Enter full address"
                          value={newBillingAddress.address}
                          onChange={(value) =>
                            updateDraftField("billing", "address", value)
                          }
                          onPlaceSelect={(place) => {
                            // Auto-fill city, state, pincode from Google Places result
                            if (place.address_components) {
                              const components = place.address_components;
                              const city =
                                components.find((c) =>
                                  c.types.includes("locality"),
                                )?.long_name || "";
                              const state =
                                components.find((c) =>
                                  c.types.includes(
                                    "administrative_area_level_1",
                                  ),
                                )?.long_name || "";
                              const pincode =
                                components.find((c) =>
                                  c.types.includes("postal_code"),
                                )?.long_name || "";

                              setNewBillingAddress((prev) => ({
                                ...prev,
                                address:
                                  place.formatted_address || prev.address,
                                city: city || prev.city,
                                state: state || prev.state,
                                pincode: pincode || prev.pincode,
                              }));
                            }
                          }}
                        />
                        {renderFieldError("billing", "address")}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="pickup-billing-city">City</Label>
                            <Input
                              id="pickup-billing-city"
                              value={newBillingAddress.city}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "city",
                                  e.target.value,
                                )
                              }
                              placeholder="City"
                              className={getFieldErrorClass("billing", "city")}
                            />
                            {renderFieldError("billing", "city")}
                          </div>
                          <div>
                            <Label htmlFor="pickup-billing-state">State</Label>
                            <Input
                              id="pickup-billing-state"
                              value={newBillingAddress.state}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "state",
                                  e.target.value,
                                )
                              }
                              placeholder="State"
                              className={getFieldErrorClass("billing", "state")}
                            />
                            {renderFieldError("billing", "state")}
                          </div>
                          <div>
                            <Label htmlFor="pickup-billing-pincode">
                              Pincode
                            </Label>
                            <Input
                              id="pickup-billing-pincode"
                              value={newBillingAddress.pincode}
                              onChange={(e) =>
                                updateDraftField(
                                  "billing",
                                  "pincode",
                                  e.target.value,
                                )
                              }
                              placeholder="Pincode"
                              className={getFieldErrorClass(
                                "billing",
                                "pincode",
                              )}
                            />
                            {renderFieldError("billing", "pincode")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {renderPickupLocationCard()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pickup-date">
                        Pickup Date (optional)
                      </Label>
                      <Input
                        id="pickup-date"
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pickup-time">
                        Pickup Time (optional)
                      </Label>
                      <Select value={pickupTime} onValueChange={setPickupTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                          <SelectItem value="13:00">1:00 PM</SelectItem>
                          <SelectItem value="14:00">2:00 PM</SelectItem>
                          <SelectItem value="15:00">3:00 PM</SelectItem>
                          <SelectItem value="16:00">4:00 PM</SelectItem>
                          <SelectItem value="17:00">5:00 PM</SelectItem>
                          <SelectItem value="18:00">6:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Store hours: 9:00 AM - 7:00 PM (Mon-Sat)</span>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-24">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle>Order Summary</CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  {count} {count === 1 ? "item" : "items"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-[28rem] overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="h-12 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlaceholder
                            label={`${item.name} image unavailable`}
                            iconClassName="h-5 w-5"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="line-clamp-1 text-sm font-medium"
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                        {item.isBogoOfferItem ? (
                          <Badge
                            variant="secondary"
                            className="mt-1 text-[10px]"
                          >
                            BOGO offer
                          </Badge>
                        ) : null}
                        {(() => {
                          const issues = getItemShippingIssueMessages(item);
                          if (!issues.length && item.shippingAvailable === true)
                            return null;

                          const fallbackMessage =
                            item.shippingAvailable !== true
                              ? "Shipping not available"
                              : "Shipping not available for this address";
                          const displayIssues = issues.length
                            ? issues
                            : [fallbackMessage];

                          return (
                            <div className="mt-1 space-y-1">
                              {displayIssues.map((message) => (
                                <p
                                  key={message}
                                  className="text-xs font-semibold text-destructive"
                                >
                                  {message}
                                </p>
                              ))}
                            </div>
                          );
                        })()}
                        {(() => {
                          const {
                            saleLineTotal,
                            baseLineTotal,
                            couponDiscount,
                            hasDiscount,
                          } = getDisplayLineTotals(item);

                          return (
                            <div className="flex justify-between items-center gap-3 mt-1">
                              <span className="text-sm text-muted-foreground">
                                Qty: {item.qty}
                              </span>
                              <div className="text-right">
                                <span className="text-sm font-semibold">
                                  {money(saleLineTotal)}
                                </span>
                                {hasDiscount ? (
                                  <span className="ml-2 text-xs text-muted-foreground line-through">
                                    {money(baseLineTotal)}
                                  </span>
                                ) : null}
                                {couponDiscount > 0 ? (
                                  <p className="text-[11px] font-medium text-accent">
                                    Coupon -{money(couponDiscount)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {renderCouponBox()}

                {/* Pricing */}
                <div className="space-y-2">
                  {deliveryType === "delivery" &&
                  !billingOnly &&
                  shippingIssues.length > 0 ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <div className="font-semibold">
                        Shipping not available
                      </div>
                      <div className="mt-1">
                        {shippingAvailabilityMessage ||
                          "Some items cannot be shipped to this address."}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{money(displaySubtotal)}</span>
                  </div>

                  {deliveryType === "delivery" && !billingOnly && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>
                        {shippingLoading
                          ? "Calculating…"
                          : money(displayShippingCost)}
                      </span>
                    </div>
                  )}

                  {totalSavings > 0 && (
                    <div className="flex justify-between rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
                      <span>Your Savings</span>
                      <span>{money(totalSavings)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{money(finalTotal)}</span>
                  </div>
                </div>

                {/* Express Delivery Toggle */}
                {isExpressDeliveryAvailable &&
                  deliveryType === "delivery" &&
                  !billingOnly && (
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" />
                          <span className="font-medium">Express Delivery</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isExpressDelivery}
                            onCheckedChange={setIsExpressDelivery}
                            disabled={!isExpressDeliveryAvailable}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                      </div>
                      {deliveryType === "delivery" &&
                      !billingOnly &&
                      isExpressDelivery &&
                      expressDeliveryMessages.length > 0 ? (
                        <p className="text-sm text-primary">
                          {expressDeliveryMessages.join(" ")}
                        </p>
                      ) : null}
                      {!isExpressDeliveryAvailable && (
                        <p className="text-xs text-muted-foreground">
                          Express delivery not available for your location
                        </p>
                      )}
                    </div>
                  )}

                {/* Payment Method Selection */}
                <div className="rounded-lg border p-4 space-y-3">
                  <label className="font-medium text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Payment Method
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(value) =>
                          setPaymentMethod(value as PaymentMethod)
                        }
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cod" id="cod" />
                          <Label
                            htmlFor="cod"
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span>Cash on Delivery</span>
                            {paymentMethod === "cod" && (
                              <Badge variant="outline" className="text-xs">
                                Pay when delivered
                              </Badge>
                            )}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="online" id="online" />
                          <Label
                            htmlFor="online"
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span>Pay Online</span>
                            {paymentMethod === "online" && (
                              <Badge variant="outline" className="text-xs">
                                Instant payment
                              </Badge>
                            )}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                {/* {showSaturdayDeliveryMessage ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                    {specialDeliveryMessage}
                  </div>
                ) : null} */}

                {deliveryType === "delivery" &&
                !billingOnly &&
                zoneNotes.length > 0 ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                    {zoneNotes.join(" ")}
                  </div>
                ) : null}

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold rounded-lg mt-6"
                  onClick={handleProceedToPay}
                  disabled={
                    placingOrder ||
                    shippingLoading ||
                    hasShippingUnavailableItems ||
                    !canProceedToPay() ||
                    !paymentMethod
                  }
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {paymentMethod === "cod"
                        ? "Place Order"
                        : "Proceed to Pay"}
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
      {emailLoginSheet}
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default Checkout;
