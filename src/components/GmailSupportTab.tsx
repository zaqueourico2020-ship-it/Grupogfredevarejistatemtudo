import { useEffect, useState, useRef } from "react";
import { User } from "firebase/auth";
import {
  initAuth,
  googleSignIn,
  logoutGmail,
  setCachedToken,
} from "@/lib/gmail-auth";
import {
  listGmailMessages,
  sendGmailEmail,
  trashGmailMessage,
  modifyGmailMessageLabels,
  GmailMessage,
} from "@/lib/gmail-api";
import {
  Mail,
  Search,
  RefreshCw,
  Star,
  Trash2,
  Send,
  Check,
  X,
  LogOut,
  Inbox,
  SendHorizontal,
  FileText,
  AlertCircle,
  Clock,
  User as UserIcon,
  CornerUpLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

interface GmailSupportTabProps {
  onGoBack?: () => void;
}

export default function GmailSupportTab({ onGoBack }: GmailSupportTabProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Email state
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>("INBOX");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);

  // Compose State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isConfirmSendOpen, setIsConfirmSendOpen] = useState(false);

  // Reply State
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isConfirmReplyOpen, setIsConfirmReplyOpen] = useState(false);

  // General Action Confirmations
  const [confirmTrashId, setConfirmTrashId] = useState<string | null>(null);

  // Initialize auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch emails when label, search, or token changes
  useEffect(() => {
    if (token) {
      loadEmails();
    }
  }, [token, selectedLabel]);

  const loadEmails = async (queryOverride?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const q = queryOverride !== undefined ? queryOverride : searchQuery;
      const data = await listGmailMessages(token, {
        labelId: selectedLabel,
        query: q,
      });
      setMessages(data);
      if (data.length > 0 && !selectedMessage) {
        // Option to select first message by default on desktop, but keep it empty on mobile
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar e-mails: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        toast.success("Login com o Google realizado com sucesso!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro de autenticação: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGmail();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setMessages([]);
      setSelectedMessage(null);
      toast.info("Desconectado da conta Google.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao desconectar: " + err.message);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmails();
  };

  const toggleStar = async (msg: GmailMessage) => {
    if (!token) return;
    const isCurrentlyStarred = msg.isStarred;
    
    // Optimistic UI update
    setMessages(prev =>
      prev.map(m =>
        m.id === msg.id ? { ...m, isStarred: !isCurrentlyStarred } : m
      )
    );
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage(prev => prev ? { ...prev, isStarred: !isCurrentlyStarred } : null);
    }

    try {
      await modifyGmailMessageLabels(token, msg.id, {
        addLabelIds: isCurrentlyStarred ? [] : ["STARRED"],
        removeLabelIds: isCurrentlyStarred ? ["STARRED"] : [],
      });
      toast.success(isCurrentlyStarred ? "Estrela removida" : "Mensagem marcada com estrela");
    } catch (err: any) {
      console.error(err);
      // Revert optimistic update
      setMessages(prev =>
        prev.map(m =>
          m.id === msg.id ? { ...m, isStarred: isCurrentlyStarred } : m
        )
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage(prev => prev ? { ...prev, isStarred: isCurrentlyStarred } : null);
      }
      toast.error("Erro ao alterar estrela: " + err.message);
    }
  };

  const toggleReadStatus = async (msg: GmailMessage) => {
    if (!token) return;
    const isCurrentlyRead = msg.isRead;
    
    // Optimistic UI update
    setMessages(prev =>
      prev.map(m =>
        m.id === msg.id ? { ...m, isRead: !isCurrentlyRead } : m
      )
    );
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage(prev => prev ? { ...prev, isRead: !isCurrentlyRead } : null);
    }

    try {
      await modifyGmailMessageLabels(token, msg.id, {
        addLabelIds: isCurrentlyRead ? ["UNREAD"] : [],
        removeLabelIds: isCurrentlyRead ? [] : ["UNREAD"],
      });
    } catch (err: any) {
      console.error(err);
      // Revert optimistic update
      setMessages(prev =>
        prev.map(m =>
          m.id === msg.id ? { ...m, isRead: isCurrentlyRead } : m
        )
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage(prev => prev ? { ...prev, isRead: isCurrentlyRead } : null);
      }
    }
  };

  const handleOpenMessage = (msg: GmailMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      toggleReadStatus(msg);
    }
  };

  const handleTrashMessage = async (id: string) => {
    if (!token) return;
    try {
      await trashGmailMessage(token, id);
      toast.success("Mensagem movida para a Lixeira");
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      setConfirmTrashId(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao mover para a lixeira: " + err.message);
    }
  };

  const handleSendEmail = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await sendGmailEmail(token, {
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
      });
      toast.success("E-mail enviado com sucesso!");
      setIsComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setIsConfirmSendOpen(false);
      // reload emails if on Sent folder
      if (selectedLabel === "SENT") {
        loadEmails();
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao enviar e-mail: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!token || !selectedMessage) return;
    setLoading(true);
    try {
      const replySubject = selectedMessage.subject.startsWith("Re:")
        ? selectedMessage.subject
        : `Re: ${selectedMessage.subject}`;
        
      await sendGmailEmail(token, {
        to: selectedMessage.from,
        subject: replySubject,
        body: replyBody,
        threadId: selectedMessage.threadId,
      });
      toast.success("Resposta enviada com sucesso!");
      setIsReplying(false);
      setReplyBody("");
      setIsConfirmReplyOpen(false);
      loadEmails();
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao responder e-mail: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatEmailDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch {
      return dateStr;
    }
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center text-white bg-[#0A192F]">
        <div className="max-w-md w-full rounded-2xl bg-[#2968c8]/40 border border-cyan-500/20 p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/15 flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
            Central de E-mails Gmail
          </h2>
          <p className="text-sm text-slate-300 mb-8 leading-relaxed">
            Conecte sua conta do Google para visualizar e responder e-mails do suporte,
            centralizar mensagens de clientes e enviar comunicados diretamente do painel com toda a segurança.
          </p>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold px-6 py-3.5 rounded-xl shadow-lg hover:bg-slate-100 transition-transform active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{isLoggingIn ? "Conectando..." : "Entrar com o Google"}</span>
          </button>

          {onGoBack && (
            <button
              onClick={onGoBack}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:underline"
            >
              Voltar ao Início
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071324] text-slate-100 flex flex-col">
      {/* Top bar */}
      <div className="bg-[#0A192F] border-b border-cyan-500/10 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-left">
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">
              Gmail Suporte
            </h1>
            <p className="text-[10px] text-slate-400 leading-none">
              Grupo GF Rede Varejista
            </p>
          </div>
        </div>

        {/* User profile & controls */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">{user?.displayName}</span>
            <span className="text-[10px] text-slate-400 font-mono">{user?.email}</span>
          </div>
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName || "Admin"}`}
            alt="Foto"
            className="w-8 h-8 rounded-full border border-cyan-500/20"
          />
          <button
            onClick={handleLogout}
            title="Sair da conta Google"
            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Mailbox Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-h-[85vh]">
        {/* Left Sidebar (Labels & Navigation) */}
        <div className="w-full md:w-56 bg-[#0A192F]/60 border-b md:border-b-0 md:border-r border-cyan-500/10 p-3 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all mb-3 shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Escrever E-mail
          </button>

          <div className="flex md:flex-col gap-1 w-full">
            {[
              { id: "INBOX", label: "Caixa de Entrada", icon: Inbox },
              { id: "SENT", label: "Enviados", icon: SendHorizontal },
              { id: "STARRED", label: "Com Estrela", icon: Star },
              { id: "DRAFT", label: "Rascunhos", icon: FileText },
              { id: "TRASH", label: "Lixeira", icon: Trash2 },
            ].map((lbl) => {
              const active = selectedLabel === lbl.id;
              return (
                <button
                  key={lbl.id}
                  onClick={() => {
                    setSelectedLabel(lbl.id);
                    setSelectedMessage(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors w-full ${
                    active
                      ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/25"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <lbl.icon className={`w-4 h-4 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{lbl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Central area containing List and Detail */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages List Column */}
          <div className={`w-full md:w-80 border-r border-cyan-500/10 flex flex-col bg-[#071324] ${selectedMessage ? "hidden md:flex" : "flex"}`}>
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="p-3 border-b border-cyan-500/10 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Pesquisar e-mails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0A192F] border border-cyan-500/20 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-cyan-400 text-white placeholder-slate-400"
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </form>

            {/* Email list */}
            <div className="flex-1 overflow-y-auto divide-y divide-cyan-500/5">
              {loading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
                  Carregando mensagens...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center px-4">
                  <Mail className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">Nenhuma mensagem encontrada nesta pasta.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleOpenMessage(msg)}
                      className={`p-3 text-left cursor-pointer transition-colors relative flex flex-col gap-1 ${
                        isSelected
                          ? "bg-cyan-500/10 border-l-2 border-cyan-400"
                          : msg.isRead
                          ? "bg-transparent hover:bg-white/[0.01]"
                          : "bg-cyan-500/5 font-bold hover:bg-cyan-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs text-white font-medium truncate max-w-[150px]">
                          {msg.from.split("<")[0].trim() || msg.from}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                          {formatEmailDate(msg.date)}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 truncate leading-tight">
                        {msg.subject}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {msg.snippet}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(msg);
                          }}
                          className={`p-0.5 rounded hover:bg-slate-700/50 ${msg.isStarred ? "text-amber-400" : "text-slate-500"}`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmTrashId(msg.id);
                          }}
                          className="p-0.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Message Detail View */}
          <div className={`flex-1 flex flex-col bg-[#081528] ${selectedMessage ? "flex" : "hidden md:flex items-center justify-center text-slate-400"}`}>
            {selectedMessage ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Detail Header controls */}
                <div className="bg-[#0A192F]/40 border-b border-cyan-500/10 p-3 flex items-center justify-between gap-3 shrink-0">
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="md:hidden flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" /> Voltar
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => toggleStar(selectedMessage)}
                      className={`p-1.5 rounded-lg bg-[#2968c8]/30 border border-cyan-500/10 ${selectedMessage.isStarred ? "text-amber-400" : "text-slate-400"}`}
                      title={selectedMessage.isStarred ? "Remover Estrela" : "Adicionar Estrela"}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={() => setConfirmTrashId(selectedMessage.id)}
                      className="p-1.5 rounded-lg bg-[#2968c8]/30 border border-cyan-500/10 text-slate-400 hover:text-red-400"
                      title="Excluir Mensagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Email headers */}
                <div className="p-4 border-b border-cyan-500/10 bg-[#0A192F]/20 text-left">
                  <h2 className="text-base font-bold text-white mb-2 leading-snug">
                    {selectedMessage.subject}
                  </h2>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        De: <span className="text-white">{selectedMessage.from}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Para: {selectedMessage.to}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {new Date(selectedMessage.date).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-900/40">
                  {selectedMessage.isHtml ? (
                    <iframe
                      title="Email Content"
                      srcDoc={`
                        <html>
                          <head>
                            <style>
                              body {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                font-size: 14px;
                                line-height: 1.6;
                                color: #cbd5e1;
                                background-color: transparent;
                                margin: 0;
                                padding: 8px;
                              }
                              a { color: #22d3ee; text-decoration: underline; }
                              p { margin: 0 0 1em 0; }
                            </style>
                          </head>
                          <body>${selectedMessage.body}</body>
                        </html>
                      `}
                      className="w-full h-full min-h-[300px] border-none bg-transparent"
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                    />
                  ) : (
                    <div className="text-left text-xs whitespace-pre-wrap leading-relaxed text-slate-300 select-text">
                      {selectedMessage.body}
                    </div>
                  )}
                </div>

                {/* Quick reply footer */}
                <div className="border-t border-cyan-500/10 p-3 bg-[#0A192F]/30 shrink-0">
                  {!isReplying ? (
                    <button
                      onClick={() => setIsReplying(true)}
                      className="flex items-center gap-2 bg-[#2968c8]/40 border border-cyan-500/20 hover:border-cyan-400/40 text-cyan-300 font-semibold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
                    >
                      <CornerUpLeft className="w-4 h-4" /> Responder E-mail
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                          <CornerUpLeft className="w-3.5 h-3.5" /> Respondendo para {selectedMessage.from.split("<")[0]}
                        </span>
                        <button
                          onClick={() => setIsReplying(false)}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        placeholder="Escreva sua resposta..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        className="w-full bg-[#0A192F] border border-cyan-500/20 focus:border-cyan-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsReplying(false)}
                          className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            if (!replyBody.trim()) {
                              toast.error("Por favor, preencha o corpo da resposta.");
                              return;
                            }
                            setIsConfirmReplyOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" /> Enviar Resposta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
                <Mail className="w-12 h-12 text-cyan-500/20 mb-3 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-300">Nenhum e-mail selecionado</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Selecione um e-mail na lista lateral para ler o conteúdo completo, responder ou organizar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPOSE EMAIL DIALOG (MODAL) */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0A192F] border border-cyan-500/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3 bg-[#0A192F] border-b border-cyan-500/10 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400" /> Escrever Novo E-mail
              </h3>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Para (Destinatário):</label>
                <input
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="bg-[#071324] border border-cyan-500/20 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Assunto:</label>
                <input
                  type="text"
                  placeholder="Qual o assunto do e-mail?"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="bg-[#071324] border border-cyan-500/20 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Mensagem (Corpo):</label>
                <textarea
                  rows={8}
                  placeholder="Escreva sua mensagem aqui..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="bg-[#071324] border border-cyan-500/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-[#0A192F] border-t border-cyan-500/10 flex justify-end gap-2">
              <button
                onClick={() => setIsComposeOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
                    toast.error("Por favor, preencha todos os campos do e-mail.");
                    return;
                  }
                  setIsConfirmSendOpen(true);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Enviar Mensagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SEND MODAL (SAFETY MANDATE REQUIREMENT) */}
      {isConfirmSendOpen && (
        <div className="fixed inset-0 z-[1300] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0A192F] border border-cyan-500/30 rounded-2xl w-full max-w-sm p-5 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
              Confirmar Envio de E-mail
            </h4>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Você está prestes a enviar um e-mail para <span className="text-cyan-300 font-semibold">{composeTo}</span> em nome do Grupo GF. Deseja prosseguir com o envio?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setIsConfirmSendOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendEmail}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Sim, Enviar!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REPLY MODAL (SAFETY MANDATE REQUIREMENT) */}
      {isConfirmReplyOpen && (
        <div className="fixed inset-0 z-[1300] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0A192F] border border-cyan-500/30 rounded-2xl w-full max-w-sm p-5 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
              Confirmar Envio da Resposta
            </h4>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Deseja enviar esta resposta agora em nome da sua conta Gmail vinculada?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setIsConfirmReplyOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendReply}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Sim, Responder!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM TRASH MODAL (SAFETY MANDATE REQUIREMENT) */}
      {confirmTrashId !== null && (
        <div className="fixed inset-0 z-[1300] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0A192F] border border-red-500/20 rounded-2xl w-full max-w-sm p-5 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
              Mover para Lixeira?
            </h4>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Tem certeza que deseja mover este e-mail para a lixeira? Você poderá recuperá-lo na pasta Lixeira se necessário.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmTrashId(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleTrashMessage(confirmTrashId)}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Mover para Lixeira
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
