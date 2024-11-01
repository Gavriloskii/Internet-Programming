interface Question {
    question: string;
    options: string[];
    answer: number; 
}

const quiz: Question[] = [
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

let currentQuestionIndex = 0;
let score = 0;

function displayQuestion(): void {
    const questionElement = document.getElementById("question");
    const optionsElement = document.getElementById("options");
    const resultElement = document.getElementById("result");
    const submitButton = document.getElementById("submit-button");

    if (currentQuestionIndex < quiz.length) {
        const currentQuestion = quiz[currentQuestionIndex];
        if (questionElement && optionsElement && resultElement) {
            questionElement.textContent = currentQuestion.question;
            optionsElement.innerHTML = "";
            currentQuestion.options.forEach((option, index) => {
                optionsElement.innerHTML += `
                    <li>
                        <input type="radio" name="option" value="${index}" id="option${index}">
                        <label for="option${index}">${option}</label>
                    </li>
                `;
            });
            resultElement.textContent = "";
            if (submitButton) {
                submitButton.style.display = "block";
            }
        }
    } else {
        showResult();
    }
}

function submitAnswer(): void {
    const options = document.getElementsByName("option") as NodeListOf<HTMLInputElement>;
    const selectedOption = Array.from(options).find(option => option.checked);

    if (selectedOption) {
        const selectedIndex = parseInt(selectedOption.value);
        if (selectedIndex === quiz[currentQuestionIndex].answer) {
            score++;
            alert("Correct answer!");
        } else {
            alert(`Wrong answer! The correct answer is ${quiz[currentQuestionIndex].options[quiz[currentQuestionIndex].answer]}.`);
        }
        currentQuestionIndex++;
        displayQuestion();
    } else {
        alert("Please select an answer.");
    }
}

function showResult(): void {
    const questionElement = document.getElementById("question");
    const optionsElement = document.getElementById("options");
    const resultElement = document.getElementById("result");
    const submitButton = document.getElementById("submit-button");

    if (questionElement && optionsElement && resultElement) {
        questionElement.textContent = `Quiz finished! Your score: ${score} out of ${quiz.length}`;
        optionsElement.innerHTML = "";
        resultElement.textContent = ""; 
        if (submitButton) {
            submitButton.style.display = "none";
        }
    }
}

window.onload = displayQuestion;
