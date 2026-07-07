import { useState } from "react";

export function PrestadorRegistrationForm({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    experiencia: "",
    localizacao: "",
    whatsapp: "",
    email: "",
    categoria: "",
    preco: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data:", formData);
    // Add logic to save to Firestore here later
    alert("Cadastro enviado com sucesso!");
    onBack();
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <button onClick={onBack} className="mb-4 text-blue-600 font-bold">&larr; Voltar</button>
      <h2 className="text-2xl font-bold mb-6">Cadastro de Prestador</h2>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <input className="w-full p-3 border rounded-xl" placeholder="Nome Completo" onChange={e => setFormData({...formData, nome: e.target.value})} required />
        <textarea className="w-full p-3 border rounded-xl" placeholder="Descrição/Bio" onChange={e => setFormData({...formData, descricao: e.target.value})} required />
        <input className="w-full p-3 border rounded-xl" placeholder="Experiência (anos)" onChange={e => setFormData({...formData, experiencia: e.target.value})} />
        <input className="w-full p-3 border rounded-xl" placeholder="Localização (Cidade, Estado)" onChange={e => setFormData({...formData, localizacao: e.target.value})} />
        <input className="w-full p-3 border rounded-xl" placeholder="WhatsApp" onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
        <input className="w-full p-3 border rounded-xl" placeholder="E-mail" onChange={e => setFormData({...formData, email: e.target.value})} />
        <select className="w-full p-3 border rounded-xl" onChange={e => setFormData({...formData, categoria: e.target.value})} required>
            <option value="">Selecione uma Categoria</option>
            <option value="Pedreiro">Pedreiro</option>
            <option value="Eletricista">Eletricista</option>
            <option value="Encanador">Encanador</option>
        </select>
        <input className="w-full p-3 border rounded-xl" placeholder="Preço (ex: R$ 50/hora)" onChange={e => setFormData({...formData, preco: e.target.value})} />
        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">Concluir Cadastro</button>
      </form>
    </div>
  );
}
