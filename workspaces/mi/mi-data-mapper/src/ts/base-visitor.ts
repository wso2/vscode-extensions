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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 * Run 'npm run generate' to regenerate this file
 */

import * as tsm from 'ts-morph';

export interface Visitor {
    beginVisit?(node: tsm.Node, parent?: tsm.Node): void;
    endVisit?(node: tsm.Node, parent?: tsm.Node): void;
    
    beginVisitNumericLiteral?(node: tsm.NumericLiteral, parent?: tsm.Node): void;
    endVisitNumericLiteral?(node: tsm.NumericLiteral, parent?: tsm.Node): void;

    beginVisitBigIntLiteral?(node: tsm.BigIntLiteral, parent?: tsm.Node): void;
    endVisitBigIntLiteral?(node: tsm.BigIntLiteral, parent?: tsm.Node): void;

    beginVisitStringLiteral?(node: tsm.StringLiteral, parent?: tsm.Node): void;
    endVisitStringLiteral?(node: tsm.StringLiteral, parent?: tsm.Node): void;

    beginVisitRegularExpressionLiteral?(node: tsm.RegularExpressionLiteral, parent?: tsm.Node): void;
    endVisitRegularExpressionLiteral?(node: tsm.RegularExpressionLiteral, parent?: tsm.Node): void;

    beginVisitNoSubstitutionTemplateLiteral?(node: tsm.NoSubstitutionTemplateLiteral, parent?: tsm.Node): void;
    endVisitNoSubstitutionTemplateLiteral?(node: tsm.NoSubstitutionTemplateLiteral, parent?: tsm.Node): void;

    beginVisitTemplateHead?(node: tsm.TemplateHead, parent?: tsm.Node): void;
    endVisitTemplateHead?(node: tsm.TemplateHead, parent?: tsm.Node): void;

    beginVisitTemplateMiddle?(node: tsm.TemplateMiddle, parent?: tsm.Node): void;
    endVisitTemplateMiddle?(node: tsm.TemplateMiddle, parent?: tsm.Node): void;

    beginVisitTemplateTail?(node: tsm.TemplateTail, parent?: tsm.Node): void;
    endVisitTemplateTail?(node: tsm.TemplateTail, parent?: tsm.Node): void;

    beginVisitIdentifier?(node: tsm.Identifier, parent?: tsm.Node): void;
    endVisitIdentifier?(node: tsm.Identifier, parent?: tsm.Node): void;

    beginVisitPrivateIdentifier?(node: tsm.PrivateIdentifier, parent?: tsm.Node): void;
    endVisitPrivateIdentifier?(node: tsm.PrivateIdentifier, parent?: tsm.Node): void;

    beginVisitQualifiedName?(node: tsm.QualifiedName, parent?: tsm.Node): void;
    endVisitQualifiedName?(node: tsm.QualifiedName, parent?: tsm.Node): void;

    beginVisitComputedPropertyName?(node: tsm.ComputedPropertyName, parent?: tsm.Node): void;
    endVisitComputedPropertyName?(node: tsm.ComputedPropertyName, parent?: tsm.Node): void;

    beginVisitTypeParameter?(node: tsm.TypeParameter, parent?: tsm.Node): void;
    endVisitTypeParameter?(node: tsm.TypeParameter, parent?: tsm.Node): void;

    beginVisitDecorator?(node: tsm.Decorator, parent?: tsm.Node): void;
    endVisitDecorator?(node: tsm.Decorator, parent?: tsm.Node): void;

    beginVisitPropertyDeclaration?(node: tsm.PropertyDeclaration, parent?: tsm.Node): void;
    endVisitPropertyDeclaration?(node: tsm.PropertyDeclaration, parent?: tsm.Node): void;

    beginVisitMethodDeclaration?(node: tsm.MethodDeclaration, parent?: tsm.Node): void;
    endVisitMethodDeclaration?(node: tsm.MethodDeclaration, parent?: tsm.Node): void;

    beginVisitClassStaticBlockDeclaration?(node: tsm.ClassStaticBlockDeclaration, parent?: tsm.Node): void;
    endVisitClassStaticBlockDeclaration?(node: tsm.ClassStaticBlockDeclaration, parent?: tsm.Node): void;

