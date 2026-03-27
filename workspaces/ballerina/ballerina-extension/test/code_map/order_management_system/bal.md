# Project CodeMap

## CodeMap Structure

This document provides a structured overview of the project codebase.
It is organized by file path and summarizes the following elements for each file.
Each artifact is listed with its sub-properties on separate indented lines.


---

## File Path : modules/customer/constants.bal

### Variables


- public CUSTOMER_ID_PREFIX
  - **Line Range**: (2:0-2:48)

- public MIN_NAME_LENGTH
  - **Line Range**: (3:0-3:37)

- public MAX_NAME_LENGTH
  - **Line Range**: (4:0-4:38)

---

## File Path : modules/customer/service.bal

### Imports


- ballerina/http
  - **Line Range**: (2:0-2:22)

- ballerina/time
  - **Line Range**: (3:0-3:22)

- ballerina/uuid
  - **Line Range**: (4:0-4:22)

### Variables


- final customerStore
  - **Type**: map<customer:Customer>
  - **Line Range**: (6:0-6:39)

### Classes


- public service class CustomerService
  - **Line Range**: (8:0-120:1)

  - public function getCustomer
    - **Parameters**: [customerId: string]
    - **Returns**: [Customer|http:NotFound]
    - **Line Range**: (11:4-17:5)

  - post resource function customers
    - **Parameters**: [request: CustomerCreateRequest]
    - **Returns**: [Customer|http:BadRequest|http:InternalServerError]
    - **Line Range**: (19:4-49:5)

  - get resource function customers/[string customerId]
    - **Parameters**: none
    - **Returns**: [Customer|http:NotFound]
    - **Line Range**: (51:4-57:5)

  - get resource function customers
    - **Parameters**: none
    - **Returns**: [Customer[]]
    - **Line Range**: (59:4-61:5)

  - put resource function customers/[string customerId]
    - **Parameters**: [request: CustomerUpdateRequest]
    - **Returns**: [Customer|http:NotFound|http:BadRequest]
    - **Line Range**: (63:4-111:5)

  - delete resource function customers/[string customerId]
    - **Parameters**: none
    - **Returns**: [http:NoContent|http:NotFound]
    - **Line Range**: (113:4-119:5)

---

## File Path : modules/customer/types.bal

### Types


- type Customer
  - **Type Descriptor**: record
  - **Fields**: [customerId: string, firstName: string, lastName: string, email: string, phone: string, address: customer:Address, createdAt: string, updatedAt: string]
  - **Line Range**: (2:0-11:3)

- type Address
  - **Type Descriptor**: record
  - **Fields**: [street: string, city: string, state: string, zipCode: string, country: string]
  - **Line Range**: (13:0-19:3)

- type CustomerCreateRequest
  - **Type Descriptor**: record
  - **Fields**: [firstName: string, lastName: string, email: string, phone: string, address: customer:Address]
  - **Line Range**: (21:0-27:3)

- type CustomerUpdateRequest
  - **Type Descriptor**: record
  - **Fields**: [firstName: string?, lastName: string?, email: string?, phone: string?, address: customer:Address?]
  - **Line Range**: (29:0-35:3)

---

## File Path : modules/customer/utils.bal

### Functions


- public function validateEmail
  - **Parameters**: [email: string]
  - **Returns**: [boolean]
  - **Line Range**: (2:0-5:1)

- public function validatePhone
  - **Parameters**: [phone: string]
  - **Returns**: [boolean]
  - **Line Range**: (7:0-10:1)

- public function validateName
  - **Parameters**: [name: string]
  - **Returns**: [boolean]
  - **Line Range**: (12:0-15:1)

---

## File Path : modules/product/constants.bal

### Variables


- public PRODUCT_ID_PREFIX
  - **Line Range**: (2:0-2:47)

- public MIN_PRICE
  - **Line Range**: (3:0-3:38)

- public MIN_STOCK
  - **Line Range**: (4:0-4:31)

---

