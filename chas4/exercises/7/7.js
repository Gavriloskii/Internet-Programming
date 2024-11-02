var Example = /** @class */ (function () {
    function Example() {
    }
    Example.prototype.computeSum = function (a, b) {
        var startTime = performance.now();
        for (var i = 0; i < 12275; i++) { }
        var result = a + b;
        var endTime = performance.now();
        var duration = endTime - startTime;
        console.log("Execution time for computeSum: ".concat(duration.toFixed(2), " milliseconds"));
        return result;
    };
    return Example;
}());
var example = new Example();
var sum = example.computeSum(5, 10);
console.log("Sum: ".concat(sum));
