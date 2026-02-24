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

import type { Meta, StoryObj } from '@storybook/react';
import { HurlRunResults, HurlRunFileView } from './HurlRunResults';

const runFile: HurlRunFileView = {
	filePath: '/workspace/api-test/multiDemo.hurl',
	status: 'failed',
	durationMs: 1929,
	assertions: [],
	entries: [
		{
			name: 'Create post',
			method: 'POST',
			status: 'failed',
			durationMs: 498,
			line: 4,
			assertions: [
				{
					filePath: '/workspace/api-test/multiDemo.hurl',
					entryName: 'Create post',
					expression: 'status == 202',
					status: 'failed',
					expected: 'integer <202>',
					actual: 'integer <201>',
					line: 15,
					message: 'Assert failure'
				},
				{
					filePath: '/workspace/api-test/multiDemo.hurl',
					entryName: 'Create post',
					expression: 'HTTP 201',
					status: 'passed'
				}
			]
		},
		{
			name: 'Delete post',
			method: 'DELETE',
			status: 'passed',
			durationMs: 82,
			line: 18,
			assertions: [
				{
					filePath: '/workspace/api-test/multiDemo.hurl',
					entryName: 'Delete post',
					expression: 'HTTP 200',
					status: 'passed'
				},
				{
					filePath: '/workspace/api-test/multiDemo.hurl',
					entryName: 'Delete post',
					expression: 'status == 200',
					status: 'passed'
				}
			]
		},
		{
			name: 'Update post',
			method: 'PUT',
			status: 'passed',
			durationMs: 91,
			line: 27,
			assertions: [
				{
					filePath: '/workspace/api-test/multiDemo.hurl',
					entryName: 'Update post',
					expression: 'HTTP 200',
					status: 'passed'
				},
				{
					filePath: '/workspace/api-test/multiDemo.hurl',
					entryName: 'Update post',
					expression: 'status == 200',
					status: 'passed'
				}
			]
		},
		{
			name: 'Test',
			method: 'POST',
			status: 'error',
			durationMs: 15,
			line: 38,
			errorMessage: 'file tests.zip can not be read',
			assertions: []
		},
		{
			name: 'Head Request',
			method: 'HEAD',
			status: 'passed',
			durationMs: 42,
			line: 44,
			assertions: [
				{
					filePath: '/workspace/api-test/multiDemo.hurl',
					entryName: 'Head Request',
					expression: 'HTTP 200',
					status: 'passed'
				}
			]
		}
	]
};

const meta: Meta<typeof HurlRunResults> = {
	title: 'API TryIt/Output/HurlRunResults',
	component: HurlRunResults,
	parameters: {
		layout: 'fullscreen'
	},
	args: {
		context: {
			scope: 'collection',
			label: 'Multi Demo',
			sourcePath: '/workspace/api-test'
		}
	}
};

export default meta;
type Story = StoryObj<typeof HurlRunResults>;

export const Running: Story = {
	args: {
		status: 'running',
		completedFiles: 0,
		totalFiles: 1,
		files: [
			{
				...runFile,
				status: 'running',
				entries: runFile.entries.map(entry => ({ ...entry, status: 'passed', assertions: [] }))
			}
		]
	}
};

export const Failed: Story = {
	args: {
		status: 'failed',
		completedFiles: 1,
		totalFiles: 1,
		files: [runFile]
	}
};

export const Error: Story = {
	args: {
		status: 'error',
		completedFiles: 0,
		totalFiles: 0,
		errorMessage: 'hurl command is not available in PATH.',
		files: []
	}
};
