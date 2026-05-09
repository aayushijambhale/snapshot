import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/useTheme';
import { motion } from 'motion/react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-orange-500 transition-all border border-neutral-200 dark:border-neutral-700 shadow-sm active:scale-90"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === 'light' ? 0 : 180, scale: [0.8, 1] }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
      >
        {theme === 'light' ? (
          <Moon className="w-4.5 h-4.5" />
        ) : (
          <Sun className="w-4.5 h-4.5" />
        )}
      </motion.div>
    </button>
  );
}
