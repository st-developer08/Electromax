// convert-xlsx-full.js
const XLSX = require('xlsx');
const fs = require('fs-extra');

// 📄 Укажи свой файл Excel:
const file = 'Elektromax Invest 16.11.2024.xlsx';

// 🧩 Читаем книгу Excel
const workbook = XLSX.readFile(file);

// 🔍 Возьмём все листы (если их несколько)
const result = {};

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  // Преобразуем в массив объектов (каждая строка — объект)
  const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  result[sheetName] = json;
});

// 💾 Сохраняем всё как JSON
fs.writeJsonSync('db.json', result, { spaces: 2 });

console.log(`✅ Готово! Все листы (${workbook.SheetNames.length}) сохранены в db.json`);
