import React from 'react';
import { motion } from 'framer-motion'; 
import Navbar from '../components/LandingNavbar';
import HeroSection from '../components/HeroSection';
import { FiAward, FiBarChart2, FiCpu, FiZap, FiClock, FiUsers, FiCheckCircle, FiTrendingUp, FiCalendar, FiBookOpen, FiTarget } from 'react-icons/fi';

const LandingPage = () => {
  return (
    <div>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <AboutSection />
        <CTASection />
      </main>
    </div>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: <FiCpu size={28} className="text-yellow-400" />,
      title: "AI-Powered Planning",
      description: "Our intelligent algorithm crafts a personalized study schedule based on your subjects, deadlines, and availability.",
    },
    {
      icon: <FiZap size={28} className="text-sky-400" />,
      title: "Smart Quizzes",
      description: "Reinforce your learning with adaptive quizzes that focus on the topics you need to practice most.",
    },
    {
      icon: <FiBarChart2 size={28} className="text-green-400" />,
      title: "Progress Tracking",
      description: "Visualize your progress with insightful charts and stats to stay motivated and on track.",
    },
    {
      icon: <FiAward size={28} className="text-indigo-400" />,
      title: "Gamified Learning",
      description: "Earn points and achievements as you complete your study goals, making learning more engaging.",
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      }
    },
  };

  return (
    <section id="features" className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-100">Everything You Need to Succeed</h2>
          <p className="text-lg text-neutral-400 mt-4">One platform to plan, study, and master your subjects.</p>
        </div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              className="bg-gray-800/40 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-8 text-center hover:border-yellow-400/30 transition-all duration-300"
              variants={cardVariants}
            >
              <div className="inline-block bg-slate-800 p-4 rounded-full mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-neutral-100 mb-2">{feature.title}</h3>
              <p className="text-neutral-400">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  // Stats section removed as we don't have real user data yet

  return (
    <section className="py-20 bg-gray-900/50 border-t border-gray-800/50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="inline-block px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 text-gray-300 text-sm font-medium mb-6">
          Join the Waitlist
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Be Among the First to Experience Learnfinity</h2>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">Get early access to our AI-powered study platform and transform how you learn.</p>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const steps = [
    {
      number: "01",
      title: "Set Your Goals",
      description: "Tell us your subjects, exam dates, and weekly availability.",
      icon: <FiTarget className="text-yellow-400" size={20} />
    },
    {
      number: "02",
      title: "Get Your Plan",
      description: "Our AI creates a personalized study schedule just for you.",
      icon: <FiCalendar className="text-sky-400" size={20} />
    },
    {
      number: "03",
      title: "Study Smart",
      description: "Follow your plan and track your progress in real-time.",
      icon: <FiBookOpen className="text-green-400" size={20} />
    },
    {
      number: "04",
      title: "Achieve More",
      description: "Reach your academic goals with less stress and better results.",
      icon: <FiCheckCircle className="text-indigo-400" size={20} />
    }
  ];

  return (
    <section className="py-20 bg-gray-900/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-100">How It Works</h2>
          <p className="text-lg text-neutral-400 mt-4">Get started in just a few simple steps</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="bg-gray-800/40 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/50 hover:border-yellow-400/30 transition-all duration-300 hover:shadow-lg"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-start gap-4">
                <span className="text-5xl font-bold text-slate-600">{step.number}</span>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {step.icon}
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="text-slate-400">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const TestimonialsSection = () => {
  // Testimonials section removed as we don't have real user feedback yet

  return (
    <section className="py-20 bg-gray-900/50 border-y border-gray-800/50">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-neutral-100">Be the First to Share Your Story</h2>
        <p className="text-lg text-neutral-400 mt-4">We're just getting started and would love to hear about your experience</p>
      </div>
    </section>
  );
};

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-900/90 to-gray-900/80 border-t border-gray-800/50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Transform Your Study Habits?</h2>
        <p className="text-xl text-slate-300 mb-8">Start your journey towards more effective studying today.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.a
            href="/signup"
            className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-xl transition-all duration-300 hover:shadow-lg"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Started for Free
          </motion.a>
          <motion.a
            href="#features"
            className="px-8 py-4 border border-gray-600 hover:border-white/70 text-white font-medium rounded-xl transition-all duration-300"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Learn More
          </motion.a>
        </div>
      </div>
    </section>
  );
};

const AboutSection = () => {
  const contentVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      }
    },
  };

  return (
    <section id="about" className="py-20 md:py-32 bg-gray-900/50">
      <motion.div 
        className="max-w-5xl mx-auto px-4"
        variants={contentVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-100">About Learnfinity</h2>
          <p className="text-lg text-neutral-300 mt-6 leading-relaxed max-w-3xl mx-auto">
            Learnfinity was born from a simple idea: studying should be effective, not stressful. We saw students juggling countless subjects, struggling with disorganized notes, and losing motivation. We decided to build a tool that acts as a personal academic advisor, using the power of AI to create clear, manageable, and highly effective study plans. Our mission is to empower every student to achieve their academic goals with confidence and less stress.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-gray-800/40 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <FiCpu size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI-Powered</h3>
            <p className="text-slate-400">Our advanced algorithms analyze your progress and adapt your study plan in real-time for optimal learning.</p>
          </div>
          
          <div className="bg-gray-800/40 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <FiCheckCircle size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Proven Results</h3>
            <p className="text-slate-400">Our AI-powered system is designed to help you study more effectively and efficiently.</p>
          </div>
          
          <div className="bg-gray-800/40 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <FiUsers size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Community</h3>
            <p className="text-slate-400">Join a growing community of students supporting each other's academic journeys.</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default LandingPage;