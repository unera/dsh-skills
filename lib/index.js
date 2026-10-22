import { mkdirSync } from "node:fs";
import { resolveSkillsRoot } from "./host/paths.js";
import { createRoutes, DEFAULT_MAX_UPLOAD_BYTES, ROUTE_PREFIX } from "./host/routes.js";
const name = "dsh-skills";
const inject = ["webServer"];
function normalizeConfig(config = {}) {
  const max = config.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  if (typeof max !== "number" || !Number.isFinite(max) || max <= 0) {
    throw new TypeError("dsh-skills: maxUploadBytes must be a positive number");
  }
  if (config.skillsRoot !== void 0 && typeof config.skillsRoot !== "string") {
    throw new TypeError("dsh-skills: skillsRoot must be a string");
  }
  if (config.dshHome !== void 0 && typeof config.dshHome !== "string") {
    throw new TypeError("dsh-skills: dshHome must be a string");
  }
  return { ...config, maxUploadBytes: Math.floor(max) };
}
function apply(ctx, config = {}) {
  const settings = normalizeConfig(config);
  const root = resolveSkillsRoot({ skillsRoot: settings.skillsRoot, dshHome: settings.dshHome });
  const logger = ctx.logger;
  try {
    mkdirSync(root, { recursive: true });
  } catch (error) {
    logger?.warn?.(`[dsh-skills] could not create ${root}: ${error.message}`);
  }
  const routes = createRoutes({ root, maxUploadBytes: settings.maxUploadBytes, logger });
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
  logger?.info?.(`[dsh-skills] serving ${root} under ${ROUTE_PREFIX}`);
}
var index_default = Object.freeze({ name, inject, apply, normalizeConfig });
export {
  apply,
  index_default as default,
  inject,
  name,
  normalizeConfig
};
