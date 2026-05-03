import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, Transaction, Product } from '../types';
import { ShoppingBag, TrendingUp, Users, Star, Award, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (s) => 
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })) as Order[])
    );
    const unsubTrans = onSnapshot(collection(db, 'transactions'), (s) => 
      setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[])
    );
    const unsubProds = onSnapshot(collection(db, 'products'), (s) => 
      setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })) as Product[])
    );

    return () => {
      unsubOrders();
      unsubTrans();
      unsubProds();
    };
  }, []);

  // Stats
  const activeOrders = orders.filter(o => o.status === 'pending').length;
  const totalRevenue = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalOrders = orders.length;

  // Product popularity
  const productStats = orders.reduce((acc: any, order) => {
    order.items.forEach(item => {
      if (!acc[item.name]) acc[item.name] = 0;
      acc[item.name] += item.quantity;
    });
    return acc;
  }, {});

  const topProductsData = Object.entries(productStats)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Customer ranking
  const customerStats = orders.reduce((acc: any, order) => {
    if (!acc[order.customerName]) acc[order.customerName] = { count: 0, total: 0 };
    acc[order.customerName].count += 1;
    acc[order.customerName].total += order.total;
    return acc;
  }, {});

  const topCustomersData = Object.entries(customerStats)
    .map(([name, stats]: [string, any]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const COLORS = ['#ec4899', '#f472b6', '#fbcfe8', '#fdf2f8', '#9d174d'];

  return (
    <div className="space-y-10">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard 
            icon="🍬"
            label="Pedidos Hoje"
            value={totalOrders.toString()}
            subLabel={activeOrders > 0 ? `+${activeOrders} pendentes` : "Tudo em dia!"}
            textColor="text-pink-600"
            iconBg="bg-pink-100"
         />
         <StatCard 
            icon="💰"
            label="Faturamento"
            value={`R$ ${totalRevenue.toFixed(0)}`}
            subLabel="Total acumulado"
            textColor="text-blue-500"
            iconBg="bg-blue-100"
         />
         <StatCard 
            icon="📦"
            label="Doces Ativos"
            value={products.length.toString()}
            subLabel="No seu catálogo"
            textColor="text-yellow-500"
            iconBg="bg-yellow-100"
         />
         <StatCard 
            icon="🏆"
            label="Top Favorito"
            value={topProductsData[0]?.name || 'N/A'}
            subLabel="O mais vendido"
            textColor="text-purple-500"
            iconBg="bg-purple-100"
         />
      </div>

      {/* Main Visual Panels */}
      <div className="grid grid-cols-12 gap-8">
        {/* Recent Orders List Style Panel */}
        <div className="col-span-12 xl:col-span-8 bg-white rounded-[40px] shadow-sm p-8 border border-pink-50">
           <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
             <span className="w-2 h-6 bg-pink-500 rounded-full"></span>
             Doces que mais saíram
           </h3>
           
           <div className="h-80 w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontWeight: 'bold', fontSize: 13}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#ec4899" 
                  radius={[0, 20, 20, 0]} 
                  barSize={20}
                  animationBegin={200}
                />
              </BarChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Top Products Analysis (Vibrant Card Style) */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
          <div className="bg-pink-600 text-white rounded-[40px] p-8 shadow-lg shadow-pink-100 flex-1">
            <h3 className="text-lg font-bold mb-6 italic">Mais Vendidos 🔥</h3>
            <div className="space-y-6">
              {topProductsData.map((item, index) => (
                <div key={index} className={`flex justify-between items-center ${index > 0 ? `opacity-${100 - (index * 20)}` : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center text-xl">
                      {index === 0 ? '🍫' : index === 1 ? '🍰' : '🍪'}
                    </div>
                    <span className="text-sm font-bold">{item.name}</span>
                  </div>
                  <span className="text-sm font-black">{item.value} un.</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-pink-50 flex-1">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Ranking de Clientes
            </h3>
            <div className="space-y-6">
              {topCustomersData.map((customer, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                      index === 1 ? 'bg-gray-100 text-gray-700' : 
                      index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-pink-50 text-pink-400'
                    }`}>
                      {index + 1}º
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-800">{customer.name}</p>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{customer.count} pedidos</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-pink-500">R$ {customer.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subLabel, textColor, iconBg }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-[32px] shadow-sm border border-pink-50 flex flex-col transition-all cursor-default"
    >
       <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</span>
       <span className={`text-3xl font-black ${textColor}`}>{value}</span>
       <div className="mt-4 flex items-center text-gray-400 text-xs font-medium">
          <div className={`${iconBg} w-6 h-6 rounded-lg flex items-center justify-center mr-2 text-sm`}>{icon}</div>
          {subLabel}
       </div>
    </motion.div>
  );
}
