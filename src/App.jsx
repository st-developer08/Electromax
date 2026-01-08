import React, { useState, useEffect } from 'react';
import products from '../public/products.json';

console.log(products);

const ElectroMaxApp = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '' });
  const [currentView, setCurrentView] = useState('order');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Загрузка products.json из корня проекта
  useEffect(() => {
  const loadProducts = async () => {
    try {
      setLoading(true);

      // Просто fetch с корня public
      const response = await fetch('/products.json');

      if (!response.ok) throw new Error('Файл не найден');
      
      const data = await response.json();
      const productsData = data.products || data;
      
      setProducts(productsData);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки products.json:', error);
      alert('Не удалось загрузить products.json. Убедитесь что файл находится в папке public/');
      setLoading(false);
    }
  };

  loadProducts();

  const savedOrders = localStorage.getItem('electromax_orders');
  if (savedOrders) {
    setOrders(JSON.parse(savedOrders));
  }
}, []);


  // Сохранение заказов
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('electromax_orders', JSON.stringify(orders));
    }
  }, [orders]);

 const filteredProducts = products.filter(p => {
  const term = searchTerm.toLowerCase().trim();

  return (
    p.name.toLowerCase().includes(term) ||
    p.id.toString().includes(term)
  );
});

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };

  const completeOrder = () => {
    if (cart.length === 0) {
      alert('Корзина пуста!');
      return;
    }

    const newOrder = {
      id: Date.now(),
      date: new Date().toLocaleString('ru-RU'),
      items: [...cart],
      total: calculateTotal()
    };

    setOrders([newOrder, ...orders]);
    setCart([]);
    alert(`✅ Заказ оформлен! Итого: $${newOrder.total}`);
  };

  const newOrder = () => {
    if (cart.length > 0) {
      const confirm = window.confirm('Начать новый заказ? Текущая корзина будет очищена.');
      if (!confirm) return;
    }
    setCart([]);
  };

  const startEditing = (product) => {
    setEditingProduct(product.id);
    setEditForm({ name: product.name, price: product.price });
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setEditForm({ name: '', price: '' });
  };

  const saveProduct = async (productId) => {
    const updatedProducts = products.map(p =>
      p.id === productId
        ? { ...p, name: editForm.name, price: parseFloat(editForm.price) }
        : p
    );
    
    setProducts(updatedProducts);
    
    // Создаем JSON для сохранения
    const jsonData = JSON.stringify({ products: updatedProducts }, null, 2);
    
    // Создаем Blob и скачиваем файл
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('💾 Изменения сохранены! Загрузите файл products.json в папку public/ для применения изменений.');
    cancelEditing();
  };

  const reloadFromFile = async () => {
    try {
      const response = await fetch('/products.json');
      const data = await response.json();
      const productsData = data.products || data;
      
      setProducts(productsData);
      alert('✅ Данные перезагружены из файла!');
    } catch (error) {
      alert('❌ Ошибка загрузки файла');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-slate-700">Загрузка базы данных...</p>
        </div>
      </div>
    );
  }

  return (
   <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 text-slate-100">

      {/* Header */}
<header className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg">
  <div className="max-w-full px-6 py-2 flex items-center justify-between">

    <div className="flex items-center gap-4">
      <img src="/logo.jpg" className="h-10 bg-white rounded px-2" />
      <div>
        <h1 className="text-white font-bold text-xl tracking-wide">
          ELECTROMAX POS
        </h1>
        <p className="text-slate-400 text-xs">
          Кассовая система
        </p>
      </div>
    </div>

    <div className="flex items-center gap-6">
      <div className="text-right">
        <p className="text-xs text-slate-400">Товаров</p>
        <p className="text-lg font-bold text-white">{products.length}</p>
      </div>

      <div className="flex items-center gap-2 text-emerald-400 text-sm">
        <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
        Онлайн
      </div>
    </div>

  </div>
</header>



     {/* Навигация */}
<nav className="bg-white shadow-md">
  <div className="flex ">

    <button
      onClick={() => setCurrentView('order')}
      className={` flex-1 py-1 font-semibold text-sm transition
        ${currentView === 'order'
          ? 'bg-emerald-600 text-white'
          : 'bg-white text-slate-700 hover:bg-slate-100'}`}
    >
      НОВЫЙ ЗАКАЗ
    </button>

    <button
      onClick={() => setCurrentView('products')}
      className={`flex-1  py-1 font-semibold text-sm transition
        ${currentView === 'products'
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-slate-700 hover:bg-slate-100'}`}
    >
      ТОВАРЫ
    </button>

  </div>
</nav>



      <div className="max-w-7xl mx-auto px-6 py-8 ">
        {/* Новый заказ */}
        {currentView === 'order' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Каталог товаров</h2>
                  <button
                    onClick={newOrder}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    + Новый покупатель
                  </button>
                </div>

                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder="Поиск товара..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-black px-4 py-3 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center mb-4 text-xs text-slate-500">
                  <span>Найдено: <strong className="text-slate-900">{filteredProducts.length}</strong></span>
                  {filteredProducts.length > itemsPerPage && (
                    <span>Страница {currentPage} из {totalPages}</span>
                  )}
                </div>

                <div className="space-y-2 max-h-[520px] overflow-y-auto">
                  {paginatedProducts.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-slate-500">ID: {product.id}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{product.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                        <span className="text-lg font-bold text-slate-900">${product.price}</span>
                        <button
                          onClick={() => addToCart(product)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg transition-colors"
                    >
                      Назад
                    </button>
                    <span className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg transition-colors"
                    >
                      Вперёд
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Корзина */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-24">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Корзина</h2>

                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="text-slate-500 text-sm">Корзина пуста</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6 max-h-[360px] overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-slate-900 flex-1 pr-2 line-clamp-2">
                              {item.name}
                            </p>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 bg-white border border-slate-300 hover:bg-slate-100 rounded flex items-center justify-center text-slate-700 font-semibold"
                              >
                                −
                              </button>
                              <span className="w-10 text-center font-semibold text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center font-semibold"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-bold text-slate-900">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <div className="bg-slate-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-slate-600">Итого:</span>
                          <span className="text-2xl font-bold text-slate-900">
                            ${calculateTotal()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Товаров: {cart.length}</p>
                      </div>
                      <button
                        onClick={completeOrder}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                      >
                        Оформить заказ
                      </button>
                    </div>
                  </>
                )}

                {orders.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">История заказов</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">{order.date}</span>
                            <span className="font-bold text-green-700">${order.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Управление товарами */}
        {currentView === 'products' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Редактирование товаров</h2>
              <button
                onClick={reloadFromFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                🔄 Обновить из файла
              </button>
            </div>

            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Поиск товара..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-black w-full px-4 py-3 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex justify-between items-center mb-4 text-xs text-slate-500">
              <span>Найдено: <strong className="text-slate-900">{filteredProducts.length}</strong></span>
              {filteredProducts.length > itemsPerPage && (
                <span>Страница {currentPage} из {totalPages}</span>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Название</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ед.</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Цена</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{product.id}</td>
                      <td className="px-4 py-3">
                        {editingProduct === product.id ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-slate-900">{product.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.unit}</td>
                      <td className="px-4 py-3">
                        {editingProduct === product.id ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                            className="w-24 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">${product.price}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingProduct === product.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => saveProduct(product.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-xs font-medium"
                            >
                              Сохранить
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1 bg-slate-500 hover:bg-slate-600 text-white rounded transition-colors text-xs font-medium"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(product)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-xs font-medium"
                          >
                            Изменить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg transition-colors"
                >
                  Назад
                </button>
                <span className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg transition-colors"
                >
                  Вперёд
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectroMaxApp;