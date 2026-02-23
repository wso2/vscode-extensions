// Payment module utility functions

import ballerina/uuid;

public function generateTransactionId() returns string {
    return string `${TRANSACTION_ID_PREFIX}-${uuid:createType1AsString()}`;
}

public function processPayment(PaymentMethod paymentMethod, PaymentDetails paymentDetails) returns boolean {
    // Simulate payment processing logic
    if paymentMethod == CASH_ON_DELIVERY {
        return true;
    }

    // For card payments, validate basic details
    if paymentMethod == CREDIT_CARD || paymentMethod == DEBIT_CARD {
        string? cardNumber = paymentDetails?.cardNumber;
        string? cardHolderName = paymentDetails?.cardHolderName;
        if cardNumber is () || cardHolderName is () {
            return false;
        }
    }

    return true;
}

public function canRefundPayment(PaymentStatus status) returns boolean {
    return status == COMPLETED;
}
