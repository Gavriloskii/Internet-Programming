var person = {
    name: 'John Doe',
    age: 30,
    city: "New York"
};
function describePerson() {
    return "Name: ".concat(person.name, ", Age: ").concat(person.age, ", City: ").concat(person.city);
}
function showDescription() {
    var descriptionElement = document.getElementById("description");
    if (descriptionElement) {
        descriptionElement.textContent = describePerson();
    }
}
