import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Edit2,
  LogOut,
  Mail,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { getBackendBaseUrl } from "@/lib/backendUrl";
import { sendWebsiteEmailOtp, verifyWebsiteEmailOtp } from "@/lib/emailAuthApi";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import {
  getCustomerOrderDetails,
  getCustomerOrders,
  type CustomerOrderSummary,
} from "@/lib/ordersApi";
import {
  addCustomerBillingAddress,
  addCustomerDeliveryAddress,
  deleteCustomerBillingAddress,
  deleteCustomerDeliveryAddress,
  getCustomerBillingAddresses,
  getCustomerDeliveryAddresses,
  updateCustomerBillingAddress,
  updateCustomerDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/deliveryAddressApi";
import { encryptData } from "@/utils/cryptoJS/cryptoJs";
import { setCustomerToken } from "@/utils/tokenKey";
import RenderOrderDetails from "./renderOrderDetails";

type AccountSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type LoginStep = "buttons" | "email" | "emailOtp";
type AccountView =
  | "menu"
  | "orders"
  | "orderDetails"
  | "billingAddresses"
  | "deliveryAddresses";
type AddressKind = "billing" | "shipping";
type OrderLineItem = NonNullable<CustomerOrderSummary["items"]>[number];

type AddressForm = {
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  countryCode: string;
};

const EMPTY_ADDRESS_FORM: AddressForm = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  pincode: "",
  countryCode: "",
};

const getErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Please try again";
const money = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(value)
    : "—";

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

