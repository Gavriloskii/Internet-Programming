import React, { useState, useEffect } from 'react';
import {
    Line,
    Bar,
    Radar,
    Scatter,
    HeatMap
} from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import { api } from '../services/api';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const AdvancedMetrics = ({ timeRange }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('matching');

    useEffect(() => {
        fetchMetrics();
    }, [timeRange]);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/analytics/advanced-metrics?timeRange=${timeRange}`);
            if (response.data.status === 'success') {
                setMetrics(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching advanced metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const matchingPatternData = {
        labels: metrics?.matchingPatterns?.map(p => p.timeSlot) || [],
        datasets: [{
            label: 'Match Success Rate',
            data: metrics?.matchingPatterns?.map(p => p.successRate) || [],
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            tension: 0.4
        }]
    };

    const personalityCompatibilityData = {
        labels: [
            'Adventurer',
            'Planner',
            'Flexible',
            'Relaxed',
            'Cultural'
        ],
        datasets: [{
            label: 'Compatibility Success Rate',
            data: metrics?.personalityCompatibility || [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(255, 99, 132, 1)'
        }]
    };

    const userEngagementData = {
        datasets: [{
            label: 'User Engagement',
            data: metrics?.userEngagement?.map(e => ({
                x: e.responseTime,
                y: e.interactionRate
            })) || [],
            backgroundColor: 'rgba(75, 192, 192, 0.6)'
        }]
    };

    const matchQualityTrendData = {
        labels: metrics?.matchQualityTrend?.map(t => t.date) || [],
        datasets: [{
            label: 'Average Match Score',
            data: metrics?.matchQualityTrend?.map(t => t.score) || [],
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            fill: true
        }]
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="mb-6">
                <div className="flex space-x-4 border-b dark:border-gray-700">
                    <button
                        className={`px-4 py-2 ${activeTab === 'matching' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('matching')}
                    >
                        Matching Patterns
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'personality' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('personality')}
                    >
                        Personality Analysis
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'engagement' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('engagement')}
                    >
                        User Engagement
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'trends' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('trends')}
                    >
                        Quality Trends
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab === 'matching' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Matching Success Patterns
                            </h3>
                            <Line
                                data={matchingPatternData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            max: 100
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Match Distribution
                            </h3>
                            <Bar
                                data={{
                                    labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
                                    datasets: [{
                                        label: 'Match Score Distribution',
                                        data: metrics?.matchDistribution || [],
                                        backgroundColor: 'rgba(54, 162, 235, 0.5)'
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true
                                        }
                                    }
                                }}
                            />
                        </div>
                    </>
                )}

                {activeTab === 'personality' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Personality Compatibility
                            </h3>
                            <Radar
                                data={personalityCompatibilityData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        r: {
                                            beginAtZero: true,
                                            max: 100
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Personality Type Distribution
                            </h3>
                            <Bar
                                data={{
                                    labels: ['Adventurer', 'Planner', 'Flexible', 'Relaxed', 'Cultural'],
                                    datasets: [{
                                        label: 'User Distribution',
                                        data: metrics?.personalityDistribution || [],
                                        backgroundColor: 'rgba(255, 99, 132, 0.5)'
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true
                                        }
                                    }
                                }}
                            />
                        </div>
                    </>
                )}

                {activeTab === 'engagement' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                User Engagement Analysis
                            </h3>
                            <Scatter
                                data={userEngagementData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        x: {
                                            title: {
                                                display: true,
                                                text: 'Response Time (ms)'
                                            }
                                        },
                                        y: {
                                            title: {
                                                display: true,
                                                text: 'Interaction Rate'
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Activity Heatmap
                            </h3>
                            <div className="h-64">
                                {/* Placeholder for activity heatmap */}
                                <p className="text-center text-gray-500 dark:text-gray-400">
                                    Activity distribution by time and day
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'trends' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Match Quality Trends
                            </h3>
                            <Line
                                data={matchQualityTrendData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            max: 100
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Success Metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {metrics?.successMetrics?.map((metric, index) => (
                                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {metric.label}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {metric.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdvancedMetrics;
