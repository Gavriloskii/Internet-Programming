import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon,
    PhotoIcon,
    FaceSmileIcon, // Updated icon
    InformationCircleIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    DocumentIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import socketService from '../services/socketService';
import { selectUser } from '../redux/userSlice';
import {
    fetchMessages,
    sendMessage,
    setTypingStatus,
    selectMessages,
    selectTypingStatus,
    markConversationAsRead
} from '../redux/chatSlice';

const Chat = () => {
    const { conversationId } = useParams();
    const dispatch = useDispatch();
    const currentUser = useSelector(selectUser);
    const messages = useSelector(state => selectMessages(state)[conversationId] || []);
    const typingStatus = useSelector(state => selectTypingStatus(state)[conversationId] || {});
    
    const [newMessage, setNewMessage] = useState('');
    const [showInfo, setShowInfo] = useState(false);
    const [messageStatus, setMessageStatus] = useState({});
    const [attachments, setAttachments] = useState([]);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        dispatch(fetchMessages(conversationId));
        dispatch(markConversationAsRead(conversationId));
        socketService.on('messageStatus', handleMessageStatus);
        
        return () => {
            socketService.off('messageStatus');
        };
    }, [conversationId, dispatch]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleTyping = () => {
        dispatch(setTypingStatus({ conversationId, isTyping: true }));

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            dispatch(setTypingStatus({ conversationId, isTyping: false }));
        }, 2000);
    };

    const handleMessageStatus = ({ messageId, status }) => {
        setMessageStatus(prev => ({
            ...prev,
            [messageId]: status
        }));
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && attachments.length === 0) return;

        const messageId = Date.now().toString();
        const message = {
            id: messageId,
            conversationId,
            content: newMessage.trim(),
            attachments,
            timestamp: new Date().toISOString()
        };

        try {
            setMessageStatus(prev => ({
                ...prev,
                [messageId]: 'sending'
            }));

            await dispatch(sendMessage({
                conversationId,
                message
            })).unwrap();

            setNewMessage('');
            setAttachments([]);
            dispatch(setTypingStatus({ conversationId, isTyping: false }));
            
            setMessageStatus(prev => ({
                ...prev,
                [messageId]: 'sent'
            }));
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessageStatus(prev => ({
                ...prev,
                [messageId]: 'failed'
            }));
        }
    };

    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files);
        const newAttachments = files.map(file => ({
            id: Date.now() + Math.random(),
            file,
            preview: URL.createObjectURL(file),
            type: file.type.startsWith('image/') ? 'image' : 'file'
        }));
        setAttachments(prev => [...prev, ...newAttachments]);
    };

    const removeAttachment = (attachmentId) => {
        setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const MessageStatusIcon = ({ status }) => {
        switch (status) {
            case 'sending':
                return (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"
                    />
                );
            case 'sent':
                return <CheckCircleIcon className="h-4 w-4 text-gray-400" />;
            case 'delivered':
                return <CheckCircleIcon className="h-4 w-4 text-blue-500" />;
            case 'failed':
                return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Chat Header */}
            <div className="bg-white dark:bg-gray-800 shadow px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <img
                        src="https://via.placeholder.com/40"
                        alt="User avatar"
                        className="w-10 h-10 rounded-full"
                    />
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            John Doe
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Online
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                    <InformationCircleIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`flex ${
                                message.senderId === currentUser.id ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            <div
                                className={`max-w-[70%] ${
                                    message.senderId === currentUser.id
                                        ? 'bg-blue-600 text-white rounded-l-lg rounded-tr-lg'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-r-lg rounded-tl-lg'
                                } px-4 py-2 shadow-sm`}
                            >
                                {message.content && <p>{message.content}</p>}
                                
                                {message.attachments?.map((attachment) => (
                                    <div key={attachment.id} className="mt-2">
                                        {attachment.type === 'image' ? (
                                            <img
                                                src={attachment.preview}
                                                alt="Attachment"
                                                className="max-w-full rounded-lg"
                                            />
                                        ) : (
                                            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-600 p-2 rounded">
                                                <DocumentIcon className="h-5 w-5" />
                                                <span className="text-sm truncate">
                                                    {attachment.file.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="flex items-center justify-end mt-1 space-x-1">
                                    <span className="text-xs opacity-70">
                                        {formatTime(message.timestamp)}
                                    </span>
                                    {message.senderId === currentUser.id && (
                                        <MessageStatusIcon status={messageStatus[message.id]} />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing Indicator */}
                <AnimatePresence>
                    {Object.values(typingStatus).some(status => status) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex items-center space-x-2 text-gray-500 dark:text-gray-400"
                        >
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-sm">Typing...</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 p-2 flex gap-2 overflow-x-auto">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="relative">
                            {attachment.type === 'image' ? (
                                <img
                                    src={attachment.preview}
                                    alt="Attachment preview"
                                    className="h-20 w-20 object-cover rounded"
                                />
                            ) : (
                                <div className="h-20 w-20 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded">
                                    <DocumentIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                                </div>
                            )}
                            <button
                                onClick={() => removeAttachment(attachment.id)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Message Input */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                        className="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                        <FaceSmileIcon className="h-6 w-6" />
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                        <PhotoIcon className="h-6 w-6" />
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleTyping}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() && attachments.length === 0}
                        className={`p-2 rounded-lg ${
                            newMessage.trim() || attachments.length > 0
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                        }`}
                    >
                        <PaperAirplaneIcon className="h-6 w-6 transform rotate-90" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
