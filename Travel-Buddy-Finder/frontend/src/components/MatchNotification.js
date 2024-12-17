import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { chat } from '../services/api';

const MatchNotification = ({ user, onClose }) => {
    const navigate = useNavigate();

    const handleStartChat = async () => {
        try {
            // Create a new conversation with the matched user
            const response = await chat.createConversation(user.id);
            const conversationId = response.data.id;
            
            // Navigate to the chat
            navigate(`/app/messages/${conversationId}`);
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>

                {/* Match Content */}
                <div className="p-8 text-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 bg-white dark:bg-gray-800 text-2xl">🎉</span>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        It's a Match!
                    </h2>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-8">
                        You and {user.name} have liked each other. Start a conversation and plan your next adventure together!
                    </p>

                    {/* User Photos */}
                    <div className="flex justify-center items-center space-x-8 mb-8">
                        <div className="relative">
                            <img
                                src="https://via.placeholder.com/100"
                                alt="Your profile"
                                className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-700"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-6 h-6 border-4 border-white dark:border-gray-800"></div>
                        </div>
                        <div className="relative">
                            <img
                                src={user.photos?.[0] || "https://via.placeholder.com/100"}
                                alt={user.name}
                                className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-700"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-6 h-6 border-4 border-white dark:border-gray-800"></div>
                        </div>
                    </div>

                    {/* Travel Compatibility */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Travel Compatibility
                        </h3>
                        <div className="flex justify-center items-center space-x-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    85%
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Match
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    3
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Common Destinations
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    2
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Shared Interests
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Keep Swiping
                        </button>
                        <button
                            onClick={handleStartChat}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                            Start Chat
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default MatchNotification;
