import React from 'react';
import styles from './Card.module.scss';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, interactive, onClick }) => {
  return (
    <div 
      className={clsx(styles.card, interactive && styles.interactive, className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
