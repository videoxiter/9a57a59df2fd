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
RU_MONTH_ABBR = {1: "Янв", 2: "Фев", 3: "Мар", 4: "Апр", 5: "Май", 6: "Июн",
                 7: "Июл", 8: "Авг", 9: "Сен", 10: "Окт", 11: "Ноя", 12: "Дек"}


def month_label(m):
    """Ярлык месяца для любого YYYY-MM: новые месяцы подхватываются автоматически."""
    if m in MONTH_LABEL:
        return MONTH_LABEL[m]
    try:
        y, mm = m.split("-")
        return f"{RU_MONTH_ABBR[int(mm)]} {y}"
    except Exception:
        return m

METRICS = {
    "quality":      {"label": "Качество",       "icon": "ph-shield-check", "emoji": "✅", "color": "#22d3ee",
                     "desc": "Точность выполнения задач, отсутствие возвратов и рекламаций"},
    "learnability": {"label": "Обучаемость",    "icon": "ph-graduation-cap", "emoji": "🎓", "color": "#a78bfa",
                     "desc": "Скорость освоения нового, работа с БЗ, снижение повторных вопросов"},
    "initiative":   {"label": "Инициатива",     "icon": "ph-rocket-launch", "emoji": "⚡", "color": "#fbbf24",
                     "desc": "Готовность брать на себя, предлагать улучшения, проактивность"},
    "engagement":   {"label": "Вовлечённость",  "icon": "ph-users-three", "emoji": "👥", "color": "#34d399",
                     "desc": "Командность, доступность, помощь коллегам, участие в жизни отдела"},
    "discipline":   {"label": "Требования к работе", "icon": "ph-clipboard-text", "emoji": "📋", "color": "#fb7185",
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
                {"zone": "Управление и контроль", "method": "Автоматизировать контроль работы специалистов (n8n + Zabbix + дашборд)", "result": "Контроль без ручной проверки каждого шага", "deadline": "Сен 2026", "fact": "Руководитель: «окунуться в автоматизацию — автоматизировать контроль работы специалистов, супервайзинг»"},
                {"zone": "Инициатива", "method": "Раз в месяц приносить план улучшения (Jira/связь/обучение) с профитом для SLA", "result": "Инициатива вместо ожидания команд", "deadline": "Окт 2026", "fact": "Апрель: «хотелось бы больше инициативы в управлении специалистами»"},
                {"zone": "Самостоятельность", "method": "Принимать операционные решения самостоятельно, фиксируя итог для руководителя", "result": "Руководитель разгружен от «каждого чиха»", "deadline": "Окт 2026", "fact": "Апрель: «научиться принимать самостоятельно важные решения»"},
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
     "Сроки и SLA", "Контролировать сроки: SLA-напоминания за 24 ч + эскалация при риске просрочки", "Просрочки и сгоревшие SLA → ноль"),
    ("comments", ["комментар", "обратн", "сообщил", "сообщить", "разъясн", "статус"],
     "Коммуникация", "Оставлять внешние комментарии и актуализировать статус в каждой задаче", "Меньше уточняющих вопросов от пользователей и авторов"),
    ("knowledge", ["не знает", "не знал", "бз", "как оформ", "как добав", "статья", "регламент"],
     "Знание процессов", "Перед нестандартной операцией проверять БЗ; нет статьи — создать", "Меньше ошибок по регламентам, знания фиксируются в базе"),
    ("tech", ["настроил", "неверно", "sip", "принтер", "spool", "очередь", "моноблок", "пк ", "логин", "права"],
     "Технические навыки", "Прокачать базовую диагностику (сеть, печать, ОС) на практике/курсе", "Типовые инциденты решаются быстрее, без эскалации"),
    ("planning", ["контролир", "планиров", "делегир", "висят", "копят", "фокус", "самотёк"],
     "Планирование", "Вести личный план задач и делегировать то, что не успеваешь сам", "Нет висящих/просроченных задач, нагрузка равномерная"),
    ("initiative", ["инициатив", "пассивн", "предложен", "мало", "проактив"],
     "Инициатива", "Раз в месяц приносить одно предложение по улучшению процесса", "Проактивность даёт вклад в командные улучшения"),
]

