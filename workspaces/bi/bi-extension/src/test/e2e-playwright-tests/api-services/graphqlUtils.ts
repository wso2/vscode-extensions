/**
 * GraphQL Webview UI helpers for Playwright E2E tests
 * All helpers are designed to be reusable and composable for GraphQL service flows.
 */
import { page } from '../utils';


// Centralized test data for all GraphQL service E2E tests
export const TEST_DATA = {
    service: {
        basePath: (attempt: number) => `/sample${attempt}`,
        editedBasePath: (attempt: number) => `/editedSample${attempt}`,
    },
    operations: {
        query: {
            name: 'query1',
            fieldType: 'string',
        },
        mutation: {
            name: 'mutation1',
            fieldType: 'boolean',
        },
        subscription: {
            name: 'subscription1',
            fieldType: 'float',
        },
    },
    arguments: [
        { name: 'arg1', type: 'string' },
        { name: 'arg2', type: 'mytype1' },
    ],
    types: {
        inputObject: 'mytype1',
        outputObject: 'outputtype1',
    },
    field: {
        name: 'field1',
    },
    mutationEdit: {
        name: 'mutation2',
    },
    expression: '"Hello World!"',
};

/**
 * Utility to add a GraphQL operation (mutation, subscription, etc.)
 * @param artifactWebView - The Playwright frame/locator for the webview
 * @param operationType - 'mutation' | 'subscription' | 'query'
 * @param name - The name to use for the operation
 * @param fieldType - The type to use for the field (e.g., 'boolean', 'float', etc.)
 */
export async function addGraphQLOperation(artifactWebView, operationType, name, fieldType) {
    const addBtnTestId = `graphql-add-${operationType}-btn`;
    await artifactWebView.getByTestId(addBtnTestId).waitFor({ state: 'visible', timeout: 10000 });
    const addBtn = artifactWebView.getByTestId(addBtnTestId);
    await addBtn.click();

    const fieldNameBox = artifactWebView.getByRole('textbox', { name: /Field Name/i });
    await fieldNameBox.waitFor({ state: 'visible', timeout: 10000 });
    await fieldNameBox.fill(name);

    const fieldTypeBox = artifactWebView.getByRole('textbox', { name: /Field Type/i });
    await fieldTypeBox.waitFor({ state: 'visible', timeout: 10000 });
    // await fieldTypeBox.click();
    await fieldTypeBox.fill(fieldType);

    // Wait a short moment to allow UI to register the value
    await page.page.waitForTimeout(5000);
    const fieldDefaultCompletion = artifactWebView.getByTestId('add-type-completion');
    await fieldDefaultCompletion.waitFor({ state: 'visible', timeout: 10000 });

    if (fieldDefaultCompletion.isVisible()) {
        await fieldTypeBox.press('Escape');
    }

    const saveBtn = artifactWebView.getByRole('button', { name: /Save/i });
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtn.click();
}

/**
 * Click a button in the artifact webview by test id
 * @param artifactWebView - The Playwright frame/locator for the webview
 * @param testId - The test id of the button to click
 */
export async function clickButtonByTestId(artifactWebView, testId: string) {
    const button = artifactWebView.getByTestId(testId);
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
}


export async function addOutputObject(artifactWebView) {
    const createFromScratchTab = artifactWebView.getByTestId('create-from-scratch-tab');
    await artifactWebView.getByRole('textbox', { name: 'Field Type' }).click();
    await artifactWebView.getByText('Create New Type').click();
    await artifactWebView.getByTestId('type-kind-dropdown').locator('svg').click();
    await artifactWebView.getByRole('option', { name: 'Object' }).click();
    await createFromScratchTab.getByRole('textbox', { name: 'Name' }).fill(TEST_DATA.types.outputObject);
    await artifactWebView.getByTestId('type-create-save').getByRole('button', { name: 'Save' }).click();
}

export async function createInputObjectFromScratch(artifactWebView) {
    await artifactWebView.getByText('Add Argument').click();
    await artifactWebView.getByRole('textbox', { name: 'Argument Type' }).click();
    await artifactWebView.getByText('Create New Type').click();
    await artifactWebView.locator('slot', { hasText: /^Input Object$/ }).click();
    await artifactWebView.getByRole('option', { name: 'Input Object' }).click();

    // Fill name for the new input object type
    const createFromScratchTab = artifactWebView.getByTestId('create-from-scratch-tab');
    await createFromScratchTab.getByRole('textbox', { name: 'Name' }).fill(TEST_DATA.types.inputObject);
    await artifactWebView.getByTestId('type-create-save').getByRole('button', { name: 'Save' }).click();
    await artifactWebView.getByRole('textbox', { name: 'Argument Name*The name of the' }).fill(TEST_DATA.arguments[1].name);
    await artifactWebView.getByRole('button', { name: 'Add' }).click();
}

export async function addArgumentToGraphQLService(artifactWebView) {
    await artifactWebView.getByText('Add Argument').click();
    await artifactWebView.getByRole('textbox', { name: 'Argument Type' }).click();
    await artifactWebView.getByTitle('string', { exact: true }).click();
    await artifactWebView.getByRole('textbox', { name: 'Argument Name*The name of the' }).fill(TEST_DATA.arguments[0].name);
    await artifactWebView.getByRole('button', { name: 'Add' }).click();
}




      