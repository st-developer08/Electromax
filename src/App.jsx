import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Package, DollarSign, Calendar, Search, ShoppingCart, Printer,
  BarChart3, Users, FileText, Calculator, Clock, AlertCircle,
  Check, X, Edit2, Trash2, Plus, ArrowLeft, ArrowRight, Download,
  RefreshCw, Menu, Zap, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';

/**
 * ElectroMaxPro — исправленная версия
 * Исправления:
 * - безопасный парсинг localStorage (нормализация orders/debts)
 * - приведение total/price/quantity к Number
 * - защита всех .map/.toFixed и других мест от undefined/null
 * - мемоизация аналитики для стабильности
 * - исправлён путь к логотипу (/logo.jpg)
 */

const ElectroMaxPro = () => {
  // STATES
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [debts, setDebts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', unit: '' });
  const [currentView, setCurrentView] = useState('order');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [exchangeRate, setExchangeRate] = useState(12650);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [calculatorAmount, setCalculatorAmount] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [showCalculator, setShowCalculator] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtForm, setDebtForm] = useState({ customerName: '', customerPhone: '', amount: '', dueDate: '', note: '' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null, isDangerous: false });
  const itemsPerPage = 50;

  // Utility: safe JSON parse
  const safeParse = (str) => {
    try { return JSON.parse(str); } catch (e) { return null; }
  };

  // Demo products fallback
  const generateDemoProducts = () => {
    const categories = ['Электроника', 'Бытовая техника', 'Компьютеры', 'Аксессуары', 'Телефоны'];
    const productsList = [];
    for (let i = 1; i <= 120; i++) {
      productsList.push({
        id: i,
        name: `${categories[i % 5]} Товар ${i}`,
        price: parseFloat((Math.random() * 1000 + 50).toFixed(2)),
        unit: 'шт',
        category: categories[i % 5],
        stock: Math.floor(Math.random() * 100)
      });
    }
    return productsList;
  };

  // Fetch exchange rate (stub)
  const fetchExchangeRate = async () => {
    try {
      const uzbRate = 12650;
      setExchangeRate(uzbRate);
    } catch (error) {
      console.log('Используется стандартный курс');
    }
  };

  // SAFE getFilteredOrders (returns array)
  const getFilteredOrders = () => {
    try {
      const all = Array.isArray(orders) ? orders : [];
      if (!dateFilter.start && !dateFilter.end) return all;

      return all.filter(order => {
        const orderDate = new Date(order?.date);
        const start = dateFilter.start ? new Date(dateFilter.start) : null;
        const end = dateFilter.end ? new Date(dateFilter.end) : null;
        if (start && orderDate < start) return false;
        if (end && orderDate > end) return false;
        return true;
      });
    } catch (e) {
      console.error('getFilteredOrders error', e);
      return [];
    }
  };

  // Analytics computation (safe)
  const computeAnalytics = () => {
    try {
      const filtered = Array.isArray(getFilteredOrders()) ? getFilteredOrders() : [];
      const totalRevenue = filtered.reduce((sum, o) => sum + (Number(o?.total) || 0), 0);
      const totalOrders = filtered.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const today = new Date();
      const todayOrders = filtered.filter(o => {
        const od = new Date(o?.date);
        return od && od.toDateString && od.toDateString() === today.toDateString();
      });
      const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o?.total) || 0), 0);

      const productSales = {};
      filtered.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach(item => {
          const name = item?.name ?? 'Неизвестно';
          const qty = Number(item?.quantity) || 0;
          const price = Number(item?.price) || 0;
          if (!productSales[name]) productSales[name] = { quantity: 0, revenue: 0 };
          productSales[name].quantity += qty;
          productSales[name].revenue += price * qty;
        });
      });

      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10);

      const categoryRevenue = {};
      filtered.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach(item => {
          const prod = products.find(p => p.name === item?.name);
          const cat = prod?.category || 'Прочее';
          categoryRevenue[cat] = (categoryRevenue[cat] || 0) + ((Number(item?.price) || 0) * (Number(item?.quantity) || 0));
        });
      });

      return {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        todayRevenue,
        todayOrders: todayOrders.length,
        topProducts,
        categoryRevenue
      };
    } catch (e) {
      console.error('computeAnalytics error', e);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        todayRevenue: 0,
        todayOrders: 0,
        topProducts: [],
        categoryRevenue: {}
      };
    }
  };

  // Memoize analytics
  const analytics = useMemo(() => computeAnalytics(), [orders, products, dateFilter]);

  // LOAD initial data: products + normalize saved orders/debts
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/products.json');
        if (!response.ok) throw new Error('Файл не найден');
        const data = await response.json();
        const productsData = data.products || data;
        setProducts(productsData);
        setLoading(false);
      } catch (error) {
        console.error('Ошибка загрузки products.json:', error);
        const demoProducts = generateDemoProducts();
        setProducts(demoProducts);
        setLoading(false);
      }
    };

    loadProducts();

    // safe parse + normalize orders
    // safeParse уже у вас есть
const savedOrdersRaw = safeParse(localStorage.getItem('electromax_orders'));
let normalized = [];

