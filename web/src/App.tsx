/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  MinusCircle, 
  LayoutGrid,
  Filter,
  AlertCircle,
  Package, 
  Package2,
  User, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  Upload, 
  RefreshCw,
  Search,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  Moon,
  Sun,
  CheckCircle,
  Check,
  X,
  Settings2,
  BarChart3,
  Barcode,
  Camera,
  Wallet,
  Undo2,
  RotateCcw,
  MoreVertical,
  ShieldCheck,
  Building2,
  Building,
  Zap,
  Github,
  Mail,
  Send,
  Facebook,
  ShoppingCart,
  ArrowRightLeft,
  Phone,
  MessageCircle,
  FolderOpen
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  getDocs,
  limit,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cn } from './lib/utils';
import { format, startOfDay, isSameDay, subDays, formatDistanceToNow } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

import { Toaster, toast } from 'sonner';
import BarcodeScanner from './components/BarcodeScanner';

// --- Types ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  toast.error(`Firestore Error: ${message}`);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

interface Product {
  id: string;
  name: string;
  category: string;
  barcode?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  lowStockThreshold: number;
  updatedAt: string;
  createdAt?: string;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'sale' | 'refund';
  productId: string;
  productName: string;
  barcode?: string;
  quantity: number;
  price: number;
  total: number;
  profit?: number;
  timestamp: string;
  paidAmount?: number;
  dueAmount?: number;
  customerName?: string;
  customerPhone?: string;
  refundQuantity?: number;
  refundReason?: string;
}

interface UserProfile {
  uid: string;
  email: string;
  lastActiveBusinessId?: string;
}

