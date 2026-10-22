/**
 * Minimal ZIP reader and writer.
 *
 * Downloads must carry a whole skill directory — attachments included — and
 * uploads must be checked before a single byte reaches the real tree, so the
 * plugin needs both directions. Node ships DEFLATE but no ZIP container, and a
 * dependency for this much format would be a poor trade: the subset below is
 * `stored` plus `deflate`, which is what every archiver emits and what our own
 * writer produces. ZIP64, encryption, and every other method are refused with
 * the format rejection rather than guessed at.
 */
import { deflateRawSync, inflateRawSync } from 'node:zlib';

/** Local file header signature. */
const LOCAL = 0x04034b50;
/** Central directory header signature. */
const CENTRAL = 0x02014b50;
/** End of central directory signature. */
const END = 0x06054b50;

/** One member of an archive. */
export interface ZipEntry {
  /** Forward-slash relative name; directories end with `/`. */
  readonly name: string;
  /** Unix permission bits recovered from the external attributes, or a sane default. */
  readonly mode: number;
  /** Whether the member is a directory. */
  readonly directory: boolean;
  /** Uncompressed bytes (empty for directories). */
  readonly data: Buffer;
  /** Modification time recorded in the archive. */
  readonly mtime: Date;
}

/** Rejection raised by the archive code; always the format rejection. */
export class ZipRefused extends Error {
  /** Wire error code the client localizes. */
  readonly code = 'unrecognized-format';

  /** @param message - English explanation. */
  constructor(message: string) {
    super(message);
    this.name = 'ZipRefused';
  }
}

/** Precomputed CRC-32 table. */
const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

/**
 * CRC-32 of a buffer.
 * @param buffer - input bytes.
 * @returns the checksum.
 */
export function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Convert a date to the DOS date/time pair stored in a ZIP header.
 * @param date - the moment to encode.
 * @returns the DOS time and date words.
 */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Convert a DOS date/time pair back to a `Date`.
 * @param time - DOS time word.
 * @param date - DOS date word.
 * @returns the decoded moment.
 */
function fromDos(time: number, date: number): Date {
  return new Date(
    1980 + ((date >> 9) & 0x7f),
    ((date >> 5) & 0x0f) - 1,
    date & 0x1f,
    (time >> 11) & 0x1f,
    (time >> 5) & 0x3f,
    (time & 0x1f) * 2,
  );
}

/** One member as the writer receives it, before headers exist. */
export interface ZipInput {
  /** Forward-slash relative name; directories must end with `/`. */
  readonly name: string;
  /** Unix permission bits. */
  readonly mode: number;
  /** Modification time. */
  readonly mtime: Date;
  /** File contents; ignored for directories. */
  readonly data?: Buffer;
}

/**
 * Build an archive from explicit members.
 * @param inputs - members in the order they should appear.
 * @returns the complete archive.
 */
export function buildZip(inputs: readonly ZipInput[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const input of inputs) {
    const directory = input.name.endsWith('/');
    const nameBytes = Buffer.from(input.name, 'utf8');
    const data = directory ? Buffer.alloc(0) : (input.data ?? Buffer.alloc(0));
    const checksum = crc32(data);
    const { time, date } = dosDateTime(input.mtime);
    const mode = (input.mode & 0o777) || (directory ? 0o755 : 0o644);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    // The high 16 bits carry the Unix mode; the low 16 bits are DOS attributes.
    central.writeUInt32LE((((directory ? 0o040000 : 0o100000) | mode) << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(inputs.length, 8);
  end.writeUInt16LE(inputs.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuffer, end]);
}

/**
 * Whether a buffer starts like a ZIP archive.
 * @param buffer - candidate bytes.
 * @returns whether the local-file or empty-archive signature is present.
 */
export function looksLikeZip(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const signature = buffer.readUInt32LE(0);
  return signature === LOCAL || signature === 0x06054b50;
}

/**
 * Normalize and vet one member name from an archive.
 * @param raw - name as stored in the archive.
 * @returns the normalized forward-slash name.
 * @throws {ZipRefused} for absolute paths, drive letters, `..` segments, NUL
 *   bytes, or anything that is not a relative path.
 */
export function normalizeEntryName(raw: string): string {
  if (raw === '') throw new ZipRefused('The archive contains an entry with an empty name');
  if (raw.includes('\0')) throw new ZipRefused('The archive contains an entry name with a NUL byte');
  const slashed = raw.replace(/\\/g, '/');
  if (slashed.startsWith('/')) throw new ZipRefused('The archive contains an absolute path');
  if (/^[A-Za-z]:/.test(slashed)) throw new ZipRefused('The archive contains a drive-letter path');
  const segments = slashed.split('/');
  for (const segment of segments) {
    if (segment === '..') throw new ZipRefused('The archive contains a path traversal segment');
    if (segment === '.') throw new ZipRefused('The archive contains a redundant "." segment');
  }
  return slashed;
}

/**
 * Read an archive into members.
 * @param buffer - complete archive bytes.
 * @returns the members in archive order.
 * @throws {ZipRefused} for a truncated archive, ZIP64, an encrypted member, an
 *   unsupported method, a symlink member, or a bad member name.
 */
export function readZip(buffer: Buffer): ZipEntry[] {
  if (!looksLikeZip(buffer)) throw new ZipRefused('The upload is not a ZIP archive');

  let endOffset = -1;
  const floor = Math.max(0, buffer.length - 0x10000 - 22);
  for (let index = buffer.length - 22; index >= floor; index -= 1) {
    if (buffer.readUInt32LE(index) === END) {
      endOffset = index;
      break;
    }
  }
  if (endOffset === -1) throw new ZipRefused('The archive has no end-of-central-directory record');

  const count = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (centralOffset === 0xffffffff || centralSize === 0xffffffff || count === 0xffff) {
    throw new ZipRefused('ZIP64 archives are not supported');
  }
  if (centralOffset + centralSize > buffer.length) throw new ZipRefused('The archive central directory is truncated');

  const entries: ZipEntry[] = [];
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== CENTRAL) {
      throw new ZipRefused('The archive central directory is malformed');
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const time = buffer.readUInt16LE(cursor + 12);
    const date = buffer.readUInt16LE(cursor + 14);
    const crc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const size = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const external = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);

    if ((flags & 0x0001) !== 0) throw new ZipRefused('Encrypted archives are not supported');
    if (compressedSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff) {
      throw new ZipRefused('ZIP64 archives are not supported');
    }
    const rawName = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    const name = normalizeEntryName(rawName);
    cursor += 46 + nameLength + extraLength + commentLength;

    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== LOCAL) {
      throw new ZipRefused('The archive local header is malformed');
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > buffer.length) throw new ZipRefused('The archive member data is truncated');
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);

    const typeBits = (external >>> 16) & 0xf000;
    if (typeBits === 0xa000) throw new ZipRefused('Symbolic links are not allowed in a skill archive');
    const directory = name.endsWith('/');
    let data: Buffer;
    if (directory) {
      data = Buffer.alloc(0);
    } else if (method === 0) {
      data = Buffer.from(raw);
    } else if (method === 8) {
      try {
        data = inflateRawSync(raw);
      } catch {
        throw new ZipRefused('The archive member could not be decompressed');
      }
    } else {
      throw new ZipRefused(`The archive uses unsupported compression method ${method}`);
    }
    if (!directory && crc32(data) !== crc) throw new ZipRefused('The archive member checksum does not match');

    const mode = ((external >>> 16) & 0o777) || (directory ? 0o755 : 0o644);
    entries.push({ name, mode, directory, data, mtime: fromDos(time, date) });
  }
  return entries;
}
