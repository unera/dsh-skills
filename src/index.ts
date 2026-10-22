/**
 * Host half of the Skills page: the JSON API the browser half calls.
 *
 * The browser bundle in `src/client/` owns the sidebar row, the list, and the
 * editor; this entry owns the filesystem. Three sources feed one list: our own
 * skills under `<home>/skills` (fully editable), skills bundled inside installed
 * packages (read-only, found through their manifests), and skills a provider
 * contributes virtually (no file at all). `ctx.skills` provides only the third,
 * and it cannot see a disabled skill, which is exactly the one the page must
 * still show — so the first two are read from disk.
 *
 * @module @dr-co/dsh-skills
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { findDshInstall, type ProvidedSkill } from './host/catalog.js';
import { resolveDshHome } from './host/paths.js';
import { createRoutes, DEFAULT_MAX_UPLOAD_BYTES, ROUTE_PREFIX } from './host/routes.js';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';

/** Cordis plugin name. */
export const name = 'dsh-skills';

/** The browser half is useless without the Web GUI's route table. */
export const inject = ['webServer'];

/** Directory holding our own skills, relative to the harness home. */
export const DEFAULT_SKILLS_DIR = 'skills';

/** Plugin configuration. */
export interface Config {
  /** Harness home; defaults to `$DSH_HOME`, then `~/.dsh`. */
  dshHome?: string;
  /** Harness installation directory; defaults to the one the running CLI belongs to. */
  dshInstall?: string;
  /** Directory of our own skills, relative to the home. Defaults to `skills`. */
  skillsDir?: string;
  /** Largest accepted upload in bytes. Defaults to 8 MiB. */
  maxUploadBytes?: number;
}

/** The slice of the host context this plugin touches. */
interface HostContext {
  webServer?: { register(route: WebRoute): () => void };
  effect?: (run: () => void | (() => void), label?: string) => void;
  logger?: { info?: (message: string) => void; warn?: (message: string) => void };
  skills?: { list(options?: { cwd?: string }): Promise<readonly ProvidedSkill[]> };
  get?: (name: string) => unknown;
}

/**
 * Validate the plugin configuration.
 * @param config - raw configuration from the profile patch.
 * @returns the normalized configuration.
 * @throws {TypeError} for a non-string path or a non-positive size cap.
 */
export function normalizeConfig(config: Config = {}): Required<Pick<Config, 'maxUploadBytes' | 'skillsDir'>> & Config {
  const max = config.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  if (typeof max !== 'number' || !Number.isFinite(max) || max <= 0) {
    throw new TypeError('dsh-skills: maxUploadBytes must be a positive number');
  }
  for (const field of ['dshHome', 'dshInstall', 'skillsDir'] as const) {
    if (config[field] !== undefined && typeof config[field] !== 'string') {
      throw new TypeError(`dsh-skills: ${field} must be a string`);
    }
  }
  const skillsDir = (config.skillsDir ?? DEFAULT_SKILLS_DIR).replace(/^\.?\/+|\/+$/g, '');
  if (skillsDir === '' || skillsDir.split('/').some((segment) => segment === '..')) {
    throw new TypeError('dsh-skills: skillsDir must be a relative directory below the harness home');
  }
  return { ...config, skillsDir, maxUploadBytes: Math.floor(max) };
}

/**
 * Mount the plugin.
 * @param ctx - host context carrying the web server and, optionally, the skills service.
 * @param config - see {@link Config}.
 */
export function apply(ctx: HostContext, config: Config = {}): void {
  const settings = normalizeConfig(config);
  const home = resolveDshHome(settings.dshHome);
  const installDir = settings.dshInstall ?? findDshInstall();
  const logger = ctx.logger;
  const skillsDirAbsolute = join(home, settings.skillsDir);

  try {
    mkdirSync(skillsDirAbsolute, { recursive: true });
  } catch (error) {
    logger?.warn?.(`[dsh-skills] could not create ${skillsDirAbsolute}: ${(error as Error).message}`);
  }

  // The provider's list is a bonus, not a dependency: a host without the service
  // still gets the two file-backed sets, and a failing provider must not take the
  // page down with it.
  const provided = async (): Promise<ProvidedSkill[]> => {
    const service =
      typeof ctx.get === 'function' ? (ctx.get('skills') as HostContext['skills']) : ctx.skills;
    if (typeof service?.list !== 'function') return [];
    const skills = await service.list({ cwd: process.cwd() });
    return skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      whenToUse: skill.whenToUse,
      path: skill.path,
      provider: skill.provider,
    }));
  };

  const routes = createRoutes({
    home,
    installDir,
    skillsDir: settings.skillsDir,
    maxUploadBytes: settings.maxUploadBytes,
    provided,
    logger,
  });

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
  logger?.info?.(
    `[dsh-skills] serving ${join(home, settings.skillsDir)} and packaged skills under ${ROUTE_PREFIX}` +
      (installDir === undefined ? ' (installation not found)' : ''),
  );
}

export default Object.freeze({ name, inject, apply, normalizeConfig });
