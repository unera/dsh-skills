/**
 * Page dictionaries.
 *
 * English is the source text and the fallback; Russian is a complete second
 * dictionary — every key below exists in both, because a half-translated page is
 * worse than an English one. Error text is NOT here: the host answers with a
 * code and the mapping from code to words is part of these same tables, so a
 * refusal reads in the reader's language rather than in the server's English.
 */

/** Locale namespace this plugin owns. */
export const NS = 'dsh-skills';

/** Error codes the host can answer with, in the order the client maps them. */
export const ERROR_CODES = [
  'unrecognized-format',
  'name-mismatch',
  'not-found',
  'too-large',
  'write-failed',
  'bad-request',
];

/** English dictionary. */
export const en = {
  panel: 'Skills',
  heading: 'Skills',
  subtitle: 'Skills in {root}',
  count: '{count} skills',
  countOne: '1 skill',
  columnStatus: 'Status',
  columnName: 'Skill',
  columnPath: 'Path',
  columnActions: 'Actions',
  statusActive: 'Active',
  statusDisabled: 'Disabled',
  statusNote: 'Status is read-only in this version: rename SKILL.md to _SKILL.md on disk to disable a skill.',
  actionsFor: 'Actions for {name}',
  moreActions: 'More actions',
  downloadMd: 'Download SKILL.md',
  downloadZip: 'Download ZIP',
  upload: 'Upload',
  edit: 'Edit SKILL.md',
  emptyTitle: 'No skills installed',
  emptyBody: 'Add a directory containing SKILL.md to {root}, or upload a skill here.',
  loadFailed: 'Could not load the skills list.',
  retry: 'Retry',
  uploading: 'Uploading…',
  uploadTitle: 'Upload a skill',
  uploadCreated: 'Created skill {dir}.',
  uploadReplaced: 'Replaced skill {dir}.',
  uploadFailed: 'Upload rejected.',
  editorTitle: 'Editing {path}',
  editorCancel: 'Cancel',
  editorSave: 'Save',
  editorSaveTitle: 'Write the file and return to the list',
  editorUnchanged: 'No changes yet',
  editorPreview: 'Preview',
  editorPreviewEmpty: 'Nothing to preview yet.',
  editorChangedOnDisk: 'This file changed on disk since you opened it. Saving replaces those changes.',
  editorLoading: 'Loading the file…',
  editorOpenFailed: 'Could not open {dir}.',
  saveFailed: 'Could not save {dir}.',
  saveDone: 'Saved {path}.',
  discardChanges: 'Discard your changes?',
  errorUnrecognizedFormat: 'Unrecognized skill format',
  errorNameMismatch: 'The uploaded SKILL.md does not match an installed skill',
  errorNotFound: 'Skill not found',
  errorTooLarge: 'File too large',
  errorWriteFailed: 'Could not write the file',
  errorBadRequest: 'Bad request',
  errorUnknown: 'Something went wrong',
  errorNetwork: 'Could not reach the DSH host',
};

/** Russian dictionary: same keys as {@link en}, no placeholders left behind. */
export const ru = {
  panel: 'Скиллы',
  heading: 'Скиллы',
  subtitle: 'Скиллы в {root}',
  count: 'Скиллов: {count}',
  countOne: '1 скилл',
  columnStatus: 'Статус',
  columnName: 'Скилл',
  columnPath: 'Путь',
  columnActions: 'Действия',
  statusActive: 'Активен',
  statusDisabled: 'Отключён',
  statusNote: 'Статус в этой версии только для чтения: чтобы отключить скилл, переименуй SKILL.md в _SKILL.md на диске.',
  actionsFor: 'Действия для {name}',
  moreActions: 'Ещё действия',
  downloadMd: 'Скачать SKILL.md',
  downloadZip: 'Скачать ZIP',
  upload: 'Загрузить',
  edit: 'Редактировать SKILL.md',
  emptyTitle: 'Скиллов нет',
  emptyBody: 'Положи в {root} каталог с файлом SKILL.md или загрузи скилл здесь.',
  loadFailed: 'Не удалось получить список скиллов.',
  retry: 'Повторить',
  uploading: 'Загрузка…',
  uploadTitle: 'Загрузка скилла',
  uploadCreated: 'Скилл {dir} создан.',
  uploadReplaced: 'Скилл {dir} заменён.',
  uploadFailed: 'Загрузка отклонена.',
  editorTitle: 'Редактирование {path}',
  editorCancel: 'Отмена',
  editorSave: 'Сохранить',
  editorSaveTitle: 'Записать файл и вернуться к списку',
  editorUnchanged: 'Изменений нет',
  editorPreview: 'Предпросмотр',
  editorPreviewEmpty: 'Пока нечего показывать.',
  editorChangedOnDisk: 'Файл изменился на диске после открытия. Сохранение перезапишет эти изменения.',
  editorLoading: 'Читаю файл…',
  editorOpenFailed: 'Не удалось открыть {dir}.',
  saveFailed: 'Не удалось сохранить {dir}.',
  saveDone: 'Сохранено: {path}.',
  discardChanges: 'Отменить изменения?',
  errorUnrecognizedFormat: 'Нераспознаваемый формат скилла',
  errorNameMismatch: 'Загруженный SKILL.md не совпадает ни с одним установленным скиллом',
  errorNotFound: 'Скилл не найден',
  errorTooLarge: 'Файл слишком большой',
  errorWriteFailed: 'Не удалось записать файл',
  errorBadRequest: 'Некорректный запрос',
  errorUnknown: 'Что-то пошло не так',
  errorNetwork: 'Не удалось связаться с хостом DSH',
};

/** Dictionary key for a wire error code. */
const ERROR_KEYS = {
  'unrecognized-format': 'errorUnrecognizedFormat',
  'name-mismatch': 'errorNameMismatch',
  'not-found': 'errorNotFound',
  'too-large': 'errorTooLarge',
  'write-failed': 'errorWriteFailed',
  'bad-request': 'errorBadRequest',
  network: 'errorNetwork',
};

/**
 * Localize an error code through the page's translate seat.
 * @param t - translate function of this namespace.
 * @param code - wire code; unknown codes fall back to the generic sentence.
 * @returns the sentence to show.
 */
export function errorText(t, code) {
  const key = ERROR_KEYS[code] ?? 'errorUnknown';
  return t(key);
}
