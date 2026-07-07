import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";

export function ParceiroRegistrationForm({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "",
    endereco: "",
    whatsapp: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "parceiros"), {
            ...formData,
            createdAt: new Date()
        });
        alert("Cadastro de parceiro enviado!");
        onBack();
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Erro ao enviar cadastro.");
    }
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <button onClick={onBack} className="mb-4 text-emerald-600 font-bold">&larr; Voltar</button>
      <h2 className="text-2xl font-bold mb-6">Cadastrar como Parceiro</h2>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <input className="w-full p-3 border rounded-xl" placeholder="Nome do Estabelecimento" onChange={e => setFormData({...formData, nome: e.target.value})} required />
        <select className="w-full p-3 border rounded-xl" onChange={e => setFormData({...formData, tipo: e.target.value})} required>
            <option value="">Tipo de Parceiro</option>
            <option value="Mercado">Mercado</option>
            <option value="Padaria">Padaria</option>
            <option value="Restaurante">Restaurante</option>
        </select>
        <input className="w-full p-3 border rounded-xl" placeholder="Endereço" onChange={e => setFormData({...formData, endereco: e.target.value})} />
        <input className="w-full p-3 border rounded-xl" placeholder="WhatsApp" onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
        <button type="submit" className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold">Enviar Cadastro</button>
      </form>
    </div>
  );
}
