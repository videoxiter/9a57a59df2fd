# Восстановление стенда: Сайт ОТП

- пустое состояние сгенерировано: **2026-11-23 12:28:21**
- рабочая папка: `G:\LMStudio\VSCode\Projects\Сайт ОТП`
- DSH home: `G:\LMStudio\dsh-home`
- версия DSH: `не определена`
- профиль: `G:\LMStudio\dsh-home\profiles\desktop`

Этот файл пишется автоматически (`tools/snapshot-state.py`). Правки руками не сохранятся:
для своих заметок используйте `next-steps.md` рядом — он не перезаписывается.

## 1. Что поставить и включить

Bundle-ы профиля (порядок важен):
- `@deepseek-ai/dsh-base`
- `@deepseek-ai/dsh-web-app`
- `@deepseek-ai/dsh-experimental-plugin-market-bundle`
- `@deepseek-ai/dsh-experimental-session-titles-bundle`
- `@deepseek-ai/dsh-experimental-badge-skill-bundle`
- `@deepseek-ai/dsh-experimental-auto-review`
- `@deepseek-ai/dsh-deepseek-chat-import`
- `@deepseek-ai/dsh-experimental-session-search`
- `@deepseek-ai/dsh-experimental-inspector-profile`
- `@deepseek-ai/dsh-experimental-ralph-bundle`
- `dotnet-skills`
- `@chtholly-fan/dsh-cpp-optimization`
- `dsh-ffmpeg`
- `dsh-univer-office`
- `@jonahwu/dsh-bg-carousel`
- `dsh-mermaid-plus`
- `dsh-sidebar-plantuml`
- `dsh-typst`
- `dsh-remotion`
- `dsh-image-gen`
- `dsh-python-env`
- `dsh-test-autofix`
- `dsh-selftest`
- `dsh-drawio-chat`
- `dsh-builtin-browser`
- `dsh-genui`
- `@goodandready/dsh-russian-lang`
- `dsh-pdf2md`
- `dsh-plugin-insight-charts`
- `dsh-laocai-editing`
- `dsh-skill-security-review`
- `dsh-papercut`
- `dsh-video-studio`
- `dsh-scan2md`
- `dsh-web-artifact-designer`
- `dsh-primer`
- `dsh-squares`

Локальные пакеты профиля (`link:` — живут в рабочей папке):
- `@chtholly-fan/dsh-cpp-optimization` → `1.1.0`
- `@goodandready/dsh-russian-lang` → `0.4.30`
- `@jonahwu/dsh-bg-carousel` → `0.3.0`
- `dotnet-skills` → `0.2.5`
- `dsh-builtin-browser` → `0.5.8`
- `dsh-drawio-chat` → `0.4.0`
- `dsh-ffmpeg` → `0.7.7`
- `dsh-genui` → `0.3.3`
- `dsh-image-gen` → `0.11.3`
- `dsh-laocai-editing` → `0.1.2`
- `dsh-mermaid-plus` → `0.6.1`
- `dsh-papercut` → `0.1.3`
- `dsh-pdf2md` → `0.1.2`
- `dsh-plugin-insight-charts` → `0.1.0`
- `dsh-primer` → `0.4.7`
- `dsh-python-env` → `0.1.2`
- `dsh-remotion` → `0.10.7`
- `dsh-scan2md` → `0.1.1`
- `dsh-selftest` → `0.3.4`
- `dsh-sidebar-plantuml` → `0.1.0`
- `dsh-skill-security-review` → `0.1.0`
- `dsh-squares` → `0.1.0`
- `dsh-stand` → `link:G:/LMStudio/dsh-workspace/Main/plugins/dsh-stand`
- `dsh-stand-themes` → `link:G:/LMStudio/dsh-workspace/Main/plugins/dsh-stand-themes`
- `dsh-test-autofix` → `0.1.3`
- `dsh-typst` → `0.1.0`
- `dsh-univer-office` → `0.4.0`
- `dsh-video-studio` → `0.4.3`
- `dsh-web-artifact-designer` → `1.0.0`

Вставки пользовательского патча (id / пакет):
- `stand` — `dsh-stand`
- `stand-themes` — `dsh-stand-themes`
- `mcp-brain` — `@deepseek-ai/dsh-mcp-client`

MCP-серверы:
- `brain` (stdio) — `C:\Python313\python.exe` G:\LMStudio\dsh-workspace\Main\memory\brain\server.py

