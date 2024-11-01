function findOldestPerson(people: Map<string, number>): { name: string; age: number } | null {
    if (people.size === 0) {
        return null; 
    }


    const oldestPerson = Array.from(people.entries()).reduce((oldest, [name, age]) => {
        if (oldest === null) {
            return { name, age };
        }
        return age > oldest.age ? { name, age } : oldest;
    }, null as { name: string; age: number } | null);

    return oldestPerson;
}

function displayOldestPerson(): void {
    const peopleMap = new Map<string, number>([
        ['Alice', 30],
        ['Bob', 45],
        ['Charlie', 35],
        ['Diana', 50]
    ]);

    const oldestPerson = findOldestPerson(peopleMap); 

    const resultElement = document.getElementById("result"); 
    if (resultElement) {
        if (oldestPerson) {
            resultElement.textContent = `The oldest person is ${oldestPerson.name}, aged ${oldestPerson.age}`;
        } else {
            resultElement.textContent = `No people in the map`;
        }
    }
}