THEME_RESOURCES = {
    "sla": ["soft", "itsm"], "comments": ["comm"], "knowledge": ["itsm", "os"],
    "tech": ["network", "os"], "planning": ["soft"], "initiative": ["automation", "soft"],
}

RESOURCE_POOL = {
    "network": [
        {"title": "Хабр — статьи по сетям и сетевым технологиям", "type": "Статьи", "url": "https://habr.com/ru/hubs/networks/articles/", "icon": "ph-globe"},
        {"title": "Основы компьютерных сетей — видеокурс (Stepik)", "type": "Видеокурс", "url": "https://stepik.org/course/1372", "icon": "ph-video"},
    ],
    "os": [
        {"title": "Хабр — системное администрирование", "type": "Статьи", "url": "https://habr.com/ru/hubs/sysadmin/articles/", "icon": "ph-globe"},
        {"title": "Хабр — Windows: установка и настройка", "type": "Статьи", "url": "https://habr.com/ru/hubs/windows/articles/", "icon": "ph-globe"},
    ],
    "itsm": [
        {"title": "Хабр — ITIL и управление ИТ-услугами", "type": "Статьи", "url": "https://habr.com/ru/hubs/itil/articles/", "icon": "ph-globe"},
        {"title": "ITIL 4 Foundation — курс на русском", "type": "Курс", "url": "https://stepik.org/course/80983", "icon": "ph-graduation-cap"},
    ],
    "automation": [
        {"title": "Хабр — автоматизация процессов (n8n, скрипты)", "type": "Статьи", "url": "https://habr.com/ru/search/?q=n8n+автоматизация", "icon": "ph-globe"},
    ],
    "soft": [
        {"title": "Атомные привычки — Джеймс Клир (ЛитРес)", "type": "Книга", "url": "https://www.litres.ru/book/dzheyms-klir/atomnye-privychki-40480030/", "icon": "ph-book-open"},
        {"title": "Хабр — тайм-менеджмент и личная эффективность", "type": "Статьи", "url": "https://habr.com/ru/search/?q=тайм-менеджмент", "icon": "ph-globe"},
    ],
    "comm": [
        {"title": "Как завоёвывать друзей — Дейл Карнеги (ЛитРес)", "type": "Книга", "url": "https://www.litres.ru/book/deyl-karnegi/kak-zavoevyvat-druzey-i-okazyvat-vliyanie-na-ludey-24136145/", "icon": "ph-book-open"},
        {"title": "Хабр — деловая коммуникация и переписка", "type": "Статьи", "url": "https://habr.com/ru/search/?q=деловая+коммуникация", "icon": "ph-globe"},
    ],
    "sales": [
        {"title": "Хабр — продажи в IT и работа с клиентом", "type": "Статьи", "url": "https://habr.com/ru/search/?q=продажи+IT", "icon": "ph-globe"},
    ],
    "inventory": [
        {"title": "Хабр — складской учёт и управление запасами", "type": "Статьи", "url": "https://habr.com/ru/search/?q=складской+учёт", "icon": "ph-globe"},
    ],
}

def resources_for(negatives):
    themes = []
    for neg in negatives:
        text = neg["text"].lower()
        for key, kws, _, _, _ in THEMES:
            if key in themes:
                continue
            if any(k in text for k in kws):
                themes.append(key)
                break
        if len(themes) >= 3:
            break
    if not themes:
        themes = ["itsm", "soft"]
    res, seen = [], set()
    for t in themes:
        for rkey in THEME_RESOURCES.get(t, []):
            for r in RESOURCE_POOL.get(rkey, []):
                if r["url"] not in seen:
                    res.append(r)
                    seen.add(r["url"])
    return res[:6]


