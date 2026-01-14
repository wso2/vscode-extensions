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

import React, { useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { TreeView, TreeViewItem, Codicon } from '@wso2/ui-toolkit';
import { getVSCodeAPI } from '../utils/vscode-api';
import type { ApiRequest } from '@wso2/api-tryit-core';

interface RequestItem {
	id: string;
	name: string;
	method?: string;
	type?: 'collection' | 'folder' | 'request';
	request?: ApiRequest;
	filePath?: string;
	children?: RequestItem[];
}

const Container = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	padding: 0;
	font-family: var(--vscode-font-family);
	color: var(--vscode-foreground);
	font-size: 13px;
	background-color: var(--vscode-sideBar-background);
	box-sizing: border-box;
`;

const ControlsContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px;
	border-bottom: 1px solid var(--vscode-sideBar-border);
	flex-shrink: 0;
	background-color: var(--vscode-sideBar-background);
`;

const ButtonRow = styled.div`
	display: flex;
	gap: 8px;
`;

const SearchBoxContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	background-color: var(--vscode-input-background);
	border: 1px solid var(--vscode-input-border);
	border-radius: 2px;
	padding: 4px 8px;
	transition: border-color 0.2s;
	width: 100%;
	box-sizing: border-box;

	&:focus-within {
		border-color: var(--vscode-focusBorder);
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}
`;

const SearchInput = styled.input`
	flex: 1;
	background: transparent;
	border: none;
	outline: none;
	color: var(--vscode-input-foreground);
	font-size: 13px;
	font-family: var(--vscode-font-family);
	padding: 0 2px;

	&::placeholder {
		color: var(--vscode-input-placeholderForeground);
	}
`;

const ClearButton = styled.button<{ visible: boolean }>`
	background: transparent;
	border: none;
	color: var(--vscode-input-placeholderForeground);
	cursor: pointer;
	padding: 0 4px;
	display: ${props => props.visible ? 'flex' : 'none'};
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	font-size: 14px;
	height: 20px;
	width: 20px;
	line-height: 20px;

	&:hover {
		color: var(--vscode-foreground);
	}
`;

const NewRequestButton = styled.button`
	background-color: var(--vscode-button-background);
	color: var(--vscode-button-foreground);
	border: 1px solid transparent;
	border-radius: 2px;
	padding: 6px 12px;
	cursor: pointer;
	font-size: 13px;
	font-family: var(--vscode-font-family);
	font-weight: 500;
	white-space: nowrap;
	transition: background-color 0.2s;
	height: 28px;
	line-height: 16px;
	width: 100%;

	&:hover {
		background-color: var(--vscode-button-hoverBackground);
	}

	&:active {
		opacity: 0.8;
	}
`;

const TreeViewContainer = styled.div`
	flex: 1;
	overflow-y: auto;
	padding: 8px 0;

	&::-webkit-scrollbar {
		width: 12px;
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--vscode-scrollbarSlider-background);
		border-radius: 6px;

		&:hover {
			background: var(--vscode-scrollbarSlider-hoverBackground);
		}

		&:active {
			background: var(--vscode-scrollbarSlider-activeBackground);
		}
	}
`;

const MethodBadge = styled.span<{ method: string }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 2px 8px;
	margin-left: 8px;
	border-radius: 3px;
	font-size: 11px;
	font-weight: 600;
	color: white;
	white-space: nowrap;
	background-color: ${(props) => getMethodBgColor(props.method)};
`;

const RequestItemContainer = styled.div`
	display: flex;
	align-items: center;
    padding: 2px 0 2px 4px;
	gap: 8px;
`;

interface ExplorerViewProps {
	collections?: RequestItem[];
	isLoading?: boolean;
}

// Custom collapsible component for collections
interface CollectionTreeViewProps {
	item: RequestItem;
	selectedId?: string;
	onSelect: (id: string) => void;
	renderTreeItem: (item: RequestItem, depth?: number) => React.ReactNode;
}

const CollectionTreeView: React.FC<CollectionTreeViewProps> = ({ item, selectedId, onSelect, renderTreeItem }) => {
	const [isExpanded, setIsExpanded] = useState(true); // Collections start expanded

	const handleToggle = useCallback(() => {
		setIsExpanded(!isExpanded);
		onSelect(item.id);
	}, [isExpanded, onSelect, item.id]);

	return (
		<div>
			<CollectionHeader
				onClick={handleToggle}
				isSelected={selectedId === item.id}
			>
				<IconContainer>
					{isExpanded ? '▼' : '▶'}
				</IconContainer>
				<span>{item.name}</span>
			</CollectionHeader>
			{isExpanded && item.children && (
				<CollectionChildren>
					{item.children.map((child, idx) => (
						<React.Fragment key={`${item.id}-${idx}`}>
							{renderTreeItem(child, 1)}
						</React.Fragment>
					))}
				</CollectionChildren>
			)}
		</div>
	);
};

const CollectionHeader = styled.div<{ isSelected: boolean }>`
	display: flex;
	align-items: center;
	padding: 3px 0;
	cursor: pointer;
	background-color: ${props => props.isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'};
	color: ${props => props.isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)'};
	&:hover {
		background-color: var(--vscode-list-hoverBackground);
	}
`;

