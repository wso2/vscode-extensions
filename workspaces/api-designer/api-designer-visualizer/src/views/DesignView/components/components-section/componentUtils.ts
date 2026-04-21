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

import * as React from 'react';
import { ComponentType, ComponentItem } from './ComponentsSection';
import { ValidationData } from '../api-header/MetricsOverview';

export const getComponentTypeLabel = (type: ComponentType): string => {
    const labels: Record<ComponentType, string> = {
        schemas: 'Schemas',
        parameters: 'Parameters',
        headers: 'Headers',
        requestBodies: 'Request Bodies',
        responses: 'Responses',
        securitySchemes: 'Security Schemes',
        examples: 'Examples',
        links: 'Links',
        callbacks: 'Callbacks'
    };
    return labels[type];
};

export const getComponentTypeIcon = (type: ComponentType): string => {
    const icons: Record<ComponentType, string> = {
        schemas: 'symbol-interface',
        parameters: 'symbol-parameter',
        headers: 'symbol-field',
        requestBodies: 'inbox',
        responses: 'output',
        securitySchemes: 'shield',
        examples: 'file-code',
        links: 'link',
        callbacks: 'symbol-event'
    };
    return icons[type];
};

export const getComponentDescription = (type: ComponentType, data: any): string => {
    switch (type) {
        case 'schemas':
            return data?.type || data?.$ref ? (data.type || 'Reference') : 'Schema';
        case 'parameters':
            return data?.description || `${data?.in || 'query'} parameter`;
        case 'headers':
            return data?.description || 'Header';
        case 'requestBodies':
            return data?.description || 'Request body';
        case 'responses':
            return data?.description || 'Response';
        case 'securitySchemes':
            return data?.description || `${data?.type || 'security'} scheme`;
        case 'examples':
            return data?.summary || data?.description || 'Example';
        case 'links':
            return data?.description || 'Link';
        case 'callbacks':
            return data?.description || 'Callback';
        default:
            return '';
    }
};

export interface ComponentSummaryRow {
    label: string;
    value: string | React.ReactNode;
}

