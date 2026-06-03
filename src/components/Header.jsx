import React, { useState, useEffect } from 'react';

export default function Header({ toggleSidebar, isSidebarOpen }) {
  const [isLight, setIsLight] = useState(document.documentElement.classList.contains('light'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const nextLight = !isLight;
    if (nextLight) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
    setIsLight(nextLight);
  };

  return (
    <div className="header flex justify-between items-center">
      <div className="flex items-center gap-3">
        <button
          className="btn btn-ghost p-[5px_9px] text-[1.1rem] leading-none"
          onClick={toggleSidebar}
          title={isSidebarOpen ? 'Zapri stransko vrstico' : 'Odpri stransko vrstico'}
        >
          ☰
        </button>
        <span className="header-title">Ocenjevanje CI/CD cevovodov</span>
      </div>
      <button
        onClick={toggleTheme}
        className="btn btn-ghost flex items-center gap-1.5 p-[6px_12px] text-[0.9rem] rounded-lg cursor-pointer"
        title={isLight ? 'Preklopi na temen način' : 'Preklopi na svetel način'}
      >
        {isLight ? '🌙 Temen način' : '☀️ Svetel način'}
      </button>
    </div>
  );
}
