import * as XLSX from "xlsx";

interface MuridExport {
  nama: string;
  nomor_absen?: string;
  status: string;
  keterangan?: string;
}

interface RekapExport {
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
}

export function downloadAbsensiExcel({
  judul,
  tanggal,
  muridList,
  rekap,
}: {
  judul: string;
  tanggal: string;
  muridList: MuridExport[];
  rekap?: RekapExport;
}) {
  const rows: any[] = [];

  // Header info
  rows.push(["LEMBAR PRESENSI KEHADIRAN SISWA"]);
  rows.push(["AGENDA / KELAS", judul || "Absensi"]);
  rows.push(["TANGGAL", tanggal]);
  rows.push([]);

  // Ringkasan
  if (rekap) {
    const total = muridList.length;
    const persentase = total > 0 ? ((rekap.hadir / total) * 100).toFixed(1) : "0";
    rows.push(["RINGKASAN KEHADIRAN"]);
    rows.push([
      `Total: ${total} Siswa`,
      `Hadir: ${rekap.hadir}`,
      `Izin: ${rekap.izin}`,
      `Sakit: ${rekap.sakit}`,
      `Alpa: ${rekap.alpa}`,
      `Terlambat: ${rekap.terlambat}`,
      `Persentase Hadir: ${persentase}%`,
    ]);
    rows.push([]);
  }

  // Header Tabel
  rows.push(["No", "No. Absen", "Nama Siswa", "Status Kehadiran", "Keterangan"]);

  // Isi data
  muridList.forEach((m, idx) => {
    rows.push([
      idx + 1,
      m.nomor_absen || idx + 1,
      m.nama,
      (m.status || "hadir").toUpperCase(),
      m.keterangan || "-",
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Atur lebar kolom
  worksheet["!cols"] = [
    { wch: 6 },  // No
    { wch: 12 }, // No Absen
    { wch: 30 }, // Nama Siswa
    { wch: 20 }, // Status
    { wch: 30 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Presensi");

  const cleanTitle = (judul || "Presensi").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Presensi_${cleanTitle}_${tanggal}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
