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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { TextField, Button, Codicon, Typography } from '@wso2/ui-toolkit';
import { EntityModal } from '../../../../components/common/EntityModal';
import { Section, SectionHeader, SectionTitle } from '../shared/EditorCommonStyles';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';

/**
 * Security Scheme Editor - Full CRUD for security schemes
 */
export interface SecuritySchemeEditorProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data?: any;
    schemeName?: string;
    onClose: () => void;
    onSave: (name: string, scheme: any, previousName?: string) => void;
    onAutoSave?: (name: string, scheme: any, previousName?: string) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

const securityTypes = ['apiKey', 'http', 'oauth2', 'openIdConnect'];
const httpSchemes = ['basic', 'bearer', 'digest', 'hoba', 'mutual', 'vapid', 'aws4'];
const flowTypes = ['implicit', 'password', 'clientCredentials', 'authorizationCode'];

const FormStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const RequiredAsterisk = styled.span`
    color: var(--vscode-errorForeground);
`;

const VsCodeSelect = styled.select`
    width: 100%;
    padding: 6px 10px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
`;

const ScopeEntries = styled.div`
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ScopeEntryRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: var(--vscode-input-background);
    border-radius: 3px;
`;

const ScopeEntryTitle = styled.div`
    font-size: 12px;
    font-weight: 600;
`;

const ScopeEntryDesc = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

