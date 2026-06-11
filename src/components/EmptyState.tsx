import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = '📭' }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>{icon}</div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
