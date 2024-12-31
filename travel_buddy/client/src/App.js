import React, { useState } from 'react';

function App() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission (API call)
  };

  return (
    <div className="App">
      <h1>Welcome to the App</h1>
      <p>This is a sample application.</p>
      <button 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp ? 'Switch to Log In' : 'Switch to Sign Up'}
      </button>
      <form onSubmit={handleSubmit} className="mt-4">
        {isSignUp && (
          <>
            <input 
              type="text" 
              name="username" 
              placeholder="Username" 
              value={formData.username} 
              onChange={handleChange} 
              required 
            />
            <input 
              type="email" 
              name="email" 
              placeholder="Email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          </>
        )}
        <input 
          type="password" 
          name="password" 
          placeholder="Password" 
          value={formData.password} 
          onChange={handleChange} 
          required 
        />
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          {isSignUp ? 'Sign Up' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

export default App;