Порядок восстановления:

1. Установить DSH той же версии, задать `DSH_HOME` = `G:\LMStudio\dsh-home`
   (`reg query HKCU\Environment /v DSH_HOME`; при пустом home после обновления — проверить переменную).
2. Скопировать `profile/package.json` и `profile/cordis.patch.yml` из этой папки в профиль
   `G:\LMStudio\dsh-home\profiles\desktop` (только Python/редактор без BOM).
3. Восстановить локальные плагины из `<workspace>/plugins/*` и junction'ы в `<profile>/node_modules`.
4. Включить перечисленные bundle-ы (`plugin_manager set_bundle`, либо UI → Plugins).
5. Секреты: `.secrets/hermes.env` + `.secrets/registry.yaml` вернуть на место, значения — в credentials
   (`secrets_import` в dsh-stand). Значения в этот файл не попадают принципиально.
6. Память: `G:\LMStudio\dsh-home\memory\brain.db` — вернуть; переиндексация `memory/brain/reindex.py`.
7. Скиллы: `<workspace>/.dsh/skills` — **плоская** структура (`<name>/SKILL.md` на верхнем уровне);
   вложенные `category/name/SKILL.md` DSH rc.3 не видит.
8. Гейт: `python tools\profile-check.py` → PASS, затем запуск приложения.

## 2. Плагины и патч профиля

- строк в патче: **32** (принудительно включено 22, выключено 1)
- выключены патчем: `bash-sandbox`
- включены патчем: `agent-instructions`, `command-compact`, `command-goal`, `compaction-basic`, `fs-observation-policy`, `plan-mode`, `skill-filesystem`, `tool-fs`, `tool-fs-search`, `tool-goal`, `tool-jobs`, `tool-plugin-manager`, `tool-pwsh`, `tool-result-pruner`, `tool-skill`, `tool-subagent`, `tool-subagent-control`, `tool-subagent-fork`, `tool-todo`, `tool-web`, `tool-workflow`, `workflow-ptc`
- живые состояния (`plugin_manager list_plugins`) в файл не попадают — их видно в самом приложении.

## 3. Скиллы

- всего видимых скиллов: **148**
- `user-agents`: 148
- подробный список: `skills.md` рядом

## 4. Сессии и история

- сессий в рабочей папке: **4**
- последняя: `session-0a838f9f-ff7f-4f8e-8566-398f9c1fadc7` «Проанализируй проект.», 12 ходов, обновлена 2026-11-23 12:28
- её последний запрос: «1. Сама кнопка жёлтой не становилась на сколько-т…»
- таблица всех сессий: `sessions.md` рядом
- сырые логи сессий скопированы в `session-logs/` (скопировано 1, без изменений 3)
  — при восстановлении вернуть их в `$DSH_HOME/sessions/<кодированный cwd>/<session id>/` (путь сохранён в `snapshot.json` → `sessions[].logDir`).
- старые Markdown-логи (до rc.3): `history/sessions-20261117`, поиск — `python tools/history_search.py "..."`

## 5. Секреты (только имена)

- refs в реестре: 0, переменных в hermes.env: 0
- реестр: `None`
- хранилище кредов: `G:\LMStudio\dsh-home\.credentials.yaml`

## 6. Память

- `G:\LMStudio\dsh-home\memory\brain.db` — 267.7 МБ
- чанки: decisions=86, notes=2, projects=1983, sessions=1561, skills=22179

## 7. Бэкапы и продолжение


### Продолжить отсюда

_Заполните `.dsh/state/next-steps.md` — он не перезаписывается снимком._

---

## Что происходило последним (авто)

| сессия | тема | ходов | обновлена | последний запрос |
|---|---|---|---|---|
| session-0a838f9f-ff7f-4f8e-8566-398f9c1fadc7 | Проанализируй проект. | 12 | 2026-11-23 12:28 | 1. Сама кнопка жёлтой не становилась на сколько-т… |
| session-f8579263-6d67-46bb-81f7-8f3414c6c933 | Анализ проекта | 1 | 2026-11-20 12:10 | Проанализируй проект |
| session-6d520141-21c9-4bfe-99ed-cd2040563597 | Анализ проекта | 1 | 2026-11-20 00:23 | Проанализируй проект. |
| session-1fbd45a7-5c9b-467a-8e0b-eef3ef42dbea | Проанализируй проект. | 12 | 2026-11-19 16:37 | Что я просил сделать? |
