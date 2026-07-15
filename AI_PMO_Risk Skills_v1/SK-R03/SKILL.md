---
skill_id: SK-R03
name: Контроль сроков планов митигации
version: 1.3.0
category: Управление рисками
type: instruction
---

# SK-R03 — Контроль сроков планов митигации

## Назначение

Контролировать сроки выполнения планов митигации и своевременно формировать владельцам митигации черновики напоминаний или уведомлений о просрочке.

## Когда применять

- ежедневный контроль;
- изменился срок или статус митигации;
- событие `MITIGATION_UPDATED` или `RISK_UPDATED`;
- пользователь запросил проверку сроков митигации.

## Входные данные

- `registry/02_risk_register.xlsx` → `Risks`;
- `registry/03_risk_rules.xlsx` → `Notification_Rules`, `Aggregation_Rules`;
- `registry/04_message_outbox.xlsx` → `Outbox`, `Email_Templates`;
- `registry/05_risk_event_queue.xlsx` → `Events`;
- `registry/06_risk_control_state.xlsx` → `Skill_State`;
- `registry/07_skill_action_log.xlsx` → `Action_Log`, `SK_R03_Log`.

## Классификация срока

Для митигации со статусом, отличным от `Completed` и `Cancelled`:

- `Future`: срок больше текущей даты более чем на 3 дня;
- `Due_3_Days`: до срока осталось от 0 до 3 календарных дней включительно;
- `Overdue`: срок меньше текущей даты;
- `Completed`: `mitigation_status = Completed`.

## Алгоритм

1. Проверь доступность листов `Action_Log` и `SK_R03_Log`.
2. Выбери риски с заполненным планом митигации.
3. Рассчитай `days_to_mitigation_due`.
4. Обнови `mitigation_timing`.
5. Если `Due_3_Days`, создай Draft-напоминание.
6. Если `Overdue`, создай Draft-уведомление о просрочке.
7. Для `Future` и `Completed` письмо не создавай.
8. Получатель — `mitigation_owner_email`. Если поле пусто, зафиксируй ошибку и не создавай письмо.
9. Закрой обработанное событие.
10. Запиши результат по каждому плану в оба журнала.

## Напоминание

- тип: `Mitigation_Reminder`;
- тема: `Напоминание о сроке митигации риска {risk_id}`;
- факты: риск, мероприятие, срок, оставшиеся дни;
- действие: завершить митигацию или обновить статус;
- статус: `Draft`.

## Просрочка

- тип: `Mitigation_Overdue`;
- тема: `Просрочен план митигации риска {risk_id}`;
- факты: риск, мероприятие, срок, количество дней просрочки;
- действие: выполнить план или предоставить новый срок и обоснование;
- статус: `Draft`.

## Журналирование действий

### В `Action_Log`

Для каждого плана добавь строку:

- `skill_id = SK-R03`;
- `action_type = Classify_Mitigation_Timing`;
- `before_value` — прежние days/timing;
- `after_value` — новые days/timing;
- `details` — статус митигации и решение о письме.

Если создан Draft, добавь отдельную строку:

- `Create_Reminder_Draft` или `Create_Overdue_Draft`;
- `target_file = registry/04_message_outbox.xlsx`;
- `after_value = message_id`.

Если письмо не создано из-за дублирования, добавь `Skip_Duplicate`.

### В `SK_R03_Log`

Заполни владельца, email, срок, статус, дни до срока, timing, тип уведомления, `draft_message_id`, `deduplicated`, idempotency key и action status.

## Идемпотентность

- напоминание:
  `Mitigation_Reminder|risk_id|mitigation_due_date`;
- просрочка:
  `Mitigation_Overdue|risk_id|mitigation_due_date`.

Не создавай повторный незакрытый Draft с тем же ключом. Пропуск обязательно журналируй.

## Обработка ошибок

- недоступен журнал до начала обработки: `BLOCKED_ACTION_LOG`;

## Результат

- будущие планы;
- планы со сроком в ближайшие 3 дня;
- просроченные планы;
- выполненные планы;
- созданные Draft-уведомления;
- записи без адреса владельца митигации;
- количество записей в журнале.
