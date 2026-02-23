// Payment module type definitions

public type Payment record {|
    string paymentId;
    string orderId;
    string customerId;
    decimal amount;
    PaymentMethod paymentMethod;
    PaymentStatus status;
    string? transactionId?;
    string createdAt;
    string updatedAt;
|};

public type PaymentCreateRequest record {|
    string orderId;
    PaymentMethod paymentMethod;
    PaymentDetails paymentDetails;
|};

public type PaymentDetails record {|
    string? cardNumber?;
    string? cardHolderName?;
    string? expiryDate?;
    string? cvv?;
|};

public enum PaymentMethod {
    CREDIT_CARD,
    DEBIT_CARD,
    PAYPAL,
    BANK_TRANSFER,
    CASH_ON_DELIVERY
}

public enum PaymentStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED,
    REFUNDED
}
