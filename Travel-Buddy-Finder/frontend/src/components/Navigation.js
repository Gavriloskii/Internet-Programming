import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { selectNotifications, selectHasUnread, markAsRead, markAllAsRead } from '../redux/notificationsSlice';
import { selectTotalUnreadCount } from '../redux/chatSlice';
import {
    HomeIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    BookOpenIcon,
    BellIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    ShoppingBagIcon,
    CalendarIcon,
    ChatBubbleOvalLeftEllipsisIcon,
    MapIcon,
} from '@heroicons/react/24/outline';
import {
    HomeIcon as HomeIconSolid,
    UserIcon as UserIconSolid,
    ChatBubbleLeftRightIcon as ChatIconSolid,
    BookOpenIcon as BookIconSolid,
    ShoppingBagIcon as ShoppingBagIconSolid,
    CalendarIcon as CalendarIconSolid,
    ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisIconSolid,
    MapIcon as MapIconSolid,
} from '@heroicons/react/24/solid';
import { logout, selectUser } from '../redux/userSlice';

const Navigation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const notifications = useSelector(selectNotifications);
    const hasUnread = useSelector(selectHasUnread);
    const unreadMessageCount = useSelector(selectTotalUnreadCount);

    const navigationItems = [
        {
            path: '/app/swipe',
            label: 'Home',
            icon: HomeIcon,
            activeIcon: HomeIconSolid,
        },
        {
            path: '/app/profile',
            label: 'Profile',
            icon: UserIcon,
            activeIcon: UserIconSolid,
        },
        {
            path: '/app/messages',
            label: 'Messages',
            icon: ChatBubbleLeftRightIcon,
            activeIcon: ChatIconSolid,
            badge: unreadMessageCount,
        },
        {
            path: '/app/marketplace',
            label: 'Marketplace',
            icon: ShoppingBagIcon,
            activeIcon: ShoppingBagIconSolid,
        },
        {
            path: '/app/events',
            label: 'Events',
            icon: CalendarIcon,
            activeIcon: CalendarIconSolid,
        },
        {
            path: '/app/forum',
            label: 'Forum',
            icon: ChatBubbleOvalLeftEllipsisIcon,
            activeIcon: ChatBubbleOvalLeftEllipsisIconSolid,
        },
        {
            path: '/app/itinerary',
            label: 'Itinerary',
            icon: MapIcon,
            activeIcon: MapIconSolid,
        },
        {
            path: '/app/journal',
            label: 'Journal',
            icon: BookOpenIcon,
            activeIcon: BookIconSolid,
        },
    ];

    const handleLogout = async () => {
        try {
            // TODO: Implement logout API call
            dispatch(logout());
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        dispatch(markAsRead(notification.id));
        
        // Navigate based on notification type
        switch (notification.type) {
            case 'match':
                // Close notifications dropdown
                setShowNotifications(false);
                // Navigate to the new match's conversation
                if (notification.data?.conversation) {
                    navigate(`/app/messages/${notification.data.conversation.id}`);
                }
                break;
            case 'message':
                // Close notifications dropdown
                setShowNotifications(false);
                // Navigate to the conversation
                if (notification.data?.conversationId) {
                    navigate(`/app/messages/${notification.data.conversationId}`);
                }
                break;
            default:
                break;
        }
    };

    const handleMarkAllAsRead = () => {
        dispatch(markAllAsRead());
    };

    return (
        <>
            {/* Top Navigation Bar */}
            <nav className="bg-white dark:bg-gray-800 shadow-sm fixed top-0 left-0 right-0 z-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/app/swipe" className="flex-shrink-0 flex items-center">
                                <GlobeIcon className="h-8 w-8 text-blue-500" />
                                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                                    Travel Buddy
                                </span>
                            </Link>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white relative"
                                >
                                    <BellIcon className="h-6 w-6" />
                                    {hasUnread && (
                                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showNotifications && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 ring-1 ring-black ring-opacity-5"
                                        >
                                            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    Notifications
                                                </h3>
                                                {hasUnread && (
                                                    <button
                                                        onClick={handleMarkAllAsRead}
                                                        className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        Mark all as read
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-96 overflow-y-auto">
                                                {notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        onClick={() => handleNotificationClick(notification)}
                                                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                                                            notification.unread ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                        }`}
                                                    >
                                                        <p className="text-sm text-gray-900 dark:text-white">
                                                            {notification.content}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {notification.time}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center space-x-2"
                                >
                                    <img
                                        src={user?.image || 'https://via.placeholder.com/40'}
                                        alt={user?.name}
                                        className="h-8 w-8 rounded-full"
                                    />
                                    <span className="hidden md:block text-sm font-medium text-gray-900 dark:text-white">
                                        {user?.name}
                                    </span>
                                </button>

                                <AnimatePresence>
                                    {showUserMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 ring-1 ring-black ring-opacity-5"
                                        >
                                            <Link
                                                to="/settings"
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                                                Settings
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                                                Logout
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Bottom Navigation Bar (Mobile) */}
            <nav className="bg-white dark:bg-gray-800 shadow-lg fixed bottom-0 left-0 right-0 z-50 md:hidden">
                <div className="flex justify-around">
                    {navigationItems.map((item) => {
                        const Icon = location.pathname === item.path ? item.activeIcon : item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center py-2 px-3 ${
                                    location.pathname === item.path
                                        ? 'text-blue-500'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                <div className="relative">
                                    <Icon className="h-6 w-6" />
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1 -right-1 h-4 w-4 text-xs flex items-center justify-center bg-red-500 text-white rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs mt-1">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Side Navigation (Desktop) */}
            <nav className="hidden md:flex flex-col fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                <div className="flex-1 py-6 space-y-1">
                    {navigationItems.map((item) => {
                        const Icon = location.pathname === item.path ? item.activeIcon : item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center px-6 py-3 text-sm font-medium ${
                                    location.pathname === item.path
                                        ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                <div className="relative">
                                    <Icon className="h-6 w-6 mr-3" />
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1 -right-1 h-4 w-4 text-xs flex items-center justify-center bg-red-500 text-white rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="pt-16 pb-16 md:pb-0 md:pl-64">
                {/* Your page content goes here */}
            </main>
        </>
    );
};

const GlobeIcon = ({ className }) => (
    <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

export default Navigation;
