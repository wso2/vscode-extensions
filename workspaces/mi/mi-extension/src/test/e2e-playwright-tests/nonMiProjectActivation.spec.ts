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

/**
 * E2E Tests for Issue #1371:
 *   MI Welcome Page opens when accessing VS Code Test Explorer (even for non-MI projects)
 *
 * These tests verify that when the MI extension activates in a workspace that
 * contains no WSO2 MI artefacts (no pom.xml with integration-project type,
 * no .project file), the MI Welcome Page webview panel does NOT open
 * automatically — specifically not when the user opens the VS Code Test
 * Explorer view.
 *
 * Setup:
 *   - VS Code is launched with a fresh, empty workspace (no pom.xml → not an MI project).
 *   - `initTest(true, true)` cleans `newProjectPath` and starts VS Code without
 *     creating an MI project, giving us a plain non-MI workspace.
 *
 * Run:
 *   pnpm run compile-tests && pnpm exec playwright test --grep "Issue #1371"
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { initTest, newProjectPath, page } from './Utils';

export default function createTests() {
    test.describe('Issue #1371 — Non-MI Project Activation', {
        tag: '@issue1371',
    }, async () => {
        // `newProject: true`       → always start with a clean workspace directory
        // `skipProjectCreation: true` → do NOT run createProject(); the workspace
        //                              stays empty (no pom.xml) so the MI extension
        //                              will not detect an MI project.
        initTest(true, true, false, undefined, undefined, 'issue1371');

        // ── Helper: populate a minimal JS project layout ─────────────────────

        async function populateNonMiWorkspace(): Promise<void> {
            // Write minimal JS project files so that VS Code's built-in Testing
            // view controller can register a test provider (making the Testing
            // beaker icon reliably appear in the activity bar).
            fs.writeFileSync(
                path.join(newProjectPath, 'package.json'),
                JSON.stringify({ name: 'my-js-app', version: '1.0.0', scripts: { test: 'echo "no tests"' } })
            );
            fs.writeFileSync(
                path.join(newProjectPath, 'index.js'),
                'console.log("Hello World");\n'
            );
            // Explicitly ensure NO pom.xml is present.
            const pomPath = path.join(newProjectPath, 'pom.xml');
            if (fs.existsSync(pomPath)) {
                fs.unlinkSync(pomPath);
            }
        }

        // ── Helper: collect all visible tab titles in the editor area ────────

        async function getEditorTabTitles(): Promise<string[]> {
            const tabLabels = page.page.locator('.tab-label');
            const count = await tabLabels.count();
            const titles: string[] = [];
            for (let i = 0; i < count; i++) {
                const title = await tabLabels.nth(i).textContent();
                if (title) {
                    titles.push(title.trim());
                }
            }
            return titles;
        }

        // ── Helper: check all webview iframes for MI Welcome content ─────────

        async function miWelcomeFoundInWebviews(): Promise<boolean> {
            const iframes = page.page.locator('iframe.webview');
            const count = await iframes.count();
            for (let i = 0; i < count; i++) {
                try {
                    const frame = iframes.nth(i).contentFrame();
                    if (!frame) {
                        continue;
                    }
                    const welcomeLocator = frame.locator('text=Welcome to WSO2 Integrator: MI');
                    const welcomeCount = await welcomeLocator.count();
                    if (welcomeCount > 0) {
                        return true;
                    }
                } catch {
                    // Frame might be cross-origin or not yet ready; skip it.
                }
            }
            return false;
        }

        // ────────────────────────────────────────────────────────────────────

        test(
            'MI Welcome Page does not appear when Test Explorer is opened on a non-MI project',
            async ({}, testInfo) => {
                console.log(`>>> Test attempt: ${testInfo.retry + 1}`);

                // Ensure the workspace is a plain JS project (no MI artefacts).
                await populateNonMiWorkspace();

                // ── Step 1: Open the VS Code Test Explorer ───────────────────
                // The Testing view is a built-in VS Code container.  Clicking its
                // activity bar icon fires the implicit `onView:MI.mock-services`
                // activation event (because the MI extension registers a view in
                // the `test` container via package.json → contributes.views.test).
                // This is exactly the trigger described in Issue #1371.
                await test.step('Open VS Code Test Explorer via command palette', async () => {
                    console.log('Opening VS Code Test Explorer');
                    await page.executePaletteCommand('View: Show Testing');
                    // Brief wait for the view to render and for any extension
                    // activation triggered by revealing the Testing container.
                    await page.page.waitForTimeout(4000);
                    console.log('Test Explorer command issued; waiting for extension activation to settle');
                });

                // ── Step 2: Also try clicking the Testing activity bar tab ───
                // In addition to the palette command, directly clicking the
                // Testing beaker in the activity bar can independently fire the
                // `onView` activation event.
                await test.step('Click Testing activity bar tab if visible', async () => {
                    const testingTab = page.page.getByRole('tab', { name: 'Testing' });
                    const isVisible = await testingTab.isVisible().catch(() => false);
                    if (isVisible) {
                        console.log('Testing activity bar tab found; clicking it');
                        const tabBtn = testingTab.locator('a');
                        await tabBtn.click({ timeout: 5000 }).catch(() => {
                            console.log('Tab click timed out; continuing');
                        });
                        await page.page.waitForTimeout(3000);
                    } else {
                        console.log('Testing activity bar tab not visible in this session; skipping direct click');
                    }
                });

                // ── Step 3: Assert — no MI Welcome Page tab in editor area ───
                await test.step('Assert no MI Welcome Page tab is visible in the editor', async () => {
                    const tabTitles = await getEditorTabTitles();
                    console.log('Editor tab titles found:', tabTitles);

                    const miWelcomeTabs = tabTitles.filter(t =>
                        t.includes('WSO2 Integrator: MI') ||
                        t.includes('Welcome to WSO2') ||
                        // MACHINE_VIEW.Welcome is 'WSO2 Integrator: MI'
                        t === 'WSO2 Integrator: MI'
                    );

                    expect(miWelcomeTabs).toHaveLength(0);
                    console.log('PASS: No MI Welcome Page tab found in the editor — Issue #1371 regression guard passed');
                });

                // ── Step 4: Assert — no MI Welcome content in any webview ────
                await test.step('Assert MI Welcome Page content is absent from all webview frames', async () => {
                    const miWelcomeInWebview = await miWelcomeFoundInWebviews();
                    expect(miWelcomeInWebview).toBe(false);
                    console.log('PASS: No MI Welcome Page content found in any webview iframe');
                });

                // ── Step 5: Assert — MI status context is unknownProject ─────
                // As a secondary verification, confirm the Test Explorer sidebar
                // does NOT show the MI Mock Services section (which only appears
                // when MI.status == 'projectLoaded').
                await test.step('Assert MI Mock Services section is not visible in Test Explorer', async () => {
                    const mockServicesSection = page.page.locator('[aria-label*="Mock Services"]');
                    const count = await mockServicesSection.count();
                    expect(count).toBe(0);
                    console.log('PASS: MI Mock Services section is not visible in Test Explorer (correct for non-MI workspace)');
                });
            }
        );

        // ── Negative/edge case: non-MI Maven project ─────────────────────────

        test(
            'MI Welcome Page does not appear when a non-MI Maven pom.xml is present and Test Explorer opens',
            async ({}, testInfo) => {
                console.log(`>>> Test attempt: ${testInfo.retry + 1}`);

                // Write a plain Maven pom.xml (no MI projectType).
                fs.writeFileSync(
                    path.join(newProjectPath, 'pom.xml'),
                    '<project><groupId>com.example</groupId><artifactId>plain-maven-app</artifactId></project>'
                );

                await test.step('Open VS Code Test Explorer', async () => {
                    await page.executePaletteCommand('View: Show Testing');
                    await page.page.waitForTimeout(4000);
                });

                await test.step('Assert no MI Welcome Page tab appears', async () => {
                    const tabTitles = await getEditorTabTitles();
                    const miWelcomeTabs = tabTitles.filter(t =>
                        t.includes('WSO2 Integrator: MI') || t.includes('Welcome to WSO2')
                    );
                    expect(miWelcomeTabs).toHaveLength(0);
                });

                await test.step('Cleanup: remove non-MI pom.xml', async () => {
                    const pomPath = path.join(newProjectPath, 'pom.xml');
                    if (fs.existsSync(pomPath)) {
                        fs.unlinkSync(pomPath);
                    }
                });
            }
        );
    });
}

