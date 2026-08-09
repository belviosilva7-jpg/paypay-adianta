import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle2, Download, ShieldCheck, CreditCard, User, LayoutDashboard, Globe, HelpCircle, Eye, EyeOff, Info, Check, Trash2, Search, XCircle, AlertTriangle, Loader2, FileText, RotateCcw, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logoPaypay from "@/assets/logo-paypay.png";

export const Logo = ({ className, onClick }: { className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
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
