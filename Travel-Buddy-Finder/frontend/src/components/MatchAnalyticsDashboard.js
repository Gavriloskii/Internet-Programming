import React, { useState, useEffect } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { api } from '../services/api';
import { useSelector } from 'react-redux';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const MatchAnalyticsDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [timeRange, setTimeRange] = useState('24h');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const user = useSelector(state => state.user);
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchAnalytics();
        // Set up real-time updates every 5 minutes
        const interval = setInterval(fetchAnalytics, 300000);
        return () => clearInterval(interval);
    }, [timeRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = isAdmin
                ? await api.get('/analytics/system')
                : await api.get(`/analytics/user/${user.id}`);

            if (response.data.status === 'success') {
                setAnalytics(response.data.data);
                setError(null);
            }
        } catch (err) {
            setError('Failed to load analytics data');
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const matchScoreData = {
        labels: analytics?.matchQuality?.scoreDistribution
            ? Object.keys(analytics.matchQuality.scoreDistribution)
            : [],
        datasets: [{
            label: 'Match Score Distribution',
            data: analytics?.matchQuality?.scoreDistribution
                ? Object.values(analytics.matchQuality.scoreDistribution)
                : [],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };

    const interactionData = {
        labels: analytics?.interactions
            ? Object.keys(analytics.interactions)
            : [],
        datasets: [{
            label: 'User Interactions',
            data: analytics?.interactions
                ? Object.values(analytics.interactions)
                : [],
            backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 1
        }]
    };

    const responseTimeData = {
        labels: ['Average', 'Minimum', 'Maximum'],
        datasets: [{
            label: 'Response Times (ms)',
            data: analytics?.responseTimes
                ? [
                    analytics.responseTimes.average,
                    analytics.responseTimes.min,
                    analytics.responseTimes.max
                ]
                : [],
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-500 text-center">
                    <p className="text-xl font-bold mb-2">Error</p>
                    <p>{error}</p>
                    <button
                        onClick={fetchAnalytics}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Match Analytics Dashboard
                </h1>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Match Score Distribution */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                        Match Score Distribution
                    </h2>
                    <Bar
                        data={matchScoreData}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                title: {
                                    display: false
                                }
                            }
                        }}
                    />
                </div>

                {/* User Interactions */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                        User Interactions
                    </h2>
                    <Pie
                        data={interactionData}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'top',
                                }
                            }
                        }}
                    />
                </div>

                {/* Response Times */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                        Response Times
                    </h2>
                    <Line
                        data={responseTimeData}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'top',
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }}
                    />
                </div>

                {/* Key Metrics */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                        Key Metrics
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                            <p className="text-sm text-blue-600 dark:text-blue-200">Average Match Score</p>
                            <p className="text-2xl font-bold text-blue-800 dark:text-blue-100">
                                {analytics?.matchQuality?.averageScores?.overall?.toFixed(1) || 'N/A'}
                            </p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-200">Match Success Rate</p>
                            <p className="text-2xl font-bold text-green-800 dark:text-green-100">
                                {analytics?.matchQuality?.successRate?.toFixed(1)}%
                            </p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                            <p className="text-sm text-purple-600 dark:text-purple-200">Total Matches</p>
                            <p className="text-2xl font-bold text-purple-800 dark:text-purple-100">
                                {analytics?.matchQuality?.matchCount || 0}
                            </p>
                        </div>
                        <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
                            <p className="text-sm text-orange-600 dark:text-orange-200">Avg Response Time</p>
                            <p className="text-2xl font-bold text-orange-800 dark:text-orange-100">
                                {analytics?.responseTimes?.average?.toFixed(0) || 0}ms
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {isAdmin && (
                <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                        System Health
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">Cache Hit Rate</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {analytics?.system?.cacheHitRate?.toFixed(1)}%
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">API Response Time</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {analytics?.system?.apiResponseTime?.toFixed(0)}ms
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">Error Rate</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {analytics?.system?.errorRate?.toFixed(2)}%
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">ML Model Accuracy</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {analytics?.system?.mlAccuracy?.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchAnalyticsDashboard;
