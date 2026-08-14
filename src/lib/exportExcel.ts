import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export async function exportMembersToExcel(members: any[]) {
    console.log("Members:", members);
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Hệ thống quản lý đoàn viên";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Danh sách đoàn viên");

  // =========================
  // LOGO
  // =========================

  try {
    const response = await fetch("/logo-truong.png");
    const buffer = await response.arrayBuffer();

    const logoId = workbook.addImage({
      buffer,
      extension: "png",
    });

    worksheet.addImage(logoId, {
      tl: { col: 0.15, row: 0.15 },
      ext: { width: 70, height: 70 },
    });
  } catch {
    console.log("Không tải được logo");
  }

  // =========================
  // TIÊU ĐỀ
  // =========================

  worksheet.mergeCells("B1:G1");
  worksheet.getCell("B1").value = "DANH SÁCH ĐOÀN VIÊN";

  worksheet.getCell("B1").font = {
    bold: true,
    size: 20,
    color: { argb: "1E3A8A" },
  };

  worksheet.getCell("B1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.mergeCells("B2:G2");
  worksheet.getCell("B2").value = "Chi đoàn D-K66";

  worksheet.getCell("B2").font = {
    italic: true,
    size: 12,
    color: { argb: "666666" },
  };

  worksheet.getCell("B2").alignment = {
    horizontal: "center",
  };

  worksheet.getRow(1).height = 32;
  worksheet.getRow(2).height = 22;

  worksheet.addRow([]);

  // =========================
  // HEADER
  // =========================

  const header = worksheet.addRow([
    "STT",
    "Mã sinh viên",
    "Họ tên",
    "Lớp",
    "Giới tính",
    "Xếp loại",
    "Ảnh",
  ]);

  header.height = 28;

  header.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "2563EB" },
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  let stt = 1;

    for (const m of members) {
    const row = worksheet.addRow([
      stt++,
      m.student_id,
      m.full_name,
      m.class_name,
      m.gender,
      m.rating || "Chưa xếp loại",
      "",
    ]);

    row.height = 55;

    if (row.number % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "F8FAFC",
          },
        };
      });
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    row.getCell(3).alignment = {
      horizontal: "left",
      vertical: "middle",
    };

const rating = row.getCell(6);

rating.font = {
  bold: true,
  color: {
    argb: "FFFFFFFF",
  },
};

rating.alignment = {
  horizontal: "center",
  vertical: "middle",
};

switch (m.rating) {
  case "Xuất sắc":
    rating.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "16A34A",
      },
    };
    break;

  case "Khá":
    rating.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "2563EB",
      },
    };
    break;

  case "Trung bình":
    rating.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "F59E0B",
      },
    };
    break;

  default:
    rating.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "DC2626",
      },
    };
}

    // ẢNH
    if (m.avatar) {
      try {
        const response = await fetch(m.avatar);
        const buffer = await response.arrayBuffer();

        const imageId = workbook.addImage({
          buffer,
          extension: "jpeg",
        });

        worksheet.addImage(imageId, {
          tl: {
            col: 6.15,
            row: row.number - 0.80,
          },
          ext: {
            width: 50,
            height: 50,
          },
        });
      } catch {
        // bỏ qua nếu lỗi ảnh
      }
    }
  }

  worksheet.columns = [
    { width: 8 },   // STT
    { width: 18 },  // Mã SV
    { width: 30 },  // Họ tên
    { width: 12 },  // Lớp
    { width: 15 },  // Giới tính
    { width: 16 },  // Xếp loại
    { width: 9 },  // Ảnh
  ];

  const total = members.length;

const male = members.filter(
  (m) => m.gender === "Nam"
).length;

const female = members.filter(
  (m) => m.gender === "Nữ"
).length;

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
  (m) =>
    !m.rating ||
    m.rating === "Chưa xếp loại"
).length;

  worksheet.addRow([]);

const titleRow = worksheet.addRow(["THỐNG KÊ"]);

titleRow.eachCell((cell) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "DBEAFE",
    },
  };

  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
    bottom: { style: "thin" },
  };
});

titleRow.font = {
  bold: true,
  size: 15,
  color: {
    argb: "1E3A8A",
  },
};

worksheet.addRow([`📌 Tổng đoàn viên: ${total}`]);

worksheet.addRow([`👨 Nam: ${male}`]);

worksheet.addRow([`👩 Nữ: ${female}`]);

worksheet.addRow([]);

worksheet.addRow([`🏆 Xuất sắc: ${excellent}`]);

worksheet.addRow([`🥈 Khá: ${good}`]);

worksheet.addRow([`📙 Trung bình: ${average}`]);

worksheet.addRow([`❌ Chưa xếp loại: ${unknown}`]);

worksheet.addRow([]);

worksheet.addRow([
  `📅 Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`,
]);

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 4,
    },
  ];

  worksheet.autoFilter = {
    from: "A4",
    to: "G4",
  };

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    "DanhSachDoanVien.xlsx"
  );
}