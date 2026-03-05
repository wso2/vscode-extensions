// Order module type definitions

public type Order record {|
    string orderId;
    string customerId;
    OrderItem[] items;
    decimal totalAmount;
    OrderStatus status;
    string shippingAddress;
    string createdAt;
    string updatedAt;
|};

public type OrderItem record {|
    string productId;
    string productName;
    int quantity;
    decimal unitPrice;
    decimal subtotal;
|};

public type OrderCreateRequest record {|
    string customerId;
    OrderItemRequest[] items;
    string shippingAddress;
|};

public type OrderItemRequest record {|
    string productId;
    int quantity;
|};

public type OrderUpdateStatusRequest record {|
    OrderStatus status;
|};

public enum OrderStatus {
    PENDING,
    CONFIRMED,
    PROCESSING,
    SHIPPED,
    DELIVERED,
    CANCELLED
}
