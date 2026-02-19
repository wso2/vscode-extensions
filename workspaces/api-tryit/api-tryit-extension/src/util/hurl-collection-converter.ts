import { HurlFormatAdapter } from './hurl-format-adapter';

export interface HurlRequestPayload {
    name?: string;
    content: string; // raw .hurl content
    folderPath?: string; // optional sub-folder inside the collection
}

export interface HurlFolderPayload {
    name: string;
    items: HurlRequestPayload[];
}

export interface HurlCollectionPayload {
    name: string;
    description?: string;
    id?: string;
    requests?: HurlRequestPayload[]; // root-level requests
    rootItems?: HurlRequestPayload[]; // alternative name
    folders?: HurlFolderPayload[];
}

function ensureString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function validateHurlContent(content: unknown): string {
    if (!content || typeof content !== 'string') {
        throw new Error('Each request must have a valid `content` string with Hurl text');
    }
    // Quick sanity-check: try parsing the Hurl content to ensure it's valid Hurl
    try {
        const parsed = HurlFormatAdapter.parseHurlContent(content, '<from-collection>');
        if (!parsed || !parsed.request) throw new Error('Could not parse Hurl content');
    } catch (err) {
        throw new Error(`Invalid Hurl content: ${(err as Error).message}`);
    }
    return content;
}

export function normalizeHurlCollectionPayload(input: unknown): HurlCollectionPayload {
    const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

    const name = ensureString(obj.name);
    if (!name) throw new Error('Collection payload must have a `name` string');

    const description = ensureString(obj.description);
    const id = ensureString(obj.id);

    const rawRequests = Array.isArray(obj.requests)
        ? (obj.requests as unknown[])
        : (Array.isArray(obj.rootItems) ? (obj.rootItems as unknown[]) : []);

    const requests: HurlRequestPayload[] = rawRequests.map((r, idx) => {
        if (typeof r === 'string') {
            return { name: `Request ${idx + 1}`, content: validateHurlContent(r) };
        }
        if (r && typeof r === 'object') {
            const rr = r as Record<string, unknown>;
            const content = validateHurlContent(rr.content ?? rr.request ?? rr.hurl);
            const name = ensureString(rr.name) ?? ensureString((rr.request as any)?.name) ?? `Request ${idx + 1}`;
            const folderPath = ensureString(rr.folderPath) ?? ensureString(rr.folder);
            return { name, content, folderPath };
        }
        throw new Error('Invalid request entry in payload');
    });

    const rawFolders = Array.isArray(obj.folders) ? (obj.folders as unknown[]) : [];
    const folders: HurlFolderPayload[] = rawFolders.map((f, fi) => {
        if (!f || typeof f !== 'object') throw new Error('Invalid folder entry in payload');
        const fo = f as Record<string, unknown>;
        const fname = ensureString(fo.name) ?? `Folder ${fi + 1}`;
        const itemsRaw = Array.isArray(fo.items) ? fo.items : (Array.isArray(fo.requests) ? fo.requests : []);
        const items: HurlRequestPayload[] = itemsRaw.map((it, ii) => {
            if (typeof it === 'string') {
                return { name: `Request ${ii + 1}`, content: validateHurlContent(it) };
            }
            if (it && typeof it === 'object') {
                const itObj = it as Record<string, unknown>;
                const content = validateHurlContent(itObj.content ?? itObj.request ?? itObj.hurl);
                const name = ensureString(itObj.name) ?? `Request ${ii + 1}`;
                return { name, content };
            }
            throw new Error('Invalid folder item in payload');
        });
        return { name: fname, items };
    });

    return {
        name,
        description,
        id,
        requests,
        folders
    };
}
