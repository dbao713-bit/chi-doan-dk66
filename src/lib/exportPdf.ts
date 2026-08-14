import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { logoBase64 } from "./logoBase64";

(pdfMake as any).vfs = pdfFonts.vfs;

export default function exportMembersToPDF(members: any[]) {
  const total = members.length;

  const male = members.filter((m) => m.gender === "Nam").length;
  const female = members.filter((m) => m.gender === "Nữ").length;

  const excellent = members.filter(
    (m) => m.rating === "Xuất sắc"
  ).length;

  const good = members.filter(
    (m) => m.rating === "Khá"
  ).length;

  const average = members.filter(
    (m) => m.rating === "Trung bình"
  ).length;

  const unknown = members.filter(
    (m) => !m.rating
  ).length;

  const body: any[] = [];

  body.push([
    {
      text: "STT",
      style: "tableHeader",
    },
    {
      text: "Mã SV",
      style: "tableHeader",
    },
    {
      text: "Họ tên",
      style: "tableHeader",
    },
    {
      text: "Lớp",
      style: "tableHeader",
    },
    {
      text: "Giới tính",
      style: "tableHeader",
    },
    {
      text: "Xếp loại",
      style: "tableHeader",
    },
  ]);

  members.forEach((m, index) => {
    let color = "#DC2626";

    if (m.rating === "Xuất sắc") color = "#16A34A";
    else if (m.rating === "Khá") color = "#2563EB";
    else if (m.rating === "Trung bình") color = "#F59E0B";

    body.push([
      {
        text: index + 1,
        alignment: "center",
      },
      {
        text: m.student_id,
        alignment: "center",
      },
      {
        text: m.full_name,
      },
      {
        text: m.class_name,
        alignment: "center",
      },
      {
        text: m.gender,
        alignment: "center",
      },
      {
        text: m.rating || "Chưa xếp loại",
        alignment: "center",
        bold: true,
        color,
      },
    ]);
  });

  const docDefinition: any = {
    pageSize: "A4",

    pageMargins: [40, 40, 40, 40],

    content: [
      // HEADER
      {
        columns: [
          {
            image: logoBase64,
            width: 60,
          },

          {
            width: "*",

            stack: [
              {
                text: "DANH SÁCH ĐOÀN VIÊN",
                fontSize: 22,
                bold: true,
                alignment: "center",
                color: "#1E3A8A",
              },

              {
                text: "Chi đoàn D-K66",
                italics: true,
                alignment: "center",
                margin: [0, 5, 0, 0],
              },
            ],
          },
        ],

        margin: [0, 0, 0, 20],
      },

      // TABLE
      {
        table: {
          headerRows: 1,

          widths: [35, 75, "*", 50, 70, 80],

          body,
        },

        layout: {
          fillColor: function (rowIndex: number) {
            if (rowIndex === 0) return "#2563EB";

            return rowIndex % 2 === 0
              ? "#F8FAFC"
              : null;
          },

          hLineWidth: () => 0.7,
          vLineWidth: () => 0.7,

          hLineColor: () => "#D1D5DB",
          vLineColor: () => "#D1D5DB",

          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
      },

      // THỐNG KÊ
      {
        text: "THỐNG KÊ",

        margin: [0, 25, 0, 10],

        fontSize: 16,

        bold: true,

        color: "#1E3A8A",
      },

      {
        ul: [
          `Tổng đoàn viên: ${total}`,
          `Nam: ${male}`,
          `Nữ: ${female}`,
          `Xuất sắc: ${excellent}`,
          `Khá: ${good}`,
          `Trung bình: ${average}`,
          `Chưa xếp loại: ${unknown}`,
        ],
      },

      {
        text:
          "Ngày xuất: " +
          new Date().toLocaleDateString("vi-VN"),

        margin: [0, 20, 0, 0],

        italics: true,

        alignment: "right",
      },
    ],

    styles: {
      tableHeader: {
        bold: true,

        fontSize: 11,

        color: "white",

        alignment: "center",

        fillColor: "#2563EB",

        margin: [0, 6, 0, 6],
      },
    },

    defaultStyle: {
      fontSize: 11,
    },
  };

  pdfMake
    .createPdf(docDefinition)
    .download("DanhSachDoanVien.pdf");
}