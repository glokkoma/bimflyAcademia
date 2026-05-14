import React from 'react';

function CourseCard({ course, onAddToCart, isFavorite, onToggleFavorite, rating, numReviews }) {
  
  // Función para dibujar las estrellitas visuales
  const renderStars = (nota) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= Math.round(nota) ? "text-yellow-400" : "text-gray-200"}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="relative bg-white rounded-3xl p-6 shadow-md border border-gray-100 flex flex-col h-full hover:shadow-lg transition-shadow">
      
      {/* --- BOTÓN DE FAVORITOS --- */}
      <button 
        onClick={onToggleFavorite}
        className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform cursor-pointer"
        title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
      >
        <svg 
          className={`w-6 h-6 transition-colors ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-300 hover:text-red-400'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
      </button>
      {/* -------------------------------- */}

      <div className="grow mt-4">
        
        {/* --- NUEVA SECCIÓN DE ESTRELLAS --- */}
        <div className="flex items-center gap-2 mb-2 mt-2">
          <div className="text-lg flex">
            {numReviews > 0 ? (
              renderStars(rating)
            ) : (
              <span className="text-[10px] font-black bg-blue-50 text-bimfli-blue px-2 py-1 rounded-md uppercase tracking-tighter">
                Nuevo curso
              </span>
            )}
          </div>
          {numReviews > 0 && (
            <span className="text-xs font-bold text-gray-400">
              ({rating}) <span className="font-medium">· {numReviews} {numReviews === 1 ? 'reseña' : 'reseñas'}</span>
            </span>
          )}
        </div>
        {/* ---------------------------------- */}

        <h3 className="text-xl font-black text-bimfli-navy mb-2">{course.title}</h3>
        <p className="text-sm text-gray-500 mb-4">{course.description}</p>
        <p className="text-2xl font-black text-bimfli-pink mb-6">{course.price}€</p>
      </div>
      
      <div className="flex flex-col gap-3 mt-auto">
        <button 
          onClick={() => onAddToCart(course)}
          className="w-full bg-bimfli-navy text-white font-black py-3 rounded-xl hover:bg-blue-900 transition-colors uppercase tracking-widest text-xs cursor-pointer"
        >
          Añadir al carrito
        </button>
        
        {/* Enlace ancla para hacer scroll automático hacia la sección de detalles */}
        <a 
          href={`#detalle-curso-${course.id}`}
          className="w-full text-center bg-white text-bimfli-pink border-2 border-bimfli-pink font-black py-3 rounded-xl hover:bg-pink-50 transition-colors uppercase tracking-widest text-xs cursor-pointer block"
        >
          Saber más
        </a>
      </div>
    </div>
  );
}

export default CourseCard;