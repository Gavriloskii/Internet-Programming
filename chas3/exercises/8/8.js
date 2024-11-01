function numberToWords(num) {
    if (num === 0)
        return "zero";
    var lessThan20 = [
        "zero", "one", "two", "three", "four", "five",
        "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen",
        "sixteen", "seventeen", "eighteen", "nineteen"
    ];
    var tens = [
        "", "", "twenty", "thirty", "forty",
        "fifty", "sixty", "seventy", "eighty", "ninety"
    ];
    var thousands = ["", "thousand", "million", "billion"];
    var helper = function (n) {
        if (n < 20)
            return lessThan20[n];
        if (n < 100)
            return tens[Math.floor(n / 10)] + (n % 10 ? " " + lessThan20[n % 10] : "");
        if (n < 1000)
            return lessThan20[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + helper(n % 100) : "");
        for (var i = 0; i < thousands.length; i++) {
            var size = Math.pow(1000, i);
            if (n < size * 1000) {
                return helper(Math.floor(n / size)) + " " + thousands[i] + (n % size ? " " + helper(n % size) : "");
            }
        }
        return "";
    };
    return helper(num).trim();
}
function displayNumberInWords() {
    var inputElement = document.getElementById("numberInput");
    var resultElement = document.getElementById("result");
    if (inputElement && resultElement) {
        var number = parseInt(inputElement.value);
        var words = numberToWords(number);
        resultElement.textContent = "The number ".concat(number, " in words is: ").concat(words);
    }
}
