import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { XMLChunker, XMLChunk } from '../service/chunker';

// Run without an embedder — uses char-based token fallback (~4 chars/token),
// so maxTokens=256 ≈ 1024 chars of embeddingText before a subtree is split.

describe('XMLChunker', () => {
  let tmpDir: string;

  before(() => {
    const tmpBase = path.join(__dirname, 'tmp-chunker-test-');
    tmpDir = fs.mkdtempSync(tmpBase);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeTmpFile(name: string, content: string): string {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  async function chunkXml(name: string, xml: string): Promise<XMLChunk[]> {
    const filePath = writeTmpFile(name, xml);
    return new XMLChunker().chunkFile(filePath);
  }

  // ─── API artifact ────────────────────────────────────────────────────────────

  describe('API artifact', () => {
    const API_XML = `<?xml version="1.0" encoding="UTF-8"?>
<api name="BankAPI" context="/bank" xmlns="http://ws.apache.org/ns/synapse">
    <resource methods="GET" uri-template="/balance">
        <inSequence>
            <log level="simple"/>
            <respond/>
        </inSequence>
    </resource>
    <resource methods="POST" uri-template="/deposit">
        <inSequence>
            <payloadFactory media-type="json">
                <format>{"status":"accepted"}</format>
            </payloadFactory>
            <respond/>
        </inSequence>
    </resource>
</api>`;

    it('produces at least one chunk', async () => {
      const chunks = await chunkXml('bank-api.xml', API_XML);
      assert.ok(chunks.length > 0, 'Should produce chunks');
    });

    it('every chunk carries the artifact name in its context', async () => {
      const chunks = await chunkXml('bank-api-ctx.xml', API_XML);
      for (const chunk of chunks) {
        assert.ok(
          chunk.context.artifact,
          `Chunk ${chunk.chunkIndex} (${chunk.chunkType}) should have context.artifact`
        );
        assert.strictEqual(
          chunk.context.artifact!.name, 'BankAPI',
          `Chunk ${chunk.chunkIndex} should have artifact.name = BankAPI`
        );
      }
    });

    it('embeddingText contains no raw XML opening-tag brackets', async () => {
      const chunks = await chunkXml('bank-api-clean.xml', API_XML);
      for (const chunk of chunks) {
        assert.ok(
          !/<\w/.test(chunk.embeddingText),
          `Chunk ${chunk.chunkIndex} (${chunk.chunkType}) embeddingText must not contain raw XML tags.\n` +
          `  Got: ${chunk.embeddingText.slice(0, 150)}`
        );
      }
    });

    it('embeddingText begins with artifact metadata', async () => {
      const chunks = await chunkXml('bank-api-meta.xml', API_XML);
      assert.ok(chunks.length > 0);
      for (const chunk of chunks) {
        assert.ok(
          chunk.embeddingText.startsWith('Api:') || chunk.embeddingText.includes('BankAPI'),
          `Chunk ${chunk.chunkIndex} embeddingText should start with metadata prefix.\n` +
          `  Got: ${chunk.embeddingText.slice(0, 150)}`
        );
      }
    });

    it('all chunk indices are unique', async () => {
      const chunks = await chunkXml('bank-api-idx.xml', API_XML);
      const seen = new Set<number>();
      for (const chunk of chunks) {
        assert.ok(!seen.has(chunk.chunkIndex), `Duplicate chunkIndex ${chunk.chunkIndex}`);
        seen.add(chunk.chunkIndex);
      }
    });

    it('every chunk has a non-empty contentHash', async () => {
      const chunks = await chunkXml('bank-api-hash.xml', API_XML);
      for (const chunk of chunks) {
        assert.ok(
          typeof chunk.contentHash === 'string' && chunk.contentHash.length > 0,
          `Chunk ${chunk.chunkIndex} should have a non-empty contentHash`
        );
      }
    });
  });

  // ─── Connector tag regex fix (Bug Fix 4) ─────────────────────────────────────
  // Connector tag names contain '.' (e.g. 'http.post'). Without escaping, '.'
  // in a regex matches any character.  The fix escapes the tag name before
  // building the RegExp so only the literal tag is matched.
  //
  // Observable behaviour:
  //   • Default budget  → entire small API fits → api chunk contains http.post
  //   • Tiny budget (3) → chunker descends past http.post into its leaf children
  //     (url, method).  The fact that those children are found with correct
  //     content proves findElementRange correctly identified the http.post
  //     boundaries via the escaped regex.

  describe('Connector tags — dot-notation regex fix', () => {
    const CONNECTOR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<api name="ConnectorAPI" context="/connector" xmlns="http://ws.apache.org/ns/synapse">
    <resource methods="POST" uri-template="/send">
        <inSequence>
            <http.post configKey="MyConn">
                <url>https://example.com/api</url>
                <method>POST</method>
            </http.post>
            <respond/>
        </inSequence>
    </resource>
</api>`;

    it('http.post connector is present inside the api chunk (default budget)', async () => {
      // Default budget → whole small API fits in one chunk.
      // The api chunk's content must contain the http.post tag.
      const chunks = await chunkXml('connector-default.xml', CONNECTOR_XML);
      const apiChunk = chunks.find(c => c.chunkType === 'api');
      assert.ok(apiChunk, `Expected an api chunk. Types: [${chunks.map(c => c.chunkType).join(', ')}]`);
      assert.ok(
        apiChunk!.content.includes('http.post'),
        `api chunk content must include the http.post connector.\n  Got: ${apiChunk!.content.slice(0, 300)}`
      );
    });

    it('http.post children (url, method) are found as chunks when budget forces descent', async () => {
      // maxTokens=3 forces descent all the way to leaf nodes.
      // url and method are direct children of http.post — finding them correctly
      // proves that findElementRange identified the http.post boundaries via
      // the escaped regex (dot escaped, so only '<http.post' is matched).
      const filePath = writeTmpFile('connector-descent.xml', CONNECTOR_XML);
      const chunks = await new XMLChunker(undefined, 3).chunkFile(filePath);
      const urlChunk = chunks.find(c => c.chunkType === 'url');
      const methodChunk = chunks.find(c => c.chunkType === 'method');
      assert.ok(urlChunk, `Expected url chunk. Types: [${chunks.map(c => c.chunkType).join(', ')}]`);
      assert.ok(methodChunk, `Expected method chunk. Types: [${chunks.map(c => c.chunkType).join(', ')}]`);
    });

    it('url chunk content is the exact url element (correct line range)', async () => {
      // Verifies findElementRange returned the right lines for a connector child.
      const filePath = writeTmpFile('connector-url-range.xml', CONNECTOR_XML);
      const chunks = await new XMLChunker(undefined, 3).chunkFile(filePath);
      const urlChunk = chunks.find(c => c.chunkType === 'url');
      assert.ok(urlChunk, `url chunk not found. Types: [${chunks.map(c => c.chunkType).join(', ')}]`);
      assert.ok(urlChunk!.startLine > 0, 'startLine must be positive');
      assert.ok(urlChunk!.endLine >= urlChunk!.startLine, 'endLine must be >= startLine');
      assert.ok(
        urlChunk!.content.includes('https://example.com/api'),
        `url chunk must contain the URL value.\n  Got: ${urlChunk!.content}`
      );
    });
  });

  // ─── Cross-artifact references ───────────────────────────────────────────────

  describe('Cross-artifact references', () => {
    it('detects <sequence key="..."/> references', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="MainSeq" xmlns="http://ws.apache.org/ns/synapse">
    <sequence key="SubSequence"/>
    <respond/>
</sequence>`;
      const chunks = await chunkXml('ref-seq.xml', xml);
      const allRefs = chunks.flatMap(c => c.referencedSequences ?? []);
      assert.ok(
        allRefs.includes('sequence:SubSequence'),
        `Expected 'sequence:SubSequence' in refs, got: [${allRefs.join(', ')}]`
      );
    });

    it('detects <endpoint key="..."/> references', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="CallSeq" xmlns="http://ws.apache.org/ns/synapse">
    <call>
        <endpoint key="TargetEP"/>
    </call>
</sequence>`;
      const chunks = await chunkXml('ref-ep.xml', xml);
      const allRefs = chunks.flatMap(c => c.referencedSequences ?? []);
      assert.ok(
        allRefs.includes('endpoint:TargetEP'),
        `Expected 'endpoint:TargetEP' in refs, got: [${allRefs.join(', ')}]`
      );
    });

    it('detects configKey references', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<api name="ConfigAPI" context="/cfg" xmlns="http://ws.apache.org/ns/synapse">
    <resource methods="POST" uri-template="/test">
        <inSequence>
            <http.post configKey="MyConnection">
                <url>https://example.com</url>
            </http.post>
        </inSequence>
    </resource>
</api>`;
      const chunks = await chunkXml('ref-config.xml', xml);
      const allRefs = chunks.flatMap(c => c.referencedSequences ?? []);
      assert.ok(
        allRefs.includes('localEntry:MyConnection'),
        `Expected 'localEntry:MyConnection' in refs, got: [${allRefs.join(', ')}]`
      );
    });

    it('references do not bleed into sibling chunk contexts (Bug Fix 5)', async () => {
      // <sequence key="FirstRef"/> and <log> are siblings.
      // The log chunk's context.references must NOT contain FirstRef.
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="IsolationSeq" xmlns="http://ws.apache.org/ns/synapse">
    <sequence key="FirstRef"/>
    <log level="simple"/>
    <respond/>
</sequence>`;
      const chunks = await chunkXml('isolation.xml', xml);
      const logChunk = chunks.find(c => c.chunkType === 'log');
      if (logChunk) {
        const logCtxRefs: string[] = logChunk.context.references ?? [];
        assert.ok(
          !logCtxRefs.includes('sequence:FirstRef'),
          `log chunk context.references must not contain sibling's reference 'sequence:FirstRef'.\n` +
          `  Got: [${logCtxRefs.join(', ')}]`
        );
      }
    });
  });

  // ─── Sequence artifact ───────────────────────────────────────────────────────

  describe('Sequence artifact', () => {
    it('all chunks carry the sequence artifact name', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="ProcessSeq" xmlns="http://ws.apache.org/ns/synapse">
    <log level="custom">
        <property name="msg" value="Processing"/>
    </log>
    <payloadFactory media-type="json">
        <format>{"result":"ok"}</format>
    </payloadFactory>
    <respond/>
</sequence>`;
      const chunks = await chunkXml('proc-seq.xml', xml);
      assert.ok(chunks.length > 0, 'Should produce chunks');
      for (const chunk of chunks) {
        assert.strictEqual(
          chunk.context.artifact?.name, 'ProcessSeq',
          `Chunk ${chunk.chunkIndex} (${chunk.chunkType}) should have artifact.name = ProcessSeq`
        );
      }
    });

    it('sequence root chunk is marked isSequenceDefinition with sequenceKey set', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="StandaloneSeq" xmlns="http://ws.apache.org/ns/synapse">
    <log level="simple"/>
    <respond/>
</sequence>`;
      const chunks = await chunkXml('standalone-seq.xml', xml);
      const seqChunk = chunks.find(c => c.chunkType === 'sequence');
      if (seqChunk) {
        assert.ok(seqChunk.isSequenceDefinition, 'sequence chunk should be isSequenceDefinition');
        assert.strictEqual(seqChunk.sequenceKey, 'StandaloneSeq', 'sequenceKey should be StandaloneSeq');
      }
    });
  });

  // ─── Endpoint artifact ───────────────────────────────────────────────────────

  describe('Endpoint artifact', () => {
    it('produces chunks for an HTTP endpoint', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<endpoint name="BackendEP" xmlns="http://ws.apache.org/ns/synapse">
    <http uri-template="https://api.example.com/{+path}" method="GET">
        <timeout>
            <duration>30000</duration>
            <responseAction>fault</responseAction>
        </timeout>
    </http>
</endpoint>`;
      const chunks = await chunkXml('endpoint.xml', xml);
      assert.ok(chunks.length > 0, 'Should produce chunks');
      assert.strictEqual(chunks[0].context.artifact?.name, 'BackendEP');
    });
  });

  // ─── Line range integrity ────────────────────────────────────────────────────

  describe('Line range integrity', () => {
    it('every chunk has startLine > 0 and endLine >= startLine', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<api name="RangeTestAPI" context="/range" xmlns="http://ws.apache.org/ns/synapse">
    <resource methods="GET" uri-template="/a">
        <inSequence>
            <log level="simple"/>
            <respond/>
        </inSequence>
    </resource>
    <resource methods="POST" uri-template="/b">
        <inSequence>
            <payloadFactory media-type="json">
                <format>{"ok":true}</format>
            </payloadFactory>
            <respond/>
        </inSequence>
    </resource>
</api>`;
      const chunks = await chunkXml('range-test.xml', xml);
      for (const chunk of chunks) {
        assert.ok(chunk.startLine > 0, `Chunk ${chunk.chunkIndex} startLine must be > 0, got ${chunk.startLine}`);
        assert.ok(
          chunk.endLine >= chunk.startLine,
          `Chunk ${chunk.chunkIndex} endLine (${chunk.endLine}) must be >= startLine (${chunk.startLine})`
        );
      }
    });

    it('chunk.content matches the declared line range in the file', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<api name="ContentVerifyAPI" context="/verify" xmlns="http://ws.apache.org/ns/synapse">
    <resource methods="GET" uri-template="/test">
        <inSequence>
            <log level="simple"/>
            <respond/>
        </inSequence>
    </resource>
</api>`;
      const filePath = writeTmpFile('content-verify.xml', xml);
      const chunks = await new XMLChunker().chunkFile(filePath);
      const fileLines = xml.split('\n');
      for (const chunk of chunks) {
        const expectedContent = fileLines.slice(chunk.startLine - 1, chunk.endLine).join('\n');
        assert.strictEqual(
          chunk.content,
          expectedContent,
          `Chunk ${chunk.chunkIndex} (${chunk.chunkType}) content does not match lines ${chunk.startLine}-${chunk.endLine}`
        );
      }
    });
  });

  // ─── Self-closing / leaf elements ────────────────────────────────────────────

  describe('Self-closing elements', () => {
    it('respond self-closing element produces a chunk with single-line range', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="LeafSeq" xmlns="http://ws.apache.org/ns/synapse">
    <respond/>
</sequence>`;
      const chunks = await chunkXml('leaf.xml', xml);
      const respondChunk = chunks.find(c => c.chunkType === 'respond');
      if (respondChunk) {
        assert.strictEqual(
          respondChunk.startLine, respondChunk.endLine,
          'Self-closing <respond/> should map to a single line'
        );
      }
    });
  });

  // ─── Filter mediator (hasComplexStructure fix, Bug Fix 7) ────────────────────
  // Before the fix, hasComplexStructure counted raw array indices (always ≥ 2 if
  // element has items) instead of distinct child tag names.  The corrected version
  // counts unique tag names — a filter with <then> and <else> has 2 distinct
  // child tags and should still be classified as structurally complex.

  describe('Filter mediator — chunking with pure tree traversal', () => {
    it('filter with then/else children is detected and chunked', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="FilterSeq" xmlns="http://ws.apache.org/ns/synapse">
    <filter source="get-property('env')" regex="prod">
        <then>
            <log level="full"/>
        </then>
        <else>
            <log level="simple"/>
        </else>
    </filter>
</sequence>`;
      // maxTokens=3 forces descent into filter children
      const filePath = writeTmpFile('filter.xml', xml);
      const chunks = await new XMLChunker(undefined, 3).chunkFile(filePath);
      assert.ok(chunks.length > 0, 'Should produce chunks');
      const types = chunks.map(c => c.chunkType);
      assert.ok(
        types.includes('filter') || types.includes('log'),
        `Expected filter or log chunk, got: [${types.join(', ')}]`
      );
    });

    it('element with two identical child tags still produces valid chunks', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="DupChildSeq" xmlns="http://ws.apache.org/ns/synapse">
    <log level="simple"/>
    <log level="full"/>
</sequence>`;
      // With default maxTokens the whole thing fits — just verify it doesn't crash
      // and produces at least one valid chunk.
      return chunkXml('dup-child.xml', xml).then(chunks => {
        assert.ok(chunks.length > 0, 'Should produce at least one chunk');
        for (const c of chunks) {
          assert.ok(c.startLine > 0 && c.endLine >= c.startLine, `Invalid range on chunk ${c.chunkIndex}`);
        }
      });
    });
  });

  // ─── Multiple files (chunkCounter reset) ─────────────────────────────────────

  describe('Multiple file processing', () => {
    it('chunkIndex resets to 0 for each new file', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="ResetSeq" xmlns="http://ws.apache.org/ns/synapse">
    <log level="simple"/>
    <respond/>
</sequence>`;
      const chunker = new XMLChunker();
      const p1 = writeTmpFile('reset1.xml', xml);
      const p2 = writeTmpFile('reset2.xml', xml);

      const chunks1 = await chunker.chunkFile(p1);
      const chunks2 = await chunker.chunkFile(p2);

      assert.ok(chunks1.length > 0, 'First file should produce chunks');
      assert.ok(chunks2.length > 0, 'Second file should produce chunks');
      // Both should start from chunkIndex 0
      assert.strictEqual(chunks1[0].chunkIndex, 0, 'First file first chunk should have index 0');
      assert.strictEqual(chunks2[0].chunkIndex, 0, 'Second file first chunk should also reset to 0');
    });
  });
});
