import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  LayoutDashboard, 
  History, 
  PieChart, 
  Settings, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ChevronRight,
  Search,
  Filter,
  AlertCircle,
  Utensils,
  Car,
  Activity,
  Zap,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';
import { supabase } from './lib/supabase';

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
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleSupabaseError(error: any, operationType: OperationType, path: string | null, setMissingTables?: (updater: (prev: string[]) => string[]) => void) {
  const errInfo: any = {
    error: error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)),
    operationType,
    path,
    details: error?.details,
    hint: error?.hint,
    code: error?.code
  };
  
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    console.error(`Table "${path}" does not exist in Supabase. This is why you are seeing errors. Please run the SQL setup script in your Supabase dashboard.`);
    if (setMissingTables && path) {
      setMissingTables(prev => prev.includes(path) ? prev : [...prev, path]);
    }
  }
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
import { GlassCard } from './components/GlassCard';
import type { Expense, Category, SubCategory, MonthlyBudget } from './types/database';

// Mock Data for initial development if Supabase is not connected
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Food & Grocery', icon: 'Utensils', color: '#FF6B6B', user_id: null, created_at: '' },
  { id: '2', name: 'Transport', icon: 'Car', color: '#4D96FF', user_id: null, created_at: '' },
  { id: '3', name: 'Health', icon: 'Activity', color: '#6BCB77', user_id: null, created_at: '' },
  { id: '4', name: 'Utilities', icon: 'Zap', color: '#FFD93D', user_id: null, created_at: '' },
  { id: '5', name: 'Entertainment', icon: 'Gamepad', color: '#A06EE1', user_id: null, created_at: '' },
];

