import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
    GlobeAltIcon,
    UserIcon,
    CalendarIcon,
    MapPinIcon,
    LanguageIcon,
    PencilIcon,
    CameraIcon,
    CheckIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { updateProfile, selectUser } from '../redux/userSlice';

const TravelProfile = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        location: user?.location || '',
        languages: user?.languages || [],
        travelPreferences: user?.travelPreferences || {
            travelStyle: '',
            planningStyle: '',
            accommodation: '',
            groupSize: '',
            budget: ''
        },
        interests: user?.interests || []
    });

    const handleSave = async () => {
        try {
            await dispatch(updateProfile(editedProfile)).unwrap();
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('avatar', file);
            // Handle image upload logic here
        }
    };

    const travelStyles = [
        'Adventure',
        'Cultural',
        'Relaxation',
        'Budget',
        'Luxury',
        'Solo',
        'Group',
        'Photography',
        'Food & Wine',
        'Eco-friendly'
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Profile Header */}
            <div className="relative mb-8">
                {/* Cover Photo */}
                <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
                
                {/* Profile Picture */}
                <div className="absolute -bottom-16 left-8">
                    <div className="relative">
                        <img
                            src={user?.avatar || 'https://via.placeholder.com/128'}
                            alt={user?.name}
                            className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800"
                        />
                        {isEditing && (
                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer">
                                <CameraIcon className="h-5 w-5" />
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        )}
                    </div>
                </div>

                {/* Edit Button */}
                <div className="absolute top-4 right-4">
                    {isEditing ? (
                        <div className="flex space-x-2">
                            <button
                                onClick={handleSave}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <PencilIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Content */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column - Basic Info */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedProfile.name}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        name: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            ) : (
                                user?.name
                            )}
                        </h1>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mt-2">
                            <MapPinIcon className="h-5 w-5 mr-2" />
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedProfile.location}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        location: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            ) : (
                                user?.location
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            About Me
                        </h2>
                        {isEditing ? (
                            <textarea
                                value={editedProfile.bio}
                                onChange={(e) => setEditedProfile({
                                    ...editedProfile,
                                    bio: e.target.value
                                })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                            />
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400">
                                {user?.bio}
                            </p>
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Languages
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {(isEditing ? editedProfile.languages : user?.languages)?.map((language, index) => (
                                <span
                                    key={index}
                                    className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                                >
                                    {language}
                                    {isEditing && (
                                        <button
                                            onClick={() => setEditedProfile({
                                                ...editedProfile,
                                                languages: editedProfile.languages.filter((_, i) => i !== index)
                                            })}
                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                        >
                                            ×
                                        </button>
                                    )}
                                </span>
                            ))}
                            {isEditing && (
                                <button
                                    onClick={() => {
                                        const language = prompt('Enter language');
                                        if (language) {
                                            setEditedProfile({
                                                ...editedProfile,
                                                languages: [...editedProfile.languages, language]
                                            });
                                        }
                                    }}
                                    className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm"
                                >
                                    + Add Language
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle Column - Travel Preferences */}
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Travel Preferences
                    </h2>

                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Travel Style
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {travelStyles.map((style) => (
                                <button
                                    key={style}
                                    onClick={() => isEditing && setEditedProfile({
                                        ...editedProfile,
                                        travelPreferences: {
                                            ...editedProfile.travelPreferences,
                                            travelStyle: style
                                        }
                                    })}
                                    className={`px-3 py-1 rounded-full text-sm ${
                                        (isEditing ? editedProfile : user)?.travelPreferences?.travelStyle === style
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    } ${isEditing ? 'cursor-pointer' : ''}`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Planning Style
                        </h3>
                        {isEditing ? (
                            <select
                                value={editedProfile.travelPreferences.planningStyle}
                                onChange={(e) => setEditedProfile({
                                    ...editedProfile,
                                    travelPreferences: {
                                        ...editedProfile.travelPreferences,
                                        planningStyle: e.target.value
                                    }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                            >
                                <option value="Planner">Detailed Planner</option>
                                <option value="Flexible">Flexible</option>
                                <option value="Spontaneous">Spontaneous</option>
                            </select>
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400">
                                {user?.travelPreferences?.planningStyle}
                            </p>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Preferred Group Size
                        </h3>
                        {isEditing ? (
                            <select
                                value={editedProfile.travelPreferences.groupSize}
                                onChange={(e) => setEditedProfile({
                                    ...editedProfile,
                                    travelPreferences: {
                                        ...editedProfile.travelPreferences,
                                        groupSize: e.target.value
                                    }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                            >
                                <option value="Solo">Solo</option>
                                <option value="Small">Small (2-4)</option>
                                <option value="Medium">Medium (5-8)</option>
                                <option value="Large">Large (8+)</option>
                            </select>
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400">
                                {user?.travelPreferences?.groupSize}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Column - Travel Stats & Interests */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Travel Stats
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    12
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Countries Visited
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    25
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Travel Buddies
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    8
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Trips Planned
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    4.8
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Rating
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Interests
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {(isEditing ? editedProfile.interests : user?.interests)?.map((interest, index) => (
                                <span
                                    key={index}
                                    className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm"
                                >
                                    {interest}
                                    {isEditing && (
                                        <button
                                            onClick={() => setEditedProfile({
                                                ...editedProfile,
                                                interests: editedProfile.interests.filter((_, i) => i !== index)
                                            })}
                                            className="ml-2 text-purple-600 hover:text-purple-800"
                                        >
                                            ×
                                        </button>
                                    )}
                                </span>
                            ))}
                            {isEditing && (
                                <button
                                    onClick={() => {
                                        const interest = prompt('Enter interest');
                                        if (interest) {
                                            setEditedProfile({
                                                ...editedProfile,
                                                interests: [...editedProfile.interests, interest]
                                            });
                                        }
                                    }}
                                    className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm"
                                >
                                    + Add Interest
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelProfile;
