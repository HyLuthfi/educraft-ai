import * as XLSX from "xlsx";

export const downloadQuizizzExcel = (soalData: any[]) => {
  const formattedData = soalData.map((soal) => {
    const tipe = soal.tipe || soal.type || "pg";
    const isPG = tipe === "pg" || tipe === "pilihan_ganda";
    
    let qType = isPG ? "Multiple Choice" : "Open-Ended";
    
    let opt1 = "";
    let opt2 = "";
    let opt3 = "";
    let opt4 = "";
    let opt5 = "";
    let correctAns = "";

    if (isPG) {
      const options = soal.opsi || soal.options || [];
      opt1 = options[0]?.teks || "";
      opt2 = options[1]?.teks || "";
      opt3 = options[2]?.teks || "";
      opt4 = options[3]?.teks || "";
      opt5 = options[4]?.teks || "";

      const jawabanBenarLabel = soal.kunci_jawaban || soal.jawaban_benar || soal.jawaban || "";
      const correctIndex = options.findIndex((o: any) => o.label === jawabanBenarLabel);
      if (correctIndex !== -1) {
        correctAns = (correctIndex + 1).toString();
      }
    }

    return {
      "Question Text": soal.teks || soal.text || soal.teks_soal || "",
      "Question Type": qType,
      "Option 1": opt1,
      "Option 2": opt2,
      "Option 3": opt3,
      "Option 4": opt4,
      "Option 5": opt5,
      "Correct Answer": correctAns,
      "Time in seconds": 60,
      "Image Link": ""
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Quizizz");

  XLSX.writeFile(workbook, "Quizizz_EduCraft.xlsx");
};
