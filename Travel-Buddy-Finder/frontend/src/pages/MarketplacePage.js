import React, { useState } from 'react';
import { motion } from 'framer-motion';

const MarketplacePage = () => {
    const [listings, setListings] = useState([
        {
            id: 1,
            title: 'Hiking Backpack',
            description: 'Lightly used 65L hiking backpack, perfect for long treks',
            price: 89.99,
            condition: 'Used - Like New',
            location: 'Seattle, WA',
            image: 'https://via.placeholder.com/300x200',
            seller: {
                name: 'John D.',
                rating: 4.8
            }
        },
        {
            id: 2,
            title: 'Travel Camera',
            description: 'Professional mirrorless camera, great for travel photography',
            price: 599.99,
            condition: 'Used - Excellent',
            location: 'Portland, OR',
            image: 'https://via.placeholder.com/300x200',
            seller: {
                name: 'Sarah M.',
                rating: 4.9
            }
        }
    ]);

    const categories = [
        'All Items',
        'Camping Gear',
        'Travel Accessories',
        'Photography',
        'Clothing',
        'Electronics',
        'Books & Guides'
    ];

    const [selectedCategory, setSelectedCategory] = useState('All Items');
    const [sortBy, setSortBy] = useState('newest');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Travel Marketplace
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Buy and sell travel gear with fellow adventurers
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                + List an Item
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
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
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                    >
                        <option value="newest">Newest First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Seller Rating</option>
                    </select>
                </div>

                {/* Listings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((listing) => (
                        <motion.div
                            key={listing.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                        >
                            <img
                                src={listing.image}
                                alt={listing.title}
                                className="w-full h-48 object-cover"
                            />
                            <div className="p-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    {listing.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                                    {listing.description}
                                </p>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        ${listing.price}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {listing.condition}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {listing.seller.name} • ⭐ {listing.seller.rating}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {listing.location}
                                    </span>
                                </div>
                            </div>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700">
                                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                    Contact Seller
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MarketplacePage;
