import ballerina/http;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service /foo on httpDefaultListener {
    resource function get greeting() returns error|json|http:InternalServerError {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}
