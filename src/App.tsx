import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Orders from './components/Orders';
import Finance from './components/Finance';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Wallet, 
  LogOut, 
  Lock,
  ChevronRight,
  Menu,
  X,
  Eye,
  EyeOff,
  Home
} from 'lucide-react';
import { doc, updateDoc, collection, query, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

type Tab = 'dashboard' | 'products' | 'orders' | 'finance';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // One-time cleanup for seeding data to deliver a clean app
    const cleanupSeeding = async () => {
      if (user && !localStorage.getItem('seeding_cleaned')) {
        try {
          const q = query(collection(db, 'transactions'));
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
          localStorage.setItem('seeding_cleaned', 'true');
          console.log("Histórico de transações limpo para entrega.");
        } catch (err) {
          console.error("Erro ao limpar dados de seeding:", err);
        }
      }
    };
    cleanupSeeding();
  }, [user]);

  const handleLogin = (userData: UserProfile) => {
    setUser(userData);
    if (!userData.hasChangedPassword) {
      setShowPasswordModal(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        password: newPassword,
        hasChangedPassword: true
      });
      setUser({ ...user, password: newPassword, hasChangedPassword: true });
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      console.error("Error changing password:", err);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'finance', label: 'Financeiro', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-pink-100 z-[110] transform lg:transform-none transition-transform duration-500 ease-out shadow-2xl lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-pink-400 rounded-full flex items-center justify-center text-white text-xl shadow-lg shadow-pink-200">
              🍬
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-pink-600 font-serif">Sweet Dreams</h1>
          </div>

          <nav className="flex-1 space-y-2">
            <button
               onClick={() => {
                setActiveTab('dashboard');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all font-semibold ${
                activeTab === 'dashboard'
                  ? 'bg-pink-50 text-pink-600'
                  : 'text-gray-500 hover:bg-pink-50 hover:text-pink-600'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-semibold">Início</span>
              {activeTab === 'dashboard' && <ChevronRight className="ml-auto w-4 h-4" />}
            </button>

            {tabs.filter(t => t.id !== 'dashboard').map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as Tab);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all font-semibold ${
                  activeTab === tab.id
                    ? 'bg-pink-50 text-pink-600'
                    : 'text-gray-500 hover:bg-pink-50 hover:text-pink-600'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-semibold">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="ml-auto w-4 h-4" />}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                {user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">{user.displayName}</p>
                <p className="text-[10px] text-gray-400">@{user.username}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="w-full text-center text-[10px] text-pink-500 font-bold uppercase tracking-wider hover:underline"
              >
                Alterar Senha
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-center text-[10px] text-red-400 font-bold uppercase tracking-wider hover:underline"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden px-4 md:px-8">
        {/* Top Header */}
        <header className="bg-transparent px-2 py-6 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-500 lg:hidden mr-2">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-extrabold text-brand-text">Olá, {user.displayName.split(' ')[0]}! 👋</h2>
          </div>
          
          <div className="flex items-center gap-2">
             {activeTab !== 'dashboard' && (
               <button 
                onClick={() => setActiveTab('dashboard')}
                className="p-2.5 bg-white border-2 border-pink-50 rounded-xl text-pink-500 hover:bg-pink-50 transition-all active:scale-95 flex items-center gap-2"
                title="Ir para Dashboard"
               >
                 <Home className="w-5 h-5" />
                 <span className="hidden sm:inline font-bold text-sm">Painel</span>
               </button>
             )}

             <button 
              onClick={() => setActiveTab('finance')}
              className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 border-2 ${
                activeTab === 'finance' 
                ? 'bg-pink-50 border-pink-200 text-pink-600' 
                : 'bg-white border-pink-50 text-gray-500 hover:bg-pink-50'
              }`}
              title="Ver Financeiro"
             >
               <Wallet className="w-5 h-5" />
               <span className="hidden sm:inline font-bold text-sm">Financeiro</span>
             </button>

             <button 
              onClick={() => setActiveTab('products')}
              className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 border-2 ${
                activeTab === 'products' 
                ? 'bg-pink-50 border-pink-200 text-pink-600' 
                : 'bg-white border-pink-50 text-gray-500 hover:bg-pink-50'
              }`}
              title="Ver Produtos"
             >
               <Package className="w-5 h-5" />
               <span className="hidden lg:inline font-bold text-sm">Produtos</span>
             </button>

             <button 
              onClick={() => setActiveTab('orders')}
              className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 border-2 ${
                activeTab === 'orders' 
                ? 'bg-pink-50 border-pink-200 text-pink-600' 
                : 'bg-pink-500 border-pink-400 text-white hover:bg-pink-600'
              }`}
              title="Novo Pedido"
             >
               <ShoppingBag className="w-5 h-5" />
               <span className="hidden lg:inline font-bold text-sm">Novo Pedido</span>
             </button>

             <button 
              onClick={handleLogout}
              className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border-2 border-transparent"
              title="Sair"
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'products' && <Products />}
              {activeTab === 'orders' && <Orders />}
              {activeTab === 'finance' && <Finance />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-pink-100 p-2 rounded-lg">
                  <Lock className="text-pink-500 w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Alterar Senha</h2>
              </div>
              
              <p className="text-gray-500 text-sm mb-6">
                Para sua segurança, pedimos que altere sua senha inicial.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha"
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-pink-300 outline-none font-bold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-pink-400"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex space-x-3">
                  {!user.hasChangedPassword ? (
                     <button
                        type="submit"
                        className="flex-1 bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-all"
                      >
                        Salvar Nova Senha
                      </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPasswordModal(false)}
                        className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-pink-500 text-white font-bold py-3 rounded-xl"
                      >
                        Alterar
                      </button>
                    </>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
