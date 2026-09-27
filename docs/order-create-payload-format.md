# Order Create Payload Format

This document describes the payload shape used by the checkout flow in `template-e-commerce-7-5-26` when creating a website order or starting an online payment session.

Primary frontend source:
- `src/views/pages/Checkout.tsx`

Primary backend consumers:
- `POST /business_website/chat_widget/create_order_from_website_checkout`
- `POST /business_website/chat_widget/init_payment_with_order_session`

## Two Payload Flows

There are two related payloads in checkout:

1. Direct website order create
   - endpoint: `POST /business_website/chat_widget/create_order_from_website_checkout`
   - used for guest/COD-style website order creation

2. Online payment session init
   - endpoint: `POST /business_website/chat_widget/init_payment_with_order_session`
   - used before order creation when payment method is online
   - wraps `orderData` in an array: `orderData: [chatWidgetPayload.orderData]`

## Item Payload Rules

Each checkout item is normalized into an order item object.

Required/important fields:

```json
{
  "itemId": "6a2169636fa632d550e98ddf",
  "type": "catalog-product",
  "itemType": "product",
  "groupId": "variant-object-id-if-any",
  "description": "Product name",
  "quantity": 2,
  "quantityUnit": "pcs",
  "amount": 11.98,
  "basePrice": 5.99,
  "salePrice": 5.99,
  "shippingAvailable": true,
  "storePickupAvailable": true,
  "dispatchPoints": ["dispatch-point-id"],
  "storePickupDispatchPoint": {},
  "lineId": "itemId:groupId-or-default",
  "catalogId": "catalog-id",
  "catalogueId": "catalog-id"
}
```

## Item Layout

Each entry inside `orderData.items` should follow this layout:

```json
{
  "itemId": "base-product-object-id",
  "type": "catalog-product",
  "itemType": "product",
  "groupId": "variant-id-if-any",
  "description": "Product name shown in checkout",
  "quantity": 1,
  "quantityUnit": "pcs",
  "amount": 5.99,
  "basePrice": 5.99,
  "salePrice": 5.99,
  "shippingAvailable": true,
  "storePickupAvailable": true,
  "dispatchPoints": ["dispatch-point-id"],
  "storePickupDispatchPoint": {},
  "lineId": "itemId:groupId-or-default",
  "catalogId": "catalog-id",
  "catalogueId": "catalog-id",
  "hasBogoOffer": false,
  "isOfferItem": false,
  "isBogoOfferItem": false,
  "offerType": "",
  "bogoPromotionId": "",
  "bogoPromotionCode": "",
  "bogoSourceItemId": "",
  "bogoFreeProductId": "",
  "bogoFreeGroupId": "",
  "bogoDiscountPercent": 0
}
```

## Item Required Fields

These fields should be treated as required for product rows:

- `itemId`: must be the base product ObjectId
- `type`: currently `"catalog-product"`
- `itemType`: currently `"product"`
- `description`: product name/label
- `quantity`: numeric quantity
- `quantityUnit`: usually `"pcs"`
- `amount`: line sale total
- `basePrice`: unit MRP/base price
- `salePrice`: unit sale price
- `lineId`: stable line key, usually `itemId:groupId-or-default`
- `catalogId` or `catalogueId`: catalogue reference

Conditionally required fields:

- `groupId`: required when the row is for a selected variant
- `dispatchPoints`: required when product fulfillment depends on dispatch points
- `storePickupDispatchPoint`: required when store pickup is available/selected

## Item Field Meaning

- `itemId`: base product id only, never a combined `productId-variantId` string
- `groupId`: selected variant/group id
- `amount`: sale total for that row, not unit price
- `basePrice`: original unit price before offer/coupon
- `salePrice`: actual unit price before coupon allocation in backend
- `hasBogoOffer`: paid item is eligible for BOGO or free row belongs to BOGO set
- `isOfferItem`: true only for generated offer/free rows
- `isBogoOfferItem`: true only for BOGO free rows

## BOGO Item Layout

When the row is a free BOGO row, this is the expected layout:

