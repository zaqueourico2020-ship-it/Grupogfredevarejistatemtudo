import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Store, User as UserIcon, Mail, Phone, Lock, IdCard, ArrowLeft, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/gf-shield-logo.png";
import { useNavigate, Link } from "react-router-dom";

type Audience = "lojista" | "pessoa_fisica";
type Mode = "signin" | "signup" | "forgot";

export default function AuthPage() {
  const navigate = useNavigate();
  // ... (rest of the component)
  const initialAudience: Audience =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tipo") === "lojista"
      ? "lojista"
      : "pessoa_fisica";
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const initialRef =
    typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("ref") || "").toUpperCase() : "";
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    cnpj: "",
    password: "",
    referralCode: initialRef,
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: any) => {
      if (data.user) {
        const dest = await resolvePostLoginDestination(data.user.id);
        navigate({ to: dest as any, replace: true });
      }
    });
  }, [navigate]);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setForm({ fullName: "", email: "", phone: "", cnpj: "", password: "", referralCode: "" });
    setMsg(null);
    setAcceptedTerms(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMsg({ kind: "ok", text: "Enviamos um link para redefinir sua senha. Confira sua caixa de entrada." });
      } else if (mode === "signup") {
        if (!acceptedTerms) {
          throw new Error("Você precisa aceitar os Termos e Condições para prosseguir.");
        }
        const email = form.email.trim().toLowerCase();
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const phone = form.phone.trim();
        
        if (firstName.trim().length === 0 || lastName.trim().length === 0) {
          throw new Error("Informe seu nome e sobrenome.");
        }
        if (phone.replace(/\D/g, "").length < 10) {
          throw new Error("Informe um telefone válido com DDD.");
        }
        if (audience === "lojista" && form.cnpj.replace(/\D/g, "").length < 11) {
          throw new Error("Informe um CNPJ válido.");
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              user_type: audience,
              full_name: fullName,
              phone,
              cnpj: audience === "lojista" ? form.cnpj.trim() : null,
              referral_code: form.referralCode?.trim() || null,
            },
          },
        });

        if (signUpError) {
          if (/already|registered|exists/i.test(signUpError.message || "")) {
            throw new Error("Este email já tem conta. Faça login ou use 'Esqueci minha senha'.");
          }
          throw signUpError;
        }

        // Try to automatically sign in (will work if auto-confirm is enabled, or if they confirmed immediately).
        // If it fails with verification required, we'll inform them.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });

        if (signInError) {
          setMsg({ 
            kind: "ok", 
            text: "Conta criada com sucesso! Um e-mail de confirmação foi enviado pelo Grupo GF. Clique no link do e-mail para confirmar seu cadastro e voltar para o aplicativo." 
          });
          setMode("signin");
          setLoading(false);
          return;
        }

        {
          const { data: u } = await supabase.auth.getUser();
          const dest = await resolvePostLoginDestination(u.user?.id);
          navigate({ to: dest as any, replace: true });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        if (error) {
          if (/confirm/i.test(error.message || "")) {
            throw new Error("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada para o link de ativação enviado pelo Grupo GF.");
          }
          throw error;
        }
        {
          const { data: u } = await supabase.auth.getUser();
          const dest = await resolvePostLoginDestination(u.user?.id);
          navigate({ to: dest as any, replace: true });
        }
      }
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.message ?? "Erro inesperado." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#F4F4F6]">
      <div className="w-full max-w-[420px]">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0A192F] font-bold mb-6 transition-colors">
          <ArrowLeft size={14} /> Voltar para a loja
        </Link>

        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Grupo GF" className="h-14 w-14 object-contain mb-2" />
          <p className="text-[14px] font-black tracking-[0.14em] uppercase text-[#0A192F]">
            Grupo GF Varejista
          </p>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Marketplace Oficial</span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg p-8 sm:p-10 shadow-sm border border-slate-100">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-[#111111] leading-tight">
                {mode === "forgot"
                  ? "Recuperar senha"
                  : mode === "signup"
                  ? "Crie a sua conta"
                  : "Digite seus dados para entrar"}
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {mode === "forgot"
                  ? "Enviaremos as instruções de recuperação para o seu e-mail."
                  : mode === "signup"
                  ? "Preencha os campos abaixo de forma simples e rápida."
                  : "Insira seu e-mail e senha cadastrados para acessar."}
              </p>
            </div>

            {msg && (
              <div className={`p-3.5 rounded-lg text-xs font-semibold ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                {msg.text}
              </div>
            )}

            {mode === "signup" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Nome</label>
                    <input
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ex: João"
                      className="w-full bg-white border border-slate-300 rounded-md px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Sobrenome</label>
                    <input
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ex: Silva"
                      className="w-full bg-white border border-slate-300 rounded-md px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">E-mail</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Ex: joao@email.com"
                    className="w-full bg-white border border-slate-300 rounded-md px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Telefone com DDD</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full bg-white border border-slate-300 rounded-md px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Criar Senha</label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Mínimo de 6 caracteres"
                      className="w-full bg-white border border-slate-300 rounded-md pl-3.5 pr-10 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Código de indicação (opcional)</label>
                  <input
                    type="text"
                    value={form.referralCode}
                    onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
                    placeholder="Digite se tiver um código"
                    maxLength={20}
                    className="w-full bg-white border border-slate-300 rounded-md px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all uppercase"
                  />
                </div>

                {/* Terms and conditions */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="terms"
                    required
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-[#0A192F] focus:ring-[#0A192F]"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-600 select-none leading-relaxed">
                    Aceito os <a href="/termos" target="_blank" className="font-bold text-[#0A192F] hover:underline">Termos e Condições</a> e a <a href="/privacidade" target="_blank" className="font-bold text-[#0A192F] hover:underline">Política de Privacidade</a> do Grupo GF.
                  </label>
                </div>
              </div>
            ) : mode === "forgot" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">E-mail</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Ex: joao@email.com"
                    className="w-full bg-white border border-slate-300 rounded-md px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">E-mail ou usuário</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Ex: joao@email.com"
                    className="w-full bg-white border border-slate-300 rounded-md px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Senha</label>
                    <button type="button" onClick={() => { setMode("forgot"); setMsg(null); }} className="text-xs font-bold text-[#1E3A8A] hover:underline cursor-pointer">
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Digite sua senha"
                      className="w-full bg-white border border-slate-300 rounded-md pl-3.5 pr-10 py-2.5 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              disabled={loading}
              type="submit"
              className="w-full py-3 rounded-md font-bold text-white bg-[#0A192F] hover:bg-[#1E3A8A] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 cursor-pointer shadow-md text-sm uppercase tracking-wider"
            >
              {loading
                ? "Aguarde..."
                : mode === "forgot"
                ? "Enviar link de redefinição"
                : mode === "signup"
                ? "Criar conta"
                : "Entrar"}
            </button>

            {mode !== "forgot" && (
              <>
                {/* Dividers */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-[1px] flex-1 bg-slate-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ou</span>
                  <div className="h-[1px] flex-1 bg-slate-200" />
                </div>

                {/* Google OAuth Login */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setMsg(null);
                    setLoading(true);
                    const result = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (result.error) {
                      setMsg({ kind: "err", text: result.error.message ?? "Erro no login com Google." });
                      setLoading(false);
                      return;
                    }
                    if (result.redirected) return;
                    navigate({ to: "/", replace: true });
                  }}
                  className="w-full py-3 rounded-md font-bold text-[#111111] bg-white border border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-sm text-sm cursor-pointer"
                >
                  <GoogleIcon />
                  Entrar com o Google
                </button>
              </>
            )}

            {/* Alternation */}
            <div className="pt-2 border-t border-slate-100 text-center text-sm">
              {mode !== "signup" ? (
                <p className="text-slate-600">
                  Não tem conta?{" "}
                  <button type="button" onClick={() => { setMode("signup"); setMsg(null); }} className="font-bold text-[#1E3A8A] hover:underline cursor-pointer">
                    Criar conta
                  </button>
                </p>
              ) : (
                <p className="text-slate-600">
                  Já tem uma conta?{" "}
                  <button type="button" onClick={() => { setMode("signin"); setMsg(null); }} className="font-bold text-[#1E3A8A] hover:underline cursor-pointer">
                    Entrar
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <button type="button" onClick={() => { setMode("signin"); setMsg(null); }} className="mt-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer">
                  Voltar para o Login
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c3 0 5.7 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.3-7.8 19.3-19.5 0-1.2-.1-2.3-.3-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c3 0 5.7 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.8-2 13.3-5.2l-6.2-5.2C29.2 34.5 26.7 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.4 4.2-4.4 5.6l6.2 5.2C40.9 36 43.5 30.5 43.5 24c0-1.2-.1-2.3-.3-3.5z"/>
    </svg>
  );
}

async function resolvePostLoginDestination(userId?: string | null): Promise<string> {
  if (!userId) return "/";
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    const email = currentUser.user?.email?.toLowerCase().trim();
    if (email === "grupogfredevarejistaoficial@gmail.com") {
      try { await (supabase as any).rpc("ensure_designated_owner_role"); } catch {}
      return "/admin";
    }

    const { data: roles } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const set = new Set<string>((roles || []).map((r: any) => r.role));
    if (set.has("admin") || set.has("owner")) return "/admin";
    if (set.has("partner")) return "/parceiro/produtos";

    const { data: partner } = await (supabase as any)
      .from("partners")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    if (partner) return "/parceiro/aguardando";
  } catch {
    // fall through
  }
  return "/";
}
