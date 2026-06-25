import styles from './auth-ui.module.css'

type NoticeVariant = 'error' | 'success' | 'info'

const variantClass: Record<NoticeVariant, string> = {
  error: styles.noticeError,
  success: styles.noticeSuccess,
  info: styles.noticeInfo,
}

/**
 * Notice — a small banner used to surface auth messages (validation errors,
 * generic auth errors, lockout/unconfirmed notices, confirmations).
 */
export function Notice({
  variant,
  children,
}: {
  variant: NoticeVariant
  children: React.ReactNode
}) {
  return (
    <div className={`${styles.notice} ${variantClass[variant]}`} role="alert">
      {children}
    </div>
  )
}