    beginVisitNamedTupleMember?(node: tsm.NamedTupleMember, parent?: tsm.Node): void;
    endVisitNamedTupleMember?(node: tsm.NamedTupleMember, parent?: tsm.Node): void;

    beginVisitObjectBindingPattern?(node: tsm.ObjectBindingPattern, parent?: tsm.Node): void;
    endVisitObjectBindingPattern?(node: tsm.ObjectBindingPattern, parent?: tsm.Node): void;

    beginVisitArrayBindingPattern?(node: tsm.ArrayBindingPattern, parent?: tsm.Node): void;
    endVisitArrayBindingPattern?(node: tsm.ArrayBindingPattern, parent?: tsm.Node): void;

    beginVisitBindingElement?(node: tsm.BindingElement, parent?: tsm.Node): void;
    endVisitBindingElement?(node: tsm.BindingElement, parent?: tsm.Node): void;

    beginVisitArrayLiteralExpression?(node: tsm.ArrayLiteralExpression, parent?: tsm.Node): void;
    endVisitArrayLiteralExpression?(node: tsm.ArrayLiteralExpression, parent?: tsm.Node): void;

    beginVisitObjectLiteralExpression?(node: tsm.ObjectLiteralExpression, parent?: tsm.Node): void;
    endVisitObjectLiteralExpression?(node: tsm.ObjectLiteralExpression, parent?: tsm.Node): void;

    beginVisitPropertyAccessExpression?(node: tsm.PropertyAccessExpression, parent?: tsm.Node): void;
    endVisitPropertyAccessExpression?(node: tsm.PropertyAccessExpression, parent?: tsm.Node): void;

    beginVisitElementAccessExpression?(node: tsm.ElementAccessExpression, parent?: tsm.Node): void;
    endVisitElementAccessExpression?(node: tsm.ElementAccessExpression, parent?: tsm.Node): void;

    beginVisitCallExpression?(node: tsm.CallExpression, parent?: tsm.Node): void;
    endVisitCallExpression?(node: tsm.CallExpression, parent?: tsm.Node): void;

    beginVisitNewExpression?(node: tsm.NewExpression, parent?: tsm.Node): void;
    endVisitNewExpression?(node: tsm.NewExpression, parent?: tsm.Node): void;

    beginVisitTaggedTemplateExpression?(node: tsm.TaggedTemplateExpression, parent?: tsm.Node): void;
    endVisitTaggedTemplateExpression?(node: tsm.TaggedTemplateExpression, parent?: tsm.Node): void;

    beginVisitParenthesizedExpression?(node: tsm.ParenthesizedExpression, parent?: tsm.Node): void;
    endVisitParenthesizedExpression?(node: tsm.ParenthesizedExpression, parent?: tsm.Node): void;

    beginVisitFunctionExpression?(node: tsm.FunctionExpression, parent?: tsm.Node): void;
    endVisitFunctionExpression?(node: tsm.FunctionExpression, parent?: tsm.Node): void;

    beginVisitArrowFunction?(node: tsm.ArrowFunction, parent?: tsm.Node): void;
    endVisitArrowFunction?(node: tsm.ArrowFunction, parent?: tsm.Node): void;

    beginVisitDeleteExpression?(node: tsm.DeleteExpression, parent?: tsm.Node): void;
    endVisitDeleteExpression?(node: tsm.DeleteExpression, parent?: tsm.Node): void;

    beginVisitTypeOfExpression?(node: tsm.TypeOfExpression, parent?: tsm.Node): void;
    endVisitTypeOfExpression?(node: tsm.TypeOfExpression, parent?: tsm.Node): void;

    beginVisitVoidExpression?(node: tsm.VoidExpression, parent?: tsm.Node): void;
    endVisitVoidExpression?(node: tsm.VoidExpression, parent?: tsm.Node): void;

    beginVisitAwaitExpression?(node: tsm.AwaitExpression, parent?: tsm.Node): void;
    endVisitAwaitExpression?(node: tsm.AwaitExpression, parent?: tsm.Node): void;

