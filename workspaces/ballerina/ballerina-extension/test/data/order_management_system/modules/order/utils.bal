// Order module utility functions

public function calculateSubtotal(int quantity, decimal unitPrice) returns decimal {
    decimal quantityDecimal = <decimal>quantity;
    return quantityDecimal * unitPrice;
}

public function calculateTotalAmount(OrderItem[] items) returns decimal {
    decimal total = ZERO_AMOUNT;
    foreach OrderItem item in items {
        total = total + item.subtotal;
    }
    return total;
}

public function validateOrderQuantity(int quantity) returns boolean {
    return quantity >= MIN_ORDER_QUANTITY;
}

public function canCancelOrder(OrderStatus status) returns boolean {
    return status == PENDING || status == CONFIRMED;
}