interface Business {
  id: string;
  name: string;
  createdAt: string;
  categories?: string[];
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  onClick,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) => {
  const [isClicking, setIsClicking] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 500);
    if (onClick) {
      onClick(e);
    }
  };

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white hover:opacity-95 active:scale-95 shadow-lg shadow-emerald-500/20 transition-all font-bold border-2 border-emerald-500/10',
    brand: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95 font-bold border-2 border-blue-500/10',
    secondary: 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 active:scale-95 transition-all font-bold border-2 border-zinc-200 dark:border-zinc-700',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 active:scale-95 font-bold border-2 border-rose-500/10',
    ghost: 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95 transition-all font-bold',
    outline: 'bg-transparent border-2 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 transition-all active:scale-95 font-bold'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-5 py-3 rounded-2xl text-sm',
    lg: 'px-8 py-4 rounded-3xl text-base font-black tracking-tight'
  };

  const isLoading = loading || isClicking;

  return (
    <motion.button 
      whileHover={{ y: -3, scale: 1.03, boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -6px rgba(0, 0, 0, 0.1)" }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all disabled:opacity-80 select-none relative overflow-hidden',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center w-full"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

const Card = ({ children, className, title, subtitle, ...props }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <motion.div 
    whileHover={{ y: -4, shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
    className={cn('bg-white dark:bg-slate-900/80 border-2 border-zinc-200/60 dark:border-zinc-800/80 rounded-[2.5rem] p-6 shadow-sm dark:shadow-none backdrop-blur-md transition-shadow cursor-default', className)} 
    {...props}
  >
    {(title || subtitle) && (
      <div className="flex flex-col gap-1 mb-6">
        {title && <h3 className="text-zinc-900 dark:text-zinc-100 text-lg font-black tracking-tight">{title}</h3>}
        {subtitle && <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{subtitle}</p>}
      </div>
    )}
    {children}
  </motion.div>
);

const SummaryCard = ({ label, value, trend, icon: Icon, colorClass = "emerald" }: { label: string; value: string; trend?: string; icon?: any; colorClass?: string }) => {
  const colorMap = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    red: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    zinc: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  }[colorClass] || "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";

  return (
    <Card className={cn(
      "relative overflow-hidden group border-2",
      `bg-white dark:bg-slate-900/90 border-zinc-200 dark:border-zinc-800 hover:border-${colorClass === 'emerald' ? 'emerald' : colorClass === 'red' ? 'rose' : colorClass}-500 transition-all`
    )}>
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110",
        `bg-${colorClass === 'emerald' ? 'emerald' : colorClass === 'red' ? 'rose' : colorClass}-500/5`
      )} />
      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            `text-${colorClass === 'emerald' ? 'emerald' : colorClass === 'red' ? 'rose' : colorClass}-600 dark:text-${colorClass === 'emerald' ? 'emerald' : colorClass === 'red' ? 'rose' : colorClass}-400`
          )}>{label}</p>
          {Icon && <Icon className={cn("w-4 h-4 opacity-50", `text-${colorClass === 'emerald' ? 'emerald' : colorClass === 'red' ? 'rose' : colorClass}-500`)} />}
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-3xl font-black tracking-tighter",
            colorClass === 'black' ? "text-white dark:text-black" : "text-zinc-900 dark:text-white"
          )}>{value}</p>
          {trend && (
            <p className={cn(
              "flex items-center gap-1 text-[10px] font-black tracking-tight",
              colorClass === 'emerald' ? "text-emerald-500" : "text-blue-500"
            )}>
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

const Input = ({ label, icon: Icon, status, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: any; status?: 'success' | 'error' | 'neutral' }) => (
  <div className="space-y-2">
    {label && <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">{label}</label>}
    <motion.div 
      whileHover={{ y: -1 }}
      className="relative group"
    >
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />}
      <input 
        autoComplete="off"
        className={cn(
          "w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium hover:shadow-md",
          status === 'success' && "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/10",
          status === 'error' && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10",
          Icon && "pl-11"
        )}
        {...props}
      />
    </motion.div>
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }) => (
  <div className="space-y-2">
    {label && <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">{label}</label>}
    <motion.div 
      whileHover={{ y: -1 }}
      className="relative group"
    >
      <select 
        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none font-medium cursor-pointer hover:shadow-md"
        {...props}
      >
        {options.map(opt => <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900">{opt.label}</option>)}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-emerald-500 transition-all">
        <Plus className="w-4 h-4 rotate-45" />
      </div>
    </motion.div>
  </div>
);

const MathDeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Delete Forever",
  loading = false
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void | Promise<void>; 
  title: string; 
  message: React.ReactNode; 
  confirmText?: string;
  loading?: boolean;
}) => {
  const [mathQuestion, setMathQuestion] = useState({ text: '', answer: 0 });
  const [userMathAnswer, setUserMathAnswer] = useState('');
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [shake, setShake] = useState(false);

  const generateMathQuestion = () => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, ans;
    
    if (op === '+') {
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      ans = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 30) + 10;
      b = Math.floor(Math.random() * 10) + 1;
      ans = a - b;
    } else {
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      ans = a * b;
    }
    
    return { text: `${a} ${op === '*' ? '×' : op} ${b} = ?`, answer: ans };
  };

  useEffect(() => {
    if (isOpen) {
      setMathQuestion(generateMathQuestion());
      setUserMathAnswer('');
      setIsCooldown(false);
      setCooldownTime(0);
    } else {
      setIsCooldown(false);
      setCooldownTime(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (isOpen && isCooldown && cooldownTime > 0) {
      timer = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            setIsCooldown(false);
            setMathQuestion(generateMathQuestion());
            setUserMathAnswer('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, isCooldown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserMathAnswer(val);
    
    if (val && parseInt(val) !== mathQuestion.answer && val.length >= String(mathQuestion.answer).length) {
      if (parseInt(val) !== mathQuestion.answer) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setIsCooldown(true);
        setCooldownTime(10);
      }
    }
  };

  const handleClose = () => {
    setIsCooldown(false);
    setCooldownTime(0);
    setUserMathAnswer('');
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          key="math-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <motion.div 
            key="math-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            key="math-modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              x: shake ? [0, -10, 10, -10, 10, 0] : 0
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300,
              x: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
            }}
            className="relative w-full max-w-sm overflow-hidden rounded-[3rem] bg-white dark:bg-zinc-950 shadow-2xl border border-rose-100 dark:border-rose-900/20"
          >
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-10 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent opacity-50" />
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-xl shadow-inner relative z-10">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <h3 className="text-3xl font-black tracking-tighter relative z-10">{title}</h3>
              <div className="mt-3 text-sm font-bold text-rose-100/80 relative z-10 leading-relaxed">
                {message}
              </div>
            </div>

            <div className="p-10">
              <div className="mb-8 space-y-6">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">Security Verification</p>
                  <p className="text-4xl font-black text-zinc-900 dark:text-white font-mono tracking-tighter bg-zinc-100 dark:bg-zinc-900 py-4 rounded-3xl border-2 border-zinc-50 dark:border-zinc-800">
                    {mathQuestion.text}
                  </p>
                </div>

                <div className="relative group">
                  <input 
                    autoFocus
                    type="number"
                    value={userMathAnswer}
                    onChange={handleInputChange}
                    disabled={isCooldown}
                    placeholder="Result"
                    className={cn(
                      "w-full rounded-3xl border-4 bg-zinc-50 dark:bg-zinc-900 px-6 py-5 text-center text-3xl font-black transition-all focus:outline-none",
                      isCooldown 
                        ? "border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed" 
                        : "border-zinc-100 dark:border-zinc-800 focus:border-rose-500 focus:ring-[12px] focus:ring-rose-500/10"
                    )}
                  />
                  {isCooldown && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 rounded-3xl backdrop-blur-md">
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-lg font-black text-rose-600">Locked</p>
                        <p className="text-xs font-bold text-rose-500/60 uppercase tracking-widest">{cooldownTime}s remaining</p>
                      </div>
                    </div>
                  )}
                </div>

                {shake && !isCooldown && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-[10px] font-black uppercase tracking-widest text-rose-500"
                  >
                    Incorrect answer. Try again.
                  </motion.p>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <Button 
                  variant="danger" 
                  size="lg"
                  className="w-full shadow-2xl shadow-rose-500/40"
                  disabled={parseInt(userMathAnswer) !== mathQuestion.answer || isCooldown}
                  onClick={onConfirm}
                  loading={loading}
                >
                  {confirmText}
                </Button>
                <Button 
                  variant="ghost" 
                  size="lg"
                  onClick={handleClose}
                  className="w-full py-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer opacity-70 hover:opacity-100"
                >
                  Cancel Action
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PermissionDialog: React.FC<{ 
  icon: any; 
  title: string; 
  description: string; 
  onAllow: () => void | Promise<void>; 
  onDeny: () => void;
}> = ({ 
  icon: Icon, 
  title, 
  description, 
  onAllow, 
  onDeny 
}) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm pointer-events-auto"
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-lg shadow-xl w-full max-w-[320px] overflow-hidden"
    >
      <div className="p-6 flex gap-4">
        <div className="text-[#107c51] shrink-0 pt-1">
          <Icon className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <p className="text-[#202124] text-[15px] leading-snug">
            Allow <span className="font-bold">Milon One</span> {title}
          </p>
          <p className="text-[#5f6368] text-[13px] leading-normal pt-1">
            {description}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 p-3 pt-0">
        <button 
          onClick={onDeny}
          className="px-4 py-2 text-[#107c51] text-sm font-bold uppercase tracking-wider hover:bg-[#107c51]/5 rounded transition-colors"
        >
          Deny
        </button>
        <button 
          onClick={onAllow}
          className="px-4 py-2 text-[#107c51] text-sm font-bold uppercase tracking-wider hover:bg-[#107c51]/5 rounded transition-colors"
        >
          Allow
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// --- Helpers ---

const safeFormatDate = (date: any, formatStr: string) => {
  if (!date) return 'N/A';
  let d: Date;
  try {
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else if (date && typeof date.toDate === 'function') {
      d = date.toDate();
    } else if (typeof date === 'number') {
      d = new Date(date);
    } else if (date && typeof date.seconds === 'number') {
      d = new Date(date.seconds * 1000);
    } else {
      return 'Invalid Date';
    }
    
    if (isNaN(d.getTime())) return 'Invalid Date';
    return format(d, formatStr);
  } catch (e) {
    return 'Invalid Date';
  }
};

const isValidDate = (date: any) => {
  if (!date) return false;
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else if (date && typeof date.toDate === 'function') {
    d = date.toDate();
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else if (date && typeof date.seconds === 'number') {
    d = new Date(date.seconds * 1000);
  } else {
    return false;
  }
  return !isNaN(d.getTime());
};

// --- Main App ---

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchase' | 'sales' | 'inventory' | 'profile' | 'transactions' | 'due'>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    }
    return 'dark';
  });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedSaleProductId, setSelectedSaleProductId] = useState('');
  const [selectedSaleCategory, setSelectedSaleCategory] = useState('all');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [salePaidAmount, setSalePaidAmount] = useState<number>(0);
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerPhone, setSaleCustomerPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const deferredTransactionSearchTerm = useDeferredValue(transactionSearchTerm);
  const [searchCategory, setSearchCategory] = useState('all');
  const [searchStockStatus, setSearchStockStatus] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [redirectingTo, setRedirectingTo] = useState<string | null>(null);
  const [newTransactionBarcode, setNewTransactionBarcode] = useState('');
  const [payingDueId, setPayingDueId] = useState<string | null>(null);
  const [duePaymentAmount, setDuePaymentAmount] = useState<number>(0);
  const [transactionFilter, setTransactionFilter] = useState<'purchase' | 'sale' | 'refund'>('sale');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToRefund, setTransactionToRefund] = useState<Transaction | null>(null);
  const [refundQuantity, setRefundQuantity] = useState<number>(1);
  const [refundReason, setRefundReason] = useState<string>('');
  const [isRecordingPurchase, setIsRecordingPurchase] = useState(false);
  const [isRecordingSale, setIsRecordingSale] = useState(false);
  const [isRenamingBusiness, setIsRenamingBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');

  const handleRenameBusiness = async () => {
    if (!user || !activeBusinessId || !newBusinessName.trim()) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId), {
        name: newBusinessName.trim()
      });
      setIsRenamingBusiness(false);
      setNewBusinessName('');
      toast.success('Business renamed successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/businesses/${activeBusinessId}`);
    }
  };
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<string | null>(null);
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showScanner, setShowScanner] = useState<'purchase' | 'sale' | 'transactions' | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedPurchaseCategory, setSelectedPurchaseCategory] = useState('');
  const [selectedEditCategory, setSelectedEditCategory] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [renamedCategoryName, setRenamedCategoryName] = useState('');
  const [showBusinessReport, setShowBusinessReport] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [permissionStep, setPermissionStep] = useState<'storage' | 'camera' | 'complete'>(() => {
    if (typeof window !== 'undefined') {
      const requested = localStorage.getItem('permissionsRequested');
      return requested === 'true' ? 'complete' : 'storage';
    }
    return 'complete';
  });

  // Re-check permissions on mount to skip if already granted
  useEffect(() => {
    if (user && (permissionStep === 'storage' || permissionStep === 'camera')) {
      const checkActualPermissions = async () => {
        try {
          // Check storage persistence status
          if (navigator.storage && navigator.storage.persisted) {
            const isPersisted = await navigator.storage.persisted();
            if (isPersisted && permissionStep === 'storage') {
              setPermissionStep('camera');
              return;
            }
          }
          
          // Check camera status via Permissions API if supported
          if (navigator.permissions && (navigator.permissions as any).query) {
            try {
              const camStatus = await navigator.permissions.query({ name: 'camera' as any });
              if (camStatus.state === 'granted' && permissionStep === 'camera') {
                setPermissionStep('complete');
                localStorage.setItem('permissionsRequested', 'true');
              }
            } catch (e) {
              // Safari/older browsers might not support camera name in query
            }
          }
        } catch (err) {
          console.warn("Permission auto-check failed:", err);
        }
      };
      checkActualPermissions();
    }
  }, [user, permissionStep]);

  const handleAllowPermission = async () => {
    if (window.navigator?.vibrate) window.navigator.vibrate(30);
    
    try {
      if (permissionStep === 'storage') {
        let persisted = false;
        if (navigator.storage && navigator.storage.persist) {
          persisted = await navigator.storage.persist();
        }
        
        if (persisted) {
          toast.success("Storage persistence enabled.");
        }
        setPermissionStep('camera');
      } else if (permissionStep === 'camera') {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("NOT_SUPPORTED");
          }

          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          
          // Success! Access granted.
          stream.getTracks().forEach(track => track.stop());
          
          localStorage.setItem('permissionsRequested', 'true');
          setPermissionStep('complete');
          toast.success("Camera access confirmed!");
        } catch (err: any) {
          const e = err || {};
          if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            toast.error("Camera denied. Please enable it in browser settings.");
            // We still move to complete so user can use the rest of the app
            setPermissionStep('complete');
            localStorage.setItem('permissionsRequested', 'true');
          } else if (e.message === "NOT_SUPPORTED") {
            toast.error("Your device does not support camera access.");
            setPermissionStep('complete');
            localStorage.setItem('permissionsRequested', 'true');
          } else {
            // Likely no camera found
            console.warn("Camera check failed:", e);
            setPermissionStep('complete');
            localStorage.setItem('permissionsRequested', 'true');
          }
        }
      }
    } catch (globalErr) {
      console.error("Critical permission handler error:", globalErr);
      setPermissionStep('complete');
      localStorage.setItem('permissionsRequested', 'true');
    }
  };

  const [isBusinessSettingsOpen, setIsBusinessSettingsOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [hasInitialBusinessLoaded, setHasInitialBusinessLoaded] = useState(false);

  // Auth Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    // Global Unhandled Rejection Listener
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Rejection:', event.reason);
    };
    window.addEventListener('unhandledrejection', handleRejection);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleRejection);
      unsubscribe();
    };
  }, []);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close action menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenu(null);
    if (activeActionMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeActionMenu]);
  
  // Data Listeners
  useEffect(() => {
    if (!user) {
      setBusinesses([]);
      setActiveBusinessId(null);
      return;
    }

    const businessesPath = `users/${user.uid}/businesses`;
    const businessesUnsub = onSnapshot(collection(db, 'users', user.uid, 'businesses'), (snapshot) => {
      const bizList = snapshot.docs.map(doc => {
        const data = doc.data() as Business;
        return { 
          id: doc.id, 
          ...data, 
          categories: data.categories || [] 
        };
      });
      setBusinesses(bizList);
      if (!isDataLoaded) setIsDataLoaded(true);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, businessesPath);
      setLoading(false);
    });

    const profilePath = `users/${user.uid}`;
    const profileUnsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const p = snapshot.data() as UserProfile;
        setProfile(p);
        if (p.lastActiveBusinessId && !hasInitialBusinessLoaded) {
          setActiveBusinessId(p.lastActiveBusinessId);
          setHasInitialBusinessLoaded(true);
        }
      } else {
        const newProfile: UserProfile = { uid: user.uid, email: user.email || '' };
        setDoc(doc(db, 'users', user.uid), newProfile)
          .then(() => setProfile(newProfile))
          .catch(error => handleFirestoreError(error, OperationType.WRITE, profilePath));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, profilePath));

    return () => {
      businessesUnsub();
      profileUnsub();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !activeBusinessId) {
      setProducts([]);
      setTransactions([]);
      return;
    }

    const productsPath = `users/${user.uid}/businesses/${activeBusinessId}/products`;
    const productsUnsub = onSnapshot(collection(db, 'users', user.uid, 'businesses', activeBusinessId, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, productsPath);
    });

    const transactionsPath = `users/${user.uid}/businesses/${activeBusinessId}/transactions`;
    const transactionsUnsub = onSnapshot(
      query(collection(db, 'users', user.uid, 'businesses', activeBusinessId, 'transactions'), orderBy('timestamp', 'desc'), limit(300)), 
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, transactionsPath);
      }
    );

    return () => {
      productsUnsub();
      transactionsUnsub();
    };
  }, [user, activeBusinessId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== transactionFilter) return false;
      const search = deferredTransactionSearchTerm.toLowerCase().trim();
      if (!search) return true;
      
      const productName = (t.productName || '').toLowerCase();
      const barcode = String(t.barcode || '').toLowerCase();
      const customerName = (t.customerName || '').toLowerCase();
      
      return productName.includes(search) || 
             barcode.includes(search) || 
             customerName.includes(search);
    });
  }, [transactions, transactionFilter, transactionSearchTerm]);

  const businessReportData = useMemo(() => {
    if (!activeBusinessId || !showBusinessReport) return null;

    // 1. Sales Overview (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'MMM dd');
    }).reverse();

    const salesTrend = last7Days.map(dateStr => {
      const dayTotal = transactions
        .filter(t => t.type === 'sale' && isValidDate(t.timestamp) && safeFormatDate(t.timestamp, 'MMM dd') === dateStr)
        .reduce((sum, t) => sum + t.total, 0);
      return { name: dateStr, sales: dayTotal };
    });

    // 2. Product Wise Sales
    const productSalesMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'sale').forEach(t => {
      productSalesMap[t.productName] = (productSalesMap[t.productName] || 0) + t.quantity;
    });
    const productSales = Object.entries(productSalesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 3. Profit Chart
    const profitTrend = last7Days.map(dateStr => {
      const daySales = transactions.filter(t => t.type === 'sale' && isValidDate(t.timestamp) && safeFormatDate(t.timestamp, 'MMM dd') === dateStr);
      const dayProfit = daySales.reduce((sum, t) => sum + (t.profit || 0), 0);
      return { name: dateStr, profit: dayProfit };
    });

    // 4. Due vs Paid
    const totalPaid = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    const totalDue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + (t.dueAmount || 0), 0);
    const dueVsPaid = [
      { name: 'Paid', value: totalPaid },
      { name: 'Due', value: totalDue }
    ];

    // 5. Return / Refund
    const refundData = last7Days.map(dateStr => {
      const dayRefund = transactions
        .filter(t => (t.type === 'refund' || t.type === 'purchase') && isValidDate(t.timestamp) && safeFormatDate(t.timestamp, 'MMM dd') === dateStr)
        .reduce((sum, t) => sum + t.total, 0);
      return { name: dateStr, amount: dayRefund };
    });

    // 6. Top Customers
    const customerSalesMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'sale' && t.customerName).forEach(t => {
      customerSalesMap[t.customerName!] = (customerSalesMap[t.customerName!] || 0) + t.total;
    });
    const topCustomers = Object.entries(customerSalesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 7. Stock Level
    const stockLevels = products
      .map(p => ({ name: p.name, stock: p.stock }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    return {
      salesTrend,
      productSales,
      profitTrend,
      dueVsPaid,
      refundData,
      topCustomers,
      stockLevels
    };
  }, [transactions, products, activeBusinessId, showBusinessReport]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    try {
      if (authMode === 'signin' || authMode === 'signup') {
        if (authPassword.length < 6) {
          toast.error('Password must be at least 6 characters.');
          setIsLoggingIn(false);
          return;
        }
      }

      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        toast.success('Successfully logged in!');
      } else if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        toast.success('Account created successfully!');
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, authEmail);
        toast.success('Password reset email sent!');
        setAuthMode('signin');
      }
    } catch (error: any) {
      const errorCode = error?.code || 'unknown';
      const errorMessage = error?.message || 'An error occurred during authentication.';
      console.error('Auth error:', errorCode, errorMessage);
      let message = 'An error occurred during authentication.';

      switch (errorCode) {
        case 'auth/wrong-password':
          message = 'Incorrect password. Please try again.';
          break;
        case 'auth/user-not-found':
          message = 'User not found. Check your email or sign up.';
          break;
        case 'auth/invalid-credential':
          message = 'Invalid email or password. Please check and try again.';
          break;
        case 'auth/email-already-in-use':
          message = 'This email is already in use. Please log in instead.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email login is currently disabled. Please enable it in Firebase Console.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
      }
      toast.error(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setActiveBusinessId(null);
  };

  const handleSelectBusiness = async (id: string) => {
    if (!id) return;
    
    // Clear current data before switching to prevent data leakage/flicker
    setProducts([]);
    setTransactions([]);
    
    setActiveBusinessId(id);
    setHasInitialBusinessLoaded(true); // Mark as loaded so it doesn't switch back
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { lastActiveBusinessId: id }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    if (!name) return;

    setIsCreatingBusiness(true);
    try {
      const bizRef = await addDoc(collection(db, 'users', user.uid, 'businesses'), {
        name: name.trim(),
        createdAt: new Date().toISOString(),
        categories: ['General', 'Electronics', 'Grocery', 'Fashion'] // Added useful defaults
      });
      toast.success('Business created successfully!');
      handleSelectBusiness(bizRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/businesses`);
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  const handleDeleteBusiness = (id: string) => {
    if (!user) return;
    setBusinessToDelete(id);
  };

  const handleConfirmDelete = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'businesses', id));
      if (activeBusinessId === id) {
        setActiveBusinessId(null);
        await updateDoc(doc(db, 'users', user.uid), { lastActiveBusinessId: null });
      }
      setBusinessToDelete(null);
      toast.success('Business deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/businesses/${id}`);
    }
  };

  const handleAddCategory = async () => {
    if (!user || !activeBusinessId || !newCategoryName.trim()) return;
    
    const categoryName = newCategoryName.trim();
    
    // Check if category already exists to prevent duplicate keys
    if ((activeBusiness?.categories || []).includes(categoryName)) {
      toast.error('Category already exists!');
      return;
    }

    const updatedCategories = [...(activeBusiness?.categories || []), categoryName];
    try {
      await updateDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId), {
        categories: updatedCategories
      });
      setNewCategoryName('');
      setIsAddingCategory(false);
      setSelectedPurchaseCategory(categoryName);
      setSelectedEditCategory(categoryName);
      toast.success('Category added successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/businesses/${activeBusinessId}`);
    }
  };

  const handleRenameCategory = async () => {
    if (!user || !activeBusinessId || !categoryToRename || !renamedCategoryName.trim()) return;
    
    const oldName = categoryToRename;
    const newName = renamedCategoryName.trim();
    
    if (oldName === newName) {
      setCategoryToRename(null);
      return;
    }

    if ((activeBusiness?.categories || []).includes(newName)) {
      toast.error('Category with this name already exists!');
      return;
    }

    try {
      // 1. Update categories array in business doc
      const updatedCategories = (activeBusiness?.categories || []).map(c => c === oldName ? newName : c);
      await updateDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId), {
        categories: updatedCategories
      });

      // 2. Update all products in this category
      const productsRef = collection(db, 'users', user.uid, 'businesses', activeBusinessId, 'products');
      const q = query(productsRef); // We'll filter in memory or use where()
      // Better use where()
      // But wait, I need to import where
      const productsSnapshot = await getDocs(productsRef);
      
      const batch = writeBatch(db);
      let updatedCount = 0;
      
      productsSnapshot.docs.forEach(doc => {
        if (doc.data().category === oldName) {
          batch.update(doc.ref, { category: newName });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
      }

      setCategoryToRename(null);
      setRenamedCategoryName('');
      toast.success(`Category renamed and ${updatedCount} products updated!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/businesses/${activeBusinessId}`);
    }
  };

  const handleInitiateRenameCategory = (category: string) => {
    setCategoryToRename(category);
    setRenamedCategoryName(category);
  };

  const handleInitiateDeleteCategory = (category: string) => {
    setCategoryToDelete(category);
  };

  const handleInitiateDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const handleDeleteCategory = async () => {
    if (!user || !activeBusinessId || !categoryToDelete) return;

    const updatedCategories = (activeBusiness?.categories || []).filter(c => c !== categoryToDelete);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId), {
        categories: updatedCategories
      });
      setCategoryToDelete(null);
      toast.success('Category deleted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/businesses/${activeBusinessId}`);
    }
  };

  const handleDeleteProduct = async () => {
    if (!user || !activeBusinessId || !productToDelete) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'products', productToDelete.id));
      setProductToDelete(null);
      toast.success('Product deleted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/businesses/${activeBusinessId}/products/${productToDelete.id}`);
    }
  };

  const activeBusiness = useMemo(() => businesses.find(b => b.id === activeBusinessId), [businesses, activeBusinessId]);

  // Initialize category states
  useEffect(() => {
    if (activeBusiness?.categories?.length) {
      setSelectedPurchaseCategory(activeBusiness.categories[0]);
    }
  }, [activeBusinessId, activeBusiness]);

  useEffect(() => {
    if (editingProduct) {
      setSelectedEditCategory(editingProduct.category);
    }
  }, [editingProduct]);

  // --- Logic ---

  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const todaySales = transactions.filter(t => {
      if (t.type !== 'sale' || !isValidDate(t.timestamp)) return false;
      const d = t.timestamp && typeof (t.timestamp as any).toDate === 'function' ? (t.timestamp as any).toDate() : new Date(t.timestamp);
      return d.getTime() >= todayStart;
    });
    
    const todayProfit = todaySales.reduce((acc, t) => acc + (t.profit || 0), 0);
    const totalSalesValue = todaySales.reduce((acc, t) => acc + t.total, 0);
    const todayCost = totalSalesValue - todayProfit;
    const todayProfitPercentage = todayCost > 0 ? (todayProfit / todayCost) * 100 : 0;
    
    const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.buyPrice), 0);
    const lowStockProducts = products.filter(p => p.stock <= 2);
    const lowStockCount = lowStockProducts.length;

    const totalDue = transactions
      .filter(t => t.type === 'sale' && (t.dueAmount || 0) > 0)
      .reduce((acc, t) => acc + (t.dueAmount || 0), 0);

    return {
      todaySales: totalSalesValue,
      todayProfit,
      todayProfitPercentage,
      totalStockValue,
      lowStockCount,
      lowStockProducts,
      totalDue
    };
  }, [transactions, products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const term = deferredSearchTerm.trim().toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(term) ||
                            (p.category && p.category.toLowerCase().includes(term)) ||
                            (p.barcode && p.barcode.toLowerCase().includes(term));
        
        const matchesCategory = searchCategory === 'all' || p.category === searchCategory;
        
        const matchesStock = searchStockStatus === 'all' || 
                            (searchStockStatus === 'in-stock' && p.stock > (p.lowStockThreshold || 2)) ||
                            (searchStockStatus === 'low-stock' && p.stock > 0 && p.stock <= (p.lowStockThreshold || 2)) ||
                            (searchStockStatus === 'out-of-stock' && p.stock <= 0);
        
        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        const dateA = a.updatedAt?.toMillis?.() || new Date(a.updatedAt).getTime();
        const dateB = b.updatedAt?.toMillis?.() || new Date(b.updatedAt).getTime();
        return dateB - dateA;
      });
  }, [products, deferredSearchTerm, searchCategory, searchStockStatus]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; value: number }> = {};
    const categories = activeBusiness?.categories || [];
    
    // Initialize
    categories.forEach(cat => {
      stats[cat] = { count: 0, value: 0 };
    });
    
    // Process products
    products.forEach(p => {
      const cat = p.category || 'Standard';
      if (!stats[cat]) stats[cat] = { count: 0, value: 0 };
      stats[cat].count++;
      stats[cat].value += (p.stock * p.buyPrice);
    });
    
    return stats;
  }, [products, activeBusiness?.categories]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock * p.buyPrice), 0);
  }, [products]);

  const chartData = useMemo(() => {
    const data: Record<string, { sales: number; profit: number }> = {};
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), i);
      const key = format(d, 'MMM dd');
      data[key] = { sales: 0, profit: 0 };
      return key;
    }).reverse();

    transactions.forEach(t => {
      if (t.type !== 'sale' || !isValidDate(t.timestamp)) return;
      const key = safeFormatDate(t.timestamp, 'MMM dd');
      if (data[key]) {
        data[key].sales += t.total;
        data[key].profit += (t.profit || 0);
      }
    });

    return days.map(day => ({
      date: day,
      sales: data[day].sales,
      profit: data[day].profit,
    }));
  }, [transactions]);

  const handleAddPurchase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setIsRecordingPurchase(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const buyPrice = Number(formData.get('buyPrice'));
    const quantity = Number(formData.get('quantity'));
    const category = formData.get('category') as string;
    const barcode = formData.get('barcode') as string;

    if (buyPrice < 0 || quantity <= 0) {
      toast.error('Price and quantity must be positive!');
      setIsRecordingPurchase(false);
      return;
    }

    // Find if product exists
    const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase() || (barcode && p.barcode === barcode));
    let productId = existing?.id;

    const productsPath = `users/${user.uid}/businesses/${activeBusinessId}/products`;
    const transactionsPath = `users/${user.uid}/businesses/${activeBusinessId}/transactions`;

    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const productsRef = collection(db, 'users', user.uid, 'businesses', activeBusinessId!, 'products');

      if (existing) {
        batch.update(doc(productsRef, existing.id), {
          stock: existing.stock + quantity,
          buyPrice,
          category,
          barcode: barcode || existing.barcode,
          updatedAt: now
        });
      } else {
        const productDoc = doc(productsRef);
        productId = productDoc.id;
        batch.set(productDoc, {
          name: name.trim(),
          category,
          barcode,
          buyPrice,
          sellPrice: buyPrice,
          stock: quantity,
          lowStockThreshold: 2,
          updatedAt: now,
          createdAt: now
        });
      }

      const txRef = doc(collection(db, 'users', user.uid, 'businesses', activeBusinessId!, 'transactions'));
      batch.set(txRef, {
        type: 'purchase',
        productId,
        productName: name.trim(),
        barcode: barcode || existing?.barcode || '',
        quantity,
        price: buyPrice,
        total: buyPrice * quantity,
        timestamp: now
      });

      // Execute commit without blocking UI for offline snappiness
      batch.commit().catch(error => {
        handleFirestoreError(error, OperationType.WRITE, productsPath);
      });

      // Clear UI immediately for instant feedback
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      form.reset();
      setPurchaseSuccess(true);
      setSelectedPurchaseCategory('');
      setScannedBarcode('');
      setTimeout(() => setPurchaseSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, productsPath);
    } finally {
      setIsRecordingPurchase(false);
    }
  };

  const handleAddSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const productId = formData.get('productId') as string;
    const quantity = Number(formData.get('quantity'));
    const sellPrice = Number(formData.get('sellPrice'));

    if (sellPrice < 0 || quantity <= 0) {
      toast.error('Price and quantity must be positive!');
      setIsRecordingSale(false);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
      toast.error('Product not found!');
      setIsRecordingSale(false);
      return;
    }
    
    if (product.stock < quantity) {
      toast.error('Not enough stock available!');
      setIsRecordingSale(false);
      return;
    }

    const total = sellPrice * quantity;
    const profit = (sellPrice - product.buyPrice) * quantity;
    const dueAmount = total - salePaidAmount;

    const productsPath = `users/${user.uid}/businesses/${activeBusinessId}/products/${productId}`;
    const transactionsPath = `users/${user.uid}/businesses/${activeBusinessId}/transactions`;

    setIsRecordingSale(true);
    try {
      const batch = writeBatch(db);
      
      const productRef = doc(db, 'users', user.uid, 'businesses', activeBusinessId!, 'products', productId);
      batch.update(productRef, {
        stock: product.stock - quantity,
        updatedAt: new Date().toISOString()
      });

      const txRef = doc(collection(db, 'users', user.uid, 'businesses', activeBusinessId!, 'transactions'));
      batch.set(txRef, {
        type: 'sale',
        productId,
        productName: product.name,
        barcode: scannedBarcode || String(product.barcode || ''),
        quantity,
        price: sellPrice,
        total,
        profit,
        customerName: saleCustomerName,
        customerPhone: saleCustomerPhone,
        paidAmount: salePaidAmount,
        dueAmount: dueAmount,
        timestamp: new Date().toISOString()
      });

      // Execute commit without blocking UI for offline snappiness
      batch.commit().catch(error => {
        handleFirestoreError(error, OperationType.WRITE, productsPath);
      });

      // Clear UI immediately
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      form.reset();
      setSelectedSaleProductId('');
      setSelectedSaleCategory('all');
      setSalePrice(0);
      setSaleQuantity(1);
      setSalePaidAmount(0);
      setSaleCustomerName('');
      setSaleCustomerPhone('');
      setScannedBarcode('');
      setSaleSuccess(true);
      setTimeout(() => setSaleSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, productsPath);
    } finally {
      setIsRecordingSale(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !editingProduct) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const buyPrice = Number(formData.get('buyPrice'));
    const stock = Number(formData.get('stock'));
    const category = formData.get('category') as string;
    const barcode = formData.get('barcode') as string;

    const productsPath = `users/${user.uid}/businesses/${activeBusinessId}/products/${editingProduct.id}`;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId!, 'products', editingProduct.id), {
        name,
        buyPrice,
        stock,
        category,
        barcode,
        updatedAt: new Date().toISOString()
      });
      setEditingProduct(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, productsPath);
    }
  };

  const handleEditTransactionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !activeBusinessId || !editingTransaction) return;

    const formData = new FormData(e.currentTarget);
    const quantity = Number(formData.get('quantity'));
    const price = Number(formData.get('price'));
    const paidAmount = Number(formData.get('paidAmount')) || 0;
    const customerName = formData.get('customerName') as string || '';
    const customerPhone = formData.get('customerPhone') as string || '';
    const barcode = formData.get('barcode') as string || '';
    const total = quantity * price;
    const dueAmount = total - paidAmount;

    const qtyDiff = quantity - editingTransaction.quantity;
    const transactionsPath = `users/${user.uid}/businesses/${activeBusinessId}/transactions/${editingTransaction.id}`;

    try {
      const transactionRef = doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'transactions', editingTransaction.id);
      const productRef = doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'products', editingTransaction.productId);

      await runTransaction(db, async (dbTransaction) => {
        const productSnap = await dbTransaction.get(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data() as Product;
          let newStock = productData.stock;
          
          if (editingTransaction.type === 'sale') {
            newStock -= qtyDiff;
          } else if (editingTransaction.type === 'purchase') {
            newStock += qtyDiff;
          }
          
          dbTransaction.update(productRef, { stock: newStock });
        }

        dbTransaction.update(transactionRef, {
          quantity,
          price,
          total,
          paidAmount,
          dueAmount,
          customerName,
          customerPhone,
          barcode,
          ...(editingTransaction.type === 'sale' && productSnap.exists() && {
            profit: total - ((productSnap.data() as Product).buyPrice * quantity)
          })
        });
      });

      setEditingTransaction(null);
      toast.success('Transaction updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, transactionsPath);
    }
  };

  const handlePayDue = async (transactionId: string) => {
    if (!user || !activeBusinessId || duePaymentAmount <= 0) return;
    
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const currentPaid = transaction.paidAmount || 0;
    const currentDue = transaction.dueAmount || 0;
    
    if (duePaymentAmount > currentDue) {
      toast.error('Payment amount cannot be greater than due amount!');
      return;
    }

    const newPaid = currentPaid + duePaymentAmount;
    const newDue = currentDue - duePaymentAmount;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'transactions', transactionId), {
        paidAmount: newPaid,
        dueAmount: newDue,
        timestamp: new Date().toISOString() // Update date as requested
      });
      setPayingDueId(null);
      setDuePaymentAmount(0);
      toast.success(newDue === 0 ? 'Due fully paid!' : 'Due payment recorded!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/businesses/${activeBusinessId}/transactions/${transactionId}`);
    }
  };

  const handleRefundTransaction = async () => {
    if (!user || !activeBusinessId || !transactionToRefund) return;

    if (refundQuantity <= 0 || refundQuantity > transactionToRefund.quantity) {
      toast.error(`Invalid quantity. Max: ${transactionToRefund.quantity}`);
      return;
    }

    const transactionsPath = `users/${user.uid}/businesses/${activeBusinessId}/transactions/${transactionToRefund.id}`;
    const productsPath = `users/${user.uid}/businesses/${activeBusinessId}/products/${transactionToRefund.productId}`;

    try {
      // Update transaction to 'refund' type and adjust totals to reflect the refund
      await updateDoc(doc(db, transactionsPath), {
        type: 'refund',
        refundQuantity,
        refundReason,
        // Update the main quantity and total to reflect what was actually refunded
        quantity: refundQuantity,
        total: refundQuantity * transactionToRefund.price,
        // If it was a sale, we should also zero out the profit for the refunded portion
        profit: 0,
        timestamp: new Date().toISOString()
      });

      // Update stock if it was a sale
      if (transactionToRefund.type === 'sale') {
        const product = products.find(p => p.id === transactionToRefund.productId);
        if (product) {
          await updateDoc(doc(db, productsPath), {
            stock: product.stock + refundQuantity,
            updatedAt: new Date().toISOString()
          });
        }
      }

      setTransactionToRefund(null);
      setRefundQuantity(1);
      setRefundReason('');
      toast.success('Transaction successfully refunded.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, transactionsPath);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!user || !activeBusinessId || !transactionToDelete) return;
    const transactionsPath = `users/${user.uid}/businesses/${activeBusinessId}/transactions/${transactionToDelete.id}`;
    const productsPath = `users/${user.uid}/businesses/${activeBusinessId}/products/${transactionToDelete.productId}`;

    try {
      // Revert stock
      const product = products.find(p => p.id === transactionToDelete.productId);
      if (product) {
        const newStock = (transactionToDelete.type === 'purchase' || transactionToDelete.type === 'refund')
          ? product.stock - transactionToDelete.quantity 
          : product.stock + transactionToDelete.quantity;
        
        await updateDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'products', transactionToDelete.productId), {
          stock: Math.max(0, newStock),
          updatedAt: new Date().toISOString()
        });
      }

      await deleteDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'transactions', transactionToDelete.id));
      setTransactionToDelete(null);
      toast.success('Transaction deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, transactionsPath);
    }
  };

  const handleDeleteAllTransactions = async () => {
    if (!user || !activeBusinessId || transactions.length === 0) return;
    setIsDeletingAll(true);
    
    try {
      // 1. Group products that need stock updates to minimize write operations
      const stockUpdates = new Map<string, number>(); // productId -> change amount
      
      transactions.forEach(t => {
        const change = (t.type === 'purchase' || t.type === 'refund') ? -t.quantity : t.quantity;
        stockUpdates.set(t.productId, (stockUpdates.get(t.productId) || 0) + change);
      });

      // 2. Update product stocks
      for (const [productId, change] of stockUpdates.entries()) {
        const product = products.find(p => p.id === productId);
        if (product) {
          await updateDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'products', productId), {
            stock: Math.max(0, product.stock + change),
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 3. Delete all transaction documents
      for (const t of transactions) {
        await deleteDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'transactions', t.id));
      }

      toast.success(`Deleted ${transactions.length} transactions and adjusted stock`);
      setShowDeleteAllConfirm(false);
    } catch (error) {
      console.error("Error deleting all transactions:", error);
      toast.error('Failed to delete all transactions');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleScan = (barcode: string) => {
    setScannedBarcode(barcode);
    if (showScanner === 'sale') {
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        setSelectedSaleProductId(product.id);
        toast.success(`Product found: ${product.name}`);
      } else {
        toast.error('Product not found with this barcode');
      }
    } else if (showScanner === 'transactions') {
      setTransactionSearchTerm(barcode);
    }
    setShowScanner(null);
  };

  const exportData = () => {
    const data = { products, transactions, profile };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeBusiness?.name || 'business').toLowerCase().replace(/\s+/g, '-')}-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !activeBusinessId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.products) {
          for (const p of data.products) {
            try {
              const { id, ...rest } = p;
              await setDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'products', id), rest);
            } catch (pErr) {
              console.error('Error importing product:', pErr);
            }
          }
        }
        if (data.transactions) {
          for (const t of data.transactions) {
            try {
              const { id, ...rest } = t;
              await setDoc(doc(db, 'users', user.uid, 'businesses', activeBusinessId, 'transactions', id), rest);
            } catch (tErr) {
              console.error('Error importing transaction:', tErr);
            }
          }
        }
        toast.success('Data imported successfully!');
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  if (loading || (user && !isDataLoaded)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full animate-pulse delay-700" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-8 ring-8 ring-emerald-500/10">
            <TrendingUp className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter text-center">
            Milon One
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-8 text-center">
            Business Tracker
          </p>
          
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-2 h-2 rounded-full bg-emerald-500"
                />
              ))}
            </div>
            {/* Initializing text removed */}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Animated Background Gradients */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full" 
        />

        <div className="w-full max-w-sm relative z-10 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-8 ring-8 ring-emerald-500/10 cursor-pointer"
            >
              <TrendingUp className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">Milon One <span className="text-[12px] opacity-30">v1.5</span></h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Business Tracker</p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={authMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Card className="p-8 border-2 border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden relative">
                <form onSubmit={handleAuth} className="space-y-6">
                  <div className="space-y-1 text-left">
                    <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                      {authMode === 'signin' ? 'Welcome Back' : authMode === 'signup' ? 'Create Account' : 'Reset Password'}
                    </h2>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                      {authMode === 'signin' ? 'Log in to your business' : authMode === 'signup' ? 'Join our platform today' : 'Check your inbox for a link'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input 
                      type="email"
                      label="Email Address"
                      placeholder="Enter your email"
                      icon={Mail}
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                    
                    {authMode !== 'forgot' && (
                      <Input 
                        type="password"
                        label="Password (min. 6 chars)"
                        placeholder="••••••••"
                        icon={ShieldCheck}
                        required
                        minLength={6}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                    )}
                  </div>

                  <Button 
                    type="submit"
                    loading={isLoggingIn}
                    className="w-full py-4 text-xs font-black uppercase tracking-widest"
                  >
                    {authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Link'}
                  </Button>

                  <div className="flex flex-col gap-4 text-center">
                    {authMode === 'signin' ? (
                      <>
                        <button 
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-blue-500 transition-colors"
                        >
                          Recover Password
                        </button>
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          No account? {' '}
                          <button 
                            type="button"
                            onClick={() => setAuthMode('signup')}
                            className="text-emerald-500 hover:underline font-black"
                          >
                            Sign Up
                          </button>
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Already joined? {' '}
                        <button 
                          type="button"
                          onClick={() => setAuthMode('signin')}
                          className="text-blue-500 hover:underline font-black"
                        >
                          Sign In
                        </button>
                      </p>
                    )}
                  </div>
                </form>
              </Card>
            </motion.div>
          </AnimatePresence>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-loose"
          >
            Secure Cloud Environment<br/>
            &copy; 2026 Enterprise Solution
          </motion.p>
        </div>
      </div>
    );
  }

  if (!activeBusinessId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-10 relative z-10"
        >
          <Toaster position="top-center" richColors closeButton />
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 shadow-2xl shadow-emerald-500/40 mb-6">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">Select Business</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Manage your ventures with precision.</p>
          </div>

          <div className="space-y-4">
            {businesses.map(biz => (
              <motion.div
                key={biz.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="p-5 hover:border-emerald-500/50 transition-all cursor-pointer group relative overflow-hidden border-2">
                  <div className="flex items-center justify-between" onClick={() => handleSelectBusiness(biz.id)}>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                        <Package className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-zinc-900 dark:text-white tracking-tight">{biz.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Established {safeFormatDate(biz.createdAt, 'MMM yyyy')}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-zinc-300 group-hover:text-emerald-500 transition-all group-hover:translate-x-1" />
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBusiness(biz.id);
                    }}
                    className="absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-xl text-zinc-400 hover:text-rose-500 transition-all opacity-40 hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </Card>
              </motion.div>
            ))}

            <Card className="p-8 border-dashed border-4 border-zinc-200 dark:border-zinc-800 bg-transparent hover:border-emerald-500/30 transition-colors">
              <form onSubmit={handleCreateBusiness} className="space-y-6">
                <Input name="name" label="Register New Business" placeholder="e.g. Global Enterprises" required />
                <Button type="submit" size="lg" className="w-full" loading={isCreatingBusiness}>
                  Launch Business
                </Button>
              </form>
            </Card>

            <div className="pt-4">
              <Button variant="ghost" onClick={handleLogout} className="w-full text-zinc-400 hover:text-rose-500">
                <LogOut className="w-4 h-4" />
                Sign Out of Account
              </Button>
            </div>
          </div>
        </motion.div>

        <MathDeleteModal 
          isOpen={!!businessToDelete}
          onClose={() => setBusinessToDelete(null)}
          onConfirm={() => businessToDelete && handleConfirmDelete(businessToDelete)}
          title="Delete Business?"
          message={<>Are you sure you want to delete <span className="font-bold text-zinc-900 dark:text-zinc-100">"{businesses.find(b => b.id === businessToDelete)?.name || 'this business'}"</span>? All data will be lost.</>}
        />

        {/* Business Settings Modal */}
        <AnimatePresence>
          {isBusinessSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBusinessSettingsOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-900 p-8 shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-16 -mt-16" />
                
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Business Settings</h3>
                  <button onClick={() => setIsBusinessSettingsOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Rename Business</label>
                    <div className="flex gap-2">
                      <Input 
                        value={newBusinessName}
                        onChange={(e) => setNewBusinessName(e.target.value)}
                        placeholder="New business name..."
                        className="flex-1"
                      />
                      <Button onClick={handleRenameBusiness} className="shrink-0">
                        <Check className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] ml-1 mb-4">Danger Zone</p>
                    <Button 
                      variant="danger" 
                      className="w-full py-4"
                      onClick={() => {
                        setIsBusinessSettingsOpen(false);
                        handleDeleteBusiness(activeBusinessId!);
                      }}
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Delete This Business
                    </Button>
                    <p className="text-[10px] text-zinc-400 text-center mt-4 font-medium italic">
                      This action is irreversible. All products and transactions will be lost.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-zinc-900 dark:text-zinc-100 transition-colors duration-500 font-sans">
      <Toaster position="top-center" richColors closeButton />
      
      <AnimatePresence>
        {permissionStep !== 'complete' && user && (
          <div className="fixed inset-0 z-[200] overflow-hidden pointer-events-auto">
            {permissionStep === 'storage' && (
              <PermissionDialog 
                key="storage-dialog"
                icon={FolderOpen}
                title="to access Storage?"
                description="This allows the app to save your business data, products, and transaction history safely on this device for offline access."
                onAllow={handleAllowPermission}
                onDeny={() => {
                  setPermissionStep('camera');
                  toast.error("Storage permission skipped. Some offline features might be limited.");
                }}
              />
            )}
            {permissionStep === 'camera' && (
              <PermissionDialog 
                key="camera-dialog"
                icon={Camera}
                title="to take pictures and record video?"
                description="This is required to use the Barcode Scanner for quick product entry and sales recording."
                onAllow={handleAllowPermission}
                onDeny={() => {
                  localStorage.setItem('permissionsRequested', 'true');
                  setPermissionStep('complete');
                  toast.error("Camera permission skipped. Barcode scanner will be disabled.");
                }}
              />
            )}
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto min-h-screen flex flex-col relative bg-white dark:bg-[#03081e] shadow-[0_0_100px_rgba(0,0,0,0.05)]">
        
        {/* Header */}
        <header className="p-6 pb-2 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#03081e]/80 backdrop-blur-2xl z-50 border-b-2 border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              {isRenamingBusiness ? (
                <div className="flex items-center gap-2">
                  <input 
                    autoFocus
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameBusiness()}
                    className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-40"
                  />
                  <button onClick={handleRenameBusiness} className="text-brand-500 active:scale-90 transition-transform"><Check className="w-5 h-5" /></button>
                  <button onClick={() => setIsRenamingBusiness(false)} className="text-rose-500 active:scale-90 transition-transform"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="flex flex-col">
                  <h1 className="font-black text-2xl leading-none tracking-tighter text-zinc-900 dark:text-white">
                    {activeBusiness?.name || 'My Business'}
                  </h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">
                    Management Suite • v1.5
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full shadow-sm transition-colors duration-500",
              isOnline 
                ? "bg-emerald-500 shadow-emerald-500/20" 
                : "bg-rose-500 shadow-rose-500/20 animate-pulse"
            )} title={isOnline ? 'Online' : 'Offline'} />
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveBusinessId(null)}
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-brand-500 transition-all shadow-sm"
              title="Switch Business"
            >
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 hover:bg-emerald-500/20 transition-all border border-emerald-500/10"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('profile')} 
              className={cn(
                "w-10 h-10 rounded-xl bg-emerald-500/10 border-2 transition-all flex items-center justify-center overflow-hidden",
                activeTab === 'profile' ? "border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg shadow-emerald-500/20" : "border-emerald-500/20 hover:border-emerald-500"
              )}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-emerald-600" />
              )}
            </motion.button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 pb-40 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <SummaryCard 
                  label="Sales Today"
                  value={`৳${stats.todaySales.toLocaleString()}`}
                  trend={stats.todaySales > 0 ? '+12.5%' : undefined}
                  icon={TrendingUp}
                  colorClass="red"
                />
                
                <SummaryCard 
                  label="Net Profit"
                  value={`৳${stats.todayProfit.toLocaleString()}`}
                  trend={stats.todayProfit > 0 ? `${stats.todayProfitPercentage.toFixed(1)}%` : undefined}
                  icon={BarChart3}
                  colorClass="emerald"
                />

                <SummaryCard 
                  label="Total Stock"
                  value={`৳${stats.totalStockValue.toLocaleString()}`}
                  icon={Package}
                  colorClass="blue"
                />

                <SummaryCard 
                  label="Low Stock"
                  value={stats.lowStockCount.toString()}
                  trend={stats.lowStockCount > 0 ? "Restock Needed" : "Inventory OK"}
                  icon={AlertTriangle}
                  colorClass="red"
                />
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <motion.button 
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBusinessReport(true)}
                  className="w-full p-6 rounded-[2.5rem] bg-white dark:bg-zinc-900/40 border-2 border-blue-500/20 dark:border-blue-500/30 flex items-center justify-between group transition-all hover:border-blue-500 shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-3xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <BarChart3 className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Business Report</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 font-black">Analytics & Insights</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-300" />
                </motion.button>

                <motion.button 
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('transactions')}
                  className="w-full p-6 rounded-[2.5rem] bg-emerald-600 border-2 border-emerald-500/20 flex items-center justify-between group transition-all hover:border-emerald-500 hover:shadow-2xl shadow-emerald-500/10 shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-3xl bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <RefreshCw className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-lg tracking-tight text-white">All Transactions</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60">Full business history</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white" />
                </motion.button>

                <motion.button 
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('due')}
                  className="w-full p-6 rounded-[2.5rem] bg-white dark:bg-zinc-900/40 border-2 border-rose-500/20 dark:border-rose-500/30 flex items-center justify-between group transition-all hover:border-rose-500 shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Due Manager</h3>
                        {stats.totalDue > 0 && (
                          <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black tracking-tighter shadow-lg shadow-rose-500/30">
                            ৳{stats.totalDue.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/60 font-black">Track Customer Debt</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-rose-300" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'due' && (
            <motion.div 
              key="due"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">Due Information</h2>
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('dashboard')}>
                  Back to Dashboard
                </Button>
              </div>

              <Card className="bg-rose-500/5 border-rose-500/10 dark:border-rose-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-rose-600 dark:text-rose-500 uppercase tracking-wider mb-1">Total Outstanding Due</p>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-white">৳{stats.totalDue.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              <div className="space-y-4">
                <Card title="Customer Due List">
                  <div className="space-y-3">
                    {transactions.filter(t => t.type === 'sale' && (t.dueAmount || 0) > 0).length > 0 ? (
                      transactions.filter(t => t.type === 'sale' && (t.dueAmount || 0) > 0).map(t => (
                        <motion.div 
                          key={t.id} 
                          whileHover={{ scale: 1.01, x: 5 }}
                          className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:border-emerald-500/30"
                        >
                          <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{t.customerName || 'Unknown Customer'}</p>
                                    {t.customerPhone && (
                                      <a 
                                        href={`tel:${t.customerPhone}`}
                                        className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                                      >
                                        <Phone className="w-2.5 h-2.5" />
                                        Call
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500 font-medium">{t.productName} ({t.quantity} units)</p>
                                </div>
                            <div className="text-right">
                              <p className="text-rose-600 font-bold text-lg">৳{t.dueAmount?.toLocaleString()}</p>
                              <p className="text-[10px] text-zinc-400 uppercase font-bold">Due Amount</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800/50 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-4">
                              <span>Total: ৳{t.total.toLocaleString()}</span>
                              <span className="text-emerald-500">Paid: ৳{t.paidAmount?.toLocaleString()}</span>
                            </div>
                            <span className="flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              {safeFormatDate(t.timestamp, 'MMM dd, yyyy • HH:mm')}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-col gap-2">
                            {payingDueId === t.id ? (
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">Payment Amount (৳)</label>
                                  <input 
                                    type="number"
                                    autoFocus
                                    value={duePaymentAmount || ''}
                                    onChange={(e) => setDuePaymentAmount(Number(e.target.value))}
                                    placeholder="Enter amount"
                                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" onClick={() => handlePayDue(t.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="secondary" onClick={() => setPayingDueId(null)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
                                onClick={() => {
                                  setPayingDueId(t.id);
                                  setDuePaymentAmount(t.dueAmount || 0);
                                }}
                              >
                                <Wallet className="w-4 h-4 mr-2" />
                                Pay Due
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-center text-zinc-500 py-12 italic">No outstanding dues found</p>
                    )}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div 
              key="transactions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold">Transaction History</h2>
                  {transactions.length > 0 && (
                    <button 
                      onClick={() => setShowDeleteAllConfirm(true)}
                      className="text-[10px] text-rose-500 font-bold uppercase tracking-widest hover:underline flex items-center gap-1 mt-1"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Clear All Transactions
                    </button>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('dashboard')}>
                  Back to Dashboard
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      placeholder="Search by name or barcode..." 
                      value={transactionSearchTerm}
                      onChange={(e) => setTransactionSearchTerm(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-20 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {transactionSearchTerm && (
                        <button onClick={() => setTransactionSearchTerm('')} className="p-1 text-zinc-300 hover:text-rose-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => setShowScanner('transactions')}
                        className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <select
                    value={selectedSaleCategory}
                    onChange={(e) => setSelectedSaleCategory(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm font-bold"
                  >
                    <option value="all">All Categories</option>
                    {(activeBusiness?.categories || []).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl relative">
                <button 
                  onClick={() => {
                    setTransactionFilter('sale');
                    setIsFilterMenuOpen(false);
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                    transactionFilter === 'sale' 
                      ? "bg-white dark:bg-zinc-900 text-emerald-600 shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  Sell
                </button>
                <button 
                  onClick={() => {
                    setTransactionFilter('purchase');
                    setIsFilterMenuOpen(false);
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                    transactionFilter === 'purchase' 
                      ? "bg-white dark:bg-zinc-900 text-rose-600 shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <TrendingDown className="w-4 h-4" />
                  Buy
                </button>
                
                <button 
                  onClick={() => setTransactionFilter('refund')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                    transactionFilter === 'refund'
                      ? "bg-white dark:bg-zinc-900 text-amber-600 shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <RotateCcw className="w-4 h-4" />
                  Refund
                </button>
              </div>

              <div className="space-y-4">
                {transactionFilter === 'purchase' ? (
                  /* Purchases List */
                  <Card title="All Purchases (Buy)">
                    <div className="space-y-3">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map(t => (
                          <motion.div 
                          key={t.id} 
                          whileHover={{ scale: 1.02, y: -4, shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="p-4 bg-rose-50 dark:bg-rose-500/5 rounded-2xl border-2 border-rose-200 dark:border-rose-500/20 relative cursor-default"
                        >
                            <div className="absolute top-4 right-4">
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenu(activeActionMenu === t.id ? null : t.id);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                                  title="More Actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {activeActionMenu === t.id && (
                                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button 
                                      onClick={() => {
                                        setEditingTransaction(t);
                                        setActiveActionMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      Edit Transaction
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setTransactionToDelete(t);
                                        setActiveActionMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete Transaction
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {editingTransaction?.id === t.id ? (
                              <form onSubmit={handleEditTransactionSubmit} className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Quantity</label>
                                    <Input name="quantity" type="number" defaultValue={t.quantity} required />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Buy Price (৳)</label>
                                    <Input name="price" type="number" step="0.01" defaultValue={t.price} required />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Barcode</label>
                                  <Input name="barcode" defaultValue={t.barcode || ''} />
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700">Save</Button>
                                  <Button type="button" variant="secondary" onClick={() => setEditingTransaction(null)}>Cancel</Button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex justify-between items-start mb-2 pr-8">
                                  <div>
                                    <p className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{t.productName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                        Barcode: {t.barcode || 'None'}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-rose-600 font-bold text-lg">৳{t.total.toLocaleString()}</p>
                                </div>
                                <div className="flex justify-between items-center text-xs text-zinc-500 font-medium">
                                  <span>{t.quantity} units @ ৳{t.price}</span>
                                  <span className="flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    {safeFormatDate(t.timestamp, 'MMM dd, yyyy • HH:mm')}
                                  </span>
                                </div>
                              </>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-center text-zinc-500 py-12 italic">No purchases recorded</p>
                      )}
                    </div>
                  </Card>
                ) : transactionFilter === 'sale' ? (
                  /* Sales List */
                  <Card title="All Sales (Sell)">
                    <div className="space-y-3">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map(t => (
                          <motion.div 
                            key={t.id} 
                            whileHover={{ scale: 1.02, y: -4, shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/20 relative cursor-default"
                          >
                            <div className="absolute top-4 right-4">
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenu(activeActionMenu === t.id ? null : t.id);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-emerald-500 transition-colors"
                                  title="More Actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {activeActionMenu === t.id && (
                                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button 
                                      onClick={() => {
                                        setEditingTransaction(t);
                                        setActiveActionMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      Edit Transaction
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setTransactionToRefund(t);
                                        setRefundQuantity(t.quantity);
                                        setActiveActionMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      Refund Transaction
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setTransactionToDelete(t);
                                        setActiveActionMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete Transaction
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {editingTransaction?.id === t.id ? (
                              <form onSubmit={handleEditTransactionSubmit} className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Quantity</label>
                                    <Input name="quantity" type="number" defaultValue={t.quantity} required />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Sale Price (৳)</label>
                                    <Input name="price" type="number" step="0.01" defaultValue={t.price} required />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Paid Amount (৳)</label>
                                    <Input name="paidAmount" type="number" step="0.01" defaultValue={t.paidAmount || 0} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Barcode</label>
                                    <Input name="barcode" defaultValue={t.barcode || ''} />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Customer Name</label>
                                    <Input name="customerName" defaultValue={t.customerName || ''} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Customer Phone</label>
                                    <Input name="customerPhone" defaultValue={t.customerPhone || ''} />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">Save</Button>
                                  <Button type="button" variant="secondary" onClick={() => setEditingTransaction(null)}>Cancel</Button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex justify-between items-start mb-2 pr-8">
                                  <div>
                                    <p className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{t.productName}</p>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                          Barcode: {t.barcode || 'None'}
                                        </p>
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        {(t.customerName || t.customerPhone) && (
                                          <div className="flex items-center gap-2">
                                            {t.customerName && <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Customer: {t.customerName}</p>}
                                            {t.customerPhone && (
                                              <a 
                                                href={`tel:${t.customerPhone}`}
                                                className="ml-1 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95"
                                              >
                                                <Phone className="w-2.5 h-2.5" />
                                                Call
                                              </a>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-emerald-600 font-bold text-lg">৳{t.total.toLocaleString()}</p>
                                </div>
                                <div className="flex justify-between items-center text-xs text-zinc-500 font-medium">
                                  <span>{t.quantity} units @ ৳{t.price}</span>
                                  <span className="flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    {safeFormatDate(t.timestamp, 'MMM dd, yyyy • HH:mm')}
                                  </span>
                                </div>
                                
                                {(t.paidAmount !== undefined || t.dueAmount !== undefined) && (
                                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase font-bold tracking-wider">
                                    <div className="bg-emerald-500/10 text-emerald-600 p-1.5 rounded-lg flex justify-between px-2">
                                      <span>Paid</span>
                                      <span>৳{t.paidAmount?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className={cn(
                                      "p-1.5 rounded-lg flex justify-between px-2",
                                      (t.dueAmount || 0) > 0 ? "bg-rose-500/10 text-rose-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                    )}>
                                      <span>Due</span>
                                      <span>৳{t.dueAmount?.toLocaleString() || 0}</span>
                                    </div>
                                  </div>
                                )}

                                {t.profit !== undefined && (
                                  <div className="mt-3 pt-3 border-t-2 border-emerald-100 dark:border-emerald-500/10 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Net Profit</span>
                                      <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-md font-bold">
                                        {t.total - t.profit > 0 
                                          ? `${((t.profit / (t.total - t.profit)) * 100).toFixed(1)}%` 
                                          : '100%'}
                                      </span>
                                    </div>
                                    <span className="text-sm text-blue-500 font-bold">৳{t.profit.toLocaleString()}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                          <Package2 className="w-12 h-12 text-zinc-300 mb-4" />
                          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Recent Sales</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card title="All Refunds">
                    <div className="space-y-3">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map(t => (
                          <motion.div 
                            key={t.id} 
                            whileHover={{ scale: 1.02, y: -4, shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border-2 border-amber-200 dark:border-amber-500/20 relative cursor-default"
                          >
                            <div className="absolute top-4 right-4">
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenu(activeActionMenu === t.id ? null : t.id);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-amber-500 transition-colors"
                                  title="More Actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {activeActionMenu === t.id && (
                                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button 
                                      onClick={() => {
                                        setEditingTransaction(t);
                                        setActiveActionMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      Edit Transaction
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setTransactionToDelete(t);
                                        setActiveActionMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete Transaction
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {editingTransaction?.id === t.id ? (
                              <form onSubmit={handleEditTransactionSubmit} className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Quantity</label>
                                    <Input name="quantity" type="number" defaultValue={t.quantity} required />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Price (৳)</label>
                                    <Input name="price" type="number" step="0.01" defaultValue={t.price} required />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Barcode</label>
                                  <Input name="barcode" defaultValue={t.barcode || ''} />
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">Save</Button>
                                  <Button type="button" variant="secondary" onClick={() => setEditingTransaction(null)}>Cancel</Button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex justify-between items-start mb-2 pr-8">
                                  <div>
                                    <p className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{t.productName}</p>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                      Barcode: {t.barcode || 'None'}
                                    </p>
                                    <div className="flex flex-col gap-0.5">
                                      {(t.customerName || t.customerPhone) && (
                                        <div className="flex items-center gap-2">
                                          {t.customerName && <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Customer: {t.customerName}</p>}
                                          {t.customerPhone && (
                                            <a 
                                              href={`tel:${t.customerPhone}`}
                                              className="ml-1 flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-95"
                                            >
                                              <Phone className="w-2.5 h-2.5" />
                                              Call
                                            </a>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-amber-600 font-bold text-lg">৳{t.total.toLocaleString()}</p>
                                </div>
                                <div className="flex justify-between items-center text-xs text-zinc-500 font-medium">
                                  <span>{t.refundQuantity || t.quantity} units @ ৳{t.price}</span>
                                  <span className="flex items-center gap-1">
                                    <RotateCcw className="w-3 h-3" />
                                    {safeFormatDate(t.timestamp, 'MMM dd, yyyy • HH:mm')}
                                  </span>
                                </div>
                                {t.refundReason && (
                                  <div className="mt-2 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-0.5">Reason</p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">"{t.refundReason}"</p>
                                  </div>
                                )}
                              </>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                          <RotateCcw className="w-12 h-12 text-zinc-300 mb-4" />
                          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Recent Refunds</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'purchase' && (
            <motion.div 
              key="purchase"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card title="New Purchase Entry">
                <form onSubmit={handleAddPurchase} className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Select 
                          name="category" 
                          label="Category"
                          value={selectedPurchaseCategory}
                          required
                          options={[
                            { value: '', label: 'Select Category' },
                            ...(activeBusiness?.categories || []).map(c => ({ value: c, label: c })),
                          ]}
                          onChange={(e) => setSelectedPurchaseCategory(e.target.value)}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        className="h-[46px] px-3"
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                        title="Manage Categories"
                      >
                        <Settings2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isAddingCategory && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl space-y-5 overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Category Manager</h4>
                          <button 
                            type="button"
                            onClick={() => setIsAddingCategory(false)}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Current Categories</label>
                          <div className="flex flex-wrap gap-2">
                            {(activeBusiness?.categories || []).length > 0 ? (
                              (activeBusiness?.categories || []).map((cat, index) => (
                                <div 
                                  key={`${cat}-${index}`} 
                                  className="group flex items-center gap-3 bg-white dark:bg-zinc-900 pl-4 pr-2 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 transition-all shadow-sm max-w-full"
                                >
                                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[120px] sm:max-w-[200px]">{cat}</span>
                                  <div className="flex items-center gap-2.5 opacity-100">
                                    <button 
                                      type="button"
                                      onClick={() => handleInitiateRenameCategory(cat)}
                                      className="p-3 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 transition-colors rounded-xl shrink-0 shadow-sm border border-emerald-500/10"
                                      title="Rename"
                                    >
                                      <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => handleInitiateDeleteCategory(cat)}
                                      className="p-3 text-rose-500 bg-rose-50 dark:bg-rose-500/10 transition-colors rounded-xl shrink-0 shadow-sm border border-rose-500/10"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-zinc-500 italic ml-1">No categories added yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1 text-center block">Add New Category</label>
                          <div className="flex flex-col gap-3 items-center">
                            <Input 
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                              placeholder="Enter category name"
                              className="w-full"
                            />
                            <Button 
                              type="button" 
                              onClick={handleAddCategory} 
                              className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 w-40"
                            >
                              Add Category
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="name" label="Product Name" placeholder="Enter product name" required />
                    <div className="space-y-3 p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                          <Barcode className="w-3 h-3 text-emerald-500" />
                          Quick Scan Engine
                        </label>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,124,81,0.6)]" />
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                        </div>
                      </div>
                      <div className="flex gap-3 relative">
                        <div className="flex-1 relative">
                          <Input 
                            name="barcode" 
                            placeholder="Scan or type ID..." 
                            className="w-full bg-white dark:bg-black/40" 
                            value={scannedBarcode} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setScannedBarcode(val);
                              const product = products.find(p => p.barcode === val);
                              if (product) {
                                toast.success(`Existing product: ${product.name}`);
                              }
                            }} 
                          />
                        </div>
                        <motion.button 
                          type="button" 
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowScanner('purchase')} 
                          className="flex items-center justify-center p-4 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20 group/btn overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
                          <Camera className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input name="buyPrice" label="Buy Price (৳)" type="number" step="0.01" required />
                    <Input name="quantity" label="Quantity" type="number" required />
                  </div>
                  <Button type="submit" className="w-full py-3 mt-4" loading={isRecordingPurchase}>
                    Record Purchase
                  </Button>
                  <AnimatePresence>
                    {purchaseSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: [0.9, 1.05, 1],
                        }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-center gap-2 text-emerald-500 font-bold mt-4"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Purchase Recorded Successfully!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </Card>
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div 
              key="sales"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card title="New Sales Entry">
                <form onSubmit={handleAddSale} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select 
                      name="saleCategory" 
                      label="Filter by Category" 
                      value={selectedSaleCategory}
                      onChange={(e) => {
                        setSelectedSaleCategory(e.target.value);
                        setSelectedSaleProductId(''); // Reset product when category changes
                        setSalePrice(0);
                      }}
                      options={[
                        { value: 'all', label: 'All Categories' },
                        ...(activeBusiness?.categories || []).map(c => ({ value: c, label: c }))
                      ]}
                    />
                  </div>
                  <Select 
                    name="productId" 
                    label="Select Product" 
                    required
                    value={selectedSaleProductId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setSelectedSaleProductId(pid);
                    }}
                    options={[
                      { value: '', label: 'Choose a product...' },
                      ...products
                        .filter(p => selectedSaleCategory === 'all' || p.category === selectedSaleCategory)
                        .map(p => ({ value: p.id, label: `${p.name} (Stock: ${p.stock})` }))
                    ]}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      name="quantity" 
                      label="Quantity to Sell" 
                      type="number" 
                      required 
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(Number(e.target.value))}
                    />
                    <Input 
                      name="sellPrice" 
                      label="Selling Price (৳)" 
                      type="number" 
                      step="0.01" 
                      required 
                      value={salePrice || ''}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      name="paidAmount" 
                      label="Paid Amount (৳)" 
                      type="number" 
                      step="0.01" 
                      required 
                      value={salePaidAmount || ''}
                      onChange={(e) => setSalePaidAmount(Number(e.target.value))}
                    />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 ml-1">Due Amount (Auto)</label>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-zinc-100 font-bold">
                        ৳ {(salePrice * saleQuantity - salePaidAmount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                        <Barcode className="w-3 h-3 text-emerald-500" />
                        Quick Scan Engine
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,124,81,0.6)]" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                    <div className="flex gap-3 relative">
                      <div className="flex-1 relative">
                        <Input 
                          name="barcode"
                          placeholder="Scan or type ID..." 
                          className="w-full bg-white dark:bg-black/40" 
                          value={scannedBarcode} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setScannedBarcode(val);
                            const product = products.find(p => p.barcode === val);
                            if (product) {
                              setSelectedSaleProductId(product.id);
                              toast.success(`Product found: ${product.name}`);
                            }
                          }} 
                        />
                      </div>
                      <motion.button 
                        type="button" 
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowScanner('sale')} 
                        className="flex items-center justify-center p-4 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20 group/btn overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
                        <Camera className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
                      </motion.button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      name="customerName" 
                      label="Customer Name" 
                      placeholder="Customer name"
                      value={saleCustomerName}
                      onChange={(e) => setSaleCustomerName(e.target.value)}
                    />
                    <Input 
                      name="customerPhone" 
                      label="Phone Number" 
                      placeholder="Customer phone"
                      value={saleCustomerPhone}
                      onChange={(e) => setSaleCustomerPhone(e.target.value)}
                      status={!saleCustomerPhone ? undefined : (/^01[3-9]\d{8}$/.test(saleCustomerPhone) ? 'success' : 'error')}
                    />
                  </div>
                  <Button type="submit" className="w-full py-3 mt-4" loading={isRecordingSale}>
                    Record Sale
                  </Button>
                  <AnimatePresence>
                    {saleSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: [0.9, 1.05, 1],
                        }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-center gap-2 text-emerald-500 font-bold mt-4"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Sale Recorded Successfully!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </Card>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-6 mb-6">
                <div className="flex items-center justify-between px-1">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Stock Management</h2>
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Live Inventory Tracking</p>
                    </div>
                  </div>
                  <Button variant="brand" size="sm" onClick={() => setActiveTab('purchase')} className="rounded-2xl gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Purchase Stock</span>
                  </Button>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <SummaryCard 
                    label="Total Value"
                    value={`৳${totalInventoryValue.toLocaleString()}`}
                    icon={Package}
                    colorClass="blue"
                  />
                  <SummaryCard 
                    label="Low Stocks"
                    value={stats.lowStockCount.toString()}
                    icon={AlertCircle}
                    colorClass="red"
                  />
                </div>

                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative group">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      placeholder="Search by name, category or barcode..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-3xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm font-semibold"
                    />
                  </div>

                  {/* Categories Tabs */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Categories</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 gap-1 px-2 rounded-full hover:bg-emerald-500/10 text-emerald-600"
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                      >
                        <Plus className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase">Manage</span>
                      </Button>
                    </div>
                    
                    <AnimatePresence>
                      {isAddingCategory && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-[2rem] space-y-5 overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 shadow-inner mb-4"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Category Manager</h4>
                            <button 
                              type="button"
                              onClick={() => setIsAddingCategory(false)}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Current</label>
                            <div className="flex flex-wrap gap-2">
                              {(activeBusiness?.categories || []).length > 0 ? (
                                (activeBusiness?.categories || []).map((cat, index) => (
                                  <div 
                                    key={`${cat}-${index}`} 
                                    className="group flex items-center gap-2 bg-white dark:bg-zinc-900 pl-3 pr-1 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 transition-all shadow-sm max-w-full"
                                  >
                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">{cat}</span>
                                    <div className="flex items-center gap-1">
                                      <button 
                                        type="button"
                                        onClick={() => handleInitiateRenameCategory(cat)}
                                        className="p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 transition-colors rounded-lg shrink-0"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleInitiateDeleteCategory(cat)}
                                        className="p-1.5 text-rose-500 bg-rose-50 dark:bg-rose-500/10 transition-colors rounded-lg shrink-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-zinc-500 italic ml-1">No categories added</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <div className="flex gap-2">
                              <Input 
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                                placeholder="New Category Name"
                                className="flex-1"
                              />
                              <Button 
                                type="button" 
                                onClick={handleAddCategory} 
                                className="bg-emerald-600 h-[52px]"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar snap-x">
                      <button
                        onClick={() => setSearchCategory('all')}
                        className={cn(
                          "flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all snap-start shadow-sm",
                          searchCategory === 'all' 
                            ? "bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-105" 
                            : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-emerald-500/30"
                        )}
                      >
                        <LayoutGrid className="w-4 h-4 shrink-0" />
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">All Stock</p>
                          <p className="text-[8px] opacity-70 font-black truncate">৳{totalInventoryValue.toLocaleString()}</p>
                        </div>
                      </button>

                      {Object.entries(categoryStats).map(([cat, stat]) => (
                        <button
                          key={cat}
                          onClick={() => setSearchCategory(cat)}
                          className={cn(
                            "flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all snap-start shadow-sm",
                            searchCategory === cat 
                              ? "bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-105" 
                              : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-emerald-500/30"
                          )}
                        >
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 truncate max-w-[100px]">{cat}</p>
                            <p className="text-[8px] opacity-70 font-black">৳{stat.value.toLocaleString()}</p>
                          </div>
                          <span className={cn(
                            "text-[9px] font-black px-1.5 py-0.5 rounded-lg shrink-0",
                            searchCategory === cat ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-zinc-800"
                          )}>
                            {stat.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                        <Filter className="w-4 h-4" />
                      </div>
                      <select
                        value={searchStockStatus}
                        onChange={(e) => setSearchStockStatus(e.target.value as any)}
                        className="w-full bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="all">Display All Products</option>
                        <option value="in-stock">In Stock Items</option>
                        <option value="low-stock">Low Stock (Alerts)</option>
                        <option value="out-of-stock">Out of Stock (Zero)</option>
                      </select>
                      <ChevronRight className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {filteredProducts.map(p => (
                  <Card key={p.id} className="p-0 border-2 border-zinc-200 dark:border-zinc-800/80 overflow-hidden group hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-none transition-all duration-300">
                    {editingProduct?.id === p.id ? (
                      <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400">Edit Product</h4>
                          <button type="button" onClick={() => setEditingProduct(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <Select 
                            name="category" 
                            label="Category"
                            value={selectedEditCategory}
                            required
                            options={[
                              { value: '', label: 'Select Category' },
                              ...(activeBusiness?.categories || []).map(c => ({ value: c, label: c })),
                            ]}
                            onChange={(e) => setSelectedEditCategory(e.target.value)}
                          />
                          <Input name="name" label="Product Name" defaultValue={p.name} required />
                          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Barcode Configuration</label>
                            <div className="flex gap-2">
                              <Input name="barcode" placeholder="Barcode ID" defaultValue={p.barcode || ''} className="flex-1 bg-white dark:bg-black/30" />
                              <Button type="button" variant="secondary" className="px-3" onClick={() => {
                                setEditingProduct({...p}); // Ensure state is tracked if needed, though this might need more logic if scanned
                                setShowScanner('purchase'); // Reuse purchase logic or similar
                              }}>
                                <Camera className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <Input name="buyPrice" label="Buy Price (৳)" type="number" step="0.01" defaultValue={p.buyPrice} required />
                            <Input name="stock" label="Stock Level" type="number" defaultValue={p.stock} required />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button type="submit" className="flex-1">Save Changes</Button>
                          <Button type="button" variant="secondary" onClick={() => setEditingProduct(null)}>Cancel</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex overflow-hidden">
                        <div className="w-2 relative bg-zinc-100 dark:bg-zinc-800 transition-colors group-hover:bg-brand-500" />
                        <div className="flex-1 p-5">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <h3 className="font-black text-lg tracking-tight text-zinc-900 dark:text-zinc-100">{p.name}</h3>
                                {p.stock <= (p.lowStockThreshold || 2) && (
                                  <span className="bg-rose-500/10 text-rose-600 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">Low</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mb-4">
                                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest">
                                  {p.category || 'Standard'}
                                </span>
                                {p.barcode && (
                                  <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                                    <Barcode className="w-3 h-3" />
                                    {p.barcode}
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-1">Buy Price</p>
                                  <p className="font-black text-xl text-zinc-900 dark:text-zinc-100 tracking-tighter">৳{p.buyPrice.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-1">Total Value</p>
                                  <p className="font-black text-xl text-emerald-600 tracking-tighter">৳{(p.stock * p.buyPrice).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                 <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-1">Current Stock</p>
                                 <div className="flex items-end gap-1.5">
                                    <p className={cn(
                                      "font-black text-xl tracking-tighter",
                                      p.stock <= (p.lowStockThreshold || 2) ? "text-rose-600" : "text-emerald-600"
                                    )}>
                                      {p.stock}
                                    </p>
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase mb-1">units</span>
                                 </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <button 
                                onClick={() => setEditingProduct(p)} 
                                className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/30"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleInitiateDeleteProduct(p)} 
                                className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/30"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
                {filteredProducts.length === 0 && <p className="text-center text-zinc-500 py-12 italic">No products found</p>}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6 pb-24"
            >
              {/* Profile Hero section */}
              <div className="relative group">
                <div className="absolute inset-x-0 -top-10 -bottom-10 bg-emerald-500 blur-[120px] opacity-20 rounded-full scale-50" />
                <div className="relative overflow-hidden rounded-[3rem] bg-emerald-600 text-white p-8 border border-white/10 shadow-2xl">
                  <div className="absolute top-0 right-0 h-full w-48 bg-white/5 -skew-x-12 translate-x-12" />
                  
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="h-28 w-28 overflow-hidden rounded-[2.5rem] border-2 border-white/20 bg-white/10 shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/10">
                            <User className="h-10 w-10 text-white/60" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 rounded-xl bg-white p-2 text-emerald-600 shadow-lg ring-4 ring-emerald-600">
                        <Check className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <h2 className="text-3xl font-black tracking-tighter mb-1 text-white">{user.displayName || 'Business Owner'}</h2>
                    <p className="text-emerald-100/60 font-bold uppercase tracking-widest text-[10px] select-none">{user.email}</p>
                    
                    <div className="mt-8">
                      <Button onClick={handleLogout} variant="ghost" className="text-white hover:bg-white/10 rounded-2xl group border border-white/10 px-8">
                        <LogOut className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Logout Session
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[2.5rem] bg-white dark:bg-zinc-900 p-6 border-2 border-emerald-500/20 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full transition-transform group-hover:scale-120" />
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 relative z-10 font-black">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter relative z-10">{businesses.length}</p>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest relative z-10">Holdings</p>
                </div>
                <div className="rounded-[2.5rem] bg-white dark:bg-zinc-900 p-6 border-2 border-blue-500/20 shadow-sm relative overflow-hidden group hover:border-blue-500 transition-all">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full transition-transform group-hover:scale-120" />
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 relative z-10 font-black">
                    <Package className="h-4 w-4" />
                  </div>
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter relative z-10">{products.length}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest relative z-10">Stock Units</p>
                </div>
              </div>

              {/* Preferences Section */}
              <div className="space-y-4">
                <h3 className="px-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Preferences</h3>
                <div className="grid grid-cols-1 gap-3">
                  <Card className="p-4 hover:border-zinc-500/20 transition-all cursor-pointer group" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black flex items-center justify-center transition-transform group-hover:scale-110">
                          {theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-black tracking-tight text-zinc-900 dark:text-zinc-100">Appearance</h4>
                          <p className="text-xs text-zinc-400 capitalize whitespace-nowrap">{theme} mode active</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors duration-300",
                        theme === 'dark' ? "bg-emerald-500/20" : "bg-emerald-500/10"
                      )}>
                        <motion.div
                          animate={{ x: theme === 'dark' ? 24 : 0 }}
                          className="w-4 h-4 bg-emerald-600 rounded-full shadow-sm"
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Analytics Section */}
              <div className="space-y-4">
                <h3 className="px-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Analytics</h3>
                <Card className="p-4 hover:border-blue-500/20 transition-all cursor-pointer group" onClick={() => setShowBusinessReport(true)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-transform group-hover:scale-110">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black tracking-tight text-zinc-900 dark:text-zinc-100">Enterprise Analytics</h4>
                        <p className="text-xs text-zinc-400">Deep insights into performance</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </div>


              {/* Developer Info & Support */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="px-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Support & Development</h3>
                  <div className="flex flex-wrap justify-center gap-4 px-2">
                    {[
                      { 
                        icon: Github, 
                        href: "https://github.com/currentvai", 
                        label: "GitHub",
                        bg: "from-zinc-800 to-zinc-950 border-zinc-700/50",
                        textColor: "text-white",
                        iconBg: "bg-white/10",
                        glow: "group-hover:shadow-zinc-500/20"
                      },
                      { 
                        icon: Mail, 
                        href: "mailto:currentvai@gmail.com", 
                        label: "Email",
                        bg: "from-blue-500 to-blue-700 border-blue-400/50",
                        textColor: "text-white",
                        iconBg: "bg-blue-400/30",
                        glow: "group-hover:shadow-blue-500/30"
                      },
                      { 
                        icon: Send, 
                        href: "https://t.me/@currentvai", 
                        label: "Telegram",
                        bg: "from-sky-400 to-sky-600 border-sky-300/50",
                        textColor: "text-white",
                        iconBg: "bg-sky-300/30",
                        glow: "group-hover:shadow-sky-400/30"
                      },
                      { 
                        icon: Facebook, 
                        href: "https://www.facebook.com/cv.hasan.3", 
                        label: "Facebook",
                        bg: "from-indigo-500 to-indigo-700 border-indigo-400/50",
                        textColor: "text-white",
                        iconBg: "bg-indigo-400/30",
                        glow: "group-hover:shadow-indigo-500/30"
                      }
                    ].map((link, i) => (
                      <div key={i} className="relative">
                        <motion.button 
                          onClick={() => {
                            setRedirectingTo(link.label);
                            setTimeout(() => {
                              window.open(link.href, "_blank", "noopener,noreferrer");
                              setRedirectingTo(null);
                            }, 800);
                          }}
                          whileTap={{ scale: 0.9 }}
                          className={cn(
                            "group relative flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all shadow-lg bg-gradient-to-br",
                            link.bg,
                            link.textColor,
                            link.glow,
                            redirectingTo === link.label && "ring-4 ring-white/20 animate-pulse"
                          )}
                        >
                          {redirectingTo === link.label ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <link.icon className="w-5 h-5" />
                          )}
                        </motion.button>
                        <AnimatePresence>
                          {redirectingTo === link.label && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-900 text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded text-white pointer-events-none z-10"
                            >
                              Redirecting...
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center pt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2 underline underline-offset-4 decoration-emerald-500/30">Milon One Business Tracker v1.5</p>
                  <div className="flex items-center justify-center gap-1 opacity-20 hover:opacity-100 transition-opacity">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tight">Sync Status: Active</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Minimalist Floating Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-8 pointer-events-none z-50">
        <div className="bg-gradient-to-br from-indigo-950/95 to-slate-900/95 dark:from-[#03081e]/95 dark:to-[#010905]/95 backdrop-blur-3xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl shadow-blue-500/20 dark:shadow-emerald-500/20 border-2 border-blue-500/40 dark:border-emerald-500/40 ring-2 ring-emerald-500/20 dark:ring-blue-500/20 pointer-events-auto text-white">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Home', color: 'text-blue-500' },
            { id: 'purchase', icon: PlusCircle, label: 'Buy', color: 'text-rose-500' },
            { id: 'sales', icon: ShoppingCart, label: 'Sell', color: 'text-emerald-500' },
            { id: 'inventory', icon: Package, label: 'Stock', color: 'text-emerald-600' },
            { id: 'profile', icon: User, label: 'User', color: 'text-blue-500' }
          ].map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
                audio.volume = 0.1;
                audio.play().catch(() => {});
                setActiveTab(item.id as any);
              }}
              className={cn(
                "relative group flex flex-col items-center py-2 flex-1 outline-none transition-all",
                activeTab === item.id ? "scale-110" : "opacity-60 hover:opacity-100"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300",
                activeTab === item.id 
                  ? "bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/20 scale-110 border border-white/20" 
                  : "bg-transparent"
              )}>
                <item.icon className={cn(
                  "w-6 h-6 transition-all",
                  activeTab === item.id ? "text-white" : "text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-emerald-600"
                )} />
              </div>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeDot"
                  className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                />
              )}
            </motion.button>
          ))}
        </div>
      </nav>
    </div>

    <MathDeleteModal 
      isOpen={!!categoryToDelete}
      onClose={() => setCategoryToDelete(null)}
      onConfirm={handleDeleteCategory}
      title="Delete Category?"
      message={<>Are you sure you want to delete: <span className="font-bold text-zinc-900 dark:text-zinc-100 break-all">"{categoryToDelete}"</span>?</>}
    />

    <MathDeleteModal 
      isOpen={!!productToDelete}
      onClose={() => setProductToDelete(null)}
      onConfirm={handleDeleteProduct}
      title="Delete Product?"
      message={<>Are you sure you want to delete <span className="font-bold text-zinc-900 dark:text-zinc-100">"{productToDelete?.name}"</span>? This action cannot be undone.</>}
    />

    {showScanner && (
        <BarcodeScanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(null)} 
        />
      )}

      <MathDeleteModal 
        isOpen={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        onConfirm={handleDeleteAllTransactions}
        loading={isDeletingAll}
        title="Clear All History?"
        message={<>Are you sure you want to delete <span className="font-bold text-rose-600">{transactions.length}</span> transactions? This will revert all stock levels and cannot be undone.</>}
      />

      <MathDeleteModal 
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={handleDeleteTransaction}
        title="Delete Transaction?"
        message={<>This will permanently delete the transaction for <span className="font-bold text-zinc-900 dark:text-zinc-100">{transactionToDelete?.productName}</span> and revert the stock.</>}
      />

      {/* Refund Entry Form Modal */}
      <AnimatePresence>
        {transactionToRefund && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Refund Entry</h3>
                <button onClick={() => setTransactionToRefund(null)} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Product</p>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{transactionToRefund.productName}</p>
                  <p className="text-xs text-zinc-400 mt-1">Original Quantity: {transactionToRefund.quantity}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Refund Quantity</label>
                  <input 
                    type="number"
                    min="1"
                    max={transactionToRefund.quantity}
                    value={refundQuantity}
                    onChange={(e) => setRefundQuantity(Number(e.target.value))}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Reason (Optional)</label>
                  <textarea 
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Damaged item, Customer changed mind"
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 min-h-[100px] resize-none"
                  />
                </div>

                <button 
                  onClick={handleRefundTransaction}
                  className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-lg hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <RotateCcw className="w-5 h-5" />
                  Process Refund
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Category Rename Modal */}
      <AnimatePresence>
        {categoryToRename && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[320px] bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-5 space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Edit2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Rename Category</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Renaming <span className="font-bold text-zinc-900 dark:text-zinc-100">"{categoryToRename}"</span> will also update all products in this category.
                  </p>
                </div>

                <div className="space-y-3">
                  <Input 
                    value={renamedCategoryName}
                    onChange={(e) => setRenamedCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRenameCategory())}
                    placeholder="Enter new name..."
                    autoFocus
                    className="text-center font-medium"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setCategoryToRename(null);
                      setRenamedCategoryName('');
                    }}
                    size="lg"
                    className="flex-1 h-14"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRenameCategory}
                    disabled={!renamedCategoryName.trim() || renamedCategoryName.trim() === categoryToRename}
                    size="lg"
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500"
                  >
                    Rename
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Business Report Modal */}
      <AnimatePresence>
        {showBusinessReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Milon One Analytics</h3>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Insights & Performance</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBusinessReport(false)}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {businessReportData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
                    
                    {/* 1. Sales Overview */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Sales Overview (Last 7 Days)
                      </h4>
                      <div className="h-[250px] w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={businessReportData.salesTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 2. Product Wise Sales */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Top Selling Products
                      </h4>
                      <div className="h-[250px] w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={businessReportData.productSales}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {businessReportData.productSales.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 3. Profit Chart */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Profit Trend
                      </h4>
                      <div className="h-[250px] w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={businessReportData.profitTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="profit" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 4. Due vs Paid */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Paid vs Due (Total)
                      </h4>
                      <div className="h-[250px] w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={businessReportData.dueVsPaid}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 5. Return / Refund */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-zinc-500" />
                        Refunds / Returns
                      </h4>
                      <div className="h-[250px] w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={businessReportData.refundData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <Tooltip />
                            <Bar dataKey="amount" fill="#71717a" radius={[10, 10, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 6. Top Customers */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Top Customers (VIP)
                      </h4>
                      <div className="h-[250px] w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={businessReportData.topCustomers}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={80} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 10, 10, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 7. Stock Levels */}
                    <div className="space-y-4 md:col-span-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Low Stock Alert (Restock Needed)
                      </h4>
                      <div className="h-[250px] w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={businessReportData.stockLevels}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <Tooltip />
                            <Bar dataKey="stock" fill="#f97316" radius={[10, 10, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="w-10 h-10 text-zinc-300" />
                    </div>
                    <p className="text-zinc-500 font-medium">No data available for reports yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
