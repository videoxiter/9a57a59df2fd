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
                ["Опора в пиковые периоды", "Не прячется, когда отделу тяжело: три выходные смены в августе — «подставлю плечо, когда нужно»"],
                ["Инвестиция в инструменты", "Оплачивает и внедряет ИИ-инструменты — это актив отдела, который возвращается автоматизацией и скоростью"],
                ["Экспертиза полного цикла", "Держит связку «железо ↔ сеть ↔ ПО ↔ процессы»: редкая широта, которой нет ни у кого в команде"],
            ],
            "growth": [
                {"problem": "Инициатива в управлении", "ticket": "—", "effect": "Ждёт команды «фас» вместо собственных предложений", "cause": "Привычка быть исполнителем, а не архитектором"},
                {"problem": "Самостоятельность решений", "ticket": "—", "effect": "По каждому вопросу идёт к руководителю", "cause": "Не делегирована ответственность за решения"},
                {"problem": "Автоматизация контроля", "ticket": "—", "effect": "Контроль держится на ручной включённости", "cause": "Не выстроена система чек-поинтов и супервайзинга"},
                {"problem": "Передача экспертизы", "ticket": "—", "effect": "Остаёшься «единственным, кто умеет» — знания не масштабируются на команду", "cause": "ИИ и автоматизация освоены лично, без регламентов и обучения других"},
                {"problem": "Разгрузка от рутины", "ticket": "—", "effect": "Операционка съедает время, которое нужно на архитектуру", "cause": "Повторяющиеся задачи не делегированы специалистам"},
            ],
            "recommendations": [
                {"zone": "Управление и контроль", "method": "Автоматизировать контроль работы специалистов (n8n + Zabbix + дашборд)", "result": "Контроль без ручной проверки каждого шага", "deadline": "Сен 2026", "fact": "Руководитель: «окунуться в автоматизацию — автоматизировать контроль работы специалистов, супервайзинг»"},
                {"zone": "Инициатива", "method": "Раз в месяц приносить план улучшения (Jira/связь/обучение) с профитом для SLA", "result": "Инициатива вместо ожидания команд", "deadline": "Окт 2026", "fact": "Апрель: «хотелось бы больше инициативы в управлении специалистами»"},
                {"zone": "Самостоятельность", "method": "Принимать операционные решения самостоятельно, фиксируя итог для руководителя", "result": "Руководитель разгружен от «каждого чиха»", "deadline": "Окт 2026", "fact": "Апрель: «научиться принимать самостоятельно важные решения»"},
                {"zone": "Передача экспертизы", "method": "Собрать внутренний мини-курс по ИИ-инструментам и провести 2 сессии для команды", "result": "Инструменты работают без твоего постоянного участия", "deadline": "Окт 2026", "fact": "ИИ освоен лично — по итогам месяца команда ещё не пользуется твоими инструментами"},
                {"zone": "Проекты осени", "method": "Довести до теста три шага: «Фиксик 2.0», автодиагностика в n8n, супервайзинг L0", "result": "Роль технического лидера, подтверждённая результатом", "deadline": "Окт 2026", "fact": "План на сентябрь 2026: бот с 3 новыми сценариями, прототип диагностики, 3 алерта L0"},
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
    """Сильные стороны месяца: сначала факты руководителя, затем высокие метрики."""
    items = []
    for p in row.get("positives", []):
        items.append([p["text"], "Отмечено руководителем за месяц"])
    if kpi:
        for key in MKEYS:
            if kpi[key] == 10:
                items.append([f"{METRICS[key]['label']} 10/10", STRENGTH_PHRASES[key]])
        for key in MKEYS:
            if 8 <= kpi[key] < 10:
                items.append([f"{METRICS[key]['label']} {kpi[key]}/10", STRENGTH_PHRASES[key]])
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


MAX_LVL = 10
LVL_TITLES = [(1, "Новичок"), (2, "Посвящённый"), (3, "Боец"), (4, "Сержант"), (5, "Офицер"),
              (6, "Мастер"), (7, "Гуру"), (8, "Эксперт"), (9, "Король"), (10, "Легенда отдела")]


def lvl_title(lvl):
    """Игровое звание по уровню (для турнирной таблицы)."""
    title = "Новичок"
    for need, t in LVL_TITLES:
        if lvl >= need:
            title = t
    return title


def _uniq_by(items, key):
    """Уникальные элементы списка словарей по значению ключа (первое вхождение выигрывает)."""
    seen, out = set(), []
    for it in items:
        v = it.get(key)
        if v in seen:
            continue
        seen.add(v)
        out.append(it)
    return out


def build_leaderboard(result, exclude=("yakovlenkov",)):
    """Турнирная таблица команды: LVL + звёзды + награды (без ссылок на страницы)."""
    rows = []
    for e in result:
        if e["id"] in exclude or e["avg"] is None:
            continue
        rows.append({
            "id": e["id"], "name": e["fullName"], "short": e["shortName"],
            "lvl": e["lvl"], "stars": e["stars"], "starsInLevel": e["stars_in_level"],
            "avg": e["avg"], "growth": e["growth_delta"], "awards": len(e["awards"]),
            "glyphs": [a.get("glyph", "") for a in e["awards"][:5]],
            "title": lvl_title(e["lvl"]), "score": e["lvl"] * 10 + e["stars"],
        })
    rows.sort(key=lambda r: (-r["score"], -r["avg"], -r["awards"]))
    for i, r in enumerate(rows, 1):
        r["place"] = i
        up = rows[i - 2] if i > 1 else None
        down = rows[i] if i < len(rows) else None
        r["gapUp"] = (up["score"] - r["score"]) if up else None
        r["gapDown"] = (r["score"] - down["score"]) if down else None
    return rows


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
    # руководитель (Влад): награды по фактам его итогов — выходные смены, ИИ-проекты
    "yakovlenkov": {"2026-06": ["changer"], "2026-08": ["hero", "changer"]},
    # "frolov": {"2026-07": ["hero", "changer"]},
    # "bolgov": {"2026-07": ["seller"]},
}

