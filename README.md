# DOOKEELA — ตารางบอลหลายลีก (ฟรี ไม่มีเซิร์ฟเวอร์)

เว็บ DOOKEELA + ตัวดึงข้อมูลบอลจาก **API-Football** ผ่าน **GitHub Actions**
คีย์ API เก็บใน GitHub Secrets ไม่หลุดในหน้าเว็บ และไม่ต้องเปิดคอมทิ้งไว้ (ทำงานบน cloud ทั้งหมด)

```
เบราว์เซอร์ ─▶ docs/index.html ─▶ fetch ./data.json   (same-origin ไม่ติด CORS)
                                        ▲
GitHub Actions (รายชั่วโมง) ─▶ API-Football ─▶ เขียน docs/data.json ─▶ commit
```

นอกจากนี้หน้าเว็บยังดึง **FIFA World Cup 2026** แบบเรียลไทม์ตรงจาก `worldcup26.ir`
(ฟรี ไม่ต้องใช้คีย์) เพิ่มให้อีกทาง

---

## ขั้นตอนติดตั้ง (ครั้งเดียว ~5 นาที)

### 1) เอาคีย์ API-Football
- สมัครที่ https://dashboard.api-football.com/register (ฟรี ไม่ต้องใส่บัตร)
- Copy คีย์จากหน้า Dashboard → หน้าตาเป็นสตริงยาว ๆ
- แพลนฟรี = 100 request/วัน (สคริปต์นี้ใช้แค่ ~72/วัน)

### 2) สร้าง repo แล้วอัปโหลดไฟล์ทั้งหมดนี้
โครงสร้าง:
```
.github/workflows/update-scores.yml
scripts/fetch-scores.mjs
docs/index.html      ← ตัวเว็บ
docs/data.json       ← ไฟล์เริ่มต้น (ว่าง) Actions จะเขียนทับ
```

### 3) ใส่คีย์เป็น Secret
Repo → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `API_FOOTBALL_KEY`
- Secret: (วางคีย์)

### 4) เปิด GitHub Pages
Repo → **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `main` / โฟลเดอร์ `/docs` → Save
- ได้ลิงก์เว็บประมาณ `https://<username>.github.io/<repo>/`

### 5) รันครั้งแรก
Repo → **Actions → "Update DOOKEELA scores" → Run workflow**
- รอ ~30 วินาที ให้มัน commit `docs/data.json`
- เปิดลิงก์ Pages → ควรเห็นตารางบอลหลายลีก + แถบสถานะขึ้นเขียว 🟢

หลังจากนี้ workflow จะรันเองทุกชั่วโมง

---

## ปรับแต่ง

แก้ในไฟล์ `scripts/fetch-scores.mjs`:

| อยากทำ | แก้ตรงไหน |
|--------|-----------|
| เอาเฉพาะบางลีก | `LEAGUE_ALLOW = [39, 140, 253]` (ใส่ league id) |
| เปลี่ยนโซนเวลา | `const TZ = "Asia/Bangkok"` |
| ดึงถี่ขึ้น (เช่นทุก 30 นาที) | แก้ cron ใน `.github/workflows/update-scores.yml` เป็น `*/30 * * * *` **แต่** ต้องลดจำนวนวันที่ดึง หรืออัปเกรดแพลน ไม่งั้นเกิน 100/วัน |

league id ที่ใช้บ่อย: Premier League `39`, La Liga `140`, Serie A `135`, Bundesliga `78`,
Ligue 1 `61`, UCL `2`, MLS `253`, Liga MX `262`, K League 1 `292`
(ดูครบที่ endpoint `/leagues`)

---

## งบ request (แพลนฟรี 100/วัน)

- ดึง 3 วัน/รอบ × 24 รอบ = **72 req/วัน** → เหลือ ~28 ไว้เทสต์/กดรันเอง
- ถ้าอยากได้สกอร์สดถี่กว่านี้ตอนมีแมตช์ ให้เปิด/ปิด cron เอาเองในวันแข่ง หรืออัปเกรด API-Football Pro ($19/เดือน, 7,500 req/วัน)
- World Cup ดึงตรงจาก `worldcup26.ir` แบบเรียลไทม์อยู่แล้ว ไม่กิน quota ของ API-Football

---

## ⚠️ หมายเหตุเรื่องลิขสิทธิ์

ปุ่ม "ดูสด" ในหน้าเว็บเป็น placeholder — API พวกนี้ให้แค่ **สกอร์/ตาราง/ผลบอล** ซึ่งเป็นข้อมูลข้อเท็จจริง ใช้ได้
แต่ **ลิงก์สตรีมภาพการแข่งขัน** เป็นคนละเรื่อง ถ้าจะใส่ลิงก์ดูสด ควรลิงก์ไปช่องที่มีสิทธิ์ถ่ายทอดจริงเท่านั้น
(เหมือนที่เคยคุยกันเรื่องช่อง 11 PRO NO FAKE) การฝังสตรีมเถื่อนเสี่ยงทั้งกฎหมายและโดนแบน
