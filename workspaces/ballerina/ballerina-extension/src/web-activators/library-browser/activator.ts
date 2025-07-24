import { LibraryDataResponse, LibrariesListResponse, LibraryKind, LibrarySearchResponse } from "@wso2/ballerina-core";

export const cachedLibrariesList = new Map<string, LibrariesListResponse>();
export const cachedSearchList = new Map<string, LibrarySearchResponse>();
export const cachedLibraryData = new Map<string, LibraryDataResponse>();
export const DIST_LIB_LIST_CACHE = "DISTRIBUTION_LIB_LIST_CACHE";
export const LANG_LIB_LIST_CACHE = "LANG_LIB_LIST_CACHE";
export const STD_LIB_LIST_CACHE = "STD_LIB_LIST_CACHE";
export const LIBRARY_SEARCH_CACHE = "LIBRARY_SEARCH_CACHE";
const options = {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
    },
};

const BASE_URL = "http://localhost:9091/bala";

export async function activate() {
    await fetchAndCacheLibraryData();
}

export async function getLibrariesList(kind?: LibraryKind): Promise<LibrariesListResponse | undefined> {
    return new Promise(async (resolve, reject) => {
        if (kind === LibraryKind.langLib && cachedLibrariesList.has(LANG_LIB_LIST_CACHE)) {
            return resolve(cachedLibrariesList.get(LANG_LIB_LIST_CACHE));
        } else if (kind === LibraryKind.stdLib && cachedLibrariesList.has(STD_LIB_LIST_CACHE)) {
            return resolve(cachedLibrariesList.get(STD_LIB_LIST_CACHE));
        } else if (cachedLibrariesList.has(DIST_LIB_LIST_CACHE)) {
            return resolve(cachedLibrariesList.get(DIST_LIB_LIST_CACHE));
        }

        try {
            const response = await fetch(`${BASE_URL}/libraryList/${kind ? kind : "all"}`, options);

            if (!response.ok) {
                console.log(response);
                return reject(response);
            }

            const payload = await response.json();
            return resolve(payload);
        } catch (error) {
            console.error("Error fetching libraries list:", error);
            return reject(error);
        }
    });
}

export function getAllResources(): Promise<LibrarySearchResponse | undefined> {
    return new Promise(async (resolve, reject) => {
        if (cachedSearchList.has(LIBRARY_SEARCH_CACHE)) {
            return resolve(cachedSearchList.get(LIBRARY_SEARCH_CACHE));
        }

        try {
            const response = await fetch(`${BASE_URL}/allResourses`, options);
            if (!response.ok) {
                return reject(response);
            }

            const payload = await response.json();
            return resolve(payload);
        } catch (error) {
            console.error("Error fetching all resources:", error);
            return reject(error);
        }
    });
}

export function getLibraryData(
    orgName: string,
    moduleName: string,
    version: string
): Promise<LibraryDataResponse | undefined> {
    return new Promise(async (resolve, reject) => {
        if (cachedLibraryData.has(`${orgName}_${moduleName}_${version}`)) {
            return resolve(cachedLibraryData.get(`${orgName}_${moduleName}_${version}`));
        }

        try {
            const response = await fetch(`${BASE_URL}/librarydata/${orgName}/${moduleName}/${version}`, options);
            if (!response.ok) {
                return reject(response);
            }

            const payload = await response.json();
            console.log("libaraies fetch success...", payload);
            cachedLibraryData.set(`${orgName}_${moduleName}_${version}`, payload);
            return resolve(payload);
        } catch (error) {
            console.error("Error fetching libraries list:", error);
            return reject(error);
        }
    });
}

export async function fetchAndCacheLibraryData() {
    try {
        // Cache the lang lib list
        const langLibs = await getLibrariesList(LibraryKind.langLib);
        if (langLibs && langLibs.librariesList.length > 0) {
            cachedLibrariesList.set(LANG_LIB_LIST_CACHE, langLibs);
        }

        // Cache the std lib list
        const stdLibs = await getLibrariesList(LibraryKind.stdLib);
        if (stdLibs && stdLibs.librariesList.length > 0) {
            cachedLibrariesList.set(STD_LIB_LIST_CACHE, stdLibs);
            console.log("Cached std lib list successfully.", cachedLibrariesList.get(STD_LIB_LIST_CACHE));
        }

        // Cache the distribution lib list
        const distLibs = await getLibrariesList();
        if (distLibs && distLibs.librariesList.length > 0) {
            cachedLibrariesList.set(DIST_LIB_LIST_CACHE, distLibs);
            console.log("Cached distribution lib list successfully.", cachedLibrariesList.get(DIST_LIB_LIST_CACHE));
        }

        // Cache the library search data
        const searchData = await getAllResources();
        if (searchData && searchData.modules.length > 0) {
            cachedSearchList.set(LIBRARY_SEARCH_CACHE, searchData);
            console.log("Cached library search data successfully.", cachedSearchList.get(LIBRARY_SEARCH_CACHE));
        }

        console.log("Library data caching completed successfully!");
    } catch (error) {
        console.error("Error in fetchAndCacheLibraryData:", error);
    }
}
