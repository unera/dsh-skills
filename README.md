# @dr-co/dsh-skills

A **Skills page** for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI: a sidebar row that opens a full main panel listing every skill in `$DSH_HOME/skills`, active and disabled, with download, upload, and editing built in.

The page reads the skills directory itself instead of asking `ctx.skills`, because that service only reports the skills it can load. A skill whose file is named `_SKILL.md` is invisible to the core on purpose — and it is exactly the one you need to see when a skill stops working.

## What it does

- **List** — one row per skill directory. The status is a single dot, green for `SKILL.md` and grey for `_SKILL.md`, with the word in its tooltip and accessible name; the frontmatter `name` (or the directory name) carries the description underneath and takes every pixel the row has left; the path relative to the skills root is capped at 15 characters, cut in the middle, with the full path in its tooltip. Below 640px the path column is not rendered at all (the row keeps the full path in its accessible name), so the row stays two lines tall and never scrolls sideways.
- **Row menu** — `Download SKILL.md`, `Download ZIP`, `Upload`, `Edit SKILL.md`.
- **Download SKILL.md** — the exact file bytes, `Content-Disposition: attachment`.
- **Download ZIP** — the whole skill directory under its own name, attachments (`bin/`, `data/`, anything else) included, so the archive can be uploaded back as-is.
- **Upload** — also available at the top of the page. The format is decided by the uploaded bytes, never by the form field (rules below).
- **Edit** — a full-page view inside the panel (not a dialog, not a URL): a plain monospace `textarea` on the left, the rendered markdown on the right, updating as you type. `Cancel` discards the draft and returns to the list; `Save` writes the file and returns to the refreshed list. `Save` stays disabled until something changes, and a file that changed on disk after it was opened raises a warning before the first save — the second press overwrites.
- **English and Russian** — the whole page, error messages included. Russian is a complete dictionary registered with `ctx.locale.addLanguage({ id: 'ru', label: 'Русский', fallback: 'en' })`; nothing falls back to English mid-sentence.

### Not in this version

**Enable/disable is deliberately out of scope.** Status is read-only: the page shows `Disabled` and leaves the file alone. Turning a skill off is a rename (`SKILL.md` → `_SKILL.md`) on disk, and a half-built switch for it would be worse than none. Saving the body of a disabled skill writes `_SKILL.md` — editing never changes a skill's status by accident.

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

The row in the profile's patch (or a `dsh plugin add` config override) accepts:

```yaml
- id: dsh-skills
  name: '@dr-co/dsh-skills'
  config:
    skillsRoot: /srv/skills      # default: $DSH_HOME/skills, then ~/.dsh/skills
    dshHome: /home/dsh/work/ai/.dsh  # only used when skillsRoot is absent
    maxUploadBytes: 8388608      # default 8 MiB
```

The skills root follows the harness' own precedence — an explicit `skillsRoot`, then `$DSH_HOME`, then `~/.dsh` — with a leading `~` expanded. A blank `$DSH_HOME` counts as unset, so a blank variable never resolves the root to the working directory. The root is created at mount time when it is missing.

## Upload format rules

The bytes decide, not the file name:

1. **A single file named `SKILL.md`.** Its frontmatter `name` addresses the target: an existing skill whose directory *or* frontmatter name matches is rewritten in place (and keeps its status — a disabled skill stays `_SKILL.md`); with no match, a new directory is created under that name. The name must be lowercase kebab-case (`[a-z0-9]+(-[a-z0-9]+)*`), with no path separators and no leading dot. A `SKILL.md` with no frontmatter name is refused with `name-mismatch`, because there is nothing to address.
2. **A ZIP that contains exactly one top-level directory `<folder>/`, with `<folder>/SKILL.md` inside.** Accepted only when `<folder>` matches an installed skill directory; that directory is then replaced wholesale — the old content is deleted, the archive unpacked in its place.
3. **Everything else is refused** with `Unrecognized skill format` («Нераспознаваемый формат скилла») and nothing on disk changes: several top-level entries, a root-level `SKILL.md` with no folder, a folder that is not installed, an archive with no `SKILL.md` (only `_SKILL.md` counts as missing), a traversal or absolute member, a symlink member, an encrypted or ZIP64 archive, an unsupported compression method, a non-ZIP file that is not named `SKILL.md`, or a file with NUL bytes.

| Input | Result |
| --- | --- |
| `SKILL.md`, name matches a skill | that skill's file rewritten, status preserved |
| `SKILL.md`, name is new and legal | new skill directory created |
| `SKILL.md`, no frontmatter name | `name-mismatch`, nothing written |
| `SKILL.md`, illegal name | `name-mismatch`, nothing written |
| any other single file | `unrecognized-format`, nothing written |
| ZIP, one folder, folder installed, `SKILL.md` inside | directory replaced wholesale |
| ZIP, folder not installed | `unrecognized-format` |
| ZIP, several top-level entries | `unrecognized-format` |
| ZIP, `SKILL.md` at the root | `unrecognized-format` |
| ZIP, no `<folder>/SKILL.md` | `unrecognized-format` |
| ZIP, `../`, absolute path, or symlink member | `unrecognized-format` |
| over the size cap | `too-large`, nothing written |

