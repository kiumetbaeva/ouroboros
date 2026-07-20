---
skill_id: SK-14
name: Мониторинг сроков задач и напоминания
version: 4.3.0
category: Task/Control
type: instruction
---

# SK-14 — Контроль сроков и локальных эскалаций

## Реализация в сборке 4.0.0

Штатное выполнение этого этапа реализовано детерминированным модулем `task-control-dashboard/runtime.py`. Этот skill сохраняет правила и контракт этапа для прозрачности и дальнейшего расширения.

## Назначение

Определить состояние срока каждого незакрытого поручения, создать локальное
Draft-напоминание и повысить уровень эскалации по правилам.

## Рабочие данные

Используй `<SYSTEM_DOCUMENTS>/AI_PMO_TASKS` как корень.


## Обязательное разрешение рабочего корня

Для текущей установки рабочий корень:

`<SYSTEM_DOCUMENTS>\AI_PMO_TASKS`

При событийном запуске абсолютный рабочий корень передаётся в тексте
триггера. Используй переданное значение как источник истины.

Запрещено:

- использовать `<устаревший внешний путь>`;
- считать `<устаревший внешний путь>` корнем рабочих данных;
- искать входные файлы рекурсивно по всему репозиторию или домашней папке;
- подменять рабочий корень на основании текущего `active_workspace`.

Если переданный рабочий корень отсутствует, заверши запуск с
`BLOCKED_WORKSPACE_ROOT`, укажи ожидаемый путь и не выполняй поиск в других
каталогах.

## Когда применять

- каждый проход L-09;
- `TASK_REGISTERED`;
- `TASK_UPDATED`;
- `DEADLINE_CHECK`;
- `REWORK_REQUIRED`;
- изменение срока или статуса поручения.

## Входы

- `registry/02_people.xlsx` → `People`, `Escalation_Roles`;
- `registry/03_task_register.xlsx` → `Tasks`, `Task_History`;
- `registry/04_task_rules.xlsx` → `SLA_Rules`, `Notification_Rules`,
  `Escalation_Matrix`, `Demo_Settings`;
- `registry/05_message_outbox.xlsx` → `Outbox`, `Message_Templates`;
- `registry/07_task_control_state.xlsx` → `Control_State`;
- `registry/08_skill_action_log.xlsx` → `Action_Log`, `SK_14_Log`.

## Опорная дата

- demo: `Control_State.virtual_now`;
- operational: текущая дата `Europe/Moscow`.

## Классификация

- `On_Track` — до срока больше reminder window;
- `Due_Soon` — от 1 дня до окна включительно;
- `Due_Today` — срок сегодня;
- `Overdue` — срок прошёл;
- `Result_Submitted` — зарегистрирован новый результат;
- `Not_Applicable` — Closed или Cancelled.

## Эскалация

Уровень и адресат определяются только по `Escalation_Matrix` и
`Escalation_Roles`. Не создавай повторный незакрытый Draft с тем же ключом.

## Алгоритм

1. Проверь Action Log и SK_14_Log.
2. Выбери все незакрытые задачи.
3. Рассчитай `days_to_due` и `timing_state`.
4. Обнови `Tasks` и при изменении добавь `Task_History`.
5. Due Soon / Due Today → Draft `Due_Reminder`.
6. Overdue → рассчитай уровень и создай Draft `Task_Overdue` или эскалацию.
7. Обнови даты контакта и уровень эскалации.
8. Не закрывай поручение.
9. Запиши общий и специализированный журналы.

## Идемпотентность

- `Due_Reminder|task_id|due_date|timing_state|iteration`;
- `Task_Overdue|task_id|due_date|level|iteration`;
- `Escalation|task_id|level|iteration`.

## Ошибки

- `BLOCKED_DUE_DATE`;
- `BLOCKED_ESCALATION_ROUTE`;
- `BLOCKED_ACTION_LOG`.

Пустой email не блокирует локальный Draft: установи
`delivery_status = Local_Only`.

## Результат

Количество задач по состояниям, созданные напоминания и эскалации,
пропущенные дубли и записи журналов.
