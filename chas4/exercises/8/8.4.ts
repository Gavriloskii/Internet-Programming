import { add, multiply } from './8.1';
import { capitalize, reverse } from './8.2';
import { Rectangle, Circle, Shape } from './8.3';

const sum = add(5, 10);
const product = multiply(5, 10);
console.log(`Sum: ${sum}, Product: ${product}`);

const capitalized = capitalize('hello world');
const reversed = reverse('hello');
console.log(`Capitalized: ${capitalized}, Reversed: ${reversed}`);

const rectangle = new Rectangle(10, 5);
const circle = new Circle(7);
const shapes: Shape[] = [rectangle, circle];

shapes.forEach((shape) => {
    console.log(`Area: ${shape.area()}`);
});
