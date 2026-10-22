const FENCE = /^---[ \t]*$/;
function unquote(raw) {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if (first === '"' && last === '"') {
      return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\t/g, "	").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    if (first === "'" && last === "'") return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}
function stripComment(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) return raw;
  const match = /(^|\s)#/.exec(raw);
  return match ? raw.slice(0, match.index) : raw;
}
function parseFrontmatter(text) {
  const source = text.charCodeAt(0) === 65279 ? text.slice(1) : text;
  const lines = source.split("\n");
  if (lines.length === 0 || !FENCE.test(lines[0].replace(/\r$/, ""))) {
    return { data: {}, body: source, hasFrontmatter: false };
  }
  let close = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (FENCE.test(lines[index].replace(/\r$/, ""))) {
      close = index;
      break;
    }
  }
  if (close === -1) return { data: {}, body: source, hasFrontmatter: false };
  const data = {};
  let current;
  let block;
  let blockStyle = "literal";
  const flush = () => {
    if (current === void 0) return;
    if (block !== void 0) {
      data[current] = blockStyle === "literal" ? block.join("\n") : block.join(" ").trim();
    }
    block = void 0;
  };
  for (let index = 1; index < close; index += 1) {
    const line = lines[index].replace(/\r$/, "");
    if (line.trim() === "") {
      if (block !== void 0) block.push("");
      continue;
    }
    const member = /^([A-Za-z0-9_-]+)[ \t]*:(.*)$/.exec(line);
    if (member) {
      flush();
      current = member[1];
      const rawValue = stripComment(member[2]);
      const marker = rawValue.trim();
      if (marker === "|" || marker === "|-") {
        blockStyle = "literal";
        block = [];
        continue;
      }
      if (marker === ">" || marker === ">-") {
        blockStyle = "folded";
        block = [];
        continue;
      }
      data[current] = unquote(rawValue);
      current = void 0;
      continue;
    }
    if (block !== void 0 && /^\s/.test(line)) block.push(line.replace(/^ {2}/, ""));
  }
  flush();
  return { data, body: lines.slice(close + 1).join("\n"), hasFrontmatter: true };
}
function frontmatterValue(fm, key) {
  const value = fm.data[key];
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed === "" ? void 0 : trimmed;
}
export {
  frontmatterValue,
  parseFrontmatter
};
