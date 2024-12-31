#!/bin/bash

# Set environment variables for testing
export NODE_ENV=test
export JWT_SECRET=test-secret
export JWT_EXPIRES_IN=1h
export MONGODB_URI=mongodb://localhost:27017/travel-buddy-test

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting Travel Buddy Finder Matching System Tests${NC}"

# Clean up previous test data
echo "Cleaning up test database..."
node backend/scripts/createTestUsers.js --clean

# Generate test profiles
echo "Generating diverse test profiles..."
node backend/scripts/generateTestProfiles.js --count 1000

# Run matching tests
echo -e "\n${BLUE}Running Matching System Tests${NC}"

# 1. Basic Matching Tests
echo "1. Testing basic matching functionality..."
npx jest backend/tests/matching.test.js --testNamePattern="Match Score Calculation" --verbose

# 2. Performance Tests
echo -e "\n2. Testing matching system performance..."
npx jest backend/tests/matching.test.js --testNamePattern="Match Performance" --verbose

# 3. Filter Tests
echo -e "\n3. Testing match filtering..."
npx jest backend/tests/matching.test.js --testNamePattern="Match Filtering" --verbose

# 4. Load Tests
echo -e "\n4. Running load tests..."
npx jest backend/tests/matching.test.js --testNamePattern="Should handle large number" --verbose

# 5. API Tests
echo -e "\n5. Testing matching API endpoints..."
npx jest backend/tests/api.test.js --testNamePattern="matches" --verbose

# Create test matches
echo -e "\n${BLUE}Creating Test Matches${NC}"
node backend/scripts/createTestMatches.js

# Run E2E tests
echo -e "\n${BLUE}Running E2E Tests${NC}"
node backend/scripts/run-e2e-tests.sh

# Generate test report
echo -e "\n${BLUE}Generating Test Report${NC}"
npx jest --coverage

# Check for performance regressions
echo -e "\n${BLUE}Checking Performance Metrics${NC}"
node backend/scripts/test-matching-system.js --performance-check

# Final status
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}All tests completed successfully!${NC}"
    echo "Check coverage report at: backend/coverage/lcov-report/index.html"
else
    echo -e "\n${RED}Some tests failed. Please check the logs above.${NC}"
    exit 1
fi

# Cleanup
echo -e "\n${BLUE}Cleaning up test environment...${NC}"
node backend/scripts/createTestUsers.js --clean

echo -e "\n${GREEN}Testing complete!${NC}"
