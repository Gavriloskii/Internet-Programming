function promiseFunction(flag) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            if (flag) {
                resolve('Promise resolved');
            }
            else {
                reject('Promise rejected');
            }
        }, 2000);
    });
}
promiseFunction(true)
    .then(function (result) { return console.log(result); })
    .catch(function (error) { return console.log(error); });
promiseFunction(false)
    .then(function (result) { return console.log(result); })
    .catch(function (error) { return console.error(error); });
