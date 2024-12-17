import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    fetchConversations,
    selectConversations,
    selectUnreadCounts,
    selectOnlineUsers,
    selectChatLoading
} from '../redux/chatSlice';

const ChatList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const conversations = useSelector(selectConversations);
    const unreadCounts = useSelector(selectUnreadCounts);
    const onlineUsers = useSelector(selectOnlineUsers);
    const isLoading = useSelector(selectChatLoading);

    useEffect(() => {
        dispatch(fetchConversations());
    }, [dispatch]);

    const formatLastMessage = (message) => {
        if (!message) return '';
        return message.length > 30 ? message.substring(0, 30) + '...' : message;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow px-4 py-3">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Messages</h1>
            </div>

            {/* Conversations List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                    {conversations.map((conversation) => (
                        <motion.div
                            key={conversation.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                            className="cursor-pointer"
                            onClick={() => navigate(`/app/messages/${conversation.id}`)}
                        >
                            <div className="px-4 py-3 flex items-center space-x-3">
                                {/* Avatar with Online Status */}
                                <div className="relative">
                                    <img
                                        src={conversation.otherUser.avatar || "https://via.placeholder.com/40"}
                                        alt={conversation.otherUser.name}
                                        className="w-12 h-12 rounded-full"
                                    />
                                    {onlineUsers.has(conversation.otherUser.id) && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                                    )}
                                </div>

                                {/* Conversation Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {conversation.otherUser.name}
                                        </h2>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatTimestamp(conversation.lastMessage?.timestamp)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {formatLastMessage(conversation.lastMessage?.content)}
                                        </p>
                                        {unreadCounts[conversation.id] > 0 && (
                                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                                                {unreadCounts[conversation.id]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {conversations.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">
                            No conversations yet. Start matching with travelers to begin chatting!
                        </p>
                        <Link
                            to="/app/swipe"
                            className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Find Travel Buddies
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatList;
