// Customer module utility functions

public function validateEmail(string email) returns boolean {
    string:RegExp emailPattern = re `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`;
    return emailPattern.isFullMatch(email);
}

public function validatePhone(string phone) returns boolean {
    string:RegExp phonePattern = re `^\+?[1-9]\d{1,14}$`;
    return phonePattern.isFullMatch(phone);
}

public function validateName(string name) returns boolean {
    int nameLength = name.length();
    return nameLength >= MIN_NAME_LENGTH && nameLength <= MAX_NAME_LENGTH;
}
