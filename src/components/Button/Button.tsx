import React from 'react';
import styles from './Button.module.scss';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth, 
  className, 
  icon,
  ...props 
}) => {
  return (
    <button 
      className={clsx(
        styles.button, 
        styles[variant], 
        fullWidth && styles.fullWidth, 
        className
      )}
      {...props}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
};
