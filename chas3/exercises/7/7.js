function findOldestPerson(people) {
    if (people.size === 0) {
        return null; // Return null if the map is empty
    }
    // Convert the map entries to an array and use reduce to find the oldest person
    var oldestPerson = Array.from(people.entries()).reduce(function (oldest, _a) {
        var name = _a[0], age = _a[1];
        // If oldest is null (for the first iteration), return the current entry
        if (oldest === null) {
            return { name: name, age: age };
        }
        // Compare ages and return the entry with the greater age
        return age > oldest.age ? { name: name, age: age } : oldest;
    }, null);
    return oldestPerson; // Return the result
}
function displayOldestPerson() {
    // Create a map with names and ages
    var peopleMap = new Map([
        ['Alice', 30],
        ['Bob', 45],
        ['Charlie', 35],
        ['Diana', 50]
    ]);
    var oldestPerson = findOldestPerson(peopleMap); // Call the function to find the oldest person
    var resultElement = document.getElementById("result"); // Get the result element from HTML
    if (resultElement) {
        if (oldestPerson) {
            // If an oldest person was found, display their details
            resultElement.textContent = "The oldest person is ".concat(oldestPerson.name, ", aged ").concat(oldestPerson.age);
        }
        else {
            // If no oldest person was found, display a message
            resultElement.textContent = "No people in the map";
        }
    }
}
