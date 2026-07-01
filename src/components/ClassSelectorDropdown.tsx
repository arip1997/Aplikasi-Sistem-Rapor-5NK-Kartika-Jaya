import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

interface ClassSelectorDropdownProps {
  classes: string[];
  selectedClass: string | null;
  onChange: (cls: string) => void;
  disabled: boolean;
}

const ClassSelectorDropdown = memo(({ classes, selectedClass, onChange, disabled }: ClassSelectorDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (cls: string) => {
    onChange(cls);
    setIsOpen(false);
  };

  return (
    <div className="relative flex-none" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between min-w-[120px] bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${disabled ? 'opacity-50 cursor-wait' : ''}`}
      >
        <span className="flex items-center gap-1.5 truncate text-slate-700">
          {classes.length === 0 ? "Belum Ada Data" : `Kelas ${selectedClass || ''}`}
        </span>
        <ChevronDown className="h-3.5 w-3.5 ml-2 text-slate-400 flex-none" />
      </button>

      <AnimatePresence>
        {isOpen && classes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1"
          >
            <div className="max-h-60 overflow-y-auto">
              {classes.map(cls => (
                <button
                  key={cls}
                  onClick={() => handleSelect(cls)}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-emerald-50 flex items-center justify-between ${selectedClass === cls ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600'}`}
                >
                  <span>Kelas {cls}</span>
                  {selectedClass === cls && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ClassSelectorDropdown.displayName = 'ClassSelectorDropdown';

export default ClassSelectorDropdown;
