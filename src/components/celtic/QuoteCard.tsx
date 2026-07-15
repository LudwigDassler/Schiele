'use client';

import React from 'react';
import styles from './CelticTheme.module.css';

interface QuoteCardProps {
  text: string;
  author: string;
  onClick: () => void;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ text, author, onClick }) => {
  return (
    <div className={styles.quoteCard} onClick={onClick}>
      <p className={styles.quoteText}>«{text}»</p>
      <span className={styles.quoteAuthor}>{author}</span>
    </div>
  );
};
