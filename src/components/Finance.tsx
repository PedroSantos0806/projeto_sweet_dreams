import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, where, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Transaction } from '../types';
import { Plus, TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpRight, ArrowDownRight, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function Finance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
    });
    return unsubscribe;
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        type,
        amount: parseFloat(amount),
        description,
        date: serverTimestamp()
      });
      setAmount('');
      setDescription('');
      setShowAdd(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Chart Data (Group by Day for the last 7 days)
  const chartData = transactions
    .filter(t => t.date)
    .reduce((acc: any[], t) => {
      const dateStr = format(t.date.toDate(), 'dd/MM');
      const existing = acc.find(i => i.name === dateStr);
      if (existing) {
         if (t.type === 'income') existing.income += t.amount;
         else existing.expense += t.amount;
      } else {
         acc.push({ name: dateStr, income: t.type === 'income' ? t.amount : 0, expense: t.type === 'expense' ? t.amount : 0 });
      }
      return acc;
    }, [])
    .reverse();

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-text font-serif">Financeiro</h2>
          <p className="text-gray-500">Controle de lucros e despesas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
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
            <form onSubmit={handleAddTransaction} className="bg-white p-8 rounded-[40px] shadow-sm border border-pink-100 flex flex-col md:flex-row items-end gap-4">
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
                Salvar
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
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-pink-500 rounded-full"></span>
            Movimentação Diária
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#ec4899" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
               </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-pink-50 shadow-sm flex flex-col">
           <h3 className="text-lg font-bold text-gray-800 mb-6 italic underline decoration-pink-300 decoration-3">Últimas Transações</h3>
           <div className="space-y-4 flex-1 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-3xl hover:bg-pink-50/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${t.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                      {t.type === 'income' ? '💰' : '💸'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-700 line-clamp-1">{t.description}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.date && format(t.date.toDate(), "dd 'de' MMM", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <span className={`font-black text-sm ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