export const buildComponentSummary = (item: ComponentItem): ComponentSummaryRow[] => {
    const rows: ComponentSummaryRow[] = [];
    const data = item.data || {};
    switch (item.type) {
        case 'schemas':
            if (data.$ref) {
                rows.push({ label: 'Type', value: 'Reference' });
                rows.push({ label: 'Reference', value: data.$ref });
            } else {
                rows.push({ label: 'Type', value: data.type || 'object' });
                if (data.properties && Object.keys(data.properties).length > 0) {
                    rows.push({ label: 'Properties', value: `${Object.keys(data.properties).length} properties` });
                    const propList = Object.keys(data.properties).slice(0, 5).map(name => {
                        const prop = data.properties[name];
                        const required = data.required?.includes(name);
                        return `• ${name} (${prop?.type || 'any'})${required ? ' *' : ''}`;
                    }).join('\n');
                    rows.push({ 
                        label: '', 
                        value: React.createElement('div', { 
                            style: { marginLeft: 12, fontSize: 11, color: 'var(--vscode-descriptionForeground)', whiteSpace: 'pre-line' } 
                        }, 
                        propList,
                        Object.keys(data.properties).length > 5 ? React.createElement('div', { 
                            style: { fontStyle: 'italic', opacity: 0.7 } 
                        }, `+${Object.keys(data.properties).length - 5} more`) : null
                        )
                    });
                }
                if (data.required && data.required.length > 0) {
                    rows.push({ label: 'Required Fields', value: `${data.required.length}: ${data.required.slice(0, 3).join(', ')}${data.required.length > 3 ? '...' : ''}` });
                }
                if (data.format) rows.push({ label: 'Format', value: data.format });
                if (data.enum && data.enum.length > 0) {
                    rows.push({ label: 'Enum Values', value: `${data.enum.length} values` });
                }
            }
            if (data.title) rows.push({ label: 'Title', value: data.title });
            if (data.description) rows.push({ label: 'Description', value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') });
            break;
        case 'parameters':
            rows.push({ label: 'Location', value: data.in || 'query' });
            rows.push({ label: 'Required', value: data.required ? 'Yes' : 'No' });
            if (data.schema) {
                if (data.schema.$ref) {
                    rows.push({ label: 'Schema', value: `Reference: ${data.schema.$ref}` });
                } else {
                    rows.push({ label: 'Schema Type', value: data.schema.type || 'any' });
                    if (data.schema.format) rows.push({ label: 'Format', value: data.schema.format });
                    if (data.schema.enum && data.schema.enum.length > 0) {
                        rows.push({ label: 'Enum', value: `${data.schema.enum.length} values` });
                    }
                }
            }
            if (data.description) rows.push({ label: 'Description', value: data.description.substring(0, 80) + (data.description.length > 80 ? '...' : '') });
            if (data.example !== undefined) rows.push({ label: 'Example', value: String(data.example) });
            break;
        case 'responses':
            if (data.description) rows.push({ label: 'Description', value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') });
            if (data.content && Object.keys(data.content).length > 0) {
                rows.push({ label: 'Content Types', value: Object.keys(data.content).join(', ') });
                const firstContent = Object.values(data.content)[0] as any;
                if (firstContent?.schema) {
                    if (firstContent.schema.$ref) {
                        rows.push({ label: 'Schema', value: `Reference: ${firstContent.schema.$ref}` });
                    } else if (firstContent.schema.type) {
                        rows.push({ label: 'Schema Type', value: firstContent.schema.type });
                    }
                }
            }
            if (data.headers && Object.keys(data.headers).length > 0) {
                rows.push({ label: 'Headers', value: `${Object.keys(data.headers).length} headers: ${Object.keys(data.headers).slice(0, 3).join(', ')}${Object.keys(data.headers).length > 3 ? '...' : ''}` });
            }
            if (data.links && Object.keys(data.links).length > 0) {
                rows.push({ label: 'Links', value: `${Object.keys(data.links).length} link${Object.keys(data.links).length === 1 ? '' : 's'}` });
            }
            break;
        case 'requestBodies':
            rows.push({ label: 'Required', value: data.required ? 'Yes' : 'No' });
            if (data.content && Object.keys(data.content).length > 0) {
                rows.push({ label: 'Content Types', value: Object.keys(data.content).join(', ') });
                const firstContent = Object.values(data.content)[0] as any;
                if (firstContent?.schema) {
                    if (firstContent.schema.$ref) {
                        rows.push({ label: 'Schema', value: `Reference: ${firstContent.schema.$ref}` });
                    } else if (firstContent.schema.type) {
                        rows.push({ label: 'Schema Type', value: firstContent.schema.type });
                    }
                }
            }
            if (data.description) rows.push({ label: 'Description', value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') });
            break;
        case 'headers':
            rows.push({ label: 'Required', value: data.required ? 'Yes' : 'No' });
            if (data.schema) {
                if (data.schema.$ref) {
                    rows.push({ label: 'Schema', value: `Reference: ${data.schema.$ref}` });
                } else {
                    rows.push({ label: 'Schema Type', value: data.schema.type || 'string' });
                    if (data.schema.format) rows.push({ label: 'Format', value: data.schema.format });
                }
            }
            if (data.description) rows.push({ label: 'Description', value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') });
            break;
        case 'securitySchemes':
            rows.push({ label: 'Type', value: data.type || 'unknown' });
            if (data.type === 'apiKey') {
                rows.push({ label: 'In', value: data.in || 'header' });
                rows.push({ label: 'Name', value: data.name || '—' });
            } else if (data.type === 'http') {
                rows.push({ label: 'Scheme', value: data.scheme || 'basic' });
                if (data.bearerFormat) rows.push({ label: 'Bearer Format', value: data.bearerFormat });
            } else if (data.type === 'oauth2') {
                if (data.flows) {
                    const flowTypes = Object.keys(data.flows);
                    rows.push({ label: 'Flows', value: flowTypes.join(', ') });
                }
            } else if (data.type === 'openIdConnect') {
                rows.push({ label: 'OpenID Connect URL', value: data.openIdConnectUrl || '—' });
            }
            if (data.description) rows.push({ label: 'Description', value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') });
            break;
        case 'examples':
            if (data.summary) rows.push({ label: 'Summary', value: data.summary });
            if (data.description) rows.push({ label: 'Description', value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') });
            if (data.value) {
                const valueStr = typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
                rows.push({ label: 'Value', value: valueStr.substring(0, 80) + (valueStr.length > 80 ? '...' : '') });
            }
            break;
        case 'links':
            if (data.operationId) rows.push({ label: 'Operation ID', value: data.operationId });
            if (data.operationRef) rows.push({ label: 'Operation Ref', value: data.operationRef });
            if (data.parameters) {
                const paramEntries = Object.entries(data.parameters);
                if (paramEntries.length > 0) {
                    rows.push({ label: 'Parameters', value: `${paramEntries.length} parameter${paramEntries.length === 1 ? '' : 's'}` });
                }
            }
            if (data.description) rows.push({ label: 'Description', value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') });
            break;
        case 'callbacks':
            if (data && typeof data === 'object') {
                const callbackPaths = Object.keys(data);
                rows.push({ label: 'Callbacks', value: `${callbackPaths.length} callback${callbackPaths.length === 1 ? '' : 's'}` });
            }
            break;
    }
    return rows;
};

export interface ComponentValidationResult {
    errors: number;
    warnings: number;
    issues: Array<{ path: (string | number)[]; message: string }>;
}

export const getComponentValidationIssues = (
    validationData: ValidationData | null | undefined,
    componentType: ComponentType,
    componentName: string
): ComponentValidationResult => {
    if (!validationData) {
        return { errors: 0, warnings: 0, issues: [] };
    }

    const componentPath = ['components', componentType, componentName];
    const matchingIssues: Array<{ path: (string | number)[]; message: string }> = [];

    const checkPath = (issuePath: (string | number)[]): boolean => {
        if (issuePath.length < componentPath.length) {
            return false;
        }
        for (let i = 0; i < componentPath.length; i++) {
            if (issuePath[i] !== componentPath[i]) {
                return false;
            }
        }
        return true;
    };

    const errors = validationData.errors || [];
    const warnings = validationData.warnings || [];

    errors.forEach((error) => {
        if (Array.isArray(error.path) && checkPath(error.path)) {
            matchingIssues.push({ path: error.path, message: error.message });
        }
    });

    warnings.forEach((warning) => {
        if (Array.isArray(warning.path) && checkPath(warning.path)) {
            matchingIssues.push({ path: warning.path, message: warning.message });
        }
    });

    return {
        errors: errors.filter(e => Array.isArray(e.path) && checkPath(e.path)).length,
        warnings: warnings.filter(w => Array.isArray(w.path) && checkPath(w.path)).length,
        issues: matchingIssues
    };
};

