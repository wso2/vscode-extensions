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

import { FileEditHunk } from './types';

export type PatchApplyErrorCode =
    | 'INVALID_HUNK'
    | 'HUNK_NOT_FOUND'
    | 'HUNK_AMBIGUOUS'
    | 'HUNK_OVERLAP'
    | 'PATCH_APPLY_FAILED';

export interface PatchApplySuccess {
    success: true;
    newContent: string;
    appliedHunks: number;
}

export interface PatchApplyFailure {
    success: false;
    code: PatchApplyErrorCode;
    message: string;
    hunkIndex?: number;
}

export type PatchApplyResult = PatchApplySuccess | PatchApplyFailure;

interface CandidateRange {
    start: number;
    endExclusive: number;
}

interface ResolvedHunk {
    hunkIndex: number;
    start: number;
    endExclusive: number;
    oldLineCount: number;
    replacementLines: string[];
}

function normalizeLineEndings(content: string): string {
    return content.replace(/\r\n?/g, '\n');
}

function trimTrailingWhitespace(line: string): string {
    return line.replace(/[ \t]+$/g, '');
}

function toNormalizedLines(content: string): string[] {
    return normalizeLineEndings(content).split('\n').map(trimTrailingWhitespace);
}

function toNormalizedLinesPreserveTrailingWhitespace(content: string): string[] {
    return normalizeLineEndings(content).split('\n');
}

function toRawLfLines(content: string): string[] {
    return normalizeLineEndings(content).split('\n');
}

function splitReplacementLines(content: string): string[] {
    if (content.length === 0) {
        return [];
    }
    return normalizeLineEndings(content).split('\n');
}

function linesMatchAt(fileLines: string[], start: number, blockLines: string[]): boolean {
    if (start < 0 || start + blockLines.length > fileLines.length) {
        return false;
    }
    for (let i = 0; i < blockLines.length; i++) {
        if (fileLines[start + i] !== blockLines[i]) {
            return false;
        }
    }
    return true;
}

function findOldTextCandidates(fileLines: string[], oldTextLines: string[]): CandidateRange[] {
    if (oldTextLines.length === 0 || oldTextLines.length > fileLines.length) {
        return [];
    }

    const candidates: CandidateRange[] = [];
    const upperBound = fileLines.length - oldTextLines.length;
    for (let start = 0; start <= upperBound; start++) {
        if (linesMatchAt(fileLines, start, oldTextLines)) {
            candidates.push({
                start,
                endExclusive: start + oldTextLines.length,
            });
        }
    }
    return candidates;
}

function applyContextFilter(
    fileLines: string[],
    candidates: CandidateRange[],
    contextBeforeLines?: string[],
    contextAfterLines?: string[]
): CandidateRange[] {
    return candidates.filter((candidate) => {
        const beforeMatches = !contextBeforeLines || contextBeforeLines.length === 0
            || linesMatchAt(fileLines, candidate.start - contextBeforeLines.length, contextBeforeLines);
        if (!beforeMatches) {
            return false;
        }

        const afterMatches = !contextAfterLines || contextAfterLines.length === 0
            || linesMatchAt(fileLines, candidate.endExclusive, contextAfterLines);
        return afterMatches;
    });
}

function applyLineHintFilter(candidates: CandidateRange[], lineHint?: number): CandidateRange[] {
    if (lineHint === undefined || candidates.length <= 1) {
        return candidates;
    }

    const hintLine = lineHint;
    let minDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
        const distance = Math.abs((candidate.start + 1) - hintLine);
        if (distance < minDistance) {
            minDistance = distance;
        }
    }

    return candidates.filter((candidate) => Math.abs((candidate.start + 1) - hintLine) === minDistance);
}

function validateHunk(hunk: FileEditHunk, hunkIndex: number): PatchApplyFailure | undefined {
    if (!hunk.old_text || hunk.old_text.length === 0) {
        return {
            success: false,
            code: 'INVALID_HUNK',
            hunkIndex,
            message: `Hunk #${hunkIndex + 1} is invalid: old_text must be non-empty.`,
        };
    }

    const normalizedOldLines = toNormalizedLines(hunk.old_text);
    if (normalizedOldLines.length === 0 || normalizedOldLines.every((line) => line.length === 0)) {
        return {
            success: false,
            code: 'INVALID_HUNK',
            hunkIndex,
            message: `Hunk #${hunkIndex + 1} is invalid: old_text must be non-empty.`,
        };
    }

    const normalizedOld = toNormalizedLinesPreserveTrailingWhitespace(hunk.old_text).join('\n');
    const normalizedNew = toNormalizedLinesPreserveTrailingWhitespace(hunk.new_text).join('\n');
    if (normalizedOld === normalizedNew) {
        return {
            success: false,
            code: 'INVALID_HUNK',
            hunkIndex,
            message: `Hunk #${hunkIndex + 1} is invalid: old_text and new_text are identical.`,
        };
    }

    if (hunk.line_hint !== undefined && (!Number.isInteger(hunk.line_hint) || hunk.line_hint <= 0)) {
        return {
            success: false,
            code: 'INVALID_HUNK',
            hunkIndex,
            message: `Hunk #${hunkIndex + 1} is invalid: line_hint must be a positive integer.`,
        };
    }

    return undefined;
}

