import Editor from "@/components/Editor";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <main className="w-full min-h-screen">
      <Editor
        documentId={id}
        documentTitle={`${id}.docx`}
        height="calc(100vh - 20px)"
        width="100%"
      />
    </main>
  );
}