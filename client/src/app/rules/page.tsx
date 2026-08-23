'use client';

import { motion } from 'framer-motion';
import { SharedNavbar } from '../../components/SharedNavbar';
import ShinyText from '../../components/ShinyText';

const rules = [
  {
    title: 'Match Color or Number',
    description: 'Play a card that matches either the color or the number on the table. Use wild cards when you need to change the color completely and reset what everyone is playing around.',
    color: '#ea4335'
  },
  {
    title: 'Action Cards Change Play',
    description: 'Skip stops the next player from going. Reverse flips the direction around the table. Draw cards make opponents pick up penalties. Time these right and you control the flow.',
    color: '#0099ff'
  },
  {
    title: 'Call Last Card',
    description: 'When you get down to one card, call it out. If someone notices you missed the call, they can challenge you and you pay for it.',
    color: '#10b981'
  },
  {
    title: 'Empty Hand Wins',
    description: 'Emptying your hand wins the round. Your room sets point values and round limits that determine who wins the whole match.',
    color: '#f59e0b'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-arena-gradient bg-grid px-6 pt-28 pb-20 text-gray-100 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="glow-effect w-[500px] h-[500px] bg-red-650 top-20 right-20 animate-pulse-glow" style={{ opacity: 0.08 }} />
      <div className="glow-effect w-[400px] h-[400px] bg-blue-500 bottom-32 left-20 animate-pulse-glow" style={{ opacity: 0.06 }} />

      <SharedNavbar />

      {/* Header Section - Centered */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl mb-24 text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2">
            <span className="text-xs text-red-400 font-black uppercase tracking-[0.24em] flex items-center gap-2 justify-center">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Game Guide
            </span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8"
          style={{ textShadow: '0 0 60px rgba(239,68,68,0.3)' }}
        >
          <ShinyText text="MASTER" color="#ffffff" hoverColor="#ef4444" /> <br />
          <ShinyText text="THE" color="#ffffff" hoverColor="#ef4444" /> <ShinyText text="RULES" color="#ef4444" cursorShine={true} defaultGradient="linear-gradient(135deg, #ef4444 0%, #ffffff 50%, #ef4444 100%)" />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-base md:text-lg text-gray-300 max-w-3xl leading-relaxed mx-auto"
        >
          One simple card mode. Fast gameplay. Rules you already know. The real skill is knowing when to hold your cards and when to play them.
        </motion.p>
      </motion.section>

      {/* Rules Grid - Premium Design */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2 mb-24"
      >
        {rules.map(({ title, description, color }, index) => (
          <motion.article
            key={title}
            variants={cardVariants}
            whileHover={{
              y: -12,
              transition: { type: 'spring', stiffness: 300, damping: 20 }
            }}
            className="group relative cursor-default"
          >
            {/* Accent decoration - top left */}
            <motion.div
              className="absolute -top-1 -left-1 w-20 h-20 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle, ${color}, transparent)`,
                filter: 'blur(30px)'
              }}
              whileHover={{ scale: 1.2 }}
            />

            <div className="glass-card rounded-3xl border border-white/10 p-8 md:p-10 h-full overflow-hidden relative z-10">
              {/* Number indicator */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="flex items-center gap-4 mb-6"
              >
                <motion.div
                  className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
                    border: `2px solid ${color}40`,
                    color: color
                  }}
                  whileHover={{ scale: 1.1, rotate: -5 }}
                >
                  {String(index + 1).padStart(2, '0')}
                </motion.div>
                <div className="h-8 w-1 bg-gradient-to-b" style={{ background: `linear-gradient(to bottom, ${color}, transparent)` }} />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.1, duration: 0.4 }}
                className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight leading-tight"
              >
                {title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.15, duration: 0.4 }}
                className="text-sm md:text-base leading-relaxed text-gray-300 relative z-10"
              >
                {description}
              </motion.p>

              {/* Bottom animated line */}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(to right, ${color}, ${color}00)`
                }}
                initial={{ width: '0%' }}
                whileHover={{ width: '100%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </motion.article>
        ))}
      </motion.div>

      {/* Pro Tips Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-5xl"
      >
        <div className="glass-card rounded-3xl border border-white/10 p-10 md:p-14 relative overflow-hidden">
          {/* Glow accent */}
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-0"
            style={{
              background: 'radial-gradient(circle, rgba(239,68,68,0.1), transparent)',
              filter: 'blur(60px)'
            }}
            animate={{ y: [0, 30, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2">
              <span className="text-xs text-red-400 font-black uppercase tracking-[0.2em]">Strategy</span>
            </div>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl md:text-5xl font-black text-white mb-12 tracking-tight text-center"
          >
            Play Smarter
          </motion.h3>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid md:grid-cols-2 gap-8 relative z-10"
          >
            {[
              {
                num: '01',
                title: 'Read the Table',
                text: 'Pay attention to which colors keep coming up. When one color disappears, everyone runs out of options and pressure builds fast.'
              },
              {
                num: '02',
                title: 'Wild Card Timing',
                text: 'Save your wild cards for when you really need them. Use them when you\'re stuck with a bad hand or when you need to flip the momentum.'
              },
              {
                num: '03',
                title: 'Action Card Rhythm',
                text: 'Skip and Reverse are more than just defensive plays. Use them to break your opponent\'s rhythm right when they\'re on a roll.'
              },
              {
                num: '04',
                title: 'Last Card Psychology',
                text: 'Call too early and everyone targets you. Call too late and you miss it. Wait for the right moment to call.'
              }
            ].map((tip, index) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                className="flex gap-6 group/tip relative"
              >
                <motion.div
                  className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg relative"
                  style={{
                    background: 'linear-gradient(135deg, #ef444425 0%, #ef444410 100%)',
                    border: '2px solid #ef444440'
                  }}
                  whileHover={{ scale: 1.15, rotate: -8 }}
                >
                  {tip.num}
                </motion.div>
                <div className="flex-1">
                  <h4 className="text-white font-black mb-2 tracking-tight text-lg group-hover/tip:text-red-400 transition-colors">{tip.title}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{tip.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
