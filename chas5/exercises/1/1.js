function callWithDelay(callback1, callback2, delay) {
    callback1();
    setTimeout(function () {
        callback2();
    }, delay);
}
var firstCallback = function () {
    console.log('First callback executed');
};
var secondCallback = function () {
    console.log('Second callback called after delay!');
};
callWithDelay(firstCallback, secondCallback, 2000);