# ---------- звёзды и уровень ----------
HOLD_THRESHOLD = 9.0        # удержание среднего KPI, с которого идёт звезда
DROP_THRESHOLD = 1.0        # падение среднего KPI, с которого снимается звезда
LOW_KPI_THRESHOLD = 5.0     # средний KPI ниже — критический провал
STAR_GAIN_CAP = 4           # максимум ⭐, которые можно заработать за месяц
STAR_LOSS_CAP = 3           # максимум ⭐, которые можно потерять за месяц
TENTH_AWARD_MODE = "same"   # "same" — ⭐ за каждые 10 ОДИНАКОВЫХ наград, "any" — за каждые 10 наград всего
NO_STAR_AWARDS = {"starter"}   # «На старте» звёзд не даёт
KPI_AWARD_RANK = {"starter": 1, "growing": 2, "pro": 3, "legend": 4}   # шкала «силы» KPI-наград


# ---------- ручные звёзды руководителя (заполняет руководитель ОТП) ----------
# Ключ — id сотрудника, значение — {"YYYY-MM": [{"stars": +1|-1, "reason": "за что именно"}]}.
MANUAL_STARS = {
    # "frolov": {"2026-08": [{"stars": 1, "reason": "в одиночку закрыл аварию на площадке за выходные"}]},
}


