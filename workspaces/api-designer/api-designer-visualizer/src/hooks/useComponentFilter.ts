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

import { useState, useMemo, useCallback } from 'react';

export type ComponentFilterType = 'schemas' | 'parameters' | 'headers' | 'requestBodies' | 'responses' | 'securitySchemes' | 'examples' | 'links' | 'callbacks';

export interface ComponentItem {
    type: ComponentFilterType;
    name: string;
    data: any;
}

export interface UseComponentFilterOptions {
    components?: Record<ComponentFilterType, Record<string, any>>;
}

export interface UseComponentFilterReturn {
    searchQuery: string;
    selectedType: ComponentFilterType | 'all';
    setSearchQuery: (query: string) => void;
    setSelectedType: (type: ComponentFilterType | 'all') => void;
    filteredComponents: ComponentItem[];
    componentCounts: Record<ComponentFilterType, number>;
}

/**
 * Hook for filtering and searching components
 */
export function useComponentFilter(
    options: UseComponentFilterOptions
): UseComponentFilterReturn {
    const { components = {} as Record<ComponentFilterType, Record<string, any>> } = options;
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<ComponentFilterType | 'all'>('all');

    const componentCounts = useMemo(() => {
        const counts = {} as Record<ComponentFilterType, number>;
        (Object.keys(components) as ComponentFilterType[]).forEach((type) => {
            counts[type] = Object.keys(components[type] || {}).length;
        });
        return counts;
    }, [components]);

    const filteredComponents = useMemo(() => {
        const items: ComponentItem[] = [];
        
        const typesToFilter = selectedType === 'all' 
            ? (Object.keys(components) as ComponentFilterType[])
            : [selectedType];

        typesToFilter.forEach((type) => {
            const typeComponents = components[type] || {};
            Object.entries(typeComponents).forEach(([name, data]) => {
                // Filter by search query
                if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    const matchesName = name.toLowerCase().includes(query);
                    const matchesDescription = data?.description?.toLowerCase().includes(query);
                    if (!matchesName && !matchesDescription) {
                        return;
                    }
                }
                
                items.push({ type, name, data });
            });
        });

        return items;
    }, [components, searchQuery, selectedType]);

    return {
        searchQuery,
        selectedType,
        setSearchQuery,
        setSelectedType,
        filteredComponents,
        componentCounts
    };
}

