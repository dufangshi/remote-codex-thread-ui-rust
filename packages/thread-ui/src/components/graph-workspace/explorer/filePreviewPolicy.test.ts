import { describe, expect, it } from 'vitest';
import { isBinaryPreview, isDownloadOnlyPath } from './filePreviewPolicy';

describe('download-only previews', () => {
  it('recognizes archives and other unsupported formats without blocking renderers or source', () => {
    for (const path of ['bundle.ZIP', '/tmp/a.tar.gz', 'report.docx', 'data.sqlite', 'video.mp4']) {
      expect(isDownloadOnlyPath(path), path).toBe(true);
    }
    for (const path of ['README', 'x.md', 'x.ts', 'x.png', 'x.pdf', 'x.pdb', 'custom.config']) {
      expect(isDownloadOnlyPath(path), path).toBe(false);
    }
  });
  it('catches unknown binary data while preserving text and an occasional replacement character', () => {
    expect(isBinaryPreview('PK\0abc')).toBe(true);
    expect(isBinaryPreview('ab\u0001\u0002\ufffdcd')).toBe(true);
    expect(isBinaryPreview('hello\n中文\tworld \ufffd')).toBe(false);
    expect(isBinaryPreview('')).toBe(false);
  });
});
