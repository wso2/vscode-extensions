/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React from 'react';
import { ComponentsSection } from '../components-section/ComponentsSection';

interface AsyncAPIComponentsSectionProps {
    components: Record<string, any>;
    onComponentsUpdate: (componentType: string, components: Record<string, any>) => void;
    onAIPromptClick?: (context: string, path: string, event?: React.MouseEvent) => void;
    isAIAvailable?: boolean;
    onComponentClick?: (type: string, name: string, data: any) => void;
    onComponentRemove?: (type: string, name: string) => void;
    onAddComponent?: (type: string) => void;
}

export const AsyncAPIComponentsSection: React.FC<AsyncAPIComponentsSectionProps> = (props) => {
    const { components, onComponentsUpdate, onComponentClick, onComponentRemove, onAddComponent } = props;

    const handleComponentClick = (type: any, name: string, data: any) => {
        if (onComponentClick) {
            onComponentClick(type, name, data);
        }
    };

    const handleComponentRemove = (type: any, name: string) => {
        if (onComponentRemove) {
            onComponentRemove(type, name);
        }
    };

    const handleAddComponent = (type: any) => {
        if (onAddComponent) {
            onAddComponent(type);
        }
    };

    return (
        <ComponentsSection
            components={components}
            validationData={null}
            onComponentClick={handleComponentClick}
            onComponentRemove={handleComponentRemove}
            onAddComponent={handleAddComponent}
        />
    );
};
