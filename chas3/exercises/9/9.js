function convertToPigLatin(sentence) {
    var words = sentence.split(" ");
    var pigLatinWords = words.map(function (word) {
        var firstVowelIndex = word.search(/[aeiou]/i);
        if (firstVowelIndex === 0) {
            return word + "yay";
        }
        else if (firstVowelIndex > 0) {
            return word.slice(firstVowelIndex) + word.slice(0, firstVowelIndex) + "ay";
        }
        else {
            return word + "ay";
        }
    });
    return pigLatinWords.join(" ");
}
function displayPigLatin() {
    var inputElement = document.getElementById("sentenceInput");
    var resultElement = document.getElementById("result");
    if (inputElement && resultElement) {
        var sentence = inputElement.value;
        var pigLatinSentence = convertToPigLatin(sentence);
        resultElement.textContent = "Pig Latin: ".concat(pigLatinSentence);
    }
}