    beginVisitPrefixUnaryExpression?(node: tsm.PrefixUnaryExpression, parent?: tsm.Node): void;
    endVisitPrefixUnaryExpression?(node: tsm.PrefixUnaryExpression, parent?: tsm.Node): void;

    beginVisitPropertyAssignment?(node: tsm.PropertyAssignment, parent?: tsm.Node): void;
    endVisitPropertyAssignment?(node: tsm.PropertyAssignment, parent?: tsm.Node): void;

    beginVisitPostfixUnaryExpression?(node: tsm.PostfixUnaryExpression, parent?: tsm.Node): void;
    endVisitPostfixUnaryExpression?(node: tsm.PostfixUnaryExpression, parent?: tsm.Node): void;

    beginVisitBinaryExpression?(node: tsm.BinaryExpression, parent?: tsm.Node): void;
    endVisitBinaryExpression?(node: tsm.BinaryExpression, parent?: tsm.Node): void;

    beginVisitConditionalExpression?(node: tsm.ConditionalExpression, parent?: tsm.Node): void;
    endVisitConditionalExpression?(node: tsm.ConditionalExpression, parent?: tsm.Node): void;

    beginVisitTemplateExpression?(node: tsm.TemplateExpression, parent?: tsm.Node): void;
    endVisitTemplateExpression?(node: tsm.TemplateExpression, parent?: tsm.Node): void;

    beginVisitYieldExpression?(node: tsm.YieldExpression, parent?: tsm.Node): void;
    endVisitYieldExpression?(node: tsm.YieldExpression, parent?: tsm.Node): void;

    beginVisitSpreadElement?(node: tsm.SpreadElement, parent?: tsm.Node): void;
    endVisitSpreadElement?(node: tsm.SpreadElement, parent?: tsm.Node): void;

    beginVisitClassExpression?(node: tsm.ClassExpression, parent?: tsm.Node): void;
    endVisitClassExpression?(node: tsm.ClassExpression, parent?: tsm.Node): void;

    beginVisitOmittedExpression?(node: tsm.OmittedExpression, parent?: tsm.Node): void;
    endVisitOmittedExpression?(node: tsm.OmittedExpression, parent?: tsm.Node): void;

    beginVisitExpressionWithTypeArguments?(node: tsm.ExpressionWithTypeArguments, parent?: tsm.Node): void;
    endVisitExpressionWithTypeArguments?(node: tsm.ExpressionWithTypeArguments, parent?: tsm.Node): void;

    beginVisitAsExpression?(node: tsm.AsExpression, parent?: tsm.Node): void;
    endVisitAsExpression?(node: tsm.AsExpression, parent?: tsm.Node): void;

    beginVisitNonNullExpression?(node: tsm.NonNullExpression, parent?: tsm.Node): void;
    endVisitNonNullExpression?(node: tsm.NonNullExpression, parent?: tsm.Node): void;

    beginVisitMetaProperty?(node: tsm.MetaProperty, parent?: tsm.Node): void;
    endVisitMetaProperty?(node: tsm.MetaProperty, parent?: tsm.Node): void;

    beginVisitSatisfiesExpression?(node: tsm.SatisfiesExpression, parent?: tsm.Node): void;
    endVisitSatisfiesExpression?(node: tsm.SatisfiesExpression, parent?: tsm.Node): void;

    beginVisitTemplateSpan?(node: tsm.TemplateSpan, parent?: tsm.Node): void;
    endVisitTemplateSpan?(node: tsm.TemplateSpan, parent?: tsm.Node): void;

    beginVisitBlock?(node: tsm.Block, parent?: tsm.Node): void;
    endVisitBlock?(node: tsm.Block, parent?: tsm.Node): void;

    beginVisitEmptyStatement?(node: tsm.EmptyStatement, parent?: tsm.Node): void;
    endVisitEmptyStatement?(node: tsm.EmptyStatement, parent?: tsm.Node): void;

    beginVisitVariableStatement?(node: tsm.VariableStatement, parent?: tsm.Node): void;
    endVisitVariableStatement?(node: tsm.VariableStatement, parent?: tsm.Node): void;

