import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function StudentArea({ user, allCourses = [], favIds = [], onToggleFavorite, onAddToCart }) {
  const [misCursos, setMisCursos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mis-cursos');

  // ESTADOS PARA RESEÑAS
  const [resenaEnCurso, setResenaEnCurso] = useState(null);
  const [puntos, setPuntos] = useState(5);
  const [comentario, setComentario] = useState('');
  const [misResenas, setMisResenas] = useState([]);

  // ESTADOS PARA EL PERFIL
  const [nombreReal, setNombreReal] = useState(user?.user_metadata?.full_name || '');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  // --- NUEVO: ESTADO PARA LA SALA DE CLASES ---
  const [cursoActivo, setCursoActivo] = useState(null);
  const modulosTotales = 4; // Simulamos que cada curso tiene 4 módulos por ahora

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
            completado: progreso?.completado || false,
            modulos_completados: progreso?.modulos_completados || [] // Recuperamos los módulos vistos
          };
        });
        setMisCursos(cursosMapeados);
      } catch (error) { console.error(error); }
      finally { setIsLoading(false); }
    }
    if (user) fetchCampus();
  }, [user, allCourses]);

  // --- NUEVA FUNCIÓN: MARCAR MÓDULO COMO VISTO ---
  const toggleModulo = async (cursoId, progresoId, numeroModulo, cursoTitle, modulosActuales) => {
    try {
      const yaCompletado = modulosActuales.includes(numeroModulo);
      const nuevosModulos = yaCompletado 
        ? modulosActuales.filter(m => m !== numeroModulo) 
        : [...modulosActuales, numeroModulo];
      
      const es100PorCiento = nuevosModulos.length === modulosTotales;

      if (progresoId) {
        await supabase.from('progreso_cursos').update({ 
          modulos_completados: nuevosModulos,
          completado: es100PorCiento,
          fecha_completado: es100PorCiento ? new Date().toISOString() : null
        }).eq('id', progresoId);
      } else {
        // Si no había registro de progreso, lo creamos
        const { data } = await supabase.from('progreso_cursos').insert([{ 
          user_id: user.id, 
          curso_id: cursoId, 
          modulos_completados: nuevosModulos,
          completado: es100PorCiento 
        }]).select();
        progresoId = data[0].id;
      }

      // Actualizamos la pantalla al instante
      setMisCursos(prev => prev.map(c => c.id === cursoId ? { ...c, modulos_completados: nuevosModulos, completado: es100PorCiento, progreso_id: progresoId } : c));

      // Si acaba de llegar al 100%, lanzamos el diploma automáticamente
      if (es100PorCiento && !yaCompletado) {
        const nombreParaCertificado = nombreReal.trim() !== '' ? nombreReal.toUpperCase() : user.email.split('@')[0].toUpperCase();
        await supabase.functions.invoke('enviar-certificado', {
          body: { nombre_alumno: nombreParaCertificado, email_alumno: user.email, nombre_curso: cursoTitle }
        });
        alert(`¡🎉 100% COMPLETADO! 🎉\nEl diploma se ha generado a nombre de "${nombreParaCertificado}" y ha sido enviado a tu correo.`);
      }

    } catch (e) { alert("Error al guardar el progreso."); }
  };

  // Mantengo tus funciones anteriores intactas
  const enviarResena = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('resenas').insert([{ user_id: user.id, curso_id: resenaEnCurso, estrellas: puntos, comentario }]);
    if (!error) { setMisResenas([...misResenas, resenaEnCurso]); setResenaEnCurso(null); alert("¡Gracias por tu reseña!"); }
  };

  const handleActualizarPerfil = async (e) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: nombreReal } });
      if (error) throw error;
      alert("¡Perfil actualizado!");
    } catch (error) { alert("Error: " + error.message); } 
    finally { setGuardandoPerfil(false); }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (nuevaPassword !== confirmarPassword) return alert("Las contraseñas no coinciden.");
    setGuardandoPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
      if (error) throw error;
      alert("¡Contraseña cambiada!"); setNuevaPassword(''); setConfirmarPassword('');
    } catch (error) { alert("Error: " + error.message); } 
    finally { setGuardandoPassword(false); }
  };

  const cursosFavoritos = allCourses.filter(curso => favIds.includes(Number(curso.id)));

  // ==========================================
  // VISTA 2: LA SALA DE CLASES (REPRODUCTOR)
  // ==========================================
  if (cursoActivo) {
    const progresoPorcentaje = (cursoActivo.modulos_completados.length / modulosTotales) * 100;

    return (
      <div className="bg-white rounded-[3rem] p-6 md:p-8 shadow-sm border border-gray-100 animate-fade-in-up">
        {/* Cabecera Sala de Clases */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
          <button onClick={() => setCursoActivo(null)} className="text-gray-400 hover:text-bimfli-navy font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer">
            <span>←</span> Volver al Campus
          </button>
          <div className="text-right">
            <h2 className="text-xl font-black text-bimfli-navy">{cursoActivo.title}</h2>
            <p className="text-[10px] text-bimfli-pink font-bold uppercase tracking-widest">Sala de Estudio</p>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="mb-10 bg-gray-50 p-6 rounded-3xl border border-gray-100">
          <div className="flex justify-between items-end mb-3">
            <p className="text-xs font-black text-bimfli-navy uppercase tracking-widest">Tu Progreso</p>
            <p className="text-2xl font-black text-bimfli-pink">{Math.round(progresoPorcentaje)}%</p>
          </div>
          <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
            <div 
              className="bg-bimfli-pink h-full transition-all duration-1000 ease-out" 
              style={{ width: `${progresoPorcentaje}%` }}
            ></div>
          </div>
        </div>

        {/* Estructura del curso (Video + Temario) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Zona Reproductor (Ocupa 2 columnas) */}
          <div className="lg:col-span-2">
            <div className="aspect-video bg-bimfli-navy rounded-3xl flex items-center justify-center relative overflow-hidden shadow-lg group">
              <span className="text-white font-black text-xl z-10">▶ Reproductor de Vídeo</span>
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
            </div>
            <h3 className="font-black text-2xl text-bimfli-navy mt-6 mb-2">Introducción y Conceptos Básicos</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Bienvenido a la primera clase. Aquí aprenderás las bases de la herramienta, cómo moverte por la interfaz y configuraremos tu primer proyecto desde cero.</p>
          </div>

          {/* Zona Temario / Checklists */}
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 h-fit">
            <h4 className="font-black text-sm text-bimfli-navy mb-6 uppercase tracking-widest border-b border-gray-200 pb-4">Temario del Curso</h4>
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map(num => {
                const completado = cursoActivo.modulos_completados.includes(num);
                return (
                  <button 
                    key={num}
                    onClick={() => {
                      toggleModulo(cursoActivo.id, cursoActivo.progreso_id, num, cursoActivo.title, cursoActivo.modulos_completados);
                      // Actualizamos el estado local para ver la barra moverse al instante
                      setCursoActivo(prev => ({
                        ...prev, 
                        modulos_completados: completado 
                          ? prev.modulos_completados.filter(m => m !== num) 
                          : [...prev.modulos_completados, num]
                      }));
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all border-2 cursor-pointer ${completado ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-transparent hover:border-bimfli-pink shadow-sm'}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${completado ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
                      ✓
                    </div>
                    <div>
                      <p className={`font-black text-sm leading-tight ${completado ? 'text-green-700' : 'text-bimfli-navy'}`}>Módulo {num}</p>
                      <p className={`text-[10px] uppercase font-bold mt-1 ${completado ? 'text-green-600' : 'text-gray-400'}`}>
                        {completado ? 'Completado' : 'Pendiente'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 1: DASHBOARD NORMAL (TU CÓDIGO ACTUAL)
  // ==========================================
  return (
    <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-gray-100 animate-fade-in-up">
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-bimfli-navy rounded-2xl flex items-center justify-center text-white text-xl">🎓</div>
          <div>
            <h2 className="text-3xl font-black text-bimfli-navy uppercase tracking-widest">Mi Campus</h2>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
              {nombreReal ? `${nombreReal} (${user.email})` : user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-4 md:gap-8 mb-10 border-b border-gray-100">
        <button onClick={() => setActiveTab('mis-cursos')} className={`pb-4 px-2 font-black uppercase text-sm cursor-pointer ${activeTab === 'mis-cursos' ? 'text-bimfli-pink border-b-4 border-bimfli-pink' : 'text-gray-300 hover:text-bimfli-navy'}`}>Mis Cursos</button>
        <button onClick={() => setActiveTab('favoritos')} className={`pb-4 px-2 font-black uppercase text-sm flex items-center gap-2 cursor-pointer ${activeTab === 'favoritos' ? 'text-bimfli-pink border-b-4 border-bimfli-pink' : 'text-gray-300 hover:text-bimfli-navy'}`}>Lista de Deseos ({cursosFavoritos.length})</button>
        <button onClick={() => setActiveTab('perfil')} className={`pb-4 px-2 font-black uppercase text-sm cursor-pointer ${activeTab === 'perfil' ? 'text-bimfli-pink border-b-4 border-bimfli-pink' : 'text-gray-300 hover:text-bimfli-navy'}`}>⚙️ Mi Perfil</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-bimfli-pink border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <>
          {activeTab === 'mis-cursos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {misCursos.length === 0 ? <p className="text-gray-400 italic col-span-2 text-center py-6">Aún no estás inscrito en ningún curso.</p> : (
                misCursos.map((curso) => (
                  <div key={curso.id} className={`p-6 rounded-3xl border-2 flex flex-col ${curso.completado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-black text-bimfli-navy text-xl leading-tight">{curso.title}</h3>
                      {curso.completado && <span className="bg-green-500 text-white text-[10px] uppercase font-black py-1 px-3 rounded-full">100%</span>}
                    </div>
                    
                    {/* Mini barra de progreso en la tarjeta */}
                    <div className="mb-6 mt-auto">
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-bimfli-pink h-full" style={{ width: `${(curso.modulos_completados.length / modulosTotales) * 100}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* BOTÓN MÁGICO PARA ABRIR LA SALA DE CLASES */}
                      <button onClick={() => setCursoActivo(curso)} className="w-full bg-white border-2 border-bimfli-navy text-bimfli-navy font-black py-2 rounded-xl text-xs uppercase tracking-widest cursor-pointer hover:bg-bimfli-navy hover:text-white transition-colors">
                        Ir a Clase
                      </button>
                      
                      {!misResenas.includes(Number(curso.id)) && curso.completado && (
                        <button onClick={() => setResenaEnCurso(curso.id)} className="w-full bg-yellow-400 text-yellow-900 font-black py-2 rounded-xl text-[10px] uppercase tracking-widest">⭐ Valorar curso</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'favoritos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cursosFavoritos.map(curso => (
                <div key={`fav-${curso.id}`} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between relative">
                  <button onClick={() => onToggleFavorite(curso.id)} className="absolute top-4 right-4 text-red-500 cursor-pointer">❤️</button>
                  <div className="mb-6"><h4 className="font-black text-lg text-bimfli-navy mb-1">{curso.title}</h4><p className="text-xl font-black text-bimfli-pink">{curso.price}€</p></div>
                  <button onClick={() => onAddToCart(curso)} className="w-full bg-bimfli-navy text-white text-[10px] font-black py-3 rounded-xl uppercase tracking-widest cursor-pointer">Añadir al carrito</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'perfil' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* ... (Todo tu código del perfil sigue aquí intacto) ... */}
              <div className="bg-gray-50 p-6 md:p-8 rounded-4xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-xl text-bimfli-navy mb-2 uppercase tracking-widest">Datos Personales</h3>
                  <p className="text-xs text-gray-400 font-bold mb-6 uppercase">Configura cómo aparecerás en la plataforma.</p>
                  <form onSubmit={handleActualizarPerfil} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nombre y Apellidos Oficiales</label>
                      <input type="text" required value={nombreReal} onChange={(e) => setNombreReal(e.target.value)} placeholder="Ej: Juan Pérez García" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 mt-1 text-sm text-bimfli-navy focus:outline-none focus:border-bimfli-pink" />
                      <p className="text-[9px] text-bimfli-pink font-bold mt-2 ml-2 uppercase">⚠️ Es muy importante que uses tu nombre real para los diplomas.</p>
                    </div>
                    <button type="submit" disabled={guardandoPerfil} className="w-full bg-bimfli-navy text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-blue-900 transition-colors disabled:opacity-50 cursor-pointer">{guardandoPerfil ? 'Guardando...' : 'Guardar Nombre'}</button>
                  </form>
                </div>
              </div>

              <div className="bg-gray-50 p-6 md:p-8 rounded-4xl border border-gray-100">
                <h3 className="font-black text-xl text-bimfli-navy mb-2 uppercase tracking-widest">Seguridad</h3>
                <p className="text-xs text-gray-400 font-bold mb-6 uppercase">Actualiza tu contraseña de acceso.</p>
                <form onSubmit={handleCambiarPassword} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nueva Contraseña</label>
                    <input type="password" required minLength="6" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 mt-1 text-sm focus:outline-none focus:border-bimfli-blue" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Confirmar Nueva Contraseña</label>
                    <input type="password" required minLength="6" value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)} placeholder="Repite la contraseña" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 mt-1 text-sm focus:outline-none focus:border-bimfli-blue" />
                  </div>
                  <button type="submit" disabled={guardandoPassword} className="w-full bg-bimfli-blue text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-blue-600 transition-colors disabled:opacity-50 cursor-pointer">{guardandoPassword ? 'Actualizando...' : 'Cambiar Contraseña'}</button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL RESEÑA */}
      {resenaEnCurso && (
        <div className="fixed inset-0 bg-bimfli-navy/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-4xl w-full max-w-sm relative">
            <button onClick={() => setResenaEnCurso(null)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h3 className="font-black text-xl mb-6 uppercase text-center text-bimfli-navy">Valorar Curso</h3>
            <div className="flex justify-center gap-2 mb-6 text-3xl">
              {[1,2,3,4,5].map(n => <button key={n} onClick={()=>setPuntos(n)} className={n <= puntos ? 'text-yellow-400' : 'text-gray-200'}>★</button>)}
            </div>
            <textarea value={comentario} onChange={(e)=>setComentario(e.target.value)} className="w-full bg-gray-50 border p-4 rounded-xl mb-4 h-32 text-sm focus:outline-none" placeholder="Tu opinión ayuda a otros alumnos..."/>
            <button onClick={enviarResena} className="w-full bg-bimfli-navy text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs cursor-pointer">Publicar Reseña</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentArea;