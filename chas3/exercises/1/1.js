function factorialLoop(n){
    if (n < 0) return "Please enter a positive integer";
    let result = 1;
    for (let i=1; i<=n; i++)
    {
        result *= i;
    }
    return result;
}

function factorialRecursive(n){
    if (n < 0) return "Please enter a positive integer";
    if (n === 0 || n ===1) return 1;
    return n * factorialRecursive(n-1);
}

function calculateFactorials(){
    const numberInput = document.getElementById("numberInput").value;
    const number = parseInt(numberInput);

    if (isNaN(number) || number<0){
        alert("Please enter a valid positive integer.");
        return;
    }
    const loopResult = factorialLoop(number);
    const recursiveResult = factorialRecursive(number);
    document.getElementById("resultLoop").textContent = loopResult
    document.getElementById("resultRecursive").textContent = recursiveResult
    document.getElementById("calculateButton").addEventListener("click", calculateFactorials);
}
document.getElementById("calculateButton").addEventListener("click", calculateFactorials);