# -*- coding: utf-8 -*-
"""Синхронизация графика смен/отпусков из Confluence — по расписанию и по кнопке.

Режимы:
  python scripts/sync_schedule.py --auto            # плановая (раз в день)
  python scripts/sync_schedule.py --if-requested    # проверка кнопки с сайта
  python scripts/sync_schedule.py --no-push         # обновить файлы, не пушить

Полный цикл: Confluence → scripts/schedule.json → assets/js/data.js +
assets/data/schedule.json → страницы team/ и дашборд → git commit/push.

Кнопка на сайте пишет запрос в таблицу otp_sync_flags (Supabase). Режим
--if-requested читает этот флаг, при запросе запускает синхронизацию и
отмечает результат. Файл scripts/cloud.json (url + публичный ключ) должен быть
на месте — он в .gitignore.
"""
import argparse
import datetime
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
FLAG_ID = "schedule"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def log(*a):
    print(*a, flush=True)


def run(script, *args):
    cmd = [PY, os.path.join(ROOT, "scripts", script)] + list(args)
    log("→", os.path.basename(script), *args)
    subprocess.run(cmd, cwd=ROOT, check=True)


def cloud():
    path = os.path.join(ROOT, "scripts", "cloud.json")
    if not os.path.exists(path):
        return None
    try:
        return json.load(open(path, encoding="utf-8"))
    except Exception:
        return None


def sb(method, path, body=None, cfg=None):
    cfg = cfg or cloud()
    if not cfg or not cfg.get("url"):
        raise RuntimeError("нет scripts/cloud.json")
    url = cfg["url"].rstrip("/") + "/rest/v1/" + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "apikey": cfg["key"], "Authorization": "Bearer " + cfg["key"],
        "Content-Type": "application/json", "Prefer": "return=representation",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        text = r.read().decode("utf-8")
        return json.loads(text) if text else None


def read_flag():
    try:
        rows = sb("GET", f"otp_sync_flags?id=eq.{FLAG_ID}&select=*")
        return (rows or [None])[0]
    except Exception as e:
        log("флаг недоступен:", e)
        return None


def write_flag(ok, message, requested_at=None):
    body = {
        "done_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ok": bool(ok),
        "message": str(message)[:400],
    }
    if requested_at is not None:
        body["requested_at"] = requested_at
    try:
        sb("PATCH", f"otp_sync_flags?id=eq.{FLAG_ID}", body)
    except Exception as e:
        log("не удалось записать статус синхронизации:", e)


def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], check=False,
                          capture_output=True, text=True)


def pending_tasks():
    """Задачи из админки (otp_tasks), которые ещё не выполнены."""
    try:
        return sb("GET", "otp_tasks?done_at=is.null&order=requested_at.asc&limit=5") or []
    except Exception as e:
        log("очередь задач недоступна:", e)
        return []


def mark_task(task_id, ok, message):
    try:
        sb("PATCH", f"otp_tasks?id=eq.{task_id}", {
            "done_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "ok": bool(ok),
            "message": str(message)[:400],
        })
    except Exception as e:
        log("не удалось отметить задачу:", e)


