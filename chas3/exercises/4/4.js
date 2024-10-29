function sumOfSquares(numbers) {
    return numbers.reduce(function (sum, num) { return sum + num * num; }, 0);
}
function calculateSumOfSquares() {
    var inputElement = document.getElementById("arrayInput");
    var resultElement = document.getElementById("result");
    var numbers = inputElement.value.split(',').map(function (num) { return parseFloat(num.trim()); });
    if (numbers.some(isNaN)) {
        resultElement.textContent = "Please enter a valid list of numbers, seperated by commas";
    }
    else {
        var sum = sumOfSquares(numbers);
        resultElement.textContent = "Sum of squares: ".concat(sum);
    }
}
