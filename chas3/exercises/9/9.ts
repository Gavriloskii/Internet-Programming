function convertToPigLatin(sentence: string): string {
    const words = sentence.split(" ");
    const pigLatinWords = words.map(word => {
        const firstVowelIndex = word.search(/[aeiou]/i);
        if (firstVowelIndex === 0) {
            return word + "yay";
        } else if (firstVowelIndex > 0) {
            return word.slice(firstVowelIndex) + word.slice(0, firstVowelIndex) + "ay";
        } else {
            return word + "ay";
        }
    });

    return pigLatinWords.join(" ");
}

function displayPigLatin(): void {
    const inputElement = document.getElementById("sentenceInput") as HTMLInputElement;
    const resultElement = document.getElementById("result");

    if (inputElement && resultElement) {
        const sentence = inputElement.value;
        const pigLatinSentence = convertToPigLatin(sentence);
        resultElement.textContent = `Pig Latin: ${pigLatinSentence}`;
    }
}
