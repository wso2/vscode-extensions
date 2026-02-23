// Customer module type definitions

public type Customer record {|
    string customerId;
    string firstName;
    string lastName;
    string email;
    string phone;
    Address address;
    string createdAt;
    string updatedAt;
|};

public type Address record {|
    string street;
    string city;
    string state;
    string zipCode;
    string country;
|};

public type CustomerCreateRequest record {|
    string firstName;
    string lastName;
    string email;
    string phone;
    Address address;
|};

public type CustomerUpdateRequest record {|
    string? firstName?;
    string? lastName?;
    string? email?;
    string? phone?;
    Address? address?;
|};
