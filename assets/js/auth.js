/* Учётные записи: вход по slug + пароль, сессия в браузере (60 дней).
   Пароли проверяет Supabase (RPC otp_login), в браузере хранится только токен. */
(function () {
  "use strict";
  var CLOUD = function () {
    var d = window.OTP_DATA || window.OTP_EMP;
    return (d && d.hrRules && d.hrRules.cloud && d.hrRules.cloud.url) ? d.hrRules.cloud : null;
  };
  var KEY = function (slug) { return "otp_sess_" + slug; };
  function tok(slug) { try { return localStorage.getItem(KEY(slug)); } catch (e) { return null; } }
  function setTok(slug, t) { try { localStorage.setItem(KEY(slug), t); } catch (e) {} }
  function clearTok(slug) { try { localStorage.removeItem(KEY(slug)); } catch (e) {} }

  function rpc(name, body) {
    var c = CLOUD();
    if (!c) return Promise.reject(new Error("offline"));
    return fetch(c.url.replace(/\/$/, "") + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); });
  }

  var API = {
    token: tok,
    logout: clearTok,
    has: function (slug) { return !!tok(slug); },
    /* Администратор (руководитель) видит страницы сотрудников без повторного пароля. */
    isAdmin: function () {
      var t = tok("admin");
      if (!t) return Promise.resolve(false);
      return rpc("otp_check_session", { p_token: t }).then(function (res) {
        return !!(res && res.ok && res.admin);
      }).catch(function () { return false; });
    },
    login: function (slug, pass) {
      return rpc("otp_login", { p_slug: slug, p_pass: pass }).then(function (res) {
        if (res && res.ok && res.token) { setTok(slug, res.token); return res; }
        return res || { ok: false, error: "unknown" };
      });
    },
    session: function (slug) {
      var t = tok(slug);
      if (!t) return Promise.resolve(null);
      return rpc("otp_check_session", { p_token: t }).then(function (res) {
        if (!res || !res.ok) { clearTok(slug); return null; }
        return res;
      }).catch(function () { return null; });
    },
    /* Список сотрудников — только с админ-токеном (otp_staff закрыт от anon,
       v4). Для обычного посетителя возвращает [] — аватары/пароли не светим. */
    staffList: function () {
      var t = tok("admin");
      if (!t) return Promise.resolve([]);
      return rpc("otp_staff_admin_list", { p_token: t }).then(function (res) {
        return (res && res.ok && Array.isArray(res.list)) ? res.list : [];
      }).catch(function () { return []; });
    },
    /* Свой slug + аватар по своему токену (v4: таблица otp_staff закрыта). */
    selfInfo: function (slug) {
      var t = tok(slug);
      if (!t) return Promise.resolve(null);
      return rpc("otp_self_info", { p_token: t }).then(function (res) {
        return (res && res.ok) ? res : null;
      }).catch(function () { return null; });
    },
    /* запрос через прокси (Edge Function api) с токеном сессии */
    api: function (slug, path, method, body) {
      var c = CLOUD();
      if (!c) return Promise.reject(new Error("offline"));
      return fetch(c.url.replace(/\/$/, "") + "/functions/v1/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: c.key,
          Authorization: "Bearer " + c.key,
        },
        body: JSON.stringify({ token: tok(slug), path: path, method: method || "GET", body: body }),
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); });
    },
    selfUpdate: function (slug, pass, avatar) {
      return rpc("otp_self_update", { p_token: tok(slug), p_pass: pass || null, p_avatar: avatar || null });
    },
    /* P1.5: копия текущего графика в БД (таблица otp_schedule_cache) — cron
       читает график сначала оттуда. Нужен админ-токен; идемпотентно. */
    scheduleSet: function (doc) {
      return rpc("otp_schedule_set", { p_token: tok("admin"), p_doc: doc }).catch(function () { return { ok: false, error: "offline" }; });
    },
    /* P1.2: страховочная правка события из отчёта (только админ-сессия):
       at — новое время (ISO) или null; del — удалить событие. */
    eventFix: function (slug, id, at, del) {
      return rpc("otp_event_fix", {
        p_token: tok("admin") || tok(slug),
        p_id: id, p_at: at || null, p_del: !!del,
      });
    },
    /* P3: метрики — неудачные попытки входа (таблицу otp_login_fails пишет
       otp_login). Нужна админ-сессия; без неё — пустой список. */
    loginFails: function () {
      var t = tok("admin");
      if (!t) return Promise.resolve([]);
      return rpc("otp_login_fails_list", { p_token: t }).then(function (res) {
        return (res && res.ok && Array.isArray(res.list)) ? res.list : [];
      }).catch(function () { return []; });
    },
    contentList: function (emp) {
      return rpc("otp_content_list", { p_emp: emp }).catch(function () { return []; });
    },
    saveContent: function (row) {
      return rpc("otp_content_save", {
        p_token: tok("admin"), p_id: row.id || "", p_emp: row.emp, p_section: row.section,
        p_title: row.title || null, p_body: row.body || null,
        p_value: row.value || null, p_on_date: row.onDate || null,
      });
    },
    delContent: function (id) {
      return rpc("otp_content_del", { p_token: tok("admin"), p_id: id });
    },
    /* защита страницы: пока не вошёл — контент скрыт, показывается форма */
    protect: function (slug, adminOnly) {
      var html = document.documentElement;
      html.classList.add("auth-lock");
      var done = function () { html.classList.remove("auth-lock"); document.dispatchEvent(new Event("otp-auth")); };
      return API.session(slug).then(function (s) {
        if (s && (!adminOnly || s.admin)) { done(); return; }
        var ov = document.createElement("div");
        ov.className = "auth-gate";
        ov.innerHTML = `<div class="auth-box"><h3><i class="ph-bold ph-lock-key"></i> Вход</h3>`
          + `<p>Страница руководителя — нужен пароль администратора.</p>`
          + `<input id="pg-pass" type="password" placeholder="пароль" autocomplete="current-password">`
          + `<button class="btn btn-primary" id="pg-go" type="button">Войти</button>`
          + `<span class="auth-err" id="pg-err"></span></div>`;
        document.body.appendChild(ov);
        var go = function () {
          var pass = (document.getElementById("pg-pass") || {}).value || "";
          API.login(slug, pass).then(function (res) {
            if (res && res.ok && (!adminOnly || res.admin)) { ov.remove(); done(); location.reload(); }
            else { var e = document.getElementById("pg-err"); if (e) e.textContent = "Неверный пароль"; }
          });
        };
        ov.querySelector("#pg-go").addEventListener("click", go);
        ov.querySelector("#pg-pass").addEventListener("keydown", function (ev) { if (ev.key === "Enter") go(); });
      }).catch(function () { done(); });
    },
    saveStaff: function (row) {
      return rpc("otp_staff_save", {
        p_token: tok("admin"), p_slug: row.slug, p_fio: row.fio, p_login: row.login || null,
        p_pass: row.pass || null, p_avatar: row.avatar || null,
        p_active: row.active !== false,
      });
    },
    /* v14: проверка, что пароль реально записался в базу (только админ-сессия). */
    verifyPass: function (slug, pass) {
      return rpc("otp_staff_verify_pass", { p_token: tok("admin"), p_slug: slug, p_pass: pass })
        .catch(function () { return null; });
    },
    /* v17/v19: «старт только из приложения» и список привязанных устройств. */
    setOnlyApp: function (slug, on) {
      return rpc("otp_staff_set_only_app", { p_token: tok("admin"), p_slug: slug, p_only_app: !!on })
        .catch(function () { return null; });
    },
    devicesList: function () {
      var t = tok("admin");
      if (!t) return Promise.resolve([]);
      return rpc("otp_devices_list", { p_token: t }).then(function (res) {
        return (res && res.ok && Array.isArray(res.list)) ? res.list : [];
      }).catch(function () { return []; });
    },
    /* v20: отвязать устройство и включить правило сразу для всех */
    revokeDevice: function (slug, device) {
      return rpc("otp_device_revoke", { p_token: tok("admin"), p_slug: slug, p_device: device })
        .catch(function () { return null; });
    },
    setOnlyAppAll: function (on) {
      return rpc("otp_staff_set_only_app_all", { p_token: tok("admin"), p_on: !!on })
        .catch(function () { return null; });
    },
  };
  window.OTP_AUTH = API;
})();
