const Tesseract = require('tesseract.js');

exports.processExamImage = async (imagePath) => {
  console.log('[OCR] Procesando:', imagePath);

  const { data } = await Tesseract.recognize(imagePath, 'spa', {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r[OCR] ${(m.progress * 100).toFixed(0)}%`);
      }
    },
  });

  console.log('\n[OCR] Completado');

  const lines = data.text.split('\n').filter(l => l.trim());
  const answers = [];

  lines.forEach(line => {
    const match = line.match(/^(\d+)[.\-\)]\s*([A-Ea-e])/);
    if (match) {
      answers.push({ question: parseInt(match[1]), answer: match[2].toUpperCase() });
    }
  });

  return {
    raw_text: data.text,
    confidence: (data.confidence * 100).toFixed(1),
    answers,
    lines_detected: lines.length,
  };
};

exports.calculateScore = (studentAnswers, answerKey) => {
  let correct = 0, incorrect = 0, blank = 0;
  const total = answerKey.length;

  answerKey.forEach((key, i) => {
    const student = studentAnswers.find(a => a.question === i + 1);
    if (!student) blank++;
    else if (student.answer === key.answer) correct++;
    else incorrect++;
  });

  const score = (correct / total) * 100;
  return { score: parseFloat(score.toFixed(2)), correct, incorrect, blank, total };
};
