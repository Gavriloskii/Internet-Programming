async function promiseFunction(flag: boolean): Promise<string>{
    return new Promise<string>((resolve,reject) => {
        setTimeout(() => {
            if(flag){
                resolve("Promise resolved");
            }
            else{
                reject("Promise rejected");
            }
        }, 2000);
    });
}

async function execute() {
    try{
        const result = await promiseFunction(true);
        console.log(result);
    } catch (error){
        console.log(error);
    }

    try {
        const result = await promiseFunction(false);
        console.log(result);
    } catch (error){
        console.error(error);
    }
}
execute();