def compute_stars(history, eid):
    """Звёзды + журнал «за что» по каждому месяцу.

    Начислить можно до STAR_GAIN_CAP ⭐ за месяц (основания суммируются):
      • рост среднего KPI к прошлому месяцу;
      • удержание среднего KPI на HOLD_THRESHOLD и выше;
      • новая награда (кроме «На старте» и наград ниже уже полученной по шкале KPI);
      • каждые 10 накопленных одинаковых наград;
      • отдельная звезда руководителя — с указанием, за что именно.
    Потерять — до STAR_LOSS_CAP ⭐: снижение KPI на DROP_THRESHOLD и больше,
    средний KPI ниже LOW_KPI_THRESHOLD, решение руководителя.
    """
    # месяцы, которые вообще участвуют: с KPI или с наградами (у руководителя KPI может не быть)
    work = [h for h in history if h.get("quality") is not None or h.get("awards")]
    total, delta_month, log = 0, 0, []
    if not work:
        return total, delta_month, log
    avg_of = lambda h: round(sum(h[k] for k in MKEYS) / 5, 2) if h.get("quality") is not None else None
    counts = {}      # id награды -> сколько раз уже получена
    all_awards = 0   # всего наград (кроме «На старте») — для режима "any"
    best_rank = 0    # самая «сильная» KPI-награда из полученных ранее
    prev_avg = None  # средний KPI прошлого месяца с KPI

    for row in work:
        gains, losses, notes = [], [], []
        cur_avg = avg_of(row)
        started = cur_avg is not None and prev_avg is None   # первый месяц с KPI

        if started:
            notes.append(f"Точка отсчёта: средний KPI {cur_avg:.2f}. Звёзды за KPI идут со следующего месяца, награды — уже с этого.")
        elif cur_avg is not None:
            avgs_pair = (prev_avg, cur_avg)
            d = round(cur_avg - prev_avg, 2)
            if d > 0:
                gains.append((2, f"Средний KPI вырос: {prev_avg:.2f} → {cur_avg:.2f} (+{d:.2f}) — за рост +1 ⭐"))
            elif d <= -DROP_THRESHOLD:
                losses.append((1, f"Средний KPI упал: {prev_avg:.2f} → {cur_avg:.2f} ({d:.2f}) — падение на {DROP_THRESHOLD:.1f} и больше снимает ⭐"))
            if cur_avg >= HOLD_THRESHOLD:
                gains.append((3, f"Средний KPI удержан на {HOLD_THRESHOLD:.1f} и выше ({cur_avg:.2f}) — за удержание +1 ⭐"))
            if cur_avg < LOW_KPI_THRESHOLD:
                losses.append((2, f"Средний KPI ниже {LOW_KPI_THRESHOLD:.1f} ({cur_avg:.2f}) — критически низкий результат снимает ⭐"))

        # награды месяца: новые и «десятые»
        fresh, tenths = [], []
        for a in row.get("awards", []):
            aid = a["id"]
            rank = KPI_AWARD_RANK.get(aid, 0)
            if aid not in counts and aid not in NO_STAR_AWARDS:
                if rank and rank <= best_rank:
                    notes.append(f"«{a['title']}» ниже уже полученной награды по показателю KPI — звезда за неё не начисляется.")
                else:
                    fresh.append(a)
            counts[aid] = counts.get(aid, 0) + 1
            if rank > best_rank:
                best_rank = rank
            if aid not in NO_STAR_AWARDS:
                all_awards += 1
                if TENTH_AWARD_MODE == "any" and all_awards % 10 == 0:
                    tenths.append((a, all_awards, "всего"))
                elif TENTH_AWARD_MODE == "same" and counts[aid] % 10 == 0:
                    tenths.append((a, counts[aid], "одинаковых"))

        for a in fresh:
            gains.append((4, f"Новая награда «{a['title']}» {a.get('glyph', '')}".strip() + " — за первое получение +1 ⭐"))
        for a, n, word in tenths:
            gains.append((5, f"Наград «{a['title']}» накопилось {n} ({word}) — за каждые 10 наград +1 ⭐"))

        for m in MANUAL_STARS.get(eid, {}).get(row["key"], []):
            st = int(m.get("stars", 1))
            txt = m.get("reason", "особые заслуги перед отделом")
            if st >= 0:
                gains.append((1, f"Отдельная звезда руководителя (+{st} ⭐): {txt}"))
            else:
                losses.append((3, f"Звезда снята руководителем ({st} ⭐): {txt}"))

        gains.sort(key=lambda x: x[0])
        losses.sort(key=lambda x: x[0])
        kept_g = [t for _, t in gains[:STAR_GAIN_CAP]]
        kept_l = [t for _, t in losses[:STAR_LOSS_CAP]]
        if len(gains) > STAR_GAIN_CAP:
            notes.append(f"Оснований на {len(gains)} ⭐, но за месяц начисляется не больше {STAR_GAIN_CAP} ⭐.")
        if len(losses) > STAR_LOSS_CAP:
            notes.append(f"Оснований потерять {len(losses)} ⭐, но за месяц снимается не больше {STAR_LOSS_CAP} ⭐.")

        ch = len(kept_g) - len(kept_l)
        before = total
        total = max(0, total + ch)
        if total == 0 and before + ch < 0:
            notes.append("Ниже нуля звёзды не уходят.")
        if row is work[-1]:
            delta_month = ch
        reasons = kept_g + kept_l
        if not reasons:
            reasons = ["Оснований для звёзд в этом месяце нет — звёзды без изменений."]
        kind = "start" if started else ("gain" if ch > 0 else ("loss" if ch < 0 else "hold"))
        log.append({"key": row["key"], "month": row["month"],
                    "from": prev_avg, "to": cur_avg,
                    "delta": None if (prev_avg is None or cur_avg is None) else round(cur_avg - prev_avg, 2),
                    "stars": ch, "total": total, "reasons": reasons, "notes": notes,
                    "kind": kind, "reason": " ".join(reasons)})
        if cur_avg is not None:
            prev_avg = cur_avg
    return total, delta_month, log