def gen_recommendations(negatives, kpi):
    recs, used = [], set()
    for neg in sorted(negatives, key=lambda x: -x["value"]):
        text = neg["text"].lower()
        tks = tickets_of(neg["text"])
        for key, kws, zone, method, result in THEMES:
            if key in used:
                continue
            if any(k in text for k in kws):
                fact = (tks[0] + " · " + neg["text"][:70]) if tks else neg["text"][:90]
                recs.append({"zone": zone, "method": method, "result": result,
                             "deadline": "Сен 2026", "fact": fact, "ticket": tks[0] if tks else ""})
                used.add(key)
                break
        if len(recs) >= 4:
            break
    if kpi:
        if len(recs) < 4 and kpi.get("learnability", 0) < 8:
            recs.append({"zone": "Обучаемость", "method": "Выделить 2 ч/нед на обучение по согласованному плану",
                         "result": "Рост обучаемости и скорости", "deadline": "Сен 2026",
                         "fact": f"Обучаемость сейчас {kpi.get('learnability')}/10 — ниже целевых 8", "ticket": ""})
        if len(recs) < 4 and kpi.get("initiative", 0) < 7:
            recs.append({"zone": "Инициатива", "method": "Раз в месяц предлагать одно улучшение в ретро/чат",
                         "result": "Рост инициативы", "deadline": "Окт 2026",
                         "fact": f"Инициатива {kpi.get('initiative')}/10 — есть куда расти", "ticket": ""})
    if len(recs) < 4:
        recs.append({"zone": "Техническая глубина", "method": "Разбирать 1 сложный кейс в неделю до корневой причины",
                     "result": "Рост технической глубины", "deadline": "Окт 2026",
                     "fact": "Системная рекомендация на основе месячных фактов", "ticket": ""})
    return recs[:4]

# ---------- геймификация ----------
AWARDS_CATALOG = [
    {"id": "legend",    "icon": "ph-trophy",         "title": "Легенда",            "desc": "Средний KPI 9.0+ за месяц", "color": "#fbbf24", "glyph": "🔥"},
    {"id": "pro",       "icon": "ph-medal",          "title": "Профи",              "desc": "Средний KPI 8.0–8.9", "color": "#cbd5e1", "glyph": "😎"},
    {"id": "growing",   "icon": "ph-medal",          "title": "Развивающийся",      "desc": "Средний KPI 7.0–7.9", "color": "#d97706", "glyph": "📈"},
    {"id": "starter",   "icon": "ph-seedling",       "title": "На старте",          "desc": "Средний KPI ниже 7.0 — есть зона роста", "color": "#8b96a8", "glyph": "🤓"},
    {"id": "top",       "icon": "ph-crown",          "title": "Топ месяца",         "desc": "1-е место в рейтинге по среднему KPI", "color": "#22d3ee", "glyph": "🥇"},
    {"id": "perfect",   "icon": "ph-star-four",      "title": "Идеальная пятёрка",  "desc": "Все 5 метрик = 10/10", "color": "#fbbf24", "glyph": "5"},
    {"id": "quality",   "icon": "ph-shield-check",   "title": "Безупречное качество", "desc": "Качество 10/10 — без возвратов и рекламаций", "color": "#22d3ee", "glyph": "👍"},
    {"id": "learning",  "icon": "ph-graduation-cap", "title": "Гуру обучения",      "desc": "Обучаемость 10/10 — быстро осваивает новое", "color": "#a78bfa", "glyph": "📚"},
    {"id": "initiative","icon": "ph-rocket-launch",  "title": "Мастер инициативы",  "desc": "Инициатива 10/10 — проактивность и предложения", "color": "#fbbf24", "glyph": "💡"},
    {"id": "engagement","icon": "ph-users-three",    "title": "Командный дух",      "desc": "Вовлечённость 10/10 — командность и помощь коллегам", "color": "#34d399", "glyph": "🤝"},
    {"id": "discipline","icon": "ph-clipboard-text", "title": "Страж дисциплины",   "desc": "Требования к работе 10/10 — регламенты и порядок", "color": "#fb7185", "glyph": "🤖"},
    {"id": "breakthrough","icon": "ph-trend-up",     "title": "Прорыв месяца",      "desc": "Рост среднего KPI на +1 и больше за месяц", "color": "#34d399", "glyph": "🚀"},
    {"id": "stability", "icon": "ph-arrows-clockwise","title": "Стабильность",      "desc": "3+ месяца подряд без падения среднего KPI", "color": "#60a5fa", "glyph": "⚓"},
    {"id": "hero",      "icon": "ph-fire-extinguisher","title": "Герой-спасатель",  "desc": "Больше всех выходных смен / переработок за месяц", "color": "#f87171", "glyph": "🦸"},
    {"id": "changer",   "icon": "ph-sparkle",        "title": "Меняет мир!",        "desc": "Больше всех изменений в работе или отделе за месяц", "color": "#c084fc", "glyph": "🕶️"},
    {"id": "seller",    "icon": "ph-hand-coins",     "title": "Продавец месяца",   "desc": "Сделал хотя бы одну продажу ИТ-оборудования за месяц", "color": "#2dd4bf", "glyph": "💰"},
    {"id": "budget",    "icon": "ph-piggy-bank",     "title": "Вне бюджета!",      "desc": "Сократил ежемесячный расход отдела", "color": "#38bdf8", "glyph": "📉"},
]
CATALOG_BY_ID = {a["id"]: a for a in AWARDS_CATALOG}

