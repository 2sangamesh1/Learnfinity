import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      // UPDATED: Switched from Flexbox to a 3-column Grid
      className="grid grid-cols-3 items-center p-6 max-w-7xl mx-auto relative z-10"
    >
      {/* --- Left Column --- */}
      <div className="justify-self-start">
        <Link to="/">
          <span className="text-3xl font-bold tracking-wider text-neutral-100 font-display">
            learnfinity
          </span>
        </Link>
      </div>

      {/* --- Center Column --- */}
      <div className="hidden md:flex items-center space-x-8 text-neutral-300 justify-self-center">
        <motion.a href="#features" whileHover={{ y: -2 }} className="hover:text-yellow-400 transition-colors">Features</motion.a>
        <motion.a href="#about" whileHover={{ y: -2 }} className="hover:text-yellow-400 transition-colors">About</motion.a>
        <Link to="/login" className="hover:text-yellow-400 transition-colors">
          <motion.div whileHover={{ y: -2 }}>Login</motion.div>
        </Link>
      </div>
      
      {/* --- Right Column --- */}
      <div className="justify-self-end">
        <Link to="/signup">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-all duration-300"
          >
            Sign Up
          </motion.button>
        </Link>
      </div>
    </motion.nav>
  );
};

export default Navbar;