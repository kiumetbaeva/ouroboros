---
skill_id: SK-R01
name: Проверка регистрации нового риска
version: 1.3.0
category: Управление рисками
type: instruction
---

# SK-R01 — Проверка регистрации нового риска

## Назначение

Проверять новые записи реестра рисков на полноту, корректность и непротиворечивость. При выявлении отклонений формировать владельцу риска черновик письма со сроком устранения три календарных дня.

## Когда применять

- `registration_status = New`;
- `registration_checked_at` не заполнено;
- событие `RISK_CREATED`;
- пользователь запросил проверку новых рисков.

## Входные данные

- `registry/01_projects.xlsx` → `Projects`;
- `registry/02_risk_register.xlsx` → `Risks`;
- `registry/03_risk_rules.xlsx` → `Required_Fields`, `Allowed_Values`;
- `registry/04_message_outbox.xlsx` → `Outbox`, `Email_Templates`;
- `registry/05_risk_event_queue.xlsx` → `Events`;
- `registry/06_risk_control_state.xlsx` → `Skill_State`;
- `registry/07_skill_action_log.xlsx` → `Action_Log`, `SK_R01_Log`.

## Правила определения нового риска

Риск считается новым, если выполняется хотя бы одно условие:

1. `registration_status = New`;
2. `registration_checked_at` пусто;
3. существует необработанное событие `RISK_CREATED`;
4. `identified_at` позже последнего успешного запуска SK-R01.

## Проверка обязательных полей

Для всех рисков обязательны:

- `risk_id`;
- `project_id`;
- `risk_title`;
- `risk_description`;
- `category`;
- `status`;
- `probability`;
- `impact`;
- `risk_owner`;
- `owner_email`;
- `identified_at`;
- `updated_at`.

Для статусов `Open` и `Monitoring` дополнительно обязательны:

- `mitigation_action`;
- `mitigation_owner`;
- `mitigation_owner_email`;
- `mitigation_due_date`;
- `mitigation_status`.

Для статусов `Mitigated` и `Closed` дополнительно обязательны:

- `mitigation_status = Completed`;
- `mitigation_completed_at`.

## Валидации

1. `risk_id` уникален.
2. `project_id` существует в `01_projects.xlsx`.
3. `probability` и `impact` — целые числа от 1 до 5.
4. Email содержит `@` и не пуст.
5. `identified_at` не позже `updated_at`.
6. `mitigation_due_date` не раньше `identified_at`.
7. Статусы и категории входят в `Allowed_Values`.
8. Для завершённой митигации заполнена дата выполнения.

## Алгоритм

1. Проверь доступность листов `Action_Log` и `SK_R01_Log`. При недоступности остановись до изменения Risk register.
2. Выбери новые риски.
3. Проверь каждое обязательное поле и бизнес-правило.
4. Если ошибок нет:
   - установи `registration_status = Validated`;
   - заполни `registration_checked_at`;
   - очисти `registration_errors`.
5. Если ошибки есть:
   - установи `registration_status = Deviation`;
   - перечисли ошибки в `registration_errors`;
   - заполни `registration_checked_at`;
   - создай Draft в `04_message_outbox.xlsx`;
   - установи срок исправления: дата проверки + 3 календарных дня.
6. Закрой обработанное событие `RISK_CREATED`.
7. Запиши результат по каждому риску в оба журнала.

## Черновик письма

- тип: `Registration_Deviation`;
- получатель: `risk_owner` и `owner_email`;
- тема: `Отклонения при регистрации риска {risk_id}`;
- факты: полный перечень нарушенных правил;
- действие: исправить запись риска;
- срок: дата проверки + 3 календарных дня;
- статус: `Draft`;
- `idempotency_key`:
  `Registration_Deviation|risk_id|registration_checked_at`.

## Журналирование действий

Для каждого проверенного риска добавь:

### В `Action_Log`

- `skill_id = SK-R01`;
- `action_type = Validate_Registration`;
- `object_type = Risk`;
- `object_id = risk_id`;
- `action_status`;
- `before_value` — исходный `registration_status`;
- `after_value` — итоговый `registration_status`;
- `details` — результат проверки и число ошибок;
- `target_file = registry/02_risk_register.xlsx`;
- при создании Draft добавь отдельную строку `action_type = Create_Draft`.

### В `SK_R01_Log`

Заполни статус до и после проверки, `validation_result`, полный перечень ошибок, `draft_message_id`, срок исправления и idempotency key.

При пропуске из-за существующего Draft запиши `Skip_Duplicate`. При ошибке запиши `Blocked` или `Failed`.

## Идемпотентность

Не создавай новый Draft, если в Outbox уже есть незакрытая запись с тем же `idempotency_key`. Запись о пропуске всё равно добавь в журнал.

## Обработка ошибок

- недоступен журнал до начала обработки: `BLOCKED_ACTION_LOG`;

## Результат

- количество проверенных новых рисков;
- количество валидных записей;
- количество записей с отклонениями;
- список созданных Draft-писем;
- изменённые строки Risk register;
- количество записей в журнале.
