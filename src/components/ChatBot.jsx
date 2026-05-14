import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState('inicio'); // inicio, pidiendo_contacto, finalizado
  const [cursoElegido, setCursoElegido] = useState('');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // Mensaje inicial cuando se abre el chat por primera vez
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { sender: 'bot', text: '¡Hola! 👋 Soy tu "yo del futuro" tras haber estudiado en Bimfli Academy. Vengo a decirte que fue la mejor decisión que tomamos. 🚀' },
        { sender: 'bot', text: '¿Sobre qué área te gustaría que te dé más información?' }
      ]);
    }
  }, [isOpen, messages.length]);

  // Scroll automático hacia abajo cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOpcionClick = (curso) => {
    setCursoElegido(curso);
    setMessages(prev => [
      ...prev, 
      { sender: 'user', text: `Me interesa el curso de ${curso}` },
      { sender: 'bot', text: `¡Brillante elección! El curso de ${curso} te abrirá muchísimas puertas. Si quieres que te llamemos para explicarte el temario y resolver tus dudas sin compromiso, déjame tu teléfono o email aquí abajo 👇` }
    ]);
    setStep('pidiendo_contacto');
  };

  const handleEnviarContacto = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const contacto = inputValue.trim();
    setInputValue('');
    
    // Mostramos el mensaje del usuario
    setMessages(prev => [...prev, { sender: 'user', text: contacto }]);

    try {
      // Guardamos en Supabase
      const { error } = await supabase.from('contactos_leads').insert([
        { curso_interes: cursoElegido, contacto: contacto }
      ]);

      if (error) throw error;

      // Mensaje final
      setMessages(prev => [
        ...prev, 
        { sender: 'bot', text: '¡Genial! 📝 He guardado tu contacto. Nuestro equipo (o sea, nosotros en el presente) te contactará muy pronto. ¡Nos vemos en el futuro!' }
      ]);
      setStep('finalizado');
    } catch (error) {
      console.error('Error al guardar contacto:', error);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Uy, hubo un fallo en la máquina del tiempo. Inténtalo más tarde.' }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* VENTANA DEL CHAT */}
      {isOpen && (
        <div className="bg-white w-80 sm:w-96 rounded-2xl shadow-2xl border border-gray-100 mb-4 overflow-hidden flex flex-col h-125 animate-fade-in-up">
          {/* Cabecera */}
          <div className="bg-bimfli-navy text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-bimfli-pink rounded-full flex items-center justify-center font-black text-xl">🤖</div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest">Tu Yo del Futuro</h3>
                <p className="text-[10px] text-green-400">En línea</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Área de mensajes */}
          <div className="grow p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {messages.map((msg, index) => (
              <div key={index} className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.sender === 'bot' ? 'bg-white border border-gray-200 text-gray-700 self-start rounded-tl-sm' : 'bg-bimfli-pink text-white self-end rounded-tr-sm font-medium'}`}>
                {msg.text}
              </div>
            ))}
            
            {/* Opciones interactivas (solo en el paso inicial) */}
            {step === 'inicio' && messages.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <button onClick={() => handleOpcionClick('BIM')} className="bg-white border-2 border-bimfli-pink text-bimfli-pink font-bold py-2 px-4 rounded-xl hover:bg-pink-50 transition-colors text-xs text-left cursor-pointer">🏗️ Curso BIM</button>
                <button onClick={() => handleOpcionClick('Unreal Engine')} className="bg-white border-2 border-bimfli-pink text-bimfli-pink font-bold py-2 px-4 rounded-xl hover:bg-pink-50 transition-colors text-xs text-left cursor-pointer">🎮 Unreal Engine</button>
                <button onClick={() => handleOpcionClick('Diseño 3D')} className="bg-white border-2 border-bimfli-pink text-bimfli-pink font-bold py-2 px-4 rounded-xl hover:bg-pink-50 transition-colors text-xs text-left cursor-pointer">🎨 Diseño 3D</button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de input para correo/teléfono */}
          {step === 'pidiendo_contacto' && (
            <form onSubmit={handleEnviarContacto} className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu email o teléfono..." 
                className="grow bg-gray-100 border-transparent rounded-xl px-4 py-2 text-sm text-bimfli-navy focus:outline-none focus:ring-2 focus:ring-bimfli-pink"
                required
              />
              <button type="submit" className="bg-bimfli-pink text-white p-2 rounded-xl hover:bg-pink-600 transition-colors cursor-pointer">
                <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
          )}
          
          {step === 'finalizado' && (
            <div className="p-4 bg-white border-t border-gray-100 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
              Chat finalizado
            </div>
          )}
        </div>
      )}

      {/* BOTÓN FLOTANTE QUE ABRE EL CHAT */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-bimfli-pink text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer border-4 border-white"
      >
        {isOpen ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        )}
      </button>

    </div>
  );
}

export default ChatBot;