## File Path : modules/product/service.bal

### Imports


- ballerina/http
  - **Line Range**: (2:0-2:22)

- ballerina/time
  - **Line Range**: (3:0-3:22)

- ballerina/uuid
  - **Line Range**: (4:0-4:22)

### Variables


- final productStore
  - **Type**: map<product:Product>
  - **Line Range**: (6:0-6:37)

### Classes


- public service class ProductService
  - **Line Range**: (8:0-128:1)

  - public function getProduct
    - **Parameters**: [productId: string]
    - **Returns**: [Product|http:NotFound]
    - **Line Range**: (11:4-17:5)

  - post resource function products
    - **Parameters**: [request: ProductCreateRequest]
    - **Returns**: [Product|http:BadRequest]
    - **Line Range**: (19:4-49:5)

  - get resource function products/[string productId]
    - **Parameters**: none
    - **Returns**: [Product|http:NotFound]
    - **Line Range**: (51:4-57:5)

  - get resource function products
    - **Parameters**: [category: string? = ()]
    - **Returns**: [Product[]]
    - **Line Range**: (59:4-70:5)

  - put resource function products/[string productId]
    - **Parameters**: [request: ProductUpdateRequest]
    - **Returns**: [Product|http:NotFound|http:BadRequest]
    - **Line Range**: (72:4-119:5)

  - delete resource function products/[string productId]
    - **Parameters**: none
    - **Returns**: [http:NoContent|http:NotFound]
    - **Line Range**: (121:4-127:5)

---

## File Path : modules/product/types.bal

### Types


- type Product
  - **Type Descriptor**: record
  - **Fields**: [productId: string, name: string, description: string, price: decimal, stockQuantity: int, category: string, status: product:ProductStatus, createdAt: string, updatedAt: string]
  - **Line Range**: (2:0-12:3)

- type ProductCreateRequest
  - **Type Descriptor**: record
  - **Fields**: [name: string, description: string, price: decimal, stockQuantity: int, category: string]
  - **Line Range**: (14:0-20:3)

- type ProductUpdateRequest
  - **Type Descriptor**: record
  - **Fields**: [name: string?, description: string?, price: decimal?, stockQuantity: int?, category: string?, status: product:ProductStatus?]
  - **Line Range**: (22:0-29:3)

- type ProductStatus
  - **Type Descriptor**: enum
  - **Fields**: [ACTIVE, INACTIVE, OUT_OF_STOCK]
  - **Line Range**: (31:0-35:1)

---

## File Path : modules/product/utils.bal

### Functions


- public function validatePrice
  - **Parameters**: [price: decimal]
  - **Returns**: [boolean]
  - **Line Range**: (2:0-4:1)

- public function validateStock
  - **Parameters**: [quantity: int]
  - **Returns**: [boolean]
  - **Line Range**: (6:0-8:1)

- public function isProductAvailable
  - **Parameters**: [stockQuantity: int]
  - **Returns**: [boolean]
  - **Line Range**: (10:0-12:1)

---

## File Path : main.bal

### Imports


- order_management_system.'order
  - **Line Range**: (2:0-2:38)

- order_management_system.customer
  - **Line Range**: (3:0-3:40)

- order_management_system.payment
  - **Line Range**: (4:0-4:39)

- order_management_system.product
  - **Line Range**: (5:0-5:39)

- ballerina/http
  - **Line Range**: (7:0-7:22)

### Configurables


- configurable port
  - **Type**: int
  - **Line Range**: (9:0-9:29)

### Automations (Entry Points)


- public function main
  - **Parameters**: none
  - **Returns**: [error?]
  - **Line Range**: (11:0-25:1)

---

## File Path : modules/order/constants.bal

### Variables


- public ORDER_ID_PREFIX
  - **Line Range**: (2:0-2:44)

- public MIN_ORDER_QUANTITY
  - **Line Range**: (3:0-3:40)

- public ZERO_AMOUNT
  - **Line Range**: (4:0-4:39)

