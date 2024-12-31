import React, { useState, useEffect } from 'react';
import {
    Line,
    Bar,
    Scatter,
    Radar
} from 'react-chartjs-2';
import {
    BeakerIcon,
    ChartBarIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

const ModelTrainingDashboard = () => {
    const [trainingMetrics, setTrainingMetrics] = useState(null);
    const [modelPerformance, setModelPerformance] = useState(null);
    const [trainingHistory, setTrainingHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('performance');
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 300000); // Refresh every 5 minutes

        // Subscribe to real-time updates
        metricsSocket.connect();
        const unsubscribe = metricsSocket.subscribe('modelMetrics', handleMetricsUpdate);

        return () => {
            clearInterval(interval);
            unsubscribe();
            metricsSocket.disconnect();
        };
    }, [timeRange]);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const [metricsResponse, performanceResponse, historyResponse] = await Promise.all([
                api.get('/analytics/model/metrics'),
                api.get(`/analytics/model/performance?timeRange=${timeRange}`),
                api.get(`/analytics/model/history?timeRange=${timeRange}`)
            ]);

            if (metricsResponse.data.status === 'success') {
                setTrainingMetrics(metricsResponse.data.data);
            }
            if (performanceResponse.data.status === 'success') {
                setModelPerformance(performanceResponse.data.data);
            }
            if (historyResponse.data.status === 'success') {
                setTrainingHistory(historyResponse.data.data);
            }
        } catch (error) {
            console.error('Error fetching model metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMetricsUpdate = (data) => {
        setTrainingMetrics(prev => ({
            ...prev,
            ...data
        }));
    };

    const performanceData = {
        labels: modelPerformance?.timestamps?.map(t => new Date(t).toLocaleString()) || [],
        datasets: [
            {
                label: 'Anomaly Model Accuracy',
                data: modelPerformance?.anomalyAccuracy || [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true
            },
            {
                label: 'ML Model Accuracy',
                data: modelPerformance?.mlAccuracy || [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true
            }
        ]
    };

    const trainingProgressData = {
        labels: trainingHistory?.epochs || [],
        datasets: [
            {
                label: 'Training Loss',
                data: trainingHistory?.loss || [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)'
            },
            {
                label: 'Validation Loss',
                data: trainingHistory?.valLoss || [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)'
            }
        ]
    };

    const modelMetricsData = {
        labels: [
            'Prediction Accuracy',
            'Error Recovery',
            'Training Speed',
            'Memory Usage',
            'Cache Efficiency'
        ],
        datasets: [{
            label: 'Current Model Metrics',
            data: [
                trainingMetrics?.accuracy || 0,
                trainingMetrics?.errorRecovery || 0,
                trainingMetrics?.trainingSpeed || 0,
                trainingMetrics?.memoryEfficiency || 0,
                trainingMetrics?.cacheEfficiency || 0
            ],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
            pointBorderColor: '#fff'
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
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                    <BeakerIcon className="h-8 w-8 mr-2 text-blue-500" />
                    Model Training Analytics
                </h2>
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

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex space-x-4 border-b dark:border-gray-700">
                    <button
                        className={`px-4 py-2 ${activeTab === 'performance' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('performance')}
                    >
                        Model Performance
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'training' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('training')}
                    >
                        Training Progress
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'metrics' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('metrics')}
                    >
                        Model Metrics
                    </button>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab === 'performance' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Model Accuracy Over Time
                            </h3>
                            <Line
                                data={performanceData}
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
                                Performance Metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(trainingMetrics?.performance || {}).map(([key, value]) => (
                                    <div key={key} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {key}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {typeof value === 'number' ? `${value.toFixed(2)}%` : value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'training' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Training Progress
                            </h3>
                            <Line
                                data={trainingProgressData}
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
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Training Statistics
                            </h3>
                            <div className="space-y-4">
                                {trainingHistory?.stats?.map((stat, index) => (
                                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold">{stat.name}</h4>
                                                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                                                    {stat.description}
                                                </p>
                                            </div>
                                            <span className="text-lg font-bold text-blue-500">
                                                {stat.value}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'metrics' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Model Metrics Overview
                            </h3>
                            <Radar
                                data={modelMetricsData}
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
                                Model Health
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(trainingMetrics?.health || {}).map(([key, value]) => (
                                    <div key={key} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {key}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {value}
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

export default ModelTrainingDashboard;
