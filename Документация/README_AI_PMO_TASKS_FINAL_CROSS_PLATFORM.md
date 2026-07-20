# AI PMO TASKS — Cross-Platform v4.3.0

Portable-сборка для Windows, macOS и Linux.

## Что копировать

### 1. Skills
Скопируйте содержимое:

`1_SKILLS_TO_OUROBOROS/data/skills/external/`

в:

`<Ouroboros>/data/skills/external/`

### 2. Workspace
Скопируйте папку:

`2_WORKSPACE_TO_DOCUMENTS/AI_PMO_TASKS`

в папку Documents текущего пользователя.

Итоговые типовые пути:

- Windows: `C:\Users\<user>\Documents\AI_PMO_TASKS`
- macOS: `/Users/<user>/Documents/AI_PMO_TASKS`
- Linux: `/home/<user>/Documents/AI_PMO_TASKS`

На macOS также распознаётся:

`~/Library/Mobile Documents/com~apple~CloudDocs/Documents/AI_PMO_TASKS`

Точный путь можно задать переменной окружения `AI_PMO_TASKS_ROOT`.

## Первый запуск

1. Полностью перезапустите Ouroboros.
2. Откройте Skills и нажмите Refresh.
3. Выполните Review для `task-control-dashboard`.
4. Выдайте permissions: `widget`, `route`, `companion_process`, `inject_chat`.
5. Включите skill и ещё раз перезапустите Ouroboros.
6. Откройте вкладку «Контроль поручений».

## macOS: доступ к Documents

При первом обращении macOS может запросить доступ к Documents. Разрешите доступ приложению/терминалу, из которого запущен Ouroboros.

Если доступ был отклонён:

`System Settings → Privacy & Security → Files and Folders`

либо при необходимости:

`System Settings → Privacy & Security → Full Disk Access`

Добавьте приложение или терминал, запускающий Ouroboros, затем перезапустите его.

## macOS: вариант с явным workspace

Если Documents защищена или находится в нестандартном месте, задайте:

```bash
export AI_PMO_TASKS_ROOT="$HOME/Documents/AI_PMO_TASKS"
```

Для постоянного значения добавьте строку в `~/.zshrc`, затем выполните:

```bash
source ~/.zshrc
```

## Проверка

1. Поместите `.txt`, `.md`, `.docx` или `.pdf` в `AI_PMO_TASKS/input/meetings`.
2. Нажмите «Полный контроль» или дождитесь watcher.
3. Проверьте вкладки «Поручения», «Действия», «Журнал».
4. Убедитесь, что watcher heartbeat свежий.

## Важно

- Для internal chat используется только `range_name: "a2a"`.
- `__pycache__` и `.pyc` в поставку не входят.
- Бизнес-логика одинакова на Windows и macOS.
- Реальная работа на macOS зависит также от того, поддерживает ли установленная версия Ouroboros companion-процессы и Host Service на macOS.
