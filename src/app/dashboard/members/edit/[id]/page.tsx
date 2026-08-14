import Editor from "@/components/Editor";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPage({
  params,
}: Props) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Chỉnh sửa tài liệu
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Tài liệu: {id}.docx
          </p>
        </div>

        <Editor
          documentId={id}
          documentTitle={`${id}.docx`}
          height="calc(100vh - 140px)"
        />
      </div>
    </main>
  );
}