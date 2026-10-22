window.__ModuleLoader__.load({
  id: "@dr-co/dsh-skills",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  PANEL_ID: () => PANEL_ID,
  RUSSIAN_LANGUAGE: () => RUSSIAN_LANGUAGE,
  SkillsPanelIcon: () => SkillsPanelIcon,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var React6 = __toESM(require("react"), 1);

// src/client/locales.js
var NS = "dsh-skills";
var en = {
  panel: "Skills",
  heading: "Skills",
  subtitle: "Skills in {root}",
  count: "{count} skills",
  countOne: "1 skill",
  columnStatus: "Status",
  columnName: "Skill",
  columnPath: "Path",
  columnActions: "Actions",
  listLabel: "Installed skills",
  rowLabel: "{name} \xB7 {status} \xB7 {path}",
  statusActive: "Active",
  statusDisabled: "Disabled",
  statusNote: "Status is read-only in this version: rename SKILL.md to _SKILL.md on disk to disable a skill.",
  actionsFor: "Actions for {name}",
  moreActions: "More actions",
  downloadMd: "Download SKILL.md",
  downloadZip: "Download ZIP",
  upload: "Upload",
  edit: "Edit SKILL.md",
  emptyTitle: "No skills installed",
  emptyBody: "Add a directory containing SKILL.md to {root}, or upload a skill here.",
  loadFailed: "Could not load the skills list.",
  retry: "Retry",
  uploading: "Uploading\u2026",
  uploadTitle: "Upload a skill",
  uploadCreated: "Created skill {dir}.",
  uploadReplaced: "Replaced skill {dir}.",
  uploadFailed: "Upload rejected.",
  editorTitle: "Editing {path}",
  editorCancel: "Cancel",
  editorSave: "Save",
  editorSaveTitle: "Write the file and return to the list",
  editorUnchanged: "No changes yet",
  editorPreview: "Preview",
  editorPreviewEmpty: "Nothing to preview yet.",
  editorChangedOnDisk: "This file changed on disk since you opened it. Saving replaces those changes.",
  editorLoading: "Loading the file\u2026",
  editorOpenFailed: "Could not open {dir}.",
  saveFailed: "Could not save {dir}.",
  saveDone: "Saved {path}.",
  discardChanges: "Discard your changes?",
  errorUnrecognizedFormat: "Unrecognized skill format",
  errorNameMismatch: "The uploaded SKILL.md does not match an installed skill",
  errorNotFound: "Skill not found",
  errorTooLarge: "File too large",
  errorWriteFailed: "Could not write the file",
  errorBadRequest: "Bad request",
  errorUnknown: "Something went wrong",
  errorNetwork: "Could not reach the DSH host"
};
var ru = {
  panel: "\u0421\u043A\u0438\u043B\u043B\u044B",
  heading: "\u0421\u043A\u0438\u043B\u043B\u044B",
  subtitle: "\u0421\u043A\u0438\u043B\u043B\u044B \u0432 {root}",
  count: "\u0421\u043A\u0438\u043B\u043B\u043E\u0432: {count}",
  countOne: "1 \u0441\u043A\u0438\u043B\u043B",
  columnStatus: "\u0421\u0442\u0430\u0442\u0443\u0441",
  columnName: "\u0421\u043A\u0438\u043B\u043B",
  columnPath: "\u041F\u0443\u0442\u044C",
  columnActions: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
  listLabel: "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0441\u043A\u0438\u043B\u043B\u044B",
  rowLabel: "{name} \xB7 {status} \xB7 {path}",
  statusActive: "\u0410\u043A\u0442\u0438\u0432\u0435\u043D",
  statusDisabled: "\u041E\u0442\u043A\u043B\u044E\u0447\u0451\u043D",
  statusNote: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0432 \u044D\u0442\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F: \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u043A\u0438\u043B\u043B, \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u0443\u0439 SKILL.md \u0432 _SKILL.md \u043D\u0430 \u0434\u0438\u0441\u043A\u0435.",
  actionsFor: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0434\u043B\u044F {name}",
  moreActions: "\u0415\u0449\u0451 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
  downloadMd: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C SKILL.md",
  downloadZip: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C ZIP",
  upload: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C",
  edit: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C SKILL.md",
  emptyTitle: "\u0421\u043A\u0438\u043B\u043B\u043E\u0432 \u043D\u0435\u0442",
  emptyBody: "\u041F\u043E\u043B\u043E\u0436\u0438 \u0432 {root} \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441 \u0444\u0430\u0439\u043B\u043E\u043C SKILL.md \u0438\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438 \u0441\u043A\u0438\u043B\u043B \u0437\u0434\u0435\u0441\u044C.",
  loadFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u043A\u0438\u043B\u043B\u043E\u0432.",
  retry: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C",
  uploading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026",
  uploadTitle: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043A\u0438\u043B\u043B\u0430",
  uploadCreated: "\u0421\u043A\u0438\u043B\u043B {dir} \u0441\u043E\u0437\u0434\u0430\u043D.",
  uploadReplaced: "\u0421\u043A\u0438\u043B\u043B {dir} \u0437\u0430\u043C\u0435\u043D\u0451\u043D.",
  uploadFailed: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430.",
  editorTitle: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 {path}",
  editorCancel: "\u041E\u0442\u043C\u0435\u043D\u0430",
  editorSave: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
  editorSaveTitle: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0444\u0430\u0439\u043B \u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u0441\u043F\u0438\u0441\u043A\u0443",
  editorUnchanged: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u043D\u0435\u0442",
  editorPreview: "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440",
  editorPreviewEmpty: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0447\u0435\u0433\u043E \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C.",
  editorChangedOnDisk: "\u0424\u0430\u0439\u043B \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u043D\u0430 \u0434\u0438\u0441\u043A\u0435 \u043F\u043E\u0441\u043B\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F. \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0448\u0435\u0442 \u044D\u0442\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F.",
  editorLoading: "\u0427\u0438\u0442\u0430\u044E \u0444\u0430\u0439\u043B\u2026",
  editorOpenFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C {dir}.",
  saveFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C {dir}.",
  saveDone: "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: {path}.",
  discardChanges: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F?",
  errorUnrecognizedFormat: "\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u0435\u043C\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0441\u043A\u0438\u043B\u043B\u0430",
  errorNameMismatch: "\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0439 SKILL.md \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u043D\u0438 \u0441 \u043E\u0434\u043D\u0438\u043C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u043C \u0441\u043A\u0438\u043B\u043B\u043E\u043C",
  errorNotFound: "\u0421\u043A\u0438\u043B\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
  errorTooLarge: "\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439",
  errorWriteFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0444\u0430\u0439\u043B",
  errorBadRequest: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441",
  errorUnknown: "\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A",
  errorNetwork: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441 \u0445\u043E\u0441\u0442\u043E\u043C DSH"
};
var ERROR_KEYS = {
  "unrecognized-format": "errorUnrecognizedFormat",
  "name-mismatch": "errorNameMismatch",
  "not-found": "errorNotFound",
  "too-large": "errorTooLarge",
  "write-failed": "errorWriteFailed",
  "bad-request": "errorBadRequest",
  network: "errorNetwork"
};
function errorText(t, code) {
  const key = ERROR_KEYS[code] ?? "errorUnknown";
  return t(key);
}

// src/client/page.js
var React5 = __toESM(require("react"), 1);

// src/client/api.js
var API_PREFIX = "/dsh-skills/api";
var ApiError = class extends Error {
  /**
   * @param code - wire code such as `unrecognized-format`.
   * @param message - English diagnostic from the host, or a transport note.
   */
  constructor(code, message) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
};
async function decode(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const code = typeof payload?.code === "string" ? payload.code : "write-failed";
    const message = typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}`;
    throw new ApiError(code, message);
  }
  if (payload === null) throw new ApiError("write-failed", "The host answered with no JSON body");
  return payload;
}
async function call(path, init) {
  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, init);
  } catch (error) {
    throw new ApiError("network", error instanceof Error ? error.message : String(error));
  }
  return decode(response);
}
var api = {
  /**
   * List every skill directory, active and disabled.
   * @returns the root and the rows.
   */
  list() {
    return call("/skills", { headers: { accept: "application/json" } });
  },
  /**
   * Read one skill file.
   * @param dir - skill directory name.
   * @returns the file name, contents, and modification time.
   */
  read(dir) {
    return call(`/skill/${encodeURIComponent(dir)}`, { headers: { accept: "application/json" } });
  },
  /**
   * Save one skill file.
   * @param dir - skill directory name.
   * @param content - new contents.
   * @returns the written file name and modification time.
   */
  save(dir, content) {
    return call(`/skill/${encodeURIComponent(dir)}`, {
      method: "PUT",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ content })
    });
  },
  /**
   * Upload one file; the host decides the format from the bytes.
   * @param file - the picked File or Blob.
   * @param name - the file's name, used only for a single-file upload.
   * @returns the applied action and directory.
   */
  upload(file, name2) {
    return call("/upload", {
      method: "POST",
      headers: { "content-type": "application/octet-stream", [FILENAME_HEADER]: encodeURIComponent(name2) },
      body: file
    });
  },
  /**
   * Trigger a browser download of one URL.
   * @param path - path under the API prefix.
   * @param filename - suggested file name.
   */
  download(path, filename) {
    if (typeof document === "undefined") return;
    const anchor = document.createElement("a");
    anchor.href = `${API_PREFIX}${path}`;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
};

// src/client/editor.js
var React2 = __toESM(require("react"), 1);

// src/client/markdown.js
var React = __toESM(require("react"), 1);
var h = React.createElement;
var FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
var HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
var THEMATIC = /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
var LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
var TABLE_RULE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
function splitRow(line) {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  const cells = [];
  let current = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\\" && text[index + 1] === "|") {
      current += "|";
      index += 1;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}
function startsBlock(line) {
  return FENCE.test(line) || HEADING.test(line) || THEMATIC.test(line) || LIST_ITEM.test(line) || /^\s*>/.test(line);
}
function safeHref(href) {
  const value = href.trim();
  if (value === "") return null;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("#") || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) {
    return value;
  }
  return null;
}
var inlinePattern = () => /(`+)([\s\S]*?)\1|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*\s][\s\S]*?)\*|_([^_\s][\s\S]*?)_|\[([^\]]*)\]\(([^)\s]*)\)/g;
function renderInline(text, keyPrefix = "i") {
  const nodes = [];
  let last = 0;
  let counter = 0;
  const pattern = inlinePattern();
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${counter}`;
    counter += 1;
    if (match[2] !== void 0) {
      nodes.push(h("code", { key, className: "dshsk-code" }, match[2].trim()));
    } else if (match[3] !== void 0 || match[4] !== void 0) {
      nodes.push(h("strong", { key }, renderInline(match[3] ?? match[4], key)));
    } else if (match[5] !== void 0) {
      nodes.push(h("del", { key }, renderInline(match[5], key)));
    } else if (match[6] !== void 0 || match[7] !== void 0) {
      nodes.push(h("em", { key }, renderInline(match[6] ?? match[7], key)));
    } else if (match[8] !== void 0) {
      const href = safeHref(match[9] ?? "");
      if (href === null) {
        nodes.push(text.slice(match.index, match.index + match[0].length));
      } else {
        nodes.push(
          h("a", { key, href, rel: "noreferrer noopener", target: "_blank" }, renderInline(match[8], key))
        );
      }
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
function renderList(items, ordered, keyPrefix) {
  return h(
    ordered ? "ol" : "ul",
    { key: keyPrefix, className: "dshsk-list" },
    items.map(
      (item, index) => h("li", { key: `${keyPrefix}-${index}` }, renderInline(item.text, `${keyPrefix}-${index}`))
    )
  );
}
function renderMarkdown(source) {
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  let key = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1][0];
      const language = fence[2];
      const body = [];
      index += 1;
      while (index < lines.length && !new RegExp(`^ {0,3}${marker}{3,}\\s*$`).test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        h(
          "pre",
          { key: `b${key++}`, className: "dshsk-pre" },
          h("code", { className: language ? `dshsk-fence language-${language}` : "dshsk-fence" }, body.join("\n"))
        )
      );
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6);
      blocks.push(h(`h${level}`, { key: `b${key++}`, className: "dshsk-heading" }, renderInline(heading[2])));
      index += 1;
      continue;
    }
    if (THEMATIC.test(line)) {
      blocks.push(h("hr", { key: `b${key++}`, className: "dshsk-hr" }));
      index += 1;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quoted = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoted.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(
        h("blockquote", { key: `b${key++}`, className: "dshsk-quote" }, renderMarkdown(quoted.join("\n")))
      );
      continue;
    }
    if (line.includes("|") && index + 1 < lines.length && TABLE_RULE.test(lines[index + 1])) {
      const header = splitRow(line);
      const alignRow = splitRow(lines[index + 1]);
      const align = alignRow.map(
        (cell) => cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : "left"
      );
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim() !== "") {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push(
        h(
          "div",
          { key: `b${key++}`, className: "dshsk-tableWrap" },
          h(
            "table",
            { className: "dshsk-table" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                header.map(
                  (cell, column) => h("th", { key: `h${column}`, style: { textAlign: align[column] ?? "left" } }, renderInline(cell))
                )
              )
            ),
            h(
              "tbody",
              null,
              rows.map(
                (row, rowIndex) => h(
                  "tr",
                  { key: `r${rowIndex}` },
                  header.map(
                    (_, column) => h(
                      "td",
                      { key: `c${column}`, style: { textAlign: align[column] ?? "left" } },
                      renderInline(row[column] ?? "")
                    )
                  )
                )
              )
            )
          )
        )
      );
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      const items = [];
      let ordered = false;
      while (index < lines.length) {
        const current = LIST_ITEM.exec(lines[index]);
        if (!current) break;
        ordered = /\d/.test(current[2]);
        items.push({ text: current[3], indent: current[1].replace(/\t/g, "  ").length });
        index += 1;
      }
      blocks.push(renderList(items, ordered, `b${key++}`));
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== "" && !startsBlock(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(h("p", { key: `b${key++}`, className: "dshsk-p" }, renderInline(paragraph.join("\n"))));
  }
  return blocks;
}
function renderMarkdownBlock(source, empty = null) {
  const blocks = renderMarkdown(source);
  if (blocks.length === 0) {
    return h("div", { className: "dshsk-md dshsk-mdEmpty" }, empty);
  }
  return h("div", { className: "dshsk-md" }, blocks);
}

// src/client/editor.js
var h2 = React2.createElement;
function SkillEditor({ t, path, initialContent, onCancel, onSave, saving, warning, error, compact = false }) {
  const [content, setContent] = React2.useState(initialContent ?? "");
  React2.useEffect(() => setContent(initialContent ?? ""), [initialContent]);
  const dirty = content !== (initialContent ?? "");
  const saveDisabled = !dirty || saving === true;
  return h2(
    "div",
    { className: "dshsk-editor", "data-layout": compact ? "compact" : "wide" },
    h2(
      "div",
      { className: "dshsk-editorHead" },
      h2(
        "div",
        { className: "dshsk-headText" },
        h2("h2", { className: "dshsk-editorTitle" }, t("editorTitle", { path })),
        h2("p", { className: "dshsk-editorMeta" }, dirty ? "" : t("editorUnchanged"))
      )
    ),
    warning === true ? h2("div", { className: "dshsk-notice", "data-tone": "warn", role: "status" }, t("editorChangedOnDisk")) : null,
    error != null ? h2("div", { className: "dshsk-notice", "data-tone": "error", role: "alert" }, error) : null,
    h2(
      "div",
      { className: "dshsk-split", "data-layout": compact ? "single" : "split" },
      h2(
        "div",
        { className: "dshsk-pane dshsk-paneEditor" },
        h2("div", { className: "dshsk-paneHead" }, path),
        h2("textarea", {
          className: "dshsk-textarea",
          "aria-label": path,
          spellCheck: false,
          value: content,
          onChange: (event) => setContent(event.target.value)
        })
      ),
      compact ? null : h2(
        "div",
        { className: "dshsk-pane dshsk-panePreview" },
        h2("div", { className: "dshsk-paneHead" }, t("editorPreview")),
        h2(
          "div",
          { className: "dshsk-preview" },
          renderMarkdownBlock(content, t("editorPreviewEmpty"))
        )
      )
    ),
    h2(
      "div",
      { className: "dshsk-footer" },
      h2(
        "button",
        {
          type: "button",
          className: "dshsk-button",
          onClick: () => onCancel()
        },
        t("editorCancel")
      ),
      h2(
        "button",
        {
          type: "button",
          className: "dshsk-button",
          "data-variant": "primary",
          title: t("editorSaveTitle"),
          disabled: saveDisabled,
          onClick: () => onSave(content)
        },
        t("editorSave")
      )
    )
  );
}

// src/client/format.js
var PATH_BUDGET = 15;
var PATH_EDGE = 7;
var PATH_MARK = "...";
function truncatePath(value, { budget = PATH_BUDGET, edge = PATH_EDGE } = {}) {
  const text = String(value ?? "");
  if (!Number.isInteger(edge) || edge < 0) throw new RangeError("edge must be a non-negative integer");
  if (text.length <= budget) return text;
  if (text.length <= edge * 2) return text;
  return `${text.slice(0, edge)}${PATH_MARK}${text.slice(text.length - edge)}`;
}
function displayName(skill) {
  const name2 = typeof skill?.name === "string" ? skill.name.trim() : "";
  return name2 !== "" ? name2 : String(skill?.dir ?? "");
}

// src/client/menu.js
var React3 = __toESM(require("react"), 1);
var h3 = React3.createElement;
function ActionsMenu({ label, items, moreLabel = "More actions", disabled = false }) {
  const [open, setOpen] = React3.useState(false);
  const container = React3.useRef(null);
  React3.useEffect(() => {
    if (!open || typeof document === "undefined") return void 0;
    const onPointerDown = (event) => {
      const node = container.current;
      if (node !== null && event.target instanceof Node && node.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  const choose = (item) => {
    setOpen(false);
    item.onSelect();
  };
  return h3(
    "div",
    { className: "dshsk-rowActions", ref: container },
    h3(
      "button",
      {
        type: "button",
        className: "dshsk-button dshsk-more",
        "aria-haspopup": "menu",
        "aria-expanded": open ? "true" : "false",
        "aria-label": label,
        title: moreLabel,
        disabled,
        onClick: () => setOpen((value) => !value)
      },
      "\u22EF"
    ),
    open ? h3(
      "div",
      { className: "dshsk-menu", role: "menu", "aria-label": label },
      items.map(
        (item) => h3(
          "button",
          {
            key: item.id,
            type: "button",
            role: "menuitem",
            onClick: () => choose(item)
          },
          item.label
        )
      )
    ) : null
  );
}

// src/client/viewport.js
var React4 = __toESM(require("react"), 1);
var NARROW_MAX_WIDTH = 640;
function useNarrowViewport(maxWidth = NARROW_MAX_WIDTH, media = void 0) {
  const query = `(max-width: ${maxWidth}px)`;
  const provider = media ?? (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window : void 0);
  const read = () => {
    if (provider === void 0) return false;
    try {
      return provider.matchMedia(query).matches === true;
    } catch {
      return false;
    }
  };
  const [narrow, setNarrow] = React4.useState(read);
  React4.useEffect(() => {
    if (provider === void 0 || typeof provider.matchMedia !== "function") return void 0;
    const list = provider.matchMedia(query);
    const update = () => setNarrow(list.matches === true);
    update();
    if (typeof list.addEventListener === "function") {
      list.addEventListener("change", update);
      return () => list.removeEventListener("change", update);
    }
    if (typeof list.addListener === "function") {
      list.addListener(update);
      return () => list.removeListener(update);
    }
    return void 0;
  }, [provider, query]);
  return narrow;
}

// src/client/page.js
var h4 = React5.createElement;
function pathOf(skill) {
  return `${skill.dir}/${skill.fileName}`;
}
function SkillRow({ t, skill, compact = false, onEdit, onDownloadMd, onDownloadZip, onUpload }) {
  const name2 = displayName(skill);
  const statusLabel = skill.status === "active" ? t("statusActive") : t("statusDisabled");
  return h4(
    "div",
    {
      className: "dshsk-row",
      role: "row",
      "data-skill": skill.dir,
      "data-status": skill.status,
      "data-layout": compact ? "compact" : "wide",
      "aria-label": t("rowLabel", { name: name2, status: statusLabel, path: skill.path })
    },
    h4(
      "div",
      { className: "dshsk-statusCell", role: "cell" },
      h4("span", {
        className: "dshsk-statusDot",
        "data-status": skill.status,
        role: "img",
        title: statusLabel,
        "aria-label": statusLabel
      })
    ),
    h4(
      "div",
      { className: "dshsk-nameCell", role: "cell" },
      h4("div", { className: "dshsk-name", title: name2 }, name2),
      skill.description ? h4("div", { className: "dshsk-nameMeta", title: skill.description }, skill.description) : null
    ),
    compact ? null : h4(
      "div",
      { className: "dshsk-pathCell", role: "cell" },
      h4(
        "code",
        { className: "dshsk-path", title: skill.path, "aria-label": skill.path },
        truncatePath(skill.path)
      )
    ),
    h4(
      "div",
      { className: "dshsk-rowActions", role: "cell" },
      h4(ActionsMenu, {
        label: t("actionsFor", { name: name2 }),
        moreLabel: t("moreActions"),
        items: [
          { id: "download-md", label: t("downloadMd"), onSelect: () => onDownloadMd(skill) },
          { id: "download-zip", label: t("downloadZip"), onSelect: () => onDownloadZip(skill) },
          { id: "upload", label: t("upload"), onSelect: () => onUpload(skill) },
          { id: "edit", label: t("edit"), onSelect: () => onEdit(skill) }
        ]
      })
    )
  );
}
function ListHead({ t, compact }) {
  return h4(
    "div",
    { className: "dshsk-listHead", role: "row" },
    h4(
      "div",
      { className: "dshsk-headCell dshsk-statusCell", role: "columnheader" },
      h4("span", { className: "dshsk-srOnly" }, t("columnStatus"))
    ),
    h4("div", { className: "dshsk-headCell dshsk-nameCell", role: "columnheader" }, t("columnName")),
    compact ? null : h4("div", { className: "dshsk-headCell dshsk-pathCell", role: "columnheader" }, t("columnPath")),
    h4("div", { className: "dshsk-headCell dshsk-rowActions", role: "columnheader" }, t("columnActions"))
  );
}
function SkillsPage({ t, client = api }) {
  const [list, setList] = React5.useState({ phase: "loading", skills: [], root: "", error: null });
  const [notice, setNotice] = React5.useState(null);
  const [editor, setEditor] = React5.useState(null);
  const compact = useNarrowViewport();
  const input = React5.useRef(null);
  const pendingUpload = React5.useRef(null);
  const load = React5.useCallback(async () => {
    try {
      const data = await client.list();
      setList({ phase: "ready", skills: Array.isArray(data.skills) ? data.skills : [], root: data.root ?? "", error: null });
    } catch (error) {
      setList({ phase: "error", skills: [], root: "", error });
    }
  }, [client]);
  React5.useEffect(() => {
    load();
  }, [load]);
  const upload = React5.useCallback(
    async (file) => {
      setNotice(null);
      try {
        const result = await client.upload(file, file.name ?? "");
        setNotice({
          tone: "ok",
          text: t(result.action === "created" ? "uploadCreated" : "uploadReplaced", { dir: result.dir })
        });
        await load();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "write-failed";
        setNotice({ tone: "error", text: `${t("uploadFailed")} ${errorText(t, code)}` });
      }
    },
    [client, load, t]
  );
  const pickFile = React5.useCallback(
    (skill) => {
      pendingUpload.current = skill?.dir ?? null;
      if (input.current !== null && typeof input.current.click === "function") input.current.click();
    },
    []
  );
  const openEditor = React5.useCallback(
    async (skill) => {
      setNotice(null);
      setEditor({ phase: "loading", path: pathOf(skill) });
      try {
        const file = await client.read(skill.dir);
        setEditor({
          phase: "ready",
          dir: skill.dir,
          path: `${skill.dir}/${file.fileName}`,
          fileName: file.fileName,
          content: file.content,
          mtimeMs: file.mtimeMs,
          warning: false,
          saving: false,
          error: null
        });
      } catch (error) {
        setEditor(null);
        const code = error instanceof ApiError ? error.code : "not-found";
        setNotice({ tone: "error", text: `${t("editorOpenFailed", { dir: skill.dir })} ${errorText(t, code)}` });
      }
    },
    [client, t]
  );
  const save = React5.useCallback(
    async (content) => {
      const current = editor;
      if (current === null || current.phase !== "ready") return;
      setEditor({ ...current, saving: true, error: null });
      try {
        if (current.warning !== true) {
          const fresh = await client.read(current.dir);
          if (fresh.mtimeMs !== current.mtimeMs) {
            setEditor({ ...current, warning: true, saving: false, error: null });
            return;
          }
        }
        await client.save(current.dir, content);
        setEditor(null);
        setNotice({ tone: "ok", text: t("saveDone", { path: current.path }) });
        await load();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "write-failed";
        setEditor({
          ...current,
          saving: false,
          error: `${t("saveFailed", { dir: current.dir })} ${errorText(t, code)}`
        });
      }
    },
    [client, editor, load, t]
  );
  const downloadMd = React5.useCallback(
    (skill) => client.download(`/skill/${encodeURIComponent(skill.dir)}/download.md`, skill.fileName),
    [client]
  );
  const downloadZip = React5.useCallback(
    (skill) => client.download(`/skill/${encodeURIComponent(skill.dir)}/download.zip`, `${skill.dir}.zip`),
    [client]
  );
  const fileInput = h4("input", {
    ref: input,
    type: "file",
    hidden: true,
    "aria-label": t("uploadTitle"),
    onChange: (event) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = "";
      if (file !== null) upload(file);
    }
  });
  const noticeView = notice === null ? null : h4("div", { className: "dshsk-notice", "data-tone": notice.tone === "ok" ? "ok" : "error", role: "status" }, notice.text);
  if (editor !== null) {
    if (editor.phase !== "ready") {
      return h4(
        "div",
        { className: "dshsk-page" },
        h4("div", { className: "dshsk-inner" }, h4("div", { className: "dshsk-loading" }, t("editorLoading")))
      );
    }
    return h4(
      "div",
      { className: "dshsk-page", "data-mode": "editor" },
      h4(
        "div",
        { className: "dshsk-inner dshsk-innerEditor" },
        noticeView,
        h4(SkillEditor, {
          t,
          path: editor.path,
          compact,
          initialContent: editor.content,
          warning: editor.warning,
          error: editor.error,
          saving: editor.saving,
          onCancel: () => setEditor(null),
          onSave: save
        })
      )
    );
  }
  const count = list.skills.length;
  const subtitle = list.phase === "ready" && list.root !== "" ? `${t("subtitle", { root: list.root })} \xB7 ${count === 1 ? t("countOne") : t("count", { count })}` : null;
  return h4(
    "div",
    { className: "dshsk-page" },
    h4(
      "div",
      { className: "dshsk-inner" },
      h4(
        "div",
        { className: "dshsk-head" },
        h4(
          "div",
          { className: "dshsk-headText" },
          h4("h1", { className: "dshsk-title" }, t("heading")),
          subtitle === null ? null : h4("p", { className: "dshsk-subtitle" }, subtitle)
        ),
        h4(
          "div",
          { className: "dshsk-headActions" },
          fileInput,
          h4(
            "button",
            { type: "button", className: "dshsk-button", "data-variant": "primary", onClick: () => pickFile(null) },
            t("upload")
          )
        )
      ),
      noticeView,
      list.phase === "loading" ? h4("div", { className: "dshsk-loading" }, t("editorLoading")) : null,
      list.phase === "error" ? h4(
        "div",
        { className: "dshsk-empty" },
        h4("p", { className: "dshsk-emptyTitle" }, t("loadFailed")),
        h4("p", { className: "dshsk-emptyBody" }, errorText(t, list.error instanceof ApiError ? list.error.code : "network")),
        h4(
          "button",
          { type: "button", className: "dshsk-button", onClick: () => load() },
          t("retry")
        )
      ) : null,
      list.phase === "ready" && count === 0 ? h4(
        "div",
        { className: "dshsk-empty" },
        h4("p", { className: "dshsk-emptyTitle" }, t("emptyTitle")),
        h4("p", { className: "dshsk-emptyBody" }, t("emptyBody", { root: list.root }))
      ) : null,
      list.phase === "ready" && count > 0 ? h4(
        "div",
        { className: "dshsk-list", role: "table", "aria-label": t("listLabel") },
        h4(ListHead, { t, compact }),
        list.skills.map(
          (skill) => h4(SkillRow, {
            key: skill.dir,
            t,
            skill,
            compact,
            onEdit: openEditor,
            onDownloadMd: downloadMd,
            onDownloadZip: downloadZip,
            onUpload: pickFile
          })
        )
      ) : null,
      h4("p", { className: "dshsk-note" }, t("statusNote"))
    )
  );
}

// src/client/styles.js
var STYLE_ID = "dsh-skills";
var PLUGIN_ID = "@dr-co/dsh-skills";
var CSS = String.raw`
.dshsk-page { box-sizing: border-box; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: auto; padding: 24px clamp(16px, 4vw, 48px) 32px; color: var(--dsw-alias-label-primary, #1f2329); background: var(--dsw-alias-bg-layer-1, #fff); }
.dshsk-page * { box-sizing: border-box; }
.dshsk-inner { width: 100%; max-width: 1120px; margin: 0 auto; }
.dshsk-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.dshsk-headText { min-width: 0; flex: 1; }
.dshsk-title { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; }
.dshsk-subtitle { margin: 4px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-headActions { display: flex; align-items: center; gap: 8px; flex: none; }
.dshsk-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 32px; padding: 5px 12px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; color: var(--dsw-alias-label-primary, #1f2329); background: var(--dsw-alias-bg-layer-1, #fff); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.dshsk-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #f5f6f7); }
.dshsk-button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #3370ff); outline-offset: 2px; }
.dshsk-button:disabled { opacity: .55; cursor: default; }
.dshsk-button[data-variant="primary"] { border-color: var(--dsw-alias-state-business-primary, #3370ff); color: #fff; background: var(--dsw-alias-state-business-primary, #3370ff); }
.dshsk-button[data-variant="primary"]:hover:not(:disabled) { filter: brightness(1.06); }
.dshsk-list { width: 100%; border-top: 1px solid var(--dsw-alias-border-l1, #eef0f2); }
.dshsk-listHead, .dshsk-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
.dshsk-listHead { padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l2, #dfe1e5); color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; font-weight: 500; }
.dshsk-row { padding: 9px 0; border-bottom: 1px solid var(--dsw-alias-border-l1, #eef0f2); }
.dshsk-headCell, .dshsk-row > [role="cell"] { min-width: 0; }
.dshsk-statusCell { flex: 0 0 auto; display: flex; align-items: center; width: 14px; }
.dshsk-statusDot { display: block; flex: 0 0 auto; width: 11px; height: 11px; border-radius: 50%; background: var(--dsw-alias-label-tertiary, #8f959e); box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); }
.dshsk-statusDot[data-status="active"] { background: var(--dsw-alias-state-success-primary, #2ea121); }
.dshsk-nameCell { flex: 1 1 auto; min-width: 0; overflow: hidden; }
.dshsk-name { overflow: hidden; font-weight: 500; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-nameMeta { margin-top: 1px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-pathCell { flex: 0 0 auto; max-width: 148px; }
.dshsk-path { display: block; max-width: 100%; overflow: hidden; color: var(--dsw-alias-label-secondary, #646a73); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-rowActions { position: relative; flex: 0 0 auto; display: inline-flex; justify-content: flex-end; }
.dshsk-listHead .dshsk-rowActions { text-align: right; }
.dshsk-srOnly { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.dshsk-more { width: 28px; min-height: 28px; padding: 0; font-size: 16px; line-height: 1; }
.dshsk-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 30; min-width: 190px; max-width: min(240px, calc(100vw - 24px)); padding: 4px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-3, #fff); box-shadow: 0 8px 24px rgb(0 0 0 / 14%); }
.dshsk-menu button { display: block; width: 100%; padding: 7px 10px; border: 0; border-radius: 6px; color: inherit; background: transparent; font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.dshsk-menu button:hover, .dshsk-menu button:focus-visible { background: var(--dsw-alias-interactive-bg-hover, #f5f6f7); outline: none; }
.dshsk-note { margin: 14px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; }
.dshsk-notice { margin: 0 0 14px; padding: 9px 12px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-notice[data-tone="error"] { border-color: var(--dsw-alias-state-danger-primary, #c53030); color: var(--dsw-alias-state-danger-primary, #c53030); background: transparent; }
.dshsk-notice[data-tone="warn"] { border-color: var(--dsw-alias-state-warn-primary, #d97706); color: var(--dsw-alias-state-warn-primary, #d97706); background: transparent; }
.dshsk-empty { padding: 48px 24px; border: 1px dashed var(--dsw-alias-border-l2, #dfe1e5); border-radius: 12px; text-align: center; }
.dshsk-emptyTitle { margin: 0 0 6px; font-size: 15px; font-weight: 600; }
.dshsk-emptyBody { margin: 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-editor { display: flex; flex-direction: column; gap: 14px; min-height: 0; flex: 1; }
.dshsk-editorHead { display: flex; align-items: flex-start; gap: 12px; }
.dshsk-editorTitle { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.dshsk-editorMeta { margin: 4px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; }
.dshsk-page[data-mode="editor"] { overflow: hidden; }
.dshsk-innerEditor { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.dshsk-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: stretch; min-height: 420px; }
.dshsk-split[data-layout="single"] { grid-template-columns: minmax(0, 1fr); min-height: 0; flex: 1 1 auto; }
.dshsk-editor[data-layout="compact"] { flex: 1 1 auto; min-height: 0; }
.dshsk-editor[data-layout="compact"] .dshsk-split,
.dshsk-editor[data-layout="compact"] .dshsk-pane { flex: 1 1 auto; min-height: 0; }
.dshsk-editor[data-layout="compact"] .dshsk-textarea { flex: 1 1 auto; height: 100%; min-height: 0; resize: none; }
@media (max-width: 900px) { .dshsk-split { grid-template-columns: minmax(0, 1fr); } }
.dshsk-pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 10px; overflow: hidden; background: var(--dsw-alias-bg-layer-1, #fff); }
.dshsk-paneHead { padding: 7px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, #eef0f2); color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); }
.dshsk-textarea { flex: 1; min-height: 380px; padding: 12px 14px; border: 0; outline: none; resize: vertical; color: var(--dsw-alias-label-primary, #1f2329); background: transparent; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 20px; tab-size: 2; }
.dshsk-preview { flex: 1; min-height: 380px; max-height: 60vh; overflow: auto; padding: 4px 16px 16px; font-size: 13px; line-height: 1.65; }
.dshsk-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
.dshsk-md > *:first-child { margin-top: 8px; }
.dshsk-heading { margin: 16px 0 8px; line-height: 1.35; }
.dshsk-md h3.dshsk-heading { font-size: 17px; }
.dshsk-md h4.dshsk-heading { font-size: 15px; }
.dshsk-md h5.dshsk-heading, .dshsk-md h6.dshsk-heading { font-size: 13px; }
.dshsk-p { margin: 8px 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.dshsk-list { margin: 8px 0; padding-left: 22px; }
.dshsk-list li { margin: 3px 0; overflow-wrap: anywhere; }
.dshsk-quote { margin: 10px 0; padding: 2px 12px; border-left: 3px solid var(--dsw-alias-border-l3, #d0d3d6); color: var(--dsw-alias-label-secondary, #646a73); }
.dshsk-code { padding: 1px 5px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2, #f2f3f5); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .92em; }
.dshsk-pre { margin: 10px 0; padding: 10px 12px; overflow: auto; border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f2f3f5); }
.dshsk-fence { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 19px; white-space: pre; }
.dshsk-hr { margin: 16px 0; border: 0; border-top: 1px solid var(--dsw-alias-border-l2, #dfe1e5); }
.dshsk-tableWrap { overflow-x: auto; margin: 10px 0; }
.dshsk-md table.dshsk-table { width: auto; min-width: 50%; font-size: 12px; }
.dshsk-md table.dshsk-table th, .dshsk-md table.dshsk-table td { padding: 6px 10px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); text-align: left; }
.dshsk-md a { color: var(--dsw-alias-state-business-primary, #3370ff); text-decoration: none; }
.dshsk-md a:hover { text-decoration: underline; }
.dshsk-mdEmpty { color: var(--dsw-alias-label-tertiary, #8f959e); font-style: italic; padding: 12px 0; }
.dshsk-loading { padding: 40px 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; }
.dshsk-icon { display: block; flex: none; }
@media (max-width: 640px) {
  .dshsk-page { padding: 16px 12px 24px; }
  .dshsk-head { flex-wrap: wrap; gap: 10px; }
  .dshsk-headActions { margin-left: auto; }
  .dshsk-row, .dshsk-listHead { gap: 8px; }
  /* The compact layout does not render this cell at all; this rule is only a
     backstop for a viewport that changed without the listener firing. */
  .dshsk-pathCell { display: none; }
  .dshsk-menu { min-width: 168px; }
}
@media (prefers-reduced-motion: reduce) { .dshsk-page * { transition: none !important; animation: none !important; } }
`;
function installStyles() {
  if (typeof document === "undefined" || document.head === null) return () => {
  };
  const existing = document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`);
  if (existing !== null) return () => {
  };
  const element = document.createElement("style");
  element.dataset.plugin = PLUGIN_ID;
  element.dataset.pluginCss = STYLE_ID;
  element.textContent = CSS;
  document.head.appendChild(element);
  return () => element.remove();
}

// src/client/index.js
var h5 = React6.createElement;
var name = "dsh-skills";
var inject = ["slots", "locale", "layout"];
var PANEL_ID = "dsh-skills";
var RUSSIAN_LANGUAGE = Object.freeze({ id: "ru", label: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", fallback: "en" });
function SkillsPanelIcon({ size = 16, active = false }) {
  return h5(
    "svg",
    {
      className: "dshsk-icon",
      "aria-hidden": "true",
      focusable: "false",
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: active ? 1.4 : 1,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h5("path", { d: "M3.5 1.8h5.2l3.3 3.3v6.1a2 2 0 0 1-2 2h-6.5a2 2 0 0 1-2-2V3.8a2 2 0 0 1 2-2z" }),
    h5("path", { d: "M8.5 1.9v3.4h3.4" }),
    h5("path", { d: "M12.9 10.2l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z" })
  );
}
function apply(ctx) {
  ctx.effect(() => installStyles(), "dsh-skills: styles");
  ctx.effect(() => ctx.locale.register(NS, "en", en), "dsh-skills: en dictionary");
  ctx.effect(() => ctx.locale.addLanguage(RUSSIAN_LANGUAGE), "dsh-skills: ru language");
  ctx.effect(() => ctx.locale.register(NS, "ru", ru), "dsh-skills: ru dictionary");
  ctx.slots.inject(
    "main",
    () => ctx.slots.register({ name: "main", key: PANEL_ID, locale: NS }, SkillsPage)
  );
  ctx.slots.inject(
    "sidebar.panellist",
    () => ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 20,
        label: () => ctx.locale.bind(NS)("panel"),
        locale: NS
      },
      SkillsPanelIcon
    )
  );
}

    return module.exports;
  }
});
