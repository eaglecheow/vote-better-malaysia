// @vitest-environment jsdom
import { expect, test } from 'vitest';

/** Verifies only that the DOM unit harness supplies native document/element APIs. */
function checksDomHarness(): void {
  expect(document.createElement('div')).toBeInstanceOf(HTMLElement);
}

test('harness: supplies a DOM without reader behavior or layout claims', checksDomHarness);
