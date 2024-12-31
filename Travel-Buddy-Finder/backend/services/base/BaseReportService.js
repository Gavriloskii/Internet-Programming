const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const BaseAnalyticsService = require('./BaseAnalyticsService');

class BaseReportService extends BaseAnalyticsService {
    constructor(options = {}) {
        super(options);
        
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        this.reportTypes = {
            daily: '24h',
            weekly: '7d',
            monthly: '30d'
        };
    }

    async createExcelReport(data, type) {
        const workbook = new ExcelJS.Workbook();
        const filename = `${type}_report_${Date.now()}.xlsx`;
        const filepath = path.join(__dirname, '../../temp', filename);

        // Add sheets based on data sections
        for (const [section, content] of Object.entries(data)) {
            if (typeof this[`add${section}Sheet`] === 'function') {
                const sheet = workbook.addWorksheet(this.formatSheetName(section));
                await this[`add${section}Sheet`](sheet, content);
            }
        }

        // Ensure temp directory exists
        await fs.mkdir(path.join(__dirname, '../../temp'), { recursive: true });
        await workbook.xlsx.writeFile(filepath);

        return filepath;
    }

    formatSheetName(name) {
        return name
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
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

    async sendReportEmail(filepath, options) {
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: options.recipients.join(', '),
            subject: options.subject,
            html: options.template,
            attachments: [{
                filename: path.basename(filepath),
                path: filepath
            }]
        };

        try {
            await this.transporter.sendMail(mailOptions);
            await this.logEvent('Report', {
                message: 'Report email sent successfully',
                recipients: options.recipients.length,
                type: options.type
            });
        } catch (error) {
            await this.logEvent('Error', {
                message: 'Failed to send report email',
                error: error.message,
                type: options.type
            });
            throw error;
        }
    }

    getEmailTemplate(type, sections) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2c5282;">${this.formatTitle(type)} Report</h2>
                <p>Please find attached the ${type} report.</p>
                ${this.formatSectionsList(sections)}
                <p style="color: #666;">This is an automated report. Please do not reply to this email.</p>
            </div>
        `;
    }

    formatTitle(text) {
        return text
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    formatSectionsList(sections) {
        if (!sections || sections.length === 0) return '';
        
        return `
            <p>This report includes:</p>
            <ul>
                ${sections.map(section => `<li>${this.formatTitle(section)}</li>`).join('')}
            </ul>
        `;
    }

    async cleanupReport(filepath) {
        try {
            await fs.unlink(filepath);
            await this.logEvent('Cleanup', {
                message: 'Report file cleaned up successfully',
                filepath
            });
        } catch (error) {
            await this.logEvent('Error', {
                message: 'Failed to cleanup report file',
                error: error.message,
                filepath
            });
        }
    }

    getTimeRange(type) {
        return this.reportTypes[type] || '24h';
    }

    validateDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error('Invalid date format');
        }
        
        if (start > end) {
            throw new Error('Start date must be before end date');
        }
        
        if (end > new Date()) {
            throw new Error('End date cannot be in the future');
        }
        
        return { start, end };
    }
}

module.exports = BaseReportService;