    beginVisitExpressionStatement?(node: tsm.ExpressionStatement, parent?: tsm.Node): void;
    endVisitExpressionStatement?(node: tsm.ExpressionStatement, parent?: tsm.Node): void;

    beginVisitIfStatement?(node: tsm.IfStatement, parent?: tsm.Node): void;
    endVisitIfStatement?(node: tsm.IfStatement, parent?: tsm.Node): void;

    beginVisitDoStatement?(node: tsm.DoStatement, parent?: tsm.Node): void;
    endVisitDoStatement?(node: tsm.DoStatement, parent?: tsm.Node): void;

    beginVisitWhileStatement?(node: tsm.WhileStatement, parent?: tsm.Node): void;
    endVisitWhileStatement?(node: tsm.WhileStatement, parent?: tsm.Node): void;

    beginVisitForStatement?(node: tsm.ForStatement, parent?: tsm.Node): void;
    endVisitForStatement?(node: tsm.ForStatement, parent?: tsm.Node): void;

    beginVisitForInStatement?(node: tsm.ForInStatement, parent?: tsm.Node): void;
    endVisitForInStatement?(node: tsm.ForInStatement, parent?: tsm.Node): void;

    beginVisitForOfStatement?(node: tsm.ForOfStatement, parent?: tsm.Node): void;
    endVisitForOfStatement?(node: tsm.ForOfStatement, parent?: tsm.Node): void;

    beginVisitContinueStatement?(node: tsm.ContinueStatement, parent?: tsm.Node): void;
    endVisitContinueStatement?(node: tsm.ContinueStatement, parent?: tsm.Node): void;

    beginVisitBreakStatement?(node: tsm.BreakStatement, parent?: tsm.Node): void;
    endVisitBreakStatement?(node: tsm.BreakStatement, parent?: tsm.Node): void;

    beginVisitReturnStatement?(node: tsm.ReturnStatement, parent?: tsm.Node): void;
    endVisitReturnStatement?(node: tsm.ReturnStatement, parent?: tsm.Node): void;

    beginVisitWithStatement?(node: tsm.WithStatement, parent?: tsm.Node): void;
    endVisitWithStatement?(node: tsm.WithStatement, parent?: tsm.Node): void;

    beginVisitSwitchStatement?(node: tsm.SwitchStatement, parent?: tsm.Node): void;
    endVisitSwitchStatement?(node: tsm.SwitchStatement, parent?: tsm.Node): void;

    beginVisitLabeledStatement?(node: tsm.LabeledStatement, parent?: tsm.Node): void;
    endVisitLabeledStatement?(node: tsm.LabeledStatement, parent?: tsm.Node): void;

    beginVisitThrowStatement?(node: tsm.ThrowStatement, parent?: tsm.Node): void;
    endVisitThrowStatement?(node: tsm.ThrowStatement, parent?: tsm.Node): void;

    beginVisitTryStatement?(node: tsm.TryStatement, parent?: tsm.Node): void;
    endVisitTryStatement?(node: tsm.TryStatement, parent?: tsm.Node): void;

    beginVisitDebuggerStatement?(node: tsm.DebuggerStatement, parent?: tsm.Node): void;
    endVisitDebuggerStatement?(node: tsm.DebuggerStatement, parent?: tsm.Node): void;

    beginVisitVariableDeclaration?(node: tsm.VariableDeclaration, parent?: tsm.Node): void;
    endVisitVariableDeclaration?(node: tsm.VariableDeclaration, parent?: tsm.Node): void;

    beginVisitVariableDeclarationList?(node: tsm.VariableDeclarationList, parent?: tsm.Node): void;
    endVisitVariableDeclarationList?(node: tsm.VariableDeclarationList, parent?: tsm.Node): void;

    beginVisitFunctionDeclaration?(node: tsm.FunctionDeclaration, parent?: tsm.Node): void;
    endVisitFunctionDeclaration?(node: tsm.FunctionDeclaration, parent?: tsm.Node): void;

    beginVisitClassDeclaration?(node: tsm.ClassDeclaration, parent?: tsm.Node): void;
    endVisitClassDeclaration?(node: tsm.ClassDeclaration, parent?: tsm.Node): void;

