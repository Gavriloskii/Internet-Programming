import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { login } from '../redux/userSlice';

const UserDashboard = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  
  // Function to set test user data
  const handleTestLogin = () => {
    console.log('Attempting test login...');
    dispatch(login({
      name: 'Test User',
      email: 'test@example.com',
      id: '123'
    }));
  };

  useEffect(() => {
    console.log('Current user state:', user);
    console.log('Authentication state:', isAuthenticated);
  }, [user, isAuthenticated]);

  // Mock data for demonstration
  const recentMatches = [
    { id: 1, name: 'Sarah', destination: 'Paris', matchDate: '2024-02-15' },
    { id: 2, name: 'Mike', destination: 'Tokyo', matchDate: '2024-02-14' },
    { id: 3, name: 'Emma', destination: 'Rome', matchDate: '2024-02-13' }
  ];

  const upcomingEvents = [
    { id: 1, title: 'City Tour', location: 'Barcelona', date: '2024-03-01' },
    { id: 2, title: 'Beach Party', location: 'Bali', date: '2024-03-15' },
    { id: 3, title: 'Mountain Hike', location: 'Swiss Alps', date: '2024-03-20' }
  ];

  const travelJournals = [
    { id: 1, title: 'Amazing Paris Trip', date: '2024-01-20', likes: 45 },
    { id: 2, title: 'Tokyo Adventures', date: '2024-01-15', likes: 32 },
    { id: 3, title: 'Rome in 3 Days', date: '2024-01-10', likes: 28 }
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Matches Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3">
            <h2 className="text-xl font-semibold">Recent Matches</h2>
          </div>
          <div className="p-4">
            {recentMatches.map(match => (
              <div key={match.id} className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{match.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Destination: {match.destination}<br/>
                  Matched on: {match.matchDate}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-green-600 text-white px-4 py-3">
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
          </div>
          <div className="p-4">
            {upcomingEvents.map(event => (
              <div key={event.id} className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{event.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Location: {event.location}<br/>
                  Date: {event.date}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Travel Journals Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-cyan-600 text-white px-4 py-3">
            <h2 className="text-xl font-semibold">Travel Journals</h2>
          </div>
          <div className="p-4">
            {travelJournals.map(journal => (
              <div key={journal.id} className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{journal.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Date: {journal.date}<br/>
                  ❤️ {journal.likes} likes
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