if (Array.isArray(savedOrdersRaw)) {
  normalized = savedOrdersRaw.map(o => {
    const items = Array.isArray(o.items) ? o.items.map(it => ({
      ...it,
      quantity: Number(it?.quantity) || 0,
      price: Number(it?.price) || 0
    })) : [];

    return {
      ...o,
      items,
      total: Number(o?.total) || items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0),
      date: o?.date || new Date().toISOString(),
      dateFormatted: o?.dateFormatted || new Date(o?.date || Date.now()).toLocaleString('ru-RU')
    };
  });

  // Миграция: удалить "демо" записи — у вас demo id были 1..120.
  // Реальные заказы создаются через Date.now() (id примерно >= 1e12).
  const sanitized = normalized.filter(o => {
    const idNum = Number(o?.id) || 0;
    if (idNum === 0) return false; // отбросим некорректные
    if (idNum < 1e12) {
      // возможно демо / тест — удаляем
      return false;
    }
    return true;
  });

  // Если после фильтрации нет заказов — просто пустой массив
  setOrders(sanitized);
  // перезаписываем localStorage так, чтобы все клиенты получили исправленные данные
  localStorage.setItem('electromax_orders', JSON.stringify(sanitized));
} else {
  setOrders([]); // явно пусто, если нет валидных данных
}

    // safe parse debts
    const savedDebtsRaw = safeParse(localStorage.getItem('electromax_debts'));
    if (Array.isArray(savedDebtsRaw)) {
      const normalizedDebts = savedDebtsRaw.map(d => ({
        ...d,
        amount: Number(d?.amount) || 0,
        createdAt: d?.createdAt || new Date().toISOString()
      }));
      setDebts(normalizedDebts);
    }

    fetchExchangeRate();
    const interval = setInterval(fetchExchangeRate, 300000);
    return () => clearInterval(interval);
  }, []);

  // Persist orders/debts
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('electromax_orders', JSON.stringify(orders));
    } else {
      // don't remove intentionally — keep as is; optional: remove if zero
      // localStorage.removeItem('electromax_orders');
    }
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('electromax_debts', JSON.stringify(debts));
  }, [debts]);

  // PRODUCTS filtering & pagination
  const getCategories = () => {
    return ['all', ...new Set((Array.isArray(products) ? products : []).map(p => p.category))];
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = (
      (p?.name ?? '').toString().toLowerCase().includes(term) ||
      (p?.id ?? '').toString().includes(term) ||
      ((p?.category ?? '').toString().toLowerCase().includes(term))
    );
    const matchesCategory = filterCategory === 'all' || p?.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  // CART operations
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const calculateTotal = () => {
    return (cart || []).reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
  };

  // ORDER handling
  const completeOrder = (asDebt = false, debtRef = null) => {
    if (!Array.isArray(cart) || cart.length === 0) {
      setConfirmDialog({
        show: true,
        title: '⚠️ Корзина пуста',
        message: 'Добавьте товары перед оформлением заказа',
        onConfirm: null,
        isDangerous: false
      });
      return;
    }

    const paymentStatus = asDebt ? 'due' : 'paid';

    const newOrder = {
      id: Date.now(),
      date: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString('ru-RU'),
      items: cart.map(it => ({
        ...it,
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 0
      })),
      total: Number(calculateTotal()) || 0,
      customer: { ...customerInfo },
      paymentStatus,
      debtRef
    };

    setOrders([newOrder, ...orders]);
    setCart([]);
    setCustomerInfo({ name: '', phone: '' });

    const message = asDebt && debtRef
      ? `✅ Заказ #${newOrder.id} оформлен в долг (#${debtRef}).`
      : `✅ Заказ #${newOrder.id} оформлен! Итого: $${newOrder.total.toFixed(2)}`;

    setConfirmDialog({
      show: true,
      title: '✅ Успешно',
      message: message,
      onConfirm: null,
      isDangerous: false
    });
  };

  // PRINT receipt (safe)
  const printReceipt = (order) => {
    try {
      const printWindow = window.open('', '_blank');
      const itemsHtml = (Array.isArray(order.items) ? order.items : []).map(item => {
        const qty = Number(item?.quantity) || 0;
        const price = Number(item?.price) || 0;
        return `
          <div class="item">
            <span>${(item?.name) ?? 'Неизвестно'} x${qty}</span>
            <span>$${(price * qty).toFixed(2)}</span>
          </div>
        `;
      }).join('');

      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Чек #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 320px; margin: 20px auto; color:#111; }
            .header { text-align: center; border-bottom: 1px dashed #111; padding-bottom: 8px; margin-bottom: 8px; }
            .item { display: flex; justify-content: space-between; margin: 4px 0; }
            .total { border-top: 1px dashed #111; margin-top: 8px; padding-top: 8px; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ELECTROMAX</h2>
            <p>Чек #${order.id}</p>
            <p>${order.dateFormatted}</p>
            ${order.customer?.name ? `<p>Клие��т: ${order.customer.name}</p>` : ''}
          </div>
          ${itemsHtml}
          <div class="total">
            <div class="item">
              <span>ИТОГО:</span>
              <span>$${(Number(order?.total) || 0).toFixed(2)}</span>
            </div>
            <div class="item">
              <span>В сумах:</span>
              <span>${((Number(order?.total) || 0) * exchangeRate).toFixed(0)} UZS</span>
            </div>
          </div>
          <p style="text-align: center; margin-top: 12px;">Спасибо за покупку!</p>
        </body>
        </html>
      `;
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (e) {
      console.error('printReceipt error', e);
      setConfirmDialog({
        show: true,
        title: '❌ Ошибка',
        message: 'Не удалось открыть печать',
        onConfirm: null,
        isDangerous: false
      });
    }
  };

  const deleteOrder = (orderId) => {
    setConfirmDialog({
      show: true,
      title: '🗑️ Удалить заказ?',
      message: `Вы уверены? Заказ #${orderId} будет удален навсегда.`,
      onConfirm: () => {
        setOrders(orders.filter(o => o.id !== orderId));
      },
      isDangerous: true
    });
  };

  // DEBTS
  const openDebtModal = () => {
    setDebtForm({
      customerName: customerInfo.name || '',
      customerPhone: customerInfo.phone || '',
      amount: calculateTotal().toFixed(2),
      dueDate: '',
      note: ''
    });
    setShowDebtModal(true);
  };

  const saveDebt = () => {
    const amountNum = parseFloat(debtForm.amount);
    if (!debtForm.customerName || isNaN(amountNum) || amountNum <= 0) {
      setConfirmDialog({
        show: true,
        title: '⚠️ Ошибка',
        message: 'Укажите имя клиента и корректную сумму.',
        onConfirm: null,
        isDangerous: false
      });
      return;
    }
    const newDebt = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      customerName: debtForm.customerName,
      customerPhone: debtForm.customerPhone,
      amount: amountNum,
      dueDate: debtForm.dueDate || null,
      note: debtForm.note || '',
      paid: false
    };
    setDebts([newDebt, ...debts]);
    setShowDebtModal(false);

    const debtRef = newDebt.id;
    completeOrder(true, debtRef);
  };

  const markDebtPaid = (debtId) => {
    setConfirmDialog({
      show: true,
      title: '✅ Отметить как оплаченный?',
      message: 'Долг и все связанные заказы будут помечены как оплаченные.',
      onConfirm: () => {
        const paidAt = new Date().toISOString();

        const updatedDebts = debts.map(d =>
          d.id === debtId ? { ...d, paid: true, paidAt } : d
        );
        setDebts(updatedDebts);

        const updatedOrders = orders.map(o =>
          o.debtRef === debtId ? { ...o, paymentStatus: 'paid', paidAt } : o
        );
        setOrders(updatedOrders);
      },
      isDangerous: false
    });
  };

  const removeDebt = (debtId) => {
    setConfirmDialog({
      show: true,
      title: '🗑️ Удалить долг?',
      message: 'Запись о долге будет удалена навсегда.',
      onConfirm: () => {
        setDebts(debts.filter(d => d.id !== debtId));
      },
      isDangerous: true
    });
  };

  const exportDebts = () => {
    const dataStr = JSON.stringify(debts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debts_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // UI: loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-500 mx-auto mb-3"></div>
          <p className="text-base font-medium text-gray-200">Загрузка системы...</p>
        </div>
      </div>
    );
  }

  // NAV
  const navItems = [
    { id: 'order', label: 'Касса', icon: ShoppingCart, badge: cart.length },
    { id: 'products', label: 'Товары', icon: Package },
    { id: 'orders', label: 'Заказы', icon: FileText, badge: orders.length },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'debts', label: 'Долги', icon: DollarSign, badge: debts.filter(d => !d.paid).length },
  ];

  // Render
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex">
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-20'} bg-gray-950 border-r border-gray-800 transition-all duration-300 flex flex-col fixed h-screen z-40 overflow-y-auto`}>
        <div className="p-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center shadow flex-shrink-0">
                <Zap size={24} className="text-white" strokeWidth={2.5} />
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <h1 className="font-black text-white text-sm leading-tight">ELECTRO<span className="text-teal-400">MAX</span></h1>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-gray-800 rounded flex-shrink-0">
                <ArrowLeft size={18} className="text-gray-400" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${currentView === item.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-gray-300" strokeWidth={2} />
                </div>
                {sidebarOpen && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-teal-600 text-white flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {!sidebarOpen && item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-teal-600">
                    {item.badge}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800 flex-shrink-0">
          <button 
            onClick={() => setShowCalculator(!showCalculator)} 
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${showCalculator ? 'bg-teal-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Calculator size={18} strokeWidth={2} />
            </div>
            {sidebarOpen && <span>Конвертер</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${sidebarOpen ? 'ml-56' : 'ml-20'} flex-1 transition-all duration-300 flex flex-col h-screen`}>
        {/* Top Bar */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
          <div className="px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-800 rounded flex-shrink-0">
                  <Menu size={20} className="text-gray-400" strokeWidth={2} />
                </button>
              )}
              <h2 className="text-sm font-bold text-white">ELECTROMAX</h2>
              <img className='ml-[350px] w-[120px] rounded-[5px]' src="/logo.jpg" alt="logo" />
            </div>

            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded text-xs text-gray-300">
              <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse" />
              <span className="font-bold">ОНЛАЙН</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden p-4">
          {/* ORDER VIEW */}
          {currentView === 'order' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
              {/* Products Catalog */}
              <div className="lg:col-span-3 flex flex-col h-full min-h-0">
                <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full">
                  <div className="px-3 py-2.5 border-b border-gray-700 flex items-center justify-between bg-gray-850">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lightbulb size={16} className="text-teal-400" strokeWidth={2.5} /> Каталог
                    </h2>
                    <span className="text-xs text-gray-400">{filteredProducts.length} товаров</span>
                  </div>

                  {/* Поиск */}
                  <div className="p-2 border-b border-gray-700 bg-gray-900/50 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search size={16} className="absolute left-2 top-2.5 text-gray-500" strokeWidth={2} />
                        <input
                          type="text"
                          placeholder="Поиск..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-2 py-1.5 pl-7 bg-gray-800 border border-gray-700 rounded text-xs text-gray-100 placeholder-gray-500"
                        />
                        {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Product Grid */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {paginatedProducts.length === 0 ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                        <AlertCircle size={32} className="text-gray-600 mb-2" strokeWidth={1.5} />
                        <p className="text-gray-500 text-sm">Товары не найдены</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                        {paginatedProducts.map(product => (
                          <div 
                            key={product.id} 
                            className="bg-gray-850 border border-gray-700 rounded-md p-2 hover:bg-gray-800 hover:border-teal-600 transition-all group cursor-pointer relative"
                          >
                            <div className="absolute top-1 right-1 w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                              #{product.id}
                            </div>

                            <div className="min-w-0 pr-6">
                              <p className="text-xs font-semibold text-white truncate line-clamp-2 leading-tight">
                                {product.name}
                              </p>
                              <div className="flex gap-1 mt-1">
                                <span className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-300 truncate">
                                  {product.category ? product.category.substring(0, 8) : '—'}
                                </span>
                                {product.stock !== undefined && (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${product.stock > 10 ? 'bg-green-900/40 text-green-300' : 'bg-orange-900/40 text-orange-300'}`}>
                                    {product.stock}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Price and Button */}
                            <div className="mt-1.5 flex items-end justify-between gap-1">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-teal-400 leading-none">
                                  ${ (Number(product.price) || 0).toFixed(2) }
                                </p>
                                <p className="text-xs text-gray-500 leading-none">
                                  { ((Number(product.price) || 0) * exchangeRate / 1000).toFixed(1) }K
                                </p>
                              </div>
                              <button 
                                onClick={() => addToCart(product)} 
                                className="w-7 h-7 bg-teal-600 hover:bg-teal-500 text-white rounded-md flex items-center justify-center transition-colors flex-shrink-0 shadow-sm group-hover:shadow-md"
                                title="Добавить в корзину"
                              >
                                <Plus size={14} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="p-2 border-t border-gray-700 bg-gray-850 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                          disabled={currentPage === 1} 
                          className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp size={14} className="text-gray-300" strokeWidth={2.5} />
                        </button>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                            if (pageNum > totalPages) return null;
                            return (
                              <button 
                                key={pageNum} 
                                onClick={() => setCurrentPage(pageNum)} 
                                className={`w-6 h-6 rounded text-xs font-bold transition-colors ${currentPage === pageNum ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                          disabled={currentPage === totalPages} 
                          className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown size={14} className="text-gray-300" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div className="text-gray-400">{currentPage}/{totalPages}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* CART SIDEBAR */}
              <div className="lg:col-span-2 h-full min-h-0">
                <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full">
                  <div className="px-3 py-2.5 border-b border-gray-700 flex items-center justify-between bg-gray-850">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <ShoppingCart size={16} className="text-teal-400" strokeWidth={2.5} /> Корзина
                    </h3>
                    {cart.length > 0 && <span className="text-xs bg-teal-600 px-2 py-0.5 rounded-full text-white font-semibold">{cart.length}</span>}
                  </div>

                  <div className="p-2 border-b border-gray-700 space-y-1.5 bg-gray-900/30">
                    <input 
                      type="text" 
                      placeholder="Имя клиента" 
                      value={customerInfo.name} 
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} 
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-100 placeholder-gray-500"
                    />
                    <input 
                      type="tel" 
                      placeholder="Телефон" 
                      value={customerInfo.phone} 
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} 
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-100 placeholder-gray-500"
                    />
                  </div>

                  {cart.length === 0 ? (
                    <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                      <ShoppingCart size={32} className="text-gray-600 mb-2" strokeWidth={1.5} />
                      <p className="text-gray-500 text-xs">Корзина пуста</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {cart.map(item => (
                          <div key={item.id} className="flex items-start justify-between bg-gray-850 p-1.5 rounded border border-gray-700 hover:border-teal-600 transition-colors group">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                              <p className="text-xs text-gray-500">#{item.id}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="flex items-center bg-gray-700 rounded border border-gray-600">
                                <button 
                                  onClick={() => updateQuantity(item.id, Number(item.quantity) - 1)} 
                                  className="px-1.5 py-0.5 text-gray-300 hover:text-white transition-colors text-xs"
                                >
                                  −
                                </button>
                                <span className="px-1.5 py-0.5 text-xs font-bold text-white">{Number(item.quantity) || 0}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, Number(item.quantity) + 1)} 
                                  className="px-1.5 py-0.5 text-white hover:bg-teal-700 bg-teal-600 transition-colors text-xs"
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-right min-w-max">
                                <p className="text-xs font-black text-teal-400">${((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</p>
                              </div>
                              <button 
                                onClick={() => removeFromCart(item.id)} 
                                className="text-gray-500 hover:text-red-400 p-0.5 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-2.5 border-t border-gray-700 space-y-2 bg-gray-900/40">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-800 p-2 rounded border border-gray-700">
                            <div className="text-xs text-gray-400">Товаров</div>
                            <div className="font-black text-white text-lg">{cart.length}</div>
                          </div>
                          <div className="bg-gray-800 p-2 rounded border border-gray-700">
                            <div className="text-xs text-gray-400">Единиц</div>
                            <div className="font-black text-white text-lg">{cart.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}</div>
                          </div>
                        </div>

                        <div className="bg-teal-600/20 border border-teal-600/50 p-2.5 rounded">
                          <div className="text-xs text-gray-400">Итого</div>
                          <div className="flex items-baseline justify-between">
                            <div className="text-2xl font-black text-teal-400">${(calculateTotal()).toFixed(2)}</div>
                            <div className="text-xs text-gray-300">{(calculateTotal() * exchangeRate).toFixed(0)} сум</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => completeOrder(false, null)} 
                            className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                          >
                            <Check size={16} strokeWidth={2.5} /> ОФОРМИТЬ
                          </button>
                          <button 
                            onClick={openDebtModal} 
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                          >
                            <DollarSign size={16} strokeWidth={2.5} /> В ДОЛГ
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS VIEW */}
          {currentView === 'products' && (
            <div className="space-y-4 overflow-y-auto h-full">
              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-850">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Package size={20} className="text-teal-400" strokeWidth={2.5} /> Управление товарами
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => { 
                        try { 
                          const response = await fetch('/products.json'); 
                          const data = await response.json(); 
                          setProducts(data.products || data); 
                          setConfirmDialog({
                            show: true,
                            title: '✅ Успешно',
                            message: 'Данные товаров обновлены!',
                            onConfirm: null,
                            isDangerous: false
                          });
                        } catch (error) { 
                          setConfirmDialog({
                            show: true,
                            title: '❌ Ошибка',
                            message: 'Не удалось загрузить товары',
                            onConfirm: null,
                            isDangerous: false
                          });
                        } 
                      }} 
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <RefreshCw size={16} strokeWidth={2} /> Обновить
                    </button>
                    <button 
                      onClick={() => { 
                        const dataStr = JSON.stringify({ products }, null, 2); 
                        const blob = new Blob([dataStr], { type: 'application/json' }); 
                        const url = URL.createObjectURL(blob); 
                        const a = document.createElement('a'); 
                        a.href = url; 
                        a.download = `products_${new Date().toISOString().split('T')[0]}.json`; 
                        document.body.appendChild(a); 
                        a.click(); 
                        document.body.removeChild(a); 
                        URL.revokeObjectURL(url); 
                      }} 
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Download size={16} strokeWidth={2} /> Экспорт
                    </button>
                  </div>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-xs text-gray-400">
                        <th className="px-2 py-2 text-left">ID</th>
                        <th className="px-2 py-2 text-left">НАЗВАНИЕ</th>
                        <th className="px-2 py-2 text-left">КАТЕГОРИЯ</th>
                        <th className="px-2 py-2 text-left">USD</th>
                        <th className="px-2 py-2 text-left">UZS</th>
                        <th className="px-2 py-2 text-left">ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-850 border-b border-gray-800 transition-colors">
                          <td className="px-2 py-2 text-gray-300 font-semibold text-xs">{product.id}</td>
                          <td className="px-2 py-2">
                            {editingProduct === product.id ? (
                              <input 
                                type="text" 
                                value={editForm.name} 
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                                className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                                autoFocus
                              />
                            ) : (
                              <span className="text-white font-medium text-xs">{product.name}</span>
                            )}
                          </td>
                          <td className="px-2 py-2"><span className="text-xs text-gray-400">{product.category || '—'}</span></td>
                          <td className="px-2 py-2">
                            {editingProduct === product.id ? (
                              <input 
                                type="number" 
                                step="0.01" 
                                value={editForm.price} 
                                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} 
                                className="w-24 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                              />
                            ) : (
                              <span className="font-bold text-teal-400 text-xs">${(Number(product.price) || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-gray-400 text-xs">{((Number(product.price) || 0) * exchangeRate).toFixed(0)}</td>
                          <td className="px-2 py-2">
                            {editingProduct === product.id ? (
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => { 
                                    const updatedProducts = products.map(p => 
                                      p.id === product.id 
                                        ? { ...p, name: editForm.name, price: parseFloat(editForm.price) } 
                                        : p
                                    ); 
                                    setProducts(updatedProducts); 
                                    setEditingProduct(null); 
                                    setConfirmDialog({
                                      show: true,
                                      title: '✅ Успешно',
                                      message: 'Товар обновлен!',
                                      onConfirm: null,
                                      isDangerous: false
                                    });
                                  }} 
                                  className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs transition-colors"
                                  title="Сохранить"
                                >
                                  <Check size={14} strokeWidth={2.5} />
                                </button>
                                <button 
                                  onClick={() => setEditingProduct(null)} 
                                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                                  title="Отмена"
                                >
                                  <X size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => { 
                                  setEditingProduct(product.id); 
                                  setEditForm({ name: product.name, price: product.price, unit: product.unit }); 
                                }} 
                                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                                title="Редактировать"
                              >
                                <Edit2 size={14} strokeWidth={2} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 border-t border-gray-700 bg-gray-850 text-xs text-gray-400 flex items-center justify-between">
                  <div>Показано: {paginatedProducts.length} / {filteredProducts.length}</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                    >
                      ‹
                    </button>
                    <span>{currentPage}/{totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS VIEW */}
          {currentView === 'orders' && (
            <div className="space-y-4 overflow-y-auto h-full">
              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-850">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText size={20} className="text-teal-400" strokeWidth={2.5} /> История заказов
                  </h2>
                  <button 
                    onClick={() => { 
                      const dataStr = JSON.stringify(orders, null, 2); 
                      const blob = new Blob([dataStr], { type: 'application/json' }); 
                      const url = URL.createObjectURL(blob); 
                      const a = document.createElement('a'); 
                      a.href = url; 
                      a.download = `orders_${new Date().toISOString().split('T')[0]}.json`; 
                      document.body.appendChild(a); 
                      a.click(); 
                      document.body.removeChild(a); 
                      URL.revokeObjectURL(url); 
                    }} 
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Download size={16} strokeWidth={2} /> Экспорт
                  </button>
                </div>

                <div className="p-4 border-b border-gray-700 bg-gray-900/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">ОТ ДАТЫ</label>
                      <input 
                        type="date" 
                        value={dateFilter.start} 
                        onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} 
                        className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">ДО ДАТЫ</label>
                      <input 
                        type="date" 
                        value={dateFilter.end} 
                        onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} 
                        className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100"
                      />
                    </div>
                  </div>
                </div>

                {/* safe filtered orders */}
                {(() => {
                  const filtered = Array.isArray(getFilteredOrders()) ? getFilteredOrders() : [];
                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center">
                        <FileText size={40} className="mx-auto text-gray-600 mb-3" strokeWidth={1.5} />
                        <p className="text-gray-400">Нет заказов</p>
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 space-y-3">
                      {filtered.map(order => (
                        <div key={order.id} className="bg-gray-850 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="text-sm font-bold text-white">
                                Заказ #{order.id} 
                                {order?.paymentStatus === 'due' && (
                                  <span className="ml-2 text-xs px-2 py-1 bg-red-600 rounded text-white font-semibold">В ДОЛГ</span>
                                )}
                              </h3>
                              <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                <Clock size={13} strokeWidth={2} /> {order.dateFormatted}
                              </p>
                              {order.customer?.name && (
                                <p className="text-xs text-teal-300 mt-1">
                                  {order.customer.name} {order.customer.phone && `• ${order.customer.phone}`}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button 
                                onClick={() => printReceipt(order)} 
                                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors flex items-center gap-1"
                                title="Печать"
                              >
                                <Printer size={14} strokeWidth={2} />
                              </button>
                              <button 
                                onClick={() => deleteOrder(order.id)} 
                                className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition-colors flex items-center gap-1"
                                title="Удалить"
                              >
                                <Trash2 size={14} strokeWidth={2} />
                              </button>
                            </div>
                          </div>

                          <div className="bg-gray-900 p-2 rounded mb-2 max-h-24 overflow-y-auto">
                            {(Array.isArray(order.items) ? order.items : []).map((item, idx) => {
                              const qty = Number(item?.quantity) || 0;
                              const price = Number(item?.price) || 0;
                              return (
                                <div key={idx} className="flex justify-between text-xs py-0.5 border-b border-gray-800 last:border-0">
                                  <span className="text-gray-300 truncate">{item?.name ?? 'Неизвестно'} <span className="text-gray-600">×{qty}</span></span>
                                  <span className="font-bold text-teal-400 ml-2 flex-shrink-0">${(price * qty).toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">ИТОГО:</span>
                            <div className="text-right">
                              <div className="text-lg font-bold text-teal-400">${(Number(order?.total) || 0).toFixed(2)}</div>
                              <div className="text-xs text-gray-400">{((Number(order?.total) || 0) * exchangeRate).toFixed(0)} UZS</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ANALYTICS VIEW */}
          {currentView === 'analytics' && (
            <div className="space-y-4 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-2">ОТ ДАТЫ</label>
                  <input 
                    type="date" 
                    value={dateFilter.start} 
                    onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} 
                    className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-2">ДО ДАТЫ</label>
                  <input 
                    type="date" 
                    value={dateFilter.end} 
                    onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} 
                    className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-teal-600 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white">
                      <DollarSign size={20} strokeWidth={2.5} />
                    </div>
                    <TrendingUp size={16} className="text-teal-400" strokeWidth={2} />
                  </div>
                  <div className="text-xs text-gray-400 mb-1">Выручка</div>
                  <div className="text-2xl font-bold text-white mb-1">${(Number(analytics?.totalRevenue) || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{((Number(analytics?.totalRevenue) || 0) * exchangeRate).toFixed(0)} UZS</div>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-teal-600 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white">
                      <FileText size={20} strokeWidth={2} />
                    </div>
                    <TrendingUp size={16} className="text-teal-400" strokeWidth={2} />
                  </div>
                  <div className="text-xs text-gray-400 mb-1">Заказов</div>
                  <div className="text-2xl font-bold text-white mb-1">{analytics?.totalOrders ?? 0}</div>
                  <div className="text-xs text-gray-500">За период</div>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-teal-600 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white">
                      <TrendingUp size={20} strokeWidth={2} />
                    </div>
                    <TrendingUp size={16} className="text-teal-400" strokeWidth={2} />
                  </div>
                  <div className="text-xs text-gray-400 mb-1">Ср. чек</div>
                  <div className="text-2xl font-bold text-white mb-1">${(Number(analytics?.avgOrderValue) || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{((Number(analytics?.avgOrderValue) || 0) * exchangeRate).toFixed(0)} UZS</div>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-teal-600 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white">
                      <Calendar size={20} strokeWidth={2} />
                    </div>
                    <TrendingUp size={16} className="text-teal-400" strokeWidth={2} />
                  </div>
                  <div className="text-xs text-gray-400 mb-1">Сегодня</div>
                  <div className="text-2xl font-bold text-white mb-1">${(Number(analytics?.todayRevenue) || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{analytics?.todayOrders ?? 0} заказов</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Топ-10 товаров</h3>
                  </div>
                  {(Array.isArray(analytics?.topProducts) ? analytics.topProducts : []).length === 0 ? (
                    <div className="text-center text-gray-400 py-8">Нет данных</div>
                  ) : (
                    <div className="space-y-2">
                      {(analytics?.topProducts || []).map(([name, data], idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-850 rounded hover:bg-gray-800 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-teal-600 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {idx+1}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-white truncate">{name}</div>
                              <div className="text-xs text-gray-500">{(data?.quantity) || 0} шт</div>
                            </div>
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <div className="text-xs font-bold text-teal-400">${(Number(data?.revenue) || 0).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{(((Number(data?.revenue) || 0) * exchangeRate) / 1000).toFixed(1)}K</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Доход по категориям</h3>
                  </div>
                  {Object.entries(analytics?.categoryRevenue || {}).length === 0 ? (
                    <div className="text-center text-gray-400 py-8">Нет данных</div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(analytics?.categoryRevenue || {}).sort(([, a], [, b]) => b - a).map(([category, revenue], idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-white font-medium">{category}</div>
                            <div className="text-xs font-bold text-teal-400">${(Number(revenue) || 0).toFixed(2)}</div>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all" 
                              style={{ width: `${((Number(revenue) || 0) / (Number(analytics?.totalRevenue) || 1)) * 100}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DEBTS VIEW */}
          {currentView === 'debts' && (
            <div className="space-y-4 overflow-y-auto h-full">
              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-850">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <DollarSign size={20} className="text-teal-400" strokeWidth={2.5} /> Долги
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowDebtModal(true)} 
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} strokeWidth={2.5} /> Новый долг
                    </button>
                    <button 
                      onClick={exportDebts} 
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Download size={16} strokeWidth={2} /> Экспорт
                    </button>
                  </div>
                </div>

                {debts.length === 0 ? (
                  <div className="p-12 text-center">
                    <DollarSign size={40} className="mx-auto text-gray-600 mb-3" strokeWidth={1.5} />
                    <p className="text-gray-400">Нет долгов</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {debts.map(d => (
                      <div 
                        key={d.id} 
                        className={`p-3 rounded-lg border transition-colors ${d.paid ? 'border-gray-700 bg-gray-850' : 'border-red-600/50 bg-red-900/10'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-bold text-white">{d.customerName}</h3>
                              {d.paid && <span className="text-xs px-2 py-0.5 bg-green-900/40 text-green-300 rounded-full">✓ Оплачено</span>}
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>Сумма: <span className="font-bold text-teal-400">${(Number(d.amount) || 0).toFixed(2)}</span></div>
                              <div>Создан: {new Date(d.createdAt).toLocaleString()}</div>
                              {d.customerPhone && <div>Телефон: {d.customerPhone}</div>}
                              {d.dueDate && <div>Срок: {new Date(d.dueDate).toLocaleDateString()}</div>}
                              {d.note && <div className="mt-1">Заметка: {d.note}</div>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            {!d.paid && (
                              <button 
                                onClick={() => markDebtPaid(d.id)} 
                                className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                Оплачено
                              </button>
                            )}
                            <button 
                              onClick={() => removeDebt(d.id)} 
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1"
                            >
                              <Trash2 size={12} strokeWidth={2} /> Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Debt Modal */}
      {showDebtModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" 
          onClick={() => setShowDebtModal(false)}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-850">
              <h3 className="font-bold text-white flex items-center gap-2 text-base">
                <DollarSign size={18} className="text-red-400" strokeWidth={2.5} /> Оформить долг
              </h3>
              <button 
                onClick={() => setShowDebtModal(false)} 
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Имя клиента</label>
                <input 
                  type="text" 
                  placeholder="Введите имя" 
                  value={debtForm.customerName} 
                  onChange={(e) => setDebtForm({ ...debtForm, customerName: e.target.value })} 
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Телефон</label>
                <input 
                  type="tel" 
                  placeholder="+998 (XX) XXX-XX-XX" 
                  value={debtForm.customerPhone} 
                  onChange={(e) => setDebtForm({ ...debtForm, customerPhone: e.target.value })} 
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Сумма (USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={debtForm.amount} 
                  onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} 
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Срок (опционально)</label>
                <input 
                  type="date" 
                  value={debtForm.dueDate} 
                  onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })} 
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-teal-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Заметка</label>
                <textarea 
                  placeholder="Добавить заметку..." 
                  value={debtForm.note} 
                  onChange={(e) => setDebtForm({ ...debtForm, note: e.target.value })} 
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-600 transition-colors"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={saveDebt} 
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
                >
                  ✓ Создать и оформить
                </button>
                <button 
                  onClick={() => setShowDebtModal(false)} 
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" 
          onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className={`px-4 py-3 border-b flex items-center justify-between ${confirmDialog.isDangerous ? 'border-red-600 bg-red-900/10' : 'border-gray-700 bg-gray-850'}`}>
              <h3 className={`font-bold text-lg ${confirmDialog.isDangerous ? 'text-red-400' : 'text-white'}`}>
                {confirmDialog.title}
              </h3>
            </div>
            <div className="p-4">
              <p className="text-gray-300 text-sm mb-4">{confirmDialog.message}</p>
              {confirmDialog.onConfirm ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      confirmDialog.onConfirm?.();
                      setConfirmDialog({ ...confirmDialog, show: false });
                    }} 
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${confirmDialog.isDangerous ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-teal-600 hover:bg-teal-500 text-white'}`}
                  >
                    ✓ Подтвердить
                  </button>
                  <button 
                    onClick={() => setConfirmDialog({ ...confirmDialog, show: false })} 
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmDialog({ ...confirmDialog, show: false })} 
                  className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-sm transition-colors"
                >
                  ✓ Ок
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {showCalculator && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" 
          onClick={() => setShowCalculator(false)}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-850">
              <h3 className="font-bold text-white flex items-center gap-2 text-base">
                <Calculator size={18} className="text-teal-400" strokeWidth={2.5} /> Конвертер валют
              </h3>
              <button 
                onClick={() => setShowCalculator(false)} 
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <input 
                type="number" 
                step="0.01"
                value={calculatorAmount} 
                onChange={(e) => setCalculatorAmount(e.target.value)} 
                placeholder="Введите сумму" 
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-2xl text-white font-bold placeholder-gray-500 focus:outline-none focus:border-teal-600 transition-colors text-center"
              />
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setSelectedCurrency('USD')} 
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${selectedCurrency === 'USD' ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}
                >
                  $ USD → ⟶ UZS
                </button>
                <button 
                  onClick={() => setSelectedCurrency('UZS')} 
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${selectedCurrency === 'UZS' ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}
                >
                  сум UZS ⟶ USD
                </button>
              </div>

              {calculatorAmount && !isNaN(parseFloat(calculatorAmount)) && (
                <div className="bg-gradient-to-r from-teal-900/40 to-teal-800/40 border border-teal-600/50 p-4 rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Результат</div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-3xl font-black text-teal-400">
                      {selectedCurrency === 'USD'
                        ? `${(parseFloat(calculatorAmount) * exchangeRate).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} `
                        : `$${(parseFloat(calculatorAmount) / exchangeRate).toFixed(2)}`
                      }
                    </div>
                    <div className={`text-2xl font-black ${selectedCurrency === 'USD' ? 'text-orange-400' : 'text-teal-400'}`}>
                      {selectedCurrency === 'USD' ? 'сум' : '$'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { 
                        const toCopy = selectedCurrency === 'USD' 
                          ? `${(parseFloat(calculatorAmount) * exchangeRate).toFixed(0)}`
                          : `${(parseFloat(calculatorAmount) / exchangeRate).toFixed(2)}`;
                        navigator.clipboard?.writeText(toCopy);
                        setConfirmDialog({
                          show: true,
                          title: '✅ Скопировано',
                          message: `"${toCopy}" в буфер обмена`,
                          onConfirm: null,
                          isDangerous: false
                        });
                      }} 
                      className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      📋 Копировать
                    </button>
                    <button 
                      onClick={() => setCalculatorAmount('')} 
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg text-sm font-bold transition-colors"
                    >
                      ✕ Очистить
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Курс: 1 USD = {exchangeRate.toLocaleString()} UZS</div>
                </div>
              )}

              <button 
                onClick={() => setShowCalculator(false)} 
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectroMaxPro;