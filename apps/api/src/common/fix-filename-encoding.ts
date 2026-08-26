/**
 * multer/busboy decode multipart `filename` headers as latin1 regardless of
 * the actual encoding, so any non-ASCII original filename (Arabic, etc.)
 * arrives mangled. Re-decoding the mis-interpreted bytes as UTF-8 recovers it.
 */
export function fixFilenameEncoding(originalName: string): string {
  return Buffer.from(originalName, 'latin1').toString('utf8');
}
