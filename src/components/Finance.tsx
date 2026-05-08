import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, where, limit, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Transaction } from '../types';
import { Plus, TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpRight, ArrowDownRight, X, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, isSameDay, subWeeks, startOfWeek, subMonths, startOfMonth, subYears, startOfYear, isSameMonth, isSameYear, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Finance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
    });
    return unsubscribe;
  }, []);

  const syncHistoricalOrders = async () => {
    try {
      const qOrders = query(collection(db, 'orders'), where('status', '==', 'paid'));
      const ordersSnap = await getDocs(qOrders);
      
      const qTrans = query(collection(db, 'transactions'));
      const transSnap = await getDocs(qTrans);
      const existingOrderIds = new Set(transSnap.docs.map(d => d.data().orderId).filter(id => !!id));

      let syncCount = 0;
      for (const orderDoc of ordersSnap.docs) {
        if (!existingOrderIds.has(orderDoc.id)) {
          const order = { id: orderDoc.id, ...orderDoc.data() } as any;
          await addDoc(collection(db, 'transactions'), {
            type: 'income',
            amount: order.total,
            description: `Venda para ${order.customerName} (Pedido #${order.id.slice(0, 5)})`,
            date: order.createdAt || serverTimestamp(),
            orderId: order.id
          });
          syncCount++;
        }
      }
      if (syncCount > 0) alert(`${syncCount} pedidos sincronizados com o financeiro!`);
      else alert('Todos os pedidos já estão sincronizados.');
    } catch (err) {
      console.error("Erro na sincronização:", err);
      alert("Erro ao sincronizar. Verifique o console.");
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const docPath = editingTransaction ? `transactions/${editingTransaction.id}` : 'transactions';
    try {
      if (editingTransaction) {
        await updateDoc(doc(db, 'transactions', editingTransaction.id), {
          type,
          amount: parseFloat(amount),
          description,
        });
      } else {
        await addDoc(collection(db, 'transactions'), {
          type,
          amount: parseFloat(amount),
          description,
          date: serverTimestamp()
        });
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, docPath);
    }
  };

  const handleDeleteTransaction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir esta transação?')) {
      const docPath = `transactions/${id}`;
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    }
  };

  const startEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setAmount(t.amount.toString());
    setDescription(t.description);
    setType(t.type);
    setShowAdd(true);
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setType('expense');
    setEditingTransaction(null);
    setShowAdd(false);
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Aggregate Chart Data based on periodFilter
  const getChartData = () => {
    const now = new Date();
    
    if (periodFilter === 'daily') {
      const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i));
      return last7Days.map(day => {
        const dayTransactions = transactions.filter(t => t.date && isSameDay(t.date.toDate(), day));
        return {
          name: format(day, 'dd/MM'),
          receitas: dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          despesas: dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
        };
      });
    }

    if (periodFilter === 'weekly') {
      const last8Weeks = Array.from({ length: 8 }, (_, i) => startOfWeek(subWeeks(now, 7 - i)));
      return last8Weeks.map(week => {
        const weekTransactions = transactions.filter(t => t.date && isSameWeek(t.date.toDate(), week));
        return {
          name: `Sem ${format(week, 'dd/MM')}`,
          receitas: weekTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          despesas: weekTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
        };
      });
    }

    if (periodFilter === 'monthly') {
      const last6Months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
      return last6Months.map(month => {
        const monthTransactions = transactions.filter(t => t.date && isSameMonth(t.date.toDate(), month));
        return {
          name: format(month, 'MMM', { locale: ptBR }),
          receitas: monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          despesas: monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
        };
      });
    }

    if (periodFilter === 'yearly') {
      const last5Years = Array.from({ length: 5 }, (_, i) => startOfYear(subYears(now, 4 - i)));
      return last5Years.map(year => {
        const yearTransactions = transactions.filter(t => t.date && isSameYear(t.date.toDate(), year));
        return {
          name: format(year, 'yyyy'),
          receitas: yearTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          despesas: yearTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
        };
      });
    }

    return [];
  };

  const chartData = getChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-[24px] shadow-2xl border border-pink-50 min-w-[150px]">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center gap-4">
                <span className="text-[11px] font-bold text-gray-500">{entry.name}:</span>
                <span className={`text-xs font-black ${entry.dataKey === 'receitas' ? 'text-pink-500' : 'text-red-500'}`}>
                  R$ {entry.value.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-50 mt-2 flex justify-between items-center bg-gray-50 -mx-4 px-4 py-2 rounded-b-[24px]">
              <span className="text-[10px] font-black text-gray-400">SALDO:</span>
              <span className={`text-[11px] font-black ${(payload[0].value - payload[1].value) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(payload[0].value - payload[1].value).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-text font-serif">Financeiro</h2>
          <p className="text-gray-500">Controle de lucros e despesas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncHistoricalOrders}
            className="flex items-center space-x-2 bg-green-50 text-green-600 px-6 py-3 rounded-2xl hover:bg-green-100 transition-all font-bold group"
            title="Sincronizar Pedidos Pagos"
          >
            <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
          <button
            onClick={() => {
              if (showAdd) resetForm();
              else setShowAdd(true);
            }}
            className="flex items-center space-x-2 bg-pink-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-pink-100 hover:bg-pink-600 transition-all font-bold"
          >
            {showAdd ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span>{showAdd ? 'Cancelar' : 'Nova Movimentação'}</span>
          </button>
        </div>
      </div>

       <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSaveTransaction} className="bg-white p-8 rounded-[40px] shadow-sm border border-pink-100 flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo</label>
                <div className="flex p-1 bg-gray-50 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${type === 'income' ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'text-gray-400'}`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${type === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'text-gray-400'}`}
                  >
                    Despesa
                  </button>
                </div>
              </div>
              <div className="flex-[2] space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-pink-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 font-bold"
                  placeholder="Ex: Venda de Bolo"
                  required
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-pink-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 font-bold"
                  placeholder="0.00"
                  required
                />
              </div>
              <button
                type="submit"
                className={`w-full md:w-auto font-black py-4 px-8 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-xs text-white ${type === 'income' ? 'bg-green-500 shadow-green-100 hover:bg-green-600' : 'bg-red-500 shadow-red-100 hover:bg-red-600'}`}
              >
                {editingTransaction ? 'Atualizar' : 'Salvar'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-pink-50 flex flex-col">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Receitas</span>
          <span className="text-3xl font-black text-pink-600">R$ {totalIncome.toFixed(2)}</span>
          <div className="mt-4 flex items-center text-green-500 text-xs font-bold uppercase tracking-widest leading-none">
            <TrendingUp className="w-4 h-4 mr-1" />
            Entradas
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-pink-50 flex flex-col">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Despesas</span>
          <span className="text-3xl font-black text-red-500">R$ {totalExpense.toFixed(2)}</span>
          <div className="mt-4 flex items-center text-red-500 text-xs font-bold uppercase tracking-widest leading-none">
            <TrendingDown className="w-4 h-4 mr-1" />
            Saídas
          </div>
        </div>

        <div className={`p-8 rounded-[40px] shadow-lg border flex flex-col ${balance >= 0 ? 'bg-pink-600 border-pink-500 text-white shadow-pink-100' : 'bg-red-600 border-red-500 text-white shadow-red-100'}`}>
          <span className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-2">Saldo Total</span>
          <span className="text-3xl font-black italic">R$ {balance.toFixed(2)}</span>
          <div className="mt-4 flex items-center text-white/80 text-xs font-bold uppercase tracking-widest leading-none">
            <Wallet className="w-4 h-4 mr-1" />
            Fluxo Atual
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-pink-50 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-6 bg-pink-500 rounded-full"></span>
              Movimentações
            </h3>
            
            <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl overflow-x-auto">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${periodFilter === p ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-pink-500'}`}
                >
                  {p === 'daily' ? 'Diário' : p === 'weekly' ? 'Semanal' : p === 'monthly' ? 'Mensal' : 'Anual'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-500"></div>Receitas</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400"></div>Despesas</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 700}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 700}} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    name="Receitas"
                    type="monotone" 
                    dataKey="receitas" 
                    stroke="#ec4899" 
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                    strokeWidth={4} 
                    animationDuration={1500}
                  />
                  <Area 
                    name="Despesas"
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="#f87171" 
                    fillOpacity={1} 
                    fill="url(#colorExpense)" 
                    strokeWidth={3} 
                    strokeDasharray="8 4"
                    animationDuration={1500}
                  />
               </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-pink-50 shadow-sm flex flex-col">
           <h3 className="text-lg font-bold text-gray-800 mb-6 italic underline decoration-pink-300 decoration-3">Últimas Transações</h3>
            <div className="space-y-4 flex-1 overflow-y-auto max-h-72 pr-2 custom-scrollbar">
              {transactions.map((t) => (
                <div key={t.id} className="group relative flex items-center justify-between p-4 rounded-[24px] hover:bg-pink-50 transition-colors border border-transparent hover:border-pink-100">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${t.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                      {t.type === 'income' ? '💰' : '💸'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-700 line-clamp-1">{t.description}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.date && format(t.date.toDate(), "dd 'de' MMM", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-black text-sm ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(t)}
                        className="p-1.5 text-pink-300 hover:text-pink-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteTransaction(t.id, e)}
                        className="p-1.5 text-red-300 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                  <Wallet className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Sem movimentações</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
