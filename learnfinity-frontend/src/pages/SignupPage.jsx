import React, { useState } from 'react'; // 1. Import useState
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { supabase } from '../supabaseClient'; // 2. Import the Supabase client

const SignupPage = () => {
  const navigate = useNavigate();
  
  // 3. Add state to manage form inputs, loading, and errors
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 4. Replace the entire handleSignup function
  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }
      
      // Show a success message. By default, Supabase requires email confirmation.
      alert('Signup successful! Please check your email for a confirmation link.');
      // After signing up, the user should log in.
      navigate('/login'); 

    } catch (error) {
      setError(error.message);
      console.error('Error signing up:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 relative">
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-neutral-300 hover:text-yellow-400 transition-colors z-10">
        <FiArrowLeft />
        Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md p-8 space-y-6 bg-slate-900 rounded-xl shadow-lg border border-slate-800"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Create an Account</h1>
          <p className="text-neutral-400 mt-2">Start your journey with Learnfinity.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-300">
              Full Name
            </label>
            {/* 5. Connect input to state */}
            <input
              type="text"
              id="name"
              className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-neutral-200 placeholder-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Your Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
              Email Address
            </label>
             {/* 5. Connect input to state */}
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-neutral-200 placeholder-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
              Password
            </label>
             {/* 5. Connect input to state */}
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-neutral-200 placeholder-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* 6. Display error messages */}
          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}

          <div>
            {/* 7. Add loading state to button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-neutral-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-yellow-400 hover:text-yellow-300">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default SignupPage;