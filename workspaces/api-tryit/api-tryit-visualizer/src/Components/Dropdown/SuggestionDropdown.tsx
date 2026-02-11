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

import React, { useRef, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';

interface SuggestionDropdownProps {
    value: string;
    suggestions: string[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

const Container = styled.div`
    position: relative;
    width: 100%;
    height: 30px;
`;

const InputContainer = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
`;

const StyledInput = styled.input`
    width: 100%;
    height: 100%;
    padding: 0 24px 0 8px;
    border: 1px solid var(--vscode-dropdown-border);
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: var(--vscode-font-size);
    border-radius: 2px;
    outline: none;
    font-family: inherit;
    
    &:focus {
        border-color: var(--vscode-focusBorder);
    }
    
    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
`;

const DropdownButton = styled.button`
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--vscode-icon-foreground);
    
    &:hover {
        color: var(--vscode-icon-foreground);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const OptionsContainer = styled.div<{ isOpen: boolean }>`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 2px;
    background-color: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 2px;
    max-height: 150px;
    overflow-y: auto;
    z-index: 1000;
    display: ${props => props.isOpen ? 'block' : 'none'};
    padding: 4px 0;
    list-style: none;
    
    &::-webkit-scrollbar {
        width: 10px;
    }
    
    &::-webkit-scrollbar-track {
        background: var(--vscode-dropdown-background);
    }
    
    &::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
    }
`;

const OptionItem = styled.div<{ isSelected: boolean; isHovered: boolean }>`
    padding: 6px 12px;
    cursor: pointer;
    background-color: ${props => props.isHovered ? 'var(--vscode-list-hoverBackground)' : 'transparent'};
    color: ${props => props.isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-editor-foreground)'};
    font-size: var(--vscode-font-size);
    user-select: none;
    
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const NoResults = styled.div`
    padding: 8px 12px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    text-align: center;
    user-select: none;
`;

export const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
    value,
    suggestions,
    onChange,
    placeholder = 'Select...',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState(value);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const justSelectedRef = useRef(false);
    const isSelectingRef = useRef(false);

    // Sync query with value only after a selection was made
    React.useEffect(() => {
        if (justSelectedRef.current) {
            setQuery('');
            justSelectedRef.current = false;
        } else {
            setQuery(value);
        }
    }, [value]);

    const filteredSuggestions = query === ''
        ? suggestions
        : suggestions.filter(suggestion =>
            suggestion.toLowerCase().includes(query.toLowerCase())
        );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        // Don't call onChange during typing - only on selection
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    const handleInputBlur = () => {
        // Don't commit if we're in the process of selecting an option
        if (isSelectingRef.current) {
            return;
        }
        // When input loses focus, if there's a custom query value, commit it
        if (query && query !== value) {
            onChange(query);
        }
        setIsOpen(false);
    };

    const handleOptionSelect = (option: string) => {
        // Mark that we're selecting to prevent blur interference
        isSelectingRef.current = true;
        // Only call onChange when user commits a selection
        onChange(option);
        justSelectedRef.current = true;
        setIsOpen(false);
        setHoveredIndex(null);
        // Reset the flag after a small delay to allow blur to be skipped
        setTimeout(() => {
            isSelectingRef.current = false;
        }, 0);
    };

    const handleToggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                inputRef.current?.focus();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else if (hoveredIndex === null) {
                setHoveredIndex(0);
            } else if (hoveredIndex < filteredSuggestions.length - 1) {
                setHoveredIndex(hoveredIndex + 1);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (hoveredIndex === null) {
                setHoveredIndex(filteredSuggestions.length - 1);
            } else if (hoveredIndex > 0) {
                setHoveredIndex(hoveredIndex - 1);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (hoveredIndex !== null) {
                handleOptionSelect(filteredSuggestions[hoveredIndex]);
            } else if (query) {
                // If user types something and presses Enter without selecting from dropdown, commit the typed value
                handleOptionSelect(query);
            }
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <Container ref={containerRef}>
            <InputContainer>
                <StyledInput
                    ref={inputRef}
                    type="text"
                    value={query || value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                <DropdownButton
                    onClick={handleToggleDropdown}
                    disabled={disabled}
                    tabIndex={-1}
                >
                    <Codicon name={isOpen ? 'chevron-up' : 'chevron-down'} />
                </DropdownButton>
            </InputContainer>

            <OptionsContainer isOpen={isOpen && filteredSuggestions.length > 0}>
                {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((suggestion, index) => (
                        <OptionItem
                            key={index}
                            isSelected={value === suggestion}
                            isHovered={hoveredIndex === index}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur from firing
                                handleOptionSelect(suggestion);
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {suggestion}
                        </OptionItem>
                    ))
                ) : (
                    <NoResults>No results found</NoResults>
                )}
            </OptionsContainer>
        </Container>
    );
};
