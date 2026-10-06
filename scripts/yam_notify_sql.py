# -*- coding: utf-8 -*-
"""Печатает SQL для уведомлений о заявках ОТП в Яндекс Мессенджер (чат «Ошибки ИИ»).

Уведомления отправляет сама база Supabase (pg_net + триггер), поэтому ПК руководителя
не нужен: заявка создаётся или меняет статус → база шлёт сообщение ботом.

Запуск:  python yam_notify_sql.py        # печатает готовый SQL (токен берётся из data\\.env)
Затем:   Supabase → SQL Editor → вставить → Run
"""
import json
import os
import sys

HERMES = r"G:\LMStudio\Hermes"
ENV = os.path.join(HERMES, "data", ".env")
CHAT = os.path.join(HERMES, "data", "state", "alerts_chat.json")


def read_env(path=ENV):
    data = {}
    for line in open(path, encoding="utf-8", errors="replace"):
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            data[k.strip().lstrip("\ufeff")] = v.strip().strip('"').strip("'")
    return data


def main():
    env = read_env()
    token = env.get("YANDEX_BOT_TOKEN") or ""
    chat = ""
    try:
        chat = json.load(open(CHAT, encoding="utf-8")).get("chat_id", "")
    except Exception:
        pass
    if not token or not chat:
        print("нет токена или chat_id — проверь data\\.env и data\\state\\alerts_chat.json", file=sys.stderr)
        return 1

    sql = f"""-- Уведомления о заявках ОТП в Яндекс Мессенджер (чат «Ошибки ИИ»).
-- Выполнить один раз в SQL Editor. Токен бота хранится в таблице otp_settings,
-- которая закрыта RLS (анонимный ключ её не видит).

create table if not exists public.otp_settings (key text primary key, value text);
alter table public.otp_settings enable row level security;

insert into public.otp_settings(key, value) values
  ('yam_token', '{token}'),
  ('yam_chat', '{chat}')
on conflict (key) do update set value = excluded.value;

create extension if not exists pg_net;

create or replace function public.otp_notify() returns trigger
language plpgsql security definer as $$
declare
  tok text; chat text; msg text; who text; kind text; when_txt text; mark text;
begin
  select value into tok from public.otp_settings where key = 'yam_token';
  select value into chat from public.otp_settings where key = 'yam_chat';
  if tok is null or chat is null or chat = '' then return new; end if;

  who  := coalesce(new."empName", new."empSlug");
  kind := case new.type
            when 'overtime' then 'Переработка'
            when 'leave'    then 'Увольнительная'
            when 'dayoff'   then 'Отгул за вых. смену'
            else new.type end;

  if tg_op = 'INSERT' then
    if new.type = 'dayoff' then
      when_txt := 'отгул ' || coalesce(new.date, '') || ' за выходную смену ' || coalesce(new."date2", '');
    else
      when_txt := coalesce(new.date, '') || ' ' || coalesce(new."from", '') || '–' || coalesce(new."to", '')
                  || case when new.hours is not null then ' · ' || trim(to_char(new.hours, 'FM9999990.9')) || ' ч' else '' end;
    end if;
    mark := '📝 Новая заявка';
  elsif new.status = 'approved' then
    mark := '✅ Подтверждено' || case when new."noDeduct" then ' (без списания часов)' else '' end;
    when_txt := coalesce(new.date, '');
  elsif new.status = 'rejected' then
    mark := '❌ Отказано';
    when_txt := coalesce(new.date, '') || case when coalesce(new.reject, '') <> '' then ' · причина: ' || new.reject else '' end;
  else
    return new;
  end if;

  msg := mark || ': ' || kind || ' — ' || who || E'\\n' || when_txt
         || case when coalesce(new.reason, '') <> '' and tg_op = 'INSERT' then E'\\n' || new.reason else '' end;

  perform net.http_post(
    url := 'https://botapi.messenger.yandex.net/bot/v1/messages/sendText/',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'OAuth ' || tok),
    body := jsonb_build_object('chat_id', chat, 'text', msg)
  );
  return new;
end $$;

drop trigger if exists otp_notify_ins on public.otp_requests;
create trigger otp_notify_ins after insert on public.otp_requests
  for each row execute function public.otp_notify();

drop trigger if exists otp_notify_upd on public.otp_requests;
create trigger otp_notify_upd after update on public.otp_requests
  for each row when (old.status is distinct from new.status)
  execute function public.otp_notify();
"""
    print(sql)
    return 0


if __name__ == "__main__":
    sys.exit(main())
