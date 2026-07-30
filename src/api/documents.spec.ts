import { describe, expect, it } from 'vitest';
import { MAX_BATCH_BYTES, MAX_BATCH_FILES, batchFilesForUpload } from './documents';

const file = (bytes: number, name = 'f') => ({ dataBase64: 'x'.repeat(bytes), name });

/**
 * "Upload as many PDFs as they want at once" is delivered by splitting the
 * selection into requests the API will accept. If this splits wrongly the user
 * sees a 413 or a 400 on a batch they can't identify, so the boundaries are
 * worth pinning down directly.
 */
describe('batchFilesForUpload', () => {
  it('keeps a small selection in one request', () => {
    const batches = batchFilesForUpload([file(10), file(10), file(10)]);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(3);
  });

  it('splits on the file-count cap', () => {
    const batches = batchFilesForUpload(Array.from({ length: MAX_BATCH_FILES + 3 }, () => file(10)));
    expect(batches.map((b) => b.length)).toEqual([MAX_BATCH_FILES, 3]);
  });

  it('splits on the byte cap before the count cap is reached', () => {
    const half = Math.floor(MAX_BATCH_BYTES * 0.6);
    const batches = batchFilesForUpload([file(half), file(half), file(half)]);
    // Two 60% files don't fit together, so each lands in its own request.
    expect(batches.map((b) => b.length)).toEqual([1, 1, 1]);
  });

  it('preserves order, so a reported index still maps to the right file', () => {
    const files = Array.from({ length: 30 }, (_, i) => file(10, `file-${i}`));
    const flattened = batchFilesForUpload(files).flat();
    expect(flattened.map((f) => f.name)).toEqual(files.map((f) => f.name));
  });

  it('never emits an empty batch, including for an empty selection', () => {
    expect(batchFilesForUpload([])).toEqual([]);
    // One oversized file still gets sent — the API rejects it with a message
    // about that file, which beats a silent client-side drop.
    const batches = batchFilesForUpload([file(MAX_BATCH_BYTES * 2)]);
    expect(batches).toHaveLength(1);
  });
});
