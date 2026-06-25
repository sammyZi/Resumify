import type { Metadata } from 'next'
import { ConfirmationExpiredForm } from './confirmation-expired-form'

export const metadata: Metadata = {
  title: 'Confirmation expired · Resumify',
}

export default function ConfirmationExpiredPage() {
  return <ConfirmationExpiredForm />
}
