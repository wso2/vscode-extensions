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

const failedFile: HurlRunFileView = {
	filePath: '/workspace/api-test/payments/update-payment.hurl',
	status: 'failed',
	durationMs: 198,
	assertions: [
		{
			filePath: '/workspace/api-test/payments/update-payment.hurl',
			expression: 'status == 200',
			status: 'failed',
			expected: '200',
			actual: '500',
			line: 28,
			message: 'Expected HTTP status 200'
		},
		{
			filePath: '/workspace/api-test/payments/update-payment.hurl',
			expression: 'jsonpath "$.paymentId" exists',
			status: 'failed',
			actual: 'null',
			line: 30,
			message: 'paymentId is missing'
		},
		{
			filePath: '/workspace/api-test/payments/update-payment.hurl',
			expression: 'header "content-type" contains "application/json"',
			status: 'passed'
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
			label: 'Multi Hurl Demo',
			sourcePath: '/workspace/api-test/multi-hurl-demo'
		}
	}
};

export default meta;
type Story = StoryObj<typeof HurlRunResults>;

export const Running: Story = {
	args: {
		status: 'running',
		completedFiles: 2,
		totalFiles: 5,
		files: [
			{
				filePath: '/workspace/api-test/payments/create-payment.hurl',
				status: 'passed',
				durationMs: 142,
				assertions: [
					{
						filePath: '/workspace/api-test/payments/create-payment.hurl',
						expression: 'status == 201',
						status: 'passed'
					}
				]
			},
			{
				filePath: '/workspace/api-test/payments/get-payment.hurl',
				status: 'running',
				assertions: []
			},
			failedFile
		]
	}
};

export const Failed: Story = {
	args: {
		status: 'failed',
		completedFiles: 5,
		totalFiles: 5,
		summary: {
			totalFiles: 5,
			passedFiles: 3,
			failedFiles: 2,
			errorFiles: 0,
			skippedFiles: 0,
			totalEntries: 5,
			passedEntries: 3,
			failedEntries: 2
		},
		files: [
			{
				filePath: '/workspace/api-test/payments/create-payment.hurl',
				status: 'passed',
				durationMs: 142,
				assertions: [{ filePath: '/workspace/api-test/payments/create-payment.hurl', expression: 'status == 201', status: 'passed' }]
			},
			failedFile,
			{
				filePath: '/workspace/api-test/payments/history.hurl',
				status: 'passed',
				durationMs: 98,
				assertions: [{ filePath: '/workspace/api-test/payments/history.hurl', expression: 'status == 200', status: 'passed' }]
			}
		]
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
