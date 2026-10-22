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
var React5 = __toESM(require("react"), 1);

// src/client/locales.js
var NS = "dsh-skills";
var en = {
  panel: "Skills",
  heading: "Skills",
  subtitle: "Skills in {home}",
  count: "{count} skills",
  countOne: "1 skill",
  columnStatus: "Status",
  columnName: "Skill",
  columnPath: "Path",
  columnActions: "Actions",
  listLabel: "Installed skills",
  sectionUser: "Standard skills in $DSH_HOME/skills",
  sectionPlugin: "Skills bundled with plugins",
  sectionVirtual: "Provided by plugins (no file)",
  sectionUserEmpty: "No skills in $DSH_HOME/skills yet.",
  sectionPluginEmpty: "No installed package bundles a skill.",
  sectionVirtualEmpty: "No plugin provides a skill without a file.",
  rowLabel: "{name} \xB7 {status} \xB7 {path}",
  originUser: "user",
  originPlugin: "plugin",
  originUserHint: "Your own skill, in $DSH_HOME/skills",
  originPluginHint: "Bundled with a plugin, read-only",
  statusActive: "Active",
  statusDisabled: "Disabled",
  statusConflict: "Conflict",
  statusConflictHint: "Both SKILL.md and _SKILL.md exist in this directory",
  statusVirtual: "Provided",
  readOnlyHint: "Bundled with a plugin, read-only",
  virtualHint: "Provided by a plugin, no file",
  providerHint: "Provided by a plugin, read-only",
  statusNote: "Bundled skills are read-only: they live inside an installed package and the next update would overwrite a change.",
  actionsFor: "Actions for {name}",
  moreActions: "More actions",
  edit: "Edit",
  editTitle: "Edit SKILL.md",
  rename: "Rename",
  renameTitle: "Rename the skill directory",
  renameHint: "Only the directory is renamed; the frontmatter name stays as it is.",
  renameInvalid: "Use lowercase letters, digits and single dashes, with no spaces, slashes or dots.",
  renamedDirectory: "Directory {old} renamed to {new}",
  renameFailedDirectory: "Could not rename the directory {old}",
  downloadMd: "Download SKILL.md",
  downloadZip: "Download ZIP",
  upload: "Upload",
  enable: "Enable",
  disable: "Disable",
  enableHint: "Rename _SKILL.md to SKILL.md",
  disableHint: "Rename SKILL.md to _SKILL.md",
  renamedToDisabled: "File SKILL.md renamed to _SKILL.md",
  renamedToActive: "File _SKILL.md renamed to SKILL.md",
  renameFailed: "Could not rename {name}",
  emptyTitle: "No skills installed",
  emptyBody: "Add a directory containing SKILL.md to {home}/skills, or upload a skill here.",
  loadFailed: "Could not load the skills list.",
  retry: "Retry",
  uploading: "Uploading\u2026",
  uploadTitle: "Upload a skill",
  uploadNewHint: "New skills are created from a zip whose top-level folder is the skill name; a single SKILL.md is only accepted when replacing an existing skill",
  uploadCreated: "Created skill {dir}.",
  uploadReplaced: "Replaced skill {dir}.",
  uploadFailed: "Upload rejected.",
  editorTitle: "Editing {path}",
  editorCancel: "Cancel",
  editorSave: "Save",
  editorSaveTitle: "Write the file and return to the list",
  editorUnchanged: "No changes yet",
  editorChangedOnDisk: "This file changed on disk since you opened it. Saving replaces those changes.",
  editorLoading: "Loading the file\u2026",
  editorOpenFailed: "Could not open {dir}.",
  saveFailed: "Could not save {dir}.",
  saveDone: "Saved {path}.",
  errorUnrecognizedFormat: "Unrecognized skill format",
  errorNameMismatch: "The uploaded SKILL.md does not match an installed skill",
  errorNotFound: "Skill not found",
  errorTooLarge: "File too large",
  errorWriteFailed: "Could not write the file",
  errorBadRequest: "Bad request",
  errorReadOnly: "This skill is bundled with a plugin and cannot be changed",
  errorAlreadyExists: "A skill with this name already exists; replace it from the row menu",
  errorConflict: "A skill file with that name already exists",
  errorUnknown: "Something went wrong",
  errorNetwork: "Could not reach the DSH host"
};
var ru = {
  panel: "\u0421\u043A\u0438\u043B\u043B\u044B",
  heading: "\u0421\u043A\u0438\u043B\u043B\u044B",
  subtitle: "\u0421\u043A\u0438\u043B\u043B\u044B \u0432 {home}",
  count: "\u0421\u043A\u0438\u043B\u043B\u043E\u0432: {count}",
  countOne: "1 \u0441\u043A\u0438\u043B\u043B",
  columnStatus: "\u0421\u0442\u0430\u0442\u0443\u0441",
  columnName: "\u0421\u043A\u0438\u043B\u043B",
  columnPath: "\u041F\u0443\u0442\u044C",
  columnActions: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
  listLabel: "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0441\u043A\u0438\u043B\u043B\u044B",
  sectionUser: "\u041E\u0431\u044B\u0447\u043D\u044B\u0435 \u0441\u043A\u0438\u043B\u043B\u044B \u0432 $DSH_HOME/skills",
  sectionPlugin: "\u0421\u043A\u0438\u043B\u043B\u044B \u0432\u043D\u0443\u0442\u0440\u0438 \u043F\u0430\u043A\u0435\u0442\u043E\u0432 \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u0432",
  sectionVirtual: "\u041E\u0442 \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u0432 (\u0431\u0435\u0437 \u0444\u0430\u0439\u043B\u0430)",
  sectionUserEmpty: "\u0412 $DSH_HOME/skills \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E.",
  sectionPluginEmpty: "\u041D\u0438 \u043E\u0434\u0438\u043D \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u043F\u0430\u043A\u0435\u0442 \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0441\u043A\u0438\u043B\u043B\u0430.",
  sectionVirtualEmpty: "\u041D\u0438 \u043E\u0434\u0438\u043D \u043F\u043B\u0430\u0433\u0438\u043D \u043D\u0435 \u043E\u0442\u0434\u0430\u0451\u0442 \u0441\u043A\u0438\u043B\u043B \u0431\u0435\u0437 \u0444\u0430\u0439\u043B\u0430.",
  rowLabel: "{name} \xB7 {status} \xB7 {path}",
  originUser: "user",
  originPlugin: "plugin",
  originUserHint: "\u0421\u0432\u043E\u0439 \u0441\u043A\u0438\u043B\u043B, \u0432 $DSH_HOME/skills",
  originPluginHint: "\u0412\u0445\u043E\u0434\u0438\u0442 \u0432 \u043F\u0430\u043A\u0435\u0442 \u043F\u043B\u0430\u0433\u0438\u043D\u0430, \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u0435\u043D\u0438\u0435",
  statusActive: "\u0410\u043A\u0442\u0438\u0432\u0435\u043D",
  statusDisabled: "\u041E\u0442\u043A\u043B\u044E\u0447\u0451\u043D",
  statusConflict: "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442",
  statusConflictHint: "\u0412 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043B\u0435\u0436\u0430\u0442 \u0438 SKILL.md, \u0438 _SKILL.md",
  statusVirtual: "\u041E\u0442 \u043F\u043B\u0430\u0433\u0438\u043D\u0430",
  readOnlyHint: "\u0412\u0445\u043E\u0434\u0438\u0442 \u0432 \u043F\u0430\u043A\u0435\u0442 \u043F\u043B\u0430\u0433\u0438\u043D\u0430, \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u0435\u043D\u0438\u0435",
  virtualHint: "\u041F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u043C, \u0444\u0430\u0439\u043B\u0430 \u043D\u0430 \u0434\u0438\u0441\u043A\u0435 \u043D\u0435\u0442",
  providerHint: "\u041F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u043C, \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u0435\u043D\u0438\u0435",
  statusNote: "\u0421\u043A\u0438\u043B\u043B\u044B \u0438\u0437 \u043F\u0430\u043A\u0435\u0442\u043E\u0432 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F: \u043E\u043D\u0438 \u043B\u0435\u0436\u0430\u0442 \u0432\u043D\u0443\u0442\u0440\u0438 \u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E\u0441\u0442\u0438, \u0438 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0430\u043A\u0435\u0442\u0430 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0448\u0435\u0442 \u043F\u0440\u0430\u0432\u043A\u0443.",
  actionsFor: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0434\u043B\u044F {name}",
  moreActions: "\u0415\u0449\u0451 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
  edit: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
  editTitle: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C SKILL.md",
  rename: "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C",
  renameTitle: "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441\u043A\u0438\u043B\u043B\u0430",
  renameHint: "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433; \u0438\u043C\u044F \u0432 frontmatter \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043F\u0440\u0435\u0436\u043D\u0438\u043C.",
  renameInvalid: "\u041D\u0443\u0436\u043D\u044B \u0441\u0442\u0440\u043E\u0447\u043D\u044B\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B \u0438 \u043E\u0434\u0438\u043D\u043E\u0447\u043D\u044B\u0435 \u0434\u0435\u0444\u0438\u0441\u044B; \u0431\u0435\u0437 \u043F\u0440\u043E\u0431\u0435\u043B\u043E\u0432, \u0441\u043B\u044D\u0448\u0435\u0439 \u0438 \u0442\u043E\u0447\u0435\u043A.",
  renamedDirectory: "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 {old} \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D \u0432 {new}",
  renameFailedDirectory: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433 {old}",
  downloadMd: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C SKILL.md",
  downloadZip: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C ZIP",
  upload: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C",
  enable: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  disable: "\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  enableHint: "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C _SKILL.md \u0432 SKILL.md",
  disableHint: "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C SKILL.md \u0432 _SKILL.md",
  renamedToDisabled: "\u0424\u0430\u0439\u043B SKILL.md \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D \u0432 _SKILL.md",
  renamedToActive: "\u0424\u0430\u0439\u043B _SKILL.md \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D \u0432 SKILL.md",
  renameFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C {name}",
  emptyTitle: "\u0421\u043A\u0438\u043B\u043B\u043E\u0432 \u043D\u0435\u0442",
  emptyBody: "\u041F\u043E\u043B\u043E\u0436\u0438 \u0432 {home}/skills \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441 \u0444\u0430\u0439\u043B\u043E\u043C SKILL.md \u0438\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438 \u0441\u043A\u0438\u043B\u043B \u0437\u0434\u0435\u0441\u044C.",
  loadFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u043A\u0438\u043B\u043B\u043E\u0432.",
  retry: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C",
  uploading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026",
  uploadTitle: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043A\u0438\u043B\u043B\u0430",
  uploadNewHint: "\u041D\u043E\u0432\u044B\u0439 \u0441\u043A\u0438\u043B\u043B \u0441\u043E\u0437\u0434\u0430\u0451\u0442\u0441\u044F \u0438\u0437 zip, \u0443 \u043A\u043E\u0442\u043E\u0440\u043E\u0433\u043E \u0432\u0435\u0440\u0445\u043D\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u2014 \u0438\u043C\u044F \u0441\u043A\u0438\u043B\u043B\u0430; \u043E\u0434\u0438\u043D\u043E\u0447\u043D\u044B\u0439 SKILL.md \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u0437\u0430\u043C\u0435\u043D\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0433\u043E \u0441\u043A\u0438\u043B\u043B\u0430",
  uploadCreated: "\u0421\u043A\u0438\u043B\u043B {dir} \u0441\u043E\u0437\u0434\u0430\u043D.",
  uploadReplaced: "\u0421\u043A\u0438\u043B\u043B {dir} \u0437\u0430\u043C\u0435\u043D\u0451\u043D.",
  uploadFailed: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430.",
  editorTitle: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 {path}",
  editorCancel: "\u041E\u0442\u043C\u0435\u043D\u0430",
  editorSave: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
  editorSaveTitle: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0444\u0430\u0439\u043B \u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u0441\u043F\u0438\u0441\u043A\u0443",
  editorUnchanged: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u043D\u0435\u0442",
  editorChangedOnDisk: "\u0424\u0430\u0439\u043B \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u043D\u0430 \u0434\u0438\u0441\u043A\u0435 \u043F\u043E\u0441\u043B\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F. \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0448\u0435\u0442 \u044D\u0442\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F.",
  editorLoading: "\u0427\u0438\u0442\u0430\u044E \u0444\u0430\u0439\u043B\u2026",
  editorOpenFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C {dir}.",
  saveFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C {dir}.",
  saveDone: "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: {path}.",
  errorUnrecognizedFormat: "\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u0435\u043C\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0441\u043A\u0438\u043B\u043B\u0430",
  errorNameMismatch: "\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0439 SKILL.md \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u043D\u0438 \u0441 \u043E\u0434\u043D\u0438\u043C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u043C \u0441\u043A\u0438\u043B\u043B\u043E\u043C",
  errorNotFound: "\u0421\u043A\u0438\u043B\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
  errorTooLarge: "\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439",
  errorWriteFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0444\u0430\u0439\u043B",
  errorBadRequest: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441",
  errorReadOnly: "\u042D\u0442\u043E\u0442 \u0441\u043A\u0438\u043B\u043B \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 \u043F\u0430\u043A\u0435\u0442 \u043F\u043B\u0430\u0433\u0438\u043D\u0430, \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0435\u0433\u043E \u043D\u0435\u043B\u044C\u0437\u044F",
  errorAlreadyExists: "\u0421\u043A\u0438\u043B\u043B \u0441 \u0442\u0430\u043A\u0438\u043C \u0438\u043C\u0435\u043D\u0435\u043C \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442; \u0437\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u0435\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u0438\u0437 \u043C\u0435\u043D\u044E \u0441\u0442\u0440\u043E\u043A\u0438",
  errorConflict: "\u0424\u0430\u0439\u043B \u0441 \u0442\u0430\u043A\u0438\u043C \u0438\u043C\u0435\u043D\u0435\u043C \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442",
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
  "read-only": "errorReadOnly",
  "already-exists": "errorAlreadyExists",
  conflict: "errorConflict",
  network: "errorNetwork"
};
function errorText(t, code) {
  const key = ERROR_KEYS[code] ?? "errorUnknown";
  return t(key);
}

