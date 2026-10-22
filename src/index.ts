/**
 * Host half of the Skills page: the JSON API the browser half calls.
 *
 * The browser bundle in `src/client/` owns the sidebar row, the table, and the
 * editor; this entry owns the filesystem. It deliberately does not use
 * `ctx.skills`: that service only knows the skills it can load, and a skill
 * whose file is `_SKILL.md` is exactly the one the page must still show.
 *
 * @module @deepseek-ai/dsh-skills
 */
import { mkdirSync } from 'node:fs';
import { resolveSkillsRoot } from './host/paths.js';
import { createRoutes, DEFAULT_MAX_UPLOAD_BYTES, ROUTE_PREFIX } from './host/routes.js';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';

/** Cordis plugin name. */
export const name = 'dsh-skills';

/** The browser half is useless without the Web GUI's route table. */
export const inject = ['webServer'];

/** Plugin configuration. */
export interface Config {
  /** Skills root; defaults to `$DSH_HOME/skills`, then `~/.dsh/skills`. */
  skillsRoot?: string;
  /** Harness home used when `skillsRoot` is absent; defaults to `$DSH_HOME`, then `~/.dsh`. */
  dshHome?: string;
  /** Largest accepted upload in bytes. Defaults to 8 MiB. */
  maxUploadBytes?: number;
}

/** The slice of the host context this plugin touches. */
interface HostContext {
  webServer?: { register(route: WebRoute): () => void };
  effect?: (run: () => void | (() => void), label?: string) => void;
  logger?: { info?: (message: string) => void; warn?: (message: string) => void };
}

/**
 * Validate the plugin configuration.
 * @param config - raw configuration from the profile patch.
 * @returns the normalized configuration.
 * @throws {TypeError} for a non-string root or a non-positive size cap.
 */
export function normalizeConfig(config: Config = {}): Required<Pick<Config, 'maxUploadBytes'>> & Config {
  const max = config.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  if (typeof max !== 'number' || !Number.isFinite(max) || max <= 0) {
    throw new TypeError('dsh-skills: maxUploadBytes must be a positive number');
  }
  if (config.skillsRoot !== undefined && typeof config.skillsRoot !== 'string') {
    throw new TypeError('dsh-skills: skillsRoot must be a string');
  }
  if (config.dshHome !== undefined && typeof config.dshHome !== 'string') {
    throw new TypeError('dsh-skills: dshHome must be a string');
  }
  return { ...config, maxUploadBytes: Math.floor(max) };
}

/**
 * Mount the plugin.
 * @param ctx - host context carrying the web server.
 * @param config - see {@link Config}.
 */
export function apply(ctx: HostContext, config: Config = {}): void {
  const settings = normalizeConfig(config);
  const root = resolveSkillsRoot({ skillsRoot: settings.skillsRoot, dshHome: settings.dshHome });
  const logger = ctx.logger;

  try {
    mkdirSync(root, { recursive: true });
  } catch (error) {
    logger?.warn?.(`[dsh-skills] could not create ${root}: ${(error as Error).message}`);
  }

  const routes = createRoutes({ root, maxUploadBytes: settings.maxUploadBytes, logger });
  const register = (): (() => void) => {
    const webServer = ctx.webServer;
    if (typeof webServer?.register !== 'function') {
      throw new TypeError('dsh-skills: the webServer service is required');
    }
    const disposers = routes.map((route) => webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  };

  if (typeof ctx.effect === 'function') {
    ctx.effect(register, `dsh-skills: ${ROUTE_PREFIX}`);
  } else {
    register();
  }
  logger?.info?.(`[dsh-skills] serving ${root} under ${ROUTE_PREFIX}`);
}

export default Object.freeze({ name, inject, apply, normalizeConfig });