def process_tasks():
    """Выполняет отложенные задачи: создание страниц сотруднику."""
    tasks = pending_tasks()
    if not tasks:
        return
    for t in tasks:
        kind = t.get("kind")
        payload = t.get("payload") or {}
        tid = t.get("id")
        log(f"=== задача {kind} {tid}")
        try:
            if kind == "add_employee":
                fio = str(payload.get("fio") or "").strip()
                slug = str(payload.get("slug") or "").strip()
                if not fio or not slug:
                    raise RuntimeError("нет ФИО или кода страницы")
                run("add_employee.py", "--fio", fio, "--slug", slug,
                    "--role", str(payload.get("role") or "Специалист ТП"))
                mark_task(tid, True, "страницы созданы и опубликованы")
            elif kind == "apply_kpi":
                run("apply_kpi.py")
                mark_task(tid, True, "KPI применены и опубликованы")
            elif kind == "publish_schedule":
                month = str((payload or {}).get("month") or "").strip()
                if not month:
                    raise RuntimeError("нет месяца в задаче публикации")
                run("publish_schedule.py", "--month", month)
                mark_task(tid, True, "график %s опубликован на сайте" % month)
            elif kind == "export_schedule_xlsx":
                month = str((payload or {}).get("month") or "").strip()
                if not month:
                    raise RuntimeError("нет месяца в задаче выгрузки xlsx")
                run("export_schedule_xlsx.py", "--month", month)
                mark_task(tid, True, "xlsx: downloads/grafik-%s.xlsx" % month)
            elif kind == "publish_confluence_schedule":
                month = str((payload or {}).get("month") or "").strip()
                if not month:
                    raise RuntimeError("нет месяца в задаче Confluence")
                run("publish_confluence_schedule.py", "--month", month)
                mark_task(tid, True, "страница Confluence создана или обновлена")
            elif kind == "sync_vacations":
                month = str((payload or {}).get("month") or "").strip()
                if not month:
                    now = datetime.datetime.now()
                    month = (now.replace(day=1) + datetime.timedelta(days=32)).strftime("%Y-%m")
                run("sync_vacations.py", "--month", month)
                mark_task(tid, True, "отпуска на %s обновлены" % month)
            else:
                raise RuntimeError("неизвестный тип задачи: " + str(kind))
        except Exception as e:
            log("ошибка задачи:", e)
            mark_task(tid, False, str(e))


def sync(tag):
    log(f"=== синхронизация графика ({tag}) {datetime.datetime.now():%d.%m.%Y %H:%M}")
    run("fetch_confluence.py")
    # только график: полная сборка требует scripts/extracted.json (его может не быть)
    run("generate_data.py", "--schedule-only")
    run("generate_pages.py")
    run("generate_dashboard.py")
    # ручные KPI/бонусы из админки применяем поверх — после пересборки
    try:
        run("apply_kpi.py", "--no-push")
    except Exception as e:
        log("KPI не применены:", e)
    # отпуска на текущий и следующий месяц — для редактора графика и автосборки
    try:
        now = datetime.datetime.now()
        this_m = now.strftime("%Y-%m")
        next_m = (now.replace(day=1) + datetime.timedelta(days=32)).strftime("%Y-%m")
        for m in (this_m, next_m):
            run("sync_vacations.py", "--month", m)
    except Exception as e:
        log("отпуска не обновлены:", e)
    if not args.no_push:
        git("add", "-A")
        st = git("status", "--porcelain").stdout.strip()
        if st:
            git("commit", "-m", f"schedule sync: {datetime.date.today().isoformat()}")
            pushed = git("push", "origin", "main")
            if pushed.returncode != 0:
                raise RuntimeError("git push не прошёл: " + (pushed.stderr or "")[-300:])
            log("опубликовано:", len(st.splitlines()), "файлов")
        else:
            log("изменений нет — публиковать нечего")
    return "готово"


def main():
    global args
    ap = argparse.ArgumentParser()
    ap.add_argument("--auto", action="store_true", help="синхронизировать безусловно")
    ap.add_argument("--if-requested", action="store_true", help="синхронизировать только по запросу с сайта")
    ap.add_argument("--no-push", action="store_true", help="не пушить в git")
    args = ap.parse_args()

    # очередь задач из админки (создание страниц сотруднику) — в любом режиме
    process_tasks()

    if args.if_requested:
        flag = read_flag()
        if not flag:
            return 0
        req = flag.get("requested_at")
        done = flag.get("done_at")
        if not req or (done and done >= req):
            return 0                       # запроса нет — тихо выходим
        log("получен запрос с сайта:", req)
        try:
            msg = sync("по кнопке")
            write_flag(True, msg, requested_at=req)
        except Exception as e:
            write_flag(False, str(e), requested_at=req)
            log("ошибка:", e)
            return 1
        return 0

    if not args.auto:
        ap.print_help()
        return 2
    try:
        msg = sync("по расписанию")
        write_flag(True, msg)
        return 0
    except Exception as e:
        write_flag(False, str(e))
        log("ошибка:", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
