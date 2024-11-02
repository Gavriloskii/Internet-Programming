async function fetchJoke(): Promise<void>  {
    try{
        const response = await fetch("https://api.chucknorris.io/jokes/random");
        if (!response.ok) throw new Error("Failed to fetch a joke");
        const data = await response.json();
        const jokeContainer = document.getElementById("jokeContainer");
        if(jokeContainer){
            jokeContainer.textContent = data.value;
        }
    }
    catch (error){
        console.error("Error fetching joke:", error);
        const jokeContainer = document.getElementById("jokeContainer");
        if(jokeContainer){
            jokeContainer.textContent = "Failed to load  a joke. Please try again.";

        }
    }
}
const fetchJokeBtn = document.getElementById("fetchJokeBtn");
if(fetchJokeBtn){
    fetchJokeBtn.addEventListener("click", fetchJoke);
}