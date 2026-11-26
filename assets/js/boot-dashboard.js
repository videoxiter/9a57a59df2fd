/* Страницы дашборда: общий dataset (data.js) не лежит в открытом доступе.
   Вход администратора → загрузка payload из базы → затем модули дашборда. */
(function () {
  "use strict";
  var B = window.OTP_BOOT || {};
  var A = window.OTP_AUTH;
  var PREFIX = B.prefix || "";
  var V = B.v || "";

  function loadScripts(names, done) {
    if (!names.length) { if (done) done(); return; }
    var name = names.shift();
    var s = document.createElement("script");
    s.src = PREFIX + "assets/js/" + name + "?v=" + V;
    s.onload = function () { loadScripts(names, done); };
    s.onerror = function () { showError("Не удалось загрузить модуль " + name); };
    document.body.appendChild(s);
  }

  function showError(text) {
    var root = document.getElementById("root") || document.body;
    var box = document.createElement("div");
    box.className = "auth-gate";
    box.innerHTML = '<div class="auth-box"><h3>Данные недоступны</h3><p>' + text + '</p>'
      + '<button class="btn btn-primary" type="button">Повторить</button></div>';
    box.querySelector("button").addEventListener("click", function () { location.reload(); });
    document.body.appendChild(box);
    if (root) root.style.visibility = "hidden";
  }

  function boot() {
    if (!A || !A.protect) { showError("Не загрузился модуль авторизации."); return; }
    A.protect("admin", true).then(function () {
      A.dataGet().then(function (res) {
        if (res && res.ok && res.payload) {
          window.OTP_DATA = res.payload;
          loadScripts(["common.js", "cloud.js", "hr.js", "main.js"]);
          return;
        }
        if (res && (res.error === "auth" || res.error === "forbidden")) {
          showError("Нужен пароль администратора. Обновите страницу и войдите снова.");
          return;
        }
        if (res && res.error === "empty") {
          showError("Данные сайта ещё не загружены на сервер. Запустите публикацию данных или обратитесь к руководителю.");
          return;
        }
        showError("Сервер не отдал данные. Попробуйте повторить.");
      }).catch(function () { showError("Нет связи с сервером. Проверьте интернет и повторите."); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
