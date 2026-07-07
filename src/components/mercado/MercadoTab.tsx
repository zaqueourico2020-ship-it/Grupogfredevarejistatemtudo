import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ParceiroRegistrationForm } from "./ParceiroRegistrationForm";

export function MercadoTab() {
  const [activeView, setActiveView] = useState("list"); // 'list', 'register'
  const [parceiros, setParceiros] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "parceiros"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setParceiros(data);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      {activeView === "register" && <ParceiroRegistrationForm onBack={() => setActiveView("list")} />}
      {activeView === "list" && (
        <div className="p-4 bg-slate-50 min-h-screen">
          <header className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Supermercados</h1>
            <button 
                onClick={() => setActiveView("register")}
                className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2"
            >
                <Plus size={18} /> Cadastrar Mercado/Parceiro
            </button>
          </header>

          <div className="grid gap-4">
            {parceiros.map((parceiro) => (
                <div key={parceiro.id} className="bg-white p-4 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-lg">{parceiro.nome}</h3>
                    <p className="text-slate-600">{parceiro.tipo} - {parceiro.endereco}</p>
                </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
