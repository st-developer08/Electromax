import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Package, DollarSign, Calendar, Search, ShoppingCart, Printer,
  BarChart3, Users, FileText, Calculator, Clock, AlertCircle,
  Check, X, Edit2, Trash2, Plus, ArrowLeft, ArrowRight, Download,
  RefreshCw, Menu, Zap, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';

/**
 * ElectroMaxPro — Приятная современная цветовая схема
 * Мягкие цвета, которые не утомляют глаза
 */

// Улучшенный Fuzzy Search с поддержкой частичного совпадения
const fuzzySearchWithHighlight = (searchTerm, items, keys) => {
  if (!searchTerm.trim()) return items.map(item => ({ ...item, highlights: {} }));
  
  const term = searchTerm.toLowerCase().trim();
  const words = term.split(/\s+/).filter(w => w.length > 0);
  
  return items
    .map(item => {
      let matchScore = 0;
      const highlights = {};
      
      keys.forEach(key => {
        const value = (item[key] ?? '').toString().toLowerCase();
        highlights[key] = highlightMatches((item[key] ?? '').toString(), term);
        
        words.forEach(word => {
          if (value.includes(word)) {
            matchScore += 10;
          }
          else if (value.startsWith(word)) {
            matchScore += 8;
          }
          else {
            const similarity = getStringSimilarity(word, value);
            if (similarity > 0.6) {
              matchScore += similarity * 5;
            }
          }
        });
      });
      
      return { ...item, highlights, matchScore };
    })
    .filter(item => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
};

const getStringSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const getEditDistance = (str1, str2) => {
  const costs = [];
  
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }
  
  return costs[str2.length];
};

