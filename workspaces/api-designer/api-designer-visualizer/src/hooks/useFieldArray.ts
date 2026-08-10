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

import { useState, useCallback, useEffect } from 'react';

export interface UseFieldArrayOptions<T> {
    initialItems: T[];
    isOpen?: boolean;
}

export interface UseFieldArrayReturn<T> {
    items: T[];
    editingIndex: number | null;
    isAdding: boolean;
    setItems: (items: T[]) => void;
    add: () => void;
    edit: (index: number) => void;
    save: (item: T) => void;
    remove: (index: number) => void;
    cancel: () => void;
    getEditingItem: () => T | null;
}

/**
 * Hook for managing array fields in forms (e.g., servers, tags, parameters)
 * Handles adding, editing, and removing items from an array
 */
export function useFieldArray<T extends Record<string, any>>(
    options: UseFieldArrayOptions<T>
): UseFieldArrayReturn<T> {
    const { initialItems, isOpen = true } = options;
    
    const [items, setItems] = useState<T[]>(initialItems);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Reset when modal opens or initial items change
    useEffect(() => {
        if (isOpen) {
            setItems(initialItems);
            setEditingIndex(null);
            setIsAdding(false);
        }
    }, [isOpen, initialItems]);

    const add = useCallback(() => {
        setEditingIndex(null);
        setIsAdding(true);
    }, []);

    const edit = useCallback((index: number) => {
        setEditingIndex(index);
        setIsAdding(false);
    }, []);

    const save = useCallback((item: T) => {
        setItems((prevItems) => {
            if (editingIndex !== null && editingIndex >= 0 && editingIndex < prevItems.length) {
                // Editing existing item
                const updated = [...prevItems];
                updated[editingIndex] = item;
                return updated;
            } else {
                // Adding new item
                return [...prevItems, item];
            }
        });
        setEditingIndex(null);
        setIsAdding(false);
    }, [editingIndex]);

    const remove = useCallback((index: number) => {
        setItems((prevItems) => prevItems.filter((_, i) => i !== index));
    }, []);

    const cancel = useCallback(() => {
        setEditingIndex(null);
        setIsAdding(false);
    }, []);

    const getEditingItem = useCallback((): T | null => {
        if (editingIndex !== null && editingIndex >= 0 && editingIndex < items.length) {
            return items[editingIndex];
        }
        return null;
    }, [editingIndex, items]);

    return {
        items,
        editingIndex,
        isAdding,
        setItems,
        add,
        edit,
        save,
        remove,
        cancel,
        getEditingItem
    };
}

