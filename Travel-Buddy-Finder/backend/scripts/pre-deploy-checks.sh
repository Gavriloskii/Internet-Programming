#!/bin/bash

# Exit on any error
set -e

echo "Running pre-deployment checks..."

# Check Node.js version
echo "Checking Node.js version..."
required_node_version="16.0.0"
current_node_version=$(node -v | cut -d'v' -f2)
if [ "$(printf '%s\n' "$required_node_version" "$current_node_version" | sort -V | head -n1)" != "$required_node_version" ]; then
    echo "Error: Node.js version must be $required_node_version or higher"
    exit 1
fi

# Check MongoDB connection
echo "Checking MongoDB connection..."
if ! mongosh --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; then
    echo "Error: MongoDB is not running"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Run linting
echo "Running ESLint..."
npm run lint

# Run tests
echo "Running tests..."
npm run test

# Run test coverage
echo "Running test coverage..."
npm run test:coverage

# Check for security vulnerabilities
echo "Checking for security vulnerabilities..."
npm audit

# Check environment variables
echo "Checking environment variables..."
required_vars=("JWT_SECRET" "MONGODB_URI" "PORT" "NODE_ENV")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Required environment variable $var is not set"
        exit 1
    fi
done

# Check disk space
echo "Checking disk space..."
available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
if (( $(echo "$available_space < 1" | bc -l) )); then
    echo "Error: Not enough disk space available (less than 1GB)"
    exit 1
fi

# Check memory usage
echo "Checking memory usage..."
free_memory=$(free -m | awk 'NR==2 {print $4}')
if [ "$free_memory" -lt 512 ]; then
    echo "Warning: Low memory available (less than 512MB)"
fi

# Check CPU load
echo "Checking CPU load..."
load_average=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1)
if (( $(echo "$load_average > 2" | bc -l) )); then
    echo "Warning: High CPU load detected"
fi

# Backup check
echo "Creating backup..."
backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"
cp -r ./src "$backup_dir/"
cp package.json "$backup_dir/"
cp package-lock.json "$backup_dir/"
echo "Backup created at $backup_dir"

echo "All pre-deployment checks completed successfully!"
