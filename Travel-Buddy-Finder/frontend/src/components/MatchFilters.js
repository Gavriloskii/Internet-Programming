import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const MatchFilters = ({ filters, onChange, onClose }) => {
    const personalityTypes = ['adventurer', 'planner', 'flexible', 'relaxed', 'cultural'];
    const budgetTypes = ['budget', 'moderate', 'luxury'];
    const interestOptions = [
        'nature',
        'culture',
        'food',
        'adventure',
        'history',
        'photography',
        'nightlife',
        'shopping',
        'art',
        'sports'
    ];

    const handleChange = (field, value) => {
        onChange({
            ...filters,
            [field]: value
        });
    };

    const handleInterestToggle = (interest) => {
        const newInterests = filters.interests.includes(interest)
            ? filters.interests.filter(i => i !== interest)
            : [...filters.interests, interest];
        
        handleChange('interests', newInterests);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Filter Matches
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </div>

            {/* Personality Type Filter */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Personality Type
                </label>
                <select
                    value={filters.personalityType}
                    onChange={(e) => handleChange('personalityType', e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-700 dark:text-gray-300"
                >
                    <option value="">Any Type</option>
                    {personalityTypes.map(type => (
                        <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Budget Filter */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Budget Range
                </label>
                <select
                    value={filters.budget}
                    onChange={(e) => handleChange('budget', e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-700 dark:text-gray-300"
                >
                    <option value="">Any Budget</option>
                    {budgetTypes.map(budget => (
                        <option key={budget} value={budget}>
                            {budget.charAt(0).toUpperCase() + budget.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Interests Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Interests
                </label>
                <div className="flex flex-wrap gap-2">
                    {interestOptions.map(interest => (
                        <button
                            key={interest}
                            onClick={() => handleInterestToggle(interest)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                                ${filters.interests.includes(interest)
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {interest.charAt(0).toUpperCase() + interest.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reset Filters */}
            <button
                onClick={() => onChange({
                    personalityType: '',
                    budget: '',
                    interests: []
                })}
                className="mt-6 w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                Reset Filters
            </button>
        </div>
    );
};

export default MatchFilters;
