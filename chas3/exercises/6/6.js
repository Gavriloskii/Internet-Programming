function sumOfEvenNumbers(arr) {
    var evenNumbers = arr.filter(function (num) { return num % 2 === 0; });
    var sum = evenNumbers.reduce(function (acc, num) { return acc + num; }, 0);
    return sum;
}
function calculateEvenSum() {
    var numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var sum = sumOfEvenNumbers(numbers);
    var resultElement = document.getElementById("result");
    if (resultElement) {
        resultElement.textContent = "Sum of even numbers: ".concat(sum);
    }
}
