"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Đang kiểm tra...");

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from("test_connection")
        .select("*")
        .limit(1);

      if (error) {
        // 42P01 = bảng chưa tồn tại.
        // Trường hợp này vẫn chứng minh website đã liên lạc được với Supabase.
        if (error.code === "42P01") {
          setStatus("CONNECTED");
        } else {
          setStatus(`ERROR: ${error.message}`);
        }

        return;
      }

      setStatus("CONNECTED");
    }

    testConnection();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        background: "#eef8ff",
      }}
    >
      <div
        style={{
          padding: "40px",
          borderRadius: "20px",
          background: "white",
          boxShadow: "0 20px 60px rgba(0,0,0,.1)",
          textAlign: "center",
        }}
      >
        <h1>Supabase Connection Test</h1>

        {status === "CONNECTED" ? (
          <>
            <div style={{ fontSize: "50px" }}>✓</div>

            <h2 style={{ color: "#1683c7" }}>
              Kết nối thành công
            </h2>

            <p>
              Website D-K66 đã kết nối được với Supabase.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: "40px" }}>⏳</div>

            <p>{status}</p>
          </>
        )}
      </div>
    </main>
  );
}