```json
{
  "itemId": "free-product-id",
  "type": "catalog-product",
  "itemType": "product",
  "groupId": "free-variant-id-if-any",
  "description": "Free item name",
  "quantity": 1,
  "quantityUnit": "pcs",
  "amount": 0,
  "basePrice": 0,
  "salePrice": 0,
  "shippingAvailable": true,
  "storePickupAvailable": true,
  "dispatchPoints": ["dispatch-point-id"],
  "storePickupDispatchPoint": {},
  "lineId": "free-product-id:free-variant-id-or-default",
  "catalogId": "catalog-id",
  "catalogueId": "catalog-id",
  "hasBogoOffer": true,
  "isOfferItem": true,
  "isBogoOfferItem": true,
  "offerType": "bogo",
  "bogoPromotionId": "promotion-id",
  "bogoPromotionCode": "PROMO-CODE",
  "bogoSourceItemId": "source-line-id",
  "bogoFreeProductId": "free-product-id",
  "bogoFreeGroupId": "free-variant-id-or-empty",
  "bogoDiscountPercent": 100
}
```

## BOGO Required Fields

If `isBogoOfferItem` is `true`, these fields become required:

- `offerType`: must be `"bogo"`
- `bogoPromotionId`: promotion reference
- `bogoPromotionCode`: promotion code if available
- `bogoFreeProductId`: free product ObjectId
- `bogoFreeGroupId`: free variant id when variant-specific
- `bogoDiscountPercent`: usually `100`

Strongly recommended for traceability:

- `bogoSourceItemId`: source paid line id that earned the free row

Price rules for BOGO free rows:

- `amount` must be `0`
- `basePrice` must be `0`
- `salePrice` must be `0`

Flag rules for BOGO free rows:

- `hasBogoOffer` must be `true`
- `isOfferItem` must be `true`
- `isBogoOfferItem` must be `true`

## Paid Item With BOGO Eligibility Layout

When a paid row qualifies for BOGO but is not the free row, use this shape:

```json
{
  "hasBogoOffer": true,
  "isOfferItem": false,
  "isBogoOfferItem": false,
  "offerType": "",
  "bogoPromotionId": "",
  "bogoPromotionCode": "",
  "bogoSourceItemId": "",
  "bogoFreeProductId": "",
  "bogoFreeGroupId": "",
  "bogoDiscountPercent": 0
}
```

Required behavior:

- keep `hasBogoOffer: true` if the paid line qualifies
- do not mark the paid row as `offerType: "bogo"`
- do not send BOGO free-row reference fields on the paid line

## Paid Item vs BOGO Free Item

This is the most important contract.

### Normal paid item

Paid items may still participate in a BOGO promotion, but they are not free rows.

Correct shape:

```json
{
  "hasBogoOffer": true,
  "isOfferItem": false,
  "isBogoOfferItem": false,
  "offerType": "",
  "bogoPromotionId": "",
  "bogoPromotionCode": "",
  "bogoSourceItemId": "",
  "bogoFreeProductId": "",
  "bogoFreeGroupId": "",
  "bogoDiscountPercent": 0
}
```

Important:
- `hasBogoOffer: true` is allowed on paid rows
- `offerType` must be empty for paid rows
- BOGO reference fields must be empty for paid rows

### Free BOGO item

Free rows are explicit offer rows and must carry BOGO metadata.

Correct shape:

```json
{
  "hasBogoOffer": true,
  "isOfferItem": true,
  "isBogoOfferItem": true,
  "offerType": "bogo",
  "bogoPromotionId": "promotion-id",
  "bogoPromotionCode": "PROMO-CODE",
  "bogoSourceItemId": "source-line-id",
  "bogoFreeProductId": "free-product-id",
  "bogoFreeGroupId": "free-variant-id-or-empty",
  "bogoDiscountPercent": 100,
  "amount": 0,
  "basePrice": 0,
  "salePrice": 0
}
```

## Common BOGO Mistake

This shape is wrong for a paid item:

