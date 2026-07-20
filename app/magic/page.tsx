import MagicButton from '@/components/MagicButton';

export default function MagicPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-100">
      <h1 className="text-3xl font-bold mb-8 text-black">Тест ИИ-Магии ✨</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg flex flex-col items-center">
        {/* Тестовая картинка из Unsplash */}
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop" 
          alt="Архитектура" 
          className="rounded-lg mb-6 w-full h-64 object-cover"
        />
        
        {/* Наша кнопка */}
        <MagicButton category="архитектура" />
      </div>
    </div>
  );
}