def _award_objects(ids):
    return [dict(CATALOG_BY_ID[i]) for i in ids if i in CATALOG_BY_ID]

STRENGTH_PHRASES = {
    "quality": "Задачи делаешь сразу верно — без возвратов и рекламаций",
    "learnability": "Быстро осваиваешь новое и не повторяешь одних и тех же ошибок",
    "initiative": "Сам берёшь задачи и предлагаешь улучшения — проактивность",
    "engagement": "Командный игрок: на тебя можно положиться, помогаешь коллегам",
    "discipline": "Регламенты и порядок держишь чётко, без напоминаний",
}


def gen_strengths(row, kpi):
    """Сильные стороны (что получается круто) — из высоких метрик и фактов."""
    items = []
    if kpi:
        for key in MKEYS:
            if kpi[key] == 10:
                items.append([f"{METRICS[key]['label']} 10/10", STRENGTH_PHRASES[key]])
        for key in MKEYS:
            if 8 <= kpi[key] < 10:
                items.append([f"{METRICS[key]['label']} {kpi[key]}/10", STRENGTH_PHRASES[key]])
    for p in row.get("positives", []):
        items.append([p["text"], "Отмечено руководителем за месяц"])
    return items[:6]


def gen_growth(negatives):
    """Зоны роста — что поднять (зона) + как прокачать + факт-доказательство (тикет)."""
    items = []
    for n in negatives:
        text = n["text"].lower()
        zone, method = "Техническая глубина", "Разбирай сложные кейсы до корневой причины и фиксируй решение в БЗ"
        for key, kws, z, meth, _ in THEMES:
            if any(k in text for k in kws):
                zone, method = z, meth
                break
        items.append({"zone": zone, "advice": method, "fact": n["text"],
                      "ticket": tickets_of(n["text"]) or ""})
    return items


def awards_for_row(history, i, rank, manual_ids):
    """Награды за конкретный месяц (i) по KPI этого месяца."""
    row = history[i]
    kpi = {k: row[k] for k in MKEYS}
    ids = list(manual_ids)
    if any(v is None for v in kpi.values()):
        return _award_objects(ids)
    avg = sum(kpi.values()) / 5
    if avg >= 9:
        ids.append("legend")
    elif avg >= 8:
        ids.append("pro")
    elif avg >= 7:
        ids.append("growing")
    else:
        ids.append("starter")
    if rank == 1:
        ids.append("top")
    for key, aid in (("quality", "quality"), ("learnability", "learning"), ("initiative", "initiative"),
                     ("engagement", "engagement"), ("discipline", "discipline")):
        if kpi[key] == 10:
            ids.append(aid)
    if all(v == 10 for v in kpi.values()):
        ids.append("perfect")
    if i > 0:
        prev = history[i - 1]
        if all(prev[k] is not None for k in MKEYS):
            da = avg - sum(prev[k] for k in MKEYS) / 5
            if da >= 1:
                ids.append("breakthrough")
    if i >= 2:
        avgs, ok = [], True
        for j in range(i - 2, i + 1):
            if any(history[j][k] is None for k in MKEYS):
                ok = False
                break
            avgs.append(sum(history[j][k] for k in MKEYS) / 5)
        if ok and all(avgs[a] <= avgs[a + 1] for a in range(2)):
            ids.append("stability")
    return _award_objects(ids)


