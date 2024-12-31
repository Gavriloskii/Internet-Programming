const cron = require('node-cron');
const BaseReportService = require('./base/BaseReportService');
const matchAnalytics = require('./matchAnalytics');
const User = require('../models/User');

class ReportGenerator extends BaseReportService {
    constructor() {
        super({
            retentionPeriod: 604800 // 7 days
        });
        this.initializeScheduledReports();
    }

    initializeScheduledReports() {
        // Daily report at 1 AM
        cron.schedule('0 1 * * *', () => {
            this.generateAndSendReport('daily');
        });

        // Weekly report on Monday at 2 AM
        cron.schedule('0 2 * * 1', () => {
            this.generateAndSendReport('weekly');
        });

        // Monthly report on 1st at 3 AM
        cron.schedule('0 3 1 * *', () => {
            this.generateAndSendReport('monthly');
        });
    }

    async generateAndSendReport(type) {
        try {
            const reportData = await this.gatherReportData(type);
            const reportFile = await this.createExcelReport(reportData, type);
            
            const admins = await User.find({ role: 'admin' });
            const adminEmails = admins.map(admin => admin.email);

            if (adminEmails.length === 0) {
                await this.logEvent('Warning', {
                    message: 'No admin users found to send report to',
                    type
                });
                return;
            }

            await this.sendReportEmail(reportFile, {
                recipients: adminEmails,
                subject: `Travel Buddy Finder - ${this.formatTitle(type)} Analytics Report`,
                template: this.getEmailTemplate(type, ['System Overview', 'Match Quality', 'User Statistics']),
                type
            });

            await this.cleanupReport(reportFile);
            
            await this.logEvent('Report', {
                message: `${type} report generated and sent successfully`,
                recipients: adminEmails.length
            });
        } catch (error) {
            await this.logEvent('Error', {
                message: `Error generating ${type} report`,
                error: error.message
            });
        }
    }

    async gatherReportData(type) {
        const timeRange = this.getTimeRange(type);

        const [
            systemAnalytics,
            matchQuality,
            userStats
        ] = await Promise.all([
            matchAnalytics.getSystemAnalytics(),
            matchAnalytics.getMatchQualityReport(timeRange),
            this.getUserStatistics()
        ]);

        return {
            systemOverview: {
                ...systemAnalytics,
                reportType: type,
                generatedAt: new Date()
            },
            matchQuality,
            userStatistics: userStats
        };
    }

    async addSystemOverviewSheet(sheet, data) {
        sheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 }
        ];

        const metrics = [
            { metric: 'Total Matches', value: data.matchQuality.matchCount },
            { metric: 'Average Match Score', value: data.matchQuality.averageScores?.overall?.toFixed(2) },
            { metric: 'Cache Hit Rate', value: `${data.system.cacheHitRate.toFixed(1)}%` },
            { metric: 'API Response Time', value: `${data.system.apiResponseTime}ms` },
            { metric: 'Error Rate', value: `${data.system.errorRate.toFixed(2)}%` },
            { metric: 'ML Model Accuracy', value: `${data.system.mlAccuracy.toFixed(1)}%` }
        ];

        sheet.addRows(metrics);
        this.styleSheet(sheet);
    }

    async addMatchQualitySheet(sheet, data) {
        sheet.columns = [
            { header: 'Score Range', key: 'range', width: 20 },
            { header: 'Count', key: 'count', width: 15 },
            { header: 'Percentage', key: 'percentage', width: 15 }
        ];

        const totalMatches = Object.values(data.scoreDistribution).reduce((a, b) => a + b, 0);
        const distributions = Object.entries(data.scoreDistribution).map(([range, count]) => ({
            range: `${range}-${parseInt(range) + 9}`,
            count,
            percentage: `${((count / totalMatches) * 100).toFixed(1)}%`
        }));

        sheet.addRows(distributions);
        this.styleSheet(sheet);
    }

    async addUserStatisticsSheet(sheet, data) {
        sheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 }
        ];

        const stats = [
            { metric: 'Total Active Users', value: data.activeUsers },
            { metric: 'Average Matches per User', value: data.averageMatches.toFixed(2) },
            { metric: 'Average Response Time', value: `${data.averageResponseTime}ms` },
            { metric: 'Match Success Rate', value: `${data.matchSuccessRate.toFixed(1)}%` }
        ];

        sheet.addRows(stats);
        this.styleSheet(sheet);
    }

    async getUserStatistics() {
        const users = await User.find({});
        const activeThreshold = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days

        const activeUsers = users.filter(user => 
            user.lastActive && user.lastActive > activeThreshold
        ).length;

        const matchStats = await matchAnalytics.getSystemAnalytics();
        
        return {
            activeUsers,
            averageMatches: matchStats.matchQuality.matchCount / activeUsers,
            averageResponseTime: matchStats.responseTimes.average,
            matchSuccessRate: (matchStats.matchQuality.successCount / matchStats.matchQuality.matchCount) * 100
        };
    }

    async exportCustomReport(startDate, endDate, format = 'xlsx') {
        try {
            const { start, end } = this.validateDateRange(startDate, endDate);
            const data = await this.gatherReportData('custom');
            
            if (format === 'xlsx') {
                return this.createExcelReport(data, 'custom');
            } else if (format === 'json') {
                return {
                    data,
                    metadata: {
                        exportedAt: new Date(),
                        dateRange: { start, end }
                    }
                };
            } else {
                throw new Error('Unsupported format');
            }
        } catch (error) {
            await this.logEvent('Error', {
                message: 'Failed to export custom report',
                error: error.message,
                format,
                startDate,
                endDate
            });
            throw error;
        }
    }
}

module.exports = new ReportGenerator();
