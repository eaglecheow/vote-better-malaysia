import { expect, test } from 'vitest';

/** Checks the unit harness only; returns nothing and exercises no feature behavior. */
function checksHarness(): void {
  expect(new TextEncoder().encode('BM').byteLength).toBe(2);
}

test('harness: executes an assertion', checksHarness);
