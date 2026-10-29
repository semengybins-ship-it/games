const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN || 'ТВОЙ_БОТ_ФАЗЕР_ТОКЕН';
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// База данных игроков в памяти (для продакшна можно заменить на MongoDB/JSON)
const players = {};

// Список заказов (перенесено из твоей консольной версии)
const ORDERS = {
    1: {
        "title": "Заказ #1 (Учебный): снести аккаунт должника",
        "difficulty": "Лёгкий",
        "reward": 150,
        "rep": 5,
        "target_ip": "192.168.0.14",
        "account_id": "acc_8841",
        "desc": "Корпоративная база хранит просроченный аккаунт. Просканируйте порт, взломайте доступ, затем удалите аккаунт командой: rm -rf acc_8841",
        "needs_scan": true,
        "needs_access": true,
        "needs_rm": "acc_8841"
    },
    2: {
        "title": "Заказ #2: взлом сервера кафе, подмена баланса",
        "difficulty": "Средний",
        "reward": 300,
        "rep": 10,
        "target_ip": "10.0.0.22",
        "desc": "Локальный сервер кафе. Просканируйте цель, получите доступ (brute/sql/decode), затем внедрите нагрузку: inject fake_balance",
        "needs_scan": true,
        "needs_access": true,
        "needs_inject": "fake_balance"
    },
    3: {
        "title": "Заказ #3: обход файрвола корпорации",
        "difficulty": "Сложный",
        "reward": 600,
        "rep": 20,
        "target_ip": "172.16.5.1",
        "desc": "Жёсткий файрвол. Рекомендуется: bypass firewall (стелс), перехват транзакции (inject intercept) и зачистка логов (rm -rf logs).",
        "needs_scan": true,
        "needs_bypass": true,
        "needs_inject": "intercept",
        "needs_rm": "logs"
    },
    4: {
        "title": "Заказ #4: многоэтапный корпоративный взлом",
        "difficulty": "Экстрим",
        "reward": 1200,
        "rep": 40,
        "target_ip": "10.10.10.10",
        "desc": "Полный цикл: nmap -> decode ключа -> bypass ИИ-сканера -> rm -rf compromising_data.",
        "needs_scan": true,
        "needs_decode": true,
        "needs_bypass": true,
        "needs_rm": "compromising_data"
    }
};

// Команда /start в Telegram
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "💻 *NET_BREAKER // TERMINAL v1.0.4*\n\nСоединение с даркнетом установлено. Нажмите кнопку ниже, чтобы открыть консоль управления с телефона.", {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "🖥 Запустить Терминал", web_app: { url: `${RENDER_URL}` } }]
            ]
        }
    });
});

// Получить состояние игрока
app.get('/api/player/:id', (req, res) => {
    const userId = req.params.id;
    if (!players[userId]) {
        players[userId] = {
            credits: 0,
            reputation: 0,
            alarm: 0,
            current_order: null,
            flags: {},
            unlocked: [1],
            logs: ["> [NET_BREAKER v1.0.4] Системы инициализированы."]
        };
    }
    res.json(players[userId]);
});

// Выбрать задание
app.post('/api/select_order', (req, res) => {
    const { userId, orderId } = req.body;
    let p = players[userId];
    if (!p) return res.json({ success: false });

    if (!p.unlocked.includes(orderId)) {
        return res.json({ success: false, message: "Заказ заблокирован (требуется репутация)." });
    }

    p.current_order = orderId;
    p.alarm = 0;
    p.flags = { scanned: false, access: false, bypassed: false, decoded: false, proxy: false, removed: null, injected: null };
    p.logs.unshift(`> [ CONNECT ] Успешное подключение к цели: ${ORDERS[orderId].target_ip}`);

    res.json({ success: true, player: p });
});

