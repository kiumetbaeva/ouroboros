---
skill_id: SK-12
name: Создание задач с критериями приёмки
version: 4.3.0
category: Task/Execution
type: instruction
---

# SK-12 — Регистрация поручения

## Реализация в сборке 4.0.0

Штатное выполнение этого этапа реализовано детерминированным модулем `task-control-dashboard/runtime.py`. Этот skill сохраняет правила и контракт этапа для прозрачности и дальнейшего расширения.

## Назначение

Проверить Ready-кандидата, исключить дубли и зарегистрировать локальное
поручение вместе с критериями приёмки.

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

- событие `TASK_CANDIDATE_READY`;
- `Extracted_Candidates.candidate_status = Ready`;
- запрос на регистрацию поручений.

## Входы

- `registry/01_projects.xlsx` → `Projects`;
- `registry/02_people.xlsx` → `People`;
- `registry/03_task_register.xlsx` → `Tasks`, `Acceptance_Criteria`,
  `Task_History`;
- `registry/04_task_rules.xlsx` → `Required_Fields`, `Allowed_Values`,
  `Extraction_Rules`;
- `registry/05_message_outbox.xlsx` → `Outbox`, `Message_Templates`;
- `registry/06_task_event_queue.xlsx` → `Events`;
- `registry/08_skill_action_log.xlsx` → `Action_Log`, `SK_12_Log`;
- `registry/09_source_register.xlsx` → `Extracted_Candidates`.

## Проверки

Кандидат должен быть Assignment/Ready, иметь активный проект и
ответственного, срок, ожидаемый результат, источник, минимум один критерий
и confidence не ниже правила. Точный дубль отсутствует.

## Идентификатор

`task_id = TASK-{meeting_date:YYYYMMDD}-{assignment_order:03d}`.

Тот же кандидат при повторной обработке получает тот же ID.

## Алгоритм

1. Проверь Action Log и SK_12_Log.
2. Выбери Ready-кандидаты.
3. Проверь поля и справочники.
4. Рассчитай task_id и fingerprints.
5. Exact duplicate → `Duplicate` и `Skip_Duplicate`.
6. Possible duplicate → `Exception`, автоматическое объединение запрещено.
7. Создай строку `Tasks` со статусом `Registered`.
8. Создай отдельные строки `Acceptance_Criteria`.
9. Добавь переход `None → Registered` в `Task_History`.
10. Обнови кандидата до `Registered` и заполни task_id.
11. Создай локальный Draft `Task_Assigned`.
12. Создай событие `TASK_REGISTERED`.
13. Запиши общий и специализированный журналы.

## Идемпотентность

- задача: `Task|source_id|assignment_order|assignee_id|due_date`;
- критерий: `Criterion|task_id|criterion_order|normalized_text`;
- сообщение: `Task_Assigned|task_id|iteration`.

## Ошибки

- `BLOCKED_REQUIRED_FIELDS`;
- `BLOCKED_ASSIGNEE`;
- `BLOCKED_PROJECT`;
- `POSSIBLE_DUPLICATE`;
- `BLOCKED_ACTION_LOG`.

## Результат

Проверенные кандидаты, созданные поручения и критерии, дубли, исключения,
Draft-сообщения, события и записи журналов.
