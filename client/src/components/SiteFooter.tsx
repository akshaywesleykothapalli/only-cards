'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BrandMark } from './BrandMark';

const footerLinks = [
  { label: 'Home', href: '/' },
  { label: 'Rules', href: '/rules' },
  { label: 'Sign In', href: '/' },
];

export function SiteFooter() {
  return (
    <footer className="bg-arena-gradient bg-grid text-gray-400 py-20 px-6 border-t border-white/5 relative overflow-hidden">
      <motion.div
        className="glow-effect w-[400px] h-[400px] bg-red-650 bottom-0 right-0 animate-pulse-glow"
        style={{ opacity: 0.05 }}
      />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-4 gap-12 mb-16"
        >
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <BrandMark size="lg" />
              <span className="font-black text-2xl text-white">ONLY CARDS</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-md">
              The ultimate competitive card gaming platform. Real time multiplayer, ranked leaderboards, and strategic gameplay. Join thousands of players worldwide.
            </p>
            <div className="flex items-center gap-4">
              {['Twitter', 'Discord', 'Instagram'].map((social, index) => (
                <motion.a
                  key={social}
                  href="#"
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-red-500/50 hover:bg-red-500/10 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <span className="text-xs font-black">{social[0]}</span>
                </motion.a>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-xs text-gray-500">
            © 2026 Only Cards. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-xs">
            {footerLinks.map((item, index) => (
              <motion.span
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link href={item.href} className="text-gray-500 hover:text-red-400 transition-colors relative group">
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-red-400 group-hover:w-full transition-all duration-300" />
                </Link>
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
