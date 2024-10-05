function changeText() {
    let heading = document.getElementById("myHeading");
    heading.textContent = "New Heading";
}

function changeColor() {
    let paragraph = document.getElementById("myParagraph");
    paragraph.style.color = "blue";
}

function changeheading1() {
    let heading = document.getElementById("myHeading");
    heading.style.color = "red";
}

function changeAttribute() {
    let link = document.getElementById("linkot");
    link.setAttribute("href", "https://www.openai.com");
    link.textContent = "ChatGPT";
}

function submitDetails() {
    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let message = document.getElementById("message").value;
    let feedback = document.getElementById("feedback");

    feedback.style.color = "black";
    feedback.textContent = "";

    if (name === "" || email === "" || message === "") {
        feedback.textContent = "All fields required";
        return false;
    }

    feedback.textContent = "Thanks for the message";
}
function showImage(src) {
    let largeImage = document.getElementById("largeImage");
    largeImage.src = src;
    largeImage.style.display = "block";
}
function addItem(){
    let itemInput = document.getElementById("itemInput");
    let itemValue = itemInput.value;

    if (itemValue === ""){
        alert("Please enter an item");
        return;
    }
    let itemList = document.getElementById("itemList");
    let listItem = document.createElement("li");

    listItem.textContent = itemValue;
    
    const removeButton = document.createElement("button")
    removeButton.textContent = "Remove"
    removeButton.onclick = function(){
        itemList.removeChild(listItem)
    }
    listItem.appendChild(removeButton);
    itemList.appendChild(listItem);
    itemInput.value="";
}
let currentInput = "";

function appendNumber(number) {
    currentInput += number;
    document.getElementById("display").value = currentInput;
}

function appendOperator(operator) {
    const lastChar = currentInput[currentInput.length - 1];
    if (["", "+", "-", "*", "/"].includes(lastChar)) {
        return; 
    }
    currentInput += operator;
    document.getElementById("display").value = currentInput;
}

function clearDisplay() {
    currentInput = "";
    document.getElementById("display").value = "";
}

function calculateResult() {
    try {
        currentInput = eval(currentInput);
        document.getElementById("display").value = currentInput;
    } catch (error) {
        document.getElementById("display").value = "Error";
        currentInput = "";
    }
}

