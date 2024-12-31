import React, { useState, useEffect } from 'react';
import {
    Line,
    Bar,
    Scatter,
    HeatMap
} from 'react-chartjs-2';
import {
    ExclamationTriangleIcon,
    ChartBarIcon,
    ClockIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

const AnomalyDashboard = () => {
    const [anomalies, setAnomalies] = useState([]);
    const [timeRange, setTimeRange] = useState('1h');
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);
    const [activeTab, setActiveTab] = useState('realtime');

    useEffect(() => {
        fetchAnomalies();
        const interval = setInterval(fetchAnomalies, 60000); // Refresh every minute

        // Subscribe to real-time anomaly updates
        metricsSocket.connect();
        const unsubscribe = metricsSocket.subscribe('anomalyDetected', handleNewAnomaly);

        return () => {
            clearInterval(interval);
            unsubscribe();
            metricsSocket.disconnect();
        };
    }, [timeRange]);

    const fetchAnomalies = async () => {
        try {
            setLoading(true);
            const [anomalyResponse, metricsResponse] = await Promise.all([
                api.get(`/analytics/anomalies?timeRange=${timeRange}`),
                api.get(`/analytics/metrics?timeRange=${timeRange}`)
            ]);

            if (anomalyResponse.data.status === 'success') {
                setAnomalies(anomalyResponse.data.data);
            }
            if (metricsResponse.data.status === 'success') {
                setMetrics(metricsResponse.data.data);
            }
        } catch (error) {
            console.error('Error fetching anomaly data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewAnomaly = (anomaly) => {
        setAnomalies(prev => [anomaly, ...prev].slice(0, 100)); // Keep last 100 anomalies
    };

    const getAnomalyColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            default:
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        }
    };

    const metricsData = {
        labels: metrics?.timestamps?.map(t => new Date(t).toLocaleTimeString()) || [],
        datasets: [
            {
                label: 'CPU Usage',
                data: metrics?.cpu || [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true
            },
            {
                label: 'Memory Usage',
                data: metrics?.memory || [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true
            },
            {
                label: 'Cache Hit Rate',
                data: metrics?.cache || [],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true
            }
        ]
    };

    const anomalyDistributionData = {
        labels: ['CPU', 'Memory', 'Cache', 'API'],
        datasets: [{
            label: 'Anomalies by Type',
            data: [
                anomalies.filter(a => a.metric === 'cpu').length,
                anomalies.filter(a => a.metric === 'memory').length,
                anomalies.filter(a => a.metric === 'cache').length,
                anomalies.filter(a => a.metric === 'api').length
            ],
            backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)'
            ]
        }]
    };

    const severityDistributionData = {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
            label: 'Anomalies by Severity',
            data: [
                anomalies.filter(a => a.severity === 'critical').length,
                anomalies.filter(a => a.severity === 'high').length,
                anomalies.filter(a => a.severity === 'medium').length,
                anomalies.filter(a => a.severity === 'low').length
            ],
            backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(255, 159, 64, 0.5)',
                'rgba(255, 205, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)'
            ]
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
                    <ExclamationTriangleIcon className="h-8 w-8 mr-2 text-yellow-500" />
                    Anomaly Detection
                </h2>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="1h">Last Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                </select>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex space-x-4 border-b dark:border-gray-700">
                    <button
                        className={`px-4 py-2 ${activeTab === 'realtime' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('realtime')}
                    >
                        Real-time Monitoring
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'distribution' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('distribution')}
                    >
                        Anomaly Distribution
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'history' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Anomaly History
                    </button>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab === 'realtime' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                System Metrics
                            </h3>
                            <Line
                                data={metricsData}
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
                                Active Anomalies
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {anomalies.slice(0, 5).map((anomaly, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg ${getAnomalyColor(anomaly.severity)}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold">{anomaly.title}</h4>
                                                <p className="text-sm mt-1">{anomaly.description}</p>
                                            </div>
                                            <span className="text-sm">
                                                {new Date(anomaly.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        {anomaly.recommendation && (
                                            <div className="mt-2 text-sm">
                                                <strong>Recommendation:</strong>
                                                <ul className="list-disc list-inside ml-2">
                                                    {anomaly.recommendation.map((rec, i) => (
                                                        <li key={i}>{rec}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'distribution' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Anomalies by Type
                            </h3>
                            <Bar
                                data={anomalyDistributionData}
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
                                Anomalies by Severity
                            </h3>
                            <Bar
                                data={severityDistributionData}
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

                {activeTab === 'history' && (
                    <div className="col-span-2 bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                            Anomaly History
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Timestamp
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Metric
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Value
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Severity
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Type
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {anomalies.map((anomaly, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(anomaly.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {anomaly.metric.toUpperCase()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {anomaly.value.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAnomalyColor(anomaly.severity)}`}>
                                                    {anomaly.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {anomaly.type}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnomalyDashboard;
