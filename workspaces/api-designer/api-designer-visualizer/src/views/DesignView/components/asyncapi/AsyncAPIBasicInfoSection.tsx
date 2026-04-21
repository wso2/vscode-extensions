/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React from 'react';
import { BasicInfoSection } from '../api-info/BasicInfoSection';

interface AsyncAPIBasicInfoSectionProps {
    info: any;
    servers: Record<string, any>;
    onInfoUpdate: (updates: any) => void;
    onServersUpdate: (servers: Record<string, any>) => void;
    onAIPromptClick?: (context: string, path: string, event?: React.MouseEvent) => void;
    isAIAvailable?: boolean;
    onEdit?: () => void;
    onAddServer?: () => void;
    onEditServer?: (index: number) => void;
    onRemoveServer?: (index: number) => void;
}

export const AsyncAPIBasicInfoSection: React.FC<AsyncAPIBasicInfoSectionProps> = (props) => {
    const { 
        info, 
        servers, 
        onInfoUpdate, 
        onServersUpdate,
        onEdit,
        onAddServer,
        onEditServer,
        onRemoveServer
    } = props;

    // Convert AsyncAPI servers (object) to OpenAPI servers (array)
    const serversArray = Object.entries(servers || {}).map(([name, server]) => ({
        url: server.url || '',
        description: server.description || `${name} - ${server.protocol || 'unknown'}`
    }));

    const handleAddServer = () => {
        if (onAddServer) {
            onAddServer();
        }
    };

    const handleEditServer = (index: number) => {
        if (onEditServer) {
            onEditServer(index);
        }
    };

    const handleRemoveServer = (index: number) => {
        if (onRemoveServer) {
            onRemoveServer(index);
        }
    };

    return (
        <BasicInfoSection
            info={info}
            servers={serversArray}
            tags={[]}
            validationData={null}
            onEdit={onEdit || (() => {})}
            onAddServer={handleAddServer}
            onEditServer={handleEditServer}
            onRemoveServer={handleRemoveServer}
            onAddTag={() => {}}
            onEditTag={() => {}}
            onRemoveTag={() => {}}
        />
    );
};