// src/client/page.js
var React4 = __toESM(require("react"), 1);

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
   * @param id - opaque row id from the list.
   * @returns the file name, contents, modification time, and status.
   */
  read(id) {
    return call(`/skill/${encodeURIComponent(id)}`, { headers: { accept: "application/json" } });
  },
  /**
   * Save one skill file.
   * @param id - opaque row id from the list.
   * @param content - new contents.
   * @returns the written file name and modification time.
   */
  save(id, content) {
    return call(`/skill/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ content })
    });
  },
  /**
   * Enable or disable a skill by renaming its file on the host.
   * @param id - opaque row id from the list.
   * @param enable - true for `SKILL.md`, false for `_SKILL.md`.
   * @returns the file name and status after the rename.
   */
  setEnabled(id, enable) {
    return call(`/skill/${encodeURIComponent(id)}/${enable ? "enable" : "disable"}`, {
      method: "POST",
      headers: { accept: "application/json" }
    });
  },
  /**
   * Rename one skill's directory.
   * @param id - opaque row id from the list.
   * @param name - the new directory name, one kebab-case segment.
   * @returns the new row id, path, and status.
   */
  rename(id, name2) {
    return call(`/skill/${encodeURIComponent(id)}/rename`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ name: name2 })
    });
  },
  /**
   * Upload one file; the host decides the format from the bytes.
   * @param file - the picked File or Blob.
   * @param name - the file's name, used only for a single-file upload.
   * @param mode - `create` for the page button (a new skill from a zip, never an
   *   overwrite), `replace` for a row's menu item (that row's skill, never a
   *   creation).
   * @param id - the row id a replacement targets; ignored for a create.
   * @returns the applied action and directory.
   */
  upload(file, name2, mode = "create", id = "") {
    const query = mode === "replace" ? `replace&id=${encodeURIComponent(id)}` : "create";
    return call(`/upload?mode=${query}`, {
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
var React = __toESM(require("react"), 1);
var h = React.createElement;
function SkillEditor({ t, path, initialContent, onCancel, onSave, saving, warning, error }) {
  const [content, setContent] = React.useState(initialContent ?? "");
  React.useEffect(() => setContent(initialContent ?? ""), [initialContent]);
  const dirty = content !== (initialContent ?? "");
  const saveDisabled = !dirty || saving === true;
  return h(
    "div",
    { className: "dshsk-editor" },
    h(
      "div",
      { className: "dshsk-editorHead" },
      h(
        "div",
        { className: "dshsk-headText" },
        h("h2", { className: "dshsk-editorTitle" }, t("editorTitle", { path })),
        h("p", { className: "dshsk-editorMeta" }, dirty ? "" : t("editorUnchanged"))
      )
    ),
    warning === true ? h("div", { className: "dshsk-notice", "data-tone": "warn", role: "status" }, t("editorChangedOnDisk")) : null,
    error != null ? h("div", { className: "dshsk-notice", "data-tone": "error", role: "alert" }, error) : null,
    h(
      "div",
      { className: "dshsk-pane dshsk-paneEditor" },
      h("div", { className: "dshsk-paneHead" }, path),
      h("textarea", {
        className: "dshsk-textarea",
        "aria-label": path,
        spellCheck: false,
        value: content,
        onChange: (event) => setContent(event.target.value)
      })
    ),
    h(
      "div",
      { className: "dshsk-footer" },
      h(
        "button",
        {
          type: "button",
          className: "dshsk-button",
          onClick: () => onCancel()
        },
        t("editorCancel")
      ),
      h(
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
var React2 = __toESM(require("react"), 1);
var h2 = React2.createElement;
var SEPARATOR = Object.freeze({ separator: true });
function PencilIcon() {
  return h2(
    "svg",
    {
      className: "dshsk-icon",
      "aria-hidden": "true",
      focusable: "false",
      width: 14,
      height: 14,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h2("path", { d: "M11.1 2.4a1.6 1.6 0 0 1 2.3 2.3l-7.2 7.2-3 .8.8-3z" }),
    h2("path", { d: "M10 3.5 12.3 5.8" })
  );
}
function ChevronIcon() {
  return h2(
    "svg",
    {
      className: "dshsk-icon",
      "aria-hidden": "true",
      focusable: "false",
      width: 12,
      height: 12,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h2("path", { d: "M4 6.5 8 10.5 12 6.5" })
  );
}
function RowActions({ label, moreLabel, editLabel, items, split = false, onEdit, disabled = false }) {
  const [open, setOpen] = React2.useState(false);
  const container = React2.useRef(null);
  React2.useEffect(() => {
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
  const toggle = h2(
    "button",
    {
      type: "button",
      className: split ? "dshsk-splitToggle" : "dshsk-button dshsk-more",
      "aria-haspopup": "menu",
      "aria-expanded": open ? "true" : "false",
      "aria-label": label,
      title: moreLabel,
      disabled,
      onClick: () => setOpen((value) => !value)
    },
    split ? h2(ChevronIcon) : "\u22EF"
  );
  return h2(
    "div",
    { className: split ? "dshsk-splitActions" : "dshsk-rowActions", ref: container },
    split ? h2(
      "button",
      {
        type: "button",
        className: "dshsk-splitPrimary",
        "aria-label": editLabel,
        title: editLabel,
        disabled,
        onClick: () => onEdit()
      },
      h2(PencilIcon)
    ) : null,
    toggle,
    open ? h2(
      "div",
      { className: "dshsk-menu", role: "menu", "aria-label": label },
      items.map(
        (item, index) => item === SEPARATOR || item.separator === true ? h2("div", { key: `sep-${index}`, className: "dshsk-menuSeparator", role: "separator" }) : h2(
          "button",
          {
            key: item.id,
            type: "button",
            role: "menuitem",
            title: item.hint,
            onClick: () => choose(item)
          },
          item.label
        )
      )
    ) : null
  );
}

// src/client/viewport.js
var React3 = __toESM(require("react"), 1);
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
  const [narrow, setNarrow] = React3.useState(read);
  React3.useEffect(() => {
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
var h3 = React4.createElement;
function pathOf(row) {
  return row.path !== "" ? row.path : row.dir;
}
function statusLabel(t, row) {
  if (row.status === "conflict") return t("statusConflict");
  if (row.status === "virtual") return t("statusVirtual");
  return row.status === "active" ? t("statusActive") : t("statusDisabled");
}
function statusHint(t, row) {
  const label = statusLabel(t, row);
  if (row.status === "conflict") return `${label} \xB7 ${t("statusConflictHint")}`;
  if (row.status === "virtual") return `${label} \xB7 ${t("virtualHint")}`;
  if (row.readOnly) return `${label} \xB7 ${t("readOnlyHint")}`;
  return label;
}
function metaText(t, row) {
  if (row.status === "virtual") return t("virtualHint");
  if (row.status === "conflict") return t("statusConflictHint");
  if (typeof row.description === "string" && row.description !== "") return row.description;
  if (row.readOnly) return row.fileName === null ? t("providerHint") : t("readOnlyHint");
  return null;
}
var RENAMED = {
  enable: { status: "active", fileName: "SKILL.md" },
  disable: { status: "disabled", fileName: "_SKILL.md" }
};
function SkillRow({
  t,
  row,
  compact = false,
  onEdit,
  onRename,
  renaming = null,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onDownloadMd,
  onDownloadZip,
  onUpload,
  onToggle
}) {
  const name2 = displayName(row);
  const hint = statusHint(t, row);
  const meta = metaText(t, row);
  const actions = row.actions ?? [];
  const canEdit = actions.includes("edit");
  const canRename = actions.includes("rename");
  const canDownloadMd = actions.includes("downloadMd");
  const canDownloadZip = actions.includes("downloadZip");
  const canUpload = actions.includes("upload");
  const canDisable = actions.includes("disable");
  const canEnable = actions.includes("enable");
  const groups = [];
  if (canEdit) groups.push([{ id: "edit", label: t("edit"), onSelect: () => onEdit(row) }]);
  if (canRename) {
    groups.push([{ id: "rename", label: t("rename"), hint: t("renameTitle"), onSelect: () => onRename(row) }]);
  }
  const downloads = [];
  if (canDownloadMd) {
    downloads.push({ id: "download-md", label: t("downloadMd"), onSelect: () => onDownloadMd(row) });
  }
  if (canDownloadZip) {
    downloads.push({ id: "download-zip", label: t("downloadZip"), onSelect: () => onDownloadZip(row) });
  }
  if (downloads.length > 0) groups.push(downloads);
  if (canUpload) groups.push([{ id: "upload", label: t("upload"), onSelect: () => onUpload(row) }]);
  if (canDisable || canEnable) {
    groups.push([
      canDisable ? { id: "disable", label: t("disable"), hint: t("disableHint"), onSelect: () => onToggle(row, false) } : { id: "enable", label: t("enable"), hint: t("enableHint"), onSelect: () => onToggle(row, true) }
    ]);
  }
  const items = [];
  for (const group of groups) {
    if (items.length > 0) items.push(SEPARATOR);
    items.push(...group);
  }
  const originLabel = row.origin === "user" ? t("originUser") : t("originPlugin");
  const originHint = row.origin === "user" ? t("originUserHint") : t("originPluginHint");
  return h3(
    "div",
    {
      className: "dshsk-row",
      role: "row",
      "data-id": row.id,
      "data-origin": row.origin,
      "data-status": row.status,
      "data-layout": compact ? "compact" : "wide",
      "aria-label": t("rowLabel", { name: name2, status: statusLabel(t, row), path: pathOf(row) })
    },
    h3(
      "div",
      { className: "dshsk-statusCell", role: "cell" },
      h3("span", {
        className: "dshsk-statusDot",
        "data-origin": row.origin,
        "data-status": row.status,
        role: "img",
        title: hint,
        "aria-label": hint
      })
    ),
    h3(
      "div",
      { className: "dshsk-nameCell", role: "cell" },
      h3(
        "div",
        { className: "dshsk-nameLine" },
        h3("span", { className: "dshsk-origin", "data-origin": row.origin, title: originHint }, originLabel),
        h3(
          "span",
          { className: "dshsk-name", "data-origin": row.origin, "data-status": row.status, title: name2 },
          name2
        )
      ),
      meta === null ? null : h3("div", { className: "dshsk-nameMeta", title: meta }, meta)
    ),
    compact || row.path === "" ? null : h3(
      "div",
      { className: "dshsk-pathCell", role: "cell" },
      h3(
        "code",
        { className: "dshsk-path", title: row.path, "aria-label": row.path },
        truncatePath(row.path)
      )
    ),
    items.length === 0 ? h3("div", { className: "dshsk-rowActions", role: "cell" }) : h3(
      "div",
      { className: "dshsk-actionsCell", role: "cell" },
      renaming !== null && renaming.id === row.id ? h3(RenameDialog, {
        t,
        value: renaming.value,
        error: renaming.error,
        busy: renaming.busy,
        onChange: onRenameChange,
        onSubmit: onRenameSubmit,
        onCancel: onRenameCancel
      }) : null,
      h3(RowActions, {
        label: t("actionsFor", { name: name2 }),
        moreLabel: t("moreActions"),
        editLabel: t("editTitle"),
        split: !compact && canEdit,
        onEdit: () => onEdit(row),
        items
      })
    )
  );
}
function RenameDialog({ t, value, error, busy, onChange, onSubmit, onCancel }) {
  return h3(
    "form",
    {
      className: "dshsk-rename",
      onSubmit: (event) => {
        event.preventDefault();
        onSubmit();
      }
    },
    h3("label", { className: "dshsk-renameLabel", htmlFor: "dshsk-rename-input" }, t("renameTitle")),
    h3("input", {
      id: "dshsk-rename-input",
      className: "dshsk-renameInput",
      type: "text",
      value,
      autoFocus: true,
      spellCheck: false,
      disabled: busy === true,
      onChange: (event) => onChange(event.target.value)
    }),
    h3("p", { className: "dshsk-renameHint" }, t("renameHint")),
    error === null || error === void 0 ? null : h3("p", { className: "dshsk-renameError", role: "alert" }, error),
    h3(
      "div",
      { className: "dshsk-renameActions" },
      h3(
        "button",
        { type: "button", className: "dshsk-button", onClick: () => onCancel(), disabled: busy === true },
        t("editorCancel")
      ),
      h3("button", { type: "submit", className: "dshsk-button", "data-variant": "primary", disabled: busy === true }, t("rename"))
    )
  );
}
var DIRECTORY_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function ListHead({ t, compact }) {
  return h3(
    "div",
    { className: "dshsk-listHead", role: "row" },
    h3(
      "div",
      { className: "dshsk-headCell dshsk-statusCell", role: "columnheader" },
      h3("span", { className: "dshsk-srOnly" }, t("columnStatus"))
    ),
    h3("div", { className: "dshsk-headCell dshsk-nameCell", role: "columnheader" }, t("columnName")),
    compact ? null : h3("div", { className: "dshsk-headCell dshsk-pathCell", role: "columnheader" }, t("columnPath")),
    h3("div", { className: "dshsk-headCell dshsk-actionsCell", role: "columnheader" }, t("columnActions"))
  );
}
var SECTIONS = Object.freeze([
  {
    key: "user",
    title: "sectionUser",
    empty: "sectionUserEmpty",
    includes: (row) => row.origin === "user"
  },
  {
    key: "plugin",
    title: "sectionPlugin",
    empty: "sectionPluginEmpty",
    includes: (row) => row.origin === "plugin" && row.path !== ""
  },
  {
    key: "virtual",
    title: "sectionVirtual",
    empty: "sectionVirtualEmpty",
    includes: (row) => row.origin === "virtual" || row.origin === "plugin" && row.path === ""
  }
]);
function SkillsSection({ t, section, rows, compact, callbacks }) {
  const title = t(section.title);
  return h3(
    "section",
    { className: "dshsk-section", "data-section": section.key },
    h3(
      "h2",
      { className: "dshsk-sectionTitle" },
      h3("span", { className: "dshsk-sectionName" }, title),
      h3("span", { className: "dshsk-sectionCount" }, String(rows.length))
    ),
    rows.length === 0 ? h3("p", { className: "dshsk-sectionEmpty" }, t(section.empty)) : h3(
      "div",
      { className: "dshsk-list", role: "table", "aria-label": title },
      h3(ListHead, { t, compact }),
      rows.map((row) => h3(SkillRow, { key: row.id, t, row, compact, ...callbacks }))
    )
  );
}
function SkillsPage({ t, client = api }) {
  const [list, setList] = React4.useState({ phase: "loading", skills: [], home: "", error: null });
  const [notice, setNotice] = React4.useState(null);
  const [editor, setEditor] = React4.useState(null);
  const [renaming, setRenaming] = React4.useState(null);
  const compact = useNarrowViewport();
  const input = React4.useRef(null);
  const load = React4.useCallback(async () => {
    try {
      const data = await client.list();
      setList({
        phase: "ready",
        skills: Array.isArray(data.skills) ? data.skills : [],
        home: data.home ?? "",
        error: null
      });
    } catch (error) {
      setList({ phase: "error", skills: [], home: "", error });
    }
  }, [client]);
  React4.useEffect(() => {
    load();
  }, [load]);
  const upload = React4.useCallback(
    async (file, mode, id = "") => {
      setNotice(null);
      try {
        const result = await client.upload(file, file.name ?? "", mode, id);
        setNotice({
          tone: "ok",
          text: t(result.action === "created" ? "uploadCreated" : "uploadReplaced", {
            dir: result.dir.split("/").pop() ?? result.dir
          })
        });
        await load();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "write-failed";
        setNotice({ tone: "error", text: `${t("uploadFailed")} ${errorText(t, code)}` });
      }
    },
    [client, load, t]
  );
  const pendingMode = React4.useRef({ mode: "create", id: "" });
  const pickFile = React4.useCallback((mode = "create", id = "") => {
    pendingMode.current = { mode, id };
    if (input.current !== null && typeof input.current.click === "function") input.current.click();
  }, []);
  const openEditor = React4.useCallback(
    async (row) => {
      setNotice(null);
      setEditor({ phase: "loading", path: pathOf(row) });
      try {
        const file = await client.read(row.id);
        setEditor({
          phase: "ready",
          id: row.id,
          path: `${row.dir}/${file.fileName}`,
          content: file.content,
          mtimeMs: file.mtimeMs,
          warning: false,
          saving: false,
          error: null
        });
      } catch (error) {
        setEditor(null);
        const code = error instanceof ApiError ? error.code : "not-found";
        setNotice({ tone: "error", text: `${t("editorOpenFailed", { dir: row.dir })} ${errorText(t, code)}` });
      }
    },
    [client, t]
  );
  const save = React4.useCallback(
    async (content) => {
      const current = editor;
      if (current === null || current.phase !== "ready") return;
      setEditor({ ...current, saving: true, error: null });
      try {
        if (current.warning !== true) {
          const fresh = await client.read(current.id);
          if (fresh.mtimeMs !== current.mtimeMs) {
            setEditor({ ...current, warning: true, saving: false, error: null });
            return;
          }
        }
        await client.save(current.id, content);
        setEditor(null);
        setNotice({ tone: "ok", text: t("saveDone", { path: current.path }) });
        await load();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "write-failed";
        setEditor({
          ...current,
          saving: false,
          error: `${t("saveFailed", { dir: current.id })} ${errorText(t, code)}`
        });
      }
    },
    [client, editor, load, t]
  );
  const toggle = React4.useCallback(
    async (row, enable) => {
      setNotice(null);
      try {
        const result = await client.setEnabled(row.id, enable);
        const next = RENAMED[enable ? "enable" : "disable"];
        setList((previous) => ({
          ...previous,
          skills: previous.skills.map(
            (skill) => skill.id === row.id ? {
              ...skill,
              status: result.status ?? next.status,
              fileName: result.fileName ?? next.fileName,
              path: `${skill.dir}/${result.fileName ?? next.fileName}`,
              actions: [
                ...(skill.actions ?? []).filter((action) => action !== "enable" && action !== "disable"),
                enable ? "disable" : "enable"
              ]
            } : skill
          )
        }));
        setNotice({ tone: "ok", text: t(enable ? "renamedToActive" : "renamedToDisabled") });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "write-failed";
        setNotice({
          tone: "error",
          text: `${t("renameFailed", { name: displayName(row) })} ${errorText(t, code)}`
        });
      }
    },
    [client, t]
  );
  const startRename = React4.useCallback((row) => {
    setNotice(null);
    setRenaming({ id: row.id, value: row.dir.split("/").pop() ?? "", error: null, busy: false });
  }, []);
  const cancelRename = React4.useCallback(() => setRenaming(null), []);
  const changeRename = React4.useCallback((value) => {
    setRenaming((previous) => previous === null ? previous : { ...previous, value, error: null });
  }, []);
  const submitRename = React4.useCallback(async () => {
    const current = renaming;
    if (current === null || current.busy === true) return;
    const value = current.value.trim();
    if (!DIRECTORY_NAME.test(value)) {
      setRenaming({ ...current, error: t("renameInvalid") });
      return;
    }
    const row = list.skills.find((skill) => skill.id === current.id);
    if (row === void 0) {
      setRenaming(null);
      return;
    }
    const oldName = row.dir.split("/").pop() ?? row.dir;
    setRenaming({ ...current, busy: true, error: null });
    try {
      const result = await client.rename(row.id, value);
      setList((previous) => ({
        ...previous,
        skills: previous.skills.map(
          (skill) => skill.id === row.id ? {
            ...skill,
            id: result.id ?? skill.id,
            dir: result.dir ?? skill.dir,
            path: `${result.dir ?? skill.dir}/${skill.fileName ?? "SKILL.md"}`,
            status: result.status ?? skill.status
          } : skill
        )
      }));
      setRenaming(null);
      setNotice({ tone: "ok", text: t("renamedDirectory", { old: oldName, new: value }) });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "write-failed";
      setRenaming({ ...current, busy: false, error: `${t("renameFailedDirectory", { old: oldName })} ${errorText(t, code)}` });
    }
  }, [client, list.skills, renaming, t]);
  const downloadMd = React4.useCallback(
    (row) => client.download(`/skill/${encodeURIComponent(row.id)}/download.md`, row.fileName ?? "SKILL.md"),
    [client]
  );
  const downloadZip = React4.useCallback(
    (row) => {
      const name2 = row.dir.split("/").pop() ?? "skill";
      client.download(`/skill/${encodeURIComponent(row.id)}/download.zip`, `${name2}.zip`);
    },
    [client]
  );
  const fileInput = h3("input", {
    ref: input,
    type: "file",
    hidden: true,
    "aria-label": t("uploadTitle"),
    onChange: (event) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = "";
      if (file !== null) upload(file, pendingMode.current.mode, pendingMode.current.id);
    }
  });
  const noticeView = notice === null ? null : h3(
    "div",
    { className: "dshsk-notice", "data-tone": notice.tone === "ok" ? "ok" : "error", role: "status" },
    notice.text
  );
  if (editor !== null) {
    if (editor.phase !== "ready") {
      return h3(
        "div",
        { className: "dshsk-page", "data-mode": "editor" },
        h3(
          "div",
          { className: "dshsk-inner dshsk-innerEditor" },
          h3("div", { className: "dshsk-loading" }, t("editorLoading"))
        )
      );
    }
    return h3(
      "div",
      { className: "dshsk-page", "data-mode": "editor" },
      h3(
        "div",
        { className: "dshsk-inner dshsk-innerEditor" },
        noticeView,
        h3(SkillEditor, {
          t,
          path: editor.path,
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
  const subtitle = list.phase === "ready" && list.home !== "" ? `${t("subtitle", { home: list.home })} \xB7 ${count === 1 ? t("countOne") : t("count", { count })}` : null;
  return h3(
    "div",
    { className: "dshsk-page" },
    h3(
      "div",
      { className: "dshsk-inner" },
      h3(
        "div",
        { className: "dshsk-head" },
        h3(
          "div",
          { className: "dshsk-headText" },
          h3("h1", { className: "dshsk-title" }, t("heading")),
          subtitle === null ? null : h3("p", { className: "dshsk-subtitle" }, subtitle)
        ),
        h3(
          "div",
          { className: "dshsk-headActions" },
          fileInput,
          h3(
            "button",
            {
              type: "button",
              className: "dshsk-button",
              "data-variant": "primary",
              title: t("uploadNewHint"),
              onClick: () => pickFile("create")
            },
            t("upload")
          )
        )
      ),
      noticeView,
      list.phase === "loading" ? h3("div", { className: "dshsk-loading" }, t("editorLoading")) : null,
      list.phase === "error" ? h3(
        "div",
        { className: "dshsk-empty" },
        h3("p", { className: "dshsk-emptyTitle" }, t("loadFailed")),
        h3("p", { className: "dshsk-emptyBody" }, errorText(t, list.error instanceof ApiError ? list.error.code : "network")),
        h3("button", { type: "button", className: "dshsk-button", onClick: () => load() }, t("retry"))
      ) : null,
      list.phase === "ready" ? SECTIONS.map(
        (section) => h3(SkillsSection, {
          key: section.key,
          t,
          section,
          rows: list.skills.filter(section.includes),
          compact,
          callbacks: {
            onEdit: openEditor,
            onRename: startRename,
            renaming,
            onRenameChange: changeRename,
            onRenameSubmit: submitRename,
            onRenameCancel: cancelRename,
            onDownloadMd: downloadMd,
            onDownloadZip: downloadZip,
            onUpload: (row) => pickFile("replace", row.id),
            onToggle: toggle
          }
        })
      ) : null,
      h3("p", { className: "dshsk-note" }, t("statusNote"))
    )
  );
}

// src/client/styles.js
var STYLE_ID = "dsh-skills";
var PLUGIN_ID = "@dr-co/dsh-skills";
var ACCENTS = Object.freeze({
  light: Object.freeze({
    background: "#ffffff",
    accent: "#c2185b",
    accentMuted: "#8d5f72"
  }),
  dark: Object.freeze({
    background: "#232324",
    accent: "#f472b6",
    accentMuted: "#c98ba6"
  })
});
var CSS = String.raw`
/* Pink accents, per palette. Light: 5.87:1 and 5.23:1 on #ffffff.
   Dark: 5.93:1 and 5.78:1 on #232324 — both above the 4.5:1 text bar and well
   above the 3:1 bar for the dot, and above the shell's own green on white. */
body {
  --dshsk-plugin-accent: #c2185b;
  --dshsk-plugin-accent-muted: #8d5f72;
}
body[data-ds-dark-theme] {
  --dshsk-plugin-accent: #f472b6;
  --dshsk-plugin-accent-muted: #c98ba6;
}

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

.dshsk-section { margin: 0 0 22px; }
.dshsk-sectionTitle { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 13px; line-height: 20px; font-weight: 600; }
.dshsk-sectionName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-sectionCount { flex: none; padding: 0 6px; border-radius: 9px; color: var(--dsw-alias-label-secondary, #646a73); background: var(--dsw-alias-bg-layer-2, #f5f6f7); font-size: 11px; line-height: 18px; font-weight: 500; }
.dshsk-section[data-section="plugin"] .dshsk-sectionName,
.dshsk-section[data-section="virtual"] .dshsk-sectionName { color: var(--dshsk-plugin-accent-muted, #8d5f72); }
.dshsk-sectionEmpty { margin: 0; padding: 14px 12px; border: 1px dashed var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; color: var(--dsw-alias-label-tertiary, #8f959e); font-size: 12px; line-height: 18px; }
.dshsk-list { width: 100%; border-top: 1px solid var(--dsw-alias-border-l1, #eef0f2); }
.dshsk-listHead, .dshsk-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
.dshsk-listHead { padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l2, #dfe1e5); color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; font-weight: 500; }
.dshsk-row { padding: 9px 0; border-bottom: 1px solid var(--dsw-alias-border-l1, #eef0f2); }
.dshsk-headCell, .dshsk-row > [role="cell"] { min-width: 0; }
.dshsk-statusCell { flex: 0 0 auto; display: flex; align-items: center; width: 14px; }
.dshsk-statusDot { display: block; flex: 0 0 auto; width: 11px; height: 11px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary, #d4d4d4); }
.dshsk-statusDot[data-origin="user"][data-status="active"] { background: var(--dsw-alias-state-success-primary, #2ea121); }
.dshsk-statusDot[data-origin="user"][data-status="disabled"] { background: var(--dsw-alias-state-idle-primary, #d4d4d4); }
.dshsk-statusDot[data-origin="plugin"][data-status="active"] { background: var(--dshsk-plugin-accent, #c2185b); }
.dshsk-statusDot[data-origin="plugin"][data-status="disabled"] { background: var(--dshsk-plugin-accent-muted, #8d5f72); }
.dshsk-statusDot[data-status="conflict"] { background: var(--dsw-alias-state-error-primary, #c53030); }
.dshsk-statusDot[data-status="virtual"] { background: transparent; box-shadow: inset 0 0 0 1.5px var(--dsw-alias-label-tertiary, #8f959e); }
.dshsk-nameCell { flex: 1 1 auto; min-width: 0; overflow: hidden; }
.dshsk-nameLine { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.dshsk-origin { flex: none; padding: 0 5px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 4px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 10px; line-height: 15px; letter-spacing: .02em; text-transform: uppercase; }
.dshsk-origin[data-origin="plugin"] { border-color: var(--dshsk-plugin-accent-muted, #8d5f72); color: var(--dshsk-plugin-accent-muted, #8d5f72); }
.dshsk-name { min-width: 0; overflow: hidden; font-weight: 500; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-name[data-origin="plugin"] { color: var(--dshsk-plugin-accent, #c2185b); }
.dshsk-name[data-origin="plugin"][data-status="disabled"] { color: var(--dshsk-plugin-accent-muted, #8d5f72); }
.dshsk-name[data-origin="virtual"] { color: var(--dsw-alias-label-secondary, #646a73); }
.dshsk-nameMeta { margin-top: 1px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-pathCell { flex: 0 0 auto; max-width: 148px; }
.dshsk-path { display: block; max-width: 100%; overflow: hidden; color: var(--dsw-alias-label-secondary, #646a73); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-actionsCell { position: relative; flex: 0 0 auto; display: inline-flex; justify-content: flex-end; }
.dshsk-listHead .dshsk-actionsCell { text-align: right; }
.dshsk-rowActions { position: relative; display: inline-flex; justify-content: flex-end; }
.dshsk-more { width: 28px; min-height: 28px; padding: 0; font-size: 16px; line-height: 1; }

/* Split control: two buttons in one bordered capsule, divided by a hairline —
   the shape of a single button that also opens the rest of the menu. */
.dshsk-splitActions { position: relative; display: inline-flex; align-items: stretch; height: 28px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-1, #fff); overflow: visible; }
.dshsk-splitPrimary, .dshsk-splitToggle { display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--dsw-alias-label-secondary, #646a73); cursor: pointer; }
.dshsk-splitPrimary { width: 32px; border-right: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px 0 0 8px; }
.dshsk-splitToggle { width: 22px; border-radius: 0 8px 8px 0; }
.dshsk-splitPrimary:hover, .dshsk-splitToggle:hover, .dshsk-splitToggle[aria-expanded="true"] { color: var(--dsw-alias-state-business-primary, #3370ff); background: var(--dsw-alias-interactive-bg-hover, #f5f6f7); }
.dshsk-splitPrimary:focus-visible, .dshsk-splitToggle:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #3370ff); outline-offset: -2px; }
.dshsk-splitPrimary:disabled, .dshsk-splitToggle:disabled { opacity: .55; cursor: default; }

.dshsk-rename { position: absolute; top: calc(100% + 4px); right: 0; z-index: 40; width: min(260px, calc(100vw - 24px)); padding: 10px 12px 12px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-3, #fff); box-shadow: 0 8px 24px rgb(0 0 0 / 16%); }
.dshsk-renameLabel { display: block; margin-bottom: 6px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 17px; }
.dshsk-renameInput { width: 100%; min-height: 30px; padding: 5px 8px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 6px; color: var(--dsw-alias-label-primary, #1f2329); background: var(--dsw-alias-bg-layer-1, #fff); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 18px; }
.dshsk-renameInput:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #3370ff); outline-offset: 1px; }
.dshsk-renameHint { margin: 6px 0 0; color: var(--dsw-alias-label-tertiary, #8f959e); font-size: 11px; line-height: 16px; }
.dshsk-renameError { margin: 6px 0 0; color: var(--dsw-alias-state-danger-primary, #c53030); font-size: 11px; line-height: 16px; }
.dshsk-renameActions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.dshsk-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 30; min-width: 190px; max-width: min(240px, calc(100vw - 24px)); padding: 4px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-3, #fff); box-shadow: 0 8px 24px rgb(0 0 0 / 14%); }
.dshsk-menu button { display: block; width: 100%; padding: 7px 10px; border: 0; border-radius: 6px; color: inherit; background: transparent; font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.dshsk-menu button:hover, .dshsk-menu button:focus-visible { background: var(--dsw-alias-interactive-bg-hover, #f5f6f7); outline: none; }
.dshsk-menuSeparator { height: 1px; margin: 4px 6px; background: var(--dsw-alias-border-l1, #eef0f2); }
.dshsk-note { margin: 14px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; }
.dshsk-notice { margin: 0 0 14px; padding: 9px 12px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-notice[data-tone="error"] { border-color: var(--dsw-alias-state-danger-primary, #c53030); color: var(--dsw-alias-state-danger-primary, #c53030); background: transparent; }
.dshsk-notice[data-tone="warn"] { border-color: var(--dsw-alias-state-warn-primary, #d97706); color: var(--dsw-alias-state-warn-primary, #d97706); background: transparent; }
.dshsk-empty { padding: 48px 24px; border: 1px dashed var(--dsw-alias-border-l2, #dfe1e5); border-radius: 12px; text-align: center; }
.dshsk-emptyTitle { margin: 0 0 6px; font-size: 15px; font-weight: 600; }
.dshsk-emptyBody { margin: 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-loading { padding: 40px 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; }
.dshsk-icon { display: block; flex: none; }

/* Editor: one pane, the whole panel. No preview anywhere. */
.dshsk-page[data-mode="editor"] { overflow: hidden; }
.dshsk-innerEditor { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.dshsk-editor { display: flex; flex-direction: column; gap: 12px; flex: 1 1 auto; min-height: 0; }
.dshsk-editorHead { display: flex; align-items: flex-start; gap: 12px; }
.dshsk-editorTitle { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.dshsk-editorMeta { margin: 4px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; }
.dshsk-pane { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 10px; overflow: hidden; background: var(--dsw-alias-bg-layer-1, #fff); }
.dshsk-paneHead { padding: 7px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, #eef0f2); color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-textarea { flex: 1 1 auto; width: 100%; min-height: 0; padding: 12px 14px; border: 0; outline: none; resize: none; color: var(--dsw-alias-label-primary, #1f2329); background: transparent; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 20px; tab-size: 2; }
.dshsk-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 2px; }
.dshsk-srOnly { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

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
var h4 = React5.createElement;
var name = "dsh-skills";
var inject = ["slots", "locale", "layout"];
var PANEL_ID = "dsh-skills";
var RUSSIAN_LANGUAGE = Object.freeze({ id: "ru", label: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", fallback: "en" });
function SkillsPanelIcon({ size = 16, active = false }) {
  return h4(
    "svg",
    {
      className: "dshsk-icon",
      "aria-hidden": "true",
      focusable: "false",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.75,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "data-active": active ? "true" : "false"
    },
    // Head and shoulders.
    h4("circle", { cx: 9.5, cy: 8.5, r: 3.3 }),
    h4("path", { d: "M3.6 20.4c0-3.2 2.6-5.7 5.9-5.7s5.9 2.5 5.9 5.7" }),
    // Cogwheel beside the head: rim, hub and four teeth.
    h4("circle", { cx: 18.2, cy: 7, r: 2.1 }),
    h4("path", { d: "M18.2 2.9v1.6M18.2 9.5v1.6M14.1 7h1.6M20.7 7H22.3" })
  );
}
function apply(ctx) {
  ctx.effect(() => installStyles(), "dsh-skills: styles");
  ctx.effect(() => ctx.locale.register(NS, "en", en), "dsh-skills: en dictionary");
  ctx.effect(() => ctx.locale.addLanguage(RUSSIAN_LANGUAGE), "dsh-skills: ru language");
  ctx.effect(() => ctx.locale.register(NS, "ru", ru), "dsh-skills: ru dictionary");
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL_ID, locale: NS }, SkillsPage));
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
