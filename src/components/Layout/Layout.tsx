import React from 'react';
import styles from './Layout.module.scss';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, action }) => {
  return (
    <div className={styles.layout}>
      {(title || action) && (
        <header className={styles.header}>
          {title && <h1>{title}</h1>}
          {action && <div>{action}</div>}
        </header>
      )}
      <main>{children}</main>
    </div>
  );
};
