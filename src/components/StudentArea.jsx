import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function StudentArea({ user, allCourses = [], favIds = [], onToggleFavorite, onAddToCart }) {
  const [misCursos, setMisCursos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorDB, setErrorDB] = useState('');
  const [activeTab, setActiveTab] = useState('mis-cursos');

  // ESTADOS PARA RESEÑAS
  const [resenaEnCurso, setResenaEnCurso] = useState(null);
  const [puntos, setPuntos] = useState(5);
  const [comentario, setComentario] = useState('');
  const [misResenas, setMisResenas] = useState([]);

  const isAdmin = user?.email === 'ism@bimfligames.com' || user?.email === 'leamsi120705@gmail.com';

  useEffect(() => {
    async function fetchCampus() {
      try {
        setIsLoading(true);
        const { data: cursosData } = await supabase.from('courses').select('*');
        const { data: progresoData } = await supabase.from('progreso_cursos').select('*').eq('user_id', user.id);
        const { data: resenasData } = await supabase.from('resenas').select('curso_id').eq('user_id', user.id);
        
        setMisResenas(resenasData?.map(r => Number(r.curso_id)) || []);

        const progresosSeguros = progresoData || [];
        const cursosMapeados = (cursosData || []).map(curso => {
          const progreso = progresosSeguros.find(p => Number(p.curso_id) === Number(curso.id));
          return {
            ...curso,
            progreso_id: progreso?.id || null,
            completado: progreso?.completado || false
          };
        });
        setMisCursos(cursosMapeados);
      } catch (error) { console.error(error); }
      finally { setIsLoading(false); }
    }
    if (user) fetchCampus();
  }, [user, allCourses]);

  const marcarComoCompletado = async (cursoId, progresoId, cursoTitle) => {
    try {
      if (progresoId) {
        await supabase.from('progreso_cursos').update({ completado: true, fecha_completado: new Date().toISOString() }).eq('id', progresoId);
      } else {
        await supabase.from('progreso_cursos').insert([{ user_id: user.id, curso_id: cursoId, completado: true, fecha_completado: new Date().toISOString() }]);
      }
      setMisCursos(prev => prev.map(c => c.id === cursoId ? { ...c, completado: true } : c));
      
      // DISPARAR EDGE FUNCTION DEL DIPLOMA
      await supabase.functions.invoke('enviar-certificado', {
        body: { nombre_alumno: user.email.split('@')[0].toUpperCase(), email_alumno: user.email, nombre_curso: cursoTitle }
      });
      alert("¡Enhorabuena! Diploma enviado a tu correo.");
    } catch (e) { alert("Error al completar."); }
  };

  const enviarResena = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('resenas').insert([{ user_id: user.id, curso_id: resenaEnCurso, estrellas: puntos, comentario }]);
    if (!error) {
      setMisResenas([...misResenas, resenaEnCurso]);
      setResenaEnCurso(null);
      alert("¡Gracias por tu reseña!");
    }
  };

  const cursosFavoritos = allCourses.filter(curso => favIds.includes(Number(curso.id)));

  return (
    <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-gray-100 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-bimfli-navy rounded-2xl flex items-center justify-center text-white text-xl">🎓</div>
          <div>
            <h2 className="text-3xl font-black text-bimfli-navy uppercase tracking-widest">Mi Campus</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-8 mb-10 border-b border-gray-100">
        <button onClick={() => setActiveTab('mis-cursos')} className={`pb-4 px-2 font-black uppercase text-sm ${activeTab === 'mis-cursos' ? 'text-bimfli-pink border-b-4 border-bimfli-pink' : 'text-gray-300 hover:text-bimfli-navy cursor-pointer'}`}>Mis Cursos</button>
        <button onClick={() => setActiveTab('favoritos')} className={`pb-4 px-2 font-black uppercase text-sm flex items-center gap-2 ${activeTab === 'favoritos' ? 'text-bimfli-pink border-b-4 border-bimfli-pink' : 'text-gray-300 hover:text-bimfli-navy cursor-pointer'}`}>Lista de Deseos ({cursosFavoritos.length})</button>
      </div>

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <>
          {activeTab === 'mis-cursos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {misCursos.map((curso) => (
                <div key={curso.id} className={`p-6 rounded-3xl border-2 flex flex-col ${curso.completado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-bimfli-navy text-xl leading-tight">{curso.title}</h3>
                    {curso.completado && <span className="bg-green-500 text-white text-[10px] uppercase font-black py-1 px-3 rounded-full">Finalizado</span>}
                  </div>
                  <p className="text-sm text-gray-500 mb-6 grow">{curso.description}</p>
                  <div className="space-y-3 mt-auto">
                    <button className="w-full bg-white border-2 border-bimfli-navy text-bimfli-navy font-black py-2 rounded-xl text-xs uppercase tracking-widest cursor-pointer">Ver Contenido</button>
                    {!misResenas.includes(Number(curso.id)) && (
                      <button onClick={() => setResenaEnCurso(curso.id)} className="w-full bg-yellow-400 text-yellow-900 font-black py-2 rounded-xl text-[10px] uppercase tracking-widest">⭐ Valorar curso</button>
                    )}
                    {!curso.completado && (
                      <button onClick={() => marcarComoCompletado(curso.id, curso.progreso_id, curso.title)} className="w-full bg-bimfli-pink text-white font-black py-2 rounded-xl text-[10px] uppercase tracking-widest cursor-pointer">Marcar como terminado</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'favoritos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cursosFavoritos.map(curso => (
                <div key={`fav-${curso.id}`} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between relative">
                  <button onClick={() => onToggleFavorite(curso.id)} className="absolute top-4 right-4 text-red-500 cursor-pointer">❤️</button>
                  <div className="mb-6"><h4 className="font-black text-lg text-bimfli-navy mb-1">{curso.title}</h4><p className="text-xl font-black text-bimfli-pink">{curso.price}€</p></div>
                  <button onClick={() => onAddToCart(curso)} className="w-full bg-bimfli-navy text-white text-[10px] font-black py-3 rounded-xl uppercase tracking-widest">Añadir al carrito</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL RESEÑA REINSTALADO */}
      {resenaEnCurso && (
        <div className="fixed inset-0 bg-bimfli-navy/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-4xl w-full max-w-sm relative">
            <button onClick={() => setResenaEnCurso(null)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h3 className="font-black text-xl mb-6 uppercase text-center">Valorar Curso</h3>
            <div className="flex justify-center gap-2 mb-6 text-3xl">
              {[1,2,3,4,5].map(n => <button key={n} onClick={()=>setPuntos(n)} className={n <= puntos ? 'text-yellow-400' : 'text-gray-200'}>★</button>)}
            </div>
            <textarea value={comentario} onChange={(e)=>setComentario(e.target.value)} className="w-full bg-gray-50 border p-4 rounded-xl mb-4 h-32" placeholder="Tu opinión ayuda a otros alumnos..."/>
            <button onClick={enviarResena} className="w-full bg-bimfli-navy text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs">Publicar Reseña</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentArea;