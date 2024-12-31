import React, { useState, useEffect } from 'react';
import {
    LightBulbIcon,
    ChartBarIcon,
    ExclamationCircleIcon,
    CheckCircleIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

const PerformanceAdvisor = ({ performanceData }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        if (performanceData) {
            analyzePerfData(performanceData);
        }
    }, [performanceData]);

    const analyzePerfData = (data) => {
        setLoading(true);
        const newSuggestions = [];

        // Analyze System Resources
        if (data.systemMetrics) {
            const latestMetrics = data.systemMetrics[data.systemMetrics.length - 1];
            if (latestMetrics.cpu > 0.7) {
                newSuggestions.push({
                    category: 'system',
                    priority: 'high',
                    title: 'High CPU Usage Detected',
                    description: 'Consider implementing request throttling or scaling the service horizontally.',
                    metrics: `Current CPU usage: ${(latestMetrics.cpu * 100).toFixed(1)}%`,
                    action: 'Scale Resources',
                    impact: 'Critical'
                });
            }

            const memoryUsage = latestMetrics.memory.heapUsed / latestMetrics.memory.heapTotal;
            if (memoryUsage > 0.85) {
                newSuggestions.push({
                    category: 'system',
                    priority: 'high',
                    title: 'Memory Usage Near Capacity',
                    description: 'Implement memory optimization or increase available memory.',
                    metrics: `Memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
                    action: 'Optimize Memory',
                    impact: 'Critical'
                });
            }
        }

        // Analyze Match Performance
        if (data.matchMetrics) {
            const avgDuration = data.matchMetrics.reduce((acc, m) => acc + m.duration, 0) / data.matchMetrics.length;
            if (avgDuration > 100) {
                newSuggestions.push({
                    category: 'matching',
                    priority: 'medium',
                    title: 'Slow Match Calculations',
                    description: 'Optimize match algorithm or implement caching for intermediate results.',
                    metrics: `Average duration: ${avgDuration.toFixed(1)}ms`,
                    action: 'Optimize Algorithm',
                    impact: 'Moderate'
                });
            }
        }

        // Analyze Cache Performance
        if (data.cacheMetrics) {
            const latestCache = data.cacheMetrics[data.cacheMetrics.length - 1];
            if (latestCache.hitRate < 0.7) {
                newSuggestions.push({
                    category: 'cache',
                    priority: 'medium',
                    title: 'Low Cache Hit Rate',
                    description: 'Review cache strategy and consider preloading frequently accessed data.',
                    metrics: `Current hit rate: ${(latestCache.hitRate * 100).toFixed(1)}%`,
                    action: 'Optimize Caching',
                    impact: 'Moderate'
                });
            }
        }

        // Analyze API Performance
        if (data.apiMetrics) {
            const slowEndpoints = data.apiMetrics.filter(m => m.duration > 200);
            if (slowEndpoints.length > 0) {
                newSuggestions.push({
                    category: 'api',
                    priority: 'high',
                    title: 'Slow API Endpoints Detected',
                    description: 'Optimize database queries and implement response caching.',
                    metrics: `${slowEndpoints.length} endpoints exceeding 200ms`,
                    action: 'Optimize Endpoints',
                    impact: 'High'
                });
            }
        }

        // Add ML-based matching optimization suggestions
        if (data.matchQualityMetrics) {
            const qualityScore = parseFloat(data.matchQualityMetrics[0].value);
            if (qualityScore < 85) {
                newSuggestions.push({
                    category: 'matching',
                    priority: 'medium',
                    title: 'Match Quality Below Target',
                    description: 'Fine-tune matching algorithm parameters and expand feature set.',
                    metrics: `Current quality score: ${qualityScore}%`,
                    action: 'Tune Algorithm',
                    impact: 'Moderate'
                });
            }
        }

        setSuggestions(newSuggestions);
        setLoading(false);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'text-red-500 dark:text-red-400';
            case 'medium':
                return 'text-yellow-500 dark:text-yellow-400';
            default:
                return 'text-blue-500 dark:text-blue-400';
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'system':
                return <ChartBarIcon className="h-6 w-6" />;
            case 'matching':
                return <ArrowTrendingUpIcon className="h-6 w-6" />;
            case 'cache':
                return <LightBulbIcon className="h-6 w-6" />;
            case 'api':
                return <ExclamationCircleIcon className="h-6 w-6" />;
            default:
                return <CheckCircleIcon className="h-6 w-6" />;
        }
    };

    const filteredSuggestions = selectedCategory === 'all' 
        ? suggestions 
        : suggestions.filter(s => s.category === selectedCategory);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    Performance Advisor
                </h2>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="all">All Categories</option>
                    <option value="system">System Resources</option>
                    <option value="matching">Matching System</option>
                    <option value="cache">Cache Performance</option>
                    <option value="api">API Performance</option>
                </select>
            </div>

            {filteredSuggestions.length === 0 ? (
                <div className="text-center py-8">
                    <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">
                        No performance issues detected
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSuggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                        >
                            <div className="flex items-start">
                                <div className={`flex-shrink-0 ${getPriorityColor(suggestion.priority)}`}>
                                    {getCategoryIcon(suggestion.category)}
                                </div>
                                <div className="ml-4 flex-1">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                        {suggestion.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                                        {suggestion.description}
                                    </p>
                                    <div className="mt-2 flex items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {suggestion.metrics}
                                        </span>
                                        <span className="mx-2">•</span>
                                        <span className={`font-medium ${getPriorityColor(suggestion.priority)}`}>
                                            {suggestion.impact} Impact
                                        </span>
                                    </div>
                                    <button
                                        className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                        onClick={() => {
                                            // Implement action handler
                                            console.log(`Implementing: ${suggestion.action}`);
                                        }}
                                    >
                                        {suggestion.action}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PerformanceAdvisor;
