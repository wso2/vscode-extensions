#!/usr/bin/env node

/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

const diagram_packages = [
    { name: 'bi-diagram', path: 'workspaces/ballerina/bi-diagram' },
    { name: 'sequence-diagram', path: 'workspaces/ballerina/sequence-diagram' },
    { name: 'component-diagram', path: 'workspaces/ballerina/component-diagram' },
    { name: 'type-diagram', path: 'workspaces/ballerina/type-diagram' },
    { name: 'mi-diagram', path: 'workspaces/mi/mi-diagram' },
];

function parseTestResults(output) {
    const results = {
        testSuites: { passed: 0, failed: 0, total: 0 },
        tests: { passed: 0, failed: 0, total: 0 },
        snapshots: { passed: 0, failed: 0, updated: 0, total: 0 },
        time: 'N/A',
        failedTests: [],
    };

    // Parse test suites
    const testSuitesMatch = output.match(/Test Suites:\s+(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/);
    if (testSuitesMatch) {
        results.testSuites.failed = parseInt(testSuitesMatch[1] || '0');
        results.testSuites.passed = parseInt(testSuitesMatch[2] || '0');
        results.testSuites.total = parseInt(testSuitesMatch[3] || '0');
    }

    // Parse tests
    const testsMatch = output.match(/Tests:\s+(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/);
    if (testsMatch) {
        results.tests.failed = parseInt(testsMatch[1] || '0');
        results.tests.passed = parseInt(testsMatch[2] || '0');
        results.tests.total = parseInt(testsMatch[3] || '0');
    }

    // Parse snapshots
    const snapshotsMatch = output.match(/Snapshots:\s+(?:(\d+)\s+failed,\s*)?(?:(\d+)\s+updated,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/);
    if (snapshotsMatch) {
        results.snapshots.failed = parseInt(snapshotsMatch[1] || '0');
        results.snapshots.updated = parseInt(snapshotsMatch[2] || '0');
        results.snapshots.passed = parseInt(snapshotsMatch[3] || '0');
        results.snapshots.total = parseInt(snapshotsMatch[4] || '0');
    }

    // Parse time
    const timeMatch = output.match(/Time:\s+([\d.]+\s*s)/);
    if (timeMatch) {
        results.time = timeMatch[1];
    }

    // Extract failed test names
    const failPattern = /●\s+(.+?)(?:\n|$)/g;
    let match;
    while ((match = failPattern.exec(output)) !== null) {
        if (match[1] && !match[1].includes('expect(')) {
            results.failedTests.push(match[1].trim());
        }
    }

    return results;
}

function runTest(packageInfo) {
    const { name, path: packagePath } = packageInfo;
    
    console.log(`\n${colors.cyan}${colors.bright}Running tests for ${name}...${colors.reset}`);
    console.log(`${colors.gray}Location: ${packagePath}${colors.reset}\n`);

    let output = '';
    let success = true;
    
    try {
        output = execSync('pnpm run test 2>&1', {
            cwd: path.join(process.cwd(), packagePath),
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
    } catch (error) {
        // Jest returns non-zero exit code when tests fail, but output is still valid
        output = error.stdout || error.output?.join('') || '';
        success = false;
    }

    const results = parseTestResults(output);
    
    // Determine success based on actual test results, not just exit code
    const actualSuccess = results.tests.failed === 0 && results.testSuites.failed === 0;
    
    return { name, success: actualSuccess, results, output };
}

function printResult(result) {
    const { name, success, results } = result;
    const icon = success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    
    console.log(`${icon} ${colors.bright}${name}${colors.reset}`);
    console.log(`  Test Suites: ${formatCount(results.testSuites.passed, results.testSuites.failed, results.testSuites.total)}`);
    console.log(`  Tests:       ${formatCount(results.tests.passed, results.tests.failed, results.tests.total)}`);
    console.log(`  Snapshots:   ${formatCount(results.snapshots.passed, results.snapshots.failed, results.snapshots.total, results.snapshots.updated)}`);
    console.log(`  Time:        ${results.time}`);
    
    if (results.failedTests.length > 0) {
        console.log(`  ${colors.red}Failed tests:${colors.reset}`);
        results.failedTests.slice(0, 5).forEach(test => {
            console.log(`    ${colors.red}•${colors.reset} ${test}`);
        });
        if (results.failedTests.length > 5) {
            console.log(`    ${colors.gray}... and ${results.failedTests.length - 5} more${colors.reset}`);
        }
    }
}

function formatCount(passed, failed, total, updated) {
    let result = '';
    
    if (failed > 0) {
        result += `${colors.red}${failed} failed${colors.reset}, `;
    }
    if (updated && updated > 0) {
        result += `${colors.yellow}${updated} updated${colors.reset}, `;
    }
    result += `${colors.green}${passed} passed${colors.reset}`;
    result += `, ${total} total`;
    
    return result;
}

function printSummary(allResults) {
    console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}SUMMARY${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

    const totals = {
        testSuites: { passed: 0, failed: 0, total: 0 },
        tests: { passed: 0, failed: 0, total: 0 },
        snapshots: { passed: 0, failed: 0, updated: 0, total: 0 },
    };

    allResults.forEach(result => {
        printResult(result);
        console.log('');
        
        // Accumulate totals
        totals.testSuites.passed += result.results.testSuites.passed;
        totals.testSuites.failed += result.results.testSuites.failed;
        totals.testSuites.total += result.results.testSuites.total;
        
        totals.tests.passed += result.results.tests.passed;
        totals.tests.failed += result.results.tests.failed;
        totals.tests.total += result.results.tests.total;
        
        totals.snapshots.passed += result.results.snapshots.passed;
        totals.snapshots.failed += result.results.snapshots.failed;
        totals.snapshots.updated += result.results.snapshots.updated;
        totals.snapshots.total += result.results.snapshots.total;
    });

    console.log(`${colors.bright}OVERALL TOTALS:${colors.reset}`);
    console.log(`  Test Suites: ${formatCount(totals.testSuites.passed, totals.testSuites.failed, totals.testSuites.total)}`);
    console.log(`  Tests:       ${formatCount(totals.tests.passed, totals.tests.failed, totals.tests.total)}`);
    console.log(`  Snapshots:   ${formatCount(totals.snapshots.passed, totals.snapshots.failed, totals.snapshots.total, totals.snapshots.updated)}`);

    const allPassed = allResults.every(r => r.success);
    console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
    
    if (allPassed) {
        console.log(`${colors.green}${colors.bright}✓ All diagram tests passed!${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}${colors.bright}✗ Some diagram tests failed!${colors.reset}\n`);
        process.exit(1);
    }
}

// Main execution
console.log(`${colors.bright}${colors.cyan}Running Diagram Snapshot Tests${colors.reset}`);
console.log(`${colors.gray}Testing ${diagram_packages.length} diagram packages...${colors.reset}`);

const allResults = [];

for (const pkg of diagram_packages) {
    const result = runTest(pkg);
    allResults.push(result);
}

printSummary(allResults);
