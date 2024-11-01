function numberToWords(num: number): string {
    if (num === 0) return "zero";
    
    const lessThan20 = [
        "zero", "one", "two", "three", "four", "five",
        "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen",
        "sixteen", "seventeen", "eighteen", "nineteen"
    ];
    
    const tens = [
        "", "", "twenty", "thirty", "forty",
        "fifty", "sixty", "seventy", "eighty", "ninety"
    ];

    const thousands = ["", "thousand", "million", "billion"];

    const helper = (n: number): string => {
        if (n < 20) return lessThan20[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + lessThan20[n % 10] : "");
        if (n < 1000) return lessThan20[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + helper(n % 100) : "");

        for (let i = 0; i < thousands.length; i++) {
            const size = Math.pow(1000, i);
            if (n < size * 1000) {
                return helper(Math.floor(n / size)) + " " + thousands[i] + (n % size ? " " + helper(n % size) : "");
            }
        }
        return "";
    };

    return helper(num).trim();
}

function displayNumberInWords(): void {
    const inputElement = document.getElementById("numberInput") as HTMLInputElement;
    const resultElement = document.getElementById("result");

    if (inputElement && resultElement) {
        const number = parseInt(inputElement.value);
        const words = numberToWords(number);
        resultElement.textContent = `The number ${number} in words is: ${words}`;
    }
}