```json
{
  "hasBogoOffer": true,
  "isBogoOfferItem": false,
  "offerType": "bogo"
}
```

Why it fails:
- backend BOGO validation treats `offerType === "bogo"` as a BOGO offer line
- that makes a normal paid row look like a free BOGO row
- `init_payment_with_order_session` can fail before the payment session is created

## `chatWidgetPayload.orderData` Shape

Checkout builds this object before either order-create or payment-session init:

```json
{
  "mode": "Standard Order",
  "source": "Website",
  "title": "First product name",
  "deliveryMode": "shipping",
  "items": [],
  "promotionCode": "COUPONCODE",
  "subtotal": 100,
  "shippingCost": 10,
  "finalAmount": 110,
  "billingAddress": {
    "fullName": "Customer Name",
    "addressLine1": "Address line",
    "city": "City",
    "state": "State",
    "pincode": "2440",
    "countryCode": "",
    "phone": "0412345678"
  },
  "pickupDetails": {
    "pickupDate": "2026-06-17",
    "pickupTime": "10:30 AM",
    "pickupLocation": {}
  },
  "notes": "Payment: online",
  "paymentMilestones": [
    {
      "label": "Website Order",
      "amount": 110,
      "dueDate": "2026-06-17",
      "status": "Pending",
      "paymentMode": "Online",
      "paymentType": "Online",
      "whatsappNotification": {
        "pending": false,
        "paid": false,
        "overdue": false
      }
    }
  ],
  "shippingDetails": []
}
```

## `shippingDetails` Shapes

### Billing only

```json
{
  "fulfillmentMode": "billing-only",
  "shippingStatus": "Pending",
  "shippingMethod": "Billing Only",
  "dispatchPoint": { "dispatchPointId": null },
  "dispatchPoints": [],
  "billToAddress": {}
}
```

### Store pickup

```json
{
  "fulfillmentMode": "store-pickup",
  "shippingStatus": "Pending",
  "shippingMethod": "Store Pickup",
  "dispatchPoint": {},
  "dispatchPoints": ["dispatch-point-id"],
  "pickupLocation": {},
  "pickupDate": "2026-06-17",
  "pickupTime": "10:30 AM",
  "billToAddress": {}
}
```

### Shipping / local delivery

```json
{
  "fulfillmentMode": "shipping",
  "shippingStatus": "Pending",
  "shippingMethod": "Local Delivery",
  "dispatchPoint": { "dispatchPointId": "dispatch-point-id" },
  "dispatchPointId": "dispatch-point-id",
  "dispatchPoints": ["dispatch-point-id"],
  "shipToAddress": {},
  "billToAddress": {}
}
```

## Direct Website Order Create Payload

The direct website order endpoint expects top-level customer/address fields plus `items`.

Typical shape:

```json
{
  "subdomain": "evercare.app.colaber.in",
  "phoneNumber": "0412345678",
  "countryCode": "+61",
  "name": "Customer Name",
  "email": "customer@example.com",
  "address": "Address line",
  "city": "West Kempsey",
  "pincode": "2440",
  "deliveryMode": "shipping",
  "pickupDate": "",
  "pickupTime": "",
  "pickupLocation": null,
  "billingAddress": {},
  "shippingAddress": {},
  "paymentMethod": "cod",
  "items": []
}
```

Notes:
- backend requires `subdomain`, phone, `countryCode`, `name`, `address`, `city`, `pincode`, and `items`
- this is different from the online payment session payload

## Online Payment Session Init Payload

This is the current frontend shape for online payment:

```json
{
  "customerId": "customer-id",
  "subdomain": "evercare.app.colaber.in",
  "orderData": [
    {
      "mode": "Standard Order",
      "source": "Website",
      "title": "Website Order",
      "deliveryMode": "shipping",
      "items": [],
      "promotionCode": "COUPONCODE",
      "subtotal": 100,
      "shippingCost": 10,
      "finalAmount": 110,
      "billingAddress": {},
      "paymentMilestones": [],
      "shippingDetails": []
    }
  ],
  "deliveryAddress": {},
  "totalAmount": 110,
  "promotionCode": "COUPONCODE",
  "returnUrl": "https://example.com/checkout"
}
```

