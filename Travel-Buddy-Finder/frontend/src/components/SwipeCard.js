import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, useAnimation } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import {
    MapPinIcon,
    GlobeAltIcon,
    HeartIcon,
    XMarkIcon,
    ChevronUpIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
import './SwipeCard.css';

const SwipeCard = ({ user, isTop, onSwipe, style, analytics = { track: () => {} } }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [swipeStartTime, setSwipeStartTime] = useState(null);
    const cardRef = useRef(null);
    const controls = useAnimation();
    const hapticTimeout = useRef(null);

    // Enhanced spring physics optimized for mobile and desktop
    const springConfig = {
        stiffness: window.innerWidth <= 768 ? 250 : 300,    // Adjusted for device
        damping: window.innerWidth <= 768 ? 25 : 30,        // Smoother on mobile
        mass: 0.8,          // Lighter mass for better responsiveness
        restDelta: 0.0005,  // More precise rest position
        restSpeed: 0.0005,  // More precise rest speed
        bounce: 0.2,        // Subtle bounce for natural feel
        duration: 0.35      // Faster for better responsiveness
    };

    const x = useSpring(0, springConfig);
    const y = useSpring(0, springConfig);
    const scaleSpring = useSpring(1, {
        ...springConfig,
        stiffness: 900,
        damping: 35
    });

    // Enhanced transform values with dynamic interpolation
    const rotate = useTransform(x, [-300, -150, 0, 150, 300], [-60, -30, 0, 30, 60], {
        clamp: true,
        ease: [0.32, 0.72, 0, 1]
    });
    
    const likeOpacity = useTransform(x, [0, 50, 100, 150], [0, 0.3, 0.7, 1], {
        clamp: true,
        ease: [0.34, 1.56, 0.64, 1]
    });
    
    const nopeOpacity = useTransform(x, [-150, -100, -50, 0], [1, 0.7, 0.3, 0], {
        clamp: true,
        ease: [0.34, 1.56, 0.64, 1]
    });

    const cardOpacity = useTransform(Math.abs(x), [0, 100, 300], [1, 0.9, 0.5], {
        clamp: true,
        ease: [0.32, 0.72, 0, 1]
    });

    // Optimized constants for responsive swipe interactions
    const SWIPE_THRESHOLD = window.innerWidth <= 768 ? 60 : 80;  // Adjusted for screen size
    const SWIPE_VELOCITY_THRESHOLD = 0.4;  // More forgiving velocity threshold
    const ROTATION_FACTOR = window.innerWidth <= 768 ? 0.12 : 0.15;  // Adjusted rotation
    const HAPTIC_THRESHOLD = 3;            // Earlier haptic feedback
    const DRAG_ELASTIC = window.innerWidth <= 768 ? 0.7 : 0.6;   // More elastic on mobile
    const SCALE_FACTOR = window.innerWidth <= 768 ? 0.97 : 0.95; // Subtle scale on mobile
    const VELOCITY_SCALE = window.innerWidth <= 768 ? 2.5 : 3;   // Adjusted for device
    const ROTATION_SPRING = {              // Enhanced rotation spring physics
        stiffness: 350,
        damping: 35,
        mass: 0.8,
        bounce: 0.2
    };

    // Cleanup haptic timeout on unmount
    useEffect(() => {
        return () => {
            if (hapticTimeout.current) {
                clearTimeout(hapticTimeout.current);
            }
        };
    }, []);

    const toggleDetails = useCallback((e) => {
        if (e) e.stopPropagation();
        setShowDetails(prev => !prev);
    }, []);

    // Enhanced keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!isTop) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                onSwipe('left');
                break;
            case 'ArrowRight':
                onSwipe('right');
                break;
            case 'ArrowUp':
            case 'ArrowDown':
            case 'Enter':
                toggleDetails();
                break;
            default:
                break;
        }
    }, [isTop, onSwipe, toggleDetails]);

    useEffect(() => {
        if (isTop) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isTop, handleKeyDown]);

    // Optimized gesture handling with device-specific enhancements
    const bind = useGesture({
        onDragStart: ({ event }) => {
            event?.preventDefault();
            setSwipeStartTime(Date.now());
            
            // Device-optimized initial animation
            controls.start({
                scale: SCALE_FACTOR,
                transition: { 
                    type: 'spring',
                    stiffness: window.innerWidth <= 768 ? 350 : 400,
                    damping: window.innerWidth <= 768 ? 20 : 25,
                    mass: 0.7,
                    duration: 0.12,
                    ease: [0.32, 1.48, 0.62, 1]
                }
            });

            // Enhanced haptic feedback pattern
            if (window.navigator.vibrate) {
                window.navigator.vibrate([5, 8]); // Even more subtle initial feedback
            }

            // Reset any ongoing animations with smooth transitions
            x.set(x.get(), false);
            y.set(y.get(), false);
            rotate.set(rotate.get(), false);
        },
        onDrag: ({ movement: [mx, my], down, velocity: [vx, vy], direction: [xDir], event, delta: [dx, dy] }) => {
            event?.preventDefault();

            // Enhanced swipe metrics calculation
            const velocity = Math.sqrt(vx * vx + vy * vy);
            const isTriggered = velocity > SWIPE_VELOCITY_THRESHOLD;
            const swipeDistance = Math.abs(mx);
            const swipeProgress = Math.min(swipeDistance / SWIPE_THRESHOLD, 1);
            const deltaDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Optimized haptic feedback with debouncing
            if (down && !hapticTimeout.current && swipeDistance >= HAPTIC_THRESHOLD && window.navigator.vibrate) {
                const intensity = Math.min(Math.floor(swipeProgress * 15), 25);
                window.navigator.vibrate(intensity);
                hapticTimeout.current = setTimeout(() => {
                    hapticTimeout.current = null;
                }, 150); // Increased debounce time
            }

            if (down && deltaDistance > 0) {
                // Enhanced motion calculations with improved physics
                const resistance = Math.min(swipeDistance / 400, 0.5);
                const elasticX = mx * (1 - resistance) * DRAG_ELASTIC;
                const elasticY = my * (1 - resistance) * DRAG_ELASTIC * 0.3; // Reduced vertical movement
                const rotationAngle = (elasticX * ROTATION_FACTOR) * Math.min(1, swipeDistance / 200);
                const scaleValue = Math.max(SCALE_FACTOR, 1 - (swipeProgress * 0.15));

                // Add momentum-based rotation
                const velocityRotation = vx * 0.05;
                const finalRotation = rotationAngle + velocityRotation;

                // Optimized motion updates with enhanced animation frames
                requestAnimationFrame(() => {
                    x.set(elasticX, false);
                    y.set(elasticY, false);
                    rotate.set(finalRotation, false, ROTATION_SPRING);
                    scaleSpring.set(scaleValue, false);

                    // Combine velocity and movement-based perspective tilt
                    const tiltX = ((vy / 2) + (dy / window.innerHeight)) * 15;
                    const tiltY = (-(vx / 2) - (dx / window.innerWidth)) * 15;
                    cardRef.current.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
                });

                // Enhanced indicator animations with smoother transitions
                const normalizedX = elasticX / 200; // Reduced threshold for earlier feedback
                const indicatorOpacity = Math.min(Math.abs(normalizedX) * 3, 1);
                const indicatorScale = 0.8 + (indicatorOpacity * 0.3);
                
                if (normalizedX > 0) {
                    likeOpacity.set(indicatorOpacity);
                    nopeOpacity.set(0);
                    const indicator = document.querySelector('.like-indicator');
                    if (indicator) {
                        indicator.classList.add('visible');
                        indicator.style.transform = `rotate(-30deg) scale(${indicatorScale}) translateZ(${20 + indicatorOpacity * 10}px)`;
                    }
                    document.querySelector('.dislike-indicator')?.classList.remove('visible');
                } else {
                    likeOpacity.set(0);
                    nopeOpacity.set(indicatorOpacity);
                    const indicator = document.querySelector('.dislike-indicator');
                    if (indicator) {
                        indicator.classList.add('visible');
                        indicator.style.transform = `rotate(30deg) scale(${indicatorScale}) translateZ(${20 + indicatorOpacity * 10}px)`;
                    }
                    document.querySelector('.like-indicator')?.classList.remove('visible');
                }
            } else {
                // Enhanced swipe release handling with improved animations
                if (isTriggered && swipeDistance >= SWIPE_THRESHOLD) {
                    const direction = xDir < 0 ? 'left' : 'right';
                    const exitDistance = direction === 'left' ? -window.innerWidth * 2 : window.innerWidth * 2;
                    const exitVelocity = Math.min(Math.max(Math.abs(vx) * VELOCITY_SCALE, 2.5), 5);
                    const exitY = my + (vy * 100); // Further reduced vertical exit movement
                    const exitRotation = direction === 'left' ? -90 : 90;
                    
                            // Enhanced exit animation sequence with spring physics
                            const sequence = async () => {
                                // Initial pop effect with spring
                                await controls.start({
                                    scale: 1.15,
                                    transition: { 
                                        type: 'spring',
                                        stiffness: 500,
                                        damping: 15,
                                        mass: 0.6,
                                        duration: 0.15
                                    }
                                });

                                // Main exit animation with enhanced spring physics
                                await Promise.all([
                                    controls.start({
                                        x: exitDistance,
                                        y: exitY,
                                        rotate: exitRotation,
                                        scale: 0.5,
                                        opacity: 0,
                                        transition: {
                                            type: 'spring',
                                            stiffness: 150,
                                            damping: 20,
                                            mass: 0.8,
                                            velocity: exitVelocity * 2,
                                            restSpeed: 0.001,
                                            restDelta: 0.001,
                                            duration: 0.6 / exitVelocity,
                                            opacity: { 
                                                duration: 0.2,
                                                ease: [0.32, 0.72, 0, 1]
                                            },
                                            scale: {
                                                duration: 0.5 / exitVelocity,
                                                ease: [0.34, 1.56, 0.64, 1]
                                            }
                                        }
                                    }),
                            // Enhanced haptic feedback pattern for exit
                            window.navigator.vibrate?.([10, 25, 10])
                        ]);

                        // Reset transform style
                        if (cardRef.current) {
                            cardRef.current.style.transform = '';
                        }

                        // Track analytics with enhanced metrics
                        onSwipe(direction);
                        analytics.track('Swipe Complete', {
                            direction,
                            velocity: exitVelocity,
                            distance: swipeDistance,
                            duration: Date.now() - swipeStartTime,
                            exitRotation,
                            exitDistance,
                            swipeProgress,
                            finalVelocity: Math.sqrt(vx * vx + vy * vy)
                        });
                    };

                    sequence().catch(console.error);
                } else {
                    // Enhanced spring back animation with improved dynamics
                    const velocity = Math.max(Math.abs(vx), Math.abs(vy));
                    const springVelocity = velocity * VELOCITY_SCALE;
                    const springStiffness = Math.min(650 + (velocity * 80), 900);
                    
                    // Enhanced return animation sequence
                    const sequence = async () => {
                        // Improved bounce-back effect
                        if (swipeDistance > SWIPE_THRESHOLD / 2) {
                            await controls.start({
                                scale: 1.08,
                                transition: { 
                                    duration: 0.15,
                                    ease: [0.34, 1.56, 0.64, 1]
                                }
                            });
                            window.navigator.vibrate?.([5, 8]);
                        }

                        // Reset transform style
                        if (cardRef.current) {
                            cardRef.current.style.transform = '';
                        }

                        // Enhanced return animation with natural spring physics
                        await controls.start({
                            x: 0,
                            y: 0,
                            scale: 1,
                            rotate: 0,
                            transition: {
                                type: 'spring',
                                velocity: springVelocity,
                                stiffness: springStiffness,
                                damping: 45 + (velocity * 8),
                                mass: 0.8,
                                restDelta: 0.01,
                                restSpeed: 0.01,
                                bounce: 0.2
                            }
                        });
                    };

                    sequence().catch(console.error);
                }
            }
        },
        onWheel: ({ event }) => {
            event.preventDefault();
        }
    }, {
        drag: {
            from: () => [x.get(), y.get()],
            bounds: { left: -300, right: 300, top: -100, bottom: 100 },
            rubberband: true,
            filterTaps: true,
            preventDefault: true
        }
    });

    return (
        <motion.div
            ref={cardRef}
            {...bind()}
            style={{
                ...style,
                x,
                y,
                rotate,
                scale: scaleSpring,
                opacity: cardOpacity,
                cursor: isTop ? 'grab' : 'default',
                touchAction: 'none'
            }}
            animate={controls}
            initial={false}
            whileTap={{ cursor: 'grabbing' }}
            className="swipe-card-container"
            role="button"
            tabIndex={isTop ? 0 : -1}
            aria-label={`Profile card for ${user.name}`}
        >
            <div className="swipe-card">
                <div className="card-content">
                    {/* Profile Image */}
                    {imageError ? (
                        <div className="profile-photo-error">
                            <p>Failed to load image</p>
                        </div>
                    ) : !imageLoaded ? (
                        <div className="profile-photo-loading">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500"></div>
                        </div>
                    ) : null}
                    <img
                        src={user.profilePicture || '/default-avatar.png'}
                        alt={user.name}
                        className="profile-photo"
                        loading="eager"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => {
                            setImageError(true);
                            setImageLoaded(true);
                        }}
                        style={{ opacity: imageLoaded ? 1 : 0 }}
                    />

                    {/* Swipe Indicators */}
                    <motion.div
                        className="like-indicator"
                        style={{ opacity: likeOpacity }}
                        aria-hidden="true"
                    >
                        LIKE
                    </motion.div>
                    <motion.div
                        className="dislike-indicator"
                        style={{ opacity: nopeOpacity }}
                        aria-hidden="true"
                    >
                        NOPE
                    </motion.div>

                    {/* User Info */}
                    <div className="profile-info">
                        <h2 className="text-2xl font-bold mb-2">
                            {user.name}, {user.age}
                        </h2>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                                <MapPinIcon className="h-5 w-5 mr-1" />
                                <span>{user.location?.city}, {user.location?.country}</span>
                            </div>
                            <div className="flex items-center">
                                <GlobeAltIcon className="h-5 w-5 mr-1" />
                                <span>{user.travelStyle}</span>
                            </div>
                        </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <button
                        onClick={toggleDetails}
                        className="absolute bottom-4 right-4 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg"
                        aria-label={showDetails ? "Show less details" : "Show more details"}
                    >
                        {showDetails ? (
                            <ChevronDownIcon className="h-6 w-6" />
                        ) : (
                            <ChevronUpIcon className="h-6 w-6" />
                        )}
                    </button>
                </div>

                {/* Expanded Details Panel */}
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute inset-0 bg-white dark:bg-gray-800 p-6 overflow-y-auto"
                    >
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">About {user.name}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{user.bio}</p>
                            </div>

                            <div>
                                <h4 className="text-lg font-medium mb-2">Travel Preferences</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(user.travelPreferences || {}).map(([key, value]) => (
                                        <div key={key} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                            <p className="text-sm font-medium">{key}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {user.languages?.length > 0 && (
                                <div>
                                    <h4 className="text-lg font-medium mb-2">Languages</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {user.languages.map((lang, index) => (
                                            <span
                                                key={index}
                                                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                                            >
                                                {lang}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Action Buttons */}
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