const getOrderItemTaxedPrices = (item: OrderLineItem) => {
  const quantity = Math.max(1, Number(item.quantity || 1) || 1);
  const saleLine = Number.isFinite(Number(item.amount))
    ? Number(item.amount)
    : (Number(item.salePrice || 0) || 0) * quantity;
  const baseUnit = Number(item.basePrice ?? item.salePrice ?? 0) || 0;
  const saleUnit = Number(item.salePrice ?? item.basePrice ?? 0) || 0;
  const baseLine = baseUnit * quantity;
  const taxRate = Number(item.gstPercentage || 0) || 0;
  const savedTax = Number(item.gstAmount);
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

const getOrderTaxedSummary = (items?: CustomerOrderSummary["items"]) => {
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

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getPaymentStatus = (order: CustomerOrderSummary) =>
  order.paymentMilestones?.find((milestone) => milestone.status)?.status ||
  "Pending";

const getOrderLookupId = (order: CustomerOrderSummary) =>
  String(order._id || order.orderId || "").trim();

const formatAddress = (address?: {
  fullName?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}) =>
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

const formatSavedAddress = (address: DeliveryAddress) =>
  [
    address.fullName || address.name,
    address.addressLine1,
    [address.city, address.state, address.pincode].filter(Boolean).join(", "),
    address.phone,
  ]
    .filter(Boolean)
    .join("\n");

const toAddressForm = (address?: DeliveryAddress): AddressForm => ({
  _id: address?._id,
  fullName: String(address?.fullName || address?.name || ""),
  email: String(address?.email || ""),
  phone: String(address?.phone || ""),
  addressLine1: String(address?.addressLine1 || ""),
  city: String(address?.city || ""),
  state: String(address?.state || ""),
  pincode: String(address?.pincode || ""),
  countryCode: String(address?.countryCode || ""),
});

const AccountSheet = ({ open, onOpenChange }: AccountSheetProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { toast } = useToast();
  const { isLoggedIn, session, setSession, logout } = useCustomerAuth();
  const [step, setStep] = useState<LoginStep>("buttons");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [view, setView] = useState<AccountView>("menu");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersSearch, setOrdersSearch] = useState("");
  const debouncedOrdersSearch = useDebouncedValue(ordersSearch.trim(), 350);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [addressFormKind, setAddressFormKind] = useState<AddressKind | null>(
    null,
  );
  const [addressForm, setAddressForm] =
    useState<AddressForm>(EMPTY_ADDRESS_FORM);
  const [addressSaving, setAddressSaving] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState("");
  const returnTo = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );
  const customerId = session?.customerId ? String(session.customerId) : "";

  const ordersQuery = useQuery({
    queryKey: [
      "customer-orders",
      customerId,
      ordersPage,
      debouncedOrdersSearch,
    ],
    queryFn: () =>
      getCustomerOrders({
        customerId,
        page: ordersPage,
        search: debouncedOrdersSearch,
      }),
    enabled: open && isLoggedIn && view === "orders" && Boolean(customerId),
    staleTime: 1000 * 30,
  });

  const orderDetailsQuery = useQuery({
    queryKey: ["customer-order-details", customerId, selectedOrderId],
    queryFn: () =>
      getCustomerOrderDetails({ customerId, orderId: selectedOrderId }),
    enabled:
      open &&
      isLoggedIn &&
      view === "orderDetails" &&
      Boolean(customerId && selectedOrderId),
    staleTime: 1000 * 30,
  });

  const billingAddressesQuery = useQuery({
    queryKey: ["customer-addresses", "billing", customerId],
    queryFn: () => getCustomerBillingAddresses({ customerId }),
    enabled:
      open && isLoggedIn && view === "billingAddresses" && Boolean(customerId),
    staleTime: 1000 * 30,
  });

  const deliveryAddressesQuery = useQuery({
    queryKey: ["customer-addresses", "delivery", customerId],
    queryFn: () => getCustomerDeliveryAddresses({ customerId }),
    enabled:
      open && isLoggedIn && view === "deliveryAddresses" && Boolean(customerId),
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!open) {
      setView("menu");
      setOrdersPage(1);
      setOrdersSearch("");
      setSelectedOrderId("");
      setAddressFormKind(null);
      setAddressForm(EMPTY_ADDRESS_FORM);
      setDeletingAddressId("");
    }
  }, [open]);

  useEffect(() => {
    setOrdersPage(1);
  }, [debouncedOrdersSearch]);

  useEffect(() => {
    const error = (ordersQuery.error ||
      orderDetailsQuery.error ||
      billingAddressesQuery.error ||
      deliveryAddressesQuery.error) as (Error & { code?: string }) | null;
    if (!error) return;
    if (
      error.code === "TOKEN_EXPIRED" ||
      error.code === "TOKEN_INVALID" ||
      error.code === "NO_TOKEN"
    ) {
      logout();
      setView("menu");
      toast({
        title: "Session expired",
        description: "Please log in again to view your orders.",
        variant: "destructive",
      });
    }
  }, [
    ordersQuery.error,
    orderDetailsQuery.error,
    billingAddressesQuery.error,
    deliveryAddressesQuery.error,
    logout,
    toast,
  ]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const url = new URL(
        `${getBackendBaseUrl()}/auth/google/website/login/url`,
      );
      url.searchParams.set("origin", window.location.origin);
      url.searchParams.set("returnTo", returnTo || "/");

      const res = await fetch(url.toString(), { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || "Failed to start Google login");
      if (!json?.authUrl) throw new Error("Missing authUrl from server");
      window.location.href = String(json.authUrl);
    } catch (err: unknown) {
      toast({
        title: "Google login failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const value = String(email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await sendWebsiteEmailOtp({
        email: value,
        origin: window.location.origin,
        returnTo: returnTo || "/",
        subdomain: window.location.hostname,
      });
      if ((res as { success?: boolean; message?: string })?.success === false) {
        throw new Error(
          (res as { message?: string })?.message || "Failed to send OTP",
        );
      }
      setStep("emailOtp");
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
      setLoading(false);
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
    const value = String(email || "")
      .trim()
      .toLowerCase();
    const code = String(otp || "").trim();
    if (!code) {
      toast({ title: "Enter OTP", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await verifyWebsiteEmailOtp({
        email: value,
        otp: code,
        origin: window.location.origin,
        returnTo: returnTo || "/",
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
      setStep("buttons");
      setOtp("");
      toast({ title: "Logged in" });
    } catch (err: unknown) {
      toast({
        title: "OTP verification failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setStep("buttons");
    setEmail("");
    setOtp("");
    setView("menu");
    setAddressFormKind(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
    toast({ title: "Logged out" });
  };

  const accountOptions = [
    {
      label: "Orders",
      icon: ReceiptText,
      action: () => setView("orders"),
      closeOnClick: false,
    },
    {
      label: "Billing address",
      icon: MapPin,
      action: () => setView("billingAddresses"),
      closeOnClick: false,
    },
    {
      label: "Delivery address",
      icon: Truck,
      action: () => setView("deliveryAddresses"),
      closeOnClick: false,
    },
  ];

  const startAddAddress = (kind: AddressKind) => {
    setAddressFormKind(kind);
    setAddressForm(EMPTY_ADDRESS_FORM);
  };

  const startEditAddress = (kind: AddressKind, address: DeliveryAddress) => {
    setAddressFormKind(kind);
    setAddressForm(toAddressForm(address));
  };

  const closeAddressForm = () => {
    setAddressFormKind(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
  };

  const validateAddressForm = () => {
    const missing = [
      !addressForm.fullName.trim() ? "full name" : "",
      !addressForm.addressLine1.trim() ? "address" : "",
      !addressForm.city.trim() ? "city" : "",
      !addressForm.state.trim() ? "state" : "",
      !addressForm.pincode.trim() ? "pincode" : "",
    ].filter(Boolean);

    if (missing.length) {
      toast({
        title: "Address incomplete",
        description: `Please enter ${missing.join(", ")}.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSaveAddress = async (kind: AddressKind) => {
    if (!customerId || addressSaving || !validateAddressForm()) return;

    const addressPayload = {
      type: kind,
      name: kind,
      fullName: addressForm.fullName.trim(),
      email: addressForm.email.trim() || undefined,
      phone: addressForm.phone.replace(/[^\d]/g, ""),
      addressLine1: addressForm.addressLine1.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode: addressForm.pincode.trim(),
      countryCode: addressForm.countryCode.trim(),
    };

    setAddressSaving(true);
    try {
      if (kind === "billing") {
        if (addressForm._id) {
          await updateCustomerBillingAddress({
            customerId,
            addressId: addressForm._id,
            billingAddress: addressPayload,
          });
        } else {
          await addCustomerBillingAddress({
            customerId,
            billingAddress: addressPayload,
          });
        }
        await billingAddressesQuery.refetch();
      } else {
        if (addressForm._id) {
          await updateCustomerDeliveryAddress({
            customerId,
            addressId: addressForm._id,
            deliveryAddress: addressPayload,
          });
        } else {
          await addCustomerDeliveryAddress({
            customerId,
            deliveryAddress: addressPayload,
          });
        }
        await deliveryAddressesQuery.refetch();
      }

      closeAddressForm();
      toast({ title: addressForm._id ? "Address updated" : "Address added" });
    } catch (err: unknown) {
      toast({
        title: "Could not save address",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (kind: AddressKind, addressId?: string) => {
    if (!customerId || !addressId || deletingAddressId) return;
    const confirmed = window.confirm("Delete this address?");
    if (!confirmed) return;

    setDeletingAddressId(addressId);
    try {
      if (kind === "billing") {
        await deleteCustomerBillingAddress({ customerId, addressId });
        await billingAddressesQuery.refetch();
      } else {
        await deleteCustomerDeliveryAddress({ customerId, addressId });
        await deliveryAddressesQuery.refetch();
      }
      if (addressForm._id === addressId) closeAddressForm();
      toast({ title: "Address deleted" });
    } catch (err: unknown) {
      toast({
        title: "Could not delete address",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setDeletingAddressId("");
    }
  };

  const openOrderDetails = (order: CustomerOrderSummary) => {
    const id = getOrderLookupId(order);
    if (!id) {
      toast({
        title: "Order ID missing",
        description: "Could not open this order.",
        variant: "destructive",
      });
      return;
    }
    setSelectedOrderId(id);
    setView("orderDetails");
  };

  const renderAddressManager = (kind: AddressKind) => {
    const isBilling = kind === "billing";
    const query = isBilling ? billingAddressesQuery : deliveryAddressesQuery;
    const addresses = query.data ?? [];
    const title = isBilling ? "Billing address" : "Delivery address";
    const Icon = isBilling ? MapPin : Truck;
    const formOpen = addressFormKind === kind;

    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            closeAddressForm();
            setView("menu");
          }}
          className="-ml-2 gap-2 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-foreground">
              <Icon className="h-5 w-5 text-primary" />
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add, edit, or delete your saved{" "}
              {isBilling ? "billing" : "delivery"} addresses.
            </p>
          </div>
          {!formOpen ? (
            <Button
              type="button"
              size="sm"
              onClick={() => startAddAddress(kind)}
              className="shrink-0 gap-1 rounded-full"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          ) : null}
        </div>

        {formOpen ? (
          <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-extrabold">
                {addressForm._id ? "Edit address" : "Add new address"}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeAddressForm}
                disabled={addressSaving}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
            <div className="space-y-3">
              <Input
                value={addressForm.fullName}
                onChange={(event) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Full name"
              />
              <Input
                value={addressForm.email}
                onChange={(event) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="Email optional"
                inputMode="email"
              />
              <Input
                value={addressForm.phone}
                onChange={(event) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                placeholder="Phone optional"
                inputMode="tel"
              />
              <Input
                value={addressForm.addressLine1}
                onChange={(event) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    addressLine1: event.target.value,
                  }))
                }
                placeholder="Address line"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  value={addressForm.city}
                  onChange={(event) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      city: event.target.value,
                    }))
                  }
                  placeholder="City"
                />
                <Input
                  value={addressForm.state}
                  onChange={(event) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      state: event.target.value,
                    }))
                  }
                  placeholder="State"
                />
                <Input
                  value={addressForm.pincode}
                  onChange={(event) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      pincode: event.target.value,
                    }))
                  }
                  placeholder="Pincode"
                />
              </div>
              <Button
                type="button"
                onClick={() => handleSaveAddress(kind)}
                disabled={addressSaving}
                className="w-full rounded-full font-bold"
              >
                {addressSaving
                  ? "Saving..."
                  : addressForm._id
                    ? "Update address"
                    : "Save address"}
              </Button>
            </div>
          </div>
        ) : null}

        {query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`${kind}-address-skeleton-${index}`}
                className="rounded-lg border border-border bg-card p-3"
              >
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="mt-3 h-3 w-full rounded-full" />
                <Skeleton className="mt-2 h-3 w-2/3 rounded-full" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-bold text-destructive">
              Could not load addresses
            </p>
            <p className="mt-1 text-muted-foreground">
              {getErrorMessage(query.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              className="mt-3 rounded-full"
            >
              Try again
            </Button>
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-5 text-center">
            <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-bold">
              No saved {isBilling ? "billing" : "delivery"} address
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add one here or save it during checkout.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address._id}
                className="rounded-lg border border-border bg-card p-3 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-foreground">
                      {address.fullName || address.name || "Address"}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-5 text-muted-foreground">
                      {formatSavedAddress(address)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditAddress(kind, address)}
                      className="h-8 w-8 rounded-full p-0"
                      aria-label="Edit address"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAddress(kind, address._id)}
                      disabled={deletingAddressId === address._id}
                      className="h-8 w-8 rounded-full p-0 text-destructive hover:text-destructive"
                      aria-label="Delete address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOrders = () => {
    const orders = ordersQuery.data?.orders ?? [];
    const pagination = ordersQuery.data?.pagination;

    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setView("menu")}
          className="-ml-2 gap-2 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div>
          <h3 className="text-lg font-extrabold text-foreground">
            Your orders
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your recent EvercareMed orders.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={ordersSearch}
            onChange={(event) => setOrdersSearch(event.target.value)}
            placeholder="Search by order ID or title"
            className="pl-9"
          />
        </div>

        {ordersQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`order-skeleton-${index}`}
                className="rounded-lg border border-border bg-card p-3"
              >
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="mt-3 h-3 w-full rounded-full" />
                <Skeleton className="mt-2 h-3 w-2/3 rounded-full" />
              </div>
            ))}
          </div>
        ) : ordersQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-bold text-destructive">Could not load orders</p>
            <p className="mt-1 text-muted-foreground">
              {getErrorMessage(ordersQuery.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => ordersQuery.refetch()}
              className="mt-3 rounded-full"
            >
              Try again
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-5 text-center">
            <ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-bold">No orders yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your orders will appear here after checkout.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const id = String(order.orderId || order._id || "");
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openOrderDetails(order)}
                  className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-soft transition-smooth hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-foreground">
                        {order.title || "Website Order"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {id ? `#${id}` : "Order ID unavailable"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {order.status || order.progress || "Pending"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="mt-1 font-bold">
                        {formatDate(order.createdDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment</p>
                      <p className="mt-1 font-bold">
                        {getPaymentStatus(order)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="mt-1 font-bold">
                        {money(order.finalAmount)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {pagination && (pagination.hasPrev || pagination.hasNext) ? (
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev || ordersQuery.isFetching}
              onClick={() => {
                setSelectedOrderId("");
                setOrdersPage((page) => Math.max(1, page - 1));
              }}
              className="rounded-full"
            >
              Previous
            </Button>
            <span className="text-xs font-medium text-muted-foreground">
              Page {pagination.currentPage ?? ordersPage} of{" "}
              {pagination.totalPages ?? 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext || ordersQuery.isFetching}
              onClick={() => {
                setSelectedOrderId("");
                setOrdersPage((page) => page + 1);
              }}
              className="rounded-full"
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile ? "h-[86vh] rounded-t-xl p-0" : "w-full p-0 sm:max-w-md"
        }
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="sticky top-0 z-10 flex-row items-center justify-between space-y-0 border-b border-border bg-background px-4 py-4 text-left">
            <div className="flex items-center gap-2">
              {!isLoggedIn ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 rounded-full p-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}
              <SheetTitle className="text-xl font-extrabold">
                Account
              </SheetTitle>
            </div>
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="mr-7 gap-2 rounded-full"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : null}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            {isLoggedIn ? (
              <div className="mb-5 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {session?.name || "Customer"}
                  </p>
                  {session?.email ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {session.email}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <h3 className="text-lg font-extrabold text-foreground">
                  Login to your account
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use Google or email OTP to continue.
                </p>

                {step === "buttons" ? (
                  <div className="mt-4 space-y-3">
                    <Button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="h-11 w-full rounded-full font-bold"
                    >
                      <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full border border-primary-foreground/40 text-xs font-bold">
                        G
                      </span>
                      {loading ? "Opening Google..." : "Login with Google"}
                    </Button>
                    <Button
                      onClick={() => setStep("email")}
                      variant="outline"
                      className="h-11 w-full rounded-full border-primary/40 font-bold"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email with OTP
                    </Button>
                  </div>
                ) : step === "email" ? (
                  <div className="mt-4 space-y-3">
                    <Input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      type="email"
                    />
                    <Button
                      onClick={handleSendEmailOtp}
                      disabled={loading}
                      className="h-11 w-full rounded-full font-bold"
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </Button>
                    <Button
                      onClick={() => setStep("buttons")}
                      variant="ghost"
                      className="w-full rounded-full"
                    >
                      Back
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Input
                      value={otp}
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="Enter OTP"
                      inputMode="numeric"
                    />
                    <p className="text-xs text-muted-foreground">
                      Sent to{" "}
                      {String(email || "")
                        .trim()
                        .toLowerCase()}
                    </p>
                    <Button
                      onClick={handleVerifyEmailOtp}
                      disabled={loading}
                      className="h-11 w-full rounded-full font-bold"
                    >
                      {loading ? "Verifying..." : "Verify and login"}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSendEmailOtp}
                        disabled={loading}
                        variant="outline"
                        className="flex-1 rounded-full"
                      >
                        Resend
                      </Button>
                      <Button
                        onClick={() => setStep("email")}
                        disabled={loading}
                        variant="ghost"
                        className="flex-1 rounded-full"
                      >
                        Change email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoggedIn ? (
              <div className="space-y-2">
                {view === "orders" ? (
                  renderOrders()
                ) : view === "orderDetails" ? (
                  <RenderOrderDetails
                    orderDetailsQuery={orderDetailsQuery}
                    customerId={customerId}
                    setView={setView}
                    selectedOrderId={selectedOrderId}
                  />
                ) : view === "billingAddresses" ? (
                  renderAddressManager("billing")
                ) : view === "deliveryAddresses" ? (
                  renderAddressManager("shipping")
                ) : (
                  accountOptions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          item.action();
                          if (item.closeOnClick) onOpenChange(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-soft transition-smooth hover:border-primary/30"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-sm font-bold">
                          {item.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccountSheet;
