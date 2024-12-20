import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import store from './redux/store';
import { selectIsAuthenticated, selectLoading } from './redux/userSlice';

// Pages
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import EventsPage from './pages/EventsPage';
import ForumPage from './pages/ForumPage';
import ItineraryPage from './pages/ItineraryPage';

// Components
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import PersonalityQuiz from './components/PersonalityQuiz';
import SwipeToMatch from './components/SwipeToMatch';
import TravelProfile from './components/TravelProfile';
import TravelJournal from './components/TravelJournal';
import ChatList from './components/ChatList';
import Chat from './components/Chat';
import GroupChat from './components/GroupChat';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectLoading);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const App = () => {
    useEffect(() => {
        // Check user's preferred color scheme
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        }

        // Listen for changes in color scheme preference
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return (
        <Provider store={store}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route
                        path="/app"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="swipe" replace />} />
                        <Route path="swipe" element={<SwipeToMatch />} />
                        <Route path="quiz" element={<PersonalityQuiz />} />
                        <Route path="profile" element={<TravelProfile />} />
                        <Route path="journal" element={<TravelJournal />} />
                        <Route path="messages" element={<ChatList />} />
                        <Route path="messages/:conversationId" element={<Chat />} />
                        <Route path="messages/group/:groupId" element={<GroupChat />} />
                        <Route path="messages/new-group" element={<GroupChat />} />
                        <Route path="marketplace" element={<MarketplacePage />} />
                        <Route path="events" element={<EventsPage />} />
                        <Route path="forum" element={<ForumPage />} />
                        <Route path="itinerary" element={<ItineraryPage />} />
                    </Route>
                    <Route
                        path="*"
                        element={
                            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4">
                                <div className="text-center">
                                    <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
                                        404
                                    </h1>
                                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                        Page Not Found
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                                        Sorry, we couldn't find the page you're looking for.
                                    </p>
                                    <a
                                        href="/"
                                        className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        Go Back Home
                                    </a>
                                </div>
                            </div>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </Provider>
    );
};

export default App;
