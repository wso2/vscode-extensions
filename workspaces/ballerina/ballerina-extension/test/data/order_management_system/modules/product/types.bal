// Product module type definitions

public type Product record {|
    string productId;
    string name;
    string description;
    decimal price;
    int stockQuantity;
    string category;
    ProductStatus status;
    string createdAt;
    string updatedAt;
|};

public type ProductCreateRequest record {|
    string name;
    string description;
    decimal price;
    int stockQuantity;
    string category;
|};

public type ProductUpdateRequest record {|
    string? name?;
    string? description?;
    decimal? price?;
    int? stockQuantity?;
    string? category?;
    ProductStatus? status?;
|};

public enum ProductStatus {
    ACTIVE,
    INACTIVE,
    OUT_OF_STOCK
}
