from fpdf import FPDF

class HeaderPdf:
    nama_sekolah = "Test"
    mata_pelajaran = "Test"
    kelas = "Test"
    tanggal = "Test"
    durasi = "Test"

class PDF(FPDF):
    def __init__(self, header_data):
        super().__init__()
        self.header_data = header_data

    def header(self):
        if self.page_no() != 1:
            return
        self.set_font('helvetica', 'B', 16)
        self.set_text_color(0, 100, 0)
        sekolah = self.header_data.nama_sekolah or 'LEMBAGA PENDIDIKAN'
        self.cell(0, 8, sekolah.upper(), align='C', new_x="LMARGIN", new_y="NEXT")
        
        self.set_font('helvetica', 'B', 10)
        self.set_text_color(0, 0, 0)
        self.cell(0, 5, 'TAHUN AJARAN 2026/2027', align='C', new_x="LMARGIN", new_y="NEXT")
        
        self.ln(2)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.line(self.l_margin, y+1, self.w - self.r_margin, y+1)
        self.ln(5)

        self.set_font('helvetica', 'B', 12)
        self.cell(0, 8, 'LEMBAR SOAL', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

        self.set_font('helvetica', 'B', 11)
        meta_items = [
            ("Mata Pelajaran", self.header_data.mata_pelajaran or "-"),
            ("Kelas", self.header_data.kelas or "-"),
            ("Hari/Tanggal", self.header_data.tanggal or "-"),
            ("Waktu", self.header_data.durasi or "-")
        ]
        
        self.set_x(self.l_margin + 40)
        start_x = self.get_x()
        for label, val in meta_items:
            self.set_x(start_x)
            self.cell(35, 6, label)
            self.cell(5, 6, ":")
            self.cell(0, 6, val, new_x="LMARGIN", new_y="NEXT")
            
        self.ln(2)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(3)

        self.set_font('helvetica', 'B', 11)
        self.cell(0, 6, 'PETUNJUK UMUM', new_x="LMARGIN", new_y="NEXT")
        
        self.set_font('helvetica', 'I', 10)
        instructions = [
            "1. Bacalah Basmalah sebelum memulai mengerjakan soal.",
            "2. Tulislah nama dan nomor peserta pada lembar jawaban yang disediakan.",
            "3. Periksa dan bacalah soal-soal dengan teliti sebelum menjawab.",
            "4. Dahulukan menjawab soal-soal yang dianggap mudah.",
            "5. Periksa kembali pekerjaan Anda sebelum diserahkan kepada pengawas."
        ]
        for inst in instructions:
            self.multi_cell(0, 5, inst, new_x="LMARGIN", new_y="NEXT")
            
        self.ln(2)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(5)

try:
    pdf = PDF(HeaderPdf())
    pdf.add_page()
    pdf.set_font('helvetica', 'B', 11)
    pdf.cell(0, 8, 'I. PILIHLAH SALAH SATU JAWABAN YANG PALING TEPAT!', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("helvetica", size=11)
    pdf.multi_cell(0, 6, "1. Pertanyaan Pertama", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(pdf.l_margin + 6)
    pdf.multi_cell(0, 6, "A. Opsi A", new_x="LMARGIN", new_y="NEXT")
    pdf.output("test.pdf")
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