const highlightMatches = (text, searchTerm) => {
  if (!searchTerm.trim()) return text;
  
  const term = searchTerm.toLowerCase().trim();
  const words = term.split(/\s+/).filter(w => w.length > 0);
  let result = text;
  
  words.forEach(word => {
    const regex = new RegExp(`(${word})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });
  
  return result;
};

const HighlightedText = ({ text }) => {
  return (
    <span dangerouslySetInnerHTML={{ __html: text }} />
  );
};

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
  const [exchangeRate, setExchangeRate] = useState(12000);
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
  const itemsPerPage = 12;

  const safeParse = (str) => {
    try { 
      const parsed = JSON.parse(str);
      return parsed;
    } catch (e) { 
      console.error('Parse error:', e);
      return null; 
    }
  };

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

  const fetchExchangeRate = async () => {
    try {
      const uzbRate = 12000;
      setExchangeRate(uzbRate);
    } catch (error) {
      console.log('Используется стандартный курс');
    }
  };

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

  const analytics = useMemo(() => computeAnalytics(), [orders, products, dateFilter]);

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

    const savedOrdersRaw = safeParse(localStorage.getItem('electromax_orders'));
    if (Array.isArray(savedOrdersRaw)) {
      const normalized = savedOrdersRaw.map(o => {
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
      setOrders(normalized);
    }

    const savedDebtsRaw = localStorage.getItem('electromax_debts');
    if (savedDebtsRaw) {
      const parsed = safeParse(savedDebtsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalizedDebts = parsed.map(d => ({
          ...d,
          amount: Number(d?.amount) || 0,
          createdAt: d?.createdAt || new Date().toISOString()
        }));
        setDebts(normalizedDebts);
      }
    }

    fetchExchangeRate();
    const interval = setInterval(fetchExchangeRate, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (Array.isArray(debts) && debts.length > 0) {
      const debtData = debts.map(d => ({
        id: d.id,
        createdAt: d.createdAt,
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        amount: d.amount,
        dueDate: d.dueDate || null,
        note: d.note || '',
        paid: d.paid || false,
        paidAt: d.paidAt || null
      }));
      localStorage.setItem('electromax_debts', JSON.stringify(debtData));
    } else if (debts.length === 0) {
      const existing = localStorage.getItem('electromax_debts');
      if (!existing) {
        localStorage.setItem('electromax_debts', JSON.stringify([]));
      }
    }
  }, [debts]);

  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('electromax_orders', JSON.stringify(orders));
    }
  }, [orders]);

  const getCategories = () => {
    return ['all', ...new Set((Array.isArray(products) ? products : []).map(p => p.category))];
  };

  const filteredProducts = useMemo(() => {
    const allProducts = Array.isArray(products) ? products : [];
    
    let result = allProducts;
    
    if (searchTerm.trim()) {
      result = fuzzySearchWithHighlight(searchTerm, result, ['name', 'category']);
    } else {
      result = result.map(item => ({ ...item, highlights: {} }));
    }
    
    if (filterCategory !== 'all') {
      result = result.filter(p => p?.category === filterCategory);
    }
    
    return result;
  }, [products, searchTerm, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

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
            ${order.customer?.name ? `<p>Клиент: ${order.customer.name}</p>` : ''}
             <p>Свяжитесь с нами по телефону:</p>
              <p>+998 99 668 39 85</p>
              <p>+998-(90)-455-30-07</p>
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
      customerPhone: debtForm.customerPhone || '',
      amount: amountNum,
      dueDate: debtForm.dueDate || null,
      note: debtForm.note || '',
      paid: false,
      paidAt: null
    };
    
    const updatedDebts = [newDebt, ...debts];
    setDebts(updatedDebts);
    
    localStorage.setItem('electromax_debts', JSON.stringify(updatedDebts));
    
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
        localStorage.setItem('electromax_debts', JSON.stringify(updatedDebts));

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
        const updatedDebts = debts.filter(d => d.id !== debtId);
        setDebts(updatedDebts);
        localStorage.setItem('electromax_debts', JSON.stringify(updatedDebts));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-base font-medium text-slate-700">Загрузка системы...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'order', label: 'Касса', icon: ShoppingCart, badge: cart.length },
    { id: 'products', label: 'Товары', icon: Package },
    { id: 'orders', label: 'Заказы', icon: FileText, badge: orders.length },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'debts', label: 'Долги', icon: DollarSign, badge: debts.filter(d => !d.paid).length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 flex">
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-20'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 transition-all duration-300 flex flex-col fixed h-screen z-40 overflow-y-auto shadow-xl`}>
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                <Zap size={24} className="text-white" strokeWidth={2.5} />
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <h1 className="font-black text-white text-sm leading-tight">ELECTRO<span className="text-emerald-400">MAX</span></h1>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-slate-700 rounded flex-shrink-0 transition-colors">
                <ArrowLeft size={18} className="text-slate-300" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${currentView === item.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-700/50'}`}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className={currentView === item.id ? 'text-emerald-400' : 'text-slate-400'} strokeWidth={2} />
                </div>
                {sidebarOpen && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {!sidebarOpen && item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-emerald-500">
                    {item.badge}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700 flex-shrink-0">
          <button 
            onClick={() => setShowCalculator(!showCalculator)} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${showCalculator ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-700/50'}`}
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
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded flex-shrink-0 transition-colors">
                  <Menu size={20} className="text-slate-600" strokeWidth={2} />
                </button>
              )}
            </div>

            <img className='w-[160px] h-[40px] rounded-lg mr-[0px]' src="/logo.jpg" alt="logo" />

            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-cyan-50 px-3 py-2 rounded-lg text-xs text-emerald-700 font-medium border border-emerald-200">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>ОНЛАЙН</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50">
          {/* ORDER VIEW */}
          {currentView === 'order' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
              {/* Products Catalog */}
              <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                  <div className="">
                   
                    
                  </div>

                  {/* SEARCH */}
                  <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search size={22} className="absolute left-2.5 top-3.5 text-emerald-600" strokeWidth={2} />
                        <input
                          type="text"
                          placeholder="Поиск товара..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-3.5 pl-9 bg-white border border-slate-300 rounded-lg text-[15px] text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                        />
                        {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <X size={16} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Category Filter */}
                    <div className="flex gap-1.5 flex-wrap">
                      {getCategories().map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFilterCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            filterCategory === cat
                              ? 'bg-emerald-500 text-white shadow-md'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 border border-slate-200'
                          }`}
                        >
                          
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Product Grid */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {paginatedProducts.length === 0 ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                        <AlertCircle size={40} className="text-slate-300 mb-2" strokeWidth={1.5} />
                        <p className="text-slate-500 text-xs font-medium">Товары не найдены</p>
                        {searchTerm && <p className="text-slate-400 text-xs mt-1">Попробуйте другой поисковый запрос</p>}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                        {paginatedProducts.map(product => (
                          <div 
                            key={product.id} 
                            className="bg-white border border-slate-200 hover:border-emerald-400 rounded-lg p-2 hover:shadow-md transition-all group flex flex-col h-full"
                          >
                            {/* Name */}
                            <p className="text-xs font-semibold text-slate-900 line-clamp-3 mb-1 flex-grow leading-tight">
                              {product.highlights?.name ? (
                                <HighlightedText text={product.highlights.name} />
                              ) : (
                                product.name
                              )}
                            </p>

                            {/* Category & Stock */}
                            <div className="flex gap-0.5 mb-1 flex-wrap">
                              <span className="px-1 py-0.5 bg-slate-100 rounded text-xs text-slate-700 font-medium truncate leading-tight">
                                {product.highlights?.category ? (
                                  <HighlightedText text={product.highlights.category} />
                                ) : (
                                  product.category || '—'
                                )}
                              </span>
                              {product.stock !== undefined && product.stock !== null && (
                                <span className={`px-1 py-0.5 rounded text-xs font-bold whitespace-nowrap leading-tight ${product.stock > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {product.stock}
                                </span>
                              )}
                            </div>

                            {/* Price & Button */}
                            <div className="flex items-end justify-between gap-1 mt-auto">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-emerald-600 leading-none">
                                  ${ (Number(product.price) || 0).toFixed(2) }
                                </p>
                                <p className="text-xs text-slate-500 leading-none">
                                  { ((Number(product.price) || 0) * exchangeRate / 1000).toFixed(1) }K
                                </p>
                              </div>
                              <button 
                                onClick={() => addToCart(product)} 
                                className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center transition-all shadow-sm hover:shadow-md flex-shrink-0"
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
                    <div className="p-2.5 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                          disabled={currentPage === 1} 
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-200"
                        >
                          <ChevronUp size={13} className="text-slate-600" strokeWidth={2.5} />
                        </button>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                            if (pageNum > totalPages) return null;
                            return (
                              <button 
                                key={pageNum} 
                                onClick={() => setCurrentPage(pageNum)} 
                                className={`w-5 h-5 rounded text-xs font-bold transition-colors ${currentPage === pageNum ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-emerald-100'}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                          disabled={currentPage === totalPages} 
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-200"
                        >
                          <ChevronDown size={13} className="text-slate-600" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div className="text-slate-600 font-medium text-xs">{currentPage}/{totalPages}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* CART SIDEBAR */}
              <div className="lg:col-span-[400px] h-full min-h-0">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <ShoppingCart size={18} className="text-emerald-600" strokeWidth={2.5} /> Корзина
                    </h3>
                    {cart.length > 0 && <span className="text-xs bg-emerald-500 px-2 py-0.5 rounded-full text-white font-bold">{cart.length}</span>}
                  </div>

                  <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
                    <input 
                      type="text" 
                      placeholder="Имя" 
                      value={customerInfo.name} 
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} 
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                    />
                    <input 
                      type="tel" 
                      placeholder="Телефон" 
                      value={customerInfo.phone} 
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} 
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                    />
                  </div>

                  {cart.length === 0 ? (
                    <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-white">
                      <ShoppingCart size={40} className="text-slate-300 mb-2" strokeWidth={1.5} />
                      <p className="text-slate-500 text-xs font-medium">Корзина пуста</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-white">
                        {cart.map(item => (
                          <div key={item.id} className="flex items-start justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-200 hover:border-emerald-400 transition-colors group text-xs">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="flex items-center bg-white rounded border border-slate-300">
                                <button 
                                  onClick={() => updateQuantity(item.id, Number(item.quantity) - 1)} 
                                  className="px-1.5 py-0.5 text-slate-600 hover:text-emerald-600 text-xs font-bold"
                                >
                                  −
                                </button>
                                <span className="px-1.5 py-0.5 font-bold">{Number(item.quantity) || 0}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, Number(item.quantity) + 1)} 
                                  className="px-1.5 py-0.5 text-white bg-emerald-500 hover:bg-emerald-600 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                              <p className="font-bold text-emerald-600 ml-1">${((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</p>
                              <button 
                                onClick={() => removeFromCart(item.id)} 
                                className="text-slate-400 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 border-t border-slate-200 space-y-3 bg-gradient-to-b from-white to-slate-50">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-center">
                            <div className="text-xs text-emerald-700 font-bold">Товаров</div>
                            <div className="font-bold text-slate-900">{cart.length}</div>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-center">
                            <div className="text-xs text-emerald-700 font-bold">Единиц</div>
                            <div className="font-bold text-slate-900">{cart.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}</div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-100 to-cyan-100 border border-emerald-300 p-3 rounded-lg text-center">
                          <div className="text-xs text-emerald-900 font-bold mb-1">Итого</div>
                          <div className="text-2xl font-black text-emerald-700">${(calculateTotal()).toFixed(2)}</div>
                          <div className="text-xs text-emerald-700 font-medium">{(calculateTotal() * exchangeRate).toFixed(0)} сум</div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => completeOrder(false, null)} 
                            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-md hover:shadow-lg"
                          >
                            <Check size={14} strokeWidth={2.5} /> ОФОРМИТЬ
                          </button>
                          <button 
                            onClick={openDebtModal} 
                            className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-md hover:shadow-lg"
                          >
                            <DollarSign size={14} strokeWidth={2.5} /> ДОЛГ
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
            <div className="space-y-3 overflow-y-auto h-full">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Package size={18} className="text-emerald-600" strokeWidth={2.5} /> Товары
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
                            message: 'Товары обновлены!',
                            onConfirm: null,
                            isDangerous: false
                          });
                        } catch (error) { 
                          setConfirmDialog({
                            show: true,
                            title: '❌ Ошибка',
                            message: 'Не удалось загрузить',
                            onConfirm: null,
                            isDangerous: false
                          });
                        } 
                      }} 
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={14} strokeWidth={2} /> Обновить
                    </button>
                    <button 
                      onClick={() => { 
                        const dataStr = JSON.stringify({ products }, null, 2); 
                        const blob = new Blob([dataStr], { type: 'application/json' }); 
                        const url = URL.createObjectURL(blob); 
                        const a = document.createElement('a'); 
                        a.href = url; 
                        a.download = `products.json`; 
                        document.body.appendChild(a); 
                        a.click(); 
                        document.body.removeChild(a); 
                        URL.revokeObjectURL(url); 
                      }} 
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Download size={14} strokeWidth={2} /> Экспорт
                    </button>
                  </div>
                </div>

                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-2 text-left font-bold text-slate-900">НАЗВАНИЕ</th>
                        <th className="px-2 py-2 text-left font-bold text-slate-900">КАТЕГОРИЯ</th>
                        <th className="px-2 py-2 text-right font-bold text-slate-900">USD</th>
                        <th className="px-2 py-2 text-right font-bold text-slate-900">UZS</th>
                        <th className="px-2 py-2 text-center font-bold text-slate-900">ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2 py-1.5">
                            {editingProduct === product.id ? (
                              <input 
                                type="text" 
                                value={editForm.name} 
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                                className="w-full px-1.5 py-0.5 bg-white border border-emerald-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                autoFocus
                              />
                            ) : (
                              <span className="text-slate-900 font-medium">{product.name}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-slate-700">{product.category || '—'}</td>
                          <td className="px-2 py-1.5 text-right">
                            {editingProduct === product.id ? (
                              <input 
                                type="number" 
                                step="0.01" 
                                value={editForm.price} 
                                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} 
                                className="w-20 px-1.5 py-0.5 bg-white border border-emerald-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            ) : (
                              <span className="font-bold text-emerald-600">${(Number(product.price) || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-700">{((Number(product.price) || 0) * exchangeRate).toFixed(0)}</td>
                          <td className="px-2 py-1.5 text-center">
                            {editingProduct === product.id ? (
                              <div className="flex gap-0.5 justify-center">
                                <button 
                                  onClick={() => { 
                                    const updatedProducts = products.map(p => 
                                      p.id === product.id 
                                        ? { ...p, name: editForm.name, price: parseFloat(editForm.price) } 
                                        : p
                                    ); 
                                    setProducts(updatedProducts); 
                                    setEditingProduct(null); 
                                  }} 
                                  className="px-1.5 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs transition-colors font-bold"
                                >
                                  <Check size={12} strokeWidth={2.5} />
                                </button>
                                <button 
                                  onClick={() => setEditingProduct(null)} 
                                  className="px-1.5 py-0.5 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded text-xs transition-colors font-bold"
                                >
                                  <X size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => { 
                                  setEditingProduct(product.id); 
                                  setEditForm({ name: product.name, price: product.price, unit: product.unit }); 
                                }} 
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded text-xs transition-colors font-bold"
                              >
                                <Edit2 size={12} strokeWidth={2} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white text-xs text-slate-600 flex items-center justify-between font-medium">
                  <div>{paginatedProducts.length} / {filteredProducts.length}</div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded text-xs transition-colors font-bold"
                    >
                      ‹
                    </button>
                    <span className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold">{currentPage}/{totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded text-xs transition-colors font-bold"
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
            <div className="space-y-3 overflow-y-auto h-full">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-600" strokeWidth={2.5} /> Заказы
                  </h2>
                  <button 
                    onClick={() => { 
                      const dataStr = JSON.stringify(orders, null, 2); 
                      const blob = new Blob([dataStr], { type: 'application/json' }); 
                      const url = URL.createObjectURL(blob); 
                      const a = document.createElement('a'); 
                      a.href = url; 
                      a.download = `orders.json`; 
                      document.body.appendChild(a); 
                      a.click(); 
                      document.body.removeChild(a); 
                      URL.revokeObjectURL(url); 
                    }} 
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Download size={14} strokeWidth={2} /> Экспорт
                  </button>
                </div>

                <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-700 block mb-1.5 font-bold">ОТ</label>
                      <input 
                        type="date" 
                        value={dateFilter.start} 
                        onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} 
                        className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-700 block mb-1.5 font-bold">ДО</label>
                      <input 
                        type="date" 
                        value={dateFilter.end} 
                        onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} 
                        className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  const filtered = Array.isArray(getFilteredOrders()) ? getFilteredOrders() : [];
                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center bg-white">
                        <FileText size={40} className="mx-auto text-slate-300 mb-2" strokeWidth={1.5} />
                        <p className="text-slate-500 text-xs font-medium">Нет заказов</p>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 space-y-2 bg-white divide-y divide-slate-200">
                      {filtered.map(order => (
                        <div key={order.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 hover:shadow-sm transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="text-xs font-bold text-slate-900">
                                Заказ #{order.id} 
                                {order?.paymentStatus === 'due' && (
                                  <span className="ml-1 text-xs px-2 py-0.5 bg-rose-500 rounded text-white font-bold">ДОЛГ</span>
                                )}
                              </h3>
                              <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                                <Clock size={12} strokeWidth={2} /> {order.dateFormatted}
                              </p>
                              {order.customer?.name && (
                                <p className="text-xs text-emerald-700 mt-1 font-semibold">👤 {order.customer.name}</p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button 
                                onClick={() => printReceipt(order)} 
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded text-xs transition-colors flex items-center gap-0.5"
                              >
                                <Printer size={12} strokeWidth={2} />
                              </button>
                              <button 
                                onClick={() => deleteOrder(order.id)} 
                                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-xs transition-colors flex items-center gap-0.5"
                              >
                                <Trash2 size={12} strokeWidth={2} />
                              </button>
                            </div>
                          </div>

                          <div className="bg-white p-1.5 rounded border border-emerald-200 mb-2 max-h-16 overflow-y-auto text-xs">
                            {(Array.isArray(order.items) ? order.items : []).map((item, idx) => {
                              const qty = Number(item?.quantity) || 0;
                              const price = Number(item?.price) || 0;
                              return (
                                <div key={idx} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                                  <span className="text-slate-900 truncate">{item?.name} ×{qty}</span>
                                  <span className="font-bold text-emerald-600 ml-1">${(price * qty).toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center bg-emerald-200 p-1.5 rounded border border-emerald-300 text-xs">
                            <span className="text-emerald-900 font-bold">ИТОГО:</span>
                            <div>
                              <span className="font-bold text-emerald-700">${(Number(order?.total) || 0).toFixed(2)}</span>
                              <span className="text-slate-700 ml-1 font-medium">{((Number(order?.total) || 0) * exchangeRate).toFixed(0)} UZS</span>
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
            <div className="space-y-3 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 block mb-1.5 font-bold">ОТ</label>
                  <input 
                    type="date" 
                    value={dateFilter.start} 
                    onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} 
                    className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 block mb-1.5 font-bold">ДО</label>
                  <input 
                    type="date" 
                    value={dateFilter.end} 
                    onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} 
                    className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <DollarSign size={18} strokeWidth={2.5} />
                    </div>
                    <TrendingUp size={16} className="text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="text-xs text-slate-600 mb-0.5 font-bold">Выручка</div>
                  <div className="text-xl font-bold text-slate-900">${(Number(analytics?.totalRevenue) || 0).toFixed(2)}</div>
                  <div className="text-xs text-slate-600">{((Number(analytics?.totalRevenue) || 0) * exchangeRate).toFixed(0)} UZS</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <FileText size={18} strokeWidth={2} />
                    </div>
                    <TrendingUp size={16} className="text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="text-xs text-slate-600 mb-0.5 font-bold">Заказов</div>
                  <div className="text-xl font-bold text-slate-900">{analytics?.totalOrders ?? 0}</div>
                  <div className="text-xs text-slate-600">За период</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <TrendingUp size={18} strokeWidth={2} />
                    </div>
                    <TrendingUp size={16} className="text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="text-xs text-slate-600 mb-0.5 font-bold">Ср. чек</div>
                  <div className="text-xl font-bold text-slate-900">${(Number(analytics?.avgOrderValue) || 0).toFixed(2)}</div>
                  <div className="text-xs text-slate-600">{((Number(analytics?.avgOrderValue) || 0) * exchangeRate).toFixed(0)} UZS</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Calendar size={18} strokeWidth={2} />
                    </div>
                    <TrendingUp size={16} className="text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="text-xs text-slate-600 mb-0.5 font-bold">Сегодня</div>
                  <div className="text-xl font-bold text-slate-900">${(Number(analytics?.todayRevenue) || 0).toFixed(2)}</div>
                  <div className="text-xs text-slate-600">{analytics?.todayOrders ?? 0} заказов</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">Топ товаров</h3>
                  {(analytics?.topProducts || []).length === 0 ? (
                    <div className="text-center text-slate-500 py-4 text-xs">Нет данных</div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {(analytics?.topProducts || []).map(([name, data], idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 bg-emerald-50 rounded border border-emerald-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {idx+1}
                            </div>
                            <div className="min-w-0">
                              <div className="text-slate-900 font-semibold truncate">{name}</div>
                              <div className="text-slate-600">{(data?.quantity) || 0} шт</div>
                            </div>
                          </div>
                          <div className="text-right ml-1 flex-shrink-0">
                            <div className="font-bold text-emerald-700">${(Number(data?.revenue) || 0).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">Категории</h3>
                  {Object.entries(analytics?.categoryRevenue || {}).length === 0 ? (
                    <div className="text-center text-slate-500 py-4 text-xs">Нет данных</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Object.entries(analytics?.categoryRevenue || {}).sort(([, a], [, b]) => b - a).map(([category, revenue], idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-0.5 text-xs">
                            <div className="text-slate-900 font-semibold">{category}</div>
                            <div className="font-bold text-emerald-700">${(Number(revenue) || 0).toFixed(2)}</div>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all" 
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
            <div className="space-y-3 overflow-y-auto h-full">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" strokeWidth={2.5} /> Долги ({debts.filter(d => !d.paid).length})
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowDebtModal(true)} 
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Новый
                    </button>
                    <button 
                      onClick={exportDebts} 
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Download size={14} strokeWidth={2} /> Экспорт
                    </button>
                  </div>
                </div>

                {debts.length === 0 ? (
                  <div className="p-8 text-center bg-white">
                    <DollarSign size={40} className="mx-auto text-slate-300 mb-2" strokeWidth={1.5} />
                    <p className="text-slate-500 text-xs font-medium">Нет долгов</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2 bg-white">
                    {debts.map(d => (
                      <div 
                        key={d.id} 
                        className={`p-3 rounded-lg border-2 transition-all text-xs ${d.paid ? 'border-slate-300 bg-slate-50' : 'border-rose-300 bg-rose-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <h3 className="font-bold text-slate-900">{d.customerName}</h3>
                              {d.paid && <span className="text-xs px-1.5 py-0.5 bg-emerald-500 text-white rounded-full font-bold">✓</span>}
                            </div>
                            <div className="text-xs text-slate-700 space-y-0.5 font-medium">
                              <div>💰 ${(Number(d.amount) || 0).toFixed(2)}</div>
                              <div className="text-slate-600">{new Date(d.createdAt).toLocaleDateString()}</div>
                              {d.customerPhone && <div className="text-slate-600">{d.customerPhone}</div>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0 ml-2">
                            {!d.paid && (
                              <button 
                                onClick={() => markDebtPaid(d.id)} 
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors whitespace-nowrap shadow-sm"
                              >
                                ✓ Оплачено
                              </button>
                            )}
                            <button 
                              onClick={() => removeDebt(d.id)} 
                              className="px-2 py-1 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded text-xs font-bold transition-colors whitespace-nowrap"
                            >
                             <div className="flex items-center gap-2">
                               Удалить
                              <Trash2 size={12} strokeWidth={2} />
                             </div>
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

      {/* MODALS */}
      {showDebtModal && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm" 
          onClick={() => setShowDebtModal(false)}
        >
          <div 
            className="bg-white border border-slate-300 rounded-xl w-full max-w-md shadow-xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <DollarSign size={18} className="text-rose-500" strokeWidth={2.5} /> Долг
              </h3>
              <button 
                onClick={() => setShowDebtModal(false)} 
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-emerald-100 rounded transition-colors"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-700 block mb-2 font-bold">Имя</label>
                <input 
                  type="text" 
                  placeholder="Введите имя" 
                  value={debtForm.customerName} 
                  onChange={(e) => setDebtForm({ ...debtForm, customerName: e.target.value })} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 block mb-2 font-bold">Телефон</label>
                <input 
                  type="tel" 
                  placeholder="+998 (XX) XXX-XX-XX" 
                  value={debtForm.customerPhone} 
                  onChange={(e) => setDebtForm({ ...debtForm, customerPhone: e.target.value })} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 block mb-2 font-bold">Сумма (USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={debtForm.amount} 
                  onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 block mb-2 font-bold">Срок</label>
                <input 
                  type="date" 
                  value={debtForm.dueDate} 
                  onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={saveDebt} 
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg"
                >
                  ✓ Создать и оформить
                </button>
                <button 
                  onClick={() => setShowDebtModal(false)} 
                  className="flex-1 py-3 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg font-bold text-sm transition-colors"
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
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm" 
          onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
        >
          <div 
            className="bg-white border border-slate-300 rounded-xl w-full max-w-sm shadow-xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b flex items-center justify-between ${confirmDialog.isDangerous ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white'}`}>
              <h3 className={`font-bold text-lg ${confirmDialog.isDangerous ? 'text-rose-700' : 'text-slate-900'}`}>
                {confirmDialog.title}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-slate-700 text-sm mb-5 font-medium">{confirmDialog.message}</p>
              {confirmDialog.onConfirm ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      confirmDialog.onConfirm?.();
                      setConfirmDialog({ ...confirmDialog, show: false });
                    }} 
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${confirmDialog.isDangerous ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'}`}
                  >
                    ✓ Подтвердить
                  </button>
                  <button 
                    onClick={() => setConfirmDialog({ ...confirmDialog, show: false })} 
                    className="flex-1 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg font-bold text-sm transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmDialog({ ...confirmDialog, show: false })} 
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-all shadow-md"
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
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm" 
          onClick={() => setShowCalculator(false)}
        >
          <div 
            className="bg-white border border-slate-300 rounded-xl w-full max-w-sm shadow-xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <Calculator size={18} className="text-emerald-600" strokeWidth={2.5} /> Конвертер
              </h3>
              <button 
                onClick={() => setShowCalculator(false)} 
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-emerald-100 rounded transition-colors"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input 
                type="number" 
                step="0.01"
                value={calculatorAmount} 
                onChange={(e) => setCalculatorAmount(e.target.value)} 
                placeholder="Введите сумму" 
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-2xl text-slate-900 font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-center"
              />
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setSelectedCurrency('USD')} 
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${selectedCurrency === 'USD' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-200 text-slate-900 border border-slate-300 hover:bg-emerald-100'}`}
                >
                  $ USD → UZS
                </button>
                <button 
                  onClick={() => setSelectedCurrency('UZS')} 
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${selectedCurrency === 'UZS' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-200 text-slate-900 border border-slate-300 hover:bg-emerald-100'}`}
                >
                  UZS → $
                </button>
              </div>

              {calculatorAmount && !isNaN(parseFloat(calculatorAmount)) && (
                <div className="bg-gradient-to-br from-emerald-100 to-cyan-100 border border-emerald-300 p-4 rounded-lg">
                  <div className="text-xs text-emerald-900 mb-2 font-bold">Результат</div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl font-black text-emerald-900">
                      {selectedCurrency === 'USD'
                        ? `${(parseFloat(calculatorAmount) * exchangeRate).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} `
                        : `$${(parseFloat(calculatorAmount) / exchangeRate).toFixed(2)}`
                      }
                    </div>
                    <div className={`text-2xl font-black ${selectedCurrency === 'USD' ? 'text-amber-700' : 'text-emerald-900'}`}>
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
                      }} 
                      className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all shadow-md"
                    >
                      📋 Копировать
                    </button>
                    <button 
                      onClick={() => setCalculatorAmount('')} 
                      className="flex-1 px-3 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg text-sm font-bold transition-colors"
                    >
                      ✕ Очистить
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowCalculator(false)} 
                className="w-full py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg font-bold text-sm transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        mark {
          background-color: #fbbf24;
          color: #78350f;
          font-weight: bold;
          border-radius: 3px;
          padding: 0 2px;
        }
      `}</style>
    </div>
  );
};

export default ElectroMaxPro;