Notes:
- `customerId` is required
- `orderData` must be an array for this endpoint
- backend recalculates amount from DB-backed item data, so frontend values are not the final source of truth

## Example Online Payment Payload

This example matches the `init_payment_with_order_session` format used in checkout.
It is similar to the `testfile` payload, but corrected so the paid BOGO row does not pretend to be a free BOGO row.

```json
{
  "customerId": "6a1450f34491a0b194b3100f",
  "subdomain": "evercare.app.colaber.in",
  "orderData": [
    {
      "mode": "Standard Order",
      "source": "Website",
      "title": "Eastern Black Pepper Powder 100g (Buy 2 Get 1 FREE)",
      "deliveryMode": "store-pickup",
      "items": [
        {
          "itemId": "6a2169636fa632d550e98ddf",
          "type": "catalog-product",
          "itemType": "product",
          "description": "Eastern Black Pepper Powder 100g (Buy 2 Get 1 FREE)",
          "quantity": 2,
          "quantityUnit": "pcs",
          "amount": 11.98,
          "basePrice": 5.99,
          "salePrice": 5.99,
          "shippingAvailable": true,
          "storePickupAvailable": true,
          "dispatchPoints": ["6a1c18be59164b8df9d00e40"],
          "storePickupDispatchPoint": {
            "_id": "6a1c18be59164b8df9d00e40",
            "id": "6a1c18be59164b8df9d00e40",
            "name": "IndiVerse"
          },
          "lineId": "6a2169636fa632d550e98ddf:default",
          "catalogId": "6a104234773dbbe2bd8595d3",
          "catalogueId": "6a104234773dbbe2bd8595d3",
          "hasBogoOffer": true,
          "isOfferItem": false,
          "isBogoOfferItem": false,
          "offerType": "",
          "bogoPromotionId": "",
          "bogoPromotionCode": "",
          "bogoSourceItemId": "",
          "bogoFreeProductId": "",
          "bogoFreeGroupId": "",
          "bogoDiscountPercent": 0
        },
        {
          "itemId": "6a2169636fa632d550e98ddf",
          "type": "catalog-product",
          "itemType": "product",
          "description": "Eastern Black Pepper Powder 100g (BOGO offer)",
          "quantity": 1,
          "quantityUnit": "pcs",
          "amount": 0,
          "basePrice": 0,
          "salePrice": 0,
          "shippingAvailable": true,
          "storePickupAvailable": true,
          "dispatchPoints": ["6a1c18be59164b8df9d00e40"],
          "storePickupDispatchPoint": {
            "_id": "6a1c18be59164b8df9d00e40",
            "id": "6a1c18be59164b8df9d00e40",
            "name": "IndiVerse"
          },
          "lineId": "bogo:6a2a03485d77f36d52cb5b6b:6a2169636fa632d550e98ddf:default",
          "catalogId": "6a104234773dbbe2bd8595d3",
          "catalogueId": "6a104234773dbbe2bd8595d3",
          "hasBogoOffer": true,
          "isOfferItem": true,
          "isBogoOfferItem": true,
          "offerType": "bogo",
          "bogoPromotionId": "6a2a03485d77f36d52cb5b6b",
          "bogoPromotionCode": "BTGO-001",
          "bogoSourceItemId": "6a2169636fa632d550e98ddf:default",
          "bogoFreeProductId": "6a2169636fa632d550e98ddf",
          "bogoFreeGroupId": "",
          "bogoDiscountPercent": 100
        },
        {
          "itemId": "6a216a316fa632d550e99e7f",
          "type": "catalog-product",
          "itemType": "product",
          "description": "Viswas Elayada Jackfruit 350g",
          "quantity": 1,
          "quantityUnit": "pcs",
          "amount": 5.99,
          "basePrice": 5.99,
          "salePrice": 5.99,
          "shippingAvailable": true,
          "storePickupAvailable": true,
          "dispatchPoints": ["6a1c18be59164b8df9d00e40"],
          "storePickupDispatchPoint": {
            "_id": "6a1c18be59164b8df9d00e40",
            "id": "6a1c18be59164b8df9d00e40",
            "name": "IndiVerse"
          },
          "lineId": "6a216a316fa632d550e99e7f:default",
          "catalogId": "6a103e2a773dbbe2bd858fec",
          "catalogueId": "6a103e2a773dbbe2bd858fec",
          "hasBogoOffer": false,
          "isOfferItem": false,
          "isBogoOfferItem": false,
          "offerType": "",
          "bogoPromotionId": "",
          "bogoPromotionCode": "",
          "bogoSourceItemId": "",
          "bogoFreeProductId": "",
          "bogoFreeGroupId": "",
          "bogoDiscountPercent": 0
        }
      ],
      "promotionCode": "",
      "subtotal": 17.97,
      "shippingCost": 0,
      "finalAmount": 17.97,
      "billingAddress": {
        "fullName": "Customer Name",
        "addressLine1": "13 Prior Circuit",
        "city": "West Kempsey",
        "state": "New South Wales",
        "pincode": "2441",
        "countryCode": "+61",
        "phone": "413244912"
      },
      "notes": "Payment: online; Pickup: 2026-06-17 10:30 AM",
      "paymentMilestones": [
        {
          "label": "Website Order",
          "amount": 17.97,
          "dueDate": "2026-06-17",
          "status": "Pending",
          "paymentMode": "Online",
          "paymentType": "Online",
          "whatsappNotification": {
            "pending": false,
            "paid": false,
            "overdue": false
          }
        }
      ],
      "shippingDetails": [
        {
          "fulfillmentMode": "store-pickup",
          "shippingStatus": "Pending",
          "shippingMethod": "Store Pickup",
          "dispatchPoint": {
            "_id": "6a1c18be59164b8df9d00e40",
            "id": "6a1c18be59164b8df9d00e40",
            "name": "IndiVerse"
          },
          "dispatchPoints": ["6a1c18be59164b8df9d00e40"],
          "pickupLocation": {
            "_id": "6a1c18be59164b8df9d00e40",
            "id": "6a1c18be59164b8df9d00e40",
            "name": "IndiVerse"
          },
          "pickupDate": "2026-06-17",
          "pickupTime": "10:30 AM",
          "billToAddress": {
            "fullName": "Customer Name",
            "addressLine1": "13 Prior Circuit",
            "city": "West Kempsey",
            "state": "New South Wales",
            "pincode": "2441",
            "countryCode": "+61",
            "phone": "413244912"
          }
        }
      ]
    }
  ],
  "deliveryAddress": {
    "fullName": "Customer Name",
    "addressLine1": "13 Prior Circuit",
    "city": "West Kempsey",
    "state": "New South Wales",
    "pincode": "2441",
    "countryCode": "+61",
    "phone": "413244912"
  },
  "promotionCode": "",
  "returnUrl": "https://evercare.app.colaber.in/checkout"
}
```

Key difference from the earlier broken `testfile` sample:

- the paid BOGO-qualified row keeps `hasBogoOffer: true`
- but it does not send `offerType: "bogo"`
- only the actual free BOGO row sends `offerType: "bogo"` and BOGO reference fields

## Backend Validation Notes

Backend validates these parts before payment/order processing:

- item/product ids
- variant/group ids
- BOGO free item count and references
- coupon/promotion code
- shipping/totals recalculation from database

That means frontend payload must preserve:

- base product id in `itemId`
- selected variant in `groupId`
- correct BOGO flags
- correct `catalogId` / `catalogueId`

## Safe Checklist

Before testing order create or payment init, verify:

1. Paid rows do not send `offerType: "bogo"`.
2. Free BOGO rows send `isBogoOfferItem: true` and zero prices.
3. `itemId` is always the base product ObjectId.
4. `groupId` is the selected variant id only, not combined into `itemId`.
5. `orderData` is an array for `init_payment_with_order_session`.
6. `customerId` is present for online payment session init.
