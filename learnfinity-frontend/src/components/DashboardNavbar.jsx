import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// UPDATED: Corrected path to be absolute from the src directory
import PillNav from '/src/components/PillNav.jsx'; 
import { FiUser, FiLogOut, FiChevronDown } from 'react-icons/fi';
// UPDATED: Corrected path to be absolute from the src directory
import { useAuth } from '/src/context/AuthContext.jsx'; 

const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "All Quizzes", href: "/quizzes" },
    { label: "Study Planner", href: "/planner" },
    { label: "Progress", href: "/progress" },
];

const DashboardNavbar = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeHref = location.pathname.endsWith('/') && location.pathname.length > 1 
        ? location.pathname.slice(0, -1) 
        : location.pathname;

    const handleLogout = async () => {
        try {
            if (signOut) {
                await signOut();
            }
            navigate('/login');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    return (
        <nav className="w-full flex justify-between items-center p-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/80 sticky top-0 z-50">
            <Link to="/dashboard" className="text-2xl font-bold tracking-wider text-white">
                Learnfinity
            </Link>
            
            <PillNav
                items={navLinks}
                activeHref={activeHref}
                baseColor="#f59e0b"
                pillColor="#1f2937"
                hoveredPillTextColor="#111827"
                pillTextColor="#d1d5db"
            />
            
            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-lg bg-gray-800/80 hover:bg-gray-700/70 border border-gray-700 transition-colors"
                >
                    <FiUser />
                    <span className="hidden sm:inline text-sm">{user?.email || "Profile"}</span>
                    <motion.div
                        animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <FiChevronDown />
                    </motion.div>
                </button>
                <AnimatePresence>
                    {isDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
                        >
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <FiLogOut />
                                Logout
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
};

export default DashboardNavbar;