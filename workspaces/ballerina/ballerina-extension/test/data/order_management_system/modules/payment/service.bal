// Payment service implementation

import order_management_system.'order;

import ballerina/http;
import ballerina/time;
import ballerina/uuid;

final map<Payment> paymentStore = {};

public service class PaymentService {
    *http:Service;

    private final 'order:OrderService orderService;

    public function init('order:OrderService orderService) {
        self.orderService = orderService;
    }

    resource function post payments(PaymentCreateRequest request) returns Payment|http:BadRequest|http:NotFound {
        'order:Order|http:NotFound orderResult = self.orderService.getOrder(orderId = request.orderId);
        if orderResult is http:NotFound {
            return <http:NotFound>{body: "Order not found"};
        }

        'order:Order orderData = orderResult;

        boolean paymentSuccess = processPayment(paymentMethod = request.paymentMethod, paymentDetails = request.paymentDetails);

        string paymentId = string `${PAYMENT_ID_PREFIX}-${uuid:createType1AsString()}`;
        string currentTime = time:utcToString(time:utcNow());

        PaymentStatus initialStatus = PENDING;
        string? transactionId = ();

        if paymentSuccess {
            initialStatus = COMPLETED;
            transactionId = generateTransactionId();
        } else {
            initialStatus = FAILED;
        }

        Payment payment = {
            paymentId: paymentId,
            orderId: request.orderId,
            customerId: orderData.customerId,
            amount: orderData.totalAmount,
            paymentMethod: request.paymentMethod,
            status: initialStatus,
            transactionId: transactionId,
            createdAt: currentTime,
            updatedAt: currentTime
        };

        lock {
            paymentStore[paymentId] = payment;
        }
        return payment;
    }

    resource function get payments/[string paymentId]() returns Payment|http:NotFound {
        lock {
            Payment? payment = paymentStore[paymentId];
            if payment is () {
                return <http:NotFound>{body: "Payment not found"};
            }
            return payment.cloneReadOnly();
        }
    }

    resource function get payments(string? orderId = (), string? customerId = ()) returns Payment[] {
        lock {
            Payment[] payments = paymentStore.toArray();

            if orderId is string {
                Payment[] filteredPayments = from Payment pay in payments
                    where pay.orderId == orderId
                    select pay;
                payments = filteredPayments;
            }

            if customerId is string {
                Payment[] filteredPayments = from Payment pay in payments
                    where pay.customerId == customerId
                    select pay;
                payments = filteredPayments;
            }

            return payments.cloneReadOnly();
        }
    }

    resource function post payments/[string paymentId]/refund() returns Payment|http:NotFound|http:BadRequest {
        Payment? existingPayment = ();
        lock {
            existingPayment = paymentStore[paymentId];
        }

        if existingPayment is () {
            return <http:NotFound>{body: "Payment not found"};
        }

        if !canRefundPayment(status = existingPayment.status) {
            return <http:BadRequest>{body: "Cannot refund payment in current status"};
        }

        Payment updatedPayment = existingPayment.clone();
        updatedPayment.status = REFUNDED;
        updatedPayment.updatedAt = time:utcToString(time:utcNow());

        lock {
            paymentStore[paymentId] = updatedPayment.clone();
        }
        return updatedPayment;
    }
}
