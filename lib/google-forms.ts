export const createGoogleForm = async (title: string, accessToken: string) => {
  const response = await fetch("https://forms.googleapis.com/v1/forms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      info: {
        title: title || "Kuis EduCraft AI",
        documentTitle: title || "Kuis EduCraft AI",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gagal membuat form: ${error.error?.message || response.statusText}`);
  }

  return response.json();
};

export const updateFormAsQuiz = async (formId: string, accessToken: string) => {
  const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          updateSettings: {
            settings: {
              quizSettings: {
                isQuiz: true,
              },
            },
            updateMask: "quizSettings.isQuiz",
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gagal mengatur form menjadi kuis: ${error.error?.message || response.statusText}`);
  }

  return response.json();
};

export const addQuestionsToForm = async (formId: string, soalList: any[], accessToken: string) => {
  const requests = soalList.map((soal, index) => {
    const tipe = soal.tipe || soal.type || "pg";
    
    let questionItem: any = {
      question: {
        required: true,
        grading: {
          pointValue: 10,
        }
      }
    };


    if (tipe === "pg") {
      const opsiList = soal.opsi || soal.options || [];
      const jawabanBenar = soal.kunci_jawaban || soal.jawaban_benar || soal.jawaban || "";
      
      let correctAnswerText = jawabanBenar;
      const correctOption = opsiList.find((o: any) => o.label === jawabanBenar);
      if (correctOption) {
        correctAnswerText = correctOption.teks;
      }

      questionItem.question.choiceQuestion = {
        type: "RADIO",
        options: opsiList.map((o: any) => ({ value: o.teks })),
      };

      if (correctAnswerText) {
        questionItem.question.grading.correctAnswers = {
          answers: [{ value: correctAnswerText }]
        };
      }

      const pembahasan = soal.pembahasan || soal.explanation;
      if (pembahasan) {
        questionItem.question.grading.whenRight = { text: `Pembahasan: ${pembahasan}` };
        questionItem.question.grading.whenWrong = { text: `Pembahasan: ${pembahasan}` };
      }
    } else {
      const isParagraph = tipe === "essay";
      questionItem.question.textQuestion = {
        paragraph: isParagraph
      };
      
      const kunciJawaban = soal.kunci_jawaban || soal.jawaban || "";
      const pembahasan = soal.pembahasan || soal.explanation || "";
      
      let feedbackText = "";
      if (pembahasan) {
        feedbackText = `Pembahasan: ${pembahasan}`;
      }

      if (kunciJawaban) {
        if (!isParagraph) {
          questionItem.question.grading.correctAnswers = {
            answers: [{ value: kunciJawaban }]
          };
        } else {
          feedbackText = `Referensi Jawaban: ${kunciJawaban}\n\n${feedbackText}`.trim();
        }
      }

      if (feedbackText) {
        questionItem.question.grading.generalFeedback = { text: feedbackText };
      }
    }

    return {
      createItem: {
        item: {
          title: `${index + 1}. ${soal.teks || soal.text || soal.teks_soal || ""}`,
          questionItem: questionItem
        },
        location: {
          index: index
        }
      }
    };
  });

  const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: requests,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Batch update error:", error);
    throw new Error(`Gagal menambahkan soal ke form: ${error.error?.message || response.statusText}`);
  }

  return response.json();
};
