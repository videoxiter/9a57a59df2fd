/* Личная страница сотрудника: данные не лежат в HTML.
   Сначала вход, затем загрузка payload из базы (RPC otp_profile_get) и только
   потом запуск profile.js. Так curl по адресу страницы видит лишь форму входа. */
(function () {
  "use strict";
  var B = window.OTP_BOOT || {};
  var A = window.OTP_AUTH;
  var root = document.getElementById("root");
  var PREFIX = B.prefix || "";
  var V = B.v || "";

  function showGate(message) {
    if (document.querySelector(".auth-gate")) return;
    var ov = document.createElement("div");
    ov.className = "auth-gate";
    ov.innerHTML = '<div class="auth-box"><h3>Вход</h3>'
      + '<p>' + (message || "Это ваша личная страница. Введите пароль — данные загрузятся после входа.") + '</p>'
      + '<input id="bp-pass" type="password" placeholder="пароль" autocomplete="current-password">'
      + '<button class="btn btn-primary" id="bp-go" type="button">Войти</button>'
      + '<span class="auth-err" id="bp-err"></span>'
      + '<p class="staff-hint" style="margin-top:10px">Руководитель может войти паролем администратора.</p></div>';
    document.body.appendChild(ov);
    var err = function (t) { var e = document.getElementById("bp-err"); if (e) e.textContent = t; };
    var go = function () {
      var pass = (document.getElementById("bp-pass") || {}).value || "";
      A.login(B.slug, pass).then(function (res) {
        if (res && res.ok) { location.reload(); return false; }
        /* пароль руководителя: с ним страницы сотрудников открываются без их пароля */
        return A.login("admin", pass).then(function (r2) {
          if (r2 && r2.ok) { location.reload(); return true; }
          err(res && res.error === "bad_password" ? "Неверный пароль" : "Не удалось войти");
          return false;
        });
      }).catch(function () { err("Нет связи с сервером входа"); });
    };
    ov.querySelector("#bp-go").addEventListener("click", go);
    ov.querySelector("#bp-pass").addEventListener("keydown", function (ev) { if (ev.key === "Enter") go(); });
    var inp = document.getElementById("bp-pass");
    if (inp) inp.focus();
  }

  function fail(text, allowRetry) {
    if (!root) return;
    root.innerHTML = '<p class="muted" style="padding:60px 0">' + text + '</p>';
    if (!allowRetry) return;
    var b = document.createElement("button");
    b.className = "btn btn-primary";
    b.textContent = "Повторить";
    b.addEventListener("click", function () { root.innerHTML = ""; boot(); });
    root.appendChild(b);
  }

  function loadProfileJs() {
    var s = document.createElement("script");
    s.src = PREFIX + "assets/js/profile.js?v=" + V;
    document.body.appendChild(s);
  }

  function boot() {
    if (!A || !A.token) { showGate(); return; }
    var own = A.token(B.slug);
    if (own) { loadFor(B.slug); return; }
    // руководитель: админ-сессия даёт доступ к страницам сотрудников без их пароля
    if (A.token("admin") && A.isAdmin) {
      A.isAdmin().then(function (adm) {
        if (adm) { loadFor(B.slug); } else { showGate(); }
      }).catch(function () { showGate(); });
      return;
    }
    showGate();
  }

  function loadFor(slug) {
    A.profileGet(slug).then(function (res) {
      if (res && res.ok && res.payload) {
        window.OTP_EMP = res.payload;
        loadProfileJs();
        return;
      }
      if (res && res.error === "auth") { showGate(); return; }
      if (res && res.error === "forbidden") { fail("Нет доступа к этой странице.", false); return; }
      if (res && res.error === "empty") { fail("Данные страницы ещё не загружены. Обратитесь к руководителю.", true); return; }
      fail("Не удалось загрузить данные страницы.", true);
    }).catch(function () {
      fail("Нет связи с сервером. Проверьте интернет и повторите.", true);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
