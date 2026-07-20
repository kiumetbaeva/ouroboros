(function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];
    });
  }

  function showBoot() {
    if (!document.body || document.getElementById("tc-boot")) return;
    var node = document.createElement("div");
    node.id = "tc-boot";
    node.style.cssText =
      "min-height:260px;padding:18px;background:#071421;color:#cbd5e1;" +
      "font:14px/1.5 system-ui";
    node.innerHTML =
      "<strong style='color:#fff'>Контроль поручений</strong>" +
      "<div style='margin-top:8px'>Загрузка данных…</div>";
    document.body.appendChild(node);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showBoot);
  } else {
    showBoot();
  }

  class TaskControlWidget {
    constructor(container, fetchBridge) {
      window.__taskControlWidgetStarted = true;
      this.container = container && container.nodeType ? container : document.body;
      this.fetch = typeof fetchBridge === "function" ? fetchBridge : window.fetch.bind(window);
      this.data = null;
      this.activeTab = "overview";
      this.pollTimer = null;
      this.fastPollTimer = null;
      this.fastPollStopTimer = null;
      this.clockTimer = null;
      this.toastTimer = null;
      this.loading = false;
      this.lastRevision = null;
    }

    async init() {
      try {
        this.mountStyles();
        this.container.innerHTML = this.shell();
        this.bind();
        await this.load(false);
        this.pollTimer = window.setInterval(() => this.load(true), 10000);
        this.clockTimer = window.setInterval(() => this.updateCountdown(), 1000);
      } catch (error) {
        this.renderFatal(error);
      }
    }

    destroy() {
      window.clearInterval(this.pollTimer);
      window.clearInterval(this.fastPollTimer);
      window.clearTimeout(this.fastPollStopTimer);
      window.clearInterval(this.clockTimer);
      window.clearTimeout(this.toastTimer);
    }

    mountStyles() {
      if (document.getElementById("tc-compact-styles")) return;
      var style = document.createElement("style");
      style.id = "tc-compact-styles";
      style.textContent = `
        :root {
          color-scheme: dark;
          --bg:#071421;
          --panel:#0b1a2a;
          --panel2:#102238;
          --line:rgba(148,163,184,.16);
          --text:#f8fafc;
          --muted:#94a3b8;
          --blue:#60a5fa;
          --green:#4ade80;
          --amber:#f59e0b;
          --red:#fb7185;
          --violet:#a78bfa;
        }
        *{box-sizing:border-box}
        html,body{margin:0;min-height:100%;background:var(--bg)}
        button{font:inherit}
        .app{
          min-height:100%;
          padding:12px;
          color:var(--text);
          background:
            radial-gradient(circle at 12% 0%,rgba(59,130,246,.10),transparent 30%),
            radial-gradient(circle at 88% 0%,rgba(139,92,246,.08),transparent 28%),
            var(--bg);
          font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
        }
        .top{
          position:sticky;top:0;z-index:20;
          padding:10px 10px 8px;
          margin:-12px -12px 10px;
          background:rgba(7,20,33,.96);
          border-bottom:1px solid var(--line);
          backdrop-filter:blur(10px);
        }
        .headline{display:flex;align-items:center;gap:10px;min-width:0}
        .logo{
          flex:0 0 40px;width:40px;height:40px;border-radius:13px;
          display:grid;place-items:center;font-size:22px;
          background:linear-gradient(135deg,#2563eb,#7c3aed);
          box-shadow:0 10px 28px rgba(37,99,235,.25)
        }
        .titlebox{min-width:0;flex:1}
        .title{font-size:17px;font-weight:800;line-height:1.15}
        .sub{margin-top:3px;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .status{
          display:inline-flex;align-items:center;gap:6px;
          margin-top:5px;padding:3px 8px;border-radius:999px;
          color:var(--green);background:rgba(74,222,128,.10);font-size:10px
        }
        .status.attn{color:var(--amber);background:rgba(245,158,11,.12)}
        .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
        .refresh{
          width:34px;height:34px;border-radius:10px;border:1px solid var(--line);
          background:var(--panel);color:#dbeafe;cursor:pointer
        }
        .meta{
          display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px
        }
        .meta-card{
          padding:8px 10px;border:1px solid var(--line);border-radius:10px;
          background:rgba(11,26,42,.86)
        }
        .meta-label{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
        .meta-value{margin-top:3px;font-size:12px;font-weight:700}
        .tabs{
          display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:10px;
          scrollbar-width:none
        }
        .tabs::-webkit-scrollbar{display:none}
        .tab{
          flex:0 0 auto;padding:7px 10px;border-radius:9px;border:1px solid var(--line);
          background:var(--panel);color:#cbd5e1;font-size:11px;cursor:pointer
        }
        .tab.active{background:linear-gradient(90deg,rgba(37,99,235,.28),rgba(109,40,217,.25));color:#fff;border-color:rgba(96,165,250,.35)}
        .section{display:none}
        .section.active{display:block}
        .kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:10px}
        .kpi{
          min-width:0;padding:10px;border-radius:11px;border:1px solid var(--line);
          background:linear-gradient(180deg,var(--panel),#081725)
        }
        .kpi-top{display:flex;align-items:center;justify-content:space-between;gap:6px}
        .kpi-icon{font-size:13px}
        .kpi-value{font-size:21px;line-height:1;font-weight:800}
        .kpi-label{margin-top:7px;font-size:10px;line-height:1.25;color:#dbe5f2}
        .blue{color:var(--blue)}.green{color:var(--green)}.amber{color:var(--amber)}
        .red{color:var(--red)}.violet{color:var(--violet)}
        .panel{
          padding:11px;border-radius:12px;border:1px solid var(--line);
          background:linear-gradient(180deg,rgba(13,28,46,.98),rgba(8,20,34,.98));
          margin-bottom:9px
        }
        .panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
        .panel-title{font-size:12px;font-weight:800}
        .linkbtn{border:0;background:none;color:var(--blue);font-size:10px;cursor:pointer}
        .steps{display:flex;flex-direction:column;gap:6px}
        .step{
          display:grid;grid-template-columns:26px minmax(0,1fr) auto;
          gap:8px;align-items:center;padding:7px;border-radius:9px;background:rgba(7,20,33,.55)
        }
        .step-icon{
          width:26px;height:26px;border-radius:8px;display:grid;place-items:center;
          background:rgba(59,130,246,.14);color:var(--blue);font-size:12px
        }
        .step-name{font-size:11px;font-weight:700}
        .step-result{margin-top:2px;color:var(--muted);font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .badge{
          display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;
          font-size:9px;white-space:nowrap
        }
        .badge.green{background:rgba(74,222,128,.10)}
        .badge.amber{background:rgba(245,158,11,.12)}
        .badge.red{background:rgba(251,113,133,.12)}
        .badge.violet{background:rgba(167,139,250,.12)}
        .badge.blue{background:rgba(96,165,250,.12)}
        .task-list{display:flex;flex-direction:column;gap:6px}
        .task{
          padding:9px;border:1px solid var(--line);border-radius:10px;background:rgba(7,20,33,.55)
        }
        .task-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
        .task-title{font-size:11px;font-weight:700;line-height:1.3}
        .task-id{margin-top:3px;color:var(--blue);font-size:9px}
        .task-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:7px;color:var(--muted);font-size:9px}
        .actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}
        .action{
          min-height:48px;padding:9px 10px;border-radius:10px;border:1px solid var(--line);
          background:var(--panel2);color:var(--text);cursor:pointer;text-align:left;
          display:flex;gap:8px;align-items:center;font-size:10px;line-height:1.25
        }
        .action.primary{grid-column:1/-1;background:linear-gradient(90deg,#2563eb,#6d28d9);border-color:transparent;font-weight:800}
        .action:disabled{opacity:.55;cursor:wait}
        .event{display:grid;grid-template-columns:8px 36px minmax(0,1fr);gap:6px;padding:6px 0;border-bottom:1px solid rgba(148,163,184,.08)}
        .event:last-child{border-bottom:0}
        .event-dot{width:7px;height:7px;border-radius:50%;margin-top:3px;background:var(--green)}
        .event-dot.warning{background:var(--amber)}.event-dot.danger{background:var(--red)}
        .event-time{font-size:9px;color:var(--muted)}
        .event-title{font-size:10px;font-weight:700}
        .event-detail{margin-top:2px;font-size:9px;color:var(--muted);line-height:1.35}
        .empty{
          padding:18px 12px;text-align:center;color:var(--muted);font-size:10px;line-height:1.5
        }
        .empty strong{display:block;color:#fff;font-size:12px;margin-bottom:5px}
        .path{
          padding:9px;border-radius:9px;border:1px solid var(--line);
          background:#06101b;color:#9fb4c9;word-break:break-all;font:9px/1.45 ui-monospace,monospace
        }
        .hint{margin-top:6px;color:var(--muted);font-size:9px;line-height:1.4}
        .error{
          padding:9px;border-radius:9px;background:rgba(251,113,133,.08);
          border:1px solid rgba(251,113,133,.25);color:#fecdd3;font-size:10px;line-height:1.45
        }
        .toast{
          position:fixed;left:12px;right:12px;bottom:12px;z-index:100;
          padding:10px 12px;border-radius:10px;border:1px solid rgba(74,222,128,.35);
          background:#102238;color:#fff;font-size:10px;line-height:1.35;
          box-shadow:0 18px 45px rgba(0,0,0,.38);
          opacity:0;transform:translateY(8px);pointer-events:none;transition:.2s
        }
        .toast.show{opacity:1;transform:translateY(0)}
        .toast.error{border-color:rgba(251,113,133,.45)}
        @media (max-width:420px){
          .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
          .actions{grid-template-columns:1fr}
          .action.primary{grid-column:auto}
          .meta{grid-template-columns:1fr}
        }
      `;
      document.head.appendChild(style);
    }

    shell() {
      return `
        <div class="app">
          <div class="top">
            <div class="headline">
              <div class="logo">✓</div>
              <div class="titlebox">
                <div class="title">Контроль поручений</div>
                <div class="sub">Протоколы → поручения → сроки → результаты</div>
                <div class="status" data-health-wrap><span class="dot"></span><span data-health>Загрузка…</span></div>
              </div>
              <button class="refresh" type="button" data-refresh title="Обновить">↻</button>
            </div>
            <div class="meta">
              <div class="meta-card">
                <div class="meta-label">Последнее обновление</div>
                <div class="meta-value" data-updated>—</div>
              </div>
              <div class="meta-card">
                <div class="meta-label">Следующий плановый контроль</div>
                <div class="meta-value" data-countdown>—</div>
              </div>
            </div>
          </div>

          <div class="tabs">
            ${this.tabButton("overview","Обзор",true)}
            ${this.tabButton("tasks","Поручения")}
            ${this.tabButton("actions","Действия")}
            ${this.tabButton("activity","Журнал")}
            ${this.tabButton("settings","Настройки")}
          </div>

          <section class="section active" data-section="overview">
            <div class="kpis" data-kpis></div>
            <div class="panel">
              <div class="panel-head">
                <div class="panel-title">Состояние обработки</div>
                <button class="linkbtn" type="button" data-tab-target="activity">Журнал</button>
              </div>
              <div class="steps" data-stages></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div class="panel-title">Последние поручения</div>
                <button class="linkbtn" type="button" data-tab-target="tasks">Открыть все</button>
              </div>
              <div data-recent-tasks></div>
            </div>
          </section>

          <section class="section" data-section="tasks">
            <div class="panel">
              <div class="panel-title">Поручения</div>
              <div style="height:8px"></div>
              <div data-all-tasks></div>
            </div>
          </section>

          <section class="section" data-section="actions">
            <div class="panel">
              <div class="panel-title">Запуск обработки</div>
              <div style="height:8px"></div>
              <div class="actions">
                ${this.actionButton("run_full_control","▶","Запустить полный контроль",true)}
                ${this.actionButton("process_meetings","▤","Обработать протоколы")}
                ${this.actionButton("check_deadlines","◷","Проверить сроки")}
                ${this.actionButton("check_results","✓","Проверить результаты")}
              </div>
            </div>
            <div class="panel" data-queue-panel></div>
          </section>

          <section class="section" data-section="activity">
            <div class="panel">
              <div class="panel-title">Последняя активность</div>
              <div style="height:6px"></div>
              <div data-activity></div>
            </div>
            <div data-errors></div>
          </section>

          <section class="section" data-section="settings">
            <div data-settings></div>
          </section>

          <div class="toast" data-toast></div>
        </div>
      `;
    }

    tabButton(id, label, active) {
      return `<button class="tab ${active ? "active" : ""}" type="button" data-tab="${id}">${label}</button>`;
    }

    actionButton(action, icon, label, primary) {
      return `<button class="action ${primary ? "primary" : ""}" type="button" data-action="${action}">
        <span>${icon}</span><span>${label}</span>
      </button>`;
    }

    bind() {
      this.container.addEventListener("click", async (event) => {
        var tab = event.target.closest("[data-tab],[data-tab-target]");
        if (tab) {
          this.switchTab(tab.dataset.tab || tab.dataset.tabTarget);
          return;
        }
        var action = event.target.closest("[data-action]");
        if (action) {
          await this.executeAction(action.dataset.action, action);
          return;
        }
        if (event.target.closest("[data-refresh]")) {
          await this.load(false);
        }
      });
    }

    async load(silent) {
      if (this.loading) return false;
      this.loading = true;

      try {
        var url =
          "/api/extensions/task-control-dashboard/refresh?_=" +
          Date.now();

        var data = await this.fetch(url, {
          method: "POST",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
          }
        });

        var previousRevision = this.lastRevision;
        this.data = data || {};
        this.lastRevision =
          this.data.system && this.data.system.data_revision
            ? String(this.data.system.data_revision)
            : null;

        this.render();

        if (!silent && this.data.errors && this.data.errors.length) {
          this.toast(this.data.errors[0], true);
        }

        return (
          previousRevision !== null &&
          this.lastRevision !== null &&
          previousRevision !== this.lastRevision
        );
      } catch (error) {
        if (!silent) this.renderFatal(error);
        return false;
      } finally {
        this.loading = false;
      }
    }

    startFastPolling(previousRevision) {
      window.clearInterval(this.fastPollTimer);
      window.clearTimeout(this.fastPollStopTimer);

      var attempts = 0;
      this.fastPollTimer = window.setInterval(async () => {
        attempts += 1;
        await this.load(true);

        var revision =
          this.data && this.data.system
            ? String(this.data.system.data_revision || "")
            : "";

        var pending =
          this.data && this.data.system
            ? Number(this.data.system.pending_commands || 0)
            : 0;

        if (
          (previousRevision && revision && revision !== previousRevision) ||
          (attempts >= 3 && pending === 0)
        ) {
          window.clearInterval(this.fastPollTimer);
          this.fastPollTimer = null;
          this.toast("Данные виджета обновлены.", false);
        }
      }, 2000);

      this.fastPollStopTimer = window.setTimeout(() => {
        window.clearInterval(this.fastPollTimer);
        this.fastPollTimer = null;
      }, 120000);
    }

    async executeAction(action, button) {
      var routes = {
        run_full_control:"run_full_control",
        process_meetings:"process_meetings",
        check_deadlines:"check_deadlines",
        check_results:"check_results"
      };
      var route = routes[action];
      if (!route) return this.toast("Неизвестное действие", true);

      var buttons = this.container.querySelectorAll("[data-action]");
      buttons.forEach(function (item) { item.disabled = true; });
      var old = button.innerHTML;
      button.innerHTML = "<span>◌</span><span>Ставлю в очередь…</span>";

      try {
        var revisionBefore =
          this.data && this.data.system
            ? String(this.data.system.data_revision || "")
            : "";

        var response = await this.fetch(
          "/api/extensions/task-control-dashboard/" + route + "?_=" + Date.now(),
          {
            method:"POST",
            headers:{
              "Cache-Control":"no-cache, no-store, must-revalidate",
              "Pragma":"no-cache"
            }
          }
        );
        if (!response || !response.ok) {
          throw new Error(
            response && response.message
              ? response.message
              : "Не удалось запустить обработку."
          );
        }

        if (response.data) {
          this.data = response.data;
          this.render();
        }

        this.toast(
          response.message || "Команда поставлена в очередь AI watcher.",
          false
        );
        this.switchTab("actions");
        this.startFastPolling(revisionBefore);
      } catch (error) {
        this.toast("Ошибка: " + (error.message || error), true);
      } finally {
        buttons.forEach(function (item) { item.disabled = false; });
        button.innerHTML = old;
      }
    }

    switchTab(id) {
      this.activeTab = id;
      this.container.querySelectorAll("[data-section]").forEach(function (node) {
        node.classList.toggle("active", node.dataset.section === id);
      });
      this.container.querySelectorAll("[data-tab]").forEach(function (node) {
        node.classList.toggle("active", node.dataset.tab === id);
      });
    }

    render() {
      var data = this.data || {};
      var header = data.header || {};
      var system = data.system || {};
      var health = header.health || "Нет данных";
      var healthNode = this.container.querySelector("[data-health]");
      var healthWrap = this.container.querySelector("[data-health-wrap]");
      healthNode.textContent = health;
      healthWrap.classList.toggle("attn", health !== "Контур работает");

      var sourceUpdated =
        data.system && data.system.registry_updated_at
          ? data.system.registry_updated_at
          : data.updated_at;
      this.container.querySelector("[data-updated]").textContent =
        this.formatDateTime(sourceUpdated);
      this.renderKpis(data.kpi || {}, system);
      this.renderStages(data.stages || []);
      this.renderTasks("[data-recent-tasks]", (data.tasks || []).slice(0,3), true);
      this.renderTasks("[data-all-tasks]", data.tasks || [], false);
      this.renderActivity(data.activity || []);
      this.renderQueue(system);
      this.renderErrors(data.errors || []);
      this.renderSettings(data);
      this.updateCountdown();
    }

    renderKpis(kpi, system) {
      var items = [
        ["new_protocols","▤","Новых протоколов","blue"],
        ["registered","✓","Новых поручений","green"],
        ["due_soon","◷","Срок близко","amber"],
        ["overdue","!","Просрочено","red"],
        ["manual_review","♙","Ручная проверка","violet"],
        ["closed","✓","Закрыто","green"]
      ];
      var html = items.map(function (item) {
        var value = kpi[item[0]] == null ? 0 : kpi[item[0]];
        return `<div class="kpi">
          <div class="kpi-top"><span class="kpi-icon ${item[3]}">${item[1]}</span><span class="kpi-value ${item[3]}">${value}</span></div>
          <div class="kpi-label">${item[2]}</div>
        </div>`;
      }).join("");
      this.container.querySelector("[data-kpis]").innerHTML = html;
    }

    renderStages(stages) {
      var icons = ["▤","✓","◷","✓"];
      var target = this.container.querySelector("[data-stages]");
      if (!stages.length) {
        target.innerHTML = this.empty("Контур ещё не запускался","Нажмите «Запустить полный контроль» во вкладке «Действия».");
        return;
      }
      target.innerHTML = stages.map((stage,index) => {
        var tone = stage.tone === "warning" ? "amber" : stage.tone === "success" ? "green" : "blue";
        return `<div class="step">
          <div class="step-icon">${icons[index] || "•"}</div>
          <div>
            <div class="step-name">${esc(stage.name || "Этап")}</div>
            <div class="step-result">${esc(stage.result || "Нет данных")}</div>
          </div>
          <span class="badge ${tone}">${esc(stage.status || "Нет данных")}</span>
        </div>`;
      }).join("");
    }

    renderTasks(selector, tasks, compact) {
      var target = this.container.querySelector(selector);
      if (!tasks.length) {
        target.innerHTML = this.empty(
          "Поручений пока нет",
          "Добавьте протокол в папку встреч и запустите обработку."
        );
        return;
      }
      target.innerHTML = `<div class="task-list">${tasks.map((task) => {
        var statusText = task.timing && task.timing !== "Нет данных" && task.timing !== "Срок в норме"
          ? task.timing : task.status;
        return `<div class="task">
          <div class="task-top">
            <div>
              <div class="task-title">${esc(task.title || "Без названия")}</div>
              <div class="task-id">${esc(task.id || "Без ID")}</div>
            </div>
            <span class="badge ${this.badgeTone(task)}">${esc(statusText || "Нет данных")}</span>
          </div>
          <div class="task-meta">
            <span>👤 ${esc(task.assignee || "Не определён")}</span>
            <span>📅 ${this.formatDate(task.due_date)}</span>
            ${task.problem ? `<span>⚠ ${esc(task.problem)}</span>` : ""}
          </div>
        </div>`;
      }).join("")}</div>`;
    }

    renderActivity(activity) {
      var target = this.container.querySelector("[data-activity]");
      if (!activity.length) {
        target.innerHTML = this.empty("Журнал пока пуст","После первого запуска здесь появятся действия контура.");
        return;
      }
      target.innerHTML = activity.map((item) => `<div class="event">
        <span class="event-dot ${item.tone || ""}"></span>
        <span class="event-time">${this.formatTime(item.time)}</span>
        <div>
          <div class="event-title">${esc(item.title || "")}</div>
          <div class="event-detail">${esc(item.details || item.status || "")}</div>
        </div>
      </div>`).join("");
    }

    renderQueue(system) {
      var pending = Number(system.pending_commands || 0);
      var meetings = Number(system.meeting_files || 0);
      var results = Number(system.result_files || 0);
      this.container.querySelector("[data-queue-panel]").innerHTML = `
        <div class="panel-title">Текущее состояние</div>
        <div style="height:8px"></div>
        <div class="steps">
          <div class="step"><div class="step-icon">⌛</div><div><div class="step-name">Команд в очереди</div><div class="step-result">Обрабатываются AI-контуром</div></div><span class="badge blue">${pending}</span></div>
          <div class="step"><div class="step-icon">▤</div><div><div class="step-name">Файлов протоколов</div><div class="step-result">В рабочей входной папке</div></div><span class="badge green">${meetings}</span></div>
          <div class="step"><div class="step-icon">✓</div><div><div class="step-name">Файлов результатов</div><div class="step-result">Ожидают проверки или уже обработаны</div></div><span class="badge violet">${results}</span></div>
        </div>
      `;
    }

    renderErrors(errors) {
      var target = this.container.querySelector("[data-errors]");
      if (!errors.length) {
        target.innerHTML = "";
        return;
      }
      target.innerHTML = `<div class="panel"><div class="panel-title">Ошибки</div><div style="height:8px"></div>${errors.map(function (error) {
        return `<div class="error">${esc(error)}</div>`;
      }).join("<div style='height:6px'></div>")}</div>`;
    }

    renderSettings(data) {
      var paths = data.paths || {};
      var system = data.system || {};
      this.container.querySelector("[data-settings]").innerHTML = `
        <div class="panel">
          <div class="panel-title">Рабочая папка</div>
          <div style="height:8px"></div>
          <div class="path">${esc(data.project_root || "Путь не найден")}</div>
          <div class="hint">
            ${system.storage_ready ? "Реестры обнаружены." : "Папка registry не найдена."}
            Найдено рабочих папок: ${Number(system.workspace_candidates || 0)}.
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Куда складывать файлы</div>
          <div style="height:8px"></div>
          <div class="hint">Протоколы встреч</div>
          <div class="path">${esc(paths.meetings || "Путь не найден")}</div>
          <div class="hint">Результаты поручений</div>
          <div class="path">${esc(paths.results || "Путь не найден")}</div>
        </div>
        <div class="panel">
          <div class="panel-title">Режим запуска</div>
          <div style="height:8px"></div>
          <div class="path">${esc(system.profile_label || system.active_profile || "HYBRID")}</div>
          <div class="hint">${esc(system.schedule_label || "Расписание не определено")}</div>
          <div class="hint">Следующий полный проход</div>
          <div class="path">${esc(this.formatDateTime(system.next_full_sweep))}</div>
        </div>
        <div class="panel">
          <div class="panel-title">AI watcher</div>
          <div style="height:8px"></div>
          <div class="path">${esc(this.watcherLabel(system))}</div>
          ${system.watcher_phase_details ? `<div class="hint">${esc(system.watcher_phase_details)}</div>` : ""}
          <div class="hint">Последний запуск</div>
          <div class="path">${esc(system.watcher_last_run_status || "ещё не выполнялся")}</div>
          ${system.watcher_last_run_message ? `<div class="hint">${esc(system.watcher_last_run_message)}</div>` : ""}
          <div class="hint">Время последнего запуска</div>
          <div class="path">${esc(this.formatDateTime(system.watcher_last_inject_at))}</div>
          <div class="hint">Рабочая папка watcher</div>
          <div class="path">${esc(system.watcher_project_root || "не определена")}</div>
          <div class="hint">Файл heartbeat</div>
          <div class="path">${esc(system.watcher_heartbeat_file || "не создан")}</div>
          ${system.watcher_last_error ? `<div class="error" style="margin-top:8px">${esc(system.watcher_last_error)}</div>` : ""}
        </div>
        <div class="panel">
          <div class="panel-title">Технические данные</div>
          <div style="height:8px"></div>
          <div class="hint">Реестр поручений</div>
          <div class="path">${esc(paths.tasks || "Путь не найден")}</div>
          <div class="hint">Очередь команд</div>
          <div class="path">${esc(paths.commands || "Путь не найден")}</div>
        </div>
      `;
    }

    updateCountdown() {
      var target = this.container.querySelector("[data-countdown]");
      if (!target || !this.data || !this.data.header) return;

      if (this.data.header.full_sweep_due === true) {
        target.textContent = "плановый запуск ожидается";
        return;
      }

      var next = this.data.header.next_run
        ? new Date(this.data.header.next_run)
        : null;

      if (!next || Number.isNaN(next.getTime())) {
        target.textContent = "расписание недоступно";
        return;
      }

      var seconds = Math.max(
        0,
        Math.floor((next.getTime() - Date.now()) / 1000)
      );
      var hours = Math.floor(seconds / 3600);
      var min = Math.floor((seconds % 3600) / 60);
      var sec = seconds % 60;

      if (seconds === 0) {
        target.textContent = "плановый запуск ожидается";
      } else if (hours > 0) {
        target.textContent =
          `${hours} ч ${String(min).padStart(2,"0")} мин`;
      } else if (min > 0) {
        target.textContent =
          `${min} мин ${String(sec).padStart(2,"0")} сек`;
      } else {
        target.textContent = `${sec} сек`;
      }
    }


    watcherLabel(system) {
      var status = String(system.watcher_status || "not_started");
      var phase = String(system.watcher_phase || "unknown");
      var age = Number(system.watcher_heartbeat_age_seconds);
      var poll = Number(system.watcher_poll_seconds || 0);

      if (status === "running" && Number.isFinite(age) && age <= 45) {
        if (phase === "processing_command") return "Обрабатывает команду из виджета";
        if (phase === "processing_files") return "Обрабатывает новые файлы";
        if (phase === "processing_schedule") return "Выполняет плановый контроль";
        if (phase === "recovering") return "Восстанавливается после ошибки";
        if (phase === "starting") return "Запускается";
        return `Работает · проверка каждые ${poll || 2} сек`;
      }
      if (status === "error") {
        return "Ошибка companion-процесса";
      }
      if (status === "stopped") {
        return "Остановлен";
      }
      if (status === "running") {
        return "Нет свежего heartbeat";
      }
      return "Ещё не запускался";
    }

    badgeTone(task) {
      var value = `${task.status || ""} ${task.timing || ""}`.toLowerCase();
      if (value.indexOf("просроч") >= 0) return "red";
      if (value.indexOf("приближ") >= 0 || value.indexOf("доработ") >= 0) return "amber";
      if (value.indexOf("ручн") >= 0) return "violet";
      if (value.indexOf("закры") >= 0 || value.indexOf("норме") >= 0) return "green";
      return "blue";
    }

    empty(title, text) {
      return `<div class="empty"><strong>${esc(title)}</strong>${esc(text)}</div>`;
    }

    toast(message, error) {
      var node = this.container.querySelector("[data-toast]");
      node.textContent = message;
      node.classList.toggle("error", !!error);
      node.classList.add("show");
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => node.classList.remove("show"), 5200);
    }

    renderFatal(error) {
      this.container.innerHTML =
        `<div style="min-height:260px;padding:18px;background:#160b12;color:#fecaca;font:12px/1.55 ui-monospace,monospace">
          <strong style="color:#fff;font-size:14px">Виджет не смог загрузиться</strong>
          <pre style="white-space:pre-wrap;word-break:break-word">${esc(error && error.stack ? error.stack : error)}</pre>
        </div>`;
    }

    formatDate(value) {
      if (!value) return "—";
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return esc(value);
      return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"}).format(date);
    }

    formatDateTime(value) {
      if (!value) return "—";
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date);
    }

    formatTime(value) {
      if (!value) return "—";
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit"}).format(date);
    }
  }

  window.Widget = TaskControlWidget;
  if (typeof globalThis !== "undefined") globalThis.Widget = TaskControlWidget;

  async function fallbackFetch(url, options) {
    var response = await window.fetch(url, options || {});
    if (!response || typeof response.json !== "function") return response;
    if (!response.ok) {
      var body = "";
      try { body = await response.text(); } catch (_) {}
      throw new Error(`HTTP ${response.status}: ${body || url}`);
    }
    return await response.json();
  }

  function fallbackStart() {
    if (window.__taskControlWidgetStarted) return;
    var boot = document.getElementById("tc-boot");
    var container = boot && boot.parentNode ? boot.parentNode : document.body;
    try {
      var instance = new TaskControlWidget(container, fallbackFetch);
      window.__taskControlWidgetInstance = instance;
      Promise.resolve(instance.init()).catch(function (error) {
        instance.renderFatal(error);
      });
    } catch (error) {
      container.innerHTML = `<pre style="padding:18px;color:#fecaca">${esc(error)}</pre>`;
    }
  }

  window.setTimeout(fallbackStart, 700);
})();