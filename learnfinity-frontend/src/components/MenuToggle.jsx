// src/components/MenuToggle.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { useMenu } from '../context/MenuContext';

const MenuToggle = () => {
    const { toggleMenu, isMenuOpen } = useMenu();

    return (
        <motion.button
            onClick={toggleMenu}
            className="fixed top-6 right-8 w-12 h-12 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-full z-[100]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
        >
            {/* Simple animated hamburger/close icon */}
            <div className="relative w-full h-full flex items-center justify-center">
                <span className={`block absolute h-0.5 w-6 bg-neutral-200 transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : '-translate-y-1.5'}`}></span>
                <span className={`block absolute h-0.5 w-6 bg-neutral-200 transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`block absolute h-0.5 w-6 bg-neutral-200 transition-transform duration-300 ${isMenuOpen ? '-rotate-45' : 'translate-y-1.5'}`}></span>
            </div>
        </motion.button>
    );
};

export default MenuToggle;