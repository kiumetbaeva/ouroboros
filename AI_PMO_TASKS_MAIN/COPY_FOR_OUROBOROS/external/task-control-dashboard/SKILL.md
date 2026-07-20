---
name: task-control-dashboard
type: extension
version: 4.3.3
entry: plugin.py
description: >
  Виджет, локальный watcher и Excel-orchestrator
  для контроля поручений. Смысловое извлечение поручений и проверка
  результатов выполняются языковой моделью в новом изолированном контексте.
permissions:
  - widget
  - route
  - companion_process
  - inject_chat
companion_processes:
  - name: local_runtime_watcher
    runtime: python3
    command: ["python3", "scripts/watcher.py"]
    restart_policy: on_failure
    max_restarts: 20
ui_tab:
  label: Контроль поручений
  icon: widgets
  render:
    kind: module
    entry: widget.js
    span: 2
---

# Контроль поручений

Архитектура сборки:

- `scripts/watcher.py` локально проверяет появление новых файлов и границы
  трёхчасового расписания. Сам watcher языковую модель не вызывает без
  фактического триггера.
- `runtime.py` читает входные документы и Excel, создаёт для каждой смысловой
  операции новый internal chat, получает строгий JSON от языковой модели,
  валидирует его и только после этого записывает реестры.
- `plugin.py` кладёт команды кнопок в локальную очередь и обслуживает данные виджета.
- `widget.js` отображает состояние реестров.

Языковая модель выполняет:

- SK-18 — понимание протокола и выделение поручений;
- SK-12 — структурирование поручения и критериев приёмки;
- SK-13 — смысловую проверку результата;
- SK-14 — сроки рассчитываются локально, без лишнего LLM-вызова.

Каждый AI-вызов получает новый изолированный контекст. История предыдущих
прогонов не передаётся. Модель получает содержимое конкретного файла, а не
путь к workspace, поэтому не может уйти в `Deliverables\INPUT`.

Рабочая папка:

`<SYSTEM_DOCUMENTS>/AI_PMO_TASKS`

Триггеры:

1. Кнопка виджета → локальная JSON-очередь → companion-watcher.
2. Новый протокол или результат.
3. Плановый полный проход раз в 180 минут.

При недоступной модели контур завершается со статусом `Blocked`. Локальный
парсер не подменяет AI-анализ.


## Архитектура 4.3.0

Кнопки не вызывают Host Service из короткоживущего route-процесса.
Они атомарно создают JSON-команду в `input/commands`. Постоянный
companion-watcher забирает команду и выполняет LLM-вызов со штатными
`HOST_SERVICE_URL` и `HOST_SERVICE_TOKEN`.


## Поддерживаемые ОС

- Windows: системная Documents определяется через Known Folder API.
- macOS: `~/Documents/AI_PMO_TASKS`; также поддерживается iCloud Drive Documents.
- Linux: `~/Documents/AI_PMO_TASKS`.
- На любой ОС можно задать точный путь через `AI_PMO_TASKS_ROOT`.


## Heartbeat companion-процесса

Heartbeat обновляется отдельным фоновым потоком каждые 5 секунд.
Долгий AI-вызов больше не должен выглядеть как остановка watcher.
Состояния `processing_command`, `processing_files` и
`processing_schedule` отображаются в настройках виджета.
