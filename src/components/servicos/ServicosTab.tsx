import { useState } from "react";
import { Wrench, MapPin, Star, Search, Plus } from "lucide-react";
import { PrestadorRegistrationForm } from "./PrestadorRegistrationForm";

export function ServicosTab() {
  const [activeView, setActiveView] = useState("list"); // 'list', 'detail', 'register'

  return (
    <>
      {activeView === "register" && <PrestadorRegistrationForm onBack={() => setActiveView("list")} />}
      {activeView === "list" && (
        <div className="p-4 bg-slate-50 min-h-screen">
          <header className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Serviços</h1>
            <button 
                onClick={() => setActiveView("register")}
                className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2"
            >
                <Plus size={18} /> Anunciar Serviço
            </button>
          </header>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar serviços..." 
                className="w-full pl-10 pr-4 py-3 rounded-2xl border-none shadow-sm"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
            {["Pedreiro", "Eletricista", "Encanador", "Diarista", "Mecânico"].map(cat => (
                <button key={cat} className="px-4 py-2 bg-white rounded-full text-sm font-medium shadow-sm whitespace-nowrap">
                    {cat}
                </button>
            ))}
          </div>

          {/* Services List */}
          <div className="grid gap-4">
            {/* Placeholder for list */}
            <div className="bg-white p-4 rounded-2xl shadow-sm">
                <h3 className="font-bold text-lg">Serviço de Exemplo</h3>
                <p className="text-slate-600">Descrição do serviço de exemplo.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
