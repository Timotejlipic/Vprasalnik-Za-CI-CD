import React, { useState, useRef } from 'react';

export default function Collapsible({ title, defaultOpen = false, children, headerStyle = {}, wrapperStyle = {} }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);

  const toggle = () => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      el.style.height = el.scrollHeight + 'px';
      el.getBoundingClientRect();
      el.style.height = '0';
    } else {
      el.style.height = el.scrollHeight + 'px';
      const done = () => {
        el.style.height = 'auto';
        el.removeEventListener('transitionend', done);
      };
      el.addEventListener('transitionend', done);
    }
    setOpen(o => !o);
  };

  return (
    <div style={{ border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden', ...wrapperStyle }}>
      <div
        onClick={toggle}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', ...headerStyle }}
      >
        {title}
        <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: '1.1rem', flexShrink: 0, marginLeft: '10px' }}>▸</span>
      </div>
      <div ref={bodyRef} style={{ height: defaultOpen ? 'auto' : '0', overflow: 'hidden', transition: 'height 0.25s ease' }}>
        {children}
      </div>
    </div>
  );
}