    beginVisitInterfaceDeclaration?(node: tsm.InterfaceDeclaration, parent?: tsm.Node): void;
    endVisitInterfaceDeclaration?(node: tsm.InterfaceDeclaration, parent?: tsm.Node): void;

    beginVisitTypeAliasDeclaration?(node: tsm.TypeAliasDeclaration, parent?: tsm.Node): void;
    endVisitTypeAliasDeclaration?(node: tsm.TypeAliasDeclaration, parent?: tsm.Node): void;

    beginVisitEnumDeclaration?(node: tsm.EnumDeclaration, parent?: tsm.Node): void;
    endVisitEnumDeclaration?(node: tsm.EnumDeclaration, parent?: tsm.Node): void;

    beginVisitModuleDeclaration?(node: tsm.ModuleDeclaration, parent?: tsm.Node): void;
    endVisitModuleDeclaration?(node: tsm.ModuleDeclaration, parent?: tsm.Node): void;

    beginVisitModuleBlock?(node: tsm.ModuleBlock, parent?: tsm.Node): void;
    endVisitModuleBlock?(node: tsm.ModuleBlock, parent?: tsm.Node): void;

    beginVisitCaseBlock?(node: tsm.CaseBlock, parent?: tsm.Node): void;
    endVisitCaseBlock?(node: tsm.CaseBlock, parent?: tsm.Node): void;

    beginVisitImportEqualsDeclaration?(node: tsm.ImportEqualsDeclaration, parent?: tsm.Node): void;
    endVisitImportEqualsDeclaration?(node: tsm.ImportEqualsDeclaration, parent?: tsm.Node): void;

    beginVisitImportDeclaration?(node: tsm.ImportDeclaration, parent?: tsm.Node): void;
    endVisitImportDeclaration?(node: tsm.ImportDeclaration, parent?: tsm.Node): void;

    beginVisitImportClause?(node: tsm.ImportClause, parent?: tsm.Node): void;
    endVisitImportClause?(node: tsm.ImportClause, parent?: tsm.Node): void;

    beginVisitNamespaceImport?(node: tsm.NamespaceImport, parent?: tsm.Node): void;
    endVisitNamespaceImport?(node: tsm.NamespaceImport, parent?: tsm.Node): void;

    beginVisitNamedImports?(node: tsm.NamedImports, parent?: tsm.Node): void;
    endVisitNamedImports?(node: tsm.NamedImports, parent?: tsm.Node): void;

    beginVisitImportSpecifier?(node: tsm.ImportSpecifier, parent?: tsm.Node): void;
    endVisitImportSpecifier?(node: tsm.ImportSpecifier, parent?: tsm.Node): void;

    beginVisitExportDeclaration?(node: tsm.ExportDeclaration, parent?: tsm.Node): void;
    endVisitExportDeclaration?(node: tsm.ExportDeclaration, parent?: tsm.Node): void;

    beginVisitNamedExports?(node: tsm.NamedExports, parent?: tsm.Node): void;
    endVisitNamedExports?(node: tsm.NamedExports, parent?: tsm.Node): void;

    beginVisitNamespaceExport?(node: tsm.NamespaceExport, parent?: tsm.Node): void;
    endVisitNamespaceExport?(node: tsm.NamespaceExport, parent?: tsm.Node): void;

    beginVisitExportSpecifier?(node: tsm.ExportSpecifier, parent?: tsm.Node): void;
    endVisitExportSpecifier?(node: tsm.ExportSpecifier, parent?: tsm.Node): void;

    beginVisitExternalModuleReference?(node: tsm.ExternalModuleReference, parent?: tsm.Node): void;
    endVisitExternalModuleReference?(node: tsm.ExternalModuleReference, parent?: tsm.Node): void;

    beginVisitJsxElement?(node: tsm.JsxElement, parent?: tsm.Node): void;
    endVisitJsxElement?(node: tsm.JsxElement, parent?: tsm.Node): void;

