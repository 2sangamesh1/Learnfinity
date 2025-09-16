// src/components/AppNavbar.jsx

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiLogOut, FiChevronDown } from 'react-icons/fi';

const AppNavbar = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const savedUserData = JSON.parse(localStorage.getItem('userData'));
        if (savedUserData && savedUserData.name) {
            setUserName(savedUserData.name);
        }
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const activeClass = "text-amber-500";
    const baseClass = "text-gray-300 hover:text-amber-500";

    return (
        <header className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-800 h-20 px-8 z-50 flex items-center justify-between relative">
            {/* Left Zone: Logo */}
            <div className="flex-1 flex justify-start">
                 <h1 className="text-2xl font-bold tracking-wider text-white">Learnfinity</h1>
            </div>

            {/* Center Zone: Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
                <NavLink to="/dashboard" className={({ isActive }) => `${baseClass} ${isActive && activeClass} font-semibold transition-colors`}>Dashboard</NavLink>
                <NavLink to="/planner" className={({ isActive }) => `${baseClass} ${isActive && activeClass} font-semibold transition-colors`}>Planner</NavLink>
                <NavLink to="/progress" className={({ isActive }) => `${baseClass} ${isActive && activeClass} font-semibold transition-colors`}>Progress</NavLink>
                <NavLink to="/quizzes" className={({ isActive }) => `${baseClass} ${isActive && activeClass} font-semibold transition-colors`}>Quizzes</NavLink>
            </nav>

            {/* Right Zone: User Profile */}
            <div className="flex-1 flex justify-end">
                <div className="relative">
                    <button onBlur={() => setTimeout(() => setDropdownOpen(false), 100)} onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors">
                        <div className="p-2 bg-gray-700 rounded-full"><FiUser className="text-gray-300"/></div>
                        <span className="font-semibold text-gray-200 hidden sm:block truncate max-w-[100px]">{userName}</span>
                        <FiChevronDown className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {dropdownOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg"
                            >
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 text-gray-300 hover:text-red-500 font-semibold p-3 rounded-lg hover:bg-red-500/10 transition-colors">
                                    <FiLogOut /> Logout
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header> 
    );
};

export default AppNavbar;