Safety, in the order it happens: every path is resolved and proved to stay inside the skills root (traversal segments, absolute paths, drive letters, and a leading dot are refused before the filesystem sees them); a skill directory and its file must both be real — a symlinked one is skipped by the list and never followed by a read, a save, or an archive; uploads are capped; a ZIP is unpacked into a dot-prefixed staging directory inside the root and swapped in by rename only after every member has validated, with the previous directory restored if the swap fails; file modes from the archive are preserved. A refused upload leaves the tree byte-identical, which is what the tests assert.

## Host API

One prefix route, `/dsh-skills/api`, JSON with a `code` the client localizes:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/skills` | root plus every skill row |
| `GET` | `/skill/<dir>` | one file: name, contents, `mtimeMs` |
| `PUT` | `/skill/<dir>` | `{content}` → writes atomically, preserves mode and status |
| `GET` | `/skill/<dir>/download.md` | exact file bytes |
| `GET` | `/skill/<dir>/download.zip` | whole directory, rooted at its name |
| `POST` | `/upload` | raw bytes; name in the `x-dsh-skills-filename` header (percent-encoded) |

Codes: `unrecognized-format` (415), `name-mismatch` (409), `not-found` (404), `too-large` (413), `bad-request` (400), `write-failed` (500). The English `error` field is a diagnostic; the page shows its own language by code.

**Access control is the deployment's, not the plugin's.** These are plain same-origin routes on the Web GUI's own listener: anyone who can reach the GUI can list, read, download, save, and upload skills. That matches what the GUI already grants (a session with shell access), and the harness binds itself to a single interface, but a deployment that exposes the GUI publicly should put its own authentication in front of the whole origin — the plugin adds none.

## Platform notes (what a plugin cannot do)

These are limits of the installed harness (0.2.1-rc.2), verified against its shipped type definitions and bundles, not preferences:

- **The sidebar cannot be extended by adding a slot.** The `sidebar` slot is `kind: 'single'` and is occupied by the shell's own `SidebarRoot`. The supported extension point is the list slot it declares, `sidebar.panellist` (`SidebarPanelIconOwnerProps { size, active }`), where the entry's `id` must equal the `main` slot's key (`MainPanelId`). That is what this plugin registers: `ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'dsh-skills', order: 20, label: () => ctx.locale.bind(NS)('panel'), locale: NS }, SkillsPanelIcon))`. The page is `ctx.slots.register({ name: 'main', key: 'dsh-skills', locale: NS }, SkillsPage)` — the keyed `main` slot, i.e. a real main panel beside Plugins and Tasks, not a dialog. Panel switching is the shell's own `ctx.layout.selectPanel(id)`.
- **A plugin bundle cannot import a markdown renderer.** The client module table the shell seeds is fixed: `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`, `zod`, `@tanstack/react-virtual`, `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-dockkit`. Shiki is compiled *into* the shell's own application bundle (its classes appear there as `shiki css-variables`), and the harness' markdown component lives in that bundle too — neither is exported, so no plugin can import either at any version. **The preview therefore uses a small self-contained renderer of our own** (`src/client/markdown.js`): headings, paragraphs, bold, italic, strikethrough, inline code, fenced code blocks, blockquotes, ordered and unordered lists, links, and tables with an alignment row. It returns React elements rather than HTML, so there is no `dangerouslySetInnerHTML` in this package and uploaded markdown can never become markup. There is no syntax highlighting in either pane, by design.
- **A plugin has no build plugin for the bundle wrapper.** The page loads a plugin bundle as a script that calls `window.__ModuleLoader__.load({ id, factory })`; the harness generates that wrapper with its own internal tsdown plugin, which is not published. `scripts/build-client.mjs` gets the same result with esbuild plus a small wrapper — the bundle requires only `react`, which the module table does provide.
- The host half is TypeScript and typechecked against the published `@deepseek-ai/dsh-host-webserver` route types. The browser half is plain ESM JavaScript: the slot and locale services have no published type package on this host (they live inside the shell bundle), so it is kept to what the shipped bundles demonstrably accept, and covered by tests driving the real components.

## Development

```sh
npm install
npm run typecheck   # tsc --noEmit over the host half
npm test            # builds both halves, then runs the node:test suites
npm run build       # lib/index.js + lib/host/*.js, and the wrapped lib/client.js
```

Tests: frontmatter parsing, scanning (both file names, skipped symlinks), the ZIP reader and writer (nested attachments, modes, every refusal), all upload rules including byte-identical trees after a refusal, the routes through a real HTTP server, and the client components (table, row menu, editor cancel/save/pending changes, conflict warning).

## License

MIT.
