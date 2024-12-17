import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    CalendarIcon, 
    MapPinIcon, 
    ClockIcon, 
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ShareIcon
} from '@heroicons/react/24/outline';

const ItineraryPage = () => {
    const [itineraries, setItineraries] = useState([
        {
            id: 1,
            title: 'European Adventure 2024',
            description: 'A 3-week journey through Western Europe',
            startDate: '2024-06-01',
            endDate: '2024-06-21',
            destinations: ['Paris', 'Amsterdam', 'Berlin', 'Prague'],
            days: [
                {
                    date: '2024-06-01',
                    activities: [
                        {
                            time: '09:00',
                            title: 'Eiffel Tower Visit',
                            location: 'Champ de Mars, Paris',
                            notes: 'Book tickets in advance to avoid queues'
                        },
                        {
                            time: '14:00',
                            title: 'Louvre Museum',
                            location: 'Rue de Rivoli, Paris',
                            notes: 'Focus on main attractions: Mona Lisa, Venus de Milo'
                        }
                    ]
                }
            ],
            collaborators: [
                {
                    id: 1,
                    name: 'John Doe',
                    avatar: 'https://via.placeholder.com/40'
                }
            ],
            status: 'planning'
        },
        {
            id: 2,
            title: 'Southeast Asia Backpacking',
            description: 'Exploring Thailand, Vietnam, and Cambodia',
            startDate: '2024-07-15',
            endDate: '2024-08-15',
            destinations: ['Bangkok', 'Hanoi', 'Siem Reap'],
            days: [
                {
                    date: '2024-07-15',
                    activities: [
                        {
                            time: '10:00',
                            title: 'Grand Palace Visit',
                            location: 'Bangkok, Thailand',
                            notes: 'Remember to dress appropriately'
                        }
                    ]
                }
            ],
            collaborators: [],
            status: 'draft'
        }
    ]);

    const [selectedView, setSelectedView] = useState('grid');
    const [filterStatus, setFilterStatus] = useState('all');

    const handleDeleteItinerary = (id) => {
        setItineraries(itineraries.filter(itinerary => itinerary.id !== id));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Travel Itineraries
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Plan and organize your trips
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                <PlusIcon className="h-5 w-5 inline-block mr-2" />
                                New Itinerary
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters and View Toggle */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div className="flex space-x-2 mb-4 md:mb-0">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                filterStatus === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterStatus('planning')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                filterStatus === 'planning'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            Planning
                        </button>
                        <button
                            onClick={() => setFilterStatus('completed')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                filterStatus === 'completed'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            Completed
                        </button>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setSelectedView('grid')}
                            className={`p-2 rounded-lg ${
                                selectedView === 'grid'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setSelectedView('list')}
                            className={`p-2 rounded-lg ${
                                selectedView === 'list'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            List
                        </button>
                    </div>
                </div>

                {/* Itineraries Grid */}
                <div className={`grid ${selectedView === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                    {itineraries.map((itinerary) => (
                        <motion.div
                            key={itinerary.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {itinerary.title}
                                    </h3>
                                    <div className="flex space-x-2">
                                        <button className="text-gray-400 hover:text-blue-600">
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteItinerary(itinerary.id)}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                        <button className="text-gray-400 hover:text-blue-600">
                                            <ShareIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                    {itinerary.description}
                                </p>
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                                        <CalendarIcon className="h-5 w-5 mr-2" />
                                        <span>{itinerary.startDate} - {itinerary.endDate}</span>
                                    </div>
                                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                                        <MapPinIcon className="h-5 w-5 mr-2" />
                                        <span>{itinerary.destinations.join(' → ')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {itinerary.collaborators.map((collaborator) => (
                                            <img
                                                key={collaborator.id}
                                                src={collaborator.avatar}
                                                alt={collaborator.name}
                                                className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800"
                                            />
                                        ))}
                                        <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <PlusIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                        </button>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        itinerary.status === 'planning'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}>
                                        {itinerary.status.charAt(0).toUpperCase() + itinerary.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ItineraryPage;
