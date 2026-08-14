"use client";

import { useEffect, useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Member = {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
  gender: string;
  avatar: string | null;
};

type Comment = {
  id: number;
  member_id: number;
  content: string;
  created_at: string;
};

export default function MemberDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [member, setMember] = useState<Member | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [rating, setRating] = useState("Chưa xếp loại");

  // =============================
  // Lấy thông tin đoàn viên
  // =============================
  const fetchMember = async () => {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setMember(data);
      setRating(data.rating || "Chưa xếp loại");
    }
  };

  // =============================
  // Lấy danh sách nhận xét
  // =============================
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("member_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComments(data);
    }
  };

  // =============================
  // Thêm nhận xét
  // =============================
  const addComment = async () => {
    if (!newComment.trim()) return;

    const { error } = await supabase.from("comments").insert({
      member_id: id,
      content: newComment,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewComment("");
    fetchComments();
  };

  // =============================
  // Xóa nhận xét
  // =============================
  const deleteComment = async (commentId: number) => {
    const ok = confirm("Bạn có chắc muốn xóa nhận xét này?");
    if (!ok) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.log(error);
      alert(error.message);
      return;
    }

    fetchComments();
  };

  const updateComment = async () => {
  if (!editingContent.trim() || editingId === null) return;

  const { error } = await supabase
    .from("comments")
    .update({
      content: editingContent,
    })
    .eq("id", editingId);

  if (error) {
    alert(error.message);
    return;
  }

  setEditingId(null);
  setEditingContent("");

  fetchComments();
};

const saveRating = async () => {
  const { error } = await supabase
    .from("members")
    .update({
      rating: rating,
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Đã lưu xếp loại");

  fetchMember();
};

const uploadAvatar = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  setUploading(true);

 const fileName = `${id}.jpg`;

const { error: uploadError } = await supabase.storage
  .from("avatars")
  .upload(fileName, file, {
    upsert: true,
  });

  if (uploadError) {
    alert(uploadError.message);
    setUploading(false);
    return;
  }

const {
  data: { publicUrl },
} = supabase.storage
  .from("avatars")
  .getPublicUrl(fileName);

const avatarUrl = `${publicUrl}?t=${Date.now()}`;

const { error } = await supabase
  .from("members")
  .update({
    avatar: avatarUrl,
  })
  .eq("id", id);

  if (error) {
    alert(error.message);
    setUploading(false);
    return;
  }

  fetchMember();

  setUploading(false);

  alert("Đổi ảnh thành công");
};

  useEffect(() => {
    fetchMember();
    fetchComments();
  }, [id]);

  if (!member) {
    return <p className="text-center mt-10">Đang tải...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center py-10">
      <div className="bg-white rounded-3xl shadow-xl w-[700px] p-10">

{/* Avatar */}

<div className="flex flex-col items-center">

  <div className="relative">

    <img
  src={
    member.avatar
      ? `${member.avatar}?t=${Date.now()}`
      : "/avatar.png"
  }
  className="w-40 h-40 rounded-full object-cover border-4 border-blue-500"
/>

    {/* Nút đổi ảnh */}
    <label
      htmlFor="avatar-upload"
      className="
        absolute
        bottom-0
        right-0
        w-10
        h-10
        rounded-full
        bg-blue-600
        text-white
        flex
        items-center
        justify-center
        cursor-pointer
        hover:bg-blue-700
        shadow-lg
      "
    >
      📷
    </label>

    <input
      id="avatar-upload"
      type="file"
      accept="image/*"
      onChange={uploadAvatar}
      className="hidden"
    />

  </div>

  {uploading && (
    <p className="text-blue-600 mt-3">
      Đang tải ảnh...
    </p>
  )}

  <h1 className="text-3xl font-bold mt-5">
    {member.full_name}
  </h1>

  <p className="text-gray-500">
    {member.student_id}
  </p>

</div>

        {/* Thông tin */}

        <div className="mt-10 space-y-5">

          <div className="flex justify-between border-b pb-3">
            <b>Mã sinh viên</b>
            <span>{member.student_id}</span>
          </div>

          <div className="flex justify-between border-b pb-3">
            <b>Họ tên</b>
            <span>{member.full_name}</span>
          </div>

          <div className="flex justify-between border-b pb-3">
            <b>Lớp</b>
            <span>{member.class_name}</span>
          </div>

          <div className="flex justify-between border-b pb-3">
            <b>Giới tính</b>
            <span>{member.gender}</span>
          </div>

        </div>

<div className="mt-10 border rounded-2xl p-6 bg-gray-50">

  <h2 className="text-2xl font-bold mb-5">
    Xếp loại đoàn viên
  </h2>

  <select
    value={rating}
    onChange={(e) => setRating(e.target.value)}
    className="w-full border rounded-xl p-3"
  >
    <option>Chưa xếp loại</option>
    <option>Xuất sắc</option>
    <option>Khá</option>
    <option>Trung bình</option>
    <option>Yếu</option>
  </select>

  <button
    onClick={saveRating}
    className="mt-4 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
  >
    Lưu xếp loại
  </button>

</div>

        {/* Nhận xét */}

        <div className="mt-10">

          <h2 className="text-2xl font-bold mb-5">
            Nhận xét đoàn viên
          </h2>

          <textarea
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Nhập nhận xét..."
            className="w-full border rounded-lg p-3"
          />

          <button
            onClick={addComment}
            className="mt-3 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            Gửi nhận xét
          </button>

          {editingId !== null && (
  <div className="mt-6 border rounded-xl p-4 bg-yellow-50">

    <h3 className="font-bold mb-2">
      Sửa nhận xét
    </h3>

    <textarea
      rows={4}
      className="w-full border rounded-lg p-3"
      value={editingContent}
      onChange={(e) => setEditingContent(e.target.value)}
    />

    <div className="flex gap-3 mt-3">

      <button
        onClick={updateComment}
        className="bg-green-600 text-white px-5 py-2 rounded-lg"
      >
        Lưu
      </button>

      <button
        onClick={() => {
          setEditingId(null);
          setEditingContent("");
        }}
        className="bg-gray-500 text-white px-5 py-2 rounded-lg"
      >
        Hủy
      </button>

    </div>

  </div>
)}
          {/* Danh sách */}

          <div className="mt-8">

            <h3 className="text-xl font-bold mb-4">
              Danh sách nhận xét
            </h3>

            {comments.length === 0 ? (
              <p className="text-gray-500">
                Chưa có nhận xét nào.
              </p>
            ) : (
              <div className="space-y-4">

                {comments.map((comment) => (

                  <div
                    key={comment.id}
                    className="bg-gray-50 border rounded-xl p-4 shadow"
                  >

                    <div className="flex justify-between">

                      <div>

                        <p className="text-gray-800">
                          {comment.content}
                        </p>

                        <p className="text-sm text-gray-500 mt-2">
                          {new Date(comment.created_at).toLocaleString("vi-VN")}
                        </p>

                      </div>

                      <div className="flex gap-2">

  <button
    onClick={() => {
      setEditingId(comment.id);
      setEditingContent(comment.content);
    }}
    className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg"
  >
    <Pencil size={18} />
  </button>

  <button
    onClick={() => deleteComment(comment.id)}
    className="text-red-600 hover:bg-red-100 p-2 rounded-lg"
  >
    <Trash2 size={18} />
  </button>

</div>

                    </div>

                  </div>

                ))}

              </div>
            )}

          </div>

        </div>

      </div>
    </main>
  );
}