def accumulate_awards(history):
    """Накопленные награды: уникальные по id, с месяцами получения и счётчиком."""
    order = {a["id"]: i for i, a in enumerate(AWARDS_CATALOG)}
    acc = {}
    for row in history:
        for a in row.get("awards", []):
            if a["id"] not in acc:
                x = dict(a)
                x["months"] = [row["month"]]
                x["count"] = 1
                acc[a["id"]] = x
            else:
                acc[a["id"]]["months"].append(row["month"])
                acc[a["id"]]["count"] += 1
    return sorted(acc.values(), key=lambda x: order.get(x["id"], 99))

# ---------- стабильные неугadываемые слаги (URL персональных страниц) ----------
SLUGS = {
    "yakovlenkov": "38bdf40f5090", "frolov": "5414335d1bd0", "melnikov": "3def188ccc72",
    "khasanov": "114778baa83f", "pestovsky": "9f4f056f3e64", "eliseev": "f20f3afe5d45",
    "zavyalov": "a9cb0e50ea70", "bolgov": "e5d35a6fc921", "yuryev": "8b36020d00c7",
    "pospelova": "d2b44b366961",
}

# ---------- ручные награды (заполняет руководитель ежемесячно) ----------
# Ключ — id сотрудника, значение — {месяц "YYYY-MM": [id наград из AWARDS_CATALOG]}.
MANUAL_AWARDS = {
    # "frolov": {"2026-07": ["hero", "changer"]},
    # "bolgov": {"2026-07": ["seller"]},
    # "yakovlenkov": {"2026-07": ["budget"]},
}

# ---------- звёзды и уровень ----------
def star_change(prev_avg, cur_avg):
    delta = cur_avg - prev_avg
    if delta <= -1.0:
        return -1
    if delta > 0.0 or cur_avg >= 8.0:
        return 1
    return 0

def compute_stars(history):
    kpi_months = [h for h in history if h.get("quality") is not None]
    total = 0
    delta_month = 0
    if len(kpi_months) >= 2:
        avgs = [sum(h[k] for k in MKEYS) / 5 for h in kpi_months]
        for i in range(1, len(avgs)):
            ch = star_change(avgs[i - 1], avgs[i])
            total = max(0, total + ch)
            if i == len(avgs) - 1:
                delta_month = ch
    return total, delta_month

