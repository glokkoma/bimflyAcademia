import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminArea() {
  // 1. Creamos un estado para guardar los contactos que lleguen de la base de datos
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Usamos useEffect para cargar los datos en segundo plano
  useEffect(() => {
    async function fetchLeads() {
      try {
        setIsLoading(true);
        // Aquí hacemos la llamada correcta con await dentro de la función asíncrona
        const { data, error } = await supabase
          .from('contactos_leads')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setLeads(data || []);
      } catch (error) {
        console.error('Error al cargar contactos:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLeads();
  }, []); // Los corchetes vacíos indican que esto solo se ejecuta al abrir el panel

  return (
    <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-gray-100 animate-fade-in-up">
      <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
        <div className="w-12 h-12 bg-bimfli-navy rounded-2xl flex items-center justify-center text-white font-black text-xl">
          👨‍💼
        </div>
        <h2 className="text-3xl font-black text-bimfli-navy uppercase tracking-widest">
          Panel de Jefe
        </h2>
      </div>
      
      <div className="mb-8">
        <h3 className="text-xl font-bold text-bimfli-pink mb-2">Contactos de Clientes (ChatBot)</h3>
        <p className="text-sm text-gray-500">Aquí aparecen los correos y teléfonos de los usuarios que han usado el asistente virtual.</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-bimfli-pink border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
          <p className="text-gray-400 font-bold italic">Aún no hay contactos guardados en la base de datos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-bimfli-navy text-xs uppercase tracking-widest border-b border-gray-100">
                <th className="p-4 font-black">Fecha</th>
                <th className="p-4 font-black">Curso de Interés</th>
                <th className="p-4 font-black">Contacto (Email/Tlf)</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm">
                  <td className="p-4 text-gray-500 font-medium">
                    {new Date(lead.created_at).toLocaleDateString('es-ES', { 
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' 
                    })}
                  </td>
                  <td className="p-4 font-bold text-bimfli-navy">{lead.curso_interes}</td>
                  <td className="p-4 font-black text-bimfli-pink">{lead.contacto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminArea;