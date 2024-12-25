import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

const UserProfile = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const user = useSelector((state) => state.user.currentUser);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await axios.get('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.data.data.user.profilePicture) {
                    setProfilePicture(response.data.data.user.profilePicture);
                }
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
            }
        };

        fetchUserProfile();
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type.startsWith('image/')) {
                setFile(selectedFile);
                setPreview(URL.createObjectURL(selectedFile));
                setUploadStatus('');
            } else {
                setUploadStatus('Please select an image file');
                e.target.value = '';
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadStatus('Please select a file first');
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);
        formData.append('userId', user?._id);

        try {
            setUploadStatus('Uploading...');
            const response = await axios.post('/api/auth/upload-profile-picture', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
            });
            setUploadStatus('Upload successful!');
            const fileUrl = response.data.fileUrl;
            setProfilePicture(fileUrl);
            console.log('Uploaded:', response.data.fileUrl);
        } catch (error) {
            setUploadStatus('Upload failed. Please try again.');
            console.error('Upload failed:', error);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Profile Picture Upload</h2>
            <div className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                    {profilePicture && !preview && (
                        <div className="mb-4">
                            <img 
                                src={`/api${profilePicture}`} 
                                alt="Profile" 
                                className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                            />
                        </div>
                    )}
                    {preview && (
                        <div className="mb-4">
                            <img 
                                src={preview} 
                                alt="Preview" 
                                className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                            />
                        </div>
                    )}
                    <div className="flex flex-col items-center space-y-2">
                        <label 
                            htmlFor="profile-picture" 
                            className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 transition-colors"
                        >
                            Select Image
                            <input
                                id="profile-picture"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                        <button
                            onClick={handleUpload}
                            disabled={!file}
                            className={`px-4 py-2 rounded ${
                                file 
                                    ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer' 
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            } transition-colors`}
                        >
                            Upload
                        </button>
                    </div>
                </div>
                {uploadStatus && (
                    <p className={`text-center ${
                        uploadStatus.includes('successful') 
                            ? 'text-green-500' 
                            : uploadStatus.includes('Uploading') 
                                ? 'text-blue-500' 
                                : 'text-red-500'
                    }`}>
                        {uploadStatus}
                    </p>
                )}
            </div>
        </div>
    );
};

export default UserProfile;
