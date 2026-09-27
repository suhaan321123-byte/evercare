"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Home,
  Building,
  Check,
  X,
} from "lucide-react";
import {
  websiteAddDeliveryAddressApi,
  websiteDeleteDeliveryAddressApi,
  websiteGetCustomerDeliveryAddressApi,
  websiteUpdateDeliveryAddressApi,
} from "@/api/chatWidget/chatWidgetApi";
import AlertModal from "@/components/ui/modal/alertModal";
import { countryOptions } from "@/utils/countryOptions/countryOptions";
import LeafletSelectCoordinates from "@/components/leaflet/coordinates/leafletSelectCoordinates";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const DeliveryAddressUI = ({ selectedAddress, setSelectedAddress }) => {
  const { session: customerAuthData } = useCustomerAuth();
  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState({
    type: "home",
    name: "Home",
    fullName: "",
    countryCode: "+91",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
    lat: null,
    lng: null,
  });
  const [pincodeValidating, setPincodeValidating] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState(null);

  const [pincodeValid, setPincodeValid] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [showSelectCoordinates, setShowSelectCoordinates] = useState(false);

  useEffect(() => {
    if (addresses.length > 0) {
      setSelectedAddress(
        addresses.find((addr) => addr.isDefault) || addresses[0],
      );
    }
  }, [addresses]);

  const getCustomerDeliveryAddress = useCallback(async () => {
    try {
      const response = await websiteGetCustomerDeliveryAddressApi({
        customerId: customerAuthData?.customerId,
      });
      if (response?.message === "success" && response?.data) {
        setAddresses(response?.data || []);
        setSelectedAddress(
          response?.data?.find((addr) => addr?.isDefault) ||
            response?.data[0] ||
            null,
        );
      } else {
        setAddresses([]);
      }
    } catch (error) {
      console.error(error);
    }
  }, [customerAuthData]);

  useEffect(() => {
    getCustomerDeliveryAddress();
  }, []);

  const validatePincode = async (pincode) => {
    setPincodeValidating(true);
    setPincodeError("");

    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`,
      );
      const data = await response.json();

      if (
        data[0].Status === "Success" &&
        data[0].PostOffice &&
        data[0].PostOffice.length > 0
      ) {
        setDeliveryLocation(data[0].PostOffice[0]);
        setNewAddress((prev) => ({
          ...prev,
          city: data?.[0]?.PostOffice?.[0]?.District || "",
          state: data?.[0]?.PostOffice?.[0]?.State || "",
        }));
        setPincodeError("");
        setPincodeValid(true);
      } else {
        setDeliveryLocation(null);
        setPincodeError("Not found");
        setPincodeValid(true);
      }
    } catch (error) {
      setPincodeError("Unable to validate pincode");
      setDeliveryLocation(null);
      setPincodeValid(true);
    } finally {
      setPincodeValidating(false);
    }
  };

  const handlePincodeChange = (pincode) => {
    const onlyNumbers = pincode.replace(/[^0-9]/g, "");
    const cleanPincode = onlyNumbers.slice(0, 6);
    setNewAddress((prev) => ({ ...prev, pincode: cleanPincode }));
    if (cleanPincode.length === 6) {
      validatePincode(cleanPincode);
    } else {
      setPincodeValid(null);
    }
  };

  const handleAddAddress = async () => {
    try {
      setPincodeError("");

      // Basic validation
      if (!newAddress?.fullName?.trim()) {
        return setSnackbar({
          open: true,
          message: "Please enter your full name.",
          severity: "error",
        });
      }
      if (!newAddress?.phone) {
        return setSnackbar({
          open: true,
          message: "Please enter a valid phone number.",
          severity: "error",
        });
      }
      if (!newAddress?.addressLine1?.trim()) {
        return setSnackbar({
          open: true,
          message: "Please enter your address?.",
          severity: "error",
        });
      }
      if (!newAddress?.pincode || !/^\d{6}$/.test(newAddress?.pincode)) {
        return setSnackbar({
          open: true,
          message: "Please enter a valid 6-digit pincode.",
          severity: "error",
        });
      }
      if (!newAddress?.city?.trim()) {
        return setSnackbar({
          open: true,
          message: "Please enter your city.",
          severity: "error",
        });
      }

      if (!newAddress?.state?.trim()) {
        return setSnackbar({
          open: true,
          message: "Please enter your state.",
          severity: "error",
        });
      }

      if (!newAddress?.lat || !newAddress?.lng) {
        return setSnackbar({
          open: true,
          message: "Please select a location on map.",
          severity: "error",
        });
      }

      // Send to API
      const response = await websiteAddDeliveryAddressApi({
        customerId: customerAuthData?.customerId,
        deliveryAddress: newAddress,
      });

      if (response?.message == "success" && response?.data) {
        setAddresses(response?.data || []);
        resetForm();
      } else {
        setSnackbar({
          open: true,
          message: response.message || "Failed to add address",
          severity: "error",
        });
      }
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to add address",
        severity: "error",
      });
    }
  };

  const handleEditAddress = (address) => {
    if (!address) return;
    setEditingAddressId(address?._id);
    setNewAddress(address);
    setShowAddAddressForm(true);
    setPincodeValid(true);
  };

  const handleUpdateAddress = async () => {
    try {
      setPincodeError("");
      if (
        !newAddress?.fullName?.trim() ||
        !newAddress?.phone ||
        !newAddress?.addressLine1?.trim() ||
        !newAddress?.pincode ||
        !/^\d{6}$/.test(newAddress?.pincode) ||
        !newAddress?.city?.trim() ||
        !newAddress?.state?.trim()
      ) {
        return setSnackbar({
          open: true,
          message: "Please enter valid details",
          severity: "error",
        });
      }

      if (!newAddress?.lat || !newAddress?.lng) {
        return setSnackbar({
          open: true,
          message: "Please select a location on map.",
          severity: "error",
        });
      }

      const response = await websiteUpdateDeliveryAddressApi({
        customerId: customerAuthData?.customerId,
        addressId: editingAddressId,
        updatedAddress: newAddress,
      });
      if (response?.message == "success" && response?.data) {
        setAddresses(response?.data || []);
        resetForm();
      } else {
        setSnackbar({
          open: true,
          message: response.message || "Failed to update address",
          severity: "error",
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      // Call the API to delete the address
      const response = await websiteDeleteDeliveryAddressApi({
        customerId: customerAuthData?.customerId,
        addressId: addressId,
      });

      if (response?.success) {
        // Update frontend state by removing the deleted address
        setAddresses((prev) => prev.filter((addr) => addr?._id !== addressId));

        // If the deleted address was selected, reset selectedAddress
        setSelectedAddress((prev) => (prev?._id === addressId ? null : prev));
      } else {
        console.error("Failed to delete address");
      }
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  const resetForm = () => {
    setNewAddress({
      type: "home",
      name: "",
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false,
      lat: null,
      lng: null,
    });
    setShowAddAddressForm(false);
    setEditingAddressId(null);
    setPincodeValid(null);
  };

  const getAddressIcon = (type) => {
    switch (type) {
      case "home":
        return <Home className="w-4 h-4" />;
      case "work":
        return <Building className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Delivery Address Section */}
      <div className="mb-2">
        {selectedAddress ? (
          <div className="bg-white p-3 rounded-lg border border-blue-200 flex gap-2 justify-between">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">
                {getAddressIcon(selectedAddress?.type)}
              </div>
              <div className="flex-1 text-sm">
                <div className="text-gray-600 text-ellipsis line-clamp-1 whitespace-pre-line">
                  {selectedAddress?.city}, {selectedAddress?.state} -{" "}
                  {selectedAddress?.pincode}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddressModal(true)}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddressModal(true)}
            className="w-full p-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-400 transition-colors"
          >
            <Plus className="w-5 h-5 mx-auto mb-1" />
            <div className="text-sm font-medium">Add Delivery Address</div>
          </button>
        )}
      </div>

      {/* Address Selection Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Select Address</h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-96 p-4">
              {addresses.map((address) => (
                <div
                  key={address?._id}
                  className={`border rounded-lg p-3 mb-3 cursor-pointer transition-colors ${
                    selectedAddress?._id === address?._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedAddress(address)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <div
                        className={`mt-0.5 ${
                          selectedAddress?._id === address?._id
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      >
                        {getAddressIcon(address?.type)}
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{address?.name}</span>
                          {address?.isDefault && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-gray-600 mt-1">
                          {address?.fullName}
                        </div>
                        <div className="text-gray-600">
                          {address?.addressLine1}
                          {address?.addressLine2 &&
                            `, ${address?.addressLine2}`}
                        </div>
                        <div className="text-gray-600">
                          {address?.city}, {address?.state} - {address?.pincode}
                        </div>
                        <div className="text-gray-600">
                          {address?.countryCode || ""}
                          {address?.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      {selectedAddress?._id === address?._id && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAddress(address);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-3 h-3 text-gray-400" />
                      </button>
                      {addresses.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAddress(address?._id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setShowAddAddressForm(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Address
              </button>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => setShowAddressModal(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirm Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Address Form */}
      {showAddAddressForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingAddressId ? "Edit Address" : "Add New Address"}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showSelectCoordinates ? (
              <>
                <LeafletSelectCoordinates
                  onAddressSelect={(addressData) => {
                    setNewAddress((prev) => ({ ...prev, ...addressData }));
                  }}
                  initialLocation={{
                    lat: newAddress?.lat || 10.1632,
                    lng: newAddress?.lng || 76.6413,
                    locationAddress: newAddress?.locationAddress || {},
                  }} // Optional initial location
                  onBack={() => setShowSelectCoordinates(false)}
                  needDefaultLocation={!newAddress?.lat && !newAddress?.lng}
                />
              </>
            ) : (
              <>
                <div className="overflow-y-auto max-h-96 p-4 space-y-4">
                  {/* Address Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "home", label: "Home", icon: Home },
                        { value: "work", label: "Work", icon: Building },
                        { value: "other", label: "Other", icon: MapPin },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setNewAddress((prev) => ({
                              ...prev,
                              type: value,
                              name: label,
                            }))
                          }
                          className={`p-2 border rounded-lg flex flex-col items-center gap-1 transition-colors ${
                            newAddress?.type === value
                              ? "border-blue-500 bg-blue-50 text-blue-600"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Address Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Home, Office, etc."
                      value={newAddress?.name}
                      onChange={(e) =>
                        setNewAddress((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={newAddress?.fullName}
                      onChange={(e) =>
                        setNewAddress((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number *
                    </label>
                    <div className="flex flex-col">
                      <div className="flex">
                        <select
                          name="alternativeContactCountryCode"
                          value={newAddress.countryCode}
                          onChange={(e) =>
                            setNewAddress((prev) => ({
                              ...prev,
                              countryCode: e.target.value,
                            }))
                          }
                          className="w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white border-r-0"
                        >
                          {countryOptions.map((country, index) => (
                            <option
                              key={`${country.code}-${country.country}-${index}`}
                              value={country.code}
                            >
                              {country.code} {country.country}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          name="phone"
                          value={newAddress?.phone}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 15);
                            setNewAddress((prev) => ({
                              ...prev,
                              phone: value,
                            }));
                          }}
                          required
                          placeholder=""
                          className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:ring-blue-500 rounded-r-md focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Line 1 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      placeholder="House No, Building, Street"
                      value={newAddress?.addressLine1}
                      onChange={(e) =>
                        setNewAddress((prev) => ({
                          ...prev,
                          addressLine1: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Address Line 2 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      placeholder="Landmark, Area (Optional)"
                      value={newAddress?.addressLine2}
                      onChange={(e) =>
                        setNewAddress((prev) => ({
                          ...prev,
                          addressLine2: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Delivery Location *
                    </label>

                    {newAddress?.lat && newAddress?.lng ? (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div
                          onClick={() => setShowSelectCoordinates(true)}
                          className="flex items-start gap-3 cursor-pointer"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            </div>
                          </div>

                          <div className="flex-1">
                            {/* Display fullAddress if available */}
                            {newAddress?.locationAddress?.fullAddress && (
                              <div className="mb-2 flex justify-between gap-2">
                                <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                                  {newAddress.locationAddress.fullAddress}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setShowSelectCoordinates(true)}
                      >
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg
                            className="w-6 h-6 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Select Delivery Location
                        </p>
                        <p className="text-xs text-gray-500">
                          Click to set your location on the map
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="400001"
                        value={newAddress?.pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          pincodeValid === false
                            ? "border-red-300 bg-red-50"
                            : pincodeValid === true
                              ? "border-green-300 bg-green-50"
                              : "border-gray-300"
                        }`}
                        maxLength={6}
                        required
                      />
                      {pincodeValidating && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                        </div>
                      )}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {pincodeValid == true && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {pincodeValid === false && (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {pincodeValid === false && (
                      <p className="text-red-500 text-xs mt-1">
                        Please enter a valid 6-digit pincode
                      </p>
                    )}

                    {pincodeError && (
                      <p className="mt-1 text-sm text-yellow-600 dark:text-red-400">
                        {pincodeError}
                      </p>
                    )}
                    {deliveryLocation && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          <strong>
                            {deliveryLocation.District},{" "}
                            {deliveryLocation.State}
                          </strong>
                          <br />
                          <span className="text-green-600 dark:text-green-300">
                            Circle: {deliveryLocation.Circle}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* City & State */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        placeholder="Mumbai"
                        value={newAddress?.city}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        placeholder="Maharashtra"
                        value={newAddress?.state}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            state: e.target.value,
                          }))
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Default Address */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={newAddress?.isDefault}
                      onChange={(e) =>
                        setNewAddress((prev) => ({
                          ...prev,
                          isDefault: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="isDefault"
                      className="ml-2 text-sm text-gray-700"
                    >
                      Set as default address
                    </label>
                  </div>
                </div>

                <div className="p-4 border-t flex gap-3">
                  <button
                    onClick={resetForm}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={
                      editingAddressId ? handleUpdateAddress : handleAddAddress
                    }
                    disabled={
                      !newAddress?.fullName ||
                      !newAddress?.phone ||
                      !newAddress?.addressLine1 ||
                      !newAddress?.city ||
                      !newAddress?.state ||
                      !pincodeValid
                    }
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {editingAddressId ? "Update" : "Save"} Address
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </>
  );
};

export default DeliveryAddressUI;
