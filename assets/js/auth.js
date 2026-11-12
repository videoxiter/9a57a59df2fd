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
