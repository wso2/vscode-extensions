import { test, expect } from '@playwright/test';
import { startVSCode, ReleaseQuality } from '@wso2/playwright-vscode-tester';

test.describe('VSCode Profile Testing', () => {
  test('should start VSCode with custom profile', async () => {
    // Start VSCode with a custom profile for isolation
    const vscode = await startVSCode(
      './test-resources',           // resources folder
      'latest',                     // VSCode version  
      ReleaseQuality.Stable,        // release type
      false,                        // enable recorder
      undefined,                    // extensions folder
      './test-project',             // project path to open
      'test-profile-clean'          // custom profile name
    );

    // Get the main workbench page
    const workbench = vscode.firstWindow();
    
    // Verify VSCode opened with clean profile
    await expect(workbench.locator('.monaco-workbench')).toBeVisible();
    
    // You can now interact with VSCode in a clean environment
    // without any interference from your development settings
    
    // Close VSCode when done
    await vscode.close();
  });

  test('should start multiple VSCode instances with different profiles', async () => {
    // Start first instance with profile A
    const vscode1 = await startVSCode(
      './test-resources',
      'latest',
      ReleaseQuality.Stable,
      false,
      undefined,
      './project-a',
      'test-profile-a'
    );

    // Start second instance with profile B
    const vscode2 = await startVSCode(
      './test-resources',
      'latest', 
      ReleaseQuality.Stable,
      false,
      undefined,
      './project-b',
      'test-profile-b'
    );

    // Both instances are now running with isolated profiles
    const workbench1 = vscode1.firstWindow();
    const workbench2 = vscode2.firstWindow();

    await expect(workbench1.locator('.monaco-workbench')).toBeVisible();
    await expect(workbench2.locator('.monaco-workbench')).toBeVisible();

    // Clean up
    await vscode1.close();
    await vscode2.close();
  });

  test('should use auto-generated profile when none specified', async () => {
    // This will automatically generate a unique profile name
    const vscode = await startVSCode(
      './test-resources',
      'latest',
      ReleaseQuality.Stable,
      false,
      undefined,
      './test-project'
      // No profile name specified - will auto-generate
    );

    const workbench = vscode.firstWindow();
    await expect(workbench.locator('.monaco-workbench')).toBeVisible();
    
    await vscode.close();
  });
});
