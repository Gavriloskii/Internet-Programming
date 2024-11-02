const apiKey = "1e81bd853f794af5988230307240211"; // Replace with your actual WeatherAPI key
const apiBase = "https://api.weatherapi.com/v1/current.json";

async function fetchWeather(city: string) {
    const cityNameDisplay = document.getElementById("cityName") as HTMLElement;
    const temperatureDisplay = document.getElementById("temperature") as HTMLElement;
    const weatherDisplay = document.getElementById("weather") as HTMLElement;
    const humidityDisplay = document.getElementById("humidity") as HTMLElement;

    try {
        // Fetch weather data for the specified city
        const response = await fetch(`${apiBase}?key=${apiKey}&q=${city}&aqi=no`);
        
        if (!response.ok) {
            throw new Error("City not found or another error occurred");
        }

        const data = await response.json();

        // Update the HTML with weather data
        cityNameDisplay.textContent = data.location.name;
        temperatureDisplay.textContent = data.current.temp_c.toFixed(1);
        weatherDisplay.textContent = data.current.condition.text;
        humidityDisplay.textContent = data.current.humidity.toString();
    } catch (error) {
        console.error("Error fetching weather data:", error);
        
        // Display error message
        cityNameDisplay.textContent = "Error fetching data";
        temperatureDisplay.textContent = "-";
        weatherDisplay.textContent = "-";
        humidityDisplay.textContent = "-";
    }
}

// Set up event listener for the "Get Weather" button
document.getElementById("getWeatherBtn")?.addEventListener("click", () => {
    const cityInput = document.getElementById("cityInput") as HTMLInputElement;
    const city = cityInput.value.trim();

    if (city) {
        fetchWeather(city);
    } else {
        alert("Please enter a city name.");
    }
});
