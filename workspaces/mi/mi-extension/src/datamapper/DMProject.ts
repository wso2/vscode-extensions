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

import { Project, ProjectOptions } from "ts-morph";

export class DMProject {
    private _project: Project;
    private static _instance: DMProject;

    private constructor(filePath: string, options?: ProjectOptions) {
        this._project = new Project(options);
        this._project.addSourceFileAtPath(filePath);
    }

    public static getInstance(filePath: string, options?: ProjectOptions): DMProject {
        if (!this._instance?._project?.getSourceFile(filePath)) {
            this._instance = new DMProject(filePath, options);
        }
        return this._instance;
    }

    public getProject(): Project {
        return this._project;
    }

    public static refreshProject(filePath: string, options?: ProjectOptions){
        this._instance = new DMProject(filePath, options);
    }
}

