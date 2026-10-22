import { inflateRawSync } from "node:zlib";
const LOCAL = 67324752;
const CENTRAL = 33639248;
const END = 101010256;
class ZipRefused extends Error {
  /** Wire error code the client localizes. */
  code = "unrecognized-format";
  /** @param message - English explanation. */
  constructor(message) {
    super(message);
    this.name = "ZipRefused";
  }
}
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();
function crc32(buffer) {
  let crc = 4294967295;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: date.getHours() << 11 | date.getMinutes() << 5 | Math.floor(date.getSeconds() / 2),
    date: year - 1980 << 9 | date.getMonth() + 1 << 5 | date.getDate()
  };
}
function fromDos(time, date) {
  return new Date(
    1980 + (date >> 9 & 127),
    (date >> 5 & 15) - 1,
    date & 31,
    time >> 11 & 31,
    time >> 5 & 63,
    (time & 31) * 2
  );
}
function buildZip(inputs) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const input of inputs) {
    const directory = input.name.endsWith("/");
    const nameBytes = Buffer.from(input.name, "utf8");
    const data = directory ? Buffer.alloc(0) : input.data ?? Buffer.alloc(0);
    const checksum = crc32(data);
    const { time, date } = dosDateTime(input.mtime);
    const mode = input.mode & 511 || (directory ? 493 : 420);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(2048, 6);
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
    central.writeUInt16LE(788, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(2048, 8);
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
    central.writeUInt32LE(((directory ? 16384 : 32768) | mode) << 16 >>> 0, 38);
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
function looksLikeZip(buffer) {
  if (buffer.length < 4) return false;
  const signature = buffer.readUInt32LE(0);
  return signature === LOCAL || signature === 101010256;
}
function normalizeEntryName(raw) {
  if (raw === "") throw new ZipRefused("The archive contains an entry with an empty name");
  if (raw.includes("\0")) throw new ZipRefused("The archive contains an entry name with a NUL byte");
  const slashed = raw.replace(/\\/g, "/");
  if (slashed.startsWith("/")) throw new ZipRefused("The archive contains an absolute path");
  if (/^[A-Za-z]:/.test(slashed)) throw new ZipRefused("The archive contains a drive-letter path");
  const segments = slashed.split("/");
  for (const segment of segments) {
    if (segment === "..") throw new ZipRefused("The archive contains a path traversal segment");
    if (segment === ".") throw new ZipRefused('The archive contains a redundant "." segment');
  }
  return slashed;
}
function readZip(buffer) {
  if (!looksLikeZip(buffer)) throw new ZipRefused("The upload is not a ZIP archive");
  let endOffset = -1;
  const floor = Math.max(0, buffer.length - 65536 - 22);
  for (let index = buffer.length - 22; index >= floor; index -= 1) {
    if (buffer.readUInt32LE(index) === END) {
      endOffset = index;
      break;
    }
  }
  if (endOffset === -1) throw new ZipRefused("The archive has no end-of-central-directory record");
  const count = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (centralOffset === 4294967295 || centralSize === 4294967295 || count === 65535) {
    throw new ZipRefused("ZIP64 archives are not supported");
  }
  if (centralOffset + centralSize > buffer.length) throw new ZipRefused("The archive central directory is truncated");
  const entries = [];
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== CENTRAL) {
      throw new ZipRefused("The archive central directory is malformed");
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
    if ((flags & 1) !== 0) throw new ZipRefused("Encrypted archives are not supported");
    if (compressedSize === 4294967295 || size === 4294967295 || localOffset === 4294967295) {
      throw new ZipRefused("ZIP64 archives are not supported");
    }
    const rawName = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    const name = normalizeEntryName(rawName);
    cursor += 46 + nameLength + extraLength + commentLength;
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== LOCAL) {
      throw new ZipRefused("The archive local header is malformed");
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > buffer.length) throw new ZipRefused("The archive member data is truncated");
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    const typeBits = external >>> 16 & 61440;
    if (typeBits === 40960) throw new ZipRefused("Symbolic links are not allowed in a skill archive");
    const directory = name.endsWith("/");
    let data;
    if (directory) {
      data = Buffer.alloc(0);
    } else if (method === 0) {
      data = Buffer.from(raw);
    } else if (method === 8) {
      try {
        data = inflateRawSync(raw);
      } catch {
        throw new ZipRefused("The archive member could not be decompressed");
      }
    } else {
      throw new ZipRefused(`The archive uses unsupported compression method ${method}`);
    }
    if (!directory && crc32(data) !== crc) throw new ZipRefused("The archive member checksum does not match");
    const mode = external >>> 16 & 511 || (directory ? 493 : 420);
    entries.push({ name, mode, directory, data, mtime: fromDos(time, date) });
  }
  return entries;
}
export {
  ZipRefused,
  buildZip,
  crc32,
  looksLikeZip,
  normalizeEntryName,
  readZip
};
