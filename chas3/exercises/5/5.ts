const person = {
    name: 'John Doe',
    age: 30,
    city: "New York"
};

function describePerson(): string{
    return `Name: ${person.name}, Age: ${person.age}, City: ${person.city}`
}

function showDescription(): void {
    const descriptionElement = document.getElementById("description");
    if (descriptionElement) {
    descriptionElement.textContent = describePerson();
    }
}