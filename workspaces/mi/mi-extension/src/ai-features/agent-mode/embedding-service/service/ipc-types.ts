/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export type IpcProtocolVersion = '1.0';

export const IPC_PROTOCOL_VERSION: IpcProtocolVersion = '1.0';

export type IpcRequestMethod =
	| 'init'
	| 'health'
	| 'index.initial'
	| 'index.incremental'
	| 'notify.fileChange'
	| 'search.semantic'
	| 'shutdown'
	| 'status.get';

export type IpcEventMethod =
	| 'status.changed'
	| 'index.progress'
	| 'worker.log';

export type IpcErrorCode =
	| 'TIMEOUT'
	| 'INVALID_PAYLOAD'
	| 'MODEL_NOT_READY'
	| 'DB_ERROR'
	| 'INDEX_ERROR'
	| 'INDEX_NOT_READY'
	| 'WORKER_NOT_READY'
	| 'INTERNAL';

export interface IpcMessageBase {
	v: IpcProtocolVersion;
	id: string;
	ts: number;
}

export interface IpcRequestMessage<TPayload = unknown> extends IpcMessageBase {
	type: 'request';
	method: IpcRequestMethod;
	payload: TPayload;
}

export interface IpcErrorShape {
	code: IpcErrorCode;
	message: string;
	retryable: boolean;
	details?: Record<string, unknown>;
}

export interface IpcResponseMessage<TResult = unknown> extends IpcMessageBase {
	type: 'response';
	method: IpcRequestMethod;
	ok: boolean;
	payload?: TResult;
	error?: IpcErrorShape;
}

export interface IpcEventMessage<TPayload = unknown> extends IpcMessageBase {
	type: 'event';
	method: IpcEventMethod;
	payload: TPayload;
}

export type IpcInboundMessage = IpcRequestMessage;
export type IpcOutboundMessage = IpcResponseMessage | IpcEventMessage;

export interface InitRequestPayload {
	projectPath: string;
	artifactsSubPath: string;
	dbPath: string;
	modelRootPath: string;
	pollIntervalMs: number;
}

export interface HealthRequestPayload {
	ping?: true;
}

export interface IndexInitialRequestPayload {
	directories: string[];
}

export interface IndexIncrementalRequestPayload {
	directories?: string[];
	changedFiles?: string[];
}

export interface NotifyFileChangeRequestPayload {
	filePath: string;
}

export interface SemanticSearchRequestPayload {
	query: string;
	topK: number;
	scoreThreshold: number;
}

export interface ShutdownRequestPayload {
	reason?: string;
}

export interface WorkerStatusPayload {
	available: boolean;
	initializing: boolean;
	chunkCount: number;
	projectPath?: string;
	reason?: string;
}

export interface SemanticSearchHit {
	id: string;
	filePath: string;
	chunkType: string;
	startLine: number;
	endLine: number;
	context: Record<string, unknown>;
	score: number;
}

export interface SemanticSearchResponsePayload {
	query: string;
	latencyMs: number;
	totalChunksScanned: number;
	hits: SemanticSearchHit[];
}

export interface IndexProgressEventPayload {
	stage: 'scanning' | 'embedding' | 'updating' | 'complete';
	detail: string;
	fileIndex: number;
	totalFiles: number;
}

export interface WorkerLogEventPayload {
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
}

export function createIpcMessageBase(id: string): IpcMessageBase {
	return {
		v: IPC_PROTOCOL_VERSION,
		id,
		ts: Date.now(),
	};
}
