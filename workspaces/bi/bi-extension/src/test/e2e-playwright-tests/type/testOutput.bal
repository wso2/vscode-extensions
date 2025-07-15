
enum Role1 {
    Admin,
    Sales,
    Marketing
}

type Id1 int|string;

type Employee1 record {|
    Id1 id;
    Role1 role;
|};

service class Project1 {
    function init() {
    }

    resource function get employeeDetails() returns Employee1 {
        do {
            panic error("Unimplemented function");
        } on fail error err {
            //handle error
            panic error("Unhandled error");
        }
    }
}
