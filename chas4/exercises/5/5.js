function getFirstElement(arr) {
    return arr.length > 0 ? arr[0] : undefined;
}
var numberArray = [1, 2, 3, 4, 5];
var firstNumber = getFirstElement(numberArray);
console.log("First: ".concat(firstNumber));
var stringArray = ['apple', 'banana', 'cherry'];
var firstString = getFirstElement(stringArray);
console.log("First: ".concat(firstString));
var mixedArray = [true, 'hello', 35];
var firstMixed = getFirstElement(mixedArray);
console.log("First mixed: ".concat(firstMixed));
