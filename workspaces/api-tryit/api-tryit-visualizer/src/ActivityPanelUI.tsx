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

import React, { useState, useEffect } from 'react';
import { ExplorerView } from './ExplorerView/ExplorerView';
import { getVSCodeAPI } from './utils/vscode-api';
import type { ApiRequest } from '@wso2/api-tryit-core';

interface RequestItem {
	id: string;
	name: string;
	type?: 'collection' | 'folder' | 'request';
	method?: string;
	request?: ApiRequest;
	filePath?: string;
	children?: RequestItem[];
}

export const ActivityPanelUI: React.FC = () => {
	const [collections, setCollections] = useState<RequestItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const vscode = getVSCodeAPI();

	useEffect(() => {
		// Listen for messages from the extension
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			if (message.command === 'updateCollections') {
				setCollections(message.collections || []);
				setIsLoading(false);
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, []);

	// Request initial data when component mounts
	useEffect(() => {
		if (vscode) {
			// Send ready message first
			vscode.postMessage({
				command: 'webviewReady'
			});
			// Then request collections
			vscode.postMessage({
				command: 'getCollections'
			});
		}
	}, [vscode]);

	useEffect(() => {
	}, [collections, isLoading]);

	return <ExplorerView collections={collections} isLoading={isLoading} />;
};
