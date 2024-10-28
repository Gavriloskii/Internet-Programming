function isPrime(num) {
    var divisors = 0;
    for (var i = 1; i <= num; i++) {
        if (num % i === 0)
            divisors++;
    }
    if (divisors === 2) {
        return true;
    }
    else
        return false;
}
function checkPrime() {
    var inputElement = document.getElementById("numberInput");
    var resultELement = document.getElementById("result");
    var number = parseInt(inputElement.value);
    if (isNaN(number))
        resultELement.textContent = "Please enter a valid number";
    else
        resultELement.textContent = isPrime(number)
            ? `${number} is a prime number.` 
            : `${number} is not a prime number.`;
}
