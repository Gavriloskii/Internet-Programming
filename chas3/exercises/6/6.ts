function sumOfEvenNumbers (arr: number[]): number {
    const evenNumbers = arr.filter(num => num % 2 === 0);
    const sum = evenNumbers.reduce((acc, num) => acc + num, 0)
    return sum;
}

function calculateEvenSum(): void{
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const sum = sumOfEvenNumbers(numbers);

    const resultElement = document.getElementById("result");
    if (resultElement) {
        resultElement.textContent = `Sum of even numbers: ${sum}`;
    }
}