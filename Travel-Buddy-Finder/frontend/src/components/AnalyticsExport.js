import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import {
    DocumentDownloadIcon,
    ChartBarIcon,
    CalendarIcon,
    RefreshIcon
} from '@heroicons/react/outline';

const AnalyticsExport = () => {
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [format, setFormat] = useState('xlsx');
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        try {
            setLoading(true);
            const response = await api.post('/analytics/export', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                format
            }, {
                responseType: format === 'xlsx' ? 'blob' : 'json'
            });

            if (format === 'xlsx') {
                // Handle Excel file download
                const blob = new Blob([response.data], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `analytics_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } else {
                // Handle JSON download
                const dataStr = JSON.stringify(response.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `analytics_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.json`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            }

            toast.success('Analytics exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export analytics');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2" />
                Export Analytics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date
                    </label>
                    <div className="relative">
                        <DatePicker
                            selected={startDate}
                            onChange={date => setStartDate(date)}
                            maxDate={endDate}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <CalendarIcon className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Date
                    </label>
                    <div className="relative">
                        <DatePicker
                            selected={endDate}
                            onChange={date => setEndDate(date)}
                            minDate={startDate}
                            maxDate={new Date()}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <CalendarIcon className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" />
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Export Format
                </label>
                <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio text-blue-600"
                            name="format"
                            value="xlsx"
                            checked={format === 'xlsx'}
                            onChange={e => setFormat(e.target.value)}
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Excel (XLSX)</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio text-blue-600"
                            name="format"
                            value="json"
                            checked={format === 'json'}
                            onChange={e => setFormat(e.target.value)}
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">JSON</span>
                    </label>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleExport}
                    disabled={loading}
                    className={`
                        flex items-center px-4 py-2 rounded-lg text-white
                        ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}
                        transition-colors duration-200
                    `}
                >
                    {loading ? (
                        <RefreshIcon className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                        <DocumentDownloadIcon className="h-5 w-5 mr-2" />
                    )}
                    {loading ? 'Exporting...' : 'Export Analytics'}
                </button>
            </div>

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                <p>Export includes:</p>
                <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Match quality metrics</li>
                    <li>User interaction statistics</li>
                    <li>System performance data</li>
                    <li>ML model analytics</li>
                </ul>
            </div>
        </div>
    );
};

export default AnalyticsExport;
