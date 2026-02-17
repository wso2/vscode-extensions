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

import React, { useState, useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import { TreeViewItem, Codicon } from '@wso2/ui-toolkit';
import { getVSCodeAPI } from '../utils/vscode-api';
import { getMethodBgColor } from '../utils/methods';
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
    padding: 2px 0 2px 0;
	gap: 8px;
`;

interface ExplorerViewProps {
	collections?: RequestItem[];
	isLoading?: boolean;
	clearSelectionTrigger?: number;
	selectedItemId?: string;
	expandItemIds?: string[];
}

// Custom collapsible component props
interface TreeViewProps {
	item: RequestItem;
	selectedId?: string;
	onSelect: (id: string) => void;
	renderTreeItem: (item: RequestItem, depth?: number) => React.ReactNode;
	isExpanded: boolean;
	onToggle: (id: string) => void;
}
const CollectionHeader = styled.div<{ isSelected: boolean }>`
	display: flex;
	align-items: center;
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

const AddButton = styled.button`
	background: transparent;
	border: none;
	color: var(--vscode-foreground);
	cursor: pointer;
	padding: 2px;
	margin-left: auto;
	margin-right: 6px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: 2px;
	font-size: 12px;

	&:hover {
		background: var(--vscode-list-hoverBackground);
		color: var(--vscode-foreground);
	}
`;

const CollectionChildren = styled.div`
	padding-left: 20px;
`;

const FolderHeader = styled(CollectionHeader)`
	// Same styling as CollectionHeader but for folders
`;

const ContextMenu = styled.div<{ x: number; y: number; visible: boolean }>`
	display: ${props => props.visible ? 'flex' : 'none'};
	flex-direction: column;
	position: fixed;
	padding: 4px;
	top: ${props => props.y}px;
	left: ${props => props.x}px;
	background: var(--vscode-menu-background);
	border: 1px solid var(--vscode-menu-border);
	border-radius: 2px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	z-index: 1000;
	min-width: 180px;
`;

// Compute a safe on-screen position for context menus. If the click is near the
// right/bottom edges, flip the menu to the left/up so it remains visible.
function computeMenuPosition(clickX: number, clickY: number, menuWidth = 220, menuHeight = 160, pad = 8) {
	let x = clickX;
	let y = clickY;
	if (typeof window !== 'undefined') {
		if (window.innerWidth - clickX < menuWidth + pad) {
			x = Math.max(pad, clickX - menuWidth);
		}
		if (window.innerHeight - clickY < menuHeight + pad) {
			y = Math.max(pad, clickY - menuHeight);
		}
	}
	return { x, y };
}

const ContextMenuItem = styled.button`
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 100%;
	padding: 6px 8px;
	background: transparent;
	border: none;
	color: var(--vscode-menu-foreground);
	cursor: pointer;
	font-size: 13px;
	font-family: var(--vscode-font-family);
	text-align: left;
	transition: background-color 0.1s;

	&:hover {
		background-color: var(--vscode-menu-selectionBackground);
		color: var(--vscode-menu-selectionForeground);
	}

	&:active {
		background-color: var(--vscode-menu-selectionBackground);
	}
`;
const FolderTreeView: React.FC<TreeViewProps & { vscode?: any; collectionId?: string; contextMenu?: { x: number; y: number; collectionId: string } | null; setContextMenu?: (menu: { x: number; y: number; collectionId: string } | null) => void }> = ({ item, selectedId, onSelect, renderTreeItem, isExpanded, onToggle, vscode, collectionId, contextMenu, setContextMenu }) => {

	const handleAddRequest = useCallback(() => {
		if (vscode) {
			vscode.postMessage({
				command: 'addRequestToFolder',
				folderId: item.id,
				folderPath: item.filePath
			});
		}
		if (setContextMenu) {
			setContextMenu(null);
		}
	}, [vscode, item.id, item.filePath, setContextMenu]);

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (setContextMenu) {
			const pos = computeMenuPosition(e.clientX, e.clientY, 200, 120);
			setContextMenu({ x: pos.x, y: pos.y, collectionId: item.id });
		}
	}, [item.id, setContextMenu]);

	return (
		<div>
			<FolderHeader
				onClick={() => onToggle(item.id)}
				onContextMenu={handleContextMenu}
				isSelected={selectedId === item.id}
			>
				<IconContainer>
					<Codicon name={isExpanded ? "chevron-down" : "chevron-right"} />
				</IconContainer>
				<Codicon name="folder" sx={{ marginRight: 8 }} />
				<span>{item.name}</span>
				<AddButton
					title={`Add request to ${item.name}`}
					aria-label={`Add request to ${item.name}`}
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						e.preventDefault();
						handleAddRequest();
					}}
				>
					<Codicon name="plus" />
				</AddButton>
			</FolderHeader>
			{contextMenu && contextMenu.collectionId === item.id && (
				<ContextMenu x={contextMenu.x} y={contextMenu.y} visible={true}>
					<ContextMenuItem onClick={handleAddRequest}>
						<Codicon name="file-add" sx={{ marginRight: 8 }} />
						Add Request
					</ContextMenuItem>
				</ContextMenu>
			)}
			{isExpanded && item.children && (
				<CollectionChildren>
					{item.children.map((child: RequestItem, idx: number) => (
						<React.Fragment key={`${item.id}-${idx}`}>
							{renderTreeItem(child, 2)}
						</React.Fragment>
					))}
				</CollectionChildren>
			)}
		</div>
	);
};

