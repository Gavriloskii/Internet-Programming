var quiz = [
    {
        question: "What is the capital of France?",
        options: ["Berlin", "Madrid", "Paris", "Lisbon"],
        answer: 2
    },
    {
        question: "Which planet is known as the Red Planet?",
        options: ["Earth", "Mars", "Jupiter", "Saturn"],
        answer: 1
    },
    {
        question: "What is the largest ocean on Earth?",
        options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        answer: 3
    }
];
var currentQuestionIndex = 0;
var score = 0;
function displayQuestion() {
    var questionElement = document.getElementById("question");
    var optionsElement = document.getElementById("options");
    var resultElement = document.getElementById("result");
    var submitButton = document.getElementById("submit-button");
    if (currentQuestionIndex < quiz.length) {
        var currentQuestion = quiz[currentQuestionIndex];
        if (questionElement && optionsElement && resultElement) {
            questionElement.textContent = currentQuestion.question;
            optionsElement.innerHTML = "";
            currentQuestion.options.forEach(function (option, index) {
                optionsElement.innerHTML += "\n                    <li>\n                        <input type=\"radio\" name=\"option\" value=\"".concat(index, "\" id=\"option").concat(index, "\">\n                        <label for=\"option").concat(index, "\">").concat(option, "</label>\n                    </li>\n                ");
            });
            resultElement.textContent = "";
            if (submitButton) {
                submitButton.style.display = "block";
            }
        }
    }
    else {
        showResult();
    }
}
function submitAnswer() {
    var options = document.getElementsByName("option");
    var selectedOption = Array.from(options).find(function (option) { return option.checked; });
    if (selectedOption) {
        var selectedIndex = parseInt(selectedOption.value);
        if (selectedIndex === quiz[currentQuestionIndex].answer) {
            score++;
            alert("Correct answer!");
        }
        else {
            alert("Wrong answer! The correct answer is ".concat(quiz[currentQuestionIndex].options[quiz[currentQuestionIndex].answer], "."));
        }
        currentQuestionIndex++;
        displayQuestion();
    }
    else {
        alert("Please select an answer.");
    }
}
function showResult() {
    var questionElement = document.getElementById("question");
    var optionsElement = document.getElementById("options");
    var resultElement = document.getElementById("result");
    var submitButton = document.getElementById("submit-button");
    if (questionElement && optionsElement && resultElement) {
        questionElement.textContent = "Quiz finished! Your score: ".concat(score, " out of ").concat(quiz.length);
        optionsElement.innerHTML = "";
        resultElement.textContent = "";
        if (submitButton) {
            submitButton.style.display = "none";
        }
    }
}
window.onload = displayQuestion;