const IconContainer = styled.span`
	margin-right: 4px;
	font-size: 11px;
	width: 14px;
	text-align: center;
`;

const CollectionChildren = styled.div`
	padding-left: 20px;
`;

export const ExplorerView: React.FC<ExplorerViewProps> = ({ collections = [], isLoading = false }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedId, setSelectedId] = useState<string>();
	const vscode = getVSCodeAPI();

	// Helper function to check if an item or its descendants are selected
	const isItemSelected = useCallback((item: RequestItem): boolean => {
		if (item.id === selectedId) return true;
		if (item.children) {
			return item.children.some(child => isItemSelected(child));
		}
		return false;
	}, [selectedId]);

	const handleSearch = useCallback((value: string) => {
		setSearchTerm(value);
		if (vscode) {
			vscode.postMessage({
				command: 'search',
				value
			});
		}
	}, [vscode]);

	const handleClearSearch = useCallback(() => {
		setSearchTerm('');
		if (vscode) {
			vscode.postMessage({
				command: 'clearSearch'
			});
		}
	}, [vscode]);

	const handleNewRequest = useCallback(() => {
		if (vscode) {
			vscode.postMessage({
				command: 'newRequest'
			});
		}
	}, [vscode]);

	const handleSelectItem = useCallback((id: string) => {
		setSelectedId(id);
		if (vscode) {
			// Find the item in collections to check if it's a request
			const findItem = (items: RequestItem[]): RequestItem | undefined => {
				for (const item of items) {
					if (item.id === id) {
						return item;
					}
					if (item.children) {
						const found = findItem(item.children);
						if (found) return found;
					}
				}
				return undefined;
			};

			const selectedItem = findItem(collections);
			
			// Only navigate if it's a request item (has method and request object)
			if (selectedItem && selectedItem.type === 'request' && selectedItem.request) {
				vscode.postMessage({
					command: 'openRequest',
					request: selectedItem
				});
			}
		}
	}, [vscode, collections]);

	const renderTreeItem = (item: RequestItem, depth = 0) => {
		// For requests (leaf items), render as TreeViewItem
		if (item.type === 'request') {
			const isSelected = isItemSelected(item);
			return (
				<TreeViewItem
					key={item.id}
					id={item.id}
					selectedId={selectedId}
					onSelect={handleSelectItem}
				>
					<RequestItemContainer style={{
						color: isSelected ? '#007acc' : 'inherit'
					}}>
						<Codicon name="symbol-method" sx={{ display: 'inline' }} />
						<span>{item.name}</span>
						{item.method && (
							<MethodBadge method={item.method}>
								{item.method}
							</MethodBadge>
						)}
					</RequestItemContainer>
				</TreeViewItem>
			);
		}

		// For collections and folders, render as TreeView with children
		const isSelected = isItemSelected(item);
		const iconName = item.type === 'collection' ? 'package' : 'folder';
		return (
			<TreeView
				key={`${item.id}-${item.children?.length || 0}`}
				id={item.id}
				content={
					<div style={{
						fontWeight: isSelected ? 'bold' : 'normal',
                        display: 'flex',
                        flexDirection: 'row',
					}}>
						<Codicon name={iconName} sx={{ marginRight: 8 }} />
						{item.name}
					</div>
				}
				selectedId={selectedId}
				onSelect={handleSelectItem}
				expandByDefault={depth === 0}
                rootTreeView={item.type === 'collection'}
			>
				{item.children && item.children.map((child, idx) => (
					<React.Fragment key={`${item.id}-${idx}`}>
						{renderTreeItem(child, depth + 1)}
					</React.Fragment>
				))}
			</TreeView>
		);
	};

	return (
		<Container>
			<ControlsContainer>
				<NewRequestButton onClick={handleNewRequest}>
					+ New Request
				</NewRequestButton>
				<SearchBoxContainer>
					<span style={{ fontSize: '14px' }}>🔍</span>
					<SearchInput
						type="text"
						placeholder="Search..."
						value={searchTerm}
						onChange={(e) => handleSearch(e.target.value)}
						aria-label="Search API requests"
					/>
					<ClearButton
						visible={searchTerm.length > 0}
						onClick={handleClearSearch}
						title="Clear search"
					>
						✕
					</ClearButton>
				</SearchBoxContainer>
			</ControlsContainer>

			<TreeViewContainer>
				{isLoading ? (
					<div style={{ padding: '16px', opacity: 0.6 }}>
						Loading API collections...
					</div>
				) : collections.length > 0 ? (
					collections.map((collection, idx) => (
						<React.Fragment key={`collection-${idx}`}>
							{renderTreeItem(collection)}
						</React.Fragment>
					))
				) : (
					<div style={{ padding: '16px', opacity: 0.6 }}>
						No API collections found
					</div>
				)}
			</TreeViewContainer>
		</Container>
	);
};

// Helper function to get method-specific background color
function getMethodBgColor(method: string): string {
	const methods: Record<string, string> = {
		GET: '#3498DB',
		POST: '#2ECC71',
		PUT: '#F39C12',
		DELETE: '#E74C3C',
		PATCH: '#9B59B6',
		HEAD: '#95A5A6',
		OPTIONS: '#1ABC9C'
	};

	return methods[method.toUpperCase()] || '#95A5A6';
}
