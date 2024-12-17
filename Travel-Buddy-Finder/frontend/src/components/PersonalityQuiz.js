import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { updateProfile } from '../redux/userSlice';

const questions = [
    {
        id: 1,
        question: 'What type of traveler are you?',
        options: [
            { value: 'adventurer', label: 'Adventure Seeker' },
            { value: 'culture', label: 'Culture Explorer' },
            { value: 'relaxation', label: 'Relaxation Enthusiast' },
            { value: 'foodie', label: 'Food & Culinary Explorer' }
        ]
    },
    {
        id: 2,
        question: 'What\'s your preferred travel pace?',
        options: [
            { value: 'fast', label: 'Fast-paced, see everything' },
            { value: 'moderate', label: 'Balanced mix of activities' },
            { value: 'slow', label: 'Slow and immersive' },
            { value: 'flexible', label: 'Depends on the destination' }
        ]
    },
    {
        id: 3,
        question: 'How do you prefer to plan your trips?',
        options: [
            { value: 'detailed', label: 'Detailed itinerary planned in advance' },
            { value: 'flexible', label: 'Rough plan with room for spontaneity' },
            { value: 'spontaneous', label: 'Go with the flow' },
            { value: 'mixed', label: 'Mix of planned and spontaneous' }
        ]
    },
    {
        id: 4,
        question: 'What\'s your accommodation preference?',
        options: [
            { value: 'luxury', label: 'Luxury hotels and resorts' },
            { value: 'midrange', label: 'Mid-range hotels' },
            { value: 'budget', label: 'Hostels and budget accommodations' },
            { value: 'local', label: 'Local stays and homestays' }
        ]
    },
    {
        id: 5,
        question: 'What\'s your ideal group size for travel?',
        options: [
            { value: 'solo', label: 'Solo travel' },
            { value: 'small', label: 'Small group (2-4 people)' },
            { value: 'medium', label: 'Medium group (5-8 people)' },
            { value: 'large', label: 'Large group (8+ people)' }
        ]
    }
];

const PersonalityQuiz = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleAnswer = (value) => {
        setAnswers(prev => ({
            ...prev,
            [questions[currentQuestion].id]: value
        }));

        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Convert answers to travel preferences
            const preferences = {
                travelStyle: answers[1],
                travelPace: answers[2],
                planningStyle: answers[3],
                accommodation: answers[4],
                groupSize: answers[5]
            };

            // Update user profile with preferences
            await dispatch(updateProfile({ travelPreferences: preferences }));

            // Navigate to the main app
            navigate('/app/swipe');
        } catch (error) {
            console.error('Failed to save preferences:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <motion.div
                            className="h-full bg-blue-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                        Question {currentQuestion + 1} of {questions.length}
                    </p>
                </div>

                {/* Question Card */}
                <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8"
                >
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        {questions[currentQuestion].question}
                    </h2>

                    <div className="space-y-4">
                        {questions[currentQuestion].options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleAnswer(option.value)}
                                className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                                    answers[questions[currentQuestion].id] === option.value
                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                                }`}
                            >
                                <span className="text-gray-900 dark:text-white font-medium">
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {currentQuestion === questions.length - 1 && (
                        <div className="mt-8">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !answers[questions[currentQuestion].id]}
                                className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                                    isSubmitting || !answers[questions[currentQuestion].id]
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {isSubmitting ? 'Saving...' : 'Complete Quiz'}
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Skip Option */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/app/swipe')}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonalityQuiz;
