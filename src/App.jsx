import React, { useState, useEffect } from 'react';
import CourseCard from './components/CourseCard';
import StudentArea from './components/StudentArea';
import AdminArea from './components/AdminArea';
import { supabase } from './supabaseClient.js';
import { loadStripe } from '@stripe/stripe-js';
import ChatBot from './components/ChatBot';

// Inicializamos Stripe con tu clave pública
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

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) setCurrentView('store');
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchFavoritos() {
      if (user) {
        const { data } = await supabase.from('favoritos').select('curso_id').eq('user_id', user.id);
        if (data) setMisFavoritos(data.map(f => Number(f.curso_id)));
      } else {
        setMisFavoritos([]);
      }
    }
    fetchFavoritos();
  }, [user]);

  const toggleFavorito = async (cursoId) => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
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

  const isAdmin = user?.email === 'ism@bimfligames.com' || user?.email === 'leamsi120705@gmail.com'; 

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    const email = e.target[0].value;
    const password = e.target[1].value;
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else { setAuthSuccess('¡Cuenta creada!'); setTimeout(() => { setIsLoginOpen(false); setCurrentView('student'); }, 1500); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError('Error de acceso.');
      else { setIsLoginOpen(false); setCurrentView('student'); }
    }
  };

  const handleLogout = () => supabase.auth.signOut();
  const handleAddToCart = (course) => setCartItems([...cartItems, course]);
  const removeFromCart = (index) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    setCartItems(newCart);
  };
  
  const navigateFromMenu = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
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

  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.price, 0).toFixed(2);

  return (
    <div className="min-h-screen bg-bimfli-mint text-bimfli-navy font-sans flex flex-col relative scroll-smooth">
      {/* NAVBAR */}
      <nav className="h-20 px-6 md:px-8 flex justify-between items-center sticky top-0 bg-bimfli-mint/95 backdrop-blur-md z-40 border-b border-white/20">
        <div className="flex items-center w-1/4 gap-4">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-bimfli-navy p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer">
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
          <button onClick={() => setCurrentView('store')} className={`hidden md:block font-black uppercase tracking-widest text-xs cursor-pointer transition-colors ${currentView === 'store' ? 'text-bimfli-pink' : 'text-bimfli-navy hover:text-bimfli-blue'}`}>Tienda</button>
          {user && <button onClick={() => setCurrentView('student')} className={`hidden md:block font-black uppercase tracking-widest text-xs cursor-pointer transition-colors ${currentView === 'student' ? 'text-bimfli-pink' : 'text-bimfli-navy hover:text-bimfli-blue'}`}>Mi Área</button>}
        </div>

        <div className="w-1/2 flex justify-center">
          <img src="/bimfliLogo-final.png" alt="Bimfli" className={`h-16 w-auto object-contain transition-all duration-500 transform cursor-pointer ${isSticky ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`} onClick={() => {window.scrollTo({top: 0, behavior: 'smooth'}); setCurrentView('store');}} />
        </div>
        
        <div className="flex items-center justify-end gap-3 md:gap-6 w-1/4">
          {!user ? (
            <button onClick={() => {setIsLoginOpen(true); setIsRegistering(false);}} className="text-xs font-black uppercase tracking-tighter bg-white px-4 py-2 rounded-full shadow-sm hover:text-bimfli-pink cursor-pointer transition-colors">Entrar</button>
          ) : (
            <div className="flex items-center gap-4">
              {isAdmin && <button onClick={() => setCurrentView('admin')} className={`hidden md:block text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${currentView === 'admin' ? 'text-bimfli-pink' : 'text-bimfli-navy hover:text-bimfli-blue'}`}>Panel Jefe</button>}
              <button onClick={handleLogout} className="hidden md:block text-[10px] uppercase font-black text-gray-400 hover:text-red-500 cursor-pointer">Salir</button>
            </div>
          )}
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white rounded-full shadow-sm cursor-pointer hover:scale-110 transition-transform">
            🛒 {cartItems.length > 0 && <span className="absolute -top-1 -right-1 bg-bimfli-pink text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">{cartItems.length}</span>}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="absolute top-20 left-4 w-64 bg-white shadow-2xl rounded-2xl border border-gray-100 flex flex-col py-2 md:hidden z-50 overflow-hidden animate-fade-in-down">
            <button onClick={() => navigateFromMenu('store')} className={`text-left px-6 py-4 font-bold text-sm transition-colors border-b border-gray-50 ${currentView === 'store' ? 'text-bimfli-pink bg-pink-50/30' : 'text-bimfli-navy hover:bg-gray-50'}`}>Tienda</button>
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
            <div className="text-center mb-16 flex flex-col items-center">
              <img src="/bimfliLogo-final.png" alt="Bimfli Academy" className="h-40 md:h-56 w-auto object-contain mb-4 drop-shadow-xl" />
              <p className="text-lg md:text-xl font-bold text-bimfli-navy leading-relaxed max-w-2xl italic px-4">
                ¡Especialízate aprendiendo las últimas herramientas digitales!
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-bimfli-pink border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map(course => {
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

            {/* SECCIONES DETALLADAS CON OPINIONES REVISADAS */}
            {!isLoading && courses.length > 0 && (
              <div className="mt-32 flex flex-col gap-24">
                {courses.map(course => {
                  // Filtramos las reseñas de ESTE curso específico
                  const resenasDelCurso = resenas.filter(r => Number(r.curso_id) === Number(course.id));

                  return (
                    <div key={`detail-${course.id}`} id={`detalle-curso-${course.id}`} className="scroll-mt-32 bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100">
                      <h2 className="text-3xl md:text-4xl font-black text-bimfli-navy mb-4">{course.title}</h2>
                      <p className="text-xl text-bimfli-pink font-bold italic mb-8">Domina todas las herramientas profesionales paso a paso.</p>
                      
                      <div className="flex gap-4 overflow-x-auto mb-8 pb-4 snap-x">
                        <div className="min-w-70 h-48 bg-gray-200 rounded-2xl snap-center flex items-center justify-center text-gray-400 font-bold">Imagen 1</div>
                        <div className="min-w-70 h-48 bg-gray-200 rounded-2xl snap-center flex items-center justify-center text-gray-400 font-bold">Imagen 2</div>
                        <div className="min-w-70 h-48 bg-gray-200 rounded-2xl snap-center flex items-center justify-center text-gray-400 font-bold">Imagen 3</div>
                      </div>
                      
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

                      {/* NUEVA SECCIÓN DE COMENTARIOS DE ALUMNOS */}
                      <div className="pt-12 border-t border-gray-100">
                        <h3 className="text-2xl font-black text-bimfli-navy mb-6 uppercase tracking-widest">Opiniones de los alumnos</h3>
                        {resenasDelCurso.length === 0 ? (
                          <p className="text-gray-400 italic bg-gray-50 p-6 rounded-3xl text-center">Aún no hay opiniones para este curso. ¡Sé el primero en valorarlo al terminarlo!</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {resenasDelCurso.map((resena, idx) => (
                              <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex text-yellow-400 text-xl mb-3">
                                  {'★'.repeat(resena.estrellas)}{'☆'.repeat(5 - resena.estrellas)}
                                </div>
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
                      {/* FIN SECCIÓN COMENTARIOS */}

                    </div>
                  );
                })}
              </div>
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
              <button onClick={() => setIsRegistering(false)} className={`font-black uppercase tracking-widest text-sm pb-2 transition-colors cursor-pointer ${!isRegistering ? 'text-bimfli-navy border-b-2 border-bimfli-navy' : 'text-gray-300'}`}>Acceso</button>
              <button onClick={() => setIsRegistering(true)} className={`font-black uppercase tracking-widest text-sm pb-2 transition-colors cursor-pointer ${isRegistering ? 'text-bimfli-pink border-b-2 border-bimfli-pink' : 'text-gray-300'}`}>Nueva Cuenta</button>
            </div>
            {authError && <div className="bg-red-100 text-red-600 text-sm font-bold p-3 rounded-xl mb-4 text-center">{authError}</div>}
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <input type="email" required placeholder="tu@email.com" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-bimfli-navy focus:outline-none focus:border-bimfli-blue transition-all" />
              <input type="password" required placeholder="••••••••" minLength="6" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-bimfli-navy focus:outline-none focus:border-bimfli-blue transition-all" />
              <button type="submit" className={`w-full text-white font-black py-4 rounded-2xl mt-4 shadow-lg uppercase tracking-widest transition-colors cursor-pointer ${isRegistering ? 'bg-bimfli-blue hover:bg-blue-600' : 'bg-bimfli-pink hover:bg-pink-600'}`}>
                {isRegistering ? 'Crear Cuenta' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}
      <ChatBot />
    </div>
  );
}

export default App;