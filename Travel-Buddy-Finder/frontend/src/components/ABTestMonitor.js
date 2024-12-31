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
    ArrowTrendingUpIcon,
    ScaleIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

const ABTestMonitor = () => {
    const [activeTests, setActiveTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState(null);
    const [testHistory, setTestHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [realTimeData, setRealTimeData] = useState(null);

    useEffect(() => {
        fetchTestData();
        const interval = setInterval(fetchTestData, 60000); // Refresh every minute

        // Subscribe to real-time updates
        metricsSocket.connect();
        const unsubscribe = metricsSocket.subscribe('abTestUpdates', handleTestUpdate);

        return () => {
            clearInterval(interval);
            unsubscribe();
            metricsSocket.disconnect();
        };
    }, []);

    const fetchTestData = async () => {
        try {
            setLoading(true);
            const [activeResponse, historyResponse] = await Promise.all([
                api.get('/analytics/ab/active'),
                api.get('/analytics/ab/history')
            ]);

            if (activeResponse.data.status === 'success') {
                setActiveTests(activeResponse.data.data);
                if (!selectedTest && activeResponse.data.data.length > 0) {
                    setSelectedTest(activeResponse.data.data[0].id);
                }
            }

            if (historyResponse.data.status === 'success') {
                setTestHistory(historyResponse.data.data);
            }
        } catch (error) {
            console.error('Error fetching test data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestUpdate = (data) => {
        if (data.testId === selectedTest) {
            setRealTimeData(data);
        }
    };

    const getMetricsData = (test) => ({
        labels: test.metrics,
        datasets: [
            {
                label: `Model A (${test.modelA})`,
                data: test.metrics.map(metric => 
                    test.results.modelA.metrics[metric]?.mean || 0
                ),
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                pointBorderColor: '#fff'
            },
            {
                label: `Model B (${test.modelB})`,
                data: test.metrics.map(metric => 
                    test.results.modelB.metrics[metric]?.mean || 0
                ),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff'
            }
        ]
    });

    const getProgressData = (test) => ({
        labels: test.metrics,
        datasets: [
            {
                label: 'Sample Size Progress',
                data: test.metrics.map(() => 
                    (test.results.modelA.samples + test.results.modelB.samples) / 
                    (test.sampleSize * 2) * 100
                ),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)'
            }
        ]
    });

    const getSignificanceData = (test) => ({
        labels: test.metrics,
        datasets: [{
            label: 'Statistical Significance',
            data: test.metrics.map(metric => 
                test.conclusion?.confidence[metric] * 100 || 0
            ),
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)'
        }]
    });

    if (loading && !activeTests.length) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const selectedTestData = activeTests.find(t => t.id === selectedTest) || 
                           testHistory.find(t => t.id === selectedTest);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                    <BeakerIcon className="h-8 w-8 mr-2 text-purple-500" />
                    A/B Test Monitor
                </h2>
                <select
                    value={selectedTest || ''}
                    onChange={(e) => setSelectedTest(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                    <optgroup label="Active Tests">
                        {activeTests.map(test => (
                            <option key={test.id} value={test.id}>
                                {test.name} (Running)
                            </option>
                        ))}
                    </optgroup>
                    <optgroup label="Completed Tests">
                        {testHistory.map(test => (
                            <option key={test.id} value={test.id}>
                                {test.name} (Completed)
                            </option>
                        ))}
                    </optgroup>
                </select>
            </div>

            {selectedTestData && (
                <>
                    {/* Test Overview */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <div className="flex items-center">
                                <ChartBarIcon className="h-6 w-6 text-blue-500 mr-2" />
                                <h3 className="text-lg font-semibold">Sample Size</h3>
                            </div>
                            <p className="mt-2 text-2xl font-bold">
                                {selectedTestData.results.modelA.samples + 
                                 selectedTestData.results.modelB.samples} / 
                                {selectedTestData.sampleSize * 2}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <div className="flex items-center">
                                <ScaleIcon className="h-6 w-6 text-green-500 mr-2" />
                                <h3 className="text-lg font-semibold">Traffic Split</h3>
                            </div>
                            <p className="mt-2 text-2xl font-bold">
                                {selectedTestData.trafficSplit * 100}% / {(1 - selectedTestData.trafficSplit) * 100}%
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <div className="flex items-center">
                                <ClockIcon className="h-6 w-6 text-yellow-500 mr-2" />
                                <h3 className="text-lg font-semibold">Duration</h3>
                            </div>
                            <p className="mt-2 text-2xl font-bold">
                                {Math.floor((Date.now() - selectedTestData.startTime) / (1000 * 60 * 60))}h
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <div className="flex items-center">
                                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-500 mr-2" />
                                <h3 className="text-lg font-semibold">Status</h3>
                            </div>
                            <p className="mt-2 text-2xl font-bold">
                                {selectedTestData.status === 'completed' ? (
                                    <span className="text-green-500">Completed</span>
                                ) : (
                                    <span className="text-blue-500">Running</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6">
                        <div className="flex space-x-4 border-b dark:border-gray-700">
                            <button
                                className={`px-4 py-2 ${activeTab === 'overview' ? 
                                    'border-b-2 border-blue-500 text-blue-500' : 
                                    'text-gray-500 dark:text-gray-400'}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                Metrics Overview
                            </button>
                            <button
                                className={`px-4 py-2 ${activeTab === 'progress' ? 
                                    'border-b-2 border-blue-500 text-blue-500' : 
                                    'text-gray-500 dark:text-gray-400'}`}
                                onClick={() => setActiveTab('progress')}
                            >
                                Test Progress
                            </button>
                            <button
                                className={`px-4 py-2 ${activeTab === 'significance' ? 
                                    'border-b-2 border-blue-500 text-blue-500' : 
                                    'text-gray-500 dark:text-gray-400'}`}
                                onClick={() => setActiveTab('significance')}
                            >
                                Statistical Significance
                            </button>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeTab === 'overview' && (
                            <>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                        Metrics Comparison
                                    </h3>
                                    <Radar
                                        data={getMetricsData(selectedTestData)}
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
                                        Key Differences
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedTestData.conclusion?.recommendations.map((rec, index) => (
                                            <div
                                                key={index}
                                                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold">{rec.metric}</h4>
                                                        <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                                                            {rec.message}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-lg font-bold ${
                                                            rec.improvement > 0 ? 'text-green-500' : 'text-red-500'
                                                        }`}>
                                                            {rec.improvement > 0 ? '+' : ''}{rec.improvement.toFixed(1)}%
                                                        </span>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {(rec.confidence * 100).toFixed(1)}% confidence
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'progress' && (
                            <>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                        Sample Collection Progress
                                    </h3>
                                    <Bar
                                        data={getProgressData(selectedTestData)}
                                        options={{
                                            responsive: true,
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    max: 100,
                                                    title: {
                                                        display: true,
                                                        text: 'Progress (%)'
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                        Sample Distribution
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedTestData.metrics.map(metric => (
                                            <div key={metric} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <h4 className="font-semibold mb-2">{metric}</h4>
                                                <div className="flex justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Model A Samples
                                                        </p>
                                                        <p className="text-lg font-bold">
                                                            {selectedTestData.results.modelA.samples}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Model B Samples
                                                        </p>
                                                        <p className="text-lg font-bold">
                                                            {selectedTestData.results.modelB.samples}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'significance' && (
                            <>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                        Statistical Significance
                                    </h3>
                                    <Bar
                                        data={getSignificanceData(selectedTestData)}
                                        options={{
                                            responsive: true,
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    max: 100,
                                                    title: {
                                                        display: true,
                                                        text: 'Confidence (%)'
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                        Significance Analysis
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedTestData.metrics.map(metric => {
                                            const confidence = selectedTestData.conclusion?.confidence[metric] || 0;
                                            const improvement = selectedTestData.conclusion?.improvements[metric] || 0;
                                            return (
                                                <div key={metric} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <h4 className="font-semibold">{metric}</h4>
                                                    <div className="mt-2 flex justify-between items-center">
                                                        <div className="flex-1">
                                                            <div className="h-2 bg-gray-200 rounded-full">
                                                                <div
                                                                    className={`h-2 rounded-full ${
                                                                        confidence > 0.95 ? 'bg-green-500' :
                                                                        confidence > 0.8 ? 'bg-yellow-500' :
                                                                        'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${confidence * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className={`ml-4 font-bold ${
                                                            improvement > 0 ? 'text-green-500' : 'text-red-500'
                                                        }`}>
                                                            {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ABTestMonitor;