# ---------- сборка ----------
def build():
    real = json.load(open(EXT, encoding="utf-8"))
    months = sorted({m for e in real.values() for m in e["months"]})
    employees = []
    for eid, content in CONTENT.items():
        rd = real.get(eid, {"months": {}})
        custom = content.get("custom", {})
        history = []
        for m in months:
            row = {"key": m, "month": month_label(m)}
            d = rd["months"].get(m, {})
            k = d.get("kpi")
            for key in MKEYS:
                row[key] = (k.get(key) if k else None)
            row["bonus"] = d.get("bonus")
            negs = d.get("negatives", [])
            row["money"] = d.get("money", [])
            row["negatives"] = negs
            row["positives"] = d.get("positives", [])
            row["kpi"] = {key: row[key] for key in MKEYS}
            row["avg"] = round(sum(v for v in row["kpi"].values() if v is not None) / 5, 2) if k else None
            row["rank"] = None
            if eid == "yakovlenkov":
                row["strengths"] = custom.get("strengths", [])
                row["growth"] = [{"zone": g.get("problem", ""), "advice": g.get("effect", ""),
                                  "fact": g.get("cause", ""), "ticket": g.get("ticket", "")}
                                 for g in custom.get("growth", [])]
                row["recommendations"] = custom.get("recommendations", [])
            else:
                row["strengths"] = gen_strengths(row, k)
                row["growth"] = gen_growth(negs)
                row["recommendations"] = gen_recommendations(negs, k)
            history.append(row)
        employees.append({"eid": eid, "content": content, "history": history})

    # рейтинг по каждому месяцу (по avg, без KPI — в конец)
    for mi in range(len(months)):
        with_kpi = [e for e in employees if e["history"][mi]["avg"] is not None]
        ranked = sorted(with_kpi, key=lambda e: -e["history"][mi]["avg"])
        for pos, e in enumerate(ranked, 1):
            e["history"][mi]["rank"] = pos

    # награды за каждый месяц + накопление
    result = []
    for e in employees:
        eid, content, history = e["eid"], e["content"], e["history"]
        for i, row in enumerate(history):
            manual = MANUAL_AWARDS.get(eid, {}).get(row["key"], [])
            row["awards"] = awards_for_row(history, i, row["rank"], manual)

        last_with_kpi = [h for h in history if h.get("quality") is not None]
        current = {key: last_with_kpi[-1][key] for key in MKEYS} if last_with_kpi else None
        avg = round(sum(current.values()) / 5, 2) if current else None
        growth_delta = 0
        if len(last_with_kpi) >= 2:
            a = sum(last_with_kpi[-2][k] for k in MKEYS) / 5
            b = sum(last_with_kpi[-1][k] for k in MKEYS) / 5
            growth_delta = round(b - a, 2)
        stars_total, stars_delta = compute_stars(history)
        latest = history[-1]
        emp = {
            "id": eid, "slug": SLUGS.get(eid, eid),
            "fullName": content["fullName"], "shortName": content["shortName"],
            "role": content["role"], "siteTitle": content["siteTitle"],
            "tagline": content["tagline"], "personal": content["personal"],
            "literature": content["literature"],
            "resources": resources_for(latest.get("negatives", [])),
            "status": "active",
            "history": history,
            "current": current, "avg": avg, "growth_delta": growth_delta,
            "stars": stars_total, "stars_delta": stars_delta,
            "lvl": 1 + stars_total // 10, "stars_in_level": stars_total % 10,
            "bonuses": latest.get("money", []),
            "strengths": latest.get("strengths", []),
            "growth": latest.get("growth", []),
            "recommendations": latest.get("recommendations", []),
            "awards": accumulate_awards(history),
        }
        result.append(emp)

    # итоговый рейтинг (по последнему avg) — для leaderboard
    ranked = sorted(result, key=lambda e: -(e["avg"] if e["avg"] is not None else -1))
    for i, e in enumerate(ranked, 1):
        e["rank"] = i if e["avg"] is not None else None

    data = {
        "meta": {"title": "Моя команда ОТП", "subtitle": "Отдел технической поддержки · аналитика эффективности",
                 "updated": month_label(months[-1]), "demo": False},
        "metrics": METRICS,
        "awardsCatalog": AWARDS_CATALOG,
        "months": [month_label(m) for m in months],
        "employees": result,
    }
    return data

def main():
    data = build()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    js = f"/* РЕАЛЬНЫЕ данные ({data['meta']['updated']}). Источник: scripts/extracted.json + itogi/*.txt */\n"
    js += "window.OTP_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"OK -> {OUT}")
    for e in data["employees"]:
        kpi = e["current"]
        ks = " ".join(str(kpi[k]) for k in MKEYS) if kpi else "(нет KPI)"
        print(f"  #{str(e['rank']):>2} {e['fullName']:<38} avg={e['avg']}  LVL={e['lvl']} ⭐{e['stars_in_level']}/10 [{ks}]  наград={len(e['awards'])}")

if __name__ == "__main__":
    main()
