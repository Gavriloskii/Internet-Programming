import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon,
    PhotoIcon,
    FaceSmileIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    MapPinIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import socketService from '../services/socketService';
import { selectUser } from '../redux/userSlice';

const GroupChat = () => {
    const { groupId } = useParams();
    const currentUser = useSelector(selectUser);
    
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [showTripDetails, setShowTripDetails] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [tripDetails] = useState({
        destination: 'Paris, France',
        dates: 'June 15-30, 2024',
        budget: '€2000-3000',
        activities: []
    });

    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Load group data and messages
        loadGroupData();
        
        // Socket event listeners
        socketService.on('groupMessage', handleNewMessage);
        socketService.on('participantJoined', handleParticipantJoined);
        socketService.on('participantLeft', handleParticipantLeft);

        return () => {
            socketService.socket?.off('groupMessage', handleNewMessage);
            socketService.socket?.off('participantJoined', handleParticipantJoined);
            socketService.socket?.off('participantLeft', handleParticipantLeft);
        };
    }, [groupId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadGroupData = async () => {
        try {
            setIsLoading(true);
            // Load group messages and participants
            // This would typically be an API call
            setMessages([
                {
                    id: 1,
                    senderId: 'user1',
                    senderName: 'John Doe',
                    content: 'Hey everyone! Excited about our trip!',
                    timestamp: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 2,
                    senderId: 'user2',
                    senderName: 'Jane Smith',
                    content: 'Me too! Has everyone booked their flights?',
                    timestamp: new Date(Date.now() - 1800000).toISOString()
                }
            ]);
            setParticipants([
                { id: 'user1', name: 'John Doe', avatar: 'https://via.placeholder.com/40' },
                { id: 'user2', name: 'Jane Smith', avatar: 'https://via.placeholder.com/40' }
            ]);
        } catch (error) {
            console.error('Failed to load group data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewMessage = (message) => {
        setMessages(prev => [...prev, message]);
    };

    const handleParticipantJoined = (participant) => {
        setParticipants(prev => [...prev, participant]);
    };

    const handleParticipantLeft = (participantId) => {
        setParticipants(prev => prev.filter(p => p.id !== participantId));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        socketService.sendGroupMessage(groupId, message.trim());
        setMessage('');
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
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
        <div className="flex h-screen">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="bg-white dark:bg-gray-800 shadow px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-3 h-3 border-2 border-white dark:border-gray-800"></div>
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Paris Trip Group
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {participants.length} participants
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowTripDetails(true)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                            <CalendarIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`flex ${
                                    msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'
                                }`}
                            >
                                {msg.senderId !== currentUser.id && (
                                    <img
                                        src="https://via.placeholder.com/32"
                                        alt={msg.senderName}
                                        className="h-8 w-8 rounded-full mr-2"
                                    />
                                )}
                                <div
                                    className={`max-w-[70%] ${
                                        msg.senderId === currentUser.id
                                            ? 'bg-blue-600 text-white rounded-l-lg rounded-tr-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-r-lg rounded-tl-lg'
                                    } px-4 py-2 shadow-sm`}
                                >
                                    {msg.senderId !== currentUser.id && (
                                        <p className="text-xs font-medium mb-1">
                                            {msg.senderName}
                                        </p>
                                    )}
                                    <p>{msg.content}</p>
                                    <p className="text-xs mt-1 opacity-70">
                                        {formatTime(msg.timestamp)}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                        <button
                            type="button"
                            className="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                            <FaceSmileIcon className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            className="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                            <PhotoIcon className="h-6 w-6" />
                        </button>
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={!message.trim()}
                            className={`p-2 rounded-lg ${
                                message.trim()
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                            }`}
                        >
                            <PaperAirplaneIcon className="h-6 w-6 transform rotate-90" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Trip Details Sidebar */}
            <AnimatePresence>
                {showTripDetails && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto"
                    >
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Trip Details
                                </h3>
                                <button
                                    onClick={() => setShowTripDetails(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white mb-2">
                                        <MapPinIcon className="h-5 w-5" />
                                        <h4 className="font-medium">Destination</h4>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {tripDetails.destination}
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white mb-2">
                                        <CalendarIcon className="h-5 w-5" />
                                        <h4 className="font-medium">Dates</h4>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {tripDetails.dates}
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white mb-2">
                                        <CurrencyDollarIcon className="h-5 w-5" />
                                        <h4 className="font-medium">Budget</h4>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {tripDetails.budget}
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white mb-2">
                                        <UserGroupIcon className="h-5 w-5" />
                                        <h4 className="font-medium">Participants</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {participants.map((participant) => (
                                            <div
                                                key={participant.id}
                                                className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1"
                                            >
                                                <img
                                                    src={participant.avatar}
                                                    alt={participant.name}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {participant.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GroupChat;