---

## File Path : modules/order/service.bal

### Imports


- order_management_system.customer
  - **Line Range**: (2:0-2:40)

- order_management_system.product
  - **Line Range**: (3:0-3:39)

- ballerina/http
  - **Line Range**: (5:0-5:22)

- ballerina/time
  - **Line Range**: (6:0-6:22)

- ballerina/uuid
  - **Line Range**: (7:0-7:22)

### Variables


- final orderStore
  - **Type**: map<order:Order>
  - **Line Range**: (9:0-9:33)

### Classes


- public service class OrderService
  - **Line Range**: (11:0-143:1)

  - private final customerService
    - **Type**: customer:CustomerService
    - **Line Range**: (14:4-14:59)

  - private final productService
    - **Type**: product:ProductService
    - **Line Range**: (15:4-15:56)

  - public function init
    - **Parameters**: [customerService: customer:CustomerService, productService: product:ProductService]
    - **Returns**: ()
    - **Line Range**: (17:4-20:5)

  - public function getOrder
    - **Parameters**: [orderId: string]
    - **Returns**: [Order|http:NotFound]
    - **Line Range**: (22:4-28:5)

  - post resource function orders
    - **Parameters**: [request: OrderCreateRequest]
    - **Returns**: [Order|http:BadRequest|http:NotFound]
    - **Line Range**: (30:4-84:5)

  - get resource function orders/[string orderId]
    - **Parameters**: none
    - **Returns**: [Order|http:NotFound]
    - **Line Range**: (86:4-92:5)

  - get resource function orders
    - **Parameters**: [customerId: string? = (), status: OrderStatus? = ()]
    - **Returns**: [Order[]]
    - **Line Range**: (94:4-112:5)

  - put resource function orders/[string orderId]/status
    - **Parameters**: [request: OrderUpdateStatusRequest]
    - **Returns**: [Order|http:NotFound|http:BadRequest]
    - **Line Range**: (114:4-130:5)

  - delete resource function orders/[string orderId]
    - **Parameters**: none
    - **Returns**: [http:NoContent|http:NotFound|http:BadRequest]
    - **Line Range**: (132:4-142:5)

---

## File Path : modules/order/types.bal

### Types


- type Order
  - **Type Descriptor**: record
  - **Fields**: [orderId: string, customerId: string, items: order:OrderItem[], totalAmount: decimal, status: order:OrderStatus, shippingAddress: string, createdAt: string, updatedAt: string]
  - **Line Range**: (2:0-11:3)

- type OrderItem
  - **Type Descriptor**: record
  - **Fields**: [productId: string, productName: string, quantity: int, unitPrice: decimal, subtotal: decimal]
  - **Line Range**: (13:0-19:3)

- type OrderCreateRequest
  - **Type Descriptor**: record
  - **Fields**: [customerId: string, items: order:OrderItemRequest[], shippingAddress: string]
  - **Line Range**: (21:0-25:3)

- type OrderItemRequest
  - **Type Descriptor**: record
  - **Fields**: [productId: string, quantity: int]
  - **Line Range**: (27:0-30:3)

- type OrderUpdateStatusRequest
  - **Type Descriptor**: record
  - **Fields**: [status: order:OrderStatus]
  - **Line Range**: (32:0-34:3)

- type OrderStatus
  - **Type Descriptor**: enum
  - **Fields**: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
  - **Line Range**: (36:0-43:1)

---

## File Path : modules/order/utils.bal

### Functions


- public function calculateSubtotal
  - **Parameters**: [quantity: int, unitPrice: decimal]
  - **Returns**: [decimal]
  - **Line Range**: (2:0-5:1)

- public function calculateTotalAmount
  - **Parameters**: [items: OrderItem[]]
  - **Returns**: [decimal]
  - **Line Range**: (7:0-13:1)

- public function validateOrderQuantity
  - **Parameters**: [quantity: int]
  - **Returns**: [boolean]
  - **Line Range**: (15:0-17:1)

