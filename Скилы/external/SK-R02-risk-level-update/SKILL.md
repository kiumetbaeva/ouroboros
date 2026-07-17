---
skill_id: SK-R02
name: Расчёт и обновление уровня риска
version: 1.3.0
category: Управление рисками
type: instruction
---

# SK-R02 — Расчёт и обновление уровня риска

## Назначение

Пересчитывать уровень риска при изменении вероятности или влияния и поддерживать единообразную классификацию рисков по утверждённой матрице.

## Когда применять

- `updated_at` позже `level_calculated_at`;
- изменились `probability` или `impact`;
- `risk_score` не равен `probability × impact`;
- `risk_level` не соответствует матрице;
- событие `RISK_CREATED` или `RISK_UPDATED`;
- пользователь запросил пересчёт уровней.

## Входные данные

- `registry/02_risk_register.xlsx` → `Risks`;
- `registry/03_risk_rules.xlsx` → `Risk_Matrix`;
- `registry/05_risk_event_queue.xlsx` → `Events`;
- `registry/06_risk_control_state.xlsx` → `Skill_State`;
- `registry/07_skill_action_log.xlsx` → `Action_Log`, `SK_R02_Log`.

## Матрица по умолчанию

| Балл | Уровень |
|---:|---|
| 1–4 | Low |
| 5–9 | Medium |
| 10–16 | High |
| 17–25 | Critical |

Фактический источник — лист `Risk_Matrix`.

## Алгоритм

1. Проверь доступность листов `Action_Log` и `SK_R02_Log`.
2. Выбери риски, требующие пересчёта.
3. Проверь, что `probability` и `impact` находятся в диапазоне 1–5.
4. Рассчитай `risk_score = probability × impact`.
5. Найди уровень и `rule_id` в `Risk_Matrix`.
6. До обновления сохрани текущий `risk_level` в `previous_risk_level`.
7. Обнови:
   - `risk_score`;
   - `risk_level`;
   - `level_calculated_at`;
   - `level_changed`.
8. `level_changed = Yes`, если новый уровень отличается от предыдущего, иначе `No`.
9. Не меняй вероятность и влияние.
10. Закрой соответствующее событие после успешного обновления.
11. Запиши результат по каждому риску в оба журнала.

## Журналирование действий

### В `Action_Log`

Для каждого риска добавь строку:

- `skill_id = SK-R02`;
- `action_type = Recalculate_Risk_Level`;
- `before_value` — предыдущий score и level;
- `after_value` — новый score и level;
- `rule_id` — правило Risk_Matrix;
- `action_status = Success`, `Skipped` или `Blocked`.

Если расчёт выполнен, но значения не изменились, запиши `Skip_No_Change`.

### В `SK_R02_Log`

Заполни probability, impact, score до и после, level до и после, `level_changed`, `matrix_rule_id`, `updated_at` и `level_calculated_at`.

## Обработка ошибок

- некорректная вероятность или влияние: `BLOCKED_INVALID_RATING`;
- нет подходящего правила матрицы: `BLOCKED_RISK_MATRIX`;
- недоступен журнал: `BLOCKED_ACTION_LOG`;
- риск с ошибкой не обновляй;
- ошибку обязательно отрази в `Action_Log`, если журнал доступен.

## Результат

- количество пересчитанных рисков;
- список рисков с изменившимся уровнем;
- старый и новый уровень;
- количество пропущенных и заблокированных записей;
- количество записей в журнале.
