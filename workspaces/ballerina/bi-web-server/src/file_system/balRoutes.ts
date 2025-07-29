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

import express, { Request, Response, NextFunction } from "express";
import { exec } from "child_process";
import { getBallerinaHome } from "../bal_ls/utils";

const balRouter = express.Router();

export const COMMAND_NOT_FOUND = "command not found";
export const NO_SUCH_FILE = "No such file or directory";
export const ERROR = "Error:";
const SWAN_LAKE_REGEX = /(s|S)wan( |-)(l|L)ake/g;

const balVersion = "2201.11.0"; // Default version
const BASE_URL = "https://api.central.ballerina.io";
const DOC_API_PATH = "/2.0/docs";
let LibrariesListEndpoint = `${BASE_URL}${DOC_API_PATH}/stdlib/${balVersion}`;
let LibrariesSearchEndpoint = `${LibrariesListEndpoint}/search`;
const options = {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
    },
};

balRouter.get("/libraryList/:kind", async (req: Request, res: Response) => {
    const { kind } = req.params;
    const response = await fetch(LibrariesListEndpoint, options);

    if (!response.ok) {
        console.log(response);
        res.status(500).json("Failed to fetch the libraries list");
        return;
    }

    const payload = await response.json();
    const librariesList =
        kind == "all"
            ? { librariesList: [...payload["langLibs"], ...payload["modules"]] }
            : { librariesList: payload[kind] };

    res.status(200).json(librariesList);
});

balRouter.get("/allResourses", async (req: Request, res: Response) => {
    const response = await fetch(LibrariesSearchEndpoint, options);

    if (!response.ok) {
        console.log(response.text());
        res.status(500).json("Failed to fetch the libraries list");
        return;
    }

    const payload = await response.json();

    res.status(200).json(payload);
});

balRouter.get("/librarydata/:orgName/:moduleName/:version", async (req: Request, res: Response) => {
    const { orgName, version, moduleName } = req.params;
    const response = await fetch(`${BASE_URL}${DOC_API_PATH}/${orgName}/${moduleName}/${version}`, options);

    if (!response.ok) {
        res.status(500).json("Failed to fetch the libraries list");
        return;
    }

    const payload = await response.json();

    res.status(200).json(payload);
});

balRouter.get("/info", async (req: Request, res: Response) => {
    try {
        console.log("inside info");
        const balInfo = await getBallerinaHome();
        if (balInfo) {
            res.status(200).json(balInfo);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    } catch (error) {
        console.error("Error fetching Ballerina Home:", error);
        res.status(500).json({ message: "Failed to retrieve Ballerina Home" });
    }
});

balRouter.post("/pull", (req: Request, res: Response) => {
    console.log("inside pull");
    const { command } = req.body;
    exec(`${command}`, async (err, stdout, stderr) => {
        if (err) {
            res.status(500).json(stderr);
        } else {
            res.status(200).send(stdout);
        }
    });
});

export default balRouter;
