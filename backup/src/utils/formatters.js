// Formateo de respuestas estandarizadas

exports.successResponse = (data, message = null) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data) response.data = data;
  return response;
};

exports.errorResponse = (message, details = null, code = null) => {
  const response = { success: false, error: message };
  if (details) response.details = details;
  if (code) response.code = code;
  return response;
};

exports.paginationResponse = (data, page, limit, total) => {
  return {
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

// Formateo de fechas
exports.formatDate = (date, locale = 'es-MX') => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

exports.formatDateTime = (date, locale = 'es-MX') => {
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formateo de calificaciones
exports.formatScore = (score) => {
  const numScore = parseFloat(score);
  return {
    score: numScore.toFixed(2),
    percentage: `${numScore.toFixed(1)}%`,
    letterGrade: getLetterGrade(numScore),
    status: getScoreStatus(numScore)
  };
};

function getLetterGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getScoreStatus(score) {
  if (score >= 70) return 'approved';
  if (score >= 60) return 'warning';
  return 'failed';
}

// Formateo de nombres
exports.formatFullName = (firstName, lastName = '') => {
  return `${firstName.trim()} ${lastName.trim()}`.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Sanitizar texto para prevenir XSS
exports.sanitizeText = (text) => {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Formateo de estadísticas de estudiante
exports.formatStudentStats = (student, exams = []) => {
  const scores = exams.map(e => e.score);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const trend = scores.length >= 2 ? scores[0] - scores[1] : 0;

  return {
    ...student,
    stats: {
      average: avg.toFixed(1),
      trend: trend.toFixed(1),
      totalExams: scores.length,
      highest: Math.max(...scores, 0),
      lowest: scores.length ? Math.min(...scores) : 0,
      status: avg >= 70 ? 'ok' : avg >= 60 ? 'watch' : 'risk'
    }
  };
};

// Formateo de respuesta de OCR
exports.formatOcrResult = (ocrData) => {
  return {
    text: ocrData.raw_text,
    confidence: parseFloat(ocrData.confidence),
    answers: ocrData.answers || [],
    metadata: {
      linesDetected: ocrData.lines_detected,
      language: 'spa',
      processedAt: new Date().toISOString()
    }
  };
};