# ---------- правила игры (раскрываются на персональной странице) ----------
RULE_STARS = [
    {"icon": "📈", "title": "+1 ⭐ за рост",
     "text": "Средний KPI за месяц вырос к прошлому месяцу — начисляется звезда."},
    {"icon": "🎯", "title": f"+1 ⭐ за удержание {HOLD_THRESHOLD:.1f}+",
     "text": f"Средний KPI удержан на {HOLD_THRESHOLD:.1f} и выше — это отдельное основание, звезда идёт дополнительно к звезде за рост."},
    {"icon": "🏅", "title": "+1 ⭐ за новую награду",
     "text": "Каждая награда, полученная впервые, даёт звезду — кроме «На старте» и тех наград, что ниже уже полученной по показателю KPI (например, была «Развивающийся», а стала «На старте»)."},
    {"icon": "🔟", "title": "+1 ⭐ за каждые 10 наград",
     "text": "Каждые 10 накопленных одинаковых наград одного вида дают звезду. «На старте» не считается."},
    {"icon": "👔", "title": "+1 ⭐ от руководителя ОТП",
     "text": "Отдельная звезда за конкретные заслуги, которые руководитель считает критически важными для отдела или компании. В журнале всегда написано, за что именно."},
    {"icon": "➕", "title": f"Лимит: до +{STAR_GAIN_CAP} ⭐ за месяц",
     "text": "Основания суммируются: за один месяц можно заработать не больше четырёх звёзд."},
    {"icon": "🔻", "title": "−1 ⭐ за снижение KPI",
     "text": f"Средний KPI упал на {DROP_THRESHOLD:.1f} и больше — звезда снимается. Падение меньше {DROP_THRESHOLD:.1f} звёзды не снимает."},
    {"icon": "🚨", "title": f"−1 ⭐ за KPI ниже {LOW_KPI_THRESHOLD:.1f}",
     "text": f"Если средний KPI опустился ниже {LOW_KPI_THRESHOLD:.1f} — звезда снимается."},
    {"icon": "📝", "title": "−1 ⭐ по решению руководителя",
     "text": "Снимается за конкретный проступок, и в журнале указано, за что именно."},
    {"icon": "➖", "title": f"Лимит: до −{STAR_LOSS_CAP} ⭐ за месяц",
     "text": "За один месяц можно потерять не больше трёх звёзд, ниже нуля звёзды не уходят."},
    {"icon": "🏆", "title": "10 ⭐ = +1 LVL",
     "text": f"Каждые 10 звёзд дают новый уровень, всего их {MAX_LVL}. Уровень не понижается — звёзды продолжают копиться внутри уровня."},
    {"icon": "📅", "title": "Отсчёт с первого месяца",
     "text": "Первый месяц с KPI — точка отсчёта: звёзды за KPI идут со второго месяца, а награды дают звёзды уже с первого."},
]

RULE_LEVELS = [
    {"lvl": 1, "stars": "0–9 ⭐", "title": "Новичок",
     "perks": ["Своя страница результатов: KPI по месяцам, план роста и напутствие",
               "Подбор учебных материалов под твои зоны роста"]},
    {"lvl": 2, "stars": "10–19 ⭐", "title": "Посвящённый",
     "perks": ["Приоритет при выборе даты и времени увольнительных"]},
    {"lvl": 3, "stars": "20–29 ⭐", "title": "Боец",
     "perks": ["Приоритет при выборе смен, при составлении графика на следующий месяц"]},
    {"lvl": 4, "stars": "30–39 ⭐", "title": "Сержант",
     "perks": ["Приоритет при выборе периода отпуска"]},
    {"lvl": 5, "stars": "40–49 ⭐", "title": "Офицер",
     "perks": ["Бонусные задачи с повышенной ставкой — в первую очередь тебе",
               "Возможность в приоритете выбрать себе линию поддержки (L1 или L2)"]},
    {"lvl": 6, "stars": "50–59 ⭐", "title": "Мастер",
     "perks": ["Статус наставника: ведёшь новичка и получаешь за это доплату",
               "Твои регламенты уходят в базу знаний отдела под твоим именем — твоё слово в ИНФО = закон"]},
    {"lvl": 7, "stars": "60–69 ⭐", "title": "Гуру",
     "perks": ["Своё направление в зоне твоей ответственности",
               "Возможность создать свою мини-команду по направлению"]},
    {"lvl": 8, "stars": "70–79 ⭐", "title": "Эксперт",
     "perks": ["Допуск к аудиту качества работы коллег",
               "Доступ к обучающим материалам и отдельное обучение самым передовым актуальным технологиям или направлениям"]},
    {"lvl": 9, "stars": "80–89 ⭐", "title": "Король",
     "perks": ["Замещение руководителя отдела",
               "Право заявить свою тему в план развития отдела"]},
    {"lvl": 10, "stars": "90+ ⭐", "title": "Легенда отдела",
     "perks": ["Участник L3",
               "Рекомендация на повышение грейда или должности",
               "Участие в распределении премиального фонда и планировании целей отдела"]},
]

