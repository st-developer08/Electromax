const fs = require("fs-extra");

const db = fs.readJsonSync("db.json");
const sheet = db["Sheet1"];

const products = sheet
  .filter((row) => {
    // пропускаем пустые строки и строки без названия
    const name = row["__EMPTY"];
    const price = row["__EMPTY_2"];
    return typeof name === "string" && name.trim() !== "" && !isNaN(price);
  })
  .map((row, index) => ({
    id: Number(row["📞55 500 9 500"]) || index + 1,
    name: row["__EMPTY"] || "",
    unit: row["__EMPTY_1"] || "шт.",
    price: Number(row["__EMPTY_2"]) || 0,
  }));

fs.writeJsonSync("products.json", { products }, { spaces: 2 });
console.log(`✅ Готово! Найдено ${products.length} товаров`);
