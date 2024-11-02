async function executeCallbacks(callback1: () => void, callback2: () => void, delay: number): Promise <void> {
    await new Promise<void>(resolve => setTimeout(() => {
        callback1();
        resolve();
    }, delay));
    callback2();
}

const firstCallback = () => {
    console.log("First callback executed!");
};

const secondCallback = () => {
    console.log("Second callback executed!");
};

executeCallbacks(firstCallback, secondCallback, 2000)