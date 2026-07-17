---
skill_id: SK-13
name: Проверка результата задачи по критериям приёмки
version: 4.3.0
category: Task/Quality
type: instruction
---

# SK-13 — Проверка результата поручения

## Реализация в сборке 4.0.0

Штатное выполнение этого этапа реализовано детерминированным модулем `task-control-dashboard/runtime.py`. Этот skill сохраняет правила и контракт этапа для прозрачности и дальнейшего расширения.

## Назначение

Проверить предоставленный результат по каждому критерию, сохранить evidence
и принять результат, вернуть его на доработку либо передать на проверку
человеку.

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

- событие `RESULT_ADDED`;
- новый файл в `input/results/`;
- доступный demo-result;
- `Result_Inbox.status = New`;
- повторная проверка исправленной версии.

## Входы

- файл результата;
- `registry/03_task_register.xlsx` → `Tasks`, `Acceptance_Criteria`,
  `Task_Results`, `Task_History`;
- `registry/04_task_rules.xlsx` → `Acceptance_Rules`,
  `Notification_Rules`, `Demo_Settings`;
- `registry/05_message_outbox.xlsx` → `Outbox`, `Message_Templates`;
- `registry/06_task_event_queue.xlsx` → `Events`;
- `registry/08_skill_action_log.xlsx` → `Action_Log`, `SK_13_Log`;
- `registry/09_source_register.xlsx` → `Result_Inbox`.

## Статус критерия

- `Met`;
- `Partially_Met`;
- `Not_Met`;
- `Not_Verifiable`.

Для каждого критерия сохраняй конкретное evidence или объяснение, почему его
невозможно проверить. Наличие файла само по себе не является evidence.

## Вердикт

- `Accepted` — все обязательные критерии Met и достигнут порог;
- `Rework Required` — есть Partially Met или Not Met;
- `Human Review Required` — результат невозможно однозначно проверить.

## Алгоритм

1. Проверь Action Log и SK_13_Log.
2. Выбери новые результаты и рассчитай hash.
3. Исключи дубли результата.
4. Сопоставь файл с task_id и версией.
5. Создай строку `Task_Results`.
6. Переведи задачу `Result Submitted → Validating`.
7. Проверь каждый критерий и сохрани evidence.
8. Рассчитай acceptance score и вердикт.
9. Accepted → Draft `Result_Accepted`; при разрешённом правиле переведи
   `Accepted → Closed`.
10. Rework → увеличь iteration, назначь rework_due_date, создай Draft,
    событие `REWORK_REQUIRED` и верни задачу в работу.
11. Human Review → `Exception` и локальный Draft с причиной.
12. Обнови Result Inbox, Task History, события и оба журнала.

## Идемпотентность

- `Result|task_id|result_hash`;
- `CriterionReview|result_id|criterion_id`;
- `ResultVerdict|task_id|result_id|verdict`;
- `CloseTask|task_id|result_id`.

## Ошибки

- `BLOCKED_RESULT_READ`;
- `BLOCKED_TASK_NOT_FOUND`;
- `BLOCKED_ACCEPTANCE_CRITERIA`;
- `HUMAN_REVIEW_REQUIRED`;
- `BLOCKED_ACTION_LOG`.

## Результат

Проверенные результаты и критерии, evidence, Accepted, Rework Required,
Human Review Required, закрытые задачи, Draft-сообщения и записи журналов.
