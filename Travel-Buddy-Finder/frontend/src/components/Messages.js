import React, { useState, useEffect, useRef } from 'react';
import authService from '../services/api';

const Messages = () => {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [error, setError] = useState('');

    // Mock data - Replace with actual API calls
    useEffect(() => {
        setConversations([
            {
                id: 1,
                user: {
                    id: 2,
                    name: 'John Doe',
                    avatar: 'https://via.placeholder.com/40'
                },
                lastMessage: 'Hey, want to travel together?',
                timestamp: new Date().toISOString()
            },
            // Add more conversations here
        ]);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Mock sending message - Replace with actual API call
        const message = {
            id: messages.length + 1,
            content: newMessage,
            sender: 'me',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, message]);
        setNewMessage('');
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)]">
            <div className="flex h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                {/* Conversations List */}
                <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Messages</h2>
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-4rem)]">
                        {conversations.map(conversation => (
                            <div
                                key={conversation.id}
                                onClick={() => setActiveConversation(conversation)}
                                className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                                    activeConversation?.id === conversation.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    <img
                                        src={conversation.user.avatar}
                                        alt={conversation.user.name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                                            {conversation.user.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {conversation.lastMessage}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatTimestamp(conversation.timestamp)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 flex flex-col">
                    {activeConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center">
                                    <img
                                        src={activeConversation.user.avatar}
                                        alt={activeConversation.user.name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <h2 className="ml-4 text-xl font-semibold text-gray-800 dark:text-white">
                                        {activeConversation.user.name}
                                    </h2>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {messages.map(message => (
                                    <div
                                        key={message.id}
                                        className={`flex ${
                                            message.sender === 'me' ? 'justify-end' : 'justify-start'
                                        } mb-4`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                message.sender === 'me'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'
                                            }`}
                                        >
                                            <p>{message.content}</p>
                                            <span className="text-xs opacity-75 mt-1 block">
                                                {formatTimestamp(message.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex space-x-4">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        className="input-field flex-1"
                                    />
                                    <button type="submit" className="btn-primary">
                                        Send
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-gray-500 dark:text-gray-400">
                                Select a conversation to start messaging
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
