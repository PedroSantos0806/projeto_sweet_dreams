import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, serverTimestamp, Timestamp, deleteDoc, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Order, OrderItem } from '../types';
import { Plus, CheckCircle, Clock, ShoppingCart, X, User, Trash2, Edit2, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  // New Order State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    const qProducts = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    });

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[]);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, []);

  const resetForm = () => {
    setCustomerName('');
    setSelectedItems([]);
    setShowAdd(false);
    setEditingOrder(null);
  };

  const addItem = (product: Product) => {
    const existing = selectedItems.find(item => item.productId === product.id);
    if (existing) {
      updateQuantity(product.id, 1);
    } else {
      setSelectedItems([...selectedItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        priceAtTime: product.price
      }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleManualQuantityChange = (productId: string, value: string) => {
    const newQty = parseInt(value) || 0;
    setSelectedItems(selectedItems.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId));
  };

  const total = selectedItems.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || selectedItems.length === 0) return;

    const docPath = editingOrder ? `orders/${editingOrder.id}` : 'orders';
    try {
      if (editingOrder) {
        await updateDoc(doc(db, 'orders', editingOrder.id), {
          customerName,
          items: selectedItems,
          total
        });

        // Update corresponding transaction if it exists
        const q = query(collection(db, 'transactions'), where('orderId', '==', editingOrder.id));
        const transactionSnap = await getDocs(q);
        if (!transactionSnap.empty) {
          const transactionDoc = transactionSnap.docs[0];
          await updateDoc(doc(db, 'transactions', transactionDoc.id), {
            amount: total,
            description: `Venda para ${customerName} (Pedido #${editingOrder.id.slice(0, 5)})`
          });
        }

      } else {
        await addDoc(collection(db, 'orders'), {
          customerName,
          items: selectedItems,
          total,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingOrder ? OperationType.UPDATE : OperationType.CREATE, docPath);
    }
  };

  const startEdit = (order: Order) => {
    setEditingOrder(order);
    setCustomerName(order.customerName);
    setSelectedItems(order.items);
    setShowAdd(true);
  };

  const handleDeleteOrder = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este pedido?')) {
      const docPath = `orders/${id}`;
      try {
        await deleteDoc(doc(db, 'orders', id));
        
        // Also delete associated transaction
        const q = query(collection(db, 'transactions'), where('orderId', '==', id));
        const transactionSnap = await getDocs(q);
        if (!transactionSnap.empty) {
          const deletePromises = transactionSnap.docs.map(d => {
            const transPath = `transactions/${d.id}`;
            return deleteDoc(d.ref).catch(e => handleFirestoreError(e, OperationType.DELETE, transPath));
          });
          await Promise.all(deletePromises);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    }
  };

  const confirmPayment = async (order: Order) => {
    const docPath = `orders/${order.id}`;
    try {
      // 1. Update Order Status
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'paid'
      });

      // 2. Automatically record transaction
      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        amount: order.total,
        description: `Venda para ${order.customerName} (Pedido #${order.id.slice(0, 5)})`,
        date: serverTimestamp(),
        orderId: order.id
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-text font-serif">Pedidos</h2>
          <p className="text-gray-500">Histórico e novos lançamentos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (showAdd) resetForm();
              else setShowAdd(true);
            }}
            className="flex items-center space-x-2 bg-pink-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-pink-100 hover:bg-pink-600 transition-all font-bold"
          >
            {showAdd ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span>{showAdd ? 'Cancelar' : 'Novo Pedido'}</span>
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
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-pink-100 grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
              <button 
                onClick={resetForm}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-pink-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              {/* Order Selection */}
              <div>
                <h3 className="font-bold text-gray-700 mb-6 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-pink-500" />
                  {editingOrder ? 'Editar Itens' : 'Selecionar Itens'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="p-4 bg-pink-50 border border-pink-100 rounded-[24px] text-left hover:bg-pink-100 transition-all active:scale-95 group"
                    >
                      <p className="text-sm font-bold text-gray-800 line-clamp-1">{p.name}</p>
                      <p className="text-xs text-pink-500 font-black mt-1 group-hover:scale-110 transition-transform">R$ {p.price.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <form onSubmit={handleCreateOrder} className="flex flex-col bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4">{editingOrder ? 'Atualizar Pedido' : 'Resumo do Pedido'}</h3>
                
                <div className="space-y-3 mb-6 flex-1 overflow-y-auto max-h-48 pr-2 custom-scrollbar">
                  {selectedItems.map((item) => (
                    <div key={item.productId} className="flex justify-between items-center text-sm bg-white p-3 rounded-2xl border border-gray-100">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700">{item.name}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <button 
                            type="button" 
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="bg-pink-100 text-pink-600 rounded-lg p-1 hover:bg-pink-200 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || ''}
                            onChange={(e) => handleManualQuantityChange(item.productId, e.target.value)}
                            className="w-12 bg-pink-50 text-pink-600 text-xs font-black text-center p-1 rounded-lg border-none focus:ring-1 focus:ring-pink-300 outline-none"
                          />
                          <button 
                            type="button" 
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="bg-pink-100 text-pink-600 rounded-lg p-1 hover:bg-pink-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-black text-gray-800">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                        <button type="button" onClick={() => removeItem(item.productId)} className="text-red-300 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                   <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Nome do Cliente</label>
                    <div className="relative">
                       <User className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300 w-4 h-4" />
                       <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 font-bold text-gray-700"
                        placeholder="Nome do cliente"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-lg font-bold text-gray-700">Total</span>
                    <span className="text-3xl font-black text-pink-600">R$ {total.toFixed(2)}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={selectedItems.length === 0}
                    className="w-full bg-pink-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-pink-100 hover:bg-pink-600 transition-all disabled:opacity-50 uppercase tracking-widest"
                  >
                    Confirmar Pedido
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders.map((order) => (
          <motion.div
            layout
            key={order.id}
            className="bg-white rounded-[40px] p-8 shadow-sm border border-pink-50 hover:shadow-md transition-all flex flex-col"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-black text-pink-300 uppercase tracking-widest mb-1">ID #{order.id.slice(-4)}</p>
                <h3 className="text-xl font-black text-gray-800">{order.customerName}</h3>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  order.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {order.status === 'paid' ? 'Efetuado' : 'Pendente'}
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => startEdit(order)}
                    className="p-2 text-pink-300 hover:text-pink-600 transition-colors bg-pink-50/50 rounded-lg"
                    title="Editar Pedido"
                   >
                     <Edit2 className="w-3.5 h-3.5" />
                   </button>
                   <button 
                    onClick={() => handleDeleteOrder(order.id)}
                    className="p-2 text-red-300 hover:text-red-600 transition-colors bg-red-50/50 rounded-lg"
                    title="Excluir Pedido"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8 flex-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">{item.quantity}x {item.name}</span>
                  <span className="text-gray-800 font-black">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-gray-50">
              <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {order.createdAt && format(order.createdAt.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </div>
              <span className="text-2xl font-black text-pink-600">R$ {order.total.toFixed(2)}</span>
            </div>

            {order.status === 'pending' && (
              <button
                onClick={() => confirmPayment(order)}
                className="mt-6 w-full flex items-center justify-center space-x-2 bg-pink-600 text-white font-black py-4 rounded-2xl hover:bg-pink-700 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-pink-100"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar Pagamento</span>
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
