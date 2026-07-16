// fetch-scores.mjs
// ดึง fixtures จาก API-Football (คีย์อยู่ใน GitHub Secrets) แปลงเป็นรูปแบบของ DOOKEELA
// แล้วเขียนลง docs/data.json  — รันด้วย Node 20+ (มี global fetch ในตัว ไม่ต้องลง lib)
//
// งบ request: ดึง 3 วัน (เมื่อวาน/วันนี้/พรุ่งนี้) = 3 req ต่อรอบ
// ตั้ง cron รายชั่วโมง = 72 req/วัน อยู่ใต้ลิมิตฟรี 100 req/วัน อย่างสบาย

import { writeFileSync, mkdirSync } from "node:fs";

const KEY = process.env.API_FOOTBALL_KEY;
if (!KEY) {
  console.error("❌ ไม่พบ API_FOOTBALL_KEY (ตั้งใน GitHub Secrets)");
  process.exit(1);
}

const TZ = "Asia/Bangkok";                 // แสดงวันที่/เวลาเป็นเวลาไทย
const BASE = "https://v3.football.api-sports.io";

// (ทางเลือก) จำกัดเฉพาะลีกที่สนใจ ใส่ league id ของ API-Football เช่น [39,140,253]
// เว้นว่าง [] = เอาทุกลีกของวันนั้น
const LEAGUE_ALLOW = [];

// (ทางเลือก) ข้ามลีกบางอัน — World Cup ให้ worldcup26.ir จัดการแบบ realtime แทน
const LEAGUE_SKIP_NAMES = new Set(["World Cup"]);

const LIVE = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT", "SUSP"]);
const DONE = new Set(["FT", "AET", "PEN", "WO"]);

// ---- คำนวณวันที่แบบเวลาไทย ----
function bkkDate(offsetDays) {
  const now = new Date();
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now).map(x => [x.type, x.value])
  );
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

const dates = [bkkDate(-1), bkkDate(0), bkkDate(1)];

// ---- แปลงเวลา ISO (UTC) → วันที่+เวลาไทย ----
function toBkk(iso) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(new Date(iso)).map(x => [x.type, x.value])
  );
  const hour = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

async function fetchDate(date) {
  const url = `${BASE}/fixtures?date=${date}` +
    (LEAGUE_ALLOW.length === 1 ? `&league=${LEAGUE_ALLOW[0]}` : "");
  const res = await fetch(url, { headers: { "x-apisports-key": KEY } });
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    console.error(`⚠️ API errors (${date}):`, JSON.stringify(json.errors));
  }
  console.log(`📅 ${date}: ${json.results ?? (json.response?.length || 0)} fixtures`);
  return json.response || [];
}

const leagues = {};
const matches = [];
const seen = new Set();

for (const date of dates) {
  let fixtures;
  try { fixtures = await fetchDate(date); }
  catch (e) { console.error(`❌ ดึง ${date} ไม่สำเร็จ:`, e.message); continue; }

  for (const f of fixtures) {
    if (LEAGUE_ALLOW.length && !LEAGUE_ALLOW.includes(f.league.id)) continue;
    if (LEAGUE_SKIP_NAMES.has(f.league.name)) continue;
    if (seen.has(f.fixture.id)) continue;
    seen.add(f.fixture.id);

    const key = "af-" + f.league.id;
    leagues[key] = {
      name: f.league.name,
      country: f.league.country || "",
      logo: f.league.logo || "",
      flag: "⚽"
    };

    const short = f.fixture.status.short;
    const status = DONE.has(short) ? "finished" : (LIVE.has(short) ? "live" : "upcoming");
    const { date: d, time } = toBkk(f.fixture.date);

    matches.push({
      league: key, date: d, time,
      home: f.teams.home.name, away: f.teams.away.name,
      homeLogo: f.teams.home.logo || "", awayLogo: f.teams.away.logo || "",
      ch: "", status,
      hs: f.goals.home ?? 0, as: f.goals.away ?? 0,
      min: (status === "live" && f.fixture.status.elapsed) ? f.fixture.status.elapsed + "'" : ""
    });
  }
}

const out = {
  updated: new Date().toISOString(),
  timezone: TZ,
  count: matches.length,
  leagues,
  matches
};

mkdirSync("docs", { recursive: true });
writeFileSync("docs/data.json", JSON.stringify(out));
console.log(`✅ เขียน docs/data.json : ${matches.length} แมตช์ / ${Object.keys(leagues).length} ลีก`);
