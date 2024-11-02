type StringOrNumber = string | number;
function printValue(value: StringOrNumber): void{
    console.log(`Value: ${value}`);
}

printValue('Hello')
printValue(42);

type Peerson = {
    name: string;
    age: number;
};

type Employeee = {
    employeeId: number;
}

type staffMemberr = Peerson & Employeee;

const stafff: staffMemberr = {
    name: 'Alice',
    age: 30,
    employeeId: 12345,
};

function displayStaffInfo(stafff: staffMemberr): void{
    console.log(`Name: ${stafff.name}, Age: ${stafff.age}, Employee ID: ${stafff.employeeId}`);
}

displayStaffInfo(stafff)