RULES = {"stars": RULE_STARS, "levels": RULE_LEVELS, "lvlStep": 10, "maxLvl": MAX_LVL,
         "gainCap": STAR_GAIN_CAP, "lossCap": STAR_LOSS_CAP, "hold": HOLD_THRESHOLD,
         "drop": DROP_THRESHOLD, "low": LOW_KPI_THRESHOLD,
         "scoreFormula": "Очки турнира = LVL × 10 + ⭐"}

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
            # план роста и напутствие из txt руководителя (помесячно)
            row["planTxt"] = d.get("plan")
            row["mentor"] = d.get("mentorship", [])
            row["kpi"] = {key: row[key] for key in MKEYS}
            row["avg"] = round(sum(v for v in row["kpi"].values() if v is not None) / 5, 2) if k else None
            row["rank"] = None
            if eid == "yakovlenkov":
                # руководитель: плюсы/зоны = факты месяца из txt + курируемый контент (без дублей)
                strength_pairs = [[p["text"], "Отмечено руководителем за месяц"] for p in row.get("positives", [])]
                strength_pairs += [[s[0], s[1]] for s in custom.get("strengths", [])]
                growth_items = gen_growth(negs) + [
                    {"zone": g.get("problem", ""), "advice": g.get("effect", ""),
                     "fact": g.get("cause", ""), "ticket": g.get("ticket", "")}
                    for g in custom.get("growth", [])]
                recs = list(custom.get("recommendations", []))
                for extra in gen_recommendations(negs, None):
                    if len(recs) >= 6:
                        break
                    if all(extra["zone"] != r.get("zone") for r in recs):
                        recs.append(extra)
                seen_s, uniq_s = set(), []
                for s in strength_pairs:
                    if s[0] in seen_s:
                        continue
                    seen_s.add(s[0])
                    uniq_s.append(s)
                row["strengths"] = uniq_s[:8]
                row["growth"] = _uniq_by(growth_items, "zone")[:6]
                row["recommendations"] = recs[:6]
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
        stars_total, stars_delta, stars_log = compute_stars(history, eid)
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
            "stars": stars_total, "stars_delta": stars_delta, "starLog": stars_log,
            "lvl": min(MAX_LVL, 1 + stars_total // 10), "stars_in_level": stars_total % 10,
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

    # ---------- командные агрегаты (средние по специалистам с KPI; руководитель не входит) ----------
    team_members = [e for e in employees if e["eid"] != "yakovlenkov"]
    team_profile, team_avg = {}, {}
    for mi, m in enumerate(months):
        vals = [[e["history"][mi][k] for k in MKEYS] for e in team_members
                if all(e["history"][mi][k] is not None for k in MKEYS)]
        if vals:
            team_profile[m] = [round(sum(v[j] for v in vals) / len(vals), 2) for j in range(5)]
            team_avg[m] = round(sum(team_profile[m]) / 5, 2)

    data = {
        "meta": {"title": "Моя команда ОТП", "subtitle": "Отдел технической поддержки · аналитика эффективности",
                 "updated": month_label(months[-1]), "demo": False},
        "metrics": METRICS,
        "awardsCatalog": AWARDS_CATALOG,
        "rules": RULES,
        "months": [month_label(m) for m in months],
        "employees": result,
        "team": {"profileByMonth": team_profile, "avgByMonth": team_avg,
                 "memberCount": len(team_members), "updated": month_label(months[-1])},
        "leaderboard": build_leaderboard(result),
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
