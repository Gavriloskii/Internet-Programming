const apiUrl = "https://api.exchangerate-api.com/v4/latest/USD";
async function populateCurrencies() {
    try{
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch currency data");

        const data = await response.json();
        const currencies = Object.keys(data.rates);

        const fromCurrencySelect = document.getElementById("fromCurrency") as HTMLSelectElement;
        const toCurrencySelect = document.getElementById("toCurrency") as HTMLSelectElement;

        currencies.forEach(currency => {
            const optionFrom = document.createElement("option");
            optionFrom.value = currency
            optionFrom.text = currency;
            fromCurrencySelect.add(optionFrom);

            const optionTo = document.createElement("option");
            optionTo.value = currency;
            optionTo.text = currency;
            toCurrencySelect.add(optionTo);
        });
    }
    catch(error){
        console.log("Error loading currencies", error);
    }
}

async function convertCurrency() {
    const amountInput = document.getElementById("amount") as HTMLInputElement;
    const fromCurrencySelect = document.getElementById("fromCurrency") as HTMLSelectElement;
    const toCurrencySelect = document.getElementById("toCurrency") as HTMLSelectElement;
    const convertedAmountDisplay = document.getElementById("convertedAmount") as HTMLElement;

    const amount = parseFloat(amountInput.value);
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;

    if(isNaN(amount)){
        convertedAmountDisplay.textContent = "please enter a valid amount.";
        return;
    }
    try{
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
        if (!response.ok) throw new Error("Failed to fetch currency data");

        const data = await response.json();
        const rate = data.rates[toCurrency];

        if(!rate){
            convertedAmountDisplay.textContent = "Conversion rate not available";
            return;
        }
        const convertedAmount = amount * rate;
        convertedAmountDisplay.textContent = convertedAmount.toFixed(2);
    }
    catch(error){
        console.error("Error convering currency:", error);
        convertedAmountDisplay.textContent = "Conversion rate failed, please try again";
    }
}

document.getElementById("convertBtn")?.addEventListener("click", convertCurrency);
populateCurrencies();