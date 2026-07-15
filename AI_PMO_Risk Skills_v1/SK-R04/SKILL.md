---
skill_id: SK-R04
name: Агрегация риск-данных по проектам
version: 1.3.0
category: Риск-отчётность
type: instruction
---

# SK-R04 — Агрегация риск-данных по проектам

## Назначение

Формировать по каждому проекту агрегированную картину уровней активных рисков и состояния планов митигации.

## Когда применять

- после выполнения SK-R01, SK-R02 или SK-R03;
- изменился Risk register;
- событие `RISK_CREATED`, `RISK_UPDATED` или `MITIGATION_UPDATED`;
- пользователь запросил риск-дашборд;
- ежедневный контроль рисков.

## Входные данные

- `registry/01_projects.xlsx` → `Projects`;
- `registry/02_risk_register.xlsx` → `Risks`;
- `registry/03_risk_rules.xlsx` → `Aggregation_Rules`;
- `registry/05_risk_event_queue.xlsx` → `Events`;
- `registry/06_risk_control_state.xlsx` → `Skill_State`;
- `registry/07_skill_action_log.xlsx` → `Action_Log`, `SK_R04_Log`;
- `output/dashboards/05_risk_dashboard.xlsx` → `Project_Risk_Dashboard`.

## Правила агрегации рисков

В распределение по уровням включай риски со статусами:

- `Open`;
- `Monitoring`;
- `Accepted`.

Статусы `Mitigated` и `Closed` не включай в активные уровни, но учитывай в `total_registered_risks`.

Для каждого проекта посчитай:

- `low_risks`;
- `medium_risks`;
- `high_risks`;
- `critical_risks`;
- `total_active_risks`;
- `total_registered_risks`.

## Правила агрегации митигации

- `mitigation_future`:
  статус не `Completed` и не `Cancelled`, срок не раньше текущей даты;
- `mitigation_completed`:
  `mitigation_status = Completed`;
- `mitigation_overdue`:
  срок раньше текущей даты, статус не `Completed` и не `Cancelled`.

## Алгоритм

1. Проверь доступность листов `Action_Log` и `SK_R04_Log`.
2. Прочитай активные проекты.
3. Для каждого проекта рассчитай все показатели.
4. Проверь, что сумма уровней равна `total_active_risks`.
5. Обнови существующую строку проекта или добавь новую.
6. Заполни `data_as_of`.
7. Заполни `source_updated_at` — максимальное `updated_at` рисков проекта.
8. Не удаляй оформление, определения метрик и диаграммы.
9. Запиши результат по каждому проекту в оба журнала.

## Журналирование действий

### В `Action_Log`

Для каждого проекта добавь:

- `skill_id = SK-R04`;
- `action_type = Aggregate_Project_Risks`;
- `object_type = Project`;
- `object_id = project_id`;
- `before_value` — прежние показатели строки дашборда;
- `after_value` — рассчитанные показатели;
- `target_file = output/dashboards/05_risk_dashboard.xlsx`.

Если строка сохранена, добавь действие `Update_Dashboard`. Если показатели не изменились, используй `Skip_No_Change`.

### В `SK_R04_Log`

Заполни все агрегированные показатели, `source_updated_at`, признак `dashboard_row_updated`, action status и error code.

## Контроль качества

- каждый активный проект представлен одной строкой;
- отсутствующие риски отражаются нулями;
- завершённые митигации не попадают в просрочку;
- один план митигации учитывается только в одной категории;
- сумма уровней равна `total_active_risks`;
- дата актуальности заполнена;
- для каждого проекта создана запись журнала.

## Обработка ошибок

- недоступен журнал до начала обработки: `BLOCKED_ACTION_LOG`;

## Результат

- обновлённый `Project_Risk_Dashboard`;
- краткая управленческая сводка;
- число обновлённых и неизменившихся проектов;
- количество записей в журнале.
