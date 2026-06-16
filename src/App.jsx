import React, { useState, useEffect } from 'react';
import CourseCard from './components/CourseCard';
import StudentArea from './components/StudentArea';
import AdminArea from './components/AdminArea';
import { supabase } from './supabaseClient.js';
import { loadStripe } from '@stripe/stripe-js';
import ChatBot from './components/ChatBot';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSticky, setIsSticky] = useState(false);
  const [currentView, setCurrentView] = useState('store');
  const [misFavoritos, setMisFavoritos] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [activeDetailId, setActiveDetailId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    if (!localStorage.getItem('bimfli_cookies_accepted')) {
      setShowCookies(true);
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#detalle-curso-')) {
        setActiveDetailId(Number(hash.replace('#detalle-curso-', '')));
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      } else {
        setActiveDetailId(null);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        setIsLoading(true);
        const { data: coursesData, error: coursesError } = await supabase.from('courses').select('*');
        if (coursesError) throw coursesError;
        setCourses(coursesData || []);
        const { data: resenasData } = await supabase.from('resenas').select('*');
        setResenas(resenasData || []);
      } catch (error) { console.error(error.message); }
      finally { setIsLoading(false); }
    }
    fetchInitialData();
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setCurrentView('store');
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchFavoritos() {
      if (user) {
        const { data } = await supabase.from('favoritos').select('curso_id').eq('user_id', user.id);
        if (data) setMisFavoritos(data.map(f => Number(f.curso_id)));
      } else { setMisFavoritos([]); }
    }
    fetchFavoritos();
  }, [user]);

  const toggleFavorito = async (cursoId) => {
    if (!user) { setIsLoginOpen(true); return; }
    const idNum = Number(cursoId);
    const esFavorito = misFavoritos.includes(idNum);
    try {
      if (esFavorito) {
        await supabase.from('favoritos').delete().match({ user_id: user.id, curso_id: idNum });
        setMisFavoritos(prev => prev.filter(id => id !== idNum));
      } else {
        await supabase.from('favoritos').insert([{ user_id: user.id, curso_id: idNum }]);
        setMisFavoritos(prev => [...prev, idNum]);
      }
    } catch (error) { console.error(error); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    const email = e.target.email.value;
    const password = e.target.password.value;
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else { setAuthSuccess('¡Cuenta creada! Puedes iniciar sesión.'); setTimeout(() => { setIsRegistering(false); }, 1500); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError('Error de acceso. Comprueba tus datos.');
      else { setIsLoginOpen(false); setCurrentView('student'); }
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = document.querySelector('input[name="email"]');
    if (!emailInput || !emailInput.value) { setAuthError('Por favor, escribe tu correo arriba.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput.value);
    if (error) setAuthError(error.message);
    else setAuthSuccess('¡Te hemos enviado un enlace al correo para recuperar tu contraseña!');
  };

  const handleAcceptCookies = () => {
    localStorage.setItem('bimfli_cookies_accepted', 'true');
    setShowCookies(false);
  };

  const handleLogout = () => supabase.auth.signOut();
  const handleAddToCart = (course) => setCartItems([...cartItems, course]);
  const removeFromCart = (index) => { const newCart = [...cartItems]; newCart.splice(index, 1); setCartItems(newCart); };
  
  const resetToHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentView('store');
    window.location.hash = '';
    setActiveDetailId(null);
    setSearchTerm('');
    setSelectedCategory('Todos');
  };

  const navigateFromMenu = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    window.location.hash = '';
    setActiveDetailId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckout = async () => {
    try {
      setIsCheckoutLoading(true);
      const { data, error } = await supabase.functions.invoke('cobrar-carrito', { body: { items: cartItems } });
      if (data?.url) window.location.href = data.url;
    } catch (error) { alert('Error en el pago'); }
    finally { setIsCheckoutLoading(false); }
  };

  const scrollCarousel = (direction) => {
    const container = document.getElementById('carousel-track');
    if (container) {
      const scrollAmount = window.innerWidth < 768 ? 300 : 400; 
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const cursosFiltradosYVisibles = courses
    .filter(course => !activeDetailId || Number(course.id) !== activeDetailId) 
    .filter(course => {
      const cumpleTexto = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.description.toLowerCase().includes(searchTerm.toLowerCase());
      const categoriaCurso = course.category || 'General';
      const cumpleCategoria = selectedCategory === 'Todos' || categoriaCurso === selectedCategory;
      return cumpleTexto && cumpleCategoria;
    });

  const isAdmin = user?.email === 'ism@bimfligames.com' || user?.email === 'leamsi120705@gmail.com'; 
  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.price, 0).toFixed(2);

  return (
    <div className="min-h-screen bg-bimfli-mint text-bimfli-navy font-sans flex flex-col relative scroll-smooth overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="h-20 px-6 md:px-8 flex justify-between items-center sticky top-0 bg-bimfli-mint/60 backdrop-blur-xl z-40 border-b border-white/20 transition-all duration-300 shadow-sm">
        <div className="flex items-center w-1/4 gap-4">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-bimfli-navy p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer">
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
          <button onClick={resetToHome} className={`hidden md:block font-black uppercase tracking-widest text-xs cursor-pointer transition-colors ${currentView === 'store' ? 'text-bimfli-pink' : 'text-bimfli-navy hover:text-bimfli-blue'}`}>Tienda</button>
          {user && <button onClick={() => navigateFromMenu('student')} className={`hidden md:block font-black uppercase tracking-widest text-xs cursor-pointer transition-colors ${currentView === 'student' ? 'text-bimfli-pink' : 'text-bimfli-navy hover:text-bimfli-blue'}`}>Mi Área</button>}
        </div>

        <div className="w-1/2 flex justify-center">
          <img src="/bimfliLogo-final.png" alt="Bimfli" className={`h-16 w-auto object-contain transition-all duration-500 transform cursor-pointer ${isSticky ? 'opacity-100 scale-125 translate-y-1' : 'opacity-0 scale-75 pointer-events-none'}`} onClick={resetToHome} />
        </div>
        
        <div className="flex items-center justify-end gap-3 md:gap-6 w-1/4">
          {!user ? (
            <button onClick={() => {setIsLoginOpen(true); setIsRegistering(false); setAuthError(''); setAuthSuccess('');}} className="text-xs font-black uppercase tracking-tighter bg-white px-4 py-2 rounded-full shadow-sm hover:text-bimfli-pink cursor-pointer transition-colors">Entrar</button>
          ) : (
            <div className="flex items-center gap-4">
              {isAdmin && <button onClick={() => navigateFromMenu('admin')} className={`hidden md:block text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${currentView === 'admin' ? 'text-bimfli-pink' : 'text-bimfli-navy hover:text-bimfli-blue'}`}>Panel Jefe</button>}
              <button onClick={handleLogout} className="hidden md:block text-[10px] uppercase font-black text-gray-400 hover:text-red-500 cursor-pointer">Salir</button>
            </div>
          )}
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white rounded-full shadow-sm cursor-pointer hover:scale-110 transition-transform">
            🛒 {cartItems.length > 0 && <span className="absolute -top-1 -right-1 bg-bimfli-pink text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">{cartItems.length}</span>}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="absolute top-20 left-4 w-64 bg-white shadow-2xl rounded-2xl border border-gray-100 flex flex-col py-2 md:hidden z-50 overflow-hidden animate-fade-in-down">
            <button onClick={resetToHome} className={`text-left px-6 py-4 font-bold text-sm transition-colors border-b border-gray-50 ${currentView === 'store' ? 'text-bimfli-pink bg-pink-50/30' : 'text-bimfli-navy hover:bg-gray-50'}`}>Tienda</button>
            {user && <button onClick={() => navigateFromMenu('student')} className={`text-left px-6 py-4 font-bold text-sm transition-colors border-b border-gray-50 ${currentView === 'student' ? 'text-bimfli-pink bg-pink-50/30' : 'text-bimfli-navy hover:bg-gray-50'}`}>Mi Área</button>}
            {isAdmin && <button onClick={() => navigateFromMenu('admin')} className={`text-left px-6 py-4 font-bold text-sm transition-colors border-b border-gray-50 ${currentView === 'admin' ? 'text-bimfli-pink bg-pink-50/30' : 'text-bimfli-navy hover:bg-gray-50'}`}>Panel Jefe</button>}
            <a href="mailto:bimfligames@gmail.com" onClick={() => setIsMobileMenuOpen(false)} className="text-left px-6 py-4 font-bold text-sm text-gray-500 hover:bg-gray-50 hover:text-bimfli-navy transition-colors border-b border-gray-50">Contacto</a>
            {user && <button onClick={() => {handleLogout(); setIsMobileMenuOpen(false);}} className="text-left px-6 py-4 font-black text-xs uppercase tracking-widest text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">Cerrar Sesión</button>}
          </div>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-4 pb-32 grow w-full relative z-10">
        {currentView === 'store' && (
          <>
            {!activeDetailId && (
              <div className="animate-fade-in">
                <div className="text-center mb-12 flex flex-col items-center">
                  <img src="/bimfliLogo-final.png" alt="Bimfli Academy" className="h-40 md:h-56 w-auto object-contain mb-4 drop-shadow-xl" />
                  <p className="text-lg md:text-xl font-bold text-bimfli-navy leading-relaxed max-w-2xl italic px-4">
                    ¡Especialízate aprendiendo las últimas herramientas digitales!
                  </p>
                </div>

                {/* ARREGLO DE JEFE: He añadido 'overflow-hidden' al contenedor verde claro redondeado del fondo.
                   Esto recortará cualquier cosa de dentro (los cajones grises) que intente salirse de los bordes redondeados.
                */}
                <div className="relative w-full overflow-hidden mb-16 rounded-[3rem] shadow-sm bg-white/50 py-4 border border-white/20 group">
                  
                  {/* Botones Manuales */}
                  <button onClick={() => scrollCarousel('left')} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg p-4 rounded-full text-bimfli-pink hover:bg-bimfli-pink hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer hidden sm:block">◀</button>
                  
                  {/* Pista de scroll manual con arrastre suave */}
                  <div id="carousel-track" className="flex gap-6 overflow-x-auto snap-x px-12 pb-4 pt-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {[
                      "https://picsum.photos/id/0/600/400",
                      "https://picsum.photos/id/48/600/400",
                      "https://picsum.photos/id/119/600/400",
                      "https://picsum.photos/id/366/600/400",
                      "https://picsum.photos/id/180/600/400"
                    ].map((imgUrl, index) => (
                      <div key={index} className="w-72 md:w-96 h-48 md:h-64 bg-gray-200 rounded-4xl shrink-0 snap-center overflow-hidden shadow-md">
                        <img 
                          src={imgUrl} 
                          alt={`Academia Bimfli ${index + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  <button onClick={() => scrollCarousel('right')} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg p-4 rounded-full text-bimfli-pink hover:bg-bimfli-pink hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer hidden sm:block">▶</button>
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-bimfli-navy mb-8 uppercase tracking-widest text-center relative inline-block left-1/2 -translate-x-1/2">
                  Descubre nuestros cursos
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-bimfli-pink rounded-full"></span>
                </h2>

                {/* BUSCADOR Y FILTROS */}
                <div className="mb-12 max-w-2xl mx-auto flex flex-col gap-4 animate-fade-in-up">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="🔍 Buscar cursos por título o palabra clave..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-sm text-bimfli-navy focus:outline-none focus:ring-2 focus:ring-bimfli-pink shadow-sm transition-all"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-bimfli-pink font-black text-xs">✕ BORRAR</button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Todos', 'Modelado 3D', 'Programación', 'Motores de Juego', 'General'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border ${selectedCategory === cat ? 'bg-bimfli-navy text-white border-bimfli-navy shadow-md scale-105' : 'bg-white text-bimfli-navy border-gray-100 hover:border-bimfli-pink'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECCION DETALLE SEPARADO */}
            {activeDetailId && (
              <div className="animate-fade-in-up mb-24">
                <button onClick={resetToHome} className="mb-8 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-bimfli-pink transition-colors cursor-pointer flex items-center gap-2">
                  <span>←</span> Volver al catálogo principal
                </button>
                
                {courses.filter(c => Number(c.id) === activeDetailId).map(course => {
                  const resenasDelCurso = resenas.filter(r => Number(r.curso_id) === Number(course.id));
                  return (
                    <div key={`detail-${course.id}`} id={`detalle-curso-${course.id}`} className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100">
                      <h2 className="text-3xl md:text-4xl font-black text-bimfli-navy mb-4">{course.title}</h2>
                      <p className="text-xl text-bimfli-pink font-bold italic mb-8">Domina todas las herramientas profesionales paso a paso.</p>
                      
                      <p className="text-gray-600 mb-10 leading-relaxed">
                        {course.description} 
                        <br /><br />
                        Esta es la sección perfecta para incrustar el texto completo de la web externa.
                      </p>
                      
                      <details className="group bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden cursor-pointer mb-12">
                        <summary className="font-black p-6 text-bimfli-navy list-none flex justify-between items-center hover:bg-gray-100 transition-colors">
                          VER TEMARIO COMPLETO
                          <svg className="w-6 h-6 transform group-open:rotate-180 transition-transform text-bimfli-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </summary>
                        <div className="p-6 border-t border-gray-200 text-gray-600 bg-white">
                          <ul className="list-disc pl-5 space-y-3 font-medium">
                            <li>Módulo 1: Introducción a la herramienta.</li>
                            <li>Módulo 2: Creación de proyectos desde cero.</li>
                            <li>Módulo 3: Exportación y buenas prácticas.</li>
                            <li>Módulo 4: Proyecto final.</li>
                          </ul>
                        </div>
                      </details>

                      <div className="pt-12 border-t border-gray-100">
                        <h3 className="text-2xl font-black text-bimfli-navy mb-6 uppercase tracking-widest">Opiniones de los alumnos</h3>
                        {resenasDelCurso.length === 0 ? (
                          <p className="text-gray-400 italic bg-gray-50 p-6 rounded-3xl text-center">Aún no hay opiniones para este curso.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {resenasDelCurso.map((resena, idx) => (
                              <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex text-yellow-400 text-xl mb-3">{'★'.repeat(resena.estrellas)}{'☆'.repeat(5 - resena.estrellas)}</div>
                                <p className="text-gray-600 italic leading-relaxed mb-4 text-sm">"{resena.comentario}"</p>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-bimfli-navy rounded-full flex items-center justify-center text-white text-xs font-black">🎓</div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alumno Verificado</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <h3 className="text-2xl font-black text-bimfli-navy mt-24 mb-10 uppercase tracking-widest border-t border-white/20 pt-12 text-center">
                  Otros cursos que te pueden interesar
                </h3>
              </div>
            )}

            {/* CUADRÍCULA DE TARJETAS */}
            {isLoading ? (
              <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-bimfli-pink border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <>
                {cursosFiltradosYVisibles.length === 0 ? (
                  <p className="text-center text-gray-400 italic py-10 bg-white rounded-3xl border border-gray-100 max-w-md mx-auto">No se ha encontrado ningún curso que coincida con tu búsqueda.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {cursosFiltradosYVisibles.map(course => {
                      const res = resenas.filter(r => Number(r.curso_id) === Number(course.id));
                      const media = res.length > 0 ? (res.reduce((acc, r) => acc + r.estrellas, 0) / res.length).toFixed(1) : 0;
                      return (
                        <CourseCard 
                          key={course.id} 
                          course={course} 
                          onAddToCart={handleAddToCart}
                          isFavorite={misFavoritos.includes(Number(course.id))}
                          onToggleFavorite={() => toggleFavorito(course.id)}
                          rating={media}
                          numReviews={res.length}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {currentView === 'student' && user && (
          <StudentArea 
            user={user} 
            allCourses={courses} 
            favIds={misFavoritos} 
            onToggleFavorite={toggleFavorito}
            onAddToCart={handleAddToCart}
          />
        )}
        {currentView === 'admin' && isAdmin && <AdminArea />}
      </main>

      {/* FOOTER */}
      <footer className="bg-bimfli-navy text-gray-300 py-16 px-8 mt-auto rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <img src="/bimfliLogo-final.png" alt="Logo" className="h-20 w-auto object-contain mb-6 brightness-200 grayscale" />
            <div className="flex flex-col gap-2">
              <h4 className="text-white font-black uppercase tracking-widest text-xs mb-1">Contacta con nosotros</h4>
              <p className="text-xs text-gray-400 font-bold leading-tight">C/ Beatas, 34, Promálaga<br />(Málaga TechPark) 29008 Málaga</p>
              <a href="mailto:bimfligames@gmail.com" className="text-xs text-bimfli-pink font-black hover:underline">bimfligames@gmail.com</a>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h4 className="text-white font-black uppercase tracking-widest mb-6 text-sm">Legal</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><a href="#" className="text-gray-400 hover:text-bimfli-pink transition-colors">Privacidad</a></li>
              <li><a href="#" className="text-gray-400 hover:text-bimfli-blue transition-colors">Cookies</a></li>
              <li><a href="#" className="text-gray-400 hover:text-bimfli-mint transition-colors">Aviso legal</a></li>
            </ul>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h4 className="text-white font-black uppercase tracking-widest mb-6 text-sm">Ecosistema</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Bimfli Games</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Bimfli Shop</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Bimfli Academy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-white/10 mt-16 pt-8 text-center md:text-left text-xs font-bold text-gray-500 uppercase tracking-widest"><p>&copy; {new Date().getFullYear()} Bimfli Games. Todos los derechos reservados.</p></div>
      </footer>

      {/* MODAL CARRITO */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-bimfli-navy/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white h-full w-full max-w-md p-8 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-bimfli-navy uppercase">Tu Carrito</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-bimfli-pink cursor-pointer">✕</button>
            </div>
            <div className="grow overflow-y-auto">
              {cartItems.length === 0 ? <p className="text-center text-gray-300 font-bold mt-20 italic">El carrito está vacío.</p> : (
                <div className="flex flex-col gap-4">
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="grow text-sm"><h4 className="font-bold text-bimfli-navy leading-tight">{item.title}</h4><p className="text-bimfli-pink font-black">{item.price}€</p></div>
                      <button onClick={() => removeFromCart(index)} className="text-gray-300 hover:text-red-500 cursor-pointer">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 pt-6 mt-6">
              <div className="flex justify-between items-center mb-6"><span className="text-lg font-bold text-gray-400 uppercase tracking-widest">Total</span><span className="text-3xl font-black text-bimfli-navy">{totalCartPrice}€</span></div>
              <button onClick={handleCheckout} disabled={cartItems.length === 0 || isCheckoutLoading} className="w-full bg-bimfli-pink text-white font-black py-4 rounded-2xl shadow-lg hover:bg-pink-600 transition-all uppercase tracking-widest flex justify-center items-center gap-2 cursor-pointer">
                {isCheckoutLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Comprar ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AUTH */}
      {isLoginOpen && (
        <div className="fixed inset-0 bg-bimfli-navy/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl">
            <button onClick={() => setIsLoginOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-bimfli-pink cursor-pointer">✕</button>
            <div className="flex justify-center gap-6 mb-6 border-b border-gray-100 pb-2">
              <button onClick={() => { setIsRegistering(false); setAuthError(''); setAuthSuccess(''); }} className={`font-black uppercase tracking-widest text-sm pb-2 transition-colors cursor-pointer ${!isRegistering ? 'text-bimfli-navy border-b-2 border-bimfli-navy' : 'text-gray-300'}`}>Acceso</button>
              <button onClick={() => { setIsRegistering(true); setAuthError(''); setAuthSuccess(''); }} className={`font-black uppercase tracking-widest text-sm pb-2 transition-colors cursor-pointer ${isRegistering ? 'text-bimfli-pink border-b-2 border-bimfli-pink' : 'text-gray-300'}`}>Nueva Cuenta</button>
            </div>
            {authError && <div className="bg-red-100 text-red-600 text-sm font-bold p-3 rounded-xl mb-4 text-center">{authError}</div>}
            {authSuccess && <div className="bg-green-100 text-green-700 text-sm font-bold p-3 rounded-xl mb-4 text-center">{authSuccess}</div>}
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <input name="email" type="email" required placeholder="tu@email.com" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-bimfli-navy focus:outline-none focus:border-bimfli-blue transition-all" />
              <div className="relative w-full">
                <input name="password" type={showPassword ? "text" : "password"} required placeholder="••••••••" minLength="6" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-bimfli-navy focus:outline-none focus:border-bimfli-blue transition-all pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-bimfli-pink cursor-pointer transition-colors" title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPassword ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
              {!isRegistering && <button type="button" onClick={handleForgotPassword} className="text-right text-[10px] font-bold text-gray-400 hover:text-bimfli-pink transition-colors -mt-2 cursor-pointer">¿Olvidaste tu contraseña?</button>}
              {isRegistering && (
                <label className="flex items-center gap-3 -mt-1 cursor-pointer group">
                  <input type="checkbox" required className="w-4 h-4 text-bimfli-pink border-gray-300 rounded focus:ring-bimfli-pink cursor-pointer" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-bimfli-navy transition-colors">Acepto los <a href="#" className="text-bimfli-pink hover:underline">términos y condiciones</a></span>
                </label>
              )}
              <button type="submit" className={`w-full text-white font-black py-4 rounded-2xl mt-2 shadow-lg uppercase tracking-widest transition-colors cursor-pointer ${isRegistering ? 'bg-bimfli-blue hover:bg-blue-600' : 'bg-bimfli-pink hover:bg-pink-600'}`}>
                {isRegistering ? 'Crear Cuenta' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COOKIES */}
      {showCookies && (
        <div className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 bg-white/95 backdrop-blur-md border border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 md:p-8 rounded-4xl z-100 flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in-up">
          <div className="text-sm text-gray-600 max-w-3xl">
            <h4 className="font-black text-bimfli-navy text-lg mb-2 uppercase tracking-widest flex items-center gap-2">🍪 Configuración de Cookies</h4>
            <p className="leading-relaxed">Utilizamos cookies propias y de terceros para mejorar nuestros servicios y analizar su navegación de forma totalmente anónima.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button onClick={() => alert("Configuración detallada.")} className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-bimfli-navy hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-center">Modificar</button>
            <button onClick={handleAcceptCookies} className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer text-center">Rechazar</button>
            <button onClick={handleAcceptCookies} className="px-8 py-3 bg-bimfli-pink text-white text-xs font-black rounded-xl uppercase tracking-widest hover:bg-pink-600 transition-all shadow-lg cursor-pointer text-center">Aceptar todas</button>
          </div>
        </div>
      )}
      <ChatBot />
    </div>
  );
}

export default App;