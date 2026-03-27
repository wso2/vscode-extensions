// Order service implementation

import order_management_system.customer;
import order_management_system.product;

import ballerina/http;
import ballerina/time;
import ballerina/uuid;

final map<Order> orderStore = {};

public service class OrderService {
    *http:Service;

    private final customer:CustomerService customerService;
    private final product:ProductService productService;

    public function init(customer:CustomerService customerService, product:ProductService productService) {
        self.customerService = customerService;
        self.productService = productService;
    }

    public function getOrder(string orderId) returns Order|http:NotFound {
        Order? 'order = orderStore[orderId];
        if 'order is () {
            return <http:NotFound>{body: "Order not found"};
        }
        return 'order;
    }

    resource function post orders(OrderCreateRequest request) returns Order|http:BadRequest|http:NotFound {
        customer:Customer|http:NotFound customerResult = self.customerService.getCustomer(customerId = request.customerId);
        if customerResult is http:NotFound {
            return <http:NotFound>{body: "Customer not found"};
        }

        OrderItem[] orderItems = [];

        foreach OrderItemRequest itemRequest in request.items {
            if !validateOrderQuantity(quantity = itemRequest.quantity) {
                return <http:BadRequest>{body: string `Invalid quantity for product ${itemRequest.productId}`};
            }

            product:Product|http:NotFound productResult = self.productService.getProduct(productId = itemRequest.productId);
            if productResult is http:NotFound {
                return <http:NotFound>{body: string `Product ${itemRequest.productId} not found`};
            }

            product:Product productData = productResult;

            if productData.stockQuantity < itemRequest.quantity {
                return <http:BadRequest>{body: string `Insufficient stock for product ${productData.name}`};
            }

            decimal subtotal = calculateSubtotal(quantity = itemRequest.quantity, unitPrice = productData.price);

            OrderItem orderItem = {
                productId: productData.productId,
                productName: productData.name,
                quantity: itemRequest.quantity,
                unitPrice: productData.price,
                subtotal: subtotal
            };

            orderItems.push(orderItem);
        }

        decimal totalAmount = calculateTotalAmount(items = orderItems);
        string orderId = string `${ORDER_ID_PREFIX}-${uuid:createType1AsString()}`;
        string currentTime = time:utcToString(time:utcNow());

        Order 'order = {
            orderId: orderId,
            customerId: request.customerId,
            items: orderItems,
            totalAmount: totalAmount,
            status: PENDING,
            shippingAddress: request.shippingAddress,
            createdAt: currentTime,
            updatedAt: currentTime
        };

        orderStore[orderId] = 'order;
        return 'order;
    }

    resource function get orders/[string orderId]() returns Order|http:NotFound {
        Order? 'order = orderStore[orderId];
        if 'order is () {
            return <http:NotFound>{body: "Order not found"};
        }
        return 'order;
    }

    resource function get orders(string? customerId = (), OrderStatus? status = ()) returns Order[] {
        Order[] orders = orderStore.toArray();

        if customerId is string {
            Order[] filteredOrders = from Order ord in orders
                where ord.customerId == customerId
                select ord;
            orders = filteredOrders;
        }

        if status is OrderStatus {
            Order[] filteredOrders = from Order ord in orders
                where ord.status == status
                select ord;
            orders = filteredOrders;
        }

        return orders;
    }

    resource function put orders/[string orderId]/status(OrderUpdateStatusRequest request) returns Order|http:NotFound|http:BadRequest {
        Order? existingOrder = orderStore[orderId];
        if existingOrder is () {
            return <http:NotFound>{body: "Order not found"};
        }

        if request.status == CANCELLED && !canCancelOrder(status = existingOrder.status) {
            return <http:BadRequest>{body: "Cannot cancel order in current status"};
        }

        Order updatedOrder = existingOrder.clone();
        updatedOrder.status = request.status;
        updatedOrder.updatedAt = time:utcToString(time:utcNow());

        orderStore[orderId] = updatedOrder;
        return updatedOrder;
    }

    resource function delete orders/[string orderId]() returns http:NoContent|http:NotFound|http:BadRequest {
        Order? existingOrder = orderStore[orderId];
        if existingOrder is () {
            return <http:NotFound>{body: "Order not found"};
        }

        if !canCancelOrder(status = existingOrder.status) {
            return <http:BadRequest>{body: "Cannot delete order in current status"};
        }
        return http:NO_CONTENT;
    }
}