const DEFAULT_SUB_CATEGORIES: SubCategory[] = [
  { id: 's1', category_id: '1', name: 'Grocery', user_id: null, created_at: '' },
  { id: 's2', category_id: '1', name: 'Fish', user_id: null, created_at: '' },
  { id: 's3', category_id: '1', name: 'Chicken', user_id: null, created_at: '' },
  { id: 's4', category_id: '1', name: 'Mutton', user_id: null, created_at: '' },
  { id: 's5', category_id: '1', name: 'Milk', user_id: null, created_at: '' },
  { id: 's6', category_id: '2', name: 'Cab', user_id: null, created_at: '' },
  { id: 's7', category_id: '2', name: 'Auto', user_id: null, created_at: '' },
  { id: 's8', category_id: '2', name: 'Taxi', user_id: null, created_at: '' },
  { id: 's9', category_id: '3', name: 'Medicines', user_id: null, created_at: '' },
  { id: 's10', category_id: '4', name: 'Water', user_id: null, created_at: '' },
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<MonthlyBudget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [subCategories, setSubCategories] = useState<SubCategory[]>(DEFAULT_SUB_CATEGORIES);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'reports' | 'settings'>('dashboard');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'Utensils', color: '#6366f1' });
  const [newSubCategory, setNewSubCategory] = useState({ name: '', category_id: '' });
  const [isAddingSubCategory, setIsAddingSubCategory] = useState(false);
  const [missingTables, setMissingTables] = useState<string[]>([]);

  // Form State
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category_id: '',
    sub_category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  const displayName = useMemo(() => {
    if (!user) return '';
    if (user.id === 'demo-user') return 'Demo User';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  }, [user]);

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const iconProps = { className: "w-6 h-6" };
    
    switch (category?.icon) {
      case 'Utensils': return <Utensils {...iconProps} style={{ color: category.color }} />;
      case 'Car': return <Car {...iconProps} style={{ color: category.color }} />;
      case 'Activity': return <Activity {...iconProps} style={{ color: category.color }} />;
      case 'Zap': return <Zap {...iconProps} style={{ color: category.color }} />;
      default: return <ChevronRight {...iconProps} />;
    }
  };

  const getCategoryBg = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? `${category.color}15` : '#f8fafc'; // 15 is ~8% opacity in hex
  };

  useEffect(() => {
    const url = (import.meta as any).env.VITE_SUPABASE_URL;
    const key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes('your-project') || key.includes('your-anon-key')) {
      setIsConfigured(false);
    }
  }, []);

  useEffect(() => {
    // Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setMonthlyBudget(null);
        setExpenses([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          // Create initial budget for current month
          const currentMonth = format(new Date(), 'yyyy-MM');
          const initialBudget: MonthlyBudget = {
            id: crypto.randomUUID(),
            user_id: data.user.id,
            month: currentMonth,
            budget_amount: 10000,
            carry_forward_amount: 0,
            total_available: 10000
          };
          await supabase.from('monthly_budgets').insert([initialBudget]);
          setMonthlyBudget(initialBudget);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMonthlyBudget(null);
  };

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching data for user:', userId);
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      // Fetch Budget
      try {
        const { data: budgetData, error: budgetError } = await supabase
          .from('monthly_budgets')
          .select('*')
          .eq('user_id', userId)
          .eq('month', currentMonth)
          .single();

        if (budgetError && budgetError.code !== 'PGRST116') {
          handleSupabaseError(budgetError, OperationType.GET, 'monthly_budgets', setMissingTables);
        } else if (budgetData) {
          setMonthlyBudget(budgetData);
        } else if (!budgetError) {
          // Create budget for current month if it doesn't exist
          const newBudget: MonthlyBudget = {
            id: crypto.randomUUID(),
            user_id: userId,
            month: currentMonth,
            budget_amount: 10000,
            carry_forward_amount: 0,
            total_available: 10000
          };
          await supabase.from('monthly_budgets').insert([newBudget]);
          setMonthlyBudget(newBudget);
        }
      } catch (e) {
        handleSupabaseError(e, OperationType.GET, 'monthly_budgets', setMissingTables);
      }

      // Fetch Expenses
      try {
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        
        if (expenseError) {
          handleSupabaseError(expenseError, OperationType.GET, 'expenses', setMissingTables);
        } else if (expenseData) {
          setExpenses(expenseData);
        }
      } catch (e) {
        handleSupabaseError(e, OperationType.GET, 'expenses', setMissingTables);
      }

      // Fetch Categories
      try {
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .or(`user_id.eq.${userId},user_id.is.null`);
        
        if (categoryError) {
          handleSupabaseError(categoryError, OperationType.GET, 'categories', setMissingTables);
        } else if (categoryData && categoryData.length > 0) {
          setCategories(categoryData);
        }
      } catch (e) {
        handleSupabaseError(e, OperationType.GET, 'categories', setMissingTables);
      }

      // Fetch Sub-Categories
      try {
        const { data: subCategoryData, error: subCategoryError } = await supabase
          .from('sub_categories')
          .select('*')
          .or(`user_id.eq.${userId},user_id.is.null`);
        
        if (subCategoryError) {
          handleSupabaseError(subCategoryError, OperationType.GET, 'sub_categories', setMissingTables);
        } else if (subCategoryData && subCategoryData.length > 0) {
          setSubCategories(subCategoryData);
        }
      } catch (e) {
        handleSupabaseError(e, OperationType.GET, 'sub_categories', setMissingTables);
      }
    } catch (e) {
      handleSupabaseError(e, OperationType.GET, 'user_data', setMissingTables);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.id === 'demo-user') {
      alert('Please sign in to save your expenses.');
      return;
    }

    const { id, ...expenseData } = {
      id: crypto.randomUUID(),
      user_id: user.id,
      amount: parseFloat(newExpense.amount),
      category_id: newExpense.category_id,
      sub_category: newExpense.sub_category || null,
      description: newExpense.description,
      date: newExpense.date,
      created_at: new Date().toISOString()
    };

    const expense = { id, ...expenseData } as Expense;

    setExpenses([expense, ...expenses]);
    setIsAddingExpense(false);
    setNewExpense({
      amount: '',
      category_id: '',
      sub_category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });

    // Try to persist to Supabase
    try {
      console.log('Inserting expense:', expenseData);
      const { error } = await supabase.from('expenses').insert([expenseData]);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, 'expenses');
      // Rollback local state on error
      setExpenses(expenses);
      alert('Failed to save expense. Please check your connection or permissions.');
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !user) return;

    const updatedExpense = {
      ...editingExpense,
      amount: parseFloat(newExpense.amount),
      category_id: newExpense.category_id,
      sub_category: newExpense.sub_category || null,
      description: newExpense.description,
      date: newExpense.date
    };

    const originalExpenses = [...expenses];
    setExpenses(expenses.map(exp => exp.id === editingExpense.id ? updatedExpense : exp));
    setEditingExpense(null);
    setIsAddingExpense(false);
    setNewExpense({
      amount: '',
      category_id: '',
      sub_category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          amount: updatedExpense.amount,
          category_id: updatedExpense.category_id,
          sub_category: updatedExpense.sub_category,
          description: updatedExpense.description,
          date: updatedExpense.date
        })
        .eq('id', editingExpense.id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, 'expenses');
      setExpenses(originalExpenses);
      alert('Failed to update expense.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const originalExpenses = [...expenses];
    setExpenses(expenses.filter(exp => exp.id !== id));

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, 'expenses');
      setExpenses(originalExpenses);
      alert('Failed to delete expense.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const categoryData = {
      id: crypto.randomUUID(),
      name: newCategory.name,
      icon: newCategory.icon,
      color: newCategory.color,
      user_id: user.id,
      created_at: new Date().toISOString()
    };

    setCategories([...categories, categoryData as Category]);
    setIsAddingCategory(false);
    setNewCategory({ name: '', icon: 'Utensils', color: '#6366f1' });

    try {
      const { error } = await supabase.from('categories').insert([categoryData]);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, 'categories');
      setCategories(categories);
      alert('Failed to add category.');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !user) return;

    const updatedCategory = {
      ...editingCategory,
      name: newCategory.name,
      icon: newCategory.icon,
      color: newCategory.color
    };

    const originalCategories = [...categories];
    setCategories(categories.map(cat => cat.id === editingCategory.id ? updatedCategory : cat));
    setEditingCategory(null);
    setIsAddingCategory(false);
    setNewCategory({ name: '', icon: 'Utensils', color: '#6366f1' });

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: updatedCategory.name,
          icon: updatedCategory.icon,
          color: updatedCategory.color
        })
        .eq('id', editingCategory.id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, 'categories');
      setCategories(originalCategories);
      alert('Failed to update category.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? All associated expenses will remain but may lose their category link.')) return;

    const originalCategories = [...categories];
    setCategories(categories.filter(cat => cat.id !== id));

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, 'categories');
      setCategories(originalCategories);
      alert('Failed to delete category.');
    }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const subCategoryData = {
      id: crypto.randomUUID(),
      category_id: newSubCategory.category_id,
      name: newSubCategory.name,
      user_id: user.id,
      created_at: new Date().toISOString()
    };

    setSubCategories([...subCategories, subCategoryData as SubCategory]);
    setIsAddingSubCategory(false);
    setNewSubCategory({ name: '', category_id: '' });

    try {
      const { error } = await supabase.from('sub_categories').insert([subCategoryData]);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, 'sub_categories', setMissingTables);
      setSubCategories(subCategories);
      alert('Failed to add sub-category.');
    }
  };

  const handleDeleteSubCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sub-category?')) return;

    const originalSubCategories = [...subCategories];
    setSubCategories(subCategories.filter(sc => sc.id !== id));

    try {
      const { error } = await supabase.from('sub_categories').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, 'sub_categories', setMissingTables);
      setSubCategories(originalSubCategories);
      alert('Failed to delete sub-category.');
    }
  };

  const currentMonthExpenses = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return expenses.filter(exp => isWithinInterval(parseISO(exp.date), { start, end }));
  }, [expenses]);

  const totalSpent = useMemo(() => 
    currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  , [currentMonthExpenses]);

  const budget = monthlyBudget?.budget_amount || 10000;
  const carryForward = monthlyBudget?.carry_forward_amount || 0;
  const totalAvailable = monthlyBudget?.total_available || (budget + carryForward);
  const remaining = totalAvailable - totalSpent;

  const chartData = useMemo(() => {
    const data = categories.map(cat => {
      const spent = currentMonthExpenses
        .filter(exp => exp.category_id === cat.id)
        .reduce((sum, exp) => sum + exp.amount, 0);
      return { name: cat.name, value: spent, color: cat.color };
    }).filter(d => d.value > 0);
    return data;
  }, [currentMonthExpenses, categories]);

  const loginDemo = async () => {
    // Simple mock login for demo
    setUser({ id: 'demo-user', email: 'demo@example.com' });
    setMonthlyBudget({
      id: 'demo-user',
      user_id: 'demo-user',
      month: format(new Date(), 'yyyy-MM'),
      budget_amount: 10000,
      carry_forward_amount: 1200,
      total_available: 11200
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-orange-600 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <GlassCard className="text-center space-y-8 py-12 border-none shadow-2xl">
            <div className="space-y-2">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-orange-600" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">SpendWise</h1>
              <p className="text-slate-500">Manage your finances with ease</p>
            </div>
            
            {!isConfigured && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-sm">
                <p className="font-bold mb-1">Supabase Not Configured</p>
                <p className="opacity-80">Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.</p>
                <button 
                  onClick={loginDemo}
                  className="mt-3 text-xs font-bold underline"
                >
                  Try Demo Mode Instead
                </button>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="••••••••"
                  required
                />
              </div>
              {authError && <p className="text-red-500 text-xs ml-2">{authError}</p>}
              <button 
                type="submit"
                className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-700 transition-colors"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="space-y-4">
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-slate-400 text-sm hover:text-orange-600 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFDFF] text-slate-800 font-sans pb-24 md:pb-0 md:pl-64">
      {/* Sidebar / Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-lg border-t border-slate-200 flex items-center justify-around px-4 z-50 md:top-0 md:bottom-0 md:left-0 md:w-64 md:h-full md:flex-col md:border-t-0 md:border-r md:px-4 md:py-8">
        <div className="hidden md:flex items-center gap-3 w-full px-4 mb-12">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Wallet className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">SpendWise</span>
        </div>
        
        <div className="flex w-full justify-around md:flex-col md:gap-2 md:justify-start">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="Transactions" />
          <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<PieChart />} label="Reports" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings />} label="Settings" />
        </div>

        <div className="hidden md:flex flex-1" />
        
        <button onClick={logout} className="hidden md:flex items-center gap-4 w-full p-4 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all group mt-auto">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-sm font-bold text-slate-700 truncate w-full">{displayName}</span>
            <span className="text-[10px] text-slate-400">Sign Out</span>
          </div>
        </button>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4" />
              Welcome back, {displayName}
            </h2>
            <h1 className="text-3xl font-bold text-slate-900">Monthly Overview</h1>
          </div>
          <button 
            onClick={() => setIsAddingExpense(true)}
            className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 hover:scale-110 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </header>

        <AnimatePresence>
          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="bg-orange-500 text-white border-none shadow-lg shadow-orange-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">Budget</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/70 text-sm">Available Balance</p>
                    <h3 className="text-3xl font-bold">₹{totalAvailable.toLocaleString()}</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs">
                    <span>Base: ₹{budget}</span>
                    <span>Carried: ₹{carryForward}</span>
                  </div>
                </GlassCard>

                <GlassCard className="bg-white border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-100 rounded-xl text-red-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400">Spent</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 text-sm">Total Expenses</p>
                    <h3 className="text-3xl font-bold text-slate-900">₹{totalSpent.toLocaleString()}</h3>
                  </div>
                  <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-600 transition-all duration-500" 
                      style={{ width: `${Math.min((totalSpent / totalAvailable) * 100, 100)}%` }}
                    />
                  </div>
                </GlassCard>

                <GlassCard className="bg-white border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400">Saving</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 text-sm">Remaining</p>
                    <h3 className={`text-3xl font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{remaining.toLocaleString()}
                    </h3>
                  </div>
                  <p className="mt-4 text-xs text-slate-400">
                    {remaining >= 0 ? 'On track to save this month' : 'Over budget by ₹' + Math.abs(remaining)}
                  </p>
                </GlassCard>
              </div>

              {/* Recent Activity */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Recent Transactions</h3>
                  <button onClick={() => setActiveTab('history')} className="text-sm font-bold text-orange-600">View All</button>
                </div>
                <div className="space-y-3">
                  {expenses.slice(0, 5).map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-orange-200 transition-all hover:shadow-md group">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                          style={{ backgroundColor: getCategoryBg(exp.category_id) }}
                        >
                          {getCategoryIcon(exp.category_id)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{exp.description || exp.sub_category || 'Expense'}</p>
                          <p className="text-xs text-slate-400">{format(parseISO(exp.date), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-slate-900">₹{exp.amount.toLocaleString()}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingExpense(exp);
                              setNewExpense({
                                amount: exp.amount.toString(),
                                category_id: exp.category_id,
                                sub_category: exp.sub_category || '',
                                description: exp.description || '',
                                date: exp.date
                              });
                              setIsAddingExpense(true);
                            }}
                            className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <h3 className="font-bold text-slate-900">Spending Analysis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="bg-white border-slate-100">
                  <h4 className="text-sm font-bold text-slate-400 mb-6">Category Distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={chartData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {chartData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="bg-white border-slate-100">
                  <h4 className="text-sm font-bold text-slate-400 mb-6">Monthly Trend</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Jan', amount: 8500 },
                        { name: 'Feb', amount: 9200 },
                        { name: 'Mar', amount: totalSpent },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="amount" fill="#f97316" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-bold text-slate-900">Transaction History</h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-orange-600">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-xs uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-500">{format(parseISO(exp.date), 'MMM dd')}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-orange-50 text-orange-600">
                            {categories.find(c => c.id === exp.category_id)?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {exp.description || exp.sub_category || '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">₹{exp.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingExpense(exp);
                                setNewExpense({
                                  amount: exp.amount,
                                  category_id: exp.category_id,
                                  sub_category: exp.sub_category || '',
                                  description: exp.description || '',
                                  date: exp.date.split('T')[0]
                                });
                                setIsAddingExpense(true);
                              }}
                              className="p-1 text-slate-400 hover:text-orange-600"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {missingTables.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold text-red-900">Database Setup Required</p>
                    <p className="text-sm text-red-700 mb-2">
                      The following tables are missing: {missingTables.join(', ')}. 
                      Please run the SQL setup script in your Supabase dashboard to enable all features.
                    </p>
                    <code className="block p-3 bg-red-100 rounded-xl text-xs text-red-900 overflow-x-auto">
                      {`CREATE TABLE categories (...); -- See console for full SQL`}
                    </code>
                  </div>
                </div>
              )}
              <GlassCard className="bg-white border-slate-100">
                <h3 className="font-bold text-slate-900 mb-6">Budget Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Monthly Budget (₹)</label>
                    <input 
                      type="number" 
                      value={monthlyBudget?.budget_amount}
                      onChange={(e) => setMonthlyBudget(p => p ? { ...p, budget_amount: parseInt(e.target.value) } : null)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div>
                      <p className="font-bold text-emerald-900">Carry Forward Savings</p>
                      <p className="text-xs text-emerald-700">Automatically add last month's savings to this month</p>
                    </div>
                    <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </GlassCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="bg-white border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900">Categories</h3>
                    <button 
                      onClick={() => {
                        setNewCategory({ name: '', icon: 'Utensils', color: '#f97316' });
                        setIsAddingCategory(true);
                      }}
                      className="text-orange-600 hover:scale-110 transition-transform"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                            {cat.icon === 'Utensils' && <Utensils className="w-4 h-4" style={{ color: cat.color }} />}
                            {cat.icon === 'Car' && <Car className="w-4 h-4" style={{ color: cat.color }} />}
                            {cat.icon === 'Activity' && <Activity className="w-4 h-4" style={{ color: cat.color }} />}
                            {cat.icon === 'Zap' && <Zap className="w-4 h-4" style={{ color: cat.color }} />}
                          </div>
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingCategory(cat);
                              setNewCategory({ name: cat.name, icon: cat.icon || 'Utensils', color: cat.color || '#f97316' });
                              setIsAddingCategory(true);
                            }}
                            className="p-1 text-slate-400 hover:text-orange-600"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          {cat.user_id && (
                            <button 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="bg-white border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900">Sub-Categories</h3>
                    <button 
                      onClick={() => {
                        setNewSubCategory({ name: '', category_id: '' });
                        setIsAddingSubCategory(true);
                      }}
                      className="text-orange-600 hover:scale-110 transition-transform"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {categories.map(cat => {
                      const catSubs = subCategories.filter(sc => sc.category_id === cat.id);
                      if (catSubs.length === 0 && !cat.user_id) return null;
                      return (
                        <div key={cat.id} className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cat.name}</p>
                          <div className="flex flex-wrap gap-2">
                            {catSubs.map(sc => (
                              <div key={sc.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg group">
                                <span className="text-xs font-medium">{sc.name}</span>
                                {sc.user_id && (
                                  <button 
                                    onClick={() => handleDeleteSubCategory(sc.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                                  >
                                    <LogOut className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {catSubs.length === 0 && <p className="text-xs text-slate-300 italic">No sub-categories</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                <GlassCard className="bg-white border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-6">Account</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.email}</p>
                        <p className="text-xs text-slate-400">Member since {format(new Date(), 'yyyy')}</p>
                      </div>
                    </div>
                    <button onClick={logout} className="w-full py-3 text-red-500 font-bold border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
                      Sign Out
                    </button>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Sub-Category Modal */}
      <AnimatePresence>
        {isAddingSubCategory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingSubCategory(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md relative"
            >
              <GlassCard className="bg-white p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Add Sub-Category</h2>
                <form onSubmit={handleAddSubCategory} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Parent Category</label>
                    <select 
                      required
                      value={newSubCategory.category_id}
                      onChange={e => setNewSubCategory({ ...newSubCategory, category_id: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Sub-Category Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Groceries"
                      value={newSubCategory.name}
                      onChange={e => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsAddingSubCategory(false)}
                      className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-700 transition-colors"
                    >
                      Add Sub-Category
                    </button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Category Modal */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingCategory(false);
                setEditingCategory(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md relative"
            >
              <GlassCard className="bg-white p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Category Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Entertainment"
                      value={newCategory.name}
                      onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Icon</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Utensils', 'Car', 'Activity', 'Zap'].map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewCategory({ ...newCategory, icon })}
                          className={`p-4 rounded-xl flex items-center justify-center border-2 transition-all ${
                            newCategory.icon === icon ? 'border-orange-600 bg-orange-50 text-orange-600' : 'border-slate-100 bg-slate-50 text-slate-400'
                          }`}
                        >
                          {icon === 'Utensils' && <Utensils className="w-6 h-6" />}
                          {icon === 'Car' && <Car className="w-6 h-6" />}
                          {icon === 'Activity' && <Activity className="w-6 h-6" />}
                          {icon === 'Zap' && <Zap className="w-6 h-6" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Color</label>
                    <div className="flex gap-2">
                      {['#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#f97316', '#f43f5e', '#8b5cf6', '#ec4899'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategory({ ...newCategory, color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            newCategory.color === color ? 'border-slate-900 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-700 transition-colors"
                  >
                    {editingCategory ? 'Update Category' : 'Add Category'}
                  </button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingExpense(false);
                setEditingExpense(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg relative"
            >
              <GlassCard className="bg-white p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h2>
                <form onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Amount (₹)</label>
                      <input 
                        required
                        type="number" 
                        placeholder="0.00"
                        value={newExpense.amount}
                        onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Category</label>
                      <select 
                        required
                        value={newExpense.category_id}
                        onChange={e => setNewExpense({ ...newExpense, category_id: e.target.value, sub_category: '' })}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="">Select...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Sub-Category</label>
                      <select 
                        value={newExpense.sub_category}
                        onChange={e => setNewExpense({ ...newExpense, sub_category: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="">Select...</option>
                        {subCategories.filter(s => s.category_id === newExpense.category_id).map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Description</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Weekly groceries"
                        value={newExpense.description}
                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Date</label>
                      <input 
                        type="date" 
                        value={newExpense.date}
                        onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsAddingExpense(false)}
                      className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-700 transition-colors"
                    >
                      Save Expense
                    </button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 p-3 md:px-4 md:py-3.5 rounded-2xl transition-all duration-300 w-full ${
        active 
          ? 'text-orange-600 bg-orange-50 shadow-sm shadow-orange-100/50' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
    >
      <div className={`${active ? 'scale-110 text-orange-500' : 'scale-100'} transition-transform`}>
        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      </div>
      <span className={`text-[10px] md:text-sm font-bold ${active ? 'opacity-100' : 'opacity-0 md:opacity-100 md:text-slate-500'}`}>
        {label}
      </span>
      {active && <div className="hidden md:block absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full" />}
    </button>
  );
}
