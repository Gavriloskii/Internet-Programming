const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const matchAnalytics = require('./matchAnalytics');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;

class ReportGenerator {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Initialize scheduled reports
        this.initializeScheduledReports();
    }

    // Schedule automated reports
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
            await this.sendReportEmail(reportFile, type);
            await fs.unlink(reportFile); // Clean up file after sending
        } catch (error) {
            console.error(`Error generating ${type} report:`, error);
        }
    }

    async gatherReportData(type) {
        const timeRanges = {
            daily: '24h',
            weekly: '7d',
            monthly: '30d'
        };

        const [
            systemAnalytics,
            matchQuality,
            userStats
        ] = await Promise.all([
            matchAnalytics.getSystemAnalytics(),
            matchAnalytics.getMatchQualityReport(timeRanges[type]),
            this.getUserStatistics()
        ]);

        return {
            systemAnalytics,
            matchQuality,
            userStats,
            reportType: type,
            generatedAt: new Date()
        };
    }

    async createExcelReport(data, type) {
        const workbook = new ExcelJS.Workbook();
        const filename = `match_analytics_${type}_${Date.now()}.xlsx`;
        const filepath = path.join(__dirname, '../temp', filename);

        // System Overview Sheet
        const systemSheet = workbook.addWorksheet('System Overview');
        this.addSystemOverviewSheet(systemSheet, data.systemAnalytics);

        // Match Quality Sheet
        const qualitySheet = workbook.addWorksheet('Match Quality');
        this.addMatchQualitySheet(qualitySheet, data.matchQuality);

        // User Statistics Sheet
        const userSheet = workbook.addWorksheet('User Statistics');
        this.addUserStatisticsSheet(userSheet, data.userStats);

        // Ensure temp directory exists
        await fs.mkdir(path.join(__dirname, '../temp'), { recursive: true });
        await workbook.xlsx.writeFile(filepath);

        return filepath;
    }

    addSystemOverviewSheet(sheet, data) {
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

    addMatchQualitySheet(sheet, data) {
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

    addUserStatisticsSheet(sheet, data) {
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

    styleSheet(sheet) {
        // Style header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add borders to all cells
        sheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
    }

    async sendReportEmail(filepath, type) {
        const admins = await User.find({ role: 'admin' });
        const adminEmails = admins.map(admin => admin.email);

        if (adminEmails.length === 0) {
            console.warn('No admin users found to send report to');
            return;
        }

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: adminEmails.join(', '),
            subject: `Travel Buddy Finder - ${type.charAt(0).toUpperCase() + type.slice(1)} Analytics Report`,
            html: this.getEmailTemplate(type),
            attachments: [{
                filename: path.basename(filepath),
                path: filepath
            }]
        };

        await this.transporter.sendMail(mailOptions);
    }

    getEmailTemplate(type) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2c5282;">Travel Buddy Finder Analytics Report</h2>
                <p>Please find attached the ${type} analytics report for Travel Buddy Finder.</p>
                <p>This report includes:</p>
                <ul>
                    <li>System Overview</li>
                    <li>Match Quality Metrics</li>
                    <li>User Statistics</li>
                </ul>
                <p style="color: #666;">This is an automated report. Please do not reply to this email.</p>
            </div>
        `;
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

    // Export data for custom date range
    async exportCustomReport(startDate, endDate, format = 'xlsx') {
        const data = await this.gatherReportData('custom');
        
        if (format === 'xlsx') {
            return this.createExcelReport(data, 'custom');
        } else if (format === 'json') {
            return {
                data,
                metadata: {
                    exportedAt: new Date(),
                    dateRange: { startDate, endDate }
                }
            };
        }
    }
}

module.exports = new ReportGenerator();
