/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { TestCollection, TestEnvironment } from '@wso2/api-designer-core';
import { logInfo, logError, logDebug } from '../util/logger';

/**
 * Storage manager for test collections and environments
 */
export class TestStorage {
    private static readonly DEFAULT_TEST_DIR = 'tests';
    private static readonly DEFAULT_ENV_FILE = 'environments.json';
    private static readonly CONFIG_FILE = 'config.yaml';

    /**
     * Read testsFolder from config.yaml
     */
    private static getTestsFolderFromConfig(openApiPath: string): string | null {
        try {
            const openApiDir = path.dirname(openApiPath);
            // Config is stored in .api-platform/config.yaml
            const configPath = path.join(openApiDir, '.api-platform', this.CONFIG_FILE);
            
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                const config = yaml.load(configContent) as any;
                
                // Config structure: { version: '1.0', api: { testsFolder: '...' }, spectralRulesets: [...] }
                if (config?.api?.testsFolder) {
                    logDebug(`Using testsFolder from config.yaml: ${config.api.testsFolder}`);
                    return config.api.testsFolder;
                }
            }
        } catch (error) {
            logError('Failed to read testsFolder from config.yaml:', error);
        }
        
        return null;
    }

    /**
     * Ensure test directory exists
     */
    private static ensureTestDirectory(openApiPath: string): string {
        const openApiDir = path.dirname(openApiPath);
        
        // Try to get testsFolder from config.yaml
        const configTestsFolder = this.getTestsFolderFromConfig(openApiPath);
        const testDir = configTestsFolder 
            ? path.join(openApiDir, configTestsFolder)
            : path.join(openApiDir, this.DEFAULT_TEST_DIR);
        
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
            logInfo(`Created test directory: ${testDir}`);
        }
        
        return testDir;
    }

    /**
     * Get environments file path
     */
    private static getEnvironmentsFilePath(openApiPath: string): string {
        const openApiDir = path.dirname(openApiPath);
        const configTestsFolder = this.getTestsFolderFromConfig(openApiPath);
        
        if (configTestsFolder) {
            // If testsFolder is configured, put environments.json there
            const testDir = path.join(openApiDir, configTestsFolder);
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir, { recursive: true });
            }
            return path.join(testDir, this.DEFAULT_ENV_FILE);
        }
        
        // Default location
        return path.join(openApiDir, this.DEFAULT_TEST_DIR, this.DEFAULT_ENV_FILE);
    }

    /**
     * Save a test collection
     */
    public static saveCollection(
        openApiPath: string,
        collection: TestCollection
    ): { success: boolean; path?: string; message?: string } {
        try {
            const testDir = this.ensureTestDirectory(openApiPath);
            const fileName = `${collection.name.toLowerCase().replace(/\s+/g, '-')}.json`;
            const filePath = path.join(testDir, fileName);
            
            // Update timestamps
            collection.updatedAt = Date.now();
            if (!collection.createdAt) {
                collection.createdAt = Date.now();
            }
            
            // Write file
            fs.writeFileSync(filePath, JSON.stringify(collection, null, 2), 'utf8');
            logInfo(`Saved test collection: ${filePath}`);
            
            return {
                success: true,
                path: filePath,
                message: `Test collection saved successfully`
            };
        } catch (error) {
            logError('Failed to save test collection:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save test collection'
            };
        }
    }

    /**
     * Normalize request body - convert JSON object to string if needed
     */
    private static normalizeRequestBody(body: any): string | undefined {
        if (body === null || body === undefined) {
            return undefined;
        }
        if (typeof body === 'string') {
            return body;
        }
        if (typeof body === 'object') {
            try {
                return JSON.stringify(body);
            } catch (error) {
                logError('Failed to stringify body object:', error);
                return undefined;
            }
        }
        return undefined;
    }

    /**
     * Load a test collection
     */
    public static loadCollection(filePath: string): { success: boolean; collection?: TestCollection; message?: string } {
        try {
            if (!fs.existsSync(filePath)) {
                return {
                    success: false,
                    message: 'Test collection file not found'
                };
            }
            
            const content = fs.readFileSync(filePath, 'utf8');
            const collection: TestCollection = JSON.parse(content);
            
            // Normalize request bodies (convert JSON objects to strings)
            if (collection.requests && Array.isArray(collection.requests)) {
                collection.requests = collection.requests.map(request => ({
                    ...request,
                    body: this.normalizeRequestBody(request.body)
                }));
            }
            
            logInfo(`Loaded test collection: ${filePath}`);
            
            return {
                success: true,
                collection
            };
        } catch (error) {
            logError('Failed to load test collection:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to load test collection'
            };
        }
    }

    /**
     * List all test collections for an OpenAPI file
     */
    public static listCollections(openApiPath: string): TestCollection[] {
        try {
            const testDir = this.ensureTestDirectory(openApiPath);
            
            if (!fs.existsSync(testDir)) {
                return [];
            }
            
            const files = fs.readdirSync(testDir).filter(f => f.endsWith('.json') && f !== 'environments.json' && f !== 'test-history.json');
            const collections: TestCollection[] = [];
            
            for (const file of files) {
                const filePath = path.join(testDir, file);
                const result = this.loadCollection(filePath);
                if (result.success && result.collection) {
                    collections.push(result.collection);
                }
            }
            
            // Sort by updatedAt (most recent first)
            collections.sort((a, b) => b.updatedAt - a.updatedAt);
            
            return collections;
        } catch (error) {
            logError('Failed to list test collections:', error);
            return [];
        }
    }

    /**
     * List collection metadata (lighter than loading full collections)
     */
    public static listCollectionMetadata(openApiPath: string): Array<{
        name: string;
        path: string;
        requestCount: number;
        updatedAt: number;
    }> {
        try {
            const testDir = this.ensureTestDirectory(openApiPath);
            
            if (!fs.existsSync(testDir)) {
                return [];
            }
            
            const files = fs.readdirSync(testDir).filter(f => f.endsWith('.json') && f !== 'environments.json' && f !== 'test-history.json');
            const metadata: Array<{ name: string; path: string; requestCount: number; updatedAt: number }> = [];
            
            for (const file of files) {
                const filePath = path.join(testDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const collection: TestCollection = JSON.parse(content);
                    
                    metadata.push({
                        name: collection.name,
                        path: filePath,
                        requestCount: collection.requests?.length || 0,
                        updatedAt: collection.updatedAt
                    });
                } catch (error) {
                    // Skip invalid files
                    continue;
                }
            }
            
            // Sort by updatedAt (most recent first)
            metadata.sort((a, b) => b.updatedAt - a.updatedAt);
            
            return metadata;
        } catch (error) {
            logError('Failed to list collection metadata:', error);
            return [];
        }
    }

    /**
     * Delete a test collection
     */
    public static deleteCollection(filePath: string): { success: boolean; message?: string } {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logInfo(`Deleted test collection: ${filePath}`);
                return {
                    success: true,
                    message: 'Test collection deleted successfully'
                };
            }
            
            return {
                success: false,
                message: 'Test collection file not found'
            };
        } catch (error) {
            logError('Failed to delete test collection:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete test collection'
            };
        }
    }

    /**
     * Save environments
     */
    public static saveEnvironments(
        openApiPath: string,
        environments: TestEnvironment[]
    ): { success: boolean; path?: string; message?: string } {
        try {
            const envPath = this.getEnvironmentsFilePath(openApiPath);
            const envDir = path.dirname(envPath);
            
            if (!fs.existsSync(envDir)) {
                fs.mkdirSync(envDir, { recursive: true });
            }
            
            fs.writeFileSync(envPath, JSON.stringify(environments, null, 2), 'utf8');
            
            logInfo(`Saved environments: ${envPath}`);
            
            return {
                success: true,
                path: envPath,
                message: 'Environments saved successfully'
            };
        } catch (error) {
            logError('Failed to save environments:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save environments'
            };
        }
    }

    /**
     * Load environments
     */
    public static loadEnvironments(openApiPath: string): { success: boolean; environments?: TestEnvironment[]; message?: string } {
        try {
            const envPath = this.getEnvironmentsFilePath(openApiPath);
            
            if (!fs.existsSync(envPath)) {
                // Return default environments
                logDebug(`Environments file not found, using defaults: ${envPath}`);
                return {
                    success: true,
                    environments: this.getDefaultEnvironments()
                };
            }
            
            const content = fs.readFileSync(envPath, 'utf8');
            const environments: TestEnvironment[] = JSON.parse(content);
            
            logInfo(`Loaded environments: ${envPath}`);
            
            return {
                success: true,
                environments
            };
        } catch (error) {
            logError('Failed to load environments:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to load environments',
                environments: this.getDefaultEnvironments()
            };
        }
    }

    /**
     * Get default environments
     */
    private static getDefaultEnvironments(): TestEnvironment[] {
        return [
            {
                id: 'local',
                name: 'Local',
                baseUrl: 'http://localhost:3000',
                variables: {
                    API_KEY: 'dev-api-key',
                    USER_ID: '123'
                }
            },
            {
                id: 'staging',
                name: 'Staging',
                baseUrl: 'https://staging-api.example.com',
                variables: {
                    API_KEY: '${STAGING_API_KEY}',
                    USER_ID: '456'
                }
            },
            {
                id: 'production',
                name: 'Production',
                baseUrl: 'https://api.example.com',
                variables: {
                    API_KEY: '${PROD_API_KEY}',
                    USER_ID: '789'
                }
            }
        ];
    }
}

