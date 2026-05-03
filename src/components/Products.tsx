import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';
import { Plus, Trash2, Package, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(data);
    });
    return unsubscribe;
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    const docPath = editingProduct ? `products/${editingProduct.id}` : 'products';
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          name,
          price: parseFloat(price),
          category: category || 'Geral'
        });
      } else {
        await addDoc(collection(db, 'products'), {
          name,
          price: parseFloat(price),
          category: category || 'Geral'
        });
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingProduct ? OperationType.UPDATE : OperationType.CREATE, docPath);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setCategory('');
    setShowAdd(false);
    setEditingProduct(null);
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setCategory(product.category || '');
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este produto?')) {
      const docPath = `products/${id}`;
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-text font-serif">Catálogo de Produtos</h2>
          <p className="text-gray-500">Gerencie seus doces e valores</p>
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
            <span>{showAdd ? 'Cancelar' : 'Novo Produto'}</span>
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
            <form onSubmit={handleAddProduct} className="bg-white p-8 rounded-[40px] shadow-sm border border-pink-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-4 flex justify-between items-center mb-2">
                 <h3 className="text-lg font-bold text-gray-700">{editingProduct ? 'Editar Doce' : 'Novo Doce'}</h3>
                 <button type="button" onClick={resetForm} className="text-gray-400 hover:text-pink-500"><X className="w-5 h-5" /></button>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Doce</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-pink-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 font-bold"
                  placeholder="Ex: Brigadeiro Gourmet"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-pink-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 font-bold"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-pink-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 font-bold"
                  placeholder="Ex: Brigadeiros"
                />
              </div>
              <button
                type="submit"
                className="bg-pink-600 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-pink-100 hover:bg-pink-700 transition-all uppercase tracking-widest text-xs"
              >
                {editingProduct ? 'Atualizar' : 'Salvar'} Produto
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[40px] shadow-sm border border-pink-50 overflow-hidden">
        <div className="p-6 border-b border-pink-50 bg-pink-50/10 flex items-center">
          <Search className="w-5 h-5 text-pink-300 mr-2" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-gray-600 w-full font-medium"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="px-8 py-4 font-semibold uppercase tracking-widest text-[10px]">Produto</th>
                <th className="px-8 py-4 font-semibold uppercase tracking-widest text-[10px]">Categoria</th>
                <th className="px-8 py-4 font-semibold uppercase tracking-widest text-[10px]">Preço</th>
                <th className="px-8 py-4 font-semibold uppercase tracking-widest text-[10px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-50">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-pink-50/20 transition-colors group">
                  <td className="px-8 py-4 font-bold">{p.name}</td>
                  <td className="px-8 py-4 text-gray-400">{p.category}</td>
                  <td className="px-8 py-4 font-black text-pink-600 transition-transform group-hover:scale-105 origin-left">R$ {p.price.toFixed(2)}</td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="p-2 text-pink-300 hover:text-pink-600 transition-colors"
                      >
                        <Plus className="w-5 h-5 rotate-45" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-red-300 hover:text-red-600 transition-colors bg-red-50/50 rounded-lg hover:bg-red-50"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
