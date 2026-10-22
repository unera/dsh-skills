# @dr-co/dsh-skills

A **Skills page** for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI: a sidebar row that opens a full main panel listing every skill the host knows about — our own, the ones bundled inside installed packages, and the ones a plugin provides without any file — with download, upload, rename, enable/disable, and editing built in.

The page reads the filesystem itself instead of asking `ctx.skills` alone, because that service only reports the skills it can load. A skill whose file is named `_SKILL.md` is invisible to the core on purpose — and it is exactly the one you need to see when a skill stops working.

## What it does

The list is three sections, each with its own heading, count, and empty state:

| Section | Where it comes from | Colours | Actions |
| --- | --- | --- | --- |
| **Standard skills in `$DSH_HOME/skills`** | our own directories | green dot when active, grey when disabled, normal name colour | everything: view, edit, rename, upload, both downloads, enable/disable |
| **Skills bundled with plugins** | `<pkg>/skills/*` and `<pkg>/assets/*` of every installed package, found through their manifests | pink dot and pink name when active, grey-pink when disabled | view and both downloads — they live in `node_modules` |
| **Provided by plugins (no file)** | `ctx.skills.list()` entries with no file on disk | pink, dashed dot | view and `Download SKILL.md`; no ZIP, because there is no directory to archive |

- **Status** is one 11px dot: green for `SKILL.md`, grey for `_SKILL.md` (ours); pink for an active packaged skill, grey-pink for a disabled one. A directory holding both files is reported as a conflict, in red. The word lives in the dot's tooltip and accessible name, not in the row.
- **Name** takes every pixel the row has left, with the frontmatter `description` underneath; both are cut with an ellipsis, never wrapped.
- **Path** is relative to `$DSH_HOME` when it is inside it, otherwise relative to the package; shown in full up to 15 characters and, past that, as its first 7 and last 7 around three dots (`split/p...ath/foo`). The full path is in the tooltip. Below 640px the column is not rendered at all and the row keeps the path in its accessible name.
- **View** — the first item in every row's menu, for all three sections. It opens the same full-page frame as the editor but read-only: the raw text, no `textarea`, no `Save`, a `Read-only` badge, `Close` back to the list, and `Edit` beside it when the skill may be edited. Nothing is rendered — no markdown, no highlighting — and nothing can be written from it. A provider skill's text comes from `ctx.skills.get(name)`; if it returns an empty body the page says *content is not available for this skill* rather than showing a blank screen.
- **Row menu** — `View`, `Edit`, `Rename`, `Download SKILL.md`, `Download ZIP`, `Upload`, `Enable`/`Disable`, in that order, separated into groups. On a wide screen the first action is also reachable from the split button: a pencil that opens the editor plus a chevron for the menu. On a narrow one there is a single `⋯` and Edit is the first item.
- **Edit** — a full-page view inside the panel (not a dialog, not a URL): one plain monospace `textarea` filling the panel, `Cancel` and `Save` at the bottom. There is no preview at any width. `Save` stays disabled until something changes; a file that changed on disk after it was opened raises a warning before the first save, and the second press overwrites.
- **Rename** — renames the skill's *directory* (never the frontmatter `name`), inline, with the current name prefilled, kebab-case validation, and an atomic `rename()` inside the same parent. A name that is already taken is refused, and a failure leaves the original directory untouched.
- **Enable / Disable** — the harness' own switch: `SKILL.md` → `_SKILL.md` and back. After the rename the row updates in place (dot, path, menu) and a notice says exactly what happened on disk: `File SKILL.md renamed to _SKILL.md`.
- **Download SKILL.md** — the exact file bytes, `Content-Disposition: attachment`.
- **Download ZIP** — the whole skill directory rooted at its own name, attachments (`bin/`, `data/`, anything else) included, so the archive can be uploaded back as-is.
- **English and Russian** — the whole page, notices and error messages included. Russian is a complete dictionary registered with `ctx.locale.addLanguage({ id: 'ru', label: 'Русский', fallback: 'en' })`; nothing falls back to English mid-sentence.

### Colours and themes

Green and grey are the shell's own tokens (`--dsw-alias-state-success-primary` for on, `--dsw-alias-state-idle-primary` for off), so they match the rest of the interface in every theme for free. Pink is not in the token set, so the plugin defines two variables of its own and gives both palettes their own values:

