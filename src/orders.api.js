import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const ordersRef = collection(db, "orders");

export const OrdersAPI = {
  subscribe(callback) {
    return onSnapshot(ordersRef, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // сортируем по createdAt/дате, новые сверху
      items.sort((a, b) => {
        const ta = a.createdAt || a.date || "";
        const tb = b.createdAt || b.date || "";
        return tb.localeCompare(ta);
      });
      callback(items);
    }, (err) => {
      console.error("OrdersAPI.subscribe error:", err);
      callback([]);
    });
  },

  async add(order) {
    const docRef = await addDoc(ordersRef, {
      ...order,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  },

  async update(id, fields) {
    const d = doc(db, "orders", id);
    await updateDoc(d, fields);
  },

  async remove(id) {
    const d = doc(db, "orders", id);
    await deleteDoc(d);
  },

  async getAll() {
    const snap = await getDocs(ordersRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};