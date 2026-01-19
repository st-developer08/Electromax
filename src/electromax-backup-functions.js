// ---------------- Backup / Restore (вставить ПЕРЕД formatUZS) ----------------

const downloadJsonFile = (obj, filename) => {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const exportFullBackupFile = async () => {
  try {
    const ordersLocal = (() => { try { return JSON.parse(localStorage.getItem('electromax_orders')) || []; } catch { return []; } })();
    const debtsLocal  = (() => { try { return JSON.parse(localStorage.getItem('electromax_debts')) || []; } catch { return []; } })();
    const cartLocal   = (() => { try { return JSON.parse(localStorage.getItem('electromax_cart')) || []; } catch { return []; } })();
    const rateLocal   = (() => { try { return JSON.parse(localStorage.getItem('electromax_rate')); } catch { return null; } })();

    const payload = {
      meta: { app: 'electromax', version: 1, ts: new Date().toISOString() },
      products: Array.isArray(products) ? products : [],
      orders: Array.isArray(ordersLocal) && ordersLocal.length ? ordersLocal : (Array.isArray(orders) ? orders : []),
      debts: Array.isArray(debtsLocal) && debtsLocal.length ? debtsLocal : (Array.isArray(debts) ? debts : []),
      cart: Array.isArray(cartLocal) && cartLocal.length ? cartLocal : (Array.isArray(cart) ? cart : []),
      rate: (typeof rateLocal !== 'undefined' && rateLocal !== null) ? rateLocal : (typeof exchangeRate === 'number' ? exchangeRate : null)
    };

    const filename = `electromax_backup_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    downloadJsonFile(payload, filename);
    alert('Бэкап скачан. Сохраните файл в надёжном месте.');
  } catch (e) {
    console.error('exportFullBackupFile error', e);
    alert('Ошибка при создании бэкапа — см. консоль.');
  }
};

const restoreFromBackupFile = async (file) => {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!parsed || !parsed.meta) {
      alert('Файл не похож на корректный backup.');
      return;
    }

    const ok = confirm('Восстановить данные из бэкапа? Это перезапишет текущие локальные данные. Продолжить?');
    if (!ok) return;

    if (Array.isArray(parsed.orders)) localStorage.setItem('electromax_orders', JSON.stringify(parsed.orders));
    if (Array.isArray(parsed.debts))  localStorage.setItem('electromax_debts', JSON.stringify(parsed.debts));
    if (Array.isArray(parsed.cart))   localStorage.setItem('electromax_cart', JSON.stringify(parsed.cart));
    if (parsed.rate !== undefined && parsed.rate !== null) localStorage.setItem('electromax_rate', JSON.stringify(parsed.rate));
    if (Array.isArray(parsed.products) && parsed.products.length) {
      try { localStorage.setItem('products', JSON.stringify(parsed.products)); } catch (e) { /* ignore */ }
    }

    if (Array.isArray(parsed.orders)) {
      setOrders(parsed.orders.map(o => ({
        ...o,
        items: Array.isArray(o.items) ? o.items.map(it => ({ ...it, quantity: Number(it.quantity)||0, price: Number(it.price)||0 })) : [],
        total: Number(o.total) || 0,
        dateFormatted: o.dateFormatted || (o.date ? new Date(o.date).toLocaleString('ru-RU') : new Date().toLocaleString('ru-RU'))
      })));
    }

    if (Array.isArray(parsed.debts)) {
      setDebts(parsed.debts.map(d => ({ ...d, amount: Number(d.amount)||0 })));
    }

    if (Array.isArray(parsed.cart)) {
      setCart(parsed.cart.map(it => ({ ...it, quantity: Number(it.quantity)||0, price: Number(it.price)||0 })));
    }

    if (parsed.rate !== undefined && parsed.rate !== null) {
      setExchangeRate(Number(parsed.rate));
    }

    if (Array.isArray(parsed.products) && parsed.products.length) {
      setProducts(parsed.products);
    }

    alert('Восстановление завершено. Рекомендую перезагрузить страницу (F5).');
  } catch (e) {
    console.error('restoreFromBackupFile error', e);
    alert('Ошибка при восстановлении — проверьте файл и консоль.');
  }
};

const handleBackupFileInput = (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  restoreFromBackupFile(file);
  e.target.value = '';
};
// ---------------- end Backup / Restore ----------------