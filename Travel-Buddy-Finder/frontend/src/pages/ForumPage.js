import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatBubbleLeftIcon, HeartIcon, BookmarkIcon, ShareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';

const ForumPage = () => {
    const [posts, setPosts] = useState([
        {
            id: 1,
            title: 'Best Time to Visit Southeast Asia?',
            content: 'Planning a 3-month backpacking trip through Southeast Asia. When is the best time to visit considering weather and festivals?',
            author: {
                name: 'Sarah Chen',
                avatar: 'https://via.placeholder.com/40',
                reputation: 856
            },
            category: 'Trip Planning',
            tags: ['Southeast Asia', 'Backpacking', 'Weather'],
            stats: {
                likes: 24,
                comments: 15,
                views: 342
            },
            timestamp: '2 hours ago',
            isLiked: false,
            isBookmarked: false
        },
        {
            id: 2,
            title: 'Solo Female Travel Safety Tips',
            content: 'Experienced solo female travelers, what are your top safety tips for traveling alone? Share your experiences and advice!',
            author: {
                name: 'Emma Wilson',
                avatar: 'https://via.placeholder.com/40',
                reputation: 1243
            },
            category: 'Safety',
            tags: ['Solo Travel', 'Female Travelers', 'Safety Tips'],
            stats: {
                likes: 56,
                comments: 32,
                views: 891
            },
            timestamp: '5 hours ago',
            isLiked: true,
            isBookmarked: true
        }
    ]);

    const categories = [
        'All Topics',
        'Trip Planning',
        'Safety',
        'Budget Travel',
        'Adventure',
        'Cultural Exchange',
        'Travel Tech',
        'Food & Cuisine'
    ];

    const [selectedCategory, setSelectedCategory] = useState('All Topics');
    const [sortBy, setSortBy] = useState('recent');

    const handleLike = (postId) => {
        setPosts(posts.map(post => {
            if (post.id === postId) {
                const newLikeStatus = !post.isLiked;
                return {
                    ...post,
                    isLiked: newLikeStatus,
                    stats: {
                        ...post.stats,
                        likes: post.stats.likes + (newLikeStatus ? 1 : -1)
                    }
                };
            }
            return post;
        }));
    };

    const handleBookmark = (postId) => {
        setPosts(posts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    isBookmarked: !post.isBookmarked
                };
            }
            return post;
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Travel Community Forum
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Connect, share experiences, and get travel advice
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                + New Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Categories and Filters */}
                <div className="mb-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium ${
                                    selectedCategory === category
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                        >
                            <option value="recent">Most Recent</option>
                            <option value="popular">Most Popular</option>
                            <option value="commented">Most Commented</option>
                        </select>
                    </div>
                </div>

                {/* Posts */}
                <div className="space-y-6">
                    {posts.map((post) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                        >
                            <div className="flex items-start space-x-4">
                                <img
                                    src={post.author.avatar}
                                    alt={post.author.name}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        {post.title}
                                    </h3>
                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        <span>{post.author.name}</span>
                                        <span className="mx-2">•</span>
                                        <span>{post.timestamp}</span>
                                        <span className="mx-2">•</span>
                                        <span>{post.category}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                                        {post.content}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {post.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-6">
                                            <button
                                                onClick={() => handleLike(post.id)}
                                                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                            >
                                                {post.isLiked ? (
                                                    <HeartIconSolid className="h-5 w-5 text-red-500" />
                                                ) : (
                                                    <HeartIcon className="h-5 w-5" />
                                                )}
                                                <span>{post.stats.likes}</span>
                                            </button>
                                            <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                <ChatBubbleLeftIcon className="h-5 w-5" />
                                                <span>{post.stats.comments}</span>
                                            </button>
                                            <button
                                                onClick={() => handleBookmark(post.id)}
                                                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                            >
                                                {post.isBookmarked ? (
                                                    <BookmarkIconSolid className="h-5 w-5 text-blue-500" />
                                                ) : (
                                                    <BookmarkIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                            <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                <ShareIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {post.stats.views} views
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ForumPage;
