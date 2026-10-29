import { realpath, lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

export const MAX_FILE_BYTES = 64 * 1024;
export const MAX_OUTPUT_BYTES = 96 * 1024;
export const MAX_RESULTS = 100;
const SECRET = /(^|\/)(\.env(?:\..*)?|\.git|\.ssh|\.aws|\.gnupg|\.npmrc|id_(rsa|ed25519)|.*\.(?:pem|key|p12|pfx)|secrets?\.(?:json|ya?ml|zsh|sh))($|\/)/i;
export function isSecret(relative: string): boolean { return SECRET.test(relative.replaceAll('\\', '/')); }
export function assertRelative(input: string): string {
  if (!input || input.includes('\0') || path.isAbsolute(input) || /^[a-zA-Z]:/.test(input)) throw new Error('Invalid relative path');
  const normalized = path.normalize(input);
  if (normalized === '..' || normalized.startsWith('..' + path.sep)) throw new Error('Path escapes workspace');
  if (isSecret(normalized)) throw new Error('Sensitive path blocked');
  return normalized;
}
export function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}
export async function resolveSafe(root: string, input: string): Promise<string> {
  const rel = assertRelative(input);
  const target = await realpath(path.resolve(root, rel));
  if (!inside(root, target)) throw new Error('Symlink escapes workspace');
  return target;
}
export async function readSafe(root: string, input: string): Promise<{file:string;content:string;bytes:number}> {
  const filename = await resolveSafe(root, input);
  const initial = await lstat(filename);
  if (!initial.isFile() || initial.size > MAX_FILE_BYTES) throw new Error('File is not regular or exceeds size limit');
  // O_NOFOLLOW prevents swapping the final component for a symlink during open.
  const fd = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const actual = await fd.stat();
    if (!actual.isFile() || actual.size > MAX_FILE_BYTES || actual.ino !== initial.ino || actual.dev !== initial.dev) throw new Error('File changed during authorization');
    const buffer = Buffer.alloc(actual.size);
    const { bytesRead } = await fd.read(buffer, 0, actual.size, 0);
    if (buffer.subarray(0, bytesRead).includes(0)) throw new Error('Binary file not supported');
    return {file:path.relative(root, filename), content:buffer.subarray(0, bytesRead).toString('utf8'),bytes:bytesRead};
  } finally { await fd.close(); }
}
