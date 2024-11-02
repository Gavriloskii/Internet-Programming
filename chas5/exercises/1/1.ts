function callWithDelay(callback1: () => void, callback2: () => void, delay: number): void{
    callback1();
    setTimeout(() => {
        callback2();
    }, delay);
}
const firstCallback = () => {
    console.log('First callback executed');
};
const secondCallback = () => {
    console.log('Second callback called after delay!');
};
callWithDelay(firstCallback, secondCallback, 2000);