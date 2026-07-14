# Uzbekistan Real Estate Aggregator

3D, zamonaviy va AI ishlatilmagan O‘zbekiston ko‘chmas mulk narxlari agregatori.

## Texnologiyalar

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **3D vizualizatsiya:** `react-globe.gl` + Three.js
- **Xarita:** Leaflet + React-Leaflet
- **Grafiklar:** Recharts

## Funksiyalar

- Uy-joy e’lonlarini qidirish va filtrlash
- Mintaqa, tuman, narx, xona, maydon bo‘yicha filtrlar
- 3D globusda e’lonlar joylashuvi
- Mintaqalar bo‘yicha o‘rtacha narx va statistikalar
- Price distribution va trend grafigi
- Sample ma’lumotlar bilan darhol ishga tushadi
- Keyinchalik haqiqiy saytlardan scraper qo‘shish uchun tayyor API

## Boshlash

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend `http://localhost:8000` da ishlaydi.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:5173` da ishga tushadi.

### Build

```bash
cd frontend
npm run build
```

Build `app/static` ichiga yoziladi va FastAPI orqali dastur xizmat qiladi.

## Demo ma’lumotlar

`data/sample_listings.json` ichidagi namunalar `app/main.py` ishga tushirilganda avtomatik yuklanadi.

## Monetizatsiya g‘oyalari

- Premium filtrlar va qidiruv tarixini saqlash
- Agentliklar uchun reklama joylashuvi
- Xususiy e’lonlar va sotuvchilar uchun obuna
- Ko‘chmas mulk agentliklari uchun API obunasi

## Litsenziya

MIT
