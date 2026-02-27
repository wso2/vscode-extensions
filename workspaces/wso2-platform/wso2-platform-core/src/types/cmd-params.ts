import type { ChoreoComponentType, DevantScopes } from "../enums";
import type { ComponentKind, ExtensionName, Organization, Project } from "./common.types";

export interface ICmdParamsBase {
	extName?: ExtensionName;
}

export interface ICreateDirCtxCmdParams extends ICmdParamsBase {
	skipComponentExistCheck?: boolean;
	fsPath?: string;
}

export interface ICloneProjectCmdParams extends ICmdParamsBase {
	organization: Organization;
	project: Project;
	componentName: string;
	component: ComponentKind;
	technology: string;
	integrationType: string;
	integrationDisplayType: string;
}

export interface ICommitAndPushCmdParams extends ICmdParamsBase {
	componentPath: string;
}

export interface ICreateDependencyParams extends ICmdParamsBase {
	componentFsPath?: string;
	isCodeLens?: boolean;
}

export interface ICreateComponentCmdParams extends ICmdParamsBase {
	type?: ChoreoComponentType;
	integrationType?: DevantScopes;
	buildPackLang?: string;
	name?: string;
	/** Full path of the component directory */
	componentDir?: string;
	/** Available integration types for this component (for multi-type selection in UI) */
	supportedIntegrationTypes?: DevantScopes[];
}

export interface IDeleteComponentCmdParams extends ICmdParamsBase {
	organization: Organization;
	project: Project;
	component: ComponentKind;
}

export interface IManageDirContextCmdParams extends ICmdParamsBase {
	onlyShowSwitchProject?: boolean;
}

export interface IOpenCompSrcCmdParams extends ICmdParamsBase {
	org: Organization | string;
	project: Project | string;
	component: string;
	technology: string;
	integrationType: string;
	integrationDisplayType: string;
}

export interface IOpenInConsoleCmdParams extends ICmdParamsBase {
	organization: Organization;
	project: Project;
	component: ComponentKind;
	componentFsPath: string;
	newComponentParams?: ICreateComponentCmdParams;
}

export interface IViewDependencyCmdParams extends ICmdParamsBase {
	componentFsPath?: string;
	isCodeLens?: boolean;
	connectionName: string;
}

export interface IViewComponentDetailsCmdParams extends ICmdParamsBase {
	organization: Organization;
	project: Project;
	component: ComponentKind;
	componentPath: string;
}
