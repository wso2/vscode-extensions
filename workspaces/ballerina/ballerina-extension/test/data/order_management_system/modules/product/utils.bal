// Product module utility functions

public function validatePrice(decimal price) returns boolean {
    return price >= MIN_PRICE;
}

public function validateStock(int quantity) returns boolean {
    return quantity >= MIN_STOCK;
}

public function isProductAvailable(int stockQuantity) returns boolean {
    return stockQuantity > 0;
}
