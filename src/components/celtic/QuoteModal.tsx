'use client';

import React, { useEffect } from 'react';
import styles from './CelticTheme.module.css';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, title, text }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`${styles.modalOverlay} ${isOpen ? styles.modalOverlayActive : ''}`} 
      onClick={onClose}
    >
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.closeBtn} onClick={onClose}>
          &times;
        </button>
        <h3 className={styles.celticAccentGold} style={{ fontSize: '22px', marginBottom: '15px', textAlign: 'center' }}>
          {title}
        </h3>
        <p style={{ color: '#f4f1ea', lineHeight: '1.7', textAlign: 'center', fontSize: '15px', margin: 0 }}>
          {text}
        </p>
        <div className={styles.modalDecoLine} />
      </div>
    </div>
  );
};
