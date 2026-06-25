type PageProps = { params: Promise<{ token: string }> }

export default async function RecruiterSharePage({ params }: PageProps) {
  const { token } = await params
  return (
    <main>
      <p>Recruiter share: {token}</p>
    </main>
  )
}
