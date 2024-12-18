import React, { useState, useEffect } from 'react';
import {
    Line,
    Bar,
    Radar,
    Scatter
} from 'react-chartjs-2';
import {
    ArrowsRightLeftIcon,
    ChartBarIcon,
    DocumentDuplicateIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

const ModelComparison = () => {
    const [models, setModels] = useState([]);
    const [selectedModels, setSelectedModels] = useState([]);
    const [comparisonData, setComparisonData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState('accuracy');
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        fetchModels();
        const interval = setInterval(fetchModels, 300000); // Refresh every 5 minutes

        // Subscribe to real-time updates
        metricsSocket.connect();
        const unsubscribe = metricsSocket.subscribe('modelUpdates', handleModelUpdate);

        return () => {
            clearInterval(interval);
            unsubscribe();
            metricsSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedModels.length > 0) {
            fetchComparisonData();
        }
    }, [selectedModels, activeMetric, timeRange]);

    const fetchModels = async () => {
        try {
            const response = await api.get('/analytics/model/versions');
            if (response.data.status === 'success') {
                setModels(response.data.data);
                if (selectedModels.length === 0 && response.data.data.length >= 2) {
                    // Auto-select two most recent models
                    setSelectedModels([
                        response.data.data[0].id,
                        response.data.data[1].id
                    ]);
                }
            }
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    };

    const fetchComparisonData = async () => {
        try {
            setLoading(true);
            const response = await api.post('/analytics/model/compare', {
                modelIds: selectedModels,
                metric: activeMetric,
                timeRange
            });
            if (response.data.status === 'success') {
                setComparisonData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching comparison data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleModelUpdate = (data) => {
        setModels(prev => {
            const updated = [...prev];
            const index = updated.findIndex(m => m.id === data.id);
            if (index !== -1) {
                updated[index] = { ...updated[index], ...data };
            } else {
                updated.unshift(data);
            }
            return updated;
        });
    };

    const performanceData = {
        labels: comparisonData?.timestamps?.map(t => new Date(t).toLocaleString()) || [],
        datasets: selectedModels.map((modelId, index) => {
            const model = models.find(m => m.id === modelId);
            return {
                label: `${model?.name || 'Unknown'} (${model?.version || 'v?'})`,
                data: comparisonData?.performance?.[modelId] || [],
                borderColor: index === 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)',
                backgroundColor: index === 0 ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)',
                fill: true
            };
        })
    };

    const metricsData = {
        labels: [
            'Accuracy',
            'Training Speed',
            'Memory Usage',
            'Cache Efficiency',
            'Error Recovery'
        ],
        datasets: selectedModels.map((modelId, index) => {
            const model = models.find(m => m.id === modelId);
            return {
                label: `${model?.name || 'Unknown'} (${model?.version || 'v?'})`,
                data: [
                    model?.metrics?.accuracy || 0,
                    model?.metrics?.trainingSpeed || 0,
                    model?.metrics?.memoryEfficiency || 0,
                    model?.metrics?.cacheEfficiency || 0,
                    model?.metrics?.errorRecovery || 0
                ],
                backgroundColor: index === 0 ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)',
                borderColor: index === 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)',
                pointBackgroundColor: index === 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff'
            };
        })
    };

    const predictionScatterData = {
        datasets: selectedModels.map((modelId, index) => ({
            label: `Model ${index + 1} Predictions`,
            data: comparisonData?.predictions?.[modelId]?.map(p => ({
                x: p.actual,
                y: p.predicted
            })) || [],
            backgroundColor: index === 0 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(54, 162, 235, 0.6)'
        }))
    };

    if (loading && !comparisonData) {
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
                    <ArrowsRightLeftIcon className="h-8 w-8 mr-2 text-blue-500" />
                    Model Comparison
                </h2>
                <div className="flex space-x-4">
                    <select
                        value={activeMetric}
                        onChange={(e) => setActiveMetric(e.target.value)}
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="accuracy">Accuracy</option>
                        <option value="loss">Loss</option>
                        <option value="speed">Training Speed</option>
                        <option value="memory">Memory Usage</option>
                    </select>
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
            </div>

            {/* Model Selection */}
            <div className="mb-6 grid grid-cols-2 gap-4">
                {[0, 1].map(index => (
                    <div key={index} className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Model {index + 1}
                        </label>
                        <select
                            value={selectedModels[index] || ''}
                            onChange={(e) => {
                                const newSelected = [...selectedModels];
                                newSelected[index] = e.target.value;
                                setSelectedModels(newSelected);
                            }}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select a model</option>
                            {models.map(model => (
                                <option
                                    key={model.id}
                                    value={model.id}
                                    disabled={selectedModels.includes(model.id) && selectedModels.indexOf(model.id) !== index}
                                >
                                    {model.name} (v{model.version}) - {new Date(model.trainedAt).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Over Time */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                        Performance Comparison
                    </h3>
                    <Line
                        data={performanceData}
                        options={{
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    max: activeMetric === 'accuracy' ? 100 : undefined
                                }
                            }
                        }}
                    />
                </div>

                {/* Metrics Radar Chart */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                        Metrics Comparison
                    </h3>
                    <Radar
                        data={metricsData}
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

                {/* Prediction Accuracy */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                        Prediction Accuracy
                    </h3>
                    <Scatter
                        data={predictionScatterData}
                        options={{
                            responsive: true,
                            scales: {
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Actual Values'
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'Predicted Values'
                                    }
                                }
                            }
                        }}
                    />
                </div>

                {/* Key Differences */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                        Key Differences
                    </h3>
                    <div className="space-y-4">
                        {comparisonData?.differences?.map((diff, index) => (
                            <div
                                key={index}
                                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold">{diff.metric}</h4>
                                        <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                                            {diff.description}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-lg font-bold ${
                                            diff.improvement > 0 ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                            {diff.improvement > 0 ? '+' : ''}{diff.improvement}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelComparison;