    beginVisitJsxSelfClosingElement?(node: tsm.JsxSelfClosingElement, parent?: tsm.Node): void;
    endVisitJsxSelfClosingElement?(node: tsm.JsxSelfClosingElement, parent?: tsm.Node): void;

    beginVisitJsxOpeningElement?(node: tsm.JsxOpeningElement, parent?: tsm.Node): void;
    endVisitJsxOpeningElement?(node: tsm.JsxOpeningElement, parent?: tsm.Node): void;

    beginVisitJsxClosingElement?(node: tsm.JsxClosingElement, parent?: tsm.Node): void;
    endVisitJsxClosingElement?(node: tsm.JsxClosingElement, parent?: tsm.Node): void;

    beginVisitJsxFragment?(node: tsm.JsxFragment, parent?: tsm.Node): void;
    endVisitJsxFragment?(node: tsm.JsxFragment, parent?: tsm.Node): void;

    beginVisitJsxOpeningFragment?(node: tsm.JsxOpeningFragment, parent?: tsm.Node): void;
    endVisitJsxOpeningFragment?(node: tsm.JsxOpeningFragment, parent?: tsm.Node): void;

    beginVisitJsxClosingFragment?(node: tsm.JsxClosingFragment, parent?: tsm.Node): void;
    endVisitJsxClosingFragment?(node: tsm.JsxClosingFragment, parent?: tsm.Node): void;

    beginVisitJsxAttribute?(node: tsm.JsxAttribute, parent?: tsm.Node): void;
    endVisitJsxAttribute?(node: tsm.JsxAttribute, parent?: tsm.Node): void;

    beginVisitJsxSpreadAttribute?(node: tsm.JsxSpreadAttribute, parent?: tsm.Node): void;
    endVisitJsxSpreadAttribute?(node: tsm.JsxSpreadAttribute, parent?: tsm.Node): void;

    beginVisitJsxExpression?(node: tsm.JsxExpression, parent?: tsm.Node): void;
    endVisitJsxExpression?(node: tsm.JsxExpression, parent?: tsm.Node): void;

    beginVisitJsxNamespacedName?(node: tsm.JsxNamespacedName, parent?: tsm.Node): void;
    endVisitJsxNamespacedName?(node: tsm.JsxNamespacedName, parent?: tsm.Node): void;

    beginVisitCaseClause?(node: tsm.CaseClause, parent?: tsm.Node): void;
    endVisitCaseClause?(node: tsm.CaseClause, parent?: tsm.Node): void;

    beginVisitDefaultClause?(node: tsm.DefaultClause, parent?: tsm.Node): void;
    endVisitDefaultClause?(node: tsm.DefaultClause, parent?: tsm.Node): void;

    beginVisitHeritageClause?(node: tsm.HeritageClause, parent?: tsm.Node): void;
    endVisitHeritageClause?(node: tsm.HeritageClause, parent?: tsm.Node): void;

    beginVisitCatchClause?(node: tsm.CatchClause, parent?: tsm.Node): void;
    endVisitCatchClause?(node: tsm.CatchClause, parent?: tsm.Node): void;

    beginVisitImportAttributes?(node: tsm.ImportAttributes, parent?: tsm.Node): void;
    endVisitImportAttributes?(node: tsm.ImportAttributes, parent?: tsm.Node): void;

    beginVisitImportAttribute?(node: tsm.ImportAttribute, parent?: tsm.Node): void;
    endVisitImportAttribute?(node: tsm.ImportAttribute, parent?: tsm.Node): void;

    beginVisitEnumMember?(node: tsm.EnumMember, parent?: tsm.Node): void;
    endVisitEnumMember?(node: tsm.EnumMember, parent?: tsm.Node): void;

    beginVisitSourceFile?(node: tsm.SourceFile, parent?: tsm.Node): void;
    endVisitSourceFile?(node: tsm.SourceFile, parent?: tsm.Node): void;

    beginVisitJSDocTypeExpression?(node: tsm.JSDocTypeExpression, parent?: tsm.Node): void;
    endVisitJSDocTypeExpression?(node: tsm.JSDocTypeExpression, parent?: tsm.Node): void;

