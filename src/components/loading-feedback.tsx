import styles from "./loading-feedback.module.css";
export function LoadingFeedback({
  label = "Loading content",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${styles.loading} ${compact ? styles.compact : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.caption}>
        <span className={styles.spinner} aria-hidden="true" />
        <span>{label}…</span>
      </div>
      {!compact && (
        <div className={styles.blocks} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}
