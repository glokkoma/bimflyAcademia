import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminArea() {
  const [cursos, setCursos] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para el formulario de crear curso
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        setIsLoading(true);
        // Traemos todos los cursos
        const { data: cursosData } = await supabase.from('courses').select('*');
        setCursos(cursosData || []);

        // Traemos todas las compras/matrículas para calcular ingresos
        const { data: matriculasData } = await supabase.from('progreso_cursos').select('*');
        setMatriculas(matriculasData || []);
      } catch (error) {
        console.error("Error cargando panel admin:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  // Función para guardar un nuevo curso en Supabase
  const handleCrearCurso = async (e) => {
    e.preventDefault();
    setCreando(true);

    try {
      const nuevoCurso = {
        title: titulo,
        description: descripcion,
        price: Number(precio)
      };

      const { data, error } = await supabase
        .from('courses')
        .insert([nuevoCurso])
        .select();

      if (error) throw error;

      alert("¡Curso creado con éxito en la base de datos!");
      setCursos([...cursos, data[0]]); // Actualizamos la lista en pantalla
      
      // Limpiamos el formulario
      setTitulo('');
      setDescripcion('');
      setPrecio('');
    } catch (error) {
      alert("Error al crear el curso: " + error.message);
    } finally {
      setCreando(false);
    }
  };

  // Cálculos matemáticos para las tarjetas de resumen
  const ingresosTotales = matriculas.reduce((total, mat) => {
    const cursoAsociado = cursos.find(c => Number(c.id) === Number(mat.curso_id));
    return total + (cursoAsociado ? cursoAsociado.price : 0);
  }, 0);

  // Para saber alumnos únicos (evitando contar al mismo alumno 2 veces)
  const alumnosUnicos = [...new Set(matriculas.map(m => m.user_id))].length;

  return (
    <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-gray-100 animate-fade-in-up">
      {/* CABECERA ADMIN */}
      <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-bimfli-navy rounded-2xl flex items-center justify-center text-white text-xl">👑</div>
          <div>
            <h2 className="text-3xl font-black text-bimfli-navy uppercase tracking-widest">Panel de Jefe</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Control Total de la Academia</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-bimfli-pink border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <>
          {/* TARJETAS DE MÉTRICAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
              <p className="text-green-600 text-[10px] font-black uppercase tracking-widest mb-2">Ingresos Estimados</p>
              <p className="text-4xl font-black text-green-700">{ingresosTotales.toFixed(2)}€</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <p className="text-bimfli-blue text-[10px] font-black uppercase tracking-widest mb-2">Alumnos Totales</p>
              <p className="text-4xl font-black text-bimfli-navy">{alumnosUnicos}</p>
            </div>
            <div className="bg-pink-50 p-6 rounded-3xl border border-pink-100">
              <p className="text-pink-600 text-[10px] font-black uppercase tracking-widest mb-2">Cursos Activos</p>
              <p className="text-4xl font-black text-pink-700">{cursos.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* ZONA 1: CREAR NUEVO CURSO */}
            <div className="bg-gray-50 p-8 rounded-4xl border border-gray-200">
              <h3 className="font-black text-bimfli-navy text-xl mb-6 uppercase tracking-widest">Añadir Nuevo Curso</h3>
              <form onSubmit={handleCrearCurso} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Título del curso</label>
                  <input 
                    type="text" 
                    required 
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: Curso de Unreal Engine 5" 
                    className="w-full bg-white rounded-xl px-5 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-bimfli-pink" 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Descripción</label>
                  <textarea 
                    required 
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Explica qué van a aprender..." 
                    className="w-full bg-white rounded-xl px-5 py-3 mt-1 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-bimfli-pink" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Precio (€)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="Ej: 49.99" 
                    className="w-full bg-white rounded-xl px-5 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-bimfli-pink" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={creando}
                  className="w-full bg-bimfli-navy text-white font-black py-4 rounded-xl mt-4 uppercase tracking-widest hover:bg-bimfli-blue transition-colors cursor-pointer"
                >
                  {creando ? 'Creando curso...' : 'Publicar Curso'}
                </button>
              </form>
            </div>

            {/* ZONA 2: LISTA DE CURSOS PUBLICADOS */}
            <div>
              <h3 className="font-black text-bimfli-navy text-xl mb-6 uppercase tracking-widest">Catálogo Actual</h3>
              <div className="flex flex-col gap-3">
                {cursos.map(curso => (
                  <div key={curso.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-black text-sm text-bimfli-navy">{curso.title}</p>
                      <p className="text-xs text-gray-400 font-bold">ID: {curso.id}</p>
                    </div>
                    <span className="bg-bimfli-mint text-bimfli-navy font-black text-xs px-3 py-1 rounded-lg">
                      {curso.price}€
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default AdminArea;