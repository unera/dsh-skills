import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { findDshInstall } from "./host/catalog.js";
import { resolveDshHome } from "./host/paths.js";
import { createRoutes, DEFAULT_MAX_UPLOAD_BYTES, ROUTE_PREFIX } from "./host/routes.js";
const name = "dsh-skills";
const inject = ["webServer"];
const DEFAULT_SKILLS_DIR = "skills";
function normalizeConfig(config = {}) {
  const max = config.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  if (typeof max !== "number" || !Number.isFinite(max) || max <= 0) {
    throw new TypeError("dsh-skills: maxUploadBytes must be a positive number");
  }
  for (const field of ["dshHome", "dshInstall", "skillsDir"]) {
    if (config[field] !== void 0 && typeof config[field] !== "string") {
      throw new TypeError(`dsh-skills: ${field} must be a string`);
    }
  }
  const skillsDir = (config.skillsDir ?? DEFAULT_SKILLS_DIR).replace(/^\.?\/+|\/+$/g, "");
  if (skillsDir === "" || skillsDir.split("/").some((segment) => segment === "..")) {
    throw new TypeError("dsh-skills: skillsDir must be a relative directory below the harness home");
  }
  return { ...config, skillsDir, maxUploadBytes: Math.floor(max) };
}
function apply(ctx, config = {}) {
  const settings = normalizeConfig(config);
  const home = resolveDshHome(settings.dshHome);
  const installDir = settings.dshInstall ?? findDshInstall();
  const logger = ctx.logger;
  const skillsDirAbsolute = join(home, settings.skillsDir);
  try {
    mkdirSync(skillsDirAbsolute, { recursive: true });
  } catch (error) {
    logger?.warn?.(`[dsh-skills] could not create ${skillsDirAbsolute}: ${error.message}`);
  }
  const provided = async () => {
    const service = typeof ctx.get === "function" ? ctx.get("skills") : ctx.skills;
    if (typeof service?.list !== "function") return [];
    const skills = await service.list({ cwd: process.cwd() });
    return skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      whenToUse: skill.whenToUse,
      path: skill.path,
      provider: skill.provider
    }));
  };
  const routes = createRoutes({
    home,
    installDir,
    skillsDir: settings.skillsDir,
    maxUploadBytes: settings.maxUploadBytes,
    provided,
    logger
  });
  const register = () => {
    const webServer = ctx.webServer;
    if (typeof webServer?.register !== "function") {
      throw new TypeError("dsh-skills: the webServer service is required");
    }
    const disposers = routes.map((route) => webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  };
  if (typeof ctx.effect === "function") {
    ctx.effect(register, `dsh-skills: ${ROUTE_PREFIX}`);
  } else {
    register();
  }
  logger?.info?.(
    `[dsh-skills] serving ${join(home, settings.skillsDir)} and packaged skills under ${ROUTE_PREFIX}` + (installDir === void 0 ? " (installation not found)" : "")
  );
}
var index_default = Object.freeze({ name, inject, apply, normalizeConfig });
export {
  DEFAULT_SKILLS_DIR,
  apply,
  index_default as default,
  inject,
  name,
  normalizeConfig
};
