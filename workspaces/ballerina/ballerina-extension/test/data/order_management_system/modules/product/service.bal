// Product service implementation

import ballerina/http;
import ballerina/time;
import ballerina/uuid;

final map<Product> productStore = {};

public service class ProductService {
    *http:Service;

    public function getProduct(string productId) returns Product|http:NotFound {
        Product? product = productStore[productId];
        if product is () {
            return <http:NotFound>{body: "Product not found"};
        }
        return product;
    }

    resource function post products(ProductCreateRequest request) returns Product|http:BadRequest {
        if !validatePrice(price = request.price) {
            return <http:BadRequest>{body: "Invalid price"};
        }
        if !validateStock(quantity = request.stockQuantity) {
            return <http:BadRequest>{body: "Invalid stock quantity"};
        }

        string productId = string `${PRODUCT_ID_PREFIX}-${uuid:createType1AsString()}`;
        string currentTime = time:utcToString(time:utcNow());

        ProductStatus initialStatus = ACTIVE;
        if !isProductAvailable(stockQuantity = request.stockQuantity) {
            initialStatus = OUT_OF_STOCK;
        }

        Product product = {
            productId: productId,
            name: request.name,
            description: request.description,
            price: request.price,
            stockQuantity: request.stockQuantity,
            category: request.category,
            status: initialStatus,
            createdAt: currentTime,
            updatedAt: currentTime
        };

        productStore[productId] = product;
        return product;
    }

    resource function get products/[string productId]() returns Product|http:NotFound {
        Product? product = productStore[productId];
        if product is () {
            return <http:NotFound>{body: "Product not found"};
        }
        return product;
    }

    resource function get products(string? category = ()) returns Product[] {
        Product[] products = productStore.toArray();

        if category is string {
            Product[] filteredProducts = from Product prod in products
                where prod.category == category
                select prod;
            return filteredProducts;
        }

        return products;
    }

    resource function put products/[string productId](ProductUpdateRequest request) returns Product|http:NotFound|http:BadRequest {
        Product? existingProduct = productStore[productId];
        if existingProduct is () {
            return <http:NotFound>{body: "Product not found"};
        }

        Product updatedProduct = existingProduct.clone();

        string? name = request?.name;
        if name is string {
            updatedProduct.name = name;
        }

        string? description = request?.description;
        if description is string {
            updatedProduct.description = description;
        }

        decimal? price = request?.price;
        if price is decimal {
            if !validatePrice(price = price) {
                return <http:BadRequest>{body: "Invalid price"};
            }
            updatedProduct.price = price;
        }

        int? stockQuantity = request?.stockQuantity;
        if stockQuantity is int {
            if !validateStock(quantity = stockQuantity) {
                return <http:BadRequest>{body: "Invalid stock quantity"};
            }
            updatedProduct.stockQuantity = stockQuantity;
        }

        string? category = request?.category;
        if category is string {
            updatedProduct.category = category;
        }

        ProductStatus? status = request?.status;
        if status is ProductStatus {
            updatedProduct.status = status;
        }

        updatedProduct.updatedAt = time:utcToString(time:utcNow());
        productStore[productId] = updatedProduct;
        return updatedProduct;
    }

    resource function delete products/[string productId]() returns http:NoContent|http:NotFound {
        Product? removedProduct = productStore.removeIfHasKey(productId);
        if removedProduct is () {
            return <http:NotFound>{body: "Product not found"};
        }
        return http:NO_CONTENT;
    }
}

