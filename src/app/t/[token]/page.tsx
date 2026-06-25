type PageProps = { params: Promise<{ token: string }> }

export default async function TemplateCopyPage({ params }: PageProps) {
  const { token } = await params
  return (
    <main>
      <p>Template copy: {token}</p>
    </main>
  )
}
