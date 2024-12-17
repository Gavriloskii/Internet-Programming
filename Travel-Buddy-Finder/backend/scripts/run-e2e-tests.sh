#!/bin/bash

# Set environment variables for testing
export NODE_ENV=test
export JWT_SECRET=test-secret
export JWT_EXPIRES_IN=1h
export MONGODB_URI=mongodb://localhost:27017/travel-buddy-test

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Starting Travel Buddy Finder E2E Tests..."

# Run the tests
echo "Running E2E tests..."
jest e2e.test.js --detectOpenHandles --forceExit --coverage --json --outputFile=test-results.json

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
fi

# Generate detailed test report
echo "Generating test report..."
node << EOF
const fs = require('fs');
const results = require('../test-results.json');

const generateReport = () => {
    let report = '# Travel Buddy Finder E2E Testing Report\n\n';
    
    // Test Summary
    report += '## Test Summary\n\n';
    report += '- **Total Tests:** ' + results.numTotalTests + '\n';
    report += '- **Passed Tests:** ' + (results.numTotalTests - results.numFailedTests) + '\n';
    report += '- **Failed Tests:** ' + results.numFailedTests + '\n';
    report += '- **Test Duration:** ' + (results.testResults[0].perfStats.runtime / 1000).toFixed(2) + ' seconds\n\n';

    // Coverage Summary
    if (results.coverageMap) {
        report += '## Coverage Summary\n\n';
        report += '| Category | Coverage |\n';
        report += '|----------|----------|\n';
        const coverage = results.coverageMap.global;
        report += \`| Statements | \${coverage.statements.pct}% |\n\`;
        report += \`| Branches | \${coverage.branches.pct}% |\n\`;
        report += \`| Functions | \${coverage.functions.pct}% |\n\`;
        report += \`| Lines | \${coverage.lines.pct}% |\n\n\`;
    }

    // Detailed Test Results
    report += '## Detailed Test Results\n\n';
    results.testResults[0].testResults.forEach(test => {
        const status = test.status === 'passed' ? '✅' : '❌';
        report += \`### \${status} \${test.ancestorTitles.join(' > ')} > \${test.title}\n\`;
        report += \`- **Status:** \${test.status}\n\`;
        report += \`- **Duration:** \${test.duration}ms\n\`;
        
        if (test.status === 'failed') {
            report += '- **Error:**\n\`\`\`\n' + test.failureMessages.join('\n') + '\n\`\`\`\n';
        }
        report += '\n';
    });

    // Test Suites Summary
    report += '## Test Suites Summary\n\n';
    const suites = new Set(results.testResults[0].testResults.map(t => t.ancestorTitles[0]));
    suites.forEach(suite => {
        const suiteTests = results.testResults[0].testResults.filter(t => t.ancestorTitles[0] === suite);
        const passedTests = suiteTests.filter(t => t.status === 'passed').length;
        report += \`### \${suite}\n\`;
        report += \`- Total Tests: \${suiteTests.length}\n\`;
        report += \`- Passed: \${passedTests}\n\`;
        report += \`- Failed: \${suiteTests.length - passedTests}\n\n\`;
    });

    // Recommendations
    report += '## Recommendations\n\n';
    if (results.numFailedTests > 0) {
        report += '🔴 **Critical Issues to Address:**\n\n';
        results.testResults[0].testResults
            .filter(t => t.status === 'failed')
            .forEach(test => {
                report += \`- Fix failing test: \${test.ancestorTitles.join(' > ')} > \${test.title}\n\`;
            });
    } else {
        report += '✅ All tests are passing! Consider:\n\n';
        report += '- Adding more edge cases\n';
        report += '- Testing additional user scenarios\n';
        report += '- Implementing load testing\n';
    }

    return report;
};

// Write report to file
fs.writeFileSync('../testing-report.md', generateReport());
EOF

echo "✨ Test report generated: testing-report.md"

# Clean up
rm test-results.json

echo "Testing complete! Check testing-report.md for detailed results."
