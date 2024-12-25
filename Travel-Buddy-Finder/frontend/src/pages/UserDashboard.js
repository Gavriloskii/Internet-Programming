import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { login } from '../redux/userSlice';
import SwipeCard from '../components/SwipeCard';
import { users } from '../services/api';

const UserDashboard = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPotentialMatches = async () => {
      try {
        const response = await users.getPotentialMatches();
        setPotentialMatches(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch potential matches');
        setLoading(false);
      }
    };

    if (user) {
      fetchPotentialMatches();
    }
  }, [user]);

  const handleSwipe = async (direction, matchId) => {
    console.log(`Swiped ${direction} on user ${matchId}`);
    // Remove the swiped card from the stack
    setPotentialMatches(prev => prev.filter(match => match._id !== matchId));
    
    if (direction === 'right') {
      try {
        await users.createMatch(matchId);
      } catch (err) {
        console.error('Failed to create match:', err);
      }
    }
  };

  // Function to set test user data
  const handleTestLogin = () => {
    console.log('Attempting test login...');
    dispatch(login({
      name: 'Test User',
      email: 'test@example.com',
      id: '123'
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <button
          onClick={handleTestLogin}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Login as Test User
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
          Welcome, {user?.name || 'Traveler'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Your travel journey continues here</p>
      </div>

      {/* Swipe Cards Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Find Travel Buddies</h2>
        <div className="relative h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : potentialMatches.length === 0 ? (
            <div className="text-center text-gray-500">
              No more potential matches available at the moment.
            </div>
          ) : (
            potentialMatches.map((match, index) => (
              <SwipeCard
                key={match._id}
                user={match}
                isTop={index === potentialMatches.length - 1}
                onSwipe={(direction) => handleSwipe(direction, match._id)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: index
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Recent Matches Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3">
            <h2 className="text-xl font-semibold">Recent Matches</h2>
          </div>
          <div className="p-4">
            {potentialMatches.slice(0, 3).map(match => (
              <div key={match._id} className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{match.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Destination: {match.travelPreferences?.destination || 'Not specified'}<br/>
                  Travel Style: {match.travelStyle || 'Not specified'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