const CollectionTreeView: React.FC<TreeViewProps & { vscode?: any; collectionId?: string; contextMenu?: { x: number; y: number; collectionId: string } | null; setContextMenu?: (menu: { x: number; y: number; collectionId: string } | null) => void }> = ({ item, selectedId, onSelect, renderTreeItem, isExpanded, onToggle, vscode, collectionId, contextMenu, setContextMenu }) => {

	const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null);

	const handleSelect = useCallback(() => {
		onSelect(item.id);
	}, [onSelect, item.id]);

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (setContextMenu) {
			const pos = computeMenuPosition(e.clientX, e.clientY, 220, 140);
			setContextMenu({ x: pos.x, y: pos.y, collectionId: item.id });
		}
	}, [item.id, setContextMenu]);

	const handleAddRequest = useCallback(() => {
		if (vscode) {
			vscode.postMessage({
				command: 'addRequestToCollection',
				collectionId: item.id
			});
		}
		setAddMenu(null);
		if (setContextMenu) {
			setContextMenu(null);
		}
	}, [vscode, item.id, setContextMenu]);

	const handleAddFolder = useCallback(() => {
		if (vscode) {
			vscode.postMessage({
				command: 'addFolderToCollection',
				collectionId: item.id
			});
		}
		setAddMenu(null);
		if (setContextMenu) {
			setContextMenu(null);
		}
	}, [vscode, item.id, setContextMenu]);

	useEffect(() => {
		if (!addMenu) return;
		const handleOutside = () => setAddMenu(null);
		document.addEventListener('click', handleOutside);
		return () => document.removeEventListener('click', handleOutside);
	}, [addMenu]);

	const handleDeleteCollection = useCallback(() => {
		if (vscode) {
			vscode.postMessage({
				command: 'deleteCollection',
				collectionId: item.id
			});
		}
		if (setContextMenu) {
			setContextMenu(null);
		}
	}, [vscode, item.id, setContextMenu]);

	const handleRenameCollection = useCallback(() => {
		if (vscode) {
			vscode.postMessage({
				command: 'renameCollection',
				collectionId: item.id,
				currentName: item.name
			});
		}
		if (setContextMenu) {
			setContextMenu(null);
		}
	}, [vscode, item.id, item.name, setContextMenu]);

	return (
		<div>
			<CollectionHeader
				onClick={() => onToggle(item.id)}
				onContextMenu={handleContextMenu}
				isSelected={selectedId === item.id}
			>
				<IconContainer>
					<Codicon name={isExpanded ? "chevron-down" : "chevron-right"} />
				</IconContainer>
				<Codicon name="library" sx={{ marginRight: 8 }} />
				<span>{item.name}</span>
				<AddButton
					title={`Add to ${item.name}`}
					aria-label={`Add to ${item.name}`}
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						e.preventDefault();
						// flip the menu to the left if there's insufficient space on the right
						const MENU_WIDTH = 200; // >= ContextMenu min-width
						const MENU_HEIGHT = 140;
						const PAD = 8;
						const clickX = e.clientX;
						const clickY = e.clientY;
						let x = clickX;
						let y = clickY;
						if (window.innerWidth - clickX < MENU_WIDTH + PAD) {
							x = Math.max(PAD, clickX - MENU_WIDTH);
						}
						if (window.innerHeight - clickY < MENU_HEIGHT + PAD) {
							y = Math.max(PAD, clickY - MENU_HEIGHT);
						}
						setAddMenu({ x, y });
					}}
				>
					<Codicon name="plus" />
				</AddButton>
			</CollectionHeader>
			{addMenu && (
				<ContextMenu x={addMenu.x} y={addMenu.y} visible={true}>
					<ContextMenuItem onClick={() => { handleAddRequest(); }}>
						<Codicon name="file-add" sx={{ marginRight: 8 }} />
						Add Request
					</ContextMenuItem>
					<ContextMenuItem onClick={() => { handleAddFolder(); }}>
						<Codicon name="folder" sx={{ marginRight: 8 }} />
						Add Folder
					</ContextMenuItem>
				</ContextMenu>
			)}
			{contextMenu && contextMenu.collectionId === item.id && (
				<ContextMenu x={contextMenu.x} y={contextMenu.y} visible={true}>
					<ContextMenuItem onClick={handleAddRequest}>
						<Codicon name="file-add" sx={{ marginRight: 8 }} />
						Add Request
					</ContextMenuItem>
					<ContextMenuItem onClick={handleRenameCollection}>
						<Codicon name="edit" sx={{ marginRight: 8 }} />
						Rename Collection
					</ContextMenuItem>
					<ContextMenuItem onClick={handleDeleteCollection}>
						<Codicon name="trash" sx={{ marginRight: 8 }} />
						Delete Collection
					</ContextMenuItem>
				</ContextMenu>
			)}
			{isExpanded && item.children && (
				<CollectionChildren>
					{item.children.map((child: RequestItem, idx: number) => (
						<React.Fragment key={`${item.id}-${idx}`}>
							{renderTreeItem(child, 1)}
						</React.Fragment>
					))}
				</CollectionChildren>
			)}
		</div>
	);
};

