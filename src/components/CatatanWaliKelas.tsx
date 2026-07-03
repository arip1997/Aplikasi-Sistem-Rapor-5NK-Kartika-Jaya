import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  { tag: '@excellent', text: 'Sangat membanggakan! Terus pertahankan prestasimu dan jadilah inspirasi bagi teman-temanmu.' },
  { tag: '@good', text: 'Perkembangan yang baik. Tingkatkan terus semangat belajarmu agar hasilnya lebih maksimal.' },
  { tag: '@needsimprovement', text: 'Masih perlu banyak bimbingan. Jangan ragu untuk bertanya jika ada materi yang kurang dipahami.' },
  { tag: '@active', text: 'Sangat aktif di kelas. Pertahankan antusiasmemu dalam mengikuti pelajaran.' },
  { tag: '@discipline', text: 'Sangat disiplin dan patuh pada aturan sekolah. Sikap yang patut dicontoh.' }
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  id?: string;
}

export function CatatanWaliKelas({ value, onChange, id }: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [query, setQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    
    // Check if we are typing a tag
    const match = textBeforeCursor.match(/@([a-zA-Z]*)$/);
    if (match) {
      setQuery('@' + match[1]);
      setCursorPos(cursor);
      
      // Calculate position
      // A simple approximation for the popup position
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  };

  const filtered = SUGGESTIONS.filter(s => s.tag.toLowerCase().startsWith(query.toLowerCase()));

  const handleSelect = (text: string) => {
    const before = value.slice(0, cursorPos - query.length);
    const after = value.slice(cursorPos);
    onChange(before + text + after);
    setShowPopup(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = before.length + text.length;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleInput}
        rows={3}
        placeholder="Catatan motivasi yang mendorong semangat... Ketik @ untuk saran (contoh: @excellent)"
        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-sans text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      {showPopup && filtered.length > 0 && (
        <div className="absolute z-10 bottom-full left-0 mb-1 w-64 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden flex flex-col">
          {filtered.map((s, i) => (
            <button
              key={i}
              onMouseDown={(e) => e.preventDefault()} // prevent blur
              onClick={() => handleSelect(s.text)}
              className="text-left px-3 py-2 text-xs hover:bg-emerald-50 cursor-pointer border-b border-slate-100 last:border-0"
            >
              <div className="font-bold text-emerald-700">{s.tag}</div>
              <div className="text-slate-600 line-clamp-2 mt-0.5">{s.text}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
