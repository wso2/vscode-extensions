// Customer service implementation

import ballerina/http;
import ballerina/time;
import ballerina/uuid;

final map<Customer> customerStore = {};

public service class CustomerService {
    *http:Service;

    public function getCustomer(string customerId) returns Customer|http:NotFound {
        Customer? customer = customerStore[customerId];
        if customer is () {
            return <http:NotFound>{body: "Customer not found"};
        }
        return customer;
    }

    resource function post customers(CustomerCreateRequest request) returns Customer|http:BadRequest|http:InternalServerError {
        if !validateName(name = request.firstName) {
            return <http:BadRequest>{body: "Invalid first name"};
        }
        if !validateName(name = request.lastName) {
            return <http:BadRequest>{body: "Invalid last name"};
        }
        if !validateEmail(email = request.email) {
            return <http:BadRequest>{body: "Invalid email format"};
        }
        if !validatePhone(phone = request.phone) {
            return <http:BadRequest>{body: "Invalid phone format"};
        }

        string customerId = string `${CUSTOMER_ID_PREFIX}-${uuid:createType1AsString()}`;
        string currentTime = time:utcToString(time:utcNow());

        Customer customer = {
            customerId: customerId,
            firstName: request.firstName,
            lastName: request.lastName,
            email: request.email,
            phone: request.phone,
            address: request.address,
            createdAt: currentTime,
            updatedAt: currentTime
        };

        customerStore[customerId] = customer;
        return customer;
    }

    resource function get customers/[string customerId]() returns Customer|http:NotFound {
        Customer? customer = customerStore[customerId];
        if customer is () {
            return <http:NotFound>{body: "Customer not found"};
        }
        return customer;
    }

    resource function get customers() returns Customer[] {
        return customerStore.toArray();
    }

    resource function put customers/[string customerId](CustomerUpdateRequest request) returns Customer|http:NotFound|http:BadRequest {
        Customer? existingCustomer = customerStore[customerId];
        if existingCustomer is () {
            return <http:NotFound>{body: "Customer not found"};
        }

        Customer updatedCustomer = existingCustomer.clone();

        string? firstName = request?.firstName;
        if firstName is string {
            if !validateName(name = firstName) {
                return <http:BadRequest>{body: "Invalid first name"};
            }
            updatedCustomer.firstName = firstName;
        }

        string? lastName = request?.lastName;
        if lastName is string {
            if !validateName(name = lastName) {
                return <http:BadRequest>{body: "Invalid last name"};
            }
            updatedCustomer.lastName = lastName;
        }

        string? email = request?.email;
        if email is string {
            if !validateEmail(email = email) {
                return <http:BadRequest>{body: "Invalid email format"};
            }
            updatedCustomer.email = email;
        }

        string? phone = request?.phone;
        if phone is string {
            if !validatePhone(phone = phone) {
                return <http:BadRequest>{body: "Invalid phone format"};
            }
            updatedCustomer.phone = phone;
        }

        Address? address = request?.address;
        if address is Address {
            updatedCustomer.address = address;
        }

        updatedCustomer.updatedAt = time:utcToString(time:utcNow());
        customerStore[customerId] = updatedCustomer;
        return updatedCustomer;
    }

    resource function delete customers/[string customerId]() returns http:NoContent|http:NotFound {
        Customer? removedCustomer = customerStore.removeIfHasKey(customerId);
        if removedCustomer is () {
            return <http:NotFound>{body: "Customer not found"};
        }
        return http:NO_CONTENT;
    }
}