import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, selectUser, selectLoading, selectError } from '../redux/userSlice';
import apiService from '../services/api';

const Profile = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const loading = useSelector(selectLoading);
    const reduxError = useSelector(selectError);
    
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        bio: '',
        interests: '',
        travelPreferences: '',
        languages: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                bio: user.bio || '',
                interests: user.interests || '',
                travelPreferences: user.travelPreferences || '',
                languages: user.languages || ''
            });
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await dispatch(updateProfile(formData)).unwrap();
            setSuccess('Profile updated successfully');
            setIsEditing(false);
        } catch (err) {
            setError(err || 'Failed to update profile');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload
        try {
            const formData = new FormData();
            formData.append('profilePicture', file);
            const response = await apiService.users.uploadProfilePicture(formData);
            if (response.data?.data?.profilePicture) {
                dispatch(updateProfile({ profilePicture: response.data.data.profilePicture }));
                setSuccess('Profile picture updated successfully');
            }
        } catch (err) {
            setError('Failed to upload profile picture');
        }
    };

    if (!user) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="card">
                <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                            <img 
                                src={imagePreview || (user?.profilePicture ? `${process.env.REACT_APP_API_URL}${user.profilePicture}` : `${process.env.REACT_APP_API_URL}/default-avatar.png`)}
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {isEditing && (
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary-dark"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        My Profile
                    </h1>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="btn-secondary"
                        disabled={loading}
                    >
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>

                {(error || reduxError) && (
                    <div className="error-message mb-4">{error || reduxError}</div>
                )}
                {success && (
                    <div className="success-message mb-4">{success}</div>
                )}

                {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="form-label">Bio</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                className="input-field h-32"
                                placeholder="Tell us about yourself..."
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="form-label">Interests</label>
                            <input
                                type="text"
                                name="interests"
                                value={formData.interests}
                                onChange={handleInputChange}
                                className="input-field"
                                placeholder="e.g., Hiking, Photography, Food"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="form-label">Travel Preferences</label>
                            <input
                                type="text"
                                name="travelPreferences"
                                value={formData.travelPreferences}
                                onChange={handleInputChange}
                                className="input-field"
                                placeholder="e.g., Adventure, Luxury, Budget"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="form-label">Languages</label>
                            <input
                                type="text"
                                name="languages"
                                value={formData.languages}
                                onChange={handleInputChange}
                                className="input-field"
                                placeholder="e.g., English, Spanish, French"
                                disabled={loading}
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Bio</h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{user.bio || 'No bio added yet'}</p>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Interests</h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{user.interests || 'No interests added yet'}</p>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Travel Preferences</h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{user.travelPreferences || 'No preferences added yet'}</p>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Languages</h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{user.languages || 'No languages added yet'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
