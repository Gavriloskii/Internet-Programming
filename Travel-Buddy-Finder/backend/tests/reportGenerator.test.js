const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const reportGenerator = require('../services/reportGenerator');
const matchAnalytics = require('../services/matchAnalytics');
const User = require('../models/User');
const EnhancedMatch = require('../models/enhancedMatch');
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
    await EnhancedMatch.deleteMany({});
    // Clean up any test files
    const tempDir = path.join(__dirname, '../temp');
    try {
        await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
        // Directory might not exist, ignore error
    }
});

describe('Report Generator', () => {
    describe('Excel Report Generation', () => {
        test('Should generate Excel report with correct sheets', async () => {
            // Create test users and matches
            const users = await createTestUsers();
            const matches = await createTestMatches(users);

            // Generate report
            const reportData = {
                systemAnalytics: await matchAnalytics.getSystemAnalytics(),
                matchQuality: await matchAnalytics.getMatchQualityReport('24h'),
                userStats: await reportGenerator.getUserStatistics(),
                reportType: 'daily',
                generatedAt: new Date()
            };

            const filepath = await reportGenerator.createExcelReport(reportData, 'test');

            // Verify file exists
            const fileExists = await fs.access(filepath).then(() => true).catch(() => false);
            expect(fileExists).toBe(true);

            // Verify Excel content
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filepath);

            // Check sheets exist
            expect(workbook.getWorksheet('System Overview')).toBeTruthy();
            expect(workbook.getWorksheet('Match Quality')).toBeTruthy();
            expect(workbook.getWorksheet('User Statistics')).toBeTruthy();

            // Clean up
            await fs.unlink(filepath);
        });

        test('Should include correct metrics in system overview', async () => {
            const users = await createTestUsers();
            await createTestMatches(users);

            const reportData = {
                systemAnalytics: await matchAnalytics.getSystemAnalytics(),
                matchQuality: await matchAnalytics.getMatchQualityReport('24h'),
                userStats: await reportGenerator.getUserStatistics(),
                reportType: 'daily',
                generatedAt: new Date()
            };

            const filepath = await reportGenerator.createExcelReport(reportData, 'test');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filepath);

            const systemSheet = workbook.getWorksheet('System Overview');
            const metrics = [];
            systemSheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) { // Skip header
                    metrics.push(row.getCell(1).value);
                }
            });

            expect(metrics).toContain('Total Matches');
            expect(metrics).toContain('Average Match Score');
            expect(metrics).toContain('Cache Hit Rate');
            expect(metrics).toContain('API Response Time');

            await fs.unlink(filepath);
        });
    });

    describe('Report Data Gathering', () => {
        test('Should gather complete report data for different time ranges', async () => {
            const users = await createTestUsers();
            await createTestMatches(users);

            const timeRanges = ['daily', 'weekly', 'monthly'];
            
            for (const range of timeRanges) {
                const data = await reportGenerator.gatherReportData(range);
                
                expect(data).toHaveProperty('systemAnalytics');
                expect(data).toHaveProperty('matchQuality');
                expect(data).toHaveProperty('userStats');
                expect(data).toHaveProperty('reportType', range);
                expect(data).toHaveProperty('generatedAt');
                
                expect(data.systemAnalytics).toBeTruthy();
                expect(data.matchQuality).toBeTruthy();
                expect(data.userStats).toBeTruthy();
            }
        });
    });

    describe('Custom Report Export', () => {
        test('Should export custom date range report in different formats', async () => {
            const users = await createTestUsers();
            await createTestMatches(users);

            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const endDate = new Date();

            // Test XLSX export
            const xlsxPath = await reportGenerator.exportCustomReport(startDate, endDate, 'xlsx');
            expect(await fs.access(xlsxPath).then(() => true).catch(() => false)).toBe(true);
            await fs.unlink(xlsxPath);

            // Test JSON export
            const jsonData = await reportGenerator.exportCustomReport(startDate, endDate, 'json');
            expect(jsonData).toHaveProperty('data');
            expect(jsonData).toHaveProperty('metadata');
            expect(jsonData.metadata).toHaveProperty('dateRange');
        });
    });

    describe('User Statistics', () => {
        test('Should calculate correct user statistics', async () => {
            const users = await createTestUsers();
            await createTestMatches(users);

            const stats = await reportGenerator.getUserStatistics();

            expect(stats).toHaveProperty('activeUsers');
            expect(stats).toHaveProperty('averageMatches');
            expect(stats).toHaveProperty('averageResponseTime');
            expect(stats).toHaveProperty('matchSuccessRate');

            expect(stats.activeUsers).toBeGreaterThan(0);
            expect(stats.averageMatches).toBeGreaterThanOrEqual(0);
            expect(stats.matchSuccessRate).toBeGreaterThanOrEqual(0);
            expect(stats.matchSuccessRate).toBeLessThanOrEqual(100);
        });
    });
});

// Helper functions
async function createTestUsers(count = 5) {
    const users = [];
    for (let i = 0; i < count; i++) {
        users.push(await User.create({
            name: `Test User ${i}`,
            email: `test${i}@example.com`,
            password: 'password123',
            role: i === 0 ? 'admin' : 'user',
            lastActive: new Date(),
            metadata: {
                responseRate: 0.8 + (Math.random() * 0.2),
                averageResponseTime: Math.floor(Math.random() * 100) + 50
            }
        }));
    }
    return users;
}

async function createTestMatches(users) {
    const matches = [];
    for (let i = 0; i < users.length - 1; i++) {
        matches.push(await EnhancedMatch.create({
            users: [users[i]._id, users[i + 1]._id],
            matchScore: Math.floor(Math.random() * 40) + 60,
            status: ['pending', 'accepted', 'rejected'][Math.floor(Math.random() * 3)],
            compatibilityScores: {
                personality: Math.random() * 100,
                travel: Math.random() * 100,
                interests: Math.random() * 100,
                logistics: Math.random() * 100,
                behavioral: Math.random() * 100
            },
            metadata: {
                swipeTime: Math.random() * 1000,
                initialMessageSent: Math.random() > 0.5,
                matchType: ['mutual', 'superlike', 'boost'][Math.floor(Math.random() * 3)]
            }
        }));
    }
    return matches;
}