- public function canCancelOrder
  - **Parameters**: [status: OrderStatus]
  - **Returns**: [boolean]
  - **Line Range**: (19:0-21:1)

---

## File Path : modules/payment/constants.bal

### Variables


- public PAYMENT_ID_PREFIX
  - **Line Range**: (2:0-2:46)

- public TRANSACTION_ID_PREFIX
  - **Line Range**: (3:0-3:50)

---

## File Path : modules/payment/service.bal

### Imports


- order_management_system.'order
  - **Line Range**: (2:0-2:38)

- ballerina/http
  - **Line Range**: (4:0-4:22)

- ballerina/time
  - **Line Range**: (5:0-5:22)

- ballerina/uuid
  - **Line Range**: (6:0-6:22)

### Variables


- final paymentStore
  - **Type**: map<payment:Payment>
  - **Line Range**: (8:0-8:37)

### Classes


- public service class PaymentService
  - **Line Range**: (10:0-115:1)

  - private final orderService
    - **Type**: 'order:OrderService
    - **Line Range**: (13:4-13:51)

  - public function init
    - **Parameters**: [orderService: 'order:OrderService]
    - **Returns**: ()
    - **Line Range**: (15:4-17:5)

  - post resource function payments
    - **Parameters**: [request: PaymentCreateRequest]
    - **Returns**: [Payment|http:BadRequest|http:NotFound]
    - **Line Range**: (19:4-58:5)

  - get resource function payments/[string paymentId]
    - **Parameters**: none
    - **Returns**: [Payment|http:NotFound]
    - **Line Range**: (60:4-68:5)

  - get resource function payments
    - **Parameters**: [orderId: string? = (), customerId: string? = ()]
    - **Returns**: [Payment[]]
    - **Line Range**: (70:4-90:5)

  - post resource function payments/[string paymentId]/refund
    - **Parameters**: none
    - **Returns**: [Payment|http:NotFound|http:BadRequest]
    - **Line Range**: (92:4-114:5)

---

## File Path : modules/payment/types.bal

### Types


- type Payment
  - **Type Descriptor**: record
  - **Fields**: [paymentId: string, orderId: string, customerId: string, amount: decimal, paymentMethod: payment:PaymentMethod, status: payment:PaymentStatus, transactionId: string?, createdAt: string, updatedAt: string]
  - **Line Range**: (2:0-12:3)

- type PaymentCreateRequest
  - **Type Descriptor**: record
  - **Fields**: [orderId: string, paymentMethod: payment:PaymentMethod, paymentDetails: payment:PaymentDetails]
  - **Line Range**: (14:0-18:3)

- type PaymentDetails
  - **Type Descriptor**: record
  - **Fields**: [cardNumber: string?, cardHolderName: string?, expiryDate: string?, cvv: string?]
  - **Line Range**: (20:0-25:3)

- type PaymentMethod
  - **Type Descriptor**: enum
  - **Fields**: [CREDIT_CARD, DEBIT_CARD, PAYPAL, BANK_TRANSFER, CASH_ON_DELIVERY]
  - **Line Range**: (27:0-33:1)

- type PaymentStatus
  - **Type Descriptor**: enum
  - **Fields**: [PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED]
  - **Line Range**: (35:0-41:1)

---

## File Path : modules/payment/utils.bal

### Imports


- ballerina/uuid
  - **Line Range**: (2:0-2:22)

### Functions


- public function generateTransactionId
  - **Parameters**: none
  - **Returns**: [string]
  - **Line Range**: (4:0-6:1)

- public function processPayment
  - **Parameters**: [paymentMethod: PaymentMethod, paymentDetails: PaymentDetails]
  - **Returns**: [boolean]
  - **Line Range**: (8:0-24:1)

- public function canRefundPayment
  - **Parameters**: [status: PaymentStatus]
  - **Returns**: [boolean]
  - **Line Range**: (26:0-28:1)
