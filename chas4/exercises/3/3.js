var Staff = /** @class */ (function () {
    function Staff(name, age, employeeId) {
        this.name = name;
        this.age = age;
        this.employeeId = employeeId;
    }
    Staff.prototype.displayInfo = function () {
        console.log("Name: ".concat(this.name, ", Age: ").concat(this.age, ", Employee ID: ").concat(this.employeeId));
    };
    return Staff;
}());
var staffMember = new Staff('Alice', 30, 123456);
staffMember.displayInfo();
