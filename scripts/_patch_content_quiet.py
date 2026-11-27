# -*- coding: utf-8 -*-
"""Патч 3.6d: не читать старый публичный файл, если данных нет в базе.

data.js с сайта убран (данные теперь за входом), поэтому попытка чтения
давала 404 в журнале. Теперь: есть токен — читаем только RPC, нет данных —
тихо пропускаем.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

old = """        except Exception as e:
            log("данные сайта: RPC недоступен %r" % (e,))
        new = content_snapshot(slug, payload)"""
new = """        except Exception as e:
            log("данные сайта: RPC недоступен %r" % (e,))
        if not payload:
            return []          # публичного файла больше нет — тихо выходим
        new = content_snapshot(slug, payload)"""
assert old in src, "блок чтения данных"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 3.6d применён")
sys.exit(0)