function resolveHunks(fileContent: string, hunks: FileEditHunk[]): PatchApplyFailure | ResolvedHunk[] {
    const normalizedFileLines = toNormalizedLines(fileContent);
    const resolvedHunks: ResolvedHunk[] = [];

    for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
        const hunk = hunks[hunkIndex];
        const hunkValidationFailure = validateHunk(hunk, hunkIndex);
        if (hunkValidationFailure) {
            return hunkValidationFailure;
        }

        const oldTextNormalizedLines = toNormalizedLines(hunk.old_text);
        const contextBeforeNormalizedLines = hunk.context_before !== undefined
            ? toNormalizedLines(hunk.context_before)
            : undefined;
        const contextAfterNormalizedLines = hunk.context_after !== undefined
            ? toNormalizedLines(hunk.context_after)
            : undefined;

        let candidates = findOldTextCandidates(normalizedFileLines, oldTextNormalizedLines);
        candidates = applyContextFilter(
            normalizedFileLines,
            candidates,
            contextBeforeNormalizedLines,
            contextAfterNormalizedLines
        );
        candidates = applyLineHintFilter(candidates, hunk.line_hint);

        if (candidates.length === 0) {
            return {
                success: false,
                code: 'HUNK_NOT_FOUND',
                hunkIndex,
                message: `Could not locate hunk #${hunkIndex + 1}. Re-read the file and provide a more specific old_text or context.`,
            };
        }

        if (candidates.length > 1) {
            return {
                success: false,
                code: 'HUNK_AMBIGUOUS',
                hunkIndex,
                message: `Hunk #${hunkIndex + 1} is ambiguous (${candidates.length} matches). Add context_before/context_after or line_hint to disambiguate.`,
            };
        }

        const matchedRange = candidates[0];
        resolvedHunks.push({
            hunkIndex,
            start: matchedRange.start,
            endExclusive: matchedRange.endExclusive,
            oldLineCount: oldTextNormalizedLines.length,
            replacementLines: splitReplacementLines(hunk.new_text),
        });
    }

    const orderedByStart = [...resolvedHunks].sort((a, b) => a.start - b.start);
    for (let i = 1; i < orderedByStart.length; i++) {
        const previous = orderedByStart[i - 1];
        const current = orderedByStart[i];
        if (current.start < previous.endExclusive) {
            return {
                success: false,
                code: 'HUNK_OVERLAP',
                hunkIndex: current.hunkIndex,
                message: `Hunk #${previous.hunkIndex + 1} overlaps with hunk #${current.hunkIndex + 1}. Adjust hunk ranges to be non-overlapping.`,
            };
        }
    }

    return resolvedHunks;
}

function detectPreferredNewline(content: string): '\r\n' | '\n' {
    return content.includes('\r\n') ? '\r\n' : '\n';
}

export function applyStructuredFilePatch(fileContent: string, hunks: FileEditHunk[]): PatchApplyResult {
    try {
        if (!Array.isArray(hunks) || hunks.length === 0) {
            return {
                success: false,
                code: 'INVALID_HUNK',
                message: 'At least one hunk is required.',
            };
        }

        const resolvedHunks = resolveHunks(fileContent, hunks);
        if (!Array.isArray(resolvedHunks)) {
            return resolvedHunks;
        }

        const outputNewline = detectPreferredNewline(fileContent);
        const mutableLines = toRawLfLines(fileContent);
        const applyOrder = [...resolvedHunks].sort((a, b) => b.start - a.start);

        for (const resolvedHunk of applyOrder) {
            mutableLines.splice(
                resolvedHunk.start,
                resolvedHunk.oldLineCount,
                ...resolvedHunk.replacementLines
            );
        }

        const patchedLfContent = mutableLines.join('\n');
        const newContent = outputNewline === '\r\n'
            ? patchedLfContent.replace(/\n/g, '\r\n')
            : patchedLfContent;

        return {
            success: true,
            newContent,
            appliedHunks: resolvedHunks.length,
        };
    } catch (error) {
        return {
            success: false,
            code: 'PATCH_APPLY_FAILED',
            message: `Failed to apply structured patch: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
