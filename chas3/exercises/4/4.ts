function sumOfSquares(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num * num, 0)
}
function calculateSumOfSquares() {
    const inputElement = document.getElementById("arrayInput") as HTMLInputElement;
    const resultElement = document.getElementById("result") as HTMLSpanElement;

    const numbers = inputElement.value.split(',').map(num => parseFloat(num.trim()));
    if (numbers.some(isNaN)){
        resultElement.textContent = "Please enter a valid list of numbers, seperated by commas";
    }
    else{
        const sum = sumOfSquares(numbers);
        resultElement.textContent = `Sum of squares: ${sum}`;
    }
}