| Palette | `--dshsk-plugin-accent` | contrast on the panel | `--dshsk-plugin-accent-muted` | contrast |
| --- | --- | --- | --- | --- |
| light (`#ffffff`) | `#c2185b` | 5.87:1 | `#8d5f72` | 5.23:1 |
| dark (`#232324`) | `#f472b6` | 5.93:1 | `#c98ba6` | 5.78:1 |

Both clear the 4.5:1 bar for text and the 3:1 bar for the dot, and both are above the shell's green on white (2.28:1). The dark block keys off `body[data-ds-dark-theme]` — the attribute the shell's own theme presenter writes when it applies a snapshot — and *not* off `prefers-color-scheme`, because the resolved scheme follows the user's setting (including "system" dark and registered themes), not the operating system. The test recomputes both ratios from the values in `src/client/styles.js`.

### Two uploads, two contracts

The page button and the row menu are not the same operation, and the difference is deliberate: a stray drop should not be able to overwrite a working skill.

| Upload | Accepted | Name comes from | If the name is taken |
| --- | --- | --- | --- |
| **Page button (create)** | only a ZIP with one top-level folder containing `SKILL.md` | the folder name (kebab-case) | refused: *a skill with this name already exists* — replace it from the row menu instead |
| **Row menu (replace)** | a single `SKILL.md`, or a ZIP whose folder is this skill's own name | the row | — (this is the only way to replace) |

A new skill is created from a zip whose top-level folder is the skill name; a single `SKILL.md` is only accepted when replacing an existing skill. Everything else — several top-level entries, `SKILL.md` at the archive root, an archive without `SKILL.md`, an illegal folder name, a broken archive, a non-ZIP file for the create upload, a file not named `SKILL.md` for the replace upload — is refused with `Unrecognized skill format` («Нераспознаваемый формат скилла») and nothing on disk changes.

Safety, in the order it happens: every path is resolved and proved to stay inside its root (traversal segments, absolute paths, drive letters and leading dots are refused before the filesystem sees them); a skill directory and its file must be real — a symlinked `SKILL.md` is skipped by the list and never read, written, or archived; a packaged skill is refused by the *host* for every write (`403 read-only`), not merely hidden by the browser; uploads are capped; a ZIP is unpacked into a dot-prefixed staging directory and swapped in by rename only after every member has validated, with the previous directory restored if the swap fails; file modes from the archive are preserved. A refused upload leaves the tree byte-identical, which is what the tests assert.

## Install

The package ships a `dsh.bundle` layer, so `dsh plugin add` both installs it and mounts it; it then appears in the settings plugin list where it can be switched off or removed.

```sh
dsh plugin --profile <profile> add @dr-co/dsh-skills
```

From a checkout, while developing:

```sh
npm install
npm run build
dsh plugin --profile <profile> add file:$PWD
```

Restart the Web GUI afterwards. The sidebar gains a **Skills** row after Plugins and Tasks.

### Configuration

```yaml
- id: dsh-skills
  name: '@dr-co/dsh-skills'
  config:
    dshHome: /home/dsh/work/ai/.dsh   # default: $DSH_HOME, then ~/.dsh
    dshInstall: /opt/dsh              # default: found from the running CLI
    skillsDir: skills                 # our own skills, relative to the home
    maxUploadBytes: 8388608           # default 8 MiB
```

