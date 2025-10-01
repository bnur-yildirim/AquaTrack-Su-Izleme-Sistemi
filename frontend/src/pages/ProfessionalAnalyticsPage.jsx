import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import AnimatedCounter from '../components/AnimatedCounter';

// Lazy loading for performance
const LakePerformanceChart = lazy(() => import('../components/LakePerformanceChart'));
const SeasonalPerformanceChart = lazy(() => import('../components/SeasonalPerformanceChart'));
const OverfittingDashboard = lazy(() => import('../components/OverfittingDashboard'));
const UnifiedMetricsTable = lazy(() => import('../components/UnifiedMetricsTable'));
const ModelComparisonCard = lazy(() => import('../components/ModelComparisonCard'));

// Loading skeleton component
const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-slate-700/50 rounded-xl"></div>
  </div>
);

export default function ProfessionalAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll progress tracker
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/metrics/unified/summary');
      const result = await response.json();
      if (result.status === 'success') {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
    
    // Always use mock data for now
    setSummary({
      total_lakes: 7,
      average_r2: 0.82,
      average_wmape: 18.7,
      average_unified_score: 70.8
    });
    setLoading(false);
  };

  // Intersection observer for animations
  const { ref: heroRef, inView: heroInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const { ref: statsRef, inView: statsInView } = useInView({
    threshold: 0.2,
    triggerOnce: true
  });

  const { ref: chartsRef, inView: chartsInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  // Memoized statistics for performance
  const stats = useMemo(() => {
    if (!summary) return [];
    
    return [
      {
        label: 'Toplam Göl',
        value: summary.total_lakes || 0,
        color: 'from-blue-500 to-cyan-500',
        icon: '🏔️'
      },
      {
        label: 'Ortalama R²',
        value: summary.average_r2 || 0,
        suffix: '',
        color: 'from-green-500 to-emerald-500',
        icon: '📊'
      },
      {
        label: 'Ortalama WMAPE',
        value: summary.average_wmape || 0,
        suffix: '%',
        color: 'from-orange-500 to-red-500',
        icon: '🎯'
      },
      {
        label: 'Unified Score',
        value: summary.average_unified_score || 0,
        suffix: '',
        color: 'from-purple-500 to-pink-500',
        icon: '⭐'
      }
    ];
  }, [summary]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const floatingVariants = {
    float: {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70 text-lg">Analytics yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 z-50"
        style={{ width: `${scrollProgress}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${scrollProgress}%` }}
        transition={{ duration: 0.1 }}
      />

      {/* Header */}
      <motion.header
        ref={heroRef}
        initial={{ y: -100, opacity: 0 }}
        animate={heroInView ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 pt-16 pb-8"
      >
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            className="text-center"
          >
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent mb-4"
            >
              AI Analytics
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
            >
              Gelişmiş makine öğrenmesi modelleri ile su alanı tahminlerinin 
              profesyonel analizi ve performans değerlendirmesi
            </motion.p>
          </motion.div>
        </div>
      </motion.header>

      {/* Navigation Tabs */}
      <motion.nav
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10"
      >
        <div className="container mx-auto px-6">
          <div className="flex space-x-1 py-4">
            {[
              { id: 'overview', label: 'Genel Bakış', icon: '📊' },
              { id: 'lakes', label: 'Göl Performansı', icon: '🏔️' },
              { id: 'seasonal', label: 'Mevsimsel Analiz', icon: '🌱' },
              { id: 'overfitting', label: 'Overfitting', icon: '⚠️' },
              { id: 'metrics', label: 'Metrikler', icon: '📈' },
              { id: 'comparison', label: 'Model Karşılaştırma', icon: '⚖️' }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="relative z-10 py-6">
        <div className="container mx-auto px-6">
          {/* Statistics Cards */}
          <motion.section
            ref={statsRef}
            initial={{ y: 50, opacity: 0 }}
            animate={statsInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={floatingVariants}
                  animate="float"
                  style={{ animationDelay: `${index * 0.2}s` }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <div className="relative bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-3xl">{stat.icon}</div>
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-lg">
                          <AnimatedCounter end={stat.value} duration={2000} />
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Tab Content */}
          <motion.div
            ref={chartsRef}
            initial={{ y: 50, opacity: 0 }}
            animate={chartsInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-8"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Suspense fallback={<ChartSkeleton />}>
                      <LakePerformanceChart />
                    </Suspense>
                    <Suspense fallback={<ChartSkeleton />}>
                      <SeasonalPerformanceChart />
                    </Suspense>
                    <div className="xl:col-span-2">
                      <Suspense fallback={<ChartSkeleton />}>
                        <OverfittingDashboard />
                      </Suspense>
                    </div>
                  </div>
                )}

                {activeTab === 'lakes' && (
                  <Suspense fallback={<ChartSkeleton />}>
                    <LakePerformanceChart />
                  </Suspense>
                )}

                {activeTab === 'seasonal' && (
                  <Suspense fallback={<ChartSkeleton />}>
                    <SeasonalPerformanceChart />
                  </Suspense>
                )}

                {activeTab === 'overfitting' && (
                  <Suspense fallback={<ChartSkeleton />}>
                    <OverfittingDashboard />
                  </Suspense>
                )}

                {activeTab === 'metrics' && (
                  <Suspense fallback={<ChartSkeleton />}>
                    <UnifiedMetricsTable />
                  </Suspense>
                )}

                {activeTab === 'comparison' && (
                  <Suspense fallback={<ChartSkeleton />}>
                    <ModelComparisonCard />
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="relative z-10 py-12 border-t border-white/10"
      >
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/60">
            Powered by Advanced Machine Learning & AI Analytics
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
