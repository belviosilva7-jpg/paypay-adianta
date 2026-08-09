import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, FileText, Loader2, XCircle, AlertTriangle, Info, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { checkApplicationStatus } from "@/lib/admin.functions";

export const StatusCheckArea = ({ onBack, compact = false }: { onBack: () => void; compact?: boolean }) => {
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
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Consultar Agora
        </button>

        {checkResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-6 rounded-[24px] border text-left space-y-3",
              checkResult.color === 'red' || checkResult.status === "Reprovado" ? "bg-red-50 border-red-100" :
              "bg-blue-50 border-blue-100"
            )}
          >
            <div className={cn(
              "flex items-center gap-2",
              checkResult.color === 'red' || checkResult.status === "Reprovado" ? "text-red-600" :
              "text-blue-600"
            )}>
              {checkResult.status === "Reprovado" ? <XCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              <span className="font-black uppercase tracking-wider text-xs">Status: {checkResult.status}</span>
            </div>
            <p className={cn(
              "text-[13px] font-bold leading-relaxed",
              checkResult.color === 'red' || checkResult.status === "Reprovado" ? "text-red-700" :
              "text-blue-700"
            )}>
              “{checkResult.reason}”
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