    beginVisitJSDocNameReference?(node: tsm.JSDocNameReference, parent?: tsm.Node): void;
    endVisitJSDocNameReference?(node: tsm.JSDocNameReference, parent?: tsm.Node): void;

    beginVisitJSDocMemberName?(node: tsm.JSDocMemberName, parent?: tsm.Node): void;
    endVisitJSDocMemberName?(node: tsm.JSDocMemberName, parent?: tsm.Node): void;

    beginVisitJSDoc?(node: tsm.JSDoc, parent?: tsm.Node): void;
    endVisitJSDoc?(node: tsm.JSDoc, parent?: tsm.Node): void;

    beginVisitJSDocTypeLiteral?(node: tsm.JSDocTypeLiteral, parent?: tsm.Node): void;
    endVisitJSDocTypeLiteral?(node: tsm.JSDocTypeLiteral, parent?: tsm.Node): void;

    beginVisitJSDocLink?(node: tsm.JSDocLink, parent?: tsm.Node): void;
    endVisitJSDocLink?(node: tsm.JSDocLink, parent?: tsm.Node): void;

    beginVisitJSDocLinkCode?(node: tsm.JSDocLinkCode, parent?: tsm.Node): void;
    endVisitJSDocLinkCode?(node: tsm.JSDocLinkCode, parent?: tsm.Node): void;

    beginVisitJSDocLinkPlain?(node: tsm.JSDocLinkPlain, parent?: tsm.Node): void;
    endVisitJSDocLinkPlain?(node: tsm.JSDocLinkPlain, parent?: tsm.Node): void;

    beginVisitJSDocTag?(node: tsm.JSDocTag, parent?: tsm.Node): void;
    endVisitJSDocTag?(node: tsm.JSDocTag, parent?: tsm.Node): void;

    beginVisitJSDocAugmentsTag?(node: tsm.JSDocAugmentsTag, parent?: tsm.Node): void;
    endVisitJSDocAugmentsTag?(node: tsm.JSDocAugmentsTag, parent?: tsm.Node): void;

    beginVisitJSDocImplementsTag?(node: tsm.JSDocImplementsTag, parent?: tsm.Node): void;
    endVisitJSDocImplementsTag?(node: tsm.JSDocImplementsTag, parent?: tsm.Node): void;

    beginVisitJSDocAuthorTag?(node: tsm.JSDocAuthorTag, parent?: tsm.Node): void;
    endVisitJSDocAuthorTag?(node: tsm.JSDocAuthorTag, parent?: tsm.Node): void;

    beginVisitJSDocDeprecatedTag?(node: tsm.JSDocDeprecatedTag, parent?: tsm.Node): void;
    endVisitJSDocDeprecatedTag?(node: tsm.JSDocDeprecatedTag, parent?: tsm.Node): void;

    beginVisitJSDocClassTag?(node: tsm.JSDocClassTag, parent?: tsm.Node): void;
    endVisitJSDocClassTag?(node: tsm.JSDocClassTag, parent?: tsm.Node): void;

    beginVisitJSDocPublicTag?(node: tsm.JSDocPublicTag, parent?: tsm.Node): void;
    endVisitJSDocPublicTag?(node: tsm.JSDocPublicTag, parent?: tsm.Node): void;

    beginVisitJSDocPrivateTag?(node: tsm.JSDocPrivateTag, parent?: tsm.Node): void;
    endVisitJSDocPrivateTag?(node: tsm.JSDocPrivateTag, parent?: tsm.Node): void;

    beginVisitJSDocProtectedTag?(node: tsm.JSDocProtectedTag, parent?: tsm.Node): void;
    endVisitJSDocProtectedTag?(node: tsm.JSDocProtectedTag, parent?: tsm.Node): void;

    beginVisitJSDocReadonlyTag?(node: tsm.JSDocReadonlyTag, parent?: tsm.Node): void;
    endVisitJSDocReadonlyTag?(node: tsm.JSDocReadonlyTag, parent?: tsm.Node): void;

    beginVisitJSDocOverrideTag?(node: tsm.JSDocOverrideTag, parent?: tsm.Node): void;
    endVisitJSDocOverrideTag?(node: tsm.JSDocOverrideTag, parent?: tsm.Node): void;