// Обработка команд игры
app.post('/api/command', (req, res) => {
    const { userId, cmd, arg1, arg2 } = req.body;
    let p = players[userId];
    if (!p || !p.current_order) return res.json({ success: false, message: "Миссия не выбрана." });

    let order = ORDERS[p.current_order];
    let tick = (amt) => {
        if (p.flags.proxy) amt = Math.max(1, Math.floor(amt / 2));
        p.alarm = Math.min(100, p.alarm + amt);
    };

    if (cmd === 'nmap') {
        p.flags.scanned = true;
        tick(3);
        p.logs.unshift(`> nmap ${order.target_ip} -> Порты открыты. Уязвимость аутентификации обнаружена.`);
    } 
    else if (cmd === 'ping') {
        p.logs.unshift(`> ping ${order.target_ip} -> Ответ получен (${Math.floor(Math.random()*40 + 10)}ms).`);
        tick(1);
    }
    else if (cmd === 'crack') {
        if (!p.flags.scanned) {
            p.logs.unshift(`> Ошибка: Сначала выполните 'nmap'.`);
            return res.json({ player: p });
        }
        if (arg1 === 'brute') {
            p.flags.access = true;
            tick(25);
            p.logs.unshift(`> crack --method brute -> Доступ получен (Громкий метод, тревога +25%).`);
        } else if (arg1 === 'sql') {
            p.flags.access = true;
            tick(12);
            p.logs.unshift(`> crack --method sql -> SQL-инъекция успешна (тревога +12%).`);
        }
    }
    else if (cmd === 'decode') {
        if (!p.flags.scanned) {
            p.logs.unshift(`> Ошибка: Требуется сканирование.`);
            return res.json({ player: p });
        }
        p.flags.access = true;
        p.flags.decoded = true;
        tick(4);
        p.logs.unshift(`> decode hash -> Пароль восстановлен тихо (стелс).`);
    }
    else if (cmd === 'bypass') {
        if (!p.flags.scanned) {
            p.logs.unshift(`> Ошибка: Требуется сканирование.`);
            return res.json({ player: p });
        }
        p.flags.bypassed = true;
        p.flags.access = true;
        tick(5);
        p.logs.unshift(`> bypass firewall -> Защита обведена без следов.`);
    }
    else if (cmd === 'proxy') {
        p.flags.proxy = (arg1 === 'on');
        p.logs.unshift(`> proxy ${arg1} -> Цепочка прокси ${arg1 === 'on' ? 'активирована' : 'отключена'}.`);
    }
    else if (cmd === 'trace_reset') {
        p.alarm = Math.max(0, p.alarm - 20);
        tick(2);
        p.logs.unshift(`> trace --reset -> Часть следов очищена.`);
    }
    else if (cmd === 'inject') {
        if (!p.flags.access && !p.flags.bypassed) {
            p.logs.unshift(`> Ошибка: Нет доступа к системе.`);
            return res.json({ player: p });
        }
        p.flags.injected = arg1;
        tick(6);
        p.logs.unshift(`> inject ${arg1} -> Полезная нагрузка внедрена.`);
    }
    else if (cmd === 'rm') {
        if (!p.flags.access && !p.flags.bypassed) {
            p.logs.unshift(`> Ошибка: Нет доступа к системе.`);
            return res.json({ player: p });
        }
        p.flags.removed = arg1;
        tick(6);
        p.logs.unshift(`> rm -rf ${arg1} -> Объект безвозвратно удален.`);
    }

    // Проверка проигрыша по тревоге
    if (p.alarm >= 100) {
        p.logs.unshift(`🚨 TRACE DETECTED: Соединение разорвано службой безопасности! Миссия провалена.`);
        p.current_order = null;
        return res.json({ player: p, status: 'failed' });
    }

    // Проверка победы (выполнение условий заказа)
    let ok = p.flags.scanned;
    if (order.needs_access) ok = ok && p.flags.access;
    if (order.needs_bypass) ok = ok && p.flags.bypassed;
    if (order.needs_decode) ok = ok && p.flags.decoded;
    if (order.needs_rm) ok = ok && (p.flags.removed === order.needs_rm);
    if (order.needs_inject) ok = ok && (p.flags.injected === order.needs_inject);

    if (ok || cmd === 'submit') {
        if (ok) {
            p.credits += order.reward;
            p.reputation += order.rep;
            p.logs.unshift(`🎉 ЗАКАЗ ВЫПОЛНЕН! Получено: +${order.reward} cr, +${order.rep} репутации.`);
            
            // Разблокировка новых заказов
            if (p.reputation >= 10 && !p.unlocked.includes(2)) p.unlocked.push(2);
            if (p.reputation >= 25 && !p.unlocked.includes(3)) p.unlocked.push(3);
            if (p.reputation >= 50 && !p.unlocked.includes(4)) p.unlocked.push(4);

            p.current_order = null;
            return res.json({ player: p, status: 'won' });
        } else {
            p.logs.unshift(`> Условия заказа еще не выполнены полностью.`);
        }
    }

    if (p.logs.length > 15) p.logs.pop();
    res.json({ player: p, status: 'playing' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});