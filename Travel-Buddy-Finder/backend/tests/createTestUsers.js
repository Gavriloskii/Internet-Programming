const axios = require('axios');

const testUsers = [
    {
        name: "Adventure Alex",
        email: "alex@test.com",
        password: "TravelTest2023!",
        personalityType: "adventurer",
        travelPreferences: {
            budget: "moderate",
            pace: "fast",
            interests: ["adventure", "nature", "photography"],
            accommodationPreference: "hostel"
        },
        languages: [
            { language: "English", proficiency: "native" },
            { language: "Spanish", proficiency: "intermediate" }
        ],
        location: {
            coordinates: [-122.419416, 37.774929], // San Francisco
            country: "USA",
            city: "San Francisco"
        }
    },
    {
        name: "Culture Clara",
        email: "clara@test.com",
        password: "TravelTest2023!",
        personalityType: "cultural",
        travelPreferences: {
            budget: "luxury",
            pace: "slow",
            interests: ["culture", "history", "art", "food"],
            accommodationPreference: "hotel"
        },
        languages: [
            { language: "English", proficiency: "native" },
            { language: "French", proficiency: "fluent" },
            { language: "Italian", proficiency: "basic" }
        ],
        location: {
            coordinates: [2.352222, 48.856614], // Paris
            country: "France",
            city: "Paris"
        }
    },
    {
        name: "Budget Bob",
        email: "bob@test.com",
        password: "TravelTest2023!",
        personalityType: "planner",
        travelPreferences: {
            budget: "budget",
            pace: "moderate",
            interests: ["nature", "hiking", "food", "photography"],
            accommodationPreference: "camping"
        },
        languages: [
            { language: "English", proficiency: "native" },
            { language: "German", proficiency: "basic" }
        ],
        location: {
            coordinates: [-73.935242, 40.730610], // New York
            country: "USA",
            city: "New York"
        }
    },
    {
        name: "Social Sarah",
        email: "sarah@test.com",
        password: "TravelTest2023!",
        personalityType: "flexible",
        travelPreferences: {
            budget: "moderate",
            pace: "fast",
            interests: ["nightlife", "food", "shopping", "culture"],
            accommodationPreference: "apartment"
        },
        languages: [
            { language: "English", proficiency: "native" },
            { language: "Japanese", proficiency: "intermediate" }
        ],
        location: {
            coordinates: [139.691706, 35.689487], // Tokyo
            country: "Japan",
            city: "Tokyo"
        }
    },
    {
        name: "Relaxed Ray",
        email: "ray@test.com",
        password: "TravelTest2023!",
        personalityType: "relaxed",
        travelPreferences: {
            budget: "luxury",
            pace: "slow",
            interests: ["nature", "photography", "food", "art"],
            accommodationPreference: "hotel"
        },
        languages: [
            { language: "English", proficiency: "native" },
            { language: "Portuguese", proficiency: "fluent" }
        ],
        location: {
            coordinates: [-43.182365, -22.906847], // Rio de Janeiro
            country: "Brazil",
            city: "Rio de Janeiro"
        }
    }
];

async function createTestUsers() {
    const API_URL = 'http://localhost:5001/api';
    
    for (const user of testUsers) {
        try {
            const response = await axios.post(`${API_URL}/auth/signup`, user);
            console.log(`Created user: ${user.name}`);
            console.log('Response:', response.data);
        } catch (error) {
            console.error(`Failed to create user ${user.name}:`, error.response?.data || error.message);
        }
    }
}

// Execute the function
createTestUsers().then(() => {
    console.log('Finished creating test users');
}).catch(error => {
    console.error('Error in main execution:', error);
});
