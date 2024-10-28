function fizzBuzz(){
    const outputElement = document.getElementById("fizzBuzzOutput");
    for (let i = 1; i <= 100; i++) {
        let listItem = document.createElement("li");
        if (i % 15 === 0)
        {
            listItem.textContent="FizzBuzz";
        }
        else if (i % 3 === 0)
        {
            listItem.textContent="Fizz";
        }
        else if (i % 5 === 0)
        {
            listItem.textContent="Buzz";
        }
        else
        {
            listItem.textContent=(i);
        }
        outputElement.appendChild(listItem);
    }

}