export const SecuritySchemeEditor: React.FC<SecuritySchemeEditorProps> = ({
    isOpen,
    mode,
    data,
    schemeName: initialSchemeName,
    onClose,
    onSave,
    onAutoSave,
    onRemove,
    onCopilot
}) => {
    const [schemeName, setSchemeName] = useState(initialSchemeName || '');
    const lastSyncedNameRef = useRef(initialSchemeName || '');
    const [type, setType] = useState(data?.type || 'apiKey');
    const [description, setDescription] = useState(data?.description || '');

    // API Key fields
    const [apiKeyName, setApiKeyName] = useState(data?.name || '');
    const [apiKeyIn, setApiKeyIn] = useState(data?.in || 'header');

    // HTTP fields
    const [httpScheme, setHttpScheme] = useState(data?.scheme || 'bearer');
    const [bearerFormat, setBearerFormat] = useState(data?.bearerFormat || '');

    // OAuth2 fields
    const [oauth2Flow, setOauth2Flow] = useState(Object.keys(data?.flows || {})?.[0] || 'authorizationCode');
    const [authorizationUrl, setAuthorizationUrl] = useState(data?.flows?.[oauth2Flow]?.authorizationUrl || '');
    const [tokenUrl, setTokenUrl] = useState(data?.flows?.[oauth2Flow]?.tokenUrl || '');
    const [refreshUrl, setRefreshUrl] = useState(data?.flows?.[oauth2Flow]?.refreshUrl || '');
    const [scopes, setScopes] = useState((data?.flows?.[oauth2Flow]?.scopes || {}) as Record<string, string>);
    const [scopeName, setScopeName] = useState('');
    const [scopeDesc, setScopeDesc] = useState('');

    // OpenID Connect fields
    const [openIdConnectUrl, setOpenIdConnectUrl] = useState(data?.openIdConnectUrl || '');

    const handleAddScope = () => {
        if (!scopeName.trim() || !scopeDesc.trim()) return;

        setScopes((prev) => ({
            ...prev,
            [scopeName.trim()]: scopeDesc.trim()
        }));

        setScopeName('');
        setScopeDesc('');
    };

    const handleRemoveScope = (scope: string) => {
        setScopes((prev) => {
            const updated = { ...prev };
            delete updated[scope];
            return updated;
        });
    };

    // Build complete scheme from form state
    const buildCompleteScheme = useCallback((): any => {
        const scheme: any = { type };

        if (description.trim()) scheme.description = description.trim();

        if (type === 'apiKey') {
            if (!apiKeyName.trim()) return null; // Validation
            scheme.name = apiKeyName.trim();
            scheme.in = apiKeyIn;
        } else if (type === 'http') {
            scheme.scheme = httpScheme;
            if (bearerFormat) scheme.bearerFormat = bearerFormat;
        } else if (type === 'oauth2') {
            const flows: any = {};
            flows[oauth2Flow] = {};

            if (authorizationUrl) flows[oauth2Flow].authorizationUrl = authorizationUrl.trim();
            if (tokenUrl) flows[oauth2Flow].tokenUrl = tokenUrl.trim();
            if (refreshUrl) flows[oauth2Flow].refreshUrl = refreshUrl.trim();

            if (Object.keys(scopes).length > 0) {
                flows[oauth2Flow].scopes = scopes;
            }

            scheme.flows = flows;
        } else if (type === 'openIdConnect') {
            if (!openIdConnectUrl.trim()) return null; // Validation
            scheme.openIdConnectUrl = openIdConnectUrl.trim();
        }

        return scheme;
    }, [type, description, apiKeyName, apiKeyIn, httpScheme, bearerFormat, oauth2Flow, authorizationUrl, tokenUrl, refreshUrl, scopes, openIdConnectUrl]);

    // Use bidirectional sync hook
    const {
        localValue: localScheme,
        setLocalValue: setLocalScheme,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<any>({
        externalValue: data || {},
        onAutoSave: onAutoSave ? (scheme) => onAutoSave(schemeName, scheme, lastSyncedNameRef.current) : undefined,
        onSave: (updatedScheme) => {
            if (schemeName.trim()) {
                onSave(schemeName.trim(), updatedScheme, lastSyncedNameRef.current);
                onClose();
            }
        },
        isOpen,
        syncKey: `scheme-${mode}-${initialSchemeName || 'new'}`,
        buildValue: () => buildCompleteScheme() || {}
    });

    // Update form state when data syncs from external
    useEffect(() => {
        if (!isOpen) return;
        setSchemeName(initialSchemeName || '');
        lastSyncedNameRef.current = initialSchemeName || '';
        setType(data?.type || 'apiKey');
        setDescription(data?.description || '');
        setApiKeyName(data?.name || '');
        setApiKeyIn(data?.in || 'header');
        setHttpScheme(data?.scheme || 'bearer');
        setBearerFormat(data?.bearerFormat || '');
        
        const flow = Object.keys(data?.flows || {})?.[0] || 'authorizationCode';
        setOauth2Flow(flow);
        setAuthorizationUrl(data?.flows?.[flow]?.authorizationUrl || '');
        setTokenUrl(data?.flows?.[flow]?.tokenUrl || '');
        setRefreshUrl(data?.flows?.[flow]?.refreshUrl || '');
        setScopes((data?.flows?.[flow]?.scopes || {}) as Record<string, string>);
        setOpenIdConnectUrl(data?.openIdConnectUrl || '');
    }, [data, isOpen, initialSchemeName]);

    // Trigger auto-save when form fields change
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        const completeScheme = buildCompleteScheme();
        if (completeScheme) {
            setLocalScheme(completeScheme);
        }
    }, [type, description, apiKeyName, apiKeyIn, httpScheme, bearerFormat, oauth2Flow, authorizationUrl, tokenUrl, refreshUrl, scopes, openIdConnectUrl, isOpen, onAutoSave, buildCompleteScheme, setLocalScheme]);

    // Trigger auto-save when scheme name changes (debounced)
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        
        const timer = setTimeout(() => {
            const completeScheme = buildCompleteScheme();
            if (completeScheme && schemeName.trim()) {
                onAutoSave(schemeName.trim(), completeScheme, lastSyncedNameRef.current);
                lastSyncedNameRef.current = schemeName.trim();
            }
        }, 500);
        
        return () => clearTimeout(timer);
    }, [schemeName, isOpen, onAutoSave, buildCompleteScheme]);

    const handleSave = () => {
        const completeScheme = buildCompleteScheme();
        if (completeScheme && schemeName.trim()) {
            onSave(schemeName.trim(), completeScheme, lastSyncedNameRef.current);
            onClose();
        }
    };

    return (
        <EntityModal
            isOpen={isOpen}
            title={`${mode === 'add' ? 'Add' : 'Edit'} Security Scheme`}
            onClose={onClose}
            onSave={handleSave}
            width={900}
            mode={mode}
            saveButtonDisabled={!schemeName.trim() || (type === 'apiKey' && !apiKeyName.trim()) || (type === 'openIdConnect' && !openIdConnectUrl.trim())}
        >
            <FormStack>
                <Section>
                    <SectionHeader>
                        <SectionTitle>Scheme details</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Scheme Name"
                        required
                        placeholder="e.g., api_key, bearer_token"
                        value={schemeName}
                        onTextChange={setSchemeName}
                    />

                    <div>
                        <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                            Security Type <RequiredAsterisk>*</RequiredAsterisk>
                        </Typography>
                        <VsCodeSelect value={type} onChange={(e) => setType(e.target.value)}>
                            {securityTypes.map((t) => (
                                <option key={t} value={t}>
                                    {t === 'openIdConnect' ? 'OpenID Connect' : t === 'oauth2' ? 'OAuth 2.0' : t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                            ))}
                        </VsCodeSelect>
                    </div>

                    <TextField
                        label="Description"
                        placeholder="Security scheme description"
                        value={description}
                        onTextChange={setDescription}
                    />
                </Section>

                {type === 'apiKey' && (
                    <Section>
                        <SectionHeader>
                            <SectionTitle>API key</SectionTitle>
                        </SectionHeader>
                        <TextField
                            label="Parameter Name"
                            required
                            placeholder="e.g., api_key, X-API-Key"
                            value={apiKeyName}
                            onTextChange={setApiKeyName}
                        />
                        <div>
                            <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                                Location
                            </Typography>
                            <VsCodeSelect value={apiKeyIn} onChange={(e) => setApiKeyIn(e.target.value)}>
                                <option value="query">Query Parameter</option>
                                <option value="header">Header</option>
                                <option value="cookie">Cookie</option>
                            </VsCodeSelect>
                        </div>
                    </Section>
                )}

                {type === 'http' && (
                    <Section>
                        <SectionHeader>
                            <SectionTitle>HTTP authentication</SectionTitle>
                        </SectionHeader>
                        <div>
                            <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                                HTTP Scheme
                            </Typography>
                            <VsCodeSelect value={httpScheme} onChange={(e) => setHttpScheme(e.target.value)}>
                                {httpSchemes.map((scheme) => (
                                    <option key={scheme} value={scheme}>
                                        {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                                    </option>
                                ))}
                            </VsCodeSelect>
                        </div>
                        {httpScheme === 'bearer' && (
                            <TextField
                                label="Bearer Format"
                                placeholder="e.g., JWT"
                                value={bearerFormat}
                                onTextChange={setBearerFormat}
                            />
                        )}
                    </Section>
                )}

                {type === 'oauth2' && (
                    <>
                        <Section>
                            <SectionHeader>
                                <SectionTitle>OAuth 2.0</SectionTitle>
                            </SectionHeader>
                            <div>
                                <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                                    Flow Type
                                </Typography>
                                <VsCodeSelect value={oauth2Flow} onChange={(e) => setOauth2Flow(e.target.value)}>
                                    {flowTypes.map((flow) => (
                                        <option key={flow} value={flow}>
                                            {flow.charAt(0).toUpperCase() + flow.slice(1)}
                                        </option>
                                    ))}
                                </VsCodeSelect>
                            </div>

                            {(oauth2Flow === 'implicit' || oauth2Flow === 'authorizationCode') && (
                                <TextField
                                    label="Authorization URL"
                                    required
                                    placeholder="https://auth.example.com/oauth/authorize"
                                    value={authorizationUrl}
                                    onTextChange={setAuthorizationUrl}
                                />
                            )}

                            {(oauth2Flow === 'password' || oauth2Flow === 'clientCredentials' || oauth2Flow === 'authorizationCode') && (
                                <TextField
                                    label="Token URL"
                                    required
                                    placeholder="https://auth.example.com/oauth/token"
                                    value={tokenUrl}
                                    onTextChange={setTokenUrl}
                                />
                            )}

                            <TextField
                                label="Refresh URL (optional)"
                                placeholder="https://auth.example.com/oauth/refresh"
                                value={refreshUrl}
                                onTextChange={setRefreshUrl}
                            />
                        </Section>

                        <Section>
                            <SectionHeader>
                                <SectionTitle>Scopes</SectionTitle>
                            </SectionHeader>

                            {Object.keys(scopes).length > 0 ? (
                                <ScopeEntries>
                                    {Object.entries(scopes).map(([scope, description]) => (
                                        <ScopeEntryRow key={scope}>
                                            <div>
                                                <ScopeEntryTitle>{scope}</ScopeEntryTitle>
                                                <ScopeEntryDesc>
                                                    {description}
                                                </ScopeEntryDesc>
                                            </div>
                                            <Button
                                                appearance="secondary"
                                                onClick={() => handleRemoveScope(scope)}
                                                sx={{ fontSize: 11 }}
                                            >
                                                <Codicon name="trash" />
                                            </Button>
                                        </ScopeEntryRow>
                                    ))}
                                </ScopeEntries>
                            ) : (
                                <Typography
                                    variant="body2"
                                    sx={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginBottom: 12 }}
                                >
                                    No scopes yet
                                </Typography>
                            )}

                            <TextField
                                label="Scope Name"
                                placeholder="e.g., read:users, write:data"
                                value={scopeName}
                                onTextChange={setScopeName}
                            />
                            <TextField
                                label="Scope Description"
                                placeholder="What this scope allows"
                                value={scopeDesc}
                                onTextChange={setScopeDesc}
                                sx={{ marginTop: 8 }}
                            />
                            <Button
                                appearance="primary"
                                onClick={handleAddScope}
                                disabled={!scopeName.trim() || !scopeDesc.trim()}
                                sx={{ fontSize: 11, marginTop: 8 }}
                            >
                                <Codicon name="plus" sx={{ marginRight: 4 }} />
                                Add Scope
                            </Button>
                        </Section>
                    </>
                )}

                {type === 'openIdConnect' && (
                    <Section>
                        <SectionHeader>
                            <SectionTitle>OpenID Connect</SectionTitle>
                        </SectionHeader>
                        <TextField
                            label="OpenID Connect URL"
                            required
                            placeholder="https://example.com/.well-known/openid-configuration"
                            value={openIdConnectUrl}
                            onTextChange={setOpenIdConnectUrl}
                        />
                    </Section>
                )}
            </FormStack>
        </EntityModal>
    );
};
