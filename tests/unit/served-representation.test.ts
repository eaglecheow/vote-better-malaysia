import { expect, test } from 'vitest';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { verifyServedFile } from '../../scripts/collect-performance.ts';

const path = 'data/sittings/1.json.gz';

/** Hashes original fixture bytes without normalizing JSON or compression. @param bytes Exact stored or decoded representation. @returns Canonical SHA-256 hexadecimal digest. */
function sha(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }

/** Creates canonical byte-only representation fixtures, without asserting actual Hansard or lab evidence. @param large Whether decoded JSON must exceed the current stored-plus65536 wire bound. @returns Exact JSON, canonical stored gzip and independently supplied decoded metadata. */
function fixture(large = false) {
  const decoded = Buffer.from(JSON.stringify({ scope: 'Synthetic representation unit fixture', text: 'Original source-byte fixture. '.repeat(large ? 6000 : 60) }));
  const stored = gzipSync(decoded, { level: 9 });
  return { decoded, stored, decodedResource: { bytes: decoded.length, hash: sha(decoded) } };
}

/** Serves exact response bytes through native loopback HTTP rather than mocked transport. @param body Wire body supplied by the isolated server. @param encoding Optional actual HTTP Content-Encoding. @param inspect Assertion callback using the actual ephemeral URL. @returns Promise after inspection and native listener cleanup. @remarks Opens only random127.0.0.1 HTTP, writes fixture headers/body and closes its connections. @throws Native listener/read errors or an assertion failure; these setup errors are not RED evidence. */
async function served(body: Buffer, encoding: 'gzip' | 'br' | null, inspect: (url: URL) => Promise<void>): Promise<void> {
  const server = createServer(
    /** Writes one unmodified native response body. @param _request Actual loopback request. @param response Native response stream. @returns Nothing. @remarks Sends exact controlled headers/body, without simulating decompression or reader behavior. */
    (_request: IncomingMessage, response: ServerResponse) => {
      response.setHeader('Content-Type', 'application/json'); response.setHeader('Content-Length', body.length);
      if (encoding) response.setHeader('Content-Encoding', encoding); response.end(body);
    },
  );
  await new Promise<void>(
    /** Opens the random native loopback listener. @param resolve Successful listener callback. @param reject Listener failure callback. @returns Nothing. @remarks Registers actual native server callbacks. */
    (resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); },
  );
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('native loopback listener unavailable');
    await inspect(new URL(`http://127.0.0.1:${address.port}/${path}`));
  } finally {
    server.closeAllConnections(); await new Promise<void>(
      /** Waits for actual listener shutdown. @param resolve Shutdown callback. @param reject Shutdown failure callback. @returns Nothing. @remarks Closes the controlled native server. */
      (resolve, reject) => { server.close(
        /** Reports native shutdown completion. @param error Optional close error. @returns Nothing. @remarks Resolves or rejects the captured cleanup promise. */
        (error?: Error) => { if (error) reject(error); else resolve(); },
      ); },
    );
  }
}

test.each(['identity-small', 'identity-large', 'gzip-json', 'br-json'] as const)('REPRESENTATION001: accepts frozen decoded JSON via %s and records actual wire body bytes',
  /** Checks each contract-supported native representation independently. @param representation HTTP representation to serve. @returns Promise after the expected acceptance/count assertion. */
  async (representation) => {
    const source = fixture(representation === 'identity-large'); let body = source.decoded; let encoding: 'gzip' | 'br' | null = null;
    if (representation === 'identity-small') expect(source.decoded.length).toBeLessThan(source.stored.length + 65536);
    if (representation === 'identity-large') expect(source.decoded.length).toBeGreaterThan(source.stored.length + 65536);
    if (representation === 'gzip-json') { body = gzipSync(source.decoded, { level: 1 }); encoding = 'gzip'; expect(body.equals(source.stored)).toBe(false); }
    if (representation === 'br-json') { body = brotliCompressSync(source.decoded); encoding = 'br'; }
    await served(body, encoding,
      /** Asserts the real helper accepts exactly the frozen decoded payload and counts its observed wire representation. @param url Actual random-port HTTP URL. @returns Promise after the behavioral assertion. */
      async (url) => { await expect(verifyServedFile(url, path, source.stored.length, sha(source.stored), source.decodedResource)).resolves.toBe(body.length); },
    );
  });

test.each(['identity-stored-gzip', 'transport-gzip-stored-gzip'] as const)('REPRESENTATION002: existing %s acceptance retains actual wire counts as a GREEN control',
  /** Checks preexisting gzip delivery independently of the new decoded-JSON cases. @param representation Stored or double-encoded HTTP representation. @returns Promise after existing behavior is confirmed. */
  async (representation) => {
    const source = fixture(); const encoding = representation === 'identity-stored-gzip' ? null : 'gzip';
    const body = encoding ? gzipSync(source.stored, { level: 9 }) : source.stored;
    await served(body, encoding,
      /** Checks existing real transport support. @param url Actual native loopback URL. @returns Promise after the acceptance/count control. */
      async (url) => { await expect(verifyServedFile(url, path, source.stored.length, sha(source.stored), source.decodedResource)).resolves.toBe(body.length); },
    );
  });

test('REPRESENTATION003: same-length altered JSON remains rejected as a GREEN integrity control',
  /** Checks decoded support cannot bypass exact frozen-byte integrity. @returns Promise after real native response rejection. */
  async () => {
    const source = fixture(); const wrong = Buffer.from(source.decoded); wrong[wrong.indexOf('Original')] = 'X'.charCodeAt(0);
    expect(wrong.length).toBe(source.decoded.length); expect(sha(wrong)).not.toBe(source.decodedResource.hash);
    await served(wrong, null,
      /** Checks the real byte-hash boundary rather than JSON meaning or equal lengths. @param url Actual native loopback URL. @returns Promise after the integrity rejection control. */
      async (url) => { await expect(verifyServedFile(url, path, source.stored.length, sha(source.stored), source.decodedResource)).rejects.toThrow(/frozen|differ/i); },
    );
  });
