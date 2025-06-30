/**
 * Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

const tsMorph = require("ts-morph");
const fs = require("fs");
const path = require("path");


const CORE_RPC_TYPE_DIR = process.env.npm_package_config_CORE_RPC_TYPE_DIR + 'src/rpc-types';
const EXT_RPC_MANAGER_DIR = process.env.npm_package_config_EXT_RPC_MANAGER_DIR + 'src/rpc-managers';
const RPC_CLIENT_DIR = process.env.npm_package_config_RPC_CLIENT_DIR + 'src/rpc-clients';

const CORE_MODULE_NAME = process.env.npm_package_config_CORE_MODULE_NAME;
const typeFile = process.env.npm_package_config_CORE_RPC_TYPE_FILE;

const tsFileDirPath = path.resolve(__dirname, `${CORE_RPC_TYPE_DIR}/${typeFile}`);

const rpcTypeTsFile = tsFileDirPath;

console.log("Generating related typescript files. Please wait...");

const headerComment = `/**
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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
`
// Define the tsMorph project
const project = new tsMorph.Project();

// Get the directory name from the path to the TypeScript file
const dirName = path.basename(path.dirname(rpcTypeTsFile));

// Create the directory if it doesn't exist
const rpcTypeDir = path.resolve(__dirname, `${CORE_RPC_TYPE_DIR}/${dirName}`);
if (!fs.existsSync(rpcTypeDir)) {
    fs.mkdirSync(rpcTypeDir);
}

// Create the directory if it doesn't exist
const rpcMangerDir = path.resolve(__dirname, `${EXT_RPC_MANAGER_DIR}/${dirName}`);
if (!fs.existsSync(rpcMangerDir)) {
    fs.mkdirSync(rpcMangerDir);
}

// Create the directory if it doesn't exist
const rpcClientDir = path.resolve(__dirname, `${RPC_CLIENT_DIR}/${dirName}`);
if (!fs.existsSync(rpcClientDir)) {
    fs.mkdirSync(rpcClientDir);
}

let rpcTypesourceFile;
try {
    // Create a ts-morph Project
    rpcTypesourceFile = project.addSourceFileAtPath(rpcTypeTsFile);
} catch (error) {
    console.log("Error: File not found. Please check the file path");
    return;
}

// Get the first/only interface
const rpcTypeInterface = rpcTypesourceFile.getInterfaces()[0];

// Get the typeProperties of the interface
const typeProperties = rpcTypeInterface.getProperties();


const typescriptTypes = [
    "string",
    "number",
    "boolean",
    "null",
    "undefined",
    "any",
    "void",
    "never",
    "unknown",
    "object",
    "Array",
    "Tuple",
    "Enum",
    "Interface",
    "Type alias",
    "Union",
    "Intersection",
    "Literal",
    "Nullable",
    "Optional",
    "Readonly",
    "Partial",
    "Pick",
    "Omit",
    "Keyof"
];


// Define all the types that needs to be imported
const definedTypes = [rpcTypeInterface.getName()];
const typeMethods = [];

typeProperties.forEach(property => {
    const methodName = property.getName();

    // Remove all new lines and spaces
    let cleanedTypeNode = property.getTypeNode().getText().replace(/\s+/g, '');

    // Extract the parameter name and type
    const paramRegex = /\((\w+):(\w+)\)/;
    const paramMatch = cleanedTypeNode.match(paramRegex);
    const paramName = paramMatch ? paramMatch[1] : "";
    const paramType = paramMatch ? paramMatch[2] : "";

    if (!typescriptTypes.includes(paramType) && !definedTypes.includes(paramType)) {
        definedTypes.push(paramType);
    }

    // Extract the return promise type
    const returnPromiseRegex = /Promise<(\w+)>/;
    const returnPromiseMatch = cleanedTypeNode.match(returnPromiseRegex);
    const returnPromiseType = returnPromiseMatch ? returnPromiseMatch[1] : "";

    if (!typescriptTypes.includes(returnPromiseType) && !definedTypes.includes(returnPromiseType)) {
        definedTypes.push(returnPromiseType);
    }

    // Extract the return event type
    const returnEventRegex = /Event<(\w+)>/;
    const returnEventMatch = cleanedTypeNode.match(returnEventRegex);
    const returnEventType = returnEventMatch ? returnEventMatch[1] : "";

    if (!typescriptTypes.includes(returnEventType) && !definedTypes.includes(returnEventType)) {
        definedTypes.push(returnEventType);
    }

    // Collect method data
    typeMethods.push({
        name: methodName,
        isGetter: !cleanedTypeNode.includes("=>"),
        params: {
            name: paramName,
            type: paramType
        },
        return: {
            eventType: returnEventType,
            promiseType: returnPromiseType
        }
    });

});

const words = dirName.split('-');
const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
const componentName = capitalizedWords.join('');


// -------- RPC Types ts file related -------------------------------------->
console.log(`Generating rpc-type.ts...`);
const typeTsFile = path.resolve(rpcTypeDir, 'rpc-type.ts');

// Create rpc-type.ts if it not exists
if (!fs.existsSync(typeTsFile)) {
    fs.writeFileSync(typeTsFile, '');
}

// Create a new TypeScript project
const typeProject = new tsMorph.Project();

const typeSourceFile = typeProject.addSourceFileAtPath(typeTsFile);

typeSourceFile.removeText();

const preFix = `_preFix`;
const preFixConst = `const ${preFix} = "${dirName}";`
typeSourceFile.insertStatements(typeSourceFile.getStatements().length, preFixConst);

const prefixMethod = "${" + preFix + "}";

typeMethods.forEach(value => {
    handleTypeMethodConstants(prefixMethod, value, typeSourceFile);
})

// Get all the import statements from type index file
let importDeclarations = '';
rpcTypesourceFile.getImportDeclarations().forEach(statement => {
    if (!statement.getText().includes("Event")) { // Ignore the Event import as it will not be used in rpc-types
        importDeclarations += `${statement.getText()}\n`;
    }
})
typeSourceFile.insertText(0, headerComment + importDeclarations);

typeSourceFile.saveSync();

console.log(`rpc-type.ts Done!`);
// -------- RPC Type ts file End --------------------------------------------->





// -------- RPC Manager ts file related -------------------------------------->
console.log(`Generating rpc-manager.ts...`);
const managerTsFile = path.resolve(rpcMangerDir, 'rpc-manager.ts');

// Create rpc-manager.ts if it not exists
if (!fs.existsSync(managerTsFile)) {
    fs.writeFileSync(managerTsFile, '');
}

// Create a new TypeScript project
const managerProject = new tsMorph.Project();

// Add the TypeScript file to the project
const managerSourceFile = managerProject.addSourceFileAtPath(managerTsFile);

// Get the class declaration from the source file
const classes = managerSourceFile.getClasses();

// Class name
const managerClassName = `${componentName}RpcManager`;

let classDeclaration;

if (classes.length > 0) {
    console.log(`rpc-manager.ts file found!`);
    classDeclaration = classes[0];
} else {
    console.log(`rpc-manager.ts not found. Creating...`);
    // Create the class
    classDeclaration = managerSourceFile.addClass({
        name: managerClassName,
        isExported: true,
    });
    // Implement the interface
    classDeclaration.addImplements(rpcTypeInterface.getName());
    // Get the index of the class declaration
    handleImportStatment(managerSourceFile, CORE_MODULE_NAME, rpcTypeInterface.getName());
}

// Find methods that are not present in the class
const missingMethods = typeMethods.filter(value => !classDeclaration.getMethod(value.name) && !classDeclaration.getProperty(value.name));

missingMethods.forEach(value => {
    if (value.return.eventType) {
        console.log(`Found missing event property. Adding ${value.name}...`);
        handleManagerEventProperty(classDeclaration, value, managerSourceFile);
    } else {
        console.log(`Found missing class method. Adding ${value.name}...`);
        handleManagerClassMethod(classDeclaration, value, managerSourceFile);
    }
})

if (!managerSourceFile.getFullText().includes("Copyright")) {
    // Insert the comment at the top of the file
    console.log(`Adding Copyright comment`);
    managerSourceFile.insertText(0, headerComment);
}

// Format imports into new lines
formatImports(managerSourceFile, CORE_MODULE_NAME);

// Save the modified source file
managerSourceFile.saveSync();

console.log(`rpc-manager.ts Done!`);
// -------- RPC Manager ts file End ------------------------------------------>





// -------- RPC Handler ts file related -------------------------------------->
console.log(`Generating rpc-handler.ts...`);
const handlerTsFile = path.resolve(rpcMangerDir, 'rpc-handler.ts');

// Create rpc-type.ts if it not exists
if (!fs.existsSync(handlerTsFile)) {
    fs.writeFileSync(handlerTsFile, '');
}

// Create a new TypeScript project
const handlerProject = new tsMorph.Project();

const handlerSourceFile = handlerProject.addSourceFileAtPath(handlerTsFile);

handlerSourceFile.removeText();

const handlerName = `register${componentName}RpcHandlers`;
// Add a function to the source file
const handlerFunction = handlerSourceFile.addFunction({
    name: handlerName,
    isExported: true,
    parameters: [{
        name: "messenger",
        type: "Messenger"
    }]
});
handleImportStatment(handlerSourceFile, 'vscode-messenger', 'Messenger');

// Add statements to the function
const managerObject = `const rpcManger = new ${managerClassName}();`
handlerFunction.addStatements(managerObject);
typeMethods.forEach(value => {
    handleMessengerTypes(handlerFunction, value, handlerSourceFile);
})

handleImportStatment(handlerSourceFile, './rpc-manager', managerClassName);

// Format imports into new lines
formatImports(handlerSourceFile, CORE_MODULE_NAME);

handlerSourceFile.insertText(0, headerComment);

// Save the modified source file
handlerSourceFile.saveSync();

console.log(`rpc-handler.ts Done!`);
// -------- RPC Handler ts file End -------------------------------------->




// -------- RPC Client ts file related -------------------------------------->
console.log(`Generating rpc-client.ts...`);
const clientTsFile = path.resolve(rpcClientDir, 'rpc-client.ts');

// Create rpc-client.ts if it not exists
if (!fs.existsSync(clientTsFile)) {
    fs.writeFileSync(clientTsFile, '');
}

// Create a new TypeScript project
const clientProject = new tsMorph.Project();

// Add the TypeScript file to the project
const clientSourceFile = clientProject.addSourceFileAtPath(clientTsFile);

clientSourceFile.removeText();

// Class name
const clientClassName = `${componentName}RpcClient`;

const clientClassDeclaration = clientSourceFile.addClass({
    name: clientClassName,
    isExported: true,
});
// Implement the interface
clientClassDeclaration.addImplements(rpcTypeInterface.getName());

clientClassDeclaration.addProperty({
    name: '_messenger',
    type: 'Messenger',
    scope: tsMorph.Scope.Private
});

clientClassDeclaration.addConstructor({
    parameters: [{
        name: "messenger",
        type: "Messenger"
    }],
    statements: "this._messenger = messenger;"
});

handleImportStatment(clientSourceFile, 'vscode-messenger-webview', 'Messenger');
handleImportStatment(clientSourceFile, CORE_MODULE_NAME, rpcTypeInterface.getName());

typeMethods.forEach(value => {
    if (value.return.eventType) {
        handleClientEventMethod(clientClassDeclaration, value, clientSourceFile);
    } else {
        handleClientClassMethod(clientClassDeclaration, value, clientSourceFile);
    }
})

// Format imports into new lines
formatImports(clientSourceFile, CORE_MODULE_NAME);

clientSourceFile.insertText(0, headerComment);

// Save the modified source file
clientSourceFile.saveSync();

console.log(`rpc-client.ts Done!`);

// -------- RPC Client ts file End -------------------------------------->


// // -------- Type Imports -------------------------------------->
// console.log(`Importing rpc-type...`);
// const rpcTypeIndex = path.resolve(process.env.npm_package_config_CORE_RPC_TYPE_DIR, 'src', 'index.ts');

// // Create a new TypeScript project
// const rpcTypeIndexProject = new tsMorph.Project();

// // Add the TypeScript file to the project
// const rpcTypeIndexSourceFile = rpcTypeIndexProject.addSourceFileAtPath(rpcTypeIndex);

// // Import the statement
// const exportStatement = `export * from "./rpc-types/${dirName}/rpc-type";`;

// // Add the statement to the source file
// rpcTypeIndexSourceFile.addStatements(exportStatement);

// // Save the modified source file
// rpcTypeIndexSourceFile.saveSync();

// console.log(`Importing rpc-type Done!`);

// // -------- Type Imports End -------------------------------------->


// // // -------- RPC Handler register -------------------------------------->
// // console.log(`Registering rpc-handler...`);
// // const webRPCRegister = path.resolve(process.env.npm_package_config_EXT_RPC_MANAGER_DIR, 'src', 'visualizer', 'webRPCRegister.ts');

// // // Create a new TypeScript project
// // const webRPCRegisterProject = new tsMorph.Project();

// // // Add the TypeScript file to the project
// // const webRPCRegisterSourceFile = webRPCRegisterProject.addSourceFileAtPath(webRPCRegister);

// // // Find the constructor in the class
// // const classDeclarationRPCLayer = webRPCRegisterSourceFile.getClass("RPCLayer");
// // const constructorDeclaration = classDeclarationRPCLayer?.getConstructors()[0];

// // if (constructorDeclaration) {
// //     // Insert a new function call statement inside the constructor
// //     const handlerFunction = `${handlerName}(this._messenger);`;
// //     constructorDeclaration.insertStatements(classDeclarationRPCLayer.getChildCount(), handlerFunction);
// // }

// // handleImportStatment(webRPCRegisterSourceFile, `../rpc-managers/${dirName}/rpc-handler`, `${handlerName}`);
// // webRPCRegisterSourceFile.organizeImports();

// // // Save the modified source file
// // webRPCRegisterSourceFile.saveSync();

// // console.log(`Registering rpc-handler Done!`);

// // // -------- RPC Handler register End -------------------------------------->


// // -------- RPC Client register -------------------------------------->
// console.log(`Registering rpc-handler...`);
// const webRPCRegisterClient = path.resolve(process.env.npm_package_config_RPC_CLIENT_DIR, 'src', 'BallerinaRpcClient.ts');

// // Create a new TypeScript project
// const webRPCRegisterClientProject = new tsMorph.Project();

// // Add the TypeScript file to the project
// const webRPCRegisterClientSourceFile = webRPCRegisterClientProject.addSourceFileAtPath(webRPCRegisterClient);

// // Find the constructor in the class
// const classDeclarationRPCClientLayer = webRPCRegisterClientSourceFile.getClass("BallerinaRpcClient");

// const clientPropName = `_${dirName.replace("-", "_")}`;

// const propertiesCount = classDeclarationRPCClientLayer.getProperties().length;

// classDeclarationRPCClientLayer.insertProperty(propertiesCount, {
//     name: clientPropName,
//     type: clientClassName,
//     scope: tsMorph.Scope.Private
// });

// const constructorDeclarationClient = classDeclarationRPCClientLayer?.getConstructors()[0];

// if (constructorDeclarationClient) {
//     // Insert a new function call statement inside the constructor
//     const handlerFunction = `this.${clientPropName} = new ${clientClassName}(this.messenger);`;
//     constructorDeclarationClient.insertStatements(constructorDeclarationClient.getChildCount() - 1, handlerFunction);
// }

// classDeclarationRPCClientLayer.addMethod({
//     name: `get${clientClassName}`,
//     returnType: `${clientClassName}`,
//     statements: writer => {
//         writer.writeLine(`return this.${clientPropName};`);
//     },
// })

// handleImportStatment(webRPCRegisterClientSourceFile, `./rpc-clients/${dirName}/rpc-client`, `${clientClassName}`);
// webRPCRegisterClientSourceFile.organizeImports();

// // Save the modified source file
// webRPCRegisterClientSourceFile.saveSync();

// console.log(`Registering rpc-handler Done!`);

// -------- RPC Client register End -------------------------------------->

console.log(`All Done! Please check the relevant classes & export the rpc-types.ts`);


// -------- Util Functions -------------------------------------->

function handleImportStatment(rpcTypesourceFile, importSpecifier, namedImport) {
    // Check if the import statement already exists
    const existingImport = rpcTypesourceFile.getImportDeclaration(importSpecifier);

    // If the import statement exists, check if the named import already exists
    if (existingImport) {
        const namedImports = existingImport.getNamedImports();
        const hasNamedImport = namedImports.some(name => name.getName() === namedImport);
        // If the named import does not exist, add it
        if (!hasNamedImport) {
            existingImport.addNamedImport(namedImport);
        }
    } else {
        rpcTypesourceFile.insertImportDeclarations(0, [{
            moduleSpecifier: importSpecifier,
            namedImports: [namedImport],
        }]);
    }
}

function handleManagerEventProperty(classDeclaration, value, sourceFile) {

    handleImportStatment(sourceFile, 'vscode', 'EventEmitter');
    // Add the private variable
    classDeclaration.insertProperty(0, {
        name: `_${value.name}`,
        type: `EventEmitter<${value.return.eventType}>`,
        scope: tsMorph.Scope.Private,
        initializer: `new EventEmitter<${value.return.eventType}>()`,
    });

    handleImportStatment(sourceFile, 'vscode', 'Event');
    // Add the public readonly property
    classDeclaration.insertProperty(1, {
        name: `${value.name}`,
        type: `Event<${value.return.eventType}>`,
        scope: tsMorph.Scope.Public,
        isReadonly: true,
        isPublic: true,
        initializer: `this._${value.name}.event`,
    });
}

function handleManagerClassMethod(classDeclaration, value, sourceFile) {

    if (value.return.promiseType !== "void")
        handleImportStatment(sourceFile, CORE_MODULE_NAME, value.return.promiseType);

    if (value.isGetter) {
        // Add the getter method
        classDeclaration.addMethod({
            name: value.name,
            returnType: `Promise<${value.return.promiseType}>`,
            scope: tsMorph.Scope.Public,
            isAsync: true,
            statements: writer => {
                writer.writeLine("// ADD YOUR IMPLEMENTATION HERE");
                writer.writeLine("throw new Error('Not implemented');");
            },
        });
    } else {

        handleImportStatment(sourceFile, CORE_MODULE_NAME, value.params.type);

        // Add the getBallerinaProjectComponents method
        classDeclaration.addMethod({
            name: value.name,
            returnType: `Promise<${value.return.promiseType}>`,
            parameters: [{
                name: value.params.name,
                type: value.params.type
            }],
            isAsync: true,
            statements: writer => {
                writer.writeLine("// ADD YOUR IMPLEMENTATION HERE");
                writer.writeLine("throw new Error('Not implemented');");
            },
        });
    }
}

function handleTypeMethodConstants(prefix, value, sourceFile) {
    // Define the constant
    const isVoid = value.return.promiseType === 'void' || value.return.promiseType === '';
    const messageType = isVoid || value.return.eventType ? 'NotificationType' : 'RequestType';
    const paramType = isVoid || value.return.eventType ? `${value.return.eventType || value.params.type || 'void'}` : `${value.params.type || 'void'}, ${value.return.promiseType}`;
    const methodValue = "`" + prefix + "/" + value.name + "`";
    const constant = `export const ${value.name}: ${messageType}<${paramType}> = { method: ${methodValue} };`;
    // Insert the constant at a specific index, for example at the end of the file
    sourceFile.insertStatements(sourceFile.getStatements().length, constant);

    handleImportStatment(sourceFile, 'vscode-messenger-common', messageType);
}

function handleMessengerTypes(handlerFunction, value, sourceFile) {
    if (value.return.eventType) {
        // Define the event definition
        const eventDef = `rpcManger.${value.name}((params) => messenger.sendNotification(${value.name}, BROADCAST, params));`;
        // Insert the eventDef at a specific index
        handlerFunction.insertStatements(handlerFunction.getStatements().length, eventDef);
        handleImportStatment(sourceFile, CORE_MODULE_NAME, value.name);
        handleImportStatment(sourceFile, 'vscode-messenger-common', 'BROADCAST');
    } else {
        // Define the message definitions
        const isVoid = value.return.promiseType === 'void' || value.return.promiseType === '';
        const messageType = isVoid ? 'onNotification' : 'onRequest';
        const paramType = value.params.type ? `(args: ${value.params.type})` : `()`;
        const paramTypeArgs = value.params.type ? `(args)` : `()`;

        const messageDef = `messenger.${messageType}(${value.name}, ${paramType} => rpcManger.${value.name}${paramTypeArgs});`;
        // Insert the messageDef at a specific index
        handlerFunction.insertStatements(handlerFunction.getStatements().length, messageDef);

        handleImportStatment(sourceFile, CORE_MODULE_NAME, value.name);
        handleImportStatment(sourceFile, CORE_MODULE_NAME, value.params.type);
    }

}

function formatImports(sourceFile, importDeclare) {
    // Format the named imports onto new lines
    const namedImports = sourceFile.getImportDeclaration(importDeclare).getNamedImports();
    if (namedImports.length > 0) {
        const start = namedImports[0].getStart();
        const end = namedImports[namedImports.length - 1].getEnd();
        const newImportText = namedImports.map(i => i.getText()).join(",\n    ");
        sourceFile.replaceText([start, end], newImportText);
    }
    // Organize imports
    sourceFile.organizeImports();
}

function handleClientEventMethod(classDeclaration, value, sourceFile) {
    handleImportStatment(sourceFile, 'vscode-messenger-common', 'NotificationHandler');
    // Add the private variable
    classDeclaration.addMethod({
        name: value.name,
        parameters: [{
            name: 'callback',
            type: `NotificationHandler<${value.return.eventType}>`
        }],
        statements: writer => {
            writer.writeLine(`this._messenger.onNotification(${value.name}, callback);`);
            writer.writeLine("return {};");
        },
    });
    handleImportStatment(sourceFile, CORE_MODULE_NAME, value.return.eventType);
    handleImportStatment(sourceFile, CORE_MODULE_NAME, value.name);

}

function handleClientClassMethod(classDeclaration, value, sourceFile) {

    if (value.return.promiseType !== "void")
        handleImportStatment(sourceFile, CORE_MODULE_NAME, value.return.promiseType);

    if (value.params.type)
        handleImportStatment(sourceFile, CORE_MODULE_NAME, value.params.type);

    let statement = '';
    let returnType = '';
    const isVoid = value.return.promiseType === 'void' || value.return.promiseType === '';
    if (isVoid) {
        statement = `return this._messenger.sendNotification(${value.name}, HOST_EXTENSION, params);`;
        if (!value.params.type) {
            statement = `return this._messenger.sendNotification(${value.name}, HOST_EXTENSION);`;
        }
        returnType = 'void';
    } else {
        statement = `return this._messenger.sendRequest(${value.name}, HOST_EXTENSION, params);`;
        if (!value.params.type) {
            statement = `return this._messenger.sendRequest(${value.name}, HOST_EXTENSION);`;
        }
        returnType = `Promise<${value.return.promiseType}>`;
    }

    // Add the getBallerinaProjectComponents method
    classDeclaration.addMethod({
        name: value.name,
        returnType: returnType,
        parameters: [{
            name: value.params.name,
            type: value.params.type
        }],
        statements: writer => {
            writer.writeLine(statement);
        },
    });
    handleImportStatment(sourceFile, CORE_MODULE_NAME, value.name);
    handleImportStatment(sourceFile, 'vscode-messenger-common', 'HOST_EXTENSION');

}