export const ExplorerView: React.FC<ExplorerViewProps> = ({ collections = [], isLoading = false, clearSelectionTrigger = 0, selectedItemId, expandItemIds }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedId, setSelectedId] = useState<string>();
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
	const [globalContextMenu, setGlobalContextMenu] = useState<{ x: number; y: number; collectionId: string } | null>(null);

	// Clear selection when trigger changes
	useEffect(() => {
		console.log('[ExplorerView] clearSelectionTrigger changed:', clearSelectionTrigger, 'current selectedId:', selectedId);
		if (clearSelectionTrigger > 0) {
			console.log('[ExplorerView] Clearing selectedId');
			setSelectedId(undefined);
		}
	}, [clearSelectionTrigger]);

	// Apply external selection (e.g., after save) and ensure parents are expanded
	useEffect(() => {
		if (selectedItemId) {
			setSelectedId(selectedItemId);
		}
	}, [selectedItemId]);

	useEffect(() => {
		if (expandItemIds && expandItemIds.length > 0) {
			setExpandedItems(prev => {
				const next = new Set(prev);
				expandItemIds.forEach(id => next.add(id));
				return next;
			});
		}
	}, [expandItemIds]);

	// Initialize expanded state for folders (collections and folders start collapsed)
	useEffect(() => {
		setExpandedItems(prev => {
			const newSet = new Set(prev); // Preserve existing expansion states
			// Don't add any items by default - everything starts collapsed
			return newSet;
		});
	}, [collections]);
	const vscode = getVSCodeAPI();

	// Add listener to close context menu when clicking outside
	useEffect(() => {
		const handleClickOutside = () => setGlobalContextMenu(null);
		if (globalContextMenu) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	}, [globalContextMenu]);

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

	const handleToggleExpansion = useCallback((id: string) => {
		setExpandedItems(prev => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	}, []);

	const renderTreeItem = (item: RequestItem, depth = 0) => {
		// For requests (leaf items), render as TreeViewItem
		if (item.type === 'request') {
			const isSelected = isItemSelected(item);
			const handleContextMenu = (e: React.MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
			const pos = computeMenuPosition(e.clientX, e.clientY, 180, 120);
			setGlobalContextMenu({ x: pos.x, y: pos.y, collectionId: item.id });
		};

		const handleDeleteRequest = () => {
				if (vscode) {
					vscode.postMessage({
						command: 'deleteRequest',
						requestId: item.id
					});
				}
				setGlobalContextMenu(null);
			};
			const handleRenameRequest = () => {
				if (vscode) {
					vscode.postMessage({
						command: 'renameRequest',
						requestId: item.id,
						currentName: item.name
					});
				}
				setGlobalContextMenu(null);
			};

			return (
				<div key={item.id} onContextMenu={handleContextMenu}>
					<TreeViewItem
						id={item.id}
						selectedId={selectedId}
						onSelect={handleSelectItem}
						sx={{paddingLeft: 10}}
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
					{globalContextMenu && globalContextMenu.collectionId === item.id && (
						<ContextMenu x={globalContextMenu.x} y={globalContextMenu.y} visible={true}>						<ContextMenuItem onClick={handleRenameRequest}>
							<Codicon name="edit" sx={{ marginRight: 8 }} />
							Rename Request
						</ContextMenuItem>							<ContextMenuItem onClick={handleDeleteRequest}>
								<Codicon name="trash" sx={{ marginRight: 8 }} />
								Delete Request
							</ContextMenuItem>
						</ContextMenu>
					)}
				</div>
			);
		}

		// For collections, use custom CollectionTreeView for better expansion control
		if (item.type === 'collection') {
			return (
				<CollectionTreeView
					key={item.id}
					item={item}
					selectedId={selectedId}
					onSelect={handleSelectItem}
					renderTreeItem={renderTreeItem}
					isExpanded={expandedItems.has(item.id)}
					onToggle={handleToggleExpansion}
					vscode={vscode}
					collectionId={item.id}
					contextMenu={globalContextMenu}
					setContextMenu={setGlobalContextMenu}
				/>
			);
		}

		// For folders, use custom FolderTreeView for better expansion control
		if (item.type === 'folder') {
			return (
				<FolderTreeView
					key={item.id}
					item={item}
					selectedId={selectedId}
					onSelect={handleSelectItem}
					renderTreeItem={renderTreeItem}
					isExpanded={expandedItems.has(item.id)}
					onToggle={handleToggleExpansion}
					vscode={vscode}
					contextMenu={globalContextMenu}
					setContextMenu={setGlobalContextMenu}
				/>
			);
		}
	};

	return (
		<Container>
			<ControlsContainer>
				<NewRequestButton onClick={handleNewRequest}>
					New Request
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
					collections.map((collection: RequestItem, idx: number) => (
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

