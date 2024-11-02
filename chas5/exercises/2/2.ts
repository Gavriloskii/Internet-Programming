function promiseFunction(flag: boolean): Promise<string>{
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (flag){
                resolve('Promise resolved');
            }
            else{
                reject('Promise rejected');
            }
        }, 2000);
    });
}

promiseFunction(true)
.then(result => console.log(result))
.catch(error => console.log(error));

promiseFunction(false)
.then(result => console.log(result))
.catch(error => console.error(error));
