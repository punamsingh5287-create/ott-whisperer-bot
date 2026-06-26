export type Lang = 'en' | 'ru' | 'zh' | 'pl' | 'vi';

export const LANGS: { code: Lang; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];

const D: Record<string, Record<Lang, string>> = {
  welcome:        { en: 'Welcome',           ru: 'Добро пожаловать', zh: '欢迎',         pl: 'Witaj',          vi: 'Chào mừng' },
  hey:            { en: 'Hey',               ru: 'Привет',           zh: '你好',         pl: 'Cześć',          vi: 'Xin chào' },
  browse:         { en: 'Browse premium OTT, AI, Gaming & Utility subscriptions. Instant delivery, crypto-friendly checkout.',
                    ru: 'Просматривайте премиум подписки OTT, AI, игры и утилиты. Мгновенная доставка, оплата криптой.',
                    zh: '浏览高级 OTT、AI、游戏和实用工具订阅。即时交付,加密友好结账。',
                    pl: 'Przeglądaj subskrypcje OTT, AI, gier i narzędzi premium. Natychmiastowa dostawa, płatność kryptowalutą.',
                    vi: 'Duyệt các gói đăng ký OTT, AI, Game & Tiện ích cao cấp. Giao ngay, thanh toán crypto.' },
  categories:     { en: 'Categories',        ru: 'Категории',        zh: '分类',         pl: 'Kategorie',      vi: 'Danh mục' },
  search:         { en: 'Search',            ru: 'Поиск',            zh: '搜索',         pl: 'Szukaj',         vi: 'Tìm kiếm' },
  my_orders:      { en: 'My Orders',         ru: 'Мои заказы',       zh: '我的订单',     pl: 'Moje zamówienia',vi: 'Đơn hàng' },
  profile:        { en: 'Profile',           ru: 'Профиль',          zh: '我的',         pl: 'Profil',         vi: 'Hồ sơ' },
  referrals:      { en: 'Referrals',         ru: 'Рефералы',         zh: '推荐',         pl: 'Polecenia',      vi: 'Giới thiệu' },
  support:        { en: 'Support',           ru: 'Поддержка',        zh: '客服',         pl: 'Wsparcie',       vi: 'Hỗ trợ' },
  close:          { en: 'Close',             ru: 'Закрыть',          zh: '关闭',         pl: 'Zamknij',        vi: 'Đóng' },
  back:           { en: 'Back',              ru: 'Назад',            zh: '返回',         pl: 'Wstecz',         vi: 'Quay lại' },
  home:           { en: 'Home',              ru: 'Главная',          zh: '首页',         pl: 'Strona główna',  vi: 'Trang chính' },
  open_app:       { en: 'Open Store App',    ru: 'Открыть магазин',  zh: '打开商店',     pl: 'Otwórz sklep',   vi: 'Mở cửa hàng' },
  wallet:         { en: 'Wallet',            ru: 'Кошелёк',          zh: '钱包',         pl: 'Portfel',        vi: 'Ví' },
  language:       { en: 'Language',          ru: 'Язык',             zh: '语言',         pl: 'Język',          vi: 'Ngôn ngữ' },
  choose_lang:    { en: 'Choose your language',
                    ru: 'Выберите язык',
                    zh: '选择语言',
                    pl: 'Wybierz język',
                    vi: 'Chọn ngôn ngữ' },
  lang_saved:     { en: '✅ Language updated', ru: '✅ Язык обновлён', zh: '✅ 语言已更新', pl: '✅ Język zaktualizowany', vi: '✅ Đã cập nhật' },
  balance:        { en: 'Balance',           ru: 'Баланс',           zh: '余额',         pl: 'Saldo',          vi: 'Số dư' },
  deposit:        { en: 'Deposit',           ru: 'Пополнить',        zh: '充值',         pl: 'Doładuj',        vi: 'Nạp tiền' },
  deposit_info:   { en: 'Send any amount of USDT/SOL to one of the wallets below. After paying, tap "I have deposited" and submit your tx hash or a screenshot. Your balance will update after admin approval.',
                    ru: 'Отправьте любую сумму USDT/SOL на один из кошельков ниже. После оплаты нажмите «Я пополнил» и отправьте хеш транзакции или скриншот. Баланс обновится после одобрения админом.',
                    zh: '将任意数量的 USDT/SOL 发送到以下钱包之一。付款后,点击"我已充值"并提交交易哈希或截图。管理员批准后余额将更新。',
                    pl: 'Wyślij dowolną kwotę USDT/SOL na jeden z portfeli poniżej. Po wpłacie naciśnij "Wpłaciłem" i prześlij hash transakcji lub zrzut ekranu. Saldo zaktualizuje się po zatwierdzeniu.',
                    vi: 'Gửi bất kỳ số lượng USDT/SOL nào đến một trong các ví dưới đây. Sau khi thanh toán, nhấn "Tôi đã nạp" và gửi mã tx hoặc ảnh chụp màn hình. Số dư sẽ cập nhật sau khi quản trị viên duyệt.' },
  deposited:      { en: 'I have deposited',  ru: 'Я пополнил',       zh: '我已充值',     pl: 'Wpłaciłem',      vi: 'Tôi đã nạp' },
  deposit_proof:  { en: 'Send your tx hash or a screenshot of the deposit now.',
                    ru: 'Отправьте хеш транзакции или скриншот пополнения сейчас.',
                    zh: '现在发送您的交易哈希或充值截图。',
                    pl: 'Wyślij teraz hash transakcji lub zrzut ekranu wpłaty.',
                    vi: 'Hãy gửi mã tx hoặc ảnh chụp khoản nạp ngay.' },
  deposit_received: { en: 'Deposit submitted — pending admin approval.',
                    ru: 'Пополнение отправлено — ожидает одобрения админа.',
                    zh: '充值已提交 — 等待管理员批准。',
                    pl: 'Wpłata wysłana — czeka na zatwierdzenie administratora.',
                    vi: 'Đã gửi khoản nạp — chờ quản trị viên duyệt.' },
  no_wallets:     { en: 'No wallets configured yet. Contact support.',
                    ru: 'Кошельки ещё не настроены. Свяжитесь с поддержкой.',
                    zh: '尚未配置钱包。请联系客服。',
                    pl: 'Brak skonfigurowanych portfeli. Skontaktuj się z pomocą.',
                    vi: 'Chưa có ví nào. Vui lòng liên hệ hỗ trợ.' },
};

export function t(lang: string | null | undefined, key: keyof typeof D | string): string {
  const L = detect(lang || 'en');
  const row = D[key as string];
  if (!row) return key as string;
  return row[L] ?? row.en;
}

export function detect(code?: string | null): Lang {
  const c = (code || '').toLowerCase().slice(0, 2);
  if ((['en', 'ru', 'zh', 'pl', 'vi'] as const).includes(c as any)) return c as Lang;
  return 'en';
}
