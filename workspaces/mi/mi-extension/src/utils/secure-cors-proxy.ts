/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * Secure CORS proxy implementation to replace vulnerable cors-anywhere
 * This implementation includes security measures to prevent SSRF attacks
 */
export class SecureCorsProxy {
    private app: express.Application;
    private server: http.Server | https.Server | null = null;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        // Security middleware
        this.app.use((req, res, next) => {
            if (!this.isAllowedOrigin(req)) {
                return res.status(403).json({ error: 'Origin not allowed' });
            }
            next();
        });

        // CORS headers
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Max-Age', '86400'); // 24 hours
            
            if (req.method === 'OPTIONS') {
                return res.status(200).end();
            }
            next();
        });
    }

    private setupRoutes(): void {
        // Proxy route - Only GET requests allowed for security reasons
        // This minimizes SSRF risks and prevents data modification attacks
        this.app.get('/proxy/*', this.handleProxyRequest.bind(this));
    }

    private isAllowedOrigin(req: express.Request): boolean {
        const origin = req.headers.origin;
        if (!origin) return false;
        
        // Only allow localhost origins for security
        try {
            const originUrl = new URL(origin);
            return originUrl.hostname === 'localhost' || 
                   originUrl.hostname === '127.0.0.1' || 
                   originUrl.hostname === '::1';
        } catch {
            return false;
        }
    }

    private async handleProxyRequest(req: express.Request, res: express.Response): Promise<void> {
        try {
            const targetUrl = req.params[0];
            if (!targetUrl) {
                return res.status(400).json({ error: 'No target URL provided' });
            }

            // Security: Validate and sanitize target URL
            const sanitizedUrl = this.sanitizeTargetUrl(targetUrl);
            if (!sanitizedUrl) {
                return res.status(400).json({ error: 'Invalid target URL' });
            }

            // Make the request
            const response = await this.makeSecureRequest(sanitizedUrl);
            
            // Set appropriate headers
            res.set('Content-Type', response.headers['content-type'] || 'application/json');
            res.status(response.statusCode || 200);
            
            // Stream the response
            if (response) {
                response.pipe(res);
            } else {
                res.status(500).json({ error: 'No response received' });
            }
            
        } catch (error) {
            console.error('Proxy error:', error);
            res.status(500).json({ error: 'Proxy request failed' });
        }
    }

    private sanitizeTargetUrl(url: string): string | null {
        try {
            const parsedUrl = new URL(url);
            
            // Security checks
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return null;
            }
            
            // Block private IP ranges and localhost variations
            const hostname = parsedUrl.hostname.toLowerCase();
            if (this.isPrivateOrLocalhost(hostname)) {
                return null;
            }
            
            // Block dangerous ports
            const port = parseInt(parsedUrl.port) || (parsedUrl.protocol === 'https:' ? 443 : 80);
            if (this.isDangerousPort(port)) {
                return null;
            }
            
            return parsedUrl.toString();
        } catch {
            return null;
        }
    }

    private isPrivateOrLocalhost(hostname: string): boolean {
        // Block private IP ranges and localhost using CIDR-like approach
        const privateRanges = [
            'localhost',
            '127.0.0.1',
            '::1',
            '0.0.0.0',
            '169.254.', // Link-local
            '10.', // Class A private (10.0.0.0/8)
            '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', // Class B private (172.16.0.0/12)
            '192.168.' // Class C private (192.168.0.0/16)
        ];
        
        return privateRanges.some(range => hostname.startsWith(range));
    }

    private isDangerousPort(port: number): boolean {
        // Block dangerous ports (excluding common web ports 8080, 8443 for legitimate services)
        const dangerousPorts = [
            22, 23, 25, 53, 110, 143, 993, 995, // Common service ports
            3389, 5900, 5901, // Remote desktop
            5432, 3306, 1433, 27017, // Database ports
            6379, 11211, // Cache ports
            9090, 9091 // Management ports
        ];
        
        return dangerousPorts.includes(port);
    }

    private async makeSecureRequest(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'SecureCorsProxy/1.0',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache'
                },
                timeout: 10000 // 10 second timeout
            };

            const req = client.request(options, (res) => {
                resolve(res);
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    public listen(port: number, hostname: string = 'localhost'): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, hostname, () => {
                console.log(`Secure CORS proxy listening on ${hostname}:${port}`);
                resolve();
            });

            if (this.server) {
                this.server.on('error', (error) => {
                    reject(error);
                });
            }
        });
    }

    public close(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

/**
 * Create a secure CORS proxy server
 */
export function createSecureCorsProxy(): SecureCorsProxy {
    return new SecureCorsProxy();
}
