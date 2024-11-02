function getFirstElement<T>(arr: T[]): T | undefined{
    return arr.length > 0 ? arr[0] : undefined;
}

const numberArray = [1,2,3,4,5];
const firstNumber = getFirstElement(numberArray);
console.log(`First: ${firstNumber}`);

const stringArray = ['apple', 'banana', 'cherry'];
const firstString = getFirstElement(stringArray);
console.log(`First: ${firstString}`);

const mixedArray = [true, 'hello', 35];
const firstMixed = getFirstElement(mixedArray);
console.log(`First mixed: ${firstMixed}`);