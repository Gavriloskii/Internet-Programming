import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrashIcon,
    GlobeAltIcon,
    CalendarIcon,
    MapPinIcon,
    PhotoIcon,
    PlusIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { journals } from '../services/api';

const TravelJournal = () => {
    const [entries, setEntries] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newEntry, setNewEntry] = useState({
        title: '',
        content: '',
        location: {
            name: '',
            coordinates: [0, 0],
            country: '',
            city: ''
        },
        dates: {
            start: '',
            end: ''
        },
        media: [],
        photos: [],  // Initialize photos array
        tags: [],
        category: 'other',
        mood: 'happy',
        weather: 'sunny',
        privacy: 'private',
        status: 'published'
    });

    useEffect(() => {
        loadJournalEntries();
    }, []);

    const loadJournalEntries = async () => {
        try {
            setIsLoading(true);
            const response = await journals.getAll();
            setEntries(response.data.data.journals || []);
        } catch (error) {
            console.error('Failed to load journal entries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateEntry = async (e) => {
        e.preventDefault();
        try {
            // Format the entry data to match backend schema
            const entryData = {
                ...newEntry,
                dates: {
                    start: new Date(newEntry.dates.start),
                    end: new Date(newEntry.dates.start) // Set end date same as start for single-day entries
                },
                location: {
                    ...newEntry.location,
                    type: 'Point'
                }
            };

            const response = await journals.create(entryData);
            if (response.data?.data?.journal) {
                setEntries([response.data.data.journal, ...entries]);
                setIsCreating(false);
                setNewEntry({
                    title: '',
                    content: '',
                    location: {
                        name: '',
                        coordinates: [0, 0],
                        country: '',
                        city: ''
                    },
                    dates: {
                        start: '',
                        end: ''
                    },
                    media: [],
                    photos: [],
                    tags: [],
                    category: 'other',
                    mood: 'happy',
                    weather: 'sunny',
                    privacy: 'private',
                    status: 'published'
                });
            }
        } catch (error) {
            console.error('Failed to create journal entry:', error);
        }
    };

    const handleDeleteEntry = async (entryId) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            try {
                await journals.delete(entryId);
                setEntries(entries.filter(entry => entry.id !== entryId));
            } catch (error) {
                console.error('Failed to delete journal entry:', error);
            }
        }
    };

    const handlePhotoUpload = (event) => {
        const files = Array.from(event.target.files);
        // Handle photo upload logic here
        setNewEntry({
            ...newEntry,
            photos: [...newEntry.photos, ...files.map(file => URL.createObjectURL(file))]
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Travel Journal
                </h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Entry
                </button>
            </div>

            {/* Create Entry Modal */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        New Journal Entry
                                    </h2>
                                    <button
                                        onClick={() => setIsCreating(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateEntry} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={newEntry.title}
                                            onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Location
                                            </label>
                                            <input
                                                type="text"
                                                value={newEntry.location.name}
                                                onChange={(e) => setNewEntry({
                                                    ...newEntry,
                                                    location: {
                                                        ...newEntry.location,
                                                        name: e.target.value
                                                    }
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                required
                                                placeholder="Enter location name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                value={newEntry.dates.start}
                                                onChange={(e) => setNewEntry({
                                                    ...newEntry,
                                                    dates: {
                                                        ...newEntry.dates,
                                                        start: e.target.value,
                                                        end: e.target.value // Set end date same as start for single-day entries
                                                    }
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Mood
                                            </label>
                                            <select
                                                value={newEntry.mood}
                                                onChange={(e) => setNewEntry({ ...newEntry, mood: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                required
                                            >
                                                <option value="excited">Excited</option>
                                                <option value="happy">Happy</option>
                                                <option value="peaceful">Peaceful</option>
                                                <option value="neutral">Neutral</option>
                                                <option value="tired">Tired</option>
                                                <option value="frustrated">Frustrated</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Weather
                                            </label>
                                            <select
                                                value={newEntry.weather}
                                                onChange={(e) => setNewEntry({ ...newEntry, weather: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                required
                                            >
                                                <option value="sunny">Sunny</option>
                                                <option value="cloudy">Cloudy</option>
                                                <option value="rainy">Rainy</option>
                                                <option value="snowy">Snowy</option>
                                                <option value="stormy">Stormy</option>
                                                <option value="hot">Hot</option>
                                                <option value="cold">Cold</option>
                                                <option value="perfect">Perfect</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Visibility
                                            </label>
                                            <select
                                                value={newEntry.privacy}
                                                onChange={(e) => setNewEntry({ ...newEntry, privacy: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                required
                                            >
                                                <option value="private">Private</option>
                                                <option value="friends">Friends Only</option>
                                                <option value="public">Public</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Content
                                        </label>
                                        <textarea
                                            value={newEntry.content}
                                            onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                                            rows={6}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Photos
                                        </label>
                                        <div className="flex flex-wrap gap-4 mb-4">
                                            {newEntry.photos.map((photo, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={photo}
                                                        alt={`Upload ${index + 1}`}
                                                        className="w-24 h-24 object-cover rounded-lg"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewEntry({
                                                            ...newEntry,
                                                            photos: newEntry.photos.filter((_, i) => i !== index)
                                                        })}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                    >
                                                        <XMarkIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500">
                                                <PhotoIcon className="h-8 w-8 text-gray-400" />
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handlePhotoUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Tags
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Add tags (comma separated)"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const tags = e.target.value.split(',').map(tag => tag.trim());
                                                    setNewEntry({
                                                        ...newEntry,
                                                        tags: [...new Set([...newEntry.tags, ...tags])]
                                                    });
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {newEntry.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm flex items-center"
                                                >
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewEntry({
                                                            ...newEntry,
                                                            tags: newEntry.tags.filter((_, i) => i !== index)
                                                        })}
                                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreating(false)}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Create Entry
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Journal Entries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {entries.map((entry) => (
                    <motion.div
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                    >
                        {entry.photos?.[0] && (
                            <img
                                src={entry.photos[0]}
                                alt={entry.title}
                                className="w-full h-48 object-cover"
                            />
                        )}
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {entry.title}
                                </h2>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleDeleteEntry(entry.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                                <div className="flex items-center mr-4">
                                    <MapPinIcon className="h-4 w-4 mr-1" />
                                    {entry.location}
                                </div>
                                <div className="flex items-center mr-4">
                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                    {new Date(entry.date).toLocaleDateString()}
                                </div>
                                {entry.mood && (
                                    <div className="flex items-center mr-4">
                                        <span className="mr-1">😊</span>
                                        {entry.mood}
                                    </div>
                                )}
                                {entry.weather && (
                                    <div className="flex items-center mr-4">
                                        <span className="mr-1">🌤️</span>
                                        {entry.weather}
                                    </div>
                                )}
                                {entry.visibility && (
                                    <div className="flex items-center">
                                        <span className="mr-1">👁️</span>
                                        {entry.visibility}
                                    </div>
                                )}
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                                {entry.content}
                            </p>

                            {entry.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {entry.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {entries.length === 0 && (
                <div className="text-center py-12">
                    <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Journal Entries Yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Start documenting your travel adventures!
                    </p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Create Your First Entry
                    </button>
                </div>
            )}
        </div>
    );
};

export default TravelJournal;