The home follows the harness' own precedence — an explicit `dshHome`, then `$DSH_HOME`, then `~/.dsh` — with a leading `~` expanded. A blank `$DSH_HOME` counts as unset, so a blank variable never resolves the path to the working directory. The installation is found by walking up from the running `dsh` entry point to the package whose manifest is named `@deepseek-ai/dsh`; across its `node_modules` and every profile's `node_modules`, packages are read from their manifests only (a package's own `node_modules` is never descended into). Packaged skills are cached for 30 seconds — they cannot change under a running host except by an install — and our own skills are always read live.

## Host API

One prefix route, `/dsh-skills/api`, JSON with a `code` the client localizes:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/skills` | home, roots, and every row with its `actions` |
| `GET` | `/skill/<id>` | the text: a file's contents, or a provider skill's body from `ctx.skills.get()` |
| `PUT` | `/skill/<id>` | `{content}` → writes atomically, preserves mode and status |
| `POST` | `/skill/<id>/enable` · `/disable` | rename the file, the harness' own switch |
| `POST` | `/skill/<id>/rename` | `{name}` → rename the directory inside its parent |
| `GET` | `/skill/<id>/download.md` | exact file bytes |
| `GET` | `/skill/<id>/download.zip` | whole directory, rooted at its name |
| `POST` | `/upload?mode=create` | a ZIP that creates a new skill |
| `POST` | `/upload?mode=replace&id=<id>` | a file or ZIP that replaces that row's skill |

A row id is `<origin>:<rootKey>:<relative path>` (`user:home:skills/foo`), resolved against the live catalog on every call — an id the catalog does not have is `not-found`, never a path to read.

Codes: `unrecognized-format` (415), `name-mismatch` (409), `already-exists` (409), `conflict` (409), `read-only` (403), `not-found` (404), `too-large` (413), `bad-request` (400), `write-failed` (500). The English `error` field is a diagnostic; the page shows its own language by code.

**Access control is the deployment's, not the plugin's.** These are plain same-origin routes on the Web GUI's own listener: anyone who can reach the GUI can list, read, download, save, and upload skills. That matches what the GUI already grants (a session with shell access), and the harness binds itself to a single interface, but a deployment that exposes the GUI publicly should put its own authentication in front of the whole origin — the plugin adds none.

## Platform notes (what a plugin cannot do)

Verified against the installed harness (0.2.1-rc.2), not preferences:

- **The sidebar cannot be extended by adding a slot.** The `sidebar` slot is `kind: 'single'` and occupied by the shell's own `SidebarRoot`. The supported extension point is the list slot it declares, `sidebar.panellist` (`SidebarPanelIconOwnerProps { size, active }`), where the entry's `id` must equal the `main` slot's key (`MainPanelId`). This plugin registers exactly that, plus `ctx.slots.register({ name: 'main', key: 'dsh-skills', locale: NS }, SkillsPage)` — a real main panel, not a dialog. Panel switching is the shell's `ctx.layout.selectPanel(id)`. The icon is drawn inline at 24×24, `stroke="currentColor"`, `stroke-width="1.75"`, `fill="none"`, round joins, and honouring the `size` the shell passes.
- **No shared markdown renderer is importable.** The client module table is fixed (`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`, `zod`, `@tanstack/react-virtual`, `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-dockkit`); Shiki and the harness' markdown component live *inside* the shell bundle and are exported to nobody. Since this version has no preview, the plugin ships no renderer at all — an earlier draft had one of its own for exactly this reason.
- **There is no split-button primitive.** `@deepseek-ai/dsh-client-ui-primitives` offers `Button`, a value `SegmentedControl`, and menu surfaces — nothing that is one control with a second action. The split here is two `<button>` elements in one bordered container with a hairline between them.
- **A plugin has no build plugin for the bundle wrapper.** The page loads a bundle as a script calling `window.__ModuleLoader__.load({ id, factory })`; the harness generates that wrapper with an internal tsdown plugin that is not published. `scripts/build-client.mjs` gets the same result with esbuild plus a small wrapper. The bundle requires only `react`, which the module table does provide.
- The host half is TypeScript, typechecked against the published `@deepseek-ai/dsh-host-webserver` types. The browser half is plain ESM JavaScript: the slot and locale services have no published type package on this host, so it is kept to what the shipped bundles demonstrably accept, and covered by tests driving the real components.

## Development

```sh
npm install
npm run typecheck   # tsc --noEmit over the host half
npm test            # builds both halves, then runs the node:test suites
npm run build       # lib/index.js + lib/host/*.js, and the wrapped lib/client.js
```

Tests (99): frontmatter parsing; our own and packaged scanning, including the both-files conflict and the symlink rules; the ZIP reader and writer; both upload contracts with byte-identical trees after every refusal; the catalog's three origins, deduplication and display paths; the routes through a real HTTP server, including `read-only`, `already-exists`, `conflict`, and rename; and the client — three sections, dot/name colours, menu order, split versus single control, the read-only view (no textarea, no Save, `Close`/`Edit`, empty content), enable/disable notices, rename with validation and in-place update, the editor with no preview, the icon, and both dictionaries.

## License

MIT.
