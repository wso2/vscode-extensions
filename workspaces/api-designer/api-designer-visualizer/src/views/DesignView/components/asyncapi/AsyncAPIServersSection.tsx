/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React from 'react';
import { ServersSection, Server } from '../api-info/ServersSection';

interface AsyncAPIServersSectionProps {
    servers: Record<string, any>;
    onServersUpdate: (servers: Record<string, any>) => void;
    onAIPromptClick?: (context: string, path: string, event?: React.MouseEvent) => void;
    isAIAvailable?: boolean;
}

export const AsyncAPIServersSection: React.FC<AsyncAPIServersSectionProps> = (props) => {
    const { servers, onServersUpdate } = props;

    // Convert AsyncAPI servers (object) to OpenAPI servers (array)
    const serversArray: Server[] = Object.entries(servers || {}).map(([name, server]) => ({
        url: server.url || '',
        description: server.description || `${name} - ${server.protocol || 'unknown protocol'}`
    }));

    const handleAddServer = () => {
        const newServerName = `server${Object.keys(servers).length + 1}`;
        onServersUpdate({
            ...servers,
            [newServerName]: {
                url: 'mqtt://localhost:1883',
                protocol: 'mqtt',
                description: 'New server'
            }
        });
    };

    const handleEditServer = (index: number) => {
        // Future: Open server editor modal
        console.log('Edit server:', index);
    };

    const handleRemoveServer = (index: number) => {
        const serverNames = Object.keys(servers);
        if (serverNames[index]) {
            const newServers = { ...servers };
            delete newServers[serverNames[index]];
            onServersUpdate(newServers);
        }
    };

    return (
        <ServersSection
            servers={serversArray}
            onAddServer={handleAddServer}
            onEditServer={handleEditServer}
            onRemoveServer={handleRemoveServer}
        />
    );
};
