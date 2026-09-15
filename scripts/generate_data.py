# -*- coding: utf-8 -*-
"""
Генератор data.js из РЕАЛЬНЫХ данных (scripts/extracted.json).
Добавляет: историю KPI по месяцам, бонусы, факты, геймификацию (звания/ордена/звёзды),
рекомендации с фактами (тикетами), заголовок «Мои результаты».
Запуск: PYTHONUTF8=1 python scripts/generate_data.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "scripts", "extracted.json")
OUT = os.path.join(ROOT, "assets", "js", "data.js")

MONTH_LABEL = {"2026-04": "Апр 2026", "2026-05": "Май 2026", "2026-06": "Июн 2026", "2026-07": "Июл 2026"}

METRICS = {
    "quality":      {"label": "Качество",       "icon": "ph-shield-check", "color": "#22d3ee",
                     "desc": "Точность выполнения задач, отсутствие возвратов и рекламаций"},
    "learnability": {"label": "Обучаемость",    "icon": "ph-graduation-cap", "color": "#a78bfa",
                     "desc": "Скорость освоения нового, работа с БЗ, снижение повторных вопросов"},
    "initiative":   {"label": "Инициатива",     "icon": "ph-rocket-launch", "color": "#fbbf24",
                     "desc": "Готовность брать на себя, предлагать улучшения, проактивность"},
    "engagement":   {"label": "Вовлечённость",  "icon": "ph-users-three", "color": "#34d399",
                     "desc": "Командность, доступность, помощь коллегам, участие в жизни отдела"},
    "discipline":   {"label": "Требования к работе", "icon": "ph-clipboard-text", "color": "#fb7185",
                     "desc": "Соблюдение регламентов, оформление задач, дисциплина"},
}
MKEYS = list(METRICS.keys())

# ---------- курируемый контент (не из чата) ----------
CONTENT = {
    "yakovlenkov": {
        "shortName": "Владислав", "fullName": "Яковленков Владислав Юрьевич",
        "role": "Главный специалист ТП (руководитель специалистов, заместитель руководителя)",
        "siteTitle": "Штурманская рубка",
        "tagline": "Держит курс команды: распределение, контроль, развитие. KPI по нему не ведётся — он руководитель.",
        "personal": "Ты — мозг отдела. Следующий шаг — перевести контроль и супервайзинг в автоматизацию, чтобы команда работала без твоей ручной включённости.",
        "literature": [
            {"title": "Пятая дисциплина", "author": "Питер Сенге", "type": "Книга", "why": "Системное мышление для управления командой", "url": "https://www.litres.ru/book/piter-senge/pyataya-disciplina-127436/"},
            {"title": "Скорость доверия", "author": "Стивен Кови мл.", "type": "Книга", "why": "Доверие как управленческий актив", "url": "https://www.litres.ru/book/stiven-m-r-kovi/skorost-doveriya-144948/"},
            {"title": "ITIL 4 Foundation", "author": "Axelos", "type": "Сертификация", "why": "Стандарт ITSM, язык сервис-менеджмента", "url": "https://www.axelos.com/certifications/itil-4-foundation"},
        ],
        "links": [
            {"label": "База знаний отдела", "url": "#", "icon": "ph-books"},
            {"label": "Дашборд SLA", "url": "#", "icon": "ph-gauge"},
            {"label": "n8n / автоматизация", "url": "#", "icon": "ph-cpu"},
        ],
        "custom": {
            "strengths": [
                ["Развитие команды", "Замечает нюансы в работе специалистов, открыто говорит о них руководителю"],
                ["ИИ и автоматизация", "Начал осваивать ИИ-технологии и автоматизацию процессов"],
                ["Замещение руководителя", "Отлично замещал в отпуске, продвинул запуск пилота по линиям техподдержки"],
            ],
            "growth": [
                {"problem": "Инициатива в управлении", "ticket": "—", "effect": "Ждёт команды «фас» вместо собственных предложений", "cause": "Привычка быть исполнителем, а не архитектором"},
                {"problem": "Самостоятельность решений", "ticket": "—", "effect": "По каждому вопросу идёт к руководителю", "cause": "Не делегирована ответственность за решения"},
                {"problem": "Автоматизация контроля", "ticket": "—", "effect": "Контроль держится на ручной включённости", "cause": "Не выстроена система чек-поинтов и супервайзинга"},
            ],
            "recommendations": [
                {"action": "Автоматизировать контроль работы специалистов (n8n + Zabbix + дашборд)", "result": "Контроль без ручной проверки каждого шага", "deadline": "Сен 2026", "fact": "Руководитель: «окунуться в автоматизацию — автоматизировать контроль работы специалистов, супервайзинг»"},
                {"action": "Раз в месяц приносить план улучшения (Jira/связь/обучение) с профитом для SLA", "result": "Инициатива вместо ожидания команд", "deadline": "Окт 2026", "fact": "Апрель: «хотелось бы больше инициативы в управлении специалистами»"},
                {"action": "Принимать операционные решения самостоятельно, фиксируя итог для руководителя", "result": "Руководитель разгружен от «каждого чиха»", "deadline": "Окт 2026", "fact": "Апрель: «научиться принимать самостоятельно важные решения»"},
            ],
        },
    },
    "frolov": {
        "shortName": "Павел", "fullName": "Фролов Павел Александрович",
        "role": "Ведущий специалист ТП (корп. связь, обслуживание ЦО, склады)",
        "siteTitle": "Мастер связи",
        "tagline": "Корпоративная связь, ЦО и склады — его стихия.",
        "personal": "Ты — фундамент связи. Переведи экспертизу из головы в регламенты и автоматизацию — и станешь незаменим без перегрузки.",
        "literature": [
            {"title": "The Phoenix Project", "author": "Джин Ким", "type": "Книга", "why": "Как IT-процессы влияют на бизнес", "url": "https://itrevolution.com/product/the-phoenix-project/"},
            {"title": "ITIL 4: Drive Stakeholder Value", "author": "Axelos", "type": "Сертификация", "why": "Ценность сервиса для бизнеса", "url": "https://www.axelos.com/certifications/itil-4"},
            {"title": "Грокаем алгоритмы", "author": "Адитья Бхаргава", "type": "Книга", "why": "База для сетей и оптимизации", "url": "https://www.piter.com/product/grokaem-algoritmy"},
        ],
        "links": [
            {"label": "Схемы связи", "url": "#", "icon": "ph-graph"},
            {"label": "Складской учёт", "url": "#", "icon": "ph-package"},
            {"label": "Мониторинг узлов", "url": "#", "icon": "ph-activity"},
        ],
    },
    "melnikov": {
        "shortName": "Алексей", "fullName": "Мельников Алексей Сергеевич",
        "role": "Специалист ТП (корп. связь, замещение)",
        "siteTitle": "Надёжный резерв",
        "tagline": "Замещает, подхватывает, держит SLA.",
        "personal": "Ты надёжный. Следующий шаг — не молчать о проблемах, а сообщать сразу и контролировать задачи до конца.",
        "literature": [
            {"title": "Драйв", "author": "Дэниел Пинк", "type": "Книга", "why": "Что мотивирует на инициативу", "url": "https://www.litres.ru/book/deniel-pink/drayv-10142213/"},
            {"title": "ITIL 4 Foundation", "author": "Axelos", "type": "Сертификация", "why": "База сервис-менеджмента", "url": "https://www.axelos.com/certifications/itil-4-foundation"},
            {"title": "Атомные привычки", "author": "Джеймс Клир", "type": "Книга", "why": "Как выстроить системный рост", "url": "https://www.litres.ru/book/dzheyms-klir/atomnye-privychki-40480030/"},
        ],
        "links": [
            {"label": "Курс по ITIL", "url": "#", "icon": "ph-graduation-cap"},
            {"label": "База знаний", "url": "#", "icon": "ph-books"},
            {"label": "График дежурств", "url": "#", "icon": "ph-calendar"},
        ],
    },
    "khasanov": {
        "shortName": "Родион", "fullName": "Хасанов Родион Равильевич",
        "role": "Специалист ТП",
        "siteTitle": "Универсальный боец",
        "tagline": "Берёт любые тикеты и доводит до конца.",
        "personal": "Объём — твоя сила, но глубина решает. Разбирай корневые причины, и повторные тикеты упадут сами.",
        "literature": [
            {"title": "Грокаем алгоритмы", "author": "Адитья Бхаргава", "type": "Книга", "why": "Системное понимание устройства систем", "url": "https://www.piter.com/product/grokaem-algoritmy"},
            {"title": "TCP/IP для всех", "author": "—", "type": "Курс", "why": "База сетевой диагностики", "url": "https://habr.com/ru/hubs/networks/"},
            {"title": "Сила воли", "author": "Келли Макгонигал", "type": "Книга", "why": "Дисциплина на длинной дистанции", "url": "https://www.litres.ru/book/kelli-makgonigal/sila-voli-6273271/"},
        ],
        "links": [
            {"label": "Хабр: сети", "url": "https://habr.com/ru/hubs/networks/", "icon": "ph-globe"},
            {"label": "База знаний", "url": "#", "icon": "ph-books"},
            {"label": "Разборы инцидентов", "url": "#", "icon": "ph-magnifying-glass"},
        ],
    },
    "pestovsky": {
        "shortName": "Георгий", "fullName": "Пестовский Георгий Александрович",
        "role": "Специалист ТП (складской учёт ИТ-оборудования)",
        "siteTitle": "Хранитель склада",
        "tagline": "Учёт ИТ-оборудования без расхождений.",
        "personal": "Твои системные подходы — сильная сторона. Развивай их и закрой слабое место — планирование и сроки.",
        "literature": [
            {"title": "Системное мышление", "author": "—", "type": "Курс", "why": "Склад как часть цепочки поставок", "url": "https://www.coursera.org/learn/systems-thinking"},
            {"title": "Атомные привычки", "author": "Джеймс Клир", "type": "Книга", "why": "Малые улучшения каждый день", "url": "https://www.litres.ru/book/dzheyms-klir/atomnye-privychki-40480030/"},
            {"title": "Управление запасами", "author": "—", "type": "Статьи", "why": "Современные подходы к учёту", "url": "https://habr.com/ru/search/?q=inventory+management"},
        ],
        "links": [
            {"label": "Складской учёт", "url": "#", "icon": "ph-package"},
            {"label": "Заявки на технику", "url": "#", "icon": "ph-devices"},
            {"label": "База знаний", "url": "#", "icon": "ph-books"},
        ],
    },
    "eliseev": {
        "shortName": "Антон", "fullName": "Елисеев Антон Андреевич",
        "role": "Специалист ТП (управление базой знаний)",
        "siteTitle": "Хранитель знаний",
        "tagline": "База знаний и её наполнение — его зона.",
        "personal": "Сильная вовлечённость — твой козырь. Прокачай техническую глубину и оформление задач.",
        "literature": [
            {"title": "ITIL 4 Foundation", "author": "Axelos", "type": "Сертификация", "why": "Системная база сервис-менеджмента", "url": "https://www.axelos.com/certifications/itil-4-foundation"},
            {"title": "Атомные привычки", "author": "Джеймс Клир", "type": "Книга", "why": "Фундамент личного роста", "url": "https://www.litres.ru/book/dzheyms-klir/atomnye-privychki-40480030/"},
            {"title": "Грокаем алгоритмы", "author": "Адитья Бхаргава", "type": "Книга", "why": "Техническая база", "url": "https://www.piter.com/product/grokaem-algoritmy"},
        ],
        "links": [
            {"label": "База знаний", "url": "#", "icon": "ph-books"},
            {"label": "Разборы инцидентов", "url": "#", "icon": "ph-magnifying-glass"},
        ],
    },
    "zavyalov": {
        "shortName": "Максим", "fullName": "Завьялов Максим Вячеславович",
        "role": "Специалист ТП (ночная смена — «один в поле воин»)",
        "siteTitle": "Ночной дозор",
        "tagline": "Держит поддержку, пока все спят.",
        "personal": "Ты тот, кто не даёт SLA рухнуть ночью. Сделай вклад видимым: пиши отчёты, делись, предлагай.",
        "literature": [
            {"title": "The Phoenix Project", "author": "Джин Ким", "type": "Книга", "why": "Ценность незаметной, но критичной работы", "url": "https://itrevolution.com/product/the-phoenix-project/"},
            {"title": "Как завоёвывать друзей", "author": "Дейл Карнеги", "type": "Книга", "why": "Коммуникация через смены", "url": "https://www.litres.ru/book/deyl-karnegi/kak-zavoevyvat-druzey-i-okazyvat-vliyanie-na-ludey-24136145/"},
            {"title": "ITIL 4 Foundation", "author": "Axelos", "type": "Сертификация", "why": "Структура процессов", "url": "https://www.axelos.com/certifications/itil-4-foundation"},
        ],
        "links": [
            {"label": "График смен", "url": "#", "icon": "ph-moon"},
            {"label": "Ночные отчёты", "url": "#", "icon": "ph-file-text"},
            {"label": "Чат команды", "url": "#", "icon": "ph-chat-circle-text"},
        ],
    },
    "bolgov": {
        "shortName": "Андрей", "fullName": "Болгов Андрей Владимирович",
        "role": "Специалист ТП (ребрендинг офисов)",
        "siteTitle": "Мастер ребрендинга",
        "tagline": "Превращает офисы в новые без сбоев.",
        "personal": "Ты двигатель перемен. Закрепляй успех в чек-листах и БЗ, и твой опыт будет работать даже без тебя.",
        "literature": [
            {"title": "Управление проектами", "author": "—", "type": "Курс", "why": "Структура проектной работы", "url": "https://www.coursera.org/learn/project-management"},
            {"title": "TCP/IP для всех", "author": "—", "type": "Курс", "why": "Сетевая база для инцидентов", "url": "https://habr.com/ru/hubs/networks/"},
            {"title": "Сила привычки", "author": "Чарлз Дахигг", "type": "Книга", "why": "Как внедрять процессы", "url": "https://www.litres.ru/book/charlz-dahigg/sila-privychki-7498852/"},
        ],
        "links": [
            {"label": "План ребрендинга", "url": "#", "icon": "ph-map-trifold"},
            {"label": "Чек-листы (БЗ)", "url": "#", "icon": "ph-list-checks"},
            {"label": "Фотоотчёты офисов", "url": "#", "icon": "ph-image"},
        ],
    },
    "yuryev": {
        "shortName": "Сергей", "fullName": "Юрьев Сергей Олегович",
        "role": "Специалист ТП",
        "siteTitle": "Надёжный тыл",
        "tagline": "Стабильно закрывает очередь, без сюрпризов.",
        "personal": "Стабильность без роста — это медленный спуск. Начни с 2 часов обучения в неделю.",
        "literature": [
            {"title": "Атомные привычки", "author": "Джеймс Клир", "type": "Книга", "why": "Малые шаги к большим результатам", "url": "https://www.litres.ru/book/dzheyms-klir/atomnye-privychki-40480030/"},
            {"title": "Драйв", "author": "Дэниел Пинк", "type": "Книга", "why": "Найти внутреннюю мотивацию", "url": "https://www.litres.ru/book/deniel-pink/drayv-10142213/"},
            {"title": "Грокаем алгоритмы", "author": "Адитья Бхаргава", "type": "Книга", "why": "База технического мышления", "url": "https://www.piter.com/product/grokaem-algoritmy"},
        ],
        "links": [
            {"label": "План обучения", "url": "#", "icon": "ph-graduation-cap"},
            {"label": "База знаний", "url": "#", "icon": "ph-books"},
            {"label": "Ментор", "url": "#", "icon": "ph-user-focus"},
        ],
    },
    "pospelova": {
        "shortName": "Екатерина", "fullName": "Поспелова Екатерина Алексеевна",
        "role": "Специалист по корпоративной связи",
        "siteTitle": "Голос команды",
        "tagline": "Связь и коммуникации — её конёк.",
        "personal": "Ты растёшь быстрее всех. Не прячь достижения — делись ими и бери наставничество.",
        "literature": [
            {"title": "Сначала скажите «нет»", "author": "Джим Кэмп", "type": "Книга", "why": "Переговоры и приоритеты", "url": "https://www.litres.ru/book/dzhim-kemp/snachala-skazhite-net-158041/"},
            {"title": "ITIL 4: Drive Stakeholder Value", "author": "Axelos", "type": "Сертификация", "why": "Ценность для бизнеса и заказчиков", "url": "https://www.axelos.com/certifications/itil-4"},
            {"title": "Публичные выступления", "author": "—", "type": "Курс", "why": "Презентации и видимость достижений", "url": "https://www.coursera.org/learn/public-speaking"},
        ],
        "links": [
            {"label": "Регламенты связи", "url": "#", "icon": "ph-phone"},
            {"label": "Дашборд инцидентов", "url": "#", "icon": "ph-chart-line"},
            {"label": "Чат команды", "url": "#", "icon": "ph-chat-circle-text"},
        ],
    },
}

# ---------- генерация рекомендаций из фактов ----------
def tickets_of(text):
    return re.findall(r"HELP-\d+", text)

THEMES = [
    ("sla", ["затян", "sla", "просроч", "срок", "вовремя", "своевременно", "держал задачу", "не перевёл"],
     "Контролировать сроки: SLA-напоминания за 24 ч + эскалация при риске просрочки",
     "Просрочки и сгоревшие SLA → ноль"),
    ("comments", ["комментар", "обратн", "сообщил", "сообщить", "разъясн", "статус"],
     "Оставлять внешние комментарии и актуализировать статус в каждой задаче",
     "Меньше уточняющих вопросов от пользователей и авторов"),
    ("knowledge", ["не знает", "не знал", "бз", "как оформ", "как добав", "статья", "регламент"],
     "Перед нестандартной операцией проверять БЗ; нет статьи — создать",
     "Меньше ошибок по регламентам, знания фиксируются в базе"),
    ("tech", ["настроил", "неверно", "sip", "принтер", "spool", "очередь", "моноблок", "пк ", "логин", "права"],
     "Прокачать базовую диагностику (сеть, печать, ОС) на практике/курсе",
     "Типовые инциденты решаются быстрее, без эскалации"),
    ("planning", ["контролир", "планиров", "делегир", "висят", "копят", "фокус", "самотёк"],
     "Вести личный план задач и делегировать то, что не успеваешь сам",
     "Нет висящих/просроченных задач, нагрузка равномерная"),
    ("initiative", ["инициатив", "пассивн", "предложен", "мало", "проактив"],
     "Раз в месяц приносить одно предложение по улучшению процесса",
     "Проактивность даёт вклад в командные улучшения"),
]

def gen_recommendations(negatives, kpi):
    recs, used = [], set()
    for neg in sorted(negatives, key=lambda x: -x["value"]):
        text = neg["text"].lower()
        tks = tickets_of(neg["text"])
        for key, kws, action, result in THEMES:
            if key in used:
                continue
            if any(k in text for k in kws):
                fact = (tks[0] + " · " + neg["text"][:70]) if tks else neg["text"][:90]
                recs.append({"action": action, "result": result,
                             "deadline": "Сен 2026", "fact": fact, "ticket": tks[0] if tks else ""})
                used.add(key)
                break
        if len(recs) >= 3:
            break
    if kpi:
        if len(recs) < 3 and kpi.get("learnability", 0) < 8:
            recs.append({"action": "Выделить 2 ч/нед на обучение по согласованному плану",
                         "result": "Рост обучаемости и скорости", "deadline": "Сен 2026",
                         "fact": f"Обучаемость сейчас {kpi.get('learnability')}/10 — ниже целевых 8", "ticket": ""})
        if len(recs) < 3 and kpi.get("initiative", 0) < 7:
            recs.append({"action": "Раз в месяц предлагать одно улучшение в ретро/чат",
                         "result": "Рост инициативы", "deadline": "Окт 2026",
                         "fact": f"Инициатива {kpi.get('initiative')}/10 — есть куда расти", "ticket": ""})
    if len(recs) < 3:
        recs.append({"action": "Разбирать 1 сложный кейс в неделю до корневой причины",
                     "result": "Рост технической глубины", "deadline": "Окт 2026",
                     "fact": "Системная рекомендация на основе месячных фактов", "ticket": ""})
    return recs[:3]

# ---------- геймификация ----------
def awards_for(emp):
    a = []
    kpi = emp.get("current")
    if emp["id"] == "yakovlenkov":
        a.append({"icon": "ph-crown", "title": "Руководитель", "color": "#fbbf24",
                  "reason": "Главный специалист — KPI не ведётся, оценивается команда"})
        return a
    if not kpi:
        return a
    avg = emp["avg"]
    if avg >= 9:
        a.append({"icon": "ph-trophy", "title": "Легенда", "color": "#fbbf24", "reason": "Средний KPI ≥ 9"})
    elif avg >= 8:
        a.append({"icon": "ph-medal", "title": "Профи", "color": "#cbd5e1", "reason": "Средний KPI ≥ 8"})
    elif avg >= 7:
        a.append({"icon": "ph-medal", "title": "Развивающийся", "color": "#d97706", "reason": "Средний KPI ≥ 7"})
    else:
        a.append({"icon": "ph-seedling", "title": "На старте", "color": "#8b96a8", "reason": "Есть зона роста"})
    if emp.get("rank") == 1:
        a.append({"icon": "ph-crown", "title": "Топ месяца", "color": "#22d3ee", "reason": "1-е место по среднему KPI"})
    if kpi.get("quality") == 10:
        a.append({"icon": "ph-shield-check", "title": "Безупречное качество", "color": "#22d3ee", "reason": "Качество 10/10"})
    if kpi.get("engagement") == 10:
        a.append({"icon": "ph-users-three", "title": "Командный дух", "color": "#34d399", "reason": "Вовлечённость 10/10"})
    if kpi.get("initiative") == 10:
        a.append({"icon": "ph-rocket-launch", "title": "Мастер инициативы", "color": "#fbbf24", "reason": "Инициатива 10/10"})
    if all(v == 10 for v in kpi.values()):
        a.append({"icon": "ph-star-four", "title": "Идеальная пятёрка", "color": "#fbbf24", "reason": "Все 5 метрик = 10/10"})
    if emp.get("growth_delta", 0) >= 1:
        a.append({"icon": "ph-trend-up", "title": "Прорыв месяца", "color": "#34d399", "reason": "Рост среднего KPI ≥ +1 за месяц"})
    return a

# ---------- стабильные неугadываемые слаги (URL персональных страниц) ----------
SLUGS = {
    "yakovlenkov": "38bdf40f5090", "frolov": "5414335d1bd0", "melnikov": "3def188ccc72",
    "khasanov": "114778baa83f", "pestovsky": "9f4f056f3e64", "eliseev": "f20f3afe5d45",
    "zavyalov": "a9cb0e50ea70", "bolgov": "e5d35a6fc921", "yuryev": "8b36020d00c7",
    "pospelova": "d2b44b366961",
}

# ---------- сборка ----------
def build():
    real = json.load(open(EXT, encoding="utf-8"))
    months = sorted({m for e in real.values() for m in e["months"]})
    employees = []
    for eid, content in CONTENT.items():
        rd = real.get(eid, {"months": {}})
        history = []
        for m in months:
            row = {"month": MONTH_LABEL.get(m, m)}
            d = rd["months"].get(m, {})
            k = d.get("kpi")
            for key in MKEYS:
                row[key] = (k.get(key) if k else None)
            row["bonus"] = d.get("bonus")
            history.append(row)
        last_with_kpi = [h for h in history if h.get("quality") is not None]
        current = {key: last_with_kpi[-1][key] for key in MKEYS} if last_with_kpi else None
        avg = round(sum(current.values()) / 5, 2) if current else None
        # рост среднего vs предыдущий месяц с KPI
        growth_delta = 0
        if len(last_with_kpi) >= 2:
            a = sum(last_with_kpi[-2][k] for k in MKEYS) / 5
            b = sum(last_with_kpi[-1][k] for k in MKEYS) / 5
            growth_delta = round(b - a, 2)
        # звёзды за рост (vs предыдущий месяц)
        stars = 0
        if len(last_with_kpi) >= 2:
            stars = sum(1 for k in MKEYS if last_with_kpi[-1][k] > last_with_kpi[-2][k])
        latest = rd["months"].get(months[-1], {})
        emp = {
            "id": eid,
            "slug": SLUGS.get(eid, eid),
            "fullName": content["fullName"], "shortName": content["shortName"],
            "role": content["role"], "siteTitle": content["siteTitle"],
            "tagline": content["tagline"], "personal": content["personal"],
            "literature": content["literature"], "links": content["links"],
            "status": "active",
            "history": history,
            "current": current, "avg": avg, "growth_delta": growth_delta, "stars": stars,
            "bonuses": latest.get("money", []),
            "strengths": content.get("custom", {}).get("strengths", []) or
                          [[x["text"], "Отмечено руководителем"] for x in latest.get("positives", [])][:4],
            "growth": content.get("custom", {}).get("growth", []) or
                      [{"problem": n["text"], "ticket": tickets_of(n["text"]) or "—"} for n in latest.get("negatives", [])][:8],
            "recommendations": content.get("custom", {}).get("recommendations", []) or
                               gen_recommendations(latest.get("negatives", []), current),
        }
        employees.append(emp)

    # рейтинг по avg (у кого нет KPI — в конец)
    ranked = sorted(employees, key=lambda e: -(e["avg"] if e["avg"] is not None else -1))
    for i, e in enumerate(ranked, 1):
        e["rank"] = i if e["avg"] is not None else None
    for e in employees:
        e["awards"] = awards_for(e)

    data = {
        "meta": {"title": "Моя команда ОТП", "subtitle": "Отдел технической поддержки · аналитика эффективности",
                 "updated": MONTH_LABEL[months[-1]], "demo": False},
        "metrics": METRICS,
        "months": [MONTH_LABEL[m] for m in months],
        "employees": employees,
    }
    return data

def main():
    data = build()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    js = "/* РЕАЛЬНЫЕ данные (июль 2026). Источник: scripts/extracted.json */\n"
    js += "window.OTP_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"OK -> {OUT}")
    for e in data["employees"]:
        kpi = e["current"]
        ks = " ".join(str(kpi[k]) for k in MKEYS) if kpi else "(нет KPI)"
        print(f"  #{str(e['rank']):>2} {e['fullName']:<38} avg={e['avg']}  [{ks}]  звёзд={e['stars']} наград={len(e['awards'])}")

if __name__ == "__main__":
    main()
