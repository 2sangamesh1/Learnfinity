// src/components/Menu.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMenu } from '../context/MenuContext';

const navLinks = [
    { path: "/dashboard", label: "Dashboard", layoutId: "dashboard-title" },
    { path: "/planner", label: "Planner", layoutId: "planner-title" },
    { path: "/progress", label: "Progress", layoutId: "progress-title" },
    { path: "/quizzes", label: "Quizzes", layoutId: "quizzes-title" },
];

const menuVariants = {
    open: { opacity: 1, transition: { duration: 0.3 } },
    closed: { opacity: 0, transition: { duration: 0.3, delay: 0.7 } },
};

const navContainerVariants = {
    open: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};

const navItemVariants = {
    open: { y: 0, opacity: 1, transition: { y: { stiffness: 1000, velocity: -100 } } },
    closed: { y: 50, opacity: 0, transition: { y: { stiffness: 1000 } } },
};

const Menu = () => {
    const { toggleMenu } = useMenu();

    return (
        <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 bg-slate-950 z-[90] flex items-center justify-center"
        >
            <motion.nav variants={navContainerVariants} className="flex flex-col space-y-4 text-center">
                {navLinks.map(link => (
                    <motion.div key={link.path} variants={navItemVariants}>
                        {/* NEW: The motion.div wrapper with the layoutId is critical for the animation */}
                        <motion.div layoutId={link.layoutId}>
                            <NavLink
                                to={link.path}
                                onClick={toggleMenu}
                                className="text-5xl font-bold text-neutral-500 hover:text-yellow-400 transition-colors duration-300"
                            >
                                {link.label}
                            </NavLink>
                        </motion.div>
                    </motion.div>
                ))}
            </motion.nav>
        </motion.div>
    );
};

export default Menu;