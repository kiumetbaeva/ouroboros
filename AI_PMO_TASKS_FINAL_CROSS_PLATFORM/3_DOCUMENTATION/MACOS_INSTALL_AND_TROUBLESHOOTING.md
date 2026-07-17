# macOS — установка и диагностика

## Установка

1. Скопируйте skills в `<Ouroboros>/data/skills/external/`.
2. Скопируйте `AI_PMO_TASKS` в `~/Documents/`.
3. Перезапустите Ouroboros.
4. Refresh → Review → permissions → Enable.
5. Перезапустите Ouroboros ещё раз.

## Права macOS

Разрешите доступ к Documents процессу, который запускает Ouroboros. Если Ouroboros запускается из Terminal/iTerm, доступ нужен этому приложению.

## Проверка Python

```bash
python3 --version
```

Manifest companion использует `python3`.

## Явное указание workspace

```bash
export AI_PMO_TASKS_ROOT="$HOME/Documents/AI_PMO_TASKS"
```

## Проверка структуры

```bash
ls -la "$HOME/Documents/AI_PMO_TASKS"
ls -la "$HOME/Documents/AI_PMO_TASKS/registry"
```

## Если watcher не работает

- Проверьте permission `companion_process`.
- Полностью закройте Ouroboros.
- Проверьте, что старый процесс не остался запущен.
- Повторите Review после замены файлов.
- Посмотрите вкладку «Журнал».

## Если Host Service возвращает 400

В `runtime.py` запрос `/chat/allocate-internal` должен передавать:

```json
{"range_name":"a2a"}
```

## Если macOS блокирует Documents

Используйте другой путь и `AI_PMO_TASKS_ROOT`, например:

```bash
mkdir -p "$HOME/AI_PMO_TASKS"
export AI_PMO_TASKS_ROOT="$HOME/AI_PMO_TASKS"
```

Скопируйте содержимое workspace в эту папку.
