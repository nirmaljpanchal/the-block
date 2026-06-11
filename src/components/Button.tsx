import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[`size-${size}`],
      className
    ]
      .filter(Boolean)
      .join(' ');

    return <button ref={ref} className={classNames} {...props} />;
  }
);

Button.displayName = 'Button';
