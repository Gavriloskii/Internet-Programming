import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
    MapPinIcon,
    GlobeAltIcon,
    HeartIcon,
    XMarkIcon,
    ChevronUpIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
import './SwipeCard.css';

const SwipeCard = ({ user, isTop, onSwipe, style }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [swipeDirection, setSwipeDirection] = useState(null);
    const cardRef = useRef(null);

    // Track card position for visual feedback
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-30, 30]);
    const likeOpacity = useTransform(x, [0, 100], [0, 1]);
    const rejectOpacity = useTransform(x, [-100, 0], [1, 0]);

    return (
        <motion.div
            ref={cardRef}
            className="swipe-card-container"
            drag={isTop}
            dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
            style={{
                x,
                rotate,
                ...style
            }}
            onDragStart={() => setSwipeDirection(null)}
            onDrag={(_, info) => {
                // Update swipe direction for visual feedback
                if (info.offset.x > 0) {
                    setSwipeDirection('right');
                } else if (info.offset.x < 0) {
                    setSwipeDirection('left');
                } else {
                    setSwipeDirection(null);
                }
            }}
            onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 100) {
                    const direction = info.offset.x > 0 ? 'right' : 'left';
                    console.log(`Swiped ${direction} on user:`, user.id);
                    onSwipe(direction);
                }
                setSwipeDirection(null);
            }}
            whileDrag={{ scale: 0.95 }}
            whileTap={{ cursor: 'grabbing' }}
        >
            <div className={`card-content ${swipeDirection === 'right' ? 'swipe-right' : swipeDirection === 'left' ? 'swipe-left' : ''}`}>
                <div className="swipe-overlay">
                    <motion.div className="like-overlay" style={{ opacity: likeOpacity }}>
                        <HeartIcon className="h-24 w-24 text-green-500" />
                    </motion.div>
                    <motion.div className="reject-overlay" style={{ opacity: rejectOpacity }}>
                        <XMarkIcon className="h-24 w-24 text-red-500" />
                    </motion.div>
                </div>
                {imageError ? (
                    <div className="profile-photo-error">
                        <p>Failed to load image</p>
                    </div>
                ) : !imageLoaded ? (
                    <div className="profile-photo-loading">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500" />
                    </div>
                ) : null}
                
                <img
                    src={user.profilePicture || '/default-avatar.png'}
                    alt={user.name}
                    className="profile-photo"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                        setImageError(true);
                        setImageLoaded(true);
                    }}
                />

                <div className="profile-info">
                    <h2 className="text-2xl font-bold mb-2">
                        {user.name}, {user.age}
                    </h2>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <MapPinIcon className="h-5 w-5 mr-1" />
                            <span>{user.location?.city}</span>
                        </div>
                        <div className="flex items-center">
                            <GlobeAltIcon className="h-5 w-5 mr-1" />
                            <span>{user.travelStyle}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="absolute bottom-4 right-4 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg"
                >
                    {showDetails ? (
                        <ChevronDownIcon className="h-6 w-6" />
                    ) : (
                        <ChevronUpIcon className="h-6 w-6" />
                    )}
                </button>

                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute inset-0 bg-white dark:bg-gray-800 p-6"
                    >
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">About {user.name}</h3>
                            <p>{user.bio}</p>
                            {user.languages?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {user.languages.map((lang, i) => (
                                        <span key={i} className="bg-blue-100 px-3 py-1 rounded-full">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            {isTop && (
                <div className="swipe-buttons">
                    <button
                        onClick={() => onSwipe('left')}
                        className="swipe-button"
                        aria-label="Dislike"
                    >
                        <XMarkIcon className="h-8 w-8 text-red-500" />
                    </button>
                    <button
                        onClick={() => onSwipe('right')}
                        className="swipe-button"
                        aria-label="Like"
                    >
                        <HeartIcon className="h-8 w-8 text-green-500" />
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default SwipeCard;
