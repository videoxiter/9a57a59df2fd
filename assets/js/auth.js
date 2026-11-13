/* Учётные записи: вход по slug + пароль, сессия в браузере (60 дней).
   Пароли проверяет Supabase (RPC otp_login), в браузере хранится только токен. */
(function () {
  "use strict";
  var CLOUD = function () {
    var d = window.OTP_DATA;
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
    staffList: function () { return rpc("otp_staff_list", {}).catch(function () { return []; }); },
    selfUpdate: function (slug, pass, avatar) {
      return rpc("otp_self_update", { p_token: tok(slug), p_pass: pass || null, p_avatar: avatar || null });
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
      var done = function () { html.classList.remove("auth-lock"); };
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
            if (res && res.ok && (!adminOnly || res.admin)) { ov.remove(); done(); }
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
  };
  window.OTP_AUTH = API;
})();