    beginVisitJSDocCallbackTag?(node: tsm.JSDocCallbackTag, parent?: tsm.Node): void;
    endVisitJSDocCallbackTag?(node: tsm.JSDocCallbackTag, parent?: tsm.Node): void;

    beginVisitJSDocOverloadTag?(node: tsm.JSDocOverloadTag, parent?: tsm.Node): void;
    endVisitJSDocOverloadTag?(node: tsm.JSDocOverloadTag, parent?: tsm.Node): void;

    beginVisitJSDocEnumTag?(node: tsm.JSDocEnumTag, parent?: tsm.Node): void;
    endVisitJSDocEnumTag?(node: tsm.JSDocEnumTag, parent?: tsm.Node): void;

    beginVisitJSDocParameterTag?(node: tsm.JSDocParameterTag, parent?: tsm.Node): void;
    endVisitJSDocParameterTag?(node: tsm.JSDocParameterTag, parent?: tsm.Node): void;

    beginVisitJSDocReturnTag?(node: tsm.JSDocReturnTag, parent?: tsm.Node): void;
    endVisitJSDocReturnTag?(node: tsm.JSDocReturnTag, parent?: tsm.Node): void;

    beginVisitJSDocThisTag?(node: tsm.JSDocThisTag, parent?: tsm.Node): void;
    endVisitJSDocThisTag?(node: tsm.JSDocThisTag, parent?: tsm.Node): void;

    beginVisitJSDocTypeTag?(node: tsm.JSDocTypeTag, parent?: tsm.Node): void;
    endVisitJSDocTypeTag?(node: tsm.JSDocTypeTag, parent?: tsm.Node): void;

    beginVisitJSDocTemplateTag?(node: tsm.JSDocTemplateTag, parent?: tsm.Node): void;
    endVisitJSDocTemplateTag?(node: tsm.JSDocTemplateTag, parent?: tsm.Node): void;

    beginVisitJSDocTypedefTag?(node: tsm.JSDocTypedefTag, parent?: tsm.Node): void;
    endVisitJSDocTypedefTag?(node: tsm.JSDocTypedefTag, parent?: tsm.Node): void;

    beginVisitJSDocSeeTag?(node: tsm.JSDocSeeTag, parent?: tsm.Node): void;
    endVisitJSDocSeeTag?(node: tsm.JSDocSeeTag, parent?: tsm.Node): void;

    beginVisitJSDocPropertyTag?(node: tsm.JSDocPropertyTag, parent?: tsm.Node): void;
    endVisitJSDocPropertyTag?(node: tsm.JSDocPropertyTag, parent?: tsm.Node): void;

    beginVisitJSDocThrowsTag?(node: tsm.JSDocThrowsTag, parent?: tsm.Node): void;
    endVisitJSDocThrowsTag?(node: tsm.JSDocThrowsTag, parent?: tsm.Node): void;

    beginVisitJSDocSatisfiesTag?(node: tsm.JSDocSatisfiesTag, parent?: tsm.Node): void;
    endVisitJSDocSatisfiesTag?(node: tsm.JSDocSatisfiesTag, parent?: tsm.Node): void;

    beginVisitSyntaxList?(node: tsm.SyntaxList, parent?: tsm.Node): void;
    endVisitSyntaxList?(node: tsm.SyntaxList, parent?: tsm.Node): void;

    beginVisitNotEmittedStatement?(node: tsm.NotEmittedStatement, parent?: tsm.Node): void;
    endVisitNotEmittedStatement?(node: tsm.NotEmittedStatement, parent?: tsm.Node): void;

    beginVisitPartiallyEmittedExpression?(node: tsm.PartiallyEmittedExpression, parent?: tsm.Node): void;
    endVisitPartiallyEmittedExpression?(node: tsm.PartiallyEmittedExpression, parent?: tsm.Node): void;

    beginVisitCommaListExpression?(node: tsm.CommaListExpression, parent?: tsm.Node): void;
    endVisitCommaListExpression?(node: tsm.CommaListExpression, parent?: tsm.Node): void;
}
