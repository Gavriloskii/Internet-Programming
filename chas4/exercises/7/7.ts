class Example {
    computeSum(a: number, b: number): number {
        const startTime = performance.now(); 
        
        for (let i = 0; i < 12275; i++) {} 
        
        const result = a + b; 
        
        const endTime = performance.now(); 
        const duration = endTime - startTime; 
        console.log(`Execution time for computeSum: ${duration.toFixed(2)} milliseconds`); 
        
        return result; 
    }
}

const example = new Example();
const sum = example.computeSum(5, 10);
console.log(`Sum: ${sum}`);
