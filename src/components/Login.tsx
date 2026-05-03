import React, { useState, useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion } from 'motion/react';
import { Candy, Lock, User, IceCream, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize database with users and some products if they don't exist
  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Seed Users
        const usersToSeed = [
          { username: 'pedro_santos', password: '123', displayName: 'Pedro Santos', hasChangedPassword: false },
          { username: 'yasmin_ferreira', password: '123', displayName: 'Yasmin Ferreira', hasChangedPassword: false }
        ];

        for (const u of usersToSeed) {
          const userQuery = query(collection(db, 'users'), where('username', '==', u.username));
          const snapshot = await getDocs(userQuery);
          if (snapshot.empty) {
            await addDoc(collection(db, 'users'), u);
            console.log("Usuário criado:", u.username);
          }
        }

        // 2. Seed Initial Products (to make the app alive)
        const productsSnapshot = await getDocs(collection(db, 'products'));
        if (productsSnapshot.empty) {
          const initialProducts = [
            { name: 'Brigadeiro Tradicional', price: 4.50, category: 'Doces' },
            { name: 'Brownie de Nutella', price: 12.00, category: 'Bolos' },
            { name: 'Bolo de Pote (Ninho)', price: 15.00, category: 'Bolos' }
          ];
          for (const p of initialProducts) {
            await addDoc(collection(db, 'products'), p);
          }
          console.log("Produtos iniciais criados");
        }

        // 3. (REMOVED) Seed Initial Transactions - Starting from 0 for deployment
      } catch (err) {
        console.warn("Aviso: Falha ao popular dados iniciais. Se o Anonymous Auth não estiver ativo no console, isso é esperado.", err);
      }
    };
    initData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Attempt Anonymous Auth
      try {
        await signInAnonymously(auth);
      } catch (authErr: any) {
        if (authErr.code === 'auth/admin-restricted-operation') {
          setError('⚠️ Login Anônimo desativado no Firebase. Ative-o em Autenticação > Métodos de Login.');
          setLoading(false);
          return;
        }
      }

      // Step 2: Custom Login Check
      const userQuery = query(
        collection(db, 'users'),
        where('username', '==', username),
        where('password', '==', password)
      );

      const snapshot = await getDocs(userQuery);

      if (snapshot.empty) {
        setError('Usuário ou senha incorretos');
      } else {
        const userData = snapshot.docs[0].data();
        onLogin({ id: snapshot.docs[0].id, ...userData });
      }
    } catch (err) {
      setError('Erro ao validar login. Verifique sua conexão.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[48px] shadow-2xl shadow-pink-100 w-full max-w-md border border-pink-50 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Candy className="w-32 h-32 text-pink-500" />
        </div>

        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="bg-pink-100 p-5 rounded-[24px] mb-6 shadow-inner">
            <Candy className="w-10 h-10 text-pink-500" />
          </div>
          <h1 className="text-4xl font-black text-pink-600 font-serif tracking-tight">Sweet Dreams</h1>
          <p className="text-pink-300 text-xs font-bold uppercase tracking-widest mt-2 font-sans">Gestão de Doçuras</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Usuário</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-pink-50/50 border-none rounded-[20px] focus:ring-4 focus:ring-pink-100 transition-all outline-none font-bold text-gray-700"
                placeholder="pedro_santos"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-pink-50/50 border-none rounded-[20px] focus:ring-4 focus:ring-pink-100 transition-all outline-none font-bold text-gray-700"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-300 hover:text-pink-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs text-center font-black uppercase tracking-wider"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-pink-200 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
          >
            {loading ? 'Acessando...' : 'Entrar no Painel'}
          </button>
        </form>

        <div className="mt-10 flex items-center justify-center space-x-3 opacity-20">
           <div className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
           <div className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
           <div className="w-8 h-1 bg-pink-500 rounded-full" />
           <div className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
           <div className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}
