// Main entry point for Order Management System

import order_management_system.'order;
import order_management_system.customer;
import order_management_system.payment;
import order_management_system.product;

import ballerina/http;

configurable int port = 9090;

public function main() returns error? {
    http:Listener httpListener = check new (port);

    customer:CustomerService customerService = new ();
    product:ProductService productService = new ();
    'order:OrderService orderService = new (customerService, productService);
    payment:PaymentService paymentService = new (orderService);

    check httpListener.attach(httpService = customerService, name = "customer");
    check httpListener.attach(httpService = productService, name = "product");
    check httpListener.attach(httpService = orderService, name = "order");
    check httpListener.attach(httpService = paymentService, name = "payment");

    check httpListener.'start();
}
