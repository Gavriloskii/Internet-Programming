interface Person{
    name: string;
    age: number;
}
interface Employee extends Person{
    employeeId: number;
}
class Staff implements Employee{
    constructor(
        public name: string,
        public age: number,
        public employeeId: number
    ){}

    displayInfo(): void{
        console.log(`Name: ${this.name}, Age: ${this.age}, Employee ID: ${this.employeeId}`);
    }
}
const staffMember = new Staff('Alice', 30, 123456);
staffMember.displayInfo();