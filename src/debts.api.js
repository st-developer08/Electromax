import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const debtsRef = collection(db, "debts");

export const DebtsAPI = {
  subscribe(callback) {
    return onSnapshot(debtsRef, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // можно сортировать по createdAt
      items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      callback(items);
    }, (err) => {
      console.error("DebtsAPI.subscribe error:", err);
      callback([]);
    });
  },

  async add(debt) {
    const docRef = await addDoc(debtsRef, {
      ...debt,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  },

  async update(id, fields) {
    const d = doc(db, "debts", id);
    await updateDoc(d, fields);
  },

  async remove(id) {
    const d = doc(db, "debts", id);
    await deleteDoc(d);
  },

  async getAll() {
    const snap = await getDocs(debtsRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};