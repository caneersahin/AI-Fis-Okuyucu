require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

app.post('/api/parse-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen bir dosya yükleyin.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Sunucuda GEMINI_API_KEY ayarlanmamış.' });
    }

    const imagePart = bufferToGenerativePart(req.file.buffer, req.file.mimetype);

    const prompt = `Sen uzman bir fiş ve fatura okuma asistanısın. Lütfen yüklenen fiş veya fatura görselini analiz et.
Satın alınan tüm ürünleri (isim ve fiyatlarıyla), uygulanan KDV oranlarını ve tutarlarını (KDV %1, KDV %8, KDV %20 gibi) ve toplam genel tutarı çıkar.
KESİNLİKLE sadece aşağıdaki JSON formatında yanıt ver, markdown işaretleri veya başka hiçbir açıklama ekleme:
{
  "items": [{"name": "Ürün 1", "price": 10.5}],
  "kdvGroups": [{"percentage": 10, "amount": 1.05}],
  "totalAmount": 11.55
}`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Yapay zeka analizi sırasında hata oluştu: ' + error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Sunucu başlatıldı: http://localhost:${port}`);
  });
}
module.exports = app;
