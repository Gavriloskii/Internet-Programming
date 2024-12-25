import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    MapPinIcon,
    PencilIcon,
    CameraIcon,
    CheckIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { updateProfile, selectUser } from '../redux/userSlice';
import { apiService as api } from '../services/api';

const TravelProfile = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    // Log and validate profile picture URL when user data changes
    useEffect(() => {
        if (user?.profilePicture) {
            console.log('Profile Picture URL:', user.profilePicture);
            
            // Verify URL format
            if (!user.profilePicture.startsWith('/uploads/')) {
                console.warn('Invalid profile picture URL format:', user.profilePicture);
            }
        }
    }, [user?.profilePicture]);

    // Initialize editedProfile when entering edit mode
    const startEditing = () => {
        setEditedProfile({
            name: user?.name || '',
            bio: user?.bio || '',
            location: {
                type: 'Point',
                coordinates: user?.location?.coordinates || [0, 0],
                city: user?.location?.city || '',
                country: user?.location?.country || ''
            },
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
        setIsEditing(true);
    };

    // Reset everything when canceling edit
    const cancelEdit = () => {
        setEditedProfile(null);
        setPreviewImage(null);
        setIsEditing(false);
    };

    const handleSave = async () => {
        try {
            const formData = new FormData();
            
            // If there's a new profile picture, append it
            if (editedProfile.avatar) {
                formData.append('profilePicture', editedProfile.avatar);
                // Also append the field to indicate we're updating the profile picture
                formData.append('updateProfilePicture', 'true');
            }

            // Append other profile data
            Object.keys(editedProfile).forEach(key => {
                if (key !== 'avatar') {
                    if (typeof editedProfile[key] === 'object') {
                        formData.append(key, JSON.stringify(editedProfile[key]));
                    } else {
                        formData.append(key, editedProfile[key]);
                    }
                }
            });

            // Show loading state
            const saveButton = document.querySelector('#save-button');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<span class="animate-spin">⌛</span>';
            }

            // Update profile with FormData
            await dispatch(updateProfile(formData)).unwrap();
            
            // Re-fetch updated profile to get new profile picture URL
            const response = await api.users.getProfile();
            if (response.data?.data?.user?.profilePicture) {
                const profilePicture = response.data.data.user.profilePicture;
                console.log('Updated Profile Picture URL:', profilePicture);
                
                // Verify URL format
                if (!profilePicture.startsWith('/uploads/')) {
                    console.warn('Invalid updated profile picture URL format:', profilePicture);
                    throw new Error('Invalid profile picture URL format');
                }
                
                setPreviewImage(`http://localhost:5001${profilePicture}`);
            }
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50';
            successMessage.textContent = 'Profile updated successfully!';
            document.body.appendChild(successMessage);

            // Remove success message after 3 seconds
            setTimeout(() => {
                successMessage.remove();
            }, 3000);

            // Reset edit state and preview
            setIsEditing(false);
            setEditedProfile(null);
            setPreviewImage(null);
        } catch (error) {
            console.error('Failed to update profile:', error);
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg z-50';
            errorMessage.textContent = error.message || 'Failed to update profile';
            document.body.appendChild(errorMessage);

            // Remove error message after 3 seconds
            setTimeout(() => {
                errorMessage.remove();
            }, 3000);
        } finally {
            // Reset save button state
            const saveButton = document.querySelector('#save-button');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
            }
        }
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (2MB limit)
            if (file.size > 2 * 1024 * 1024) {
                alert('File size must be less than 2MB');
                return;
            }

            setEditedProfile(prev => ({
                ...prev,
                avatar: file
            }));

            // Show preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.onerror = () => {
                alert('Error reading file');
                setPreviewImage(null);
            };
            reader.readAsDataURL(file);
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
                            id="profile-preview"
                            src={previewImage || (user?.profilePicture ? 
                                (user.profilePicture.startsWith('/uploads/') ? 
                                    `http://localhost:5001${user.profilePicture}` : 
                                    (console.error('Invalid profile picture URL format:', user.profilePicture), 'https://via.placeholder.com/128')
                                ) : 'https://via.placeholder.com/128')}
                            alt={user?.name}
                            className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover"
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
                                id="save-button"
                                onClick={handleSave}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={cancelEdit}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={startEditing}
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
                                    value={editedProfile.location?.city || ''}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        location: {
                                            ...editedProfile.location,
                                            city: e.target.value
                                        }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            ) : (
                                `${user?.location?.city || ''}, ${user?.location?.country || ''}`
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
                                    {language.language} - {language.proficiency}
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
                                        const proficiency = prompt('Enter proficiency (Beginner/Intermediate/Advanced/Native)');
                                        if (language && proficiency) {
                                            setEditedProfile({
                                                ...editedProfile,
                                                languages: [...editedProfile.languages, {
                                                    language,
                                                    proficiency,
                                                    _id: Date.now().toString(),
                                                    id: Date.now().toString()
                                                }]
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
