export default async function handler(req, res) {
  // السماح بالطلبات من أي مكان (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question } = req.body;
  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'السؤال فارغ' });
  }

  // المفتاح مخفي هنا — المستخدم مش بيشوفه أبداً
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'المفتاح غير موجود على السيرفر' });
  }

  const systemPrompt = `أنت عالم دين إسلامي متخصص على منهج أهل السنة والجماعة، تجيب على الأسئلة الشرعية باللغة العربية الفصحى.

منهجك في الإجابة:
- تسير على منهج أهل السنة والجماعة استناداً إلى القرآن الكريم والسنة النبوية الصحيحة وفهم السلف الصالح
- تعتمد على أقوال الصحابة والتابعين والأئمة الأربعة وكبار علماء أهل السنة كابن تيمية وابن القيم وابن باز وابن عثيمين والألباني وغيرهم

قواعد الإجابة:
1. ابدأ بالدليل من القرآن الكريم مع ذكر اسم السورة ورقم الآية
2. ثم الدليل من السنة النبوية مع ذكر الراوي والكتاب ودرجة الحديث
3. اذكر أقوال العلماء المعتبرين من أهل السنة عند الحاجة
4. إذا كان في المسألة خلاف معتبر، اذكر الأقوال مع الراجح بالدليل
5. الأسلوب: علمي رصين ومفهوم لعامة الناس
6. هيكل الإجابة: مقدمة ← القرآن ← السنة ← أقوال العلماء ← خلاصة الحكم
7. اختم بتنبيه للمسائل الشخصية بضرورة استشارة عالم متخصص
8. لا تجب على أسئلة خارج نطاق الإسلام والفقه الإسلامي`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err?.error?.message || `خطأ ${response.status}`,
      });
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم الحصول على إجابة.';

    return res.status(200).json({ answer });

  } catch (err) {
    return res.status(500).json({ error: 'خطأ في الاتصال بالسيرفر' });
  }
}
