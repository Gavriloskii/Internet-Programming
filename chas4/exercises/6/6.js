function printValue(value) {
    console.log("Value: ".concat(value));
}
printValue('Hello');
printValue(42);
var stafff = {
    name: 'Alice',
    age: 30,
    employeeId: 12345,
};
function displayStaffInfo(stafff) {
    console.log("Name: ".concat(stafff.name, ", Age: ").concat(stafff.age, ", Employee ID: ").concat(stafff.employeeId));
}
displayStaffInfo(stafff);
