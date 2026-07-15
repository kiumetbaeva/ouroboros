# AI_PMO_TASKS_MVP

Локальный автономный контур управления поручениями:

**протокол → извлечение → регистрация → контроль срока → проверка результата → закрытие или доработка**

Вся исполняемая логика находится в `SKILL.md` внутри каталога `external`.
Скрипты, сервисы и внешние интеграции не используются.

## Куда раскладывать пакет

Содержимое архива уже разделено на две правильные части:

```text
external/   — loop и четыре skills
documents/  — реестры, протоколы, результаты, архивы и дашборд
```

Скопируйте содержимое каталогов в одноимённые каталоги Ouroboros, сохраняя
структуру.

После установки должны существовать пути:

```text
<OUROBOROS_ROOT>/external/Loop-09-Task/SKILL.md
<OUROBOROS_ROOT>/external/SK-18/SKILL.md
<OUROBOROS_ROOT>/external/SK-12/SKILL.md
<OUROBOROS_ROOT>/external/SK-14/SKILL.md
<OUROBOROS_ROOT>/external/SK-13/SKILL.md

<OUROBOROS_ROOT>/documents/AI_PMO_TASKS_MVP/registry/
<OUROBOROS_ROOT>/documents/AI_PMO_TASKS_MVP/input/
<OUROBOROS_ROOT>/documents/AI_PMO_TASKS_MVP/output/
<OUROBOROS_ROOT>/documents/AI_PMO_TASKS_MVP/archive/
```

Не кладите Excel, протоколы или дашборд в `external`.
Не кладите `SKILL.md` в `documents`.

## Структура документов

```text
AI_PMO_TASKS_MVP/
├── README.md
├── registry/
│   ├── 01_projects.xlsx
│   ├── 02_people.xlsx
│   ├── 03_task_register.xlsx
│   ├── 04_task_rules.xlsx
│   ├── 05_message_outbox.xlsx
│   ├── 06_task_event_queue.xlsx
│   ├── 07_task_control_state.xlsx
│   ├── 08_skill_action_log.xlsx
│   └── 09_source_register.xlsx
├── input/
│   ├── meetings/       — новые протоколы
│   └── results/        — новые результаты поручений
├── demo/
│   └── results/        — результаты демонстрационного сценария
├── output/
│   ├── dashboards/     — Excel-дашборд
│   └── reports/        — сформированные отчёты
└── archive/
    ├── meetings/       — обработанные протоколы
    └── results/        — обработанные результаты
```

## Что делает каждый компонент

- `Loop-09-Task` — запускает и оркестрирует полный цикл;
- `SK-18` — извлекает поручения, решения и открытые вопросы;
- `SK-12` — регистрирует валидные поручения и критерии;
- `SK-14` — контролирует сроки и создаёт локальные Draft-эскалации;
- `SK-13` — проверяет результат по критериям и закрывает либо возвращает на
  доработку.

## Первая проверка

После перезагрузки external skills напишите:

`Проведи полный контроль поручений.`

Для первого demo-прохода в `input/meetings/` уже находится тестовый протокол.
Ожидаемый результат — три зарегистрированных поручения.

Проверь:

- `registry/03_task_register.xlsx` → Tasks и Acceptance_Criteria;
- `registry/05_message_outbox.xlsx` → локальные Draft-сообщения;
- `registry/07_task_control_state.xlsx` → Run_Log и Control_State;
- `registry/08_skill_action_log.xlsx` → Action_Log;
- `output/dashboards/10_task_dashboard.xlsx` → обновлённые показатели.

Повторный запуск не должен создавать копии задач.

## Автономный режим

Loop содержит scheduled task с интервалом две минуты. После его активации
новый протокол достаточно положить в `input/meetings/`, а результат — в
`input/results/`. Дополнительный запрос в чат не требуется.

## Переход из demo в рабочий локальный режим

В `registry/04_task_rules.xlsx` → `Demo_Settings` установите:

- `mode = operational_local`;
- `demo_mode = false`;
- `auto_seed_demo_events = false`;
- `virtual_days_per_run = 0`.

Остальные правила, SLA, напоминания, эскалации и автоматическое закрытие
настраиваются в том же workbook.
