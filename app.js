"use strict";
// Firebase Setup
const firebaseConfig = {
    apiKey: "AIzaSyCqvGSmjEY6PRnsdGh016Ta1m8PLjolqgA",
    authDomain: "daily-task-family.firebaseapp.com",
    projectId: "daily-task-family",
    storageBucket: "daily-task-family.firebasestorage.app",
    messagingSenderId: "10031644603",
    appId: "1:10031644603:web:afaf01434c65147d988e9e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.enablePersistence().catch(() => { });
function getFamilyCode() {
    let code = localStorage.getItem("family_code");
    if (!code) {
        code = "FAM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem("family_code", code);
    }
    return code;
}
function setFamilyCode(code) {
    if (!code || !code.trim())
        return;
    localStorage.setItem("family_code", code.trim());
    window.location.reload();
}
const getCollectionName = () => `data_${getFamilyCode()}`;
const appStorage = {
    async get(key, shared) {
        if (!shared) {
            const v = localStorage.getItem(key);
            return v !== null ? { key, value: v, shared } : null;
        }
        const doc = await db.collection(getCollectionName()).doc(key).get();
        if (!doc.exists)
            return null;
        return { key, value: doc.data().value, shared };
    },
    async set(key, value, shared) {
        if (!shared) {
            localStorage.setItem(key, value);
            return { key, value, shared };
        }
        await db.collection(getCollectionName()).doc(key).set({ value, updatedAt: Date.now() });
        return { key, value, shared };
    },
    async delete(key, shared) {
        if (!shared) {
            localStorage.removeItem(key);
            return { key, deleted: true, shared };
        }
        await db.collection(getCollectionName()).doc(key).delete();
        return { key, deleted: true, shared };
    },
    async list(prefix, shared) {
        if (!shared) {
            const keys = Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix));
            return { keys, prefix, shared };
        }
        let q = db.collection(getCollectionName());
        if (prefix) {
            q = q
                .where(firebase.firestore.FieldPath.documentId(), ">=", prefix)
                .where(firebase.firestore.FieldPath.documentId(), "<", prefix + "\uf8ff");
        }
        const snap = await q.get();
        const keys = snap.docs.map((d) => d.id);
        return { keys, prefix, shared };
    }
};
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => { });
    });
}
const { useState, useEffect, useCallback, useMemo, useRef } = React;
function Icon({ children, size = 18, color = "currentColor", className, style }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className, style: style }, children));
}
function Plus({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
    React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })); }
function ChevronLeft({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("polyline", { points: "15 18 9 12 15 6" })); }
function ChevronRight({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("polyline", { points: "9 18 15 12 9 6" })); }
function Printer({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("polyline", { points: "6 9 6 2 18 2 18 9" }),
    React.createElement("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
    React.createElement("rect", { x: "6", y: "14", width: "12", height: "8" })); }
function Check({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("polyline", { points: "20 6 9 17 4 12" })); }
function X({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
    React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })); }
function User({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
    React.createElement("circle", { cx: "12", cy: "7", r: "4" })); }
function CalIcon({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }),
    React.createElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
    React.createElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
    React.createElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" })); }
function DownloadIcon({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
    React.createElement("polyline", { points: "7 10 12 15 17 10" }),
    React.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" })); }
function UploadIcon({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
    React.createElement("polyline", { points: "17 8 12 3 7 8" }),
    React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })); }
function Trash({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("polyline", { points: "3 6 5 6 21 6" }),
    React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })); }
function MenuIcon({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("line", { x1: "3", y1: "12", x2: "21", y2: "12" }),
    React.createElement("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
    React.createElement("line", { x1: "3", y1: "18", x2: "21", y2: "18" })); }
function CopyIcon({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }),
    React.createElement("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })); }
function HelpCircle({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
    React.createElement("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
    React.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })); }
function MessageSquare({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })); }
function UsersIcon({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("path", { d: "M17 21v-2a4 4 0 0 0-3-3.87" }),
    React.createElement("path", { d: "M9 21v-2a4 4 0 0 1 3-3.87" }),
    React.createElement("circle", { cx: "9", cy: "7", r: "4" }),
    React.createElement("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
    React.createElement("circle", { cx: "16", cy: "3.13", r: "3" })); }
function ChevronDown({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("polyline", { points: "6 9 12 15 18 9" })); }
function EditIcon({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
    React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })); }
function RefreshIcon({ size, color, className }) { return React.createElement(Icon, { size: size, color: color, className: className },
    React.createElement("polyline", { points: "23 4 23 10 17 10" }),
    React.createElement("polyline", { points: "1 20 1 14 7 14" }),
    React.createElement("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })); }
function Loader2({ size, color, className }) {
    return (React.createElement(Icon, { size: size, color: color, className: className },
        React.createElement("line", { x1: "12", y1: "2", x2: "12", y2: "6" }),
        React.createElement("line", { x1: "12", y1: "18", x2: "12", y2: "22" }),
        React.createElement("line", { x1: "4.93", y1: "4.93", x2: "7.76", y2: "7.76" }),
        React.createElement("line", { x1: "16.24", y1: "16.24", x2: "19.07", y2: "19.07" }),
        React.createElement("line", { x1: "2", y1: "12", x2: "6", y2: "12" }),
        React.createElement("line", { x1: "18", y1: "12", x2: "22", y2: "12" }),
        React.createElement("line", { x1: "4.93", y1: "19.07", x2: "7.76", y2: "16.24" }),
        React.createElement("line", { x1: "16.24", y1: "7.76", x2: "19.07", y2: "4.93" })));
}
function useFonts() {
    useEffect(() => {
        const id = "dt-fonts";
        if (document.getElementById(id))
            return;
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href =
            "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
        document.head.appendChild(link);
    }, []);
}
// ---- Theme color (per-device display preference, kept in localStorage only) ----
const THEME_PRESETS = [
    { id: "green", name: "সবুজ (ডিফল্ট)", color: "#0E4B43" },
    { id: "pink", name: "পিংক", color: "#C0286B" },
    { id: "maroon", name: "মেরুন", color: "#9F1239" },
    { id: "purple", name: "বেগুনি", color: "#6D28D9" },
    { id: "blue", name: "নীল", color: "#1D4ED8" },
    { id: "teal", name: "টিল", color: "#0F766E" },
];
function hexToRgba(hex, alpha) {
    const h = (hex || "#0E4B43").replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function getThemeColor(fallback) {
    if (typeof document === "undefined")
        return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue("--theme-primary").trim();
    return v || fallback;
}
function applyThemeColor(color) {
    document.documentElement.style.setProperty("--theme-primary", color);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
        meta.setAttribute("content", color);
}
function useThemeColor() {
    const [themeColor, setThemeColorState] = useState(() => {
        try {
            return localStorage.getItem("theme_color") || THEME_PRESETS[0].color;
        }
        catch (_a) {
            return THEME_PRESETS[0].color;
        }
    });
    useEffect(() => {
        applyThemeColor(themeColor);
    }, [themeColor]);
    function setThemeColor(color) {
        setThemeColorState(color);
        try {
            localStorage.setItem("theme_color", color);
        }
        catch (_a) { }
    }
    return [themeColor, setThemeColor];
}
const DEFAULT_DEEN_FIELDS = [
    { key: "fardPrayers", label: "ফরজ কাযা নামাজ (কয় ওয়াক্ত?)", shortLabel: "ফরজ কাযা", type: "count", max: 5 },
    { key: "jamaat", label: "জামায়াতে নামাজ (কয় ওয়াক্ত?)", shortLabel: "জামায়াতে নামাজ", type: "count", max: 5, appliesTo: "male" },
    { key: "sunnahNafl", label: "সুন্নত/নফল নামাজ", shortLabel: "সুন্নত/নফল", type: "bool" },
    { key: "tahajjud", label: "নফল সিয়াম/ তাহাজ্জুদ", shortLabel: "তাহাজ্জুদ", type: "bool" },
    { key: "dhikr", label: "ইস্তেগফার/যিকির/দোয়া", shortLabel: "যিকির/দোয়া", type: "bool" },
    { key: "quranPages", label: "কুরআন/তাফসীর ও আরবি শেখা (পৃষ্ঠা)", shortLabel: "কুরআন", type: "number", target: 5 },
    { key: "seerah", label: "সীরাত/জীবনী/ইতিহাস", shortLabel: "সীরাত", type: "bool" },
    { key: "selfStudy", label: "ইলম অর্জন/কোর্সের পড়া", shortLabel: "ইলম অর্জন", type: "bool" },
    { key: "taleem", label: "তালিম/পাঠচক্র", shortLabel: "তালিম", type: "bool" },
    { key: "dawah", label: "দাওয়াহ/দ্বীনের দাওয়াত", shortLabel: "দাওয়াহ", type: "bool" },
    { key: "sadaqah", label: "দান/সাদাকা/পরোপকার", shortLabel: "সাদাকা", type: "bool" },
];
const DEFAULT_DUNIYA_FIELDS = [
    { key: "earlyMorning", label: "ভোরের বরকতময় সময়কে কাজে লাগানো", shortLabel: "ভোরের সময়", type: "bool" },
    { key: "exercise", label: "ব্যায়াম/শরীরচর্চা", shortLabel: "ব্যায়াম", type: "bool" },
    { key: "healthyFood", label: "স্বাস্থ্যকর খাবার", shortLabel: "স্বাস্থ্যকর খাবার", type: "bool" },
    { key: "familyTime", label: "পরিবারে সময় দেয়া ও আত্মীয়দের খোঁজ নেয়া", shortLabel: "পারিবারিক সময়", type: "bool" },
    { key: "screenLimit", label: "সোশ্যাল মিডিয়া/মোবাইল সীমিত ব্যবহার", shortLabel: "সীমিত স্ক্রিন", type: "bool" },
    { key: "noHurtingOthers", label: "অন্যের হক নষ্ট/মনে কষ্ট না দেয়া", shortLabel: "সদাচরণ", type: "bool" },
    { key: "noProcrastination", label: "অলসতা/কাজ ফেলে না রাখা", shortLabel: "অলসতা মুক্ত", type: "bool" },
    { key: "phoneOffBy11", label: "ঘুমানোর অন্তত ১ ঘণ্টা আগে ফোন/ইন্টারনেট বন্ধ", shortLabel: "ঘুমের আগে ফোন বন্ধ", type: "bool" },
];
function fieldApplies(field, member) {
    if (!field.appliesTo)
        return true;
    if (!member || !member.gender)
        return true;
    return field.appliesTo === member.gender;
}
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toBn = (n) => String(n).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
// Wraps any Bengali-digit run inside a label string in a distinct monospace,
// bold, emerald-colored span so numbers embedded mid-sentence (e.g. "১ ঘণ্টা")
// don't visually blend into the surrounding text at small font sizes.
function LabelText({ text }) {
    const parts = String(text !== null && text !== void 0 ? text : "").split(/([০-৯]+)/g);
    return parts.map((part, i) => /^[০-৯]+$/.test(part) ? (React.createElement("span", { key: i, style: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "var(--theme-primary)" } }, part)) : (React.createElement(React.Fragment, { key: i }, part)));
}
const BN_MONTHS = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
const BN_WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
function pad2(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function monthPrefix(year, month0) { return `${year}-${pad2(month0 + 1)}`; }
function daysInMonth(year, month0) { return new Date(year, month0 + 1, 0).getDate(); }
function dailyScore(entry, member, allFields) {
    if (!entry)
        return null;
    let sum = 0;
    let count = 0;
    for (const f of allFields) {
        if (!fieldApplies(f, member))
            continue;
        count += 1;
        if (f.type === "bool") {
            sum += entry[f.key] ? 1 : 0;
        }
        else if (f.type === "count") {
            sum += Math.min(f.max, Number(entry[f.key]) || 0) / f.max;
        }
        else if (f.type === "number") {
            if (f.target) {
                sum += Math.min(f.target, Number(entry[f.key]) || 0) / f.target;
            }
            else {
                sum += Number(entry[f.key]) > 0 ? 1 : 0;
            }
        }
    }
    return count ? sum / count : null;
}
function scoreColor(score) {
    if (score === null || score === undefined)
        return "#E7EEE3";
    if (score >= 0.85)
        return "var(--theme-primary)";
    if (score >= 0.6)
        return "#4C8C74";
    if (score >= 0.35)
        return "#C89B3C";
    if (score > 0)
        return "#C1666B";
    return "#E7EEE3";
}
function fieldPercent(field, monthEntries, totalDays, member) {
    if (!fieldApplies(field, member))
        return null;
    let hit = 0;
    if (field.type === "count") {
        let sum = 0;
        for (let d = 1; d <= totalDays; d++) {
            const e = monthEntries[pad2(d)];
            sum += Math.min(field.max, Number(e === null || e === void 0 ? void 0 : e[field.key]) || 0);
        }
        return Math.round((sum / (totalDays * field.max)) * 100);
    }
    if (field.type === "number" && field.target) {
        let sum = 0;
        for (let d = 1; d <= totalDays; d++) {
            const e = monthEntries[pad2(d)];
            sum += Math.min(field.target, Number(e === null || e === void 0 ? void 0 : e[field.key]) || 0);
        }
        return Math.round((sum / (totalDays * field.target)) * 100);
    }
    for (let d = 1; d <= totalDays; d++) {
        const e = monthEntries[pad2(d)];
        if (!e)
            continue;
        if (field.type === "bool" && e[field.key])
            hit += 1;
        if (field.type === "number" && !field.target && Number(e[field.key]) > 0)
            hit += 1;
    }
    return Math.round((hit / totalDays) * 100);
}
function calculateStreak(monthEntries, member, allFields, cursorYear, cursorMonth0) {
    let streak = 0;
    const today = new Date();
    const d = new Date(today);
    for (let i = 0; i < 365; i++) {
        // monthEntries only holds data for the currently-loaded month (keyed by
        // day-of-month, e.g. "05"). Once we step outside that month we no longer
        // have real data for that day, so stop rather than wrongly reusing a
        // same-numbered day from a different month.
        if (d.getFullYear() !== cursorYear || d.getMonth() !== cursorMonth0)
            break;
        const dayStr = pad2(d.getDate());
        const entry = monthEntries[dayStr];
        if (entry && dailyScore(entry, member, allFields) >= 0.5) {
            streak++;
        }
        else if (i > 0) {
            break;
        }
        d.setDate(d.getDate() - 1);
    }
    return streak;
}
// Computes week rows (1..N) for the currently open month so week 5 only
// shows up when the month actually has 29-31 days. Keeps the "সপ্তাহ" label
// in sync with the same 7-day buckets the progress graph uses (১-৭, ৮-১৪, ...).
function getWeekRanges(totalDays) {
    const numWeeks = Math.ceil(totalDays / 7);
    const ranges = [];
    for (let w = 1; w <= numWeeks; w++) {
        const start = (w - 1) * 7 + 1;
        const end = Math.min(start + 6, totalDays);
        ranges.push({ week: w, start, end });
    }
    return ranges;
}
function weeklyKey(memberId, year, month0) {
    return `weekly:${memberId}:${monthPrefix(year, month0)}`;
}
function meetingKey(year, month0) {
    return `meeting_rows_v2:${monthPrefix(year, month0)}`;
}
async function saveMeetingData(year, month0, data) {
    await appStorage.set(meetingKey(year, month0), JSON.stringify(data), true);
}
async function loadWeekly(memberId, year, month0) {
    try {
        const res = await appStorage.get(weeklyKey(memberId, year, month0), true);
        return res ? JSON.parse(res.value) : {};
    }
    catch (_a) {
        return {};
    }
}
async function saveWeekly(memberId, year, month0, data) {
    await appStorage.set(weeklyKey(memberId, year, month0), JSON.stringify(data), true);
}
async function loadMembers() {
    try {
        const res = await appStorage.get("members", true);
        return res ? JSON.parse(res.value) : [];
    }
    catch (_a) {
        return [];
    }
}
async function saveMembers(members) {
    await appStorage.set("members", JSON.stringify(members), true);
}
async function loadCustomFields() {
    try {
        const res = await appStorage.get("custom_fields", true);
        return res ? JSON.parse(res.value) : [];
    }
    catch (_a) {
        return [];
    }
}
async function saveCustomFields(fields) {
    await appStorage.set("custom_fields", JSON.stringify(fields), true);
}
async function loadEntry(memberId, key) {
    try {
        const res = await appStorage.get(`entry:${memberId}:${key}`, true);
        return res ? JSON.parse(res.value) : null;
    }
    catch (_a) {
        return null;
    }
}
async function saveEntry(memberId, key, data) {
    await appStorage.set(`entry:${memberId}:${key}`, JSON.stringify(data), true);
}
async function loadMonthEntries(memberId, year, month0) {
    const prefix = `entry:${memberId}:${monthPrefix(year, month0)}`;
    try {
        const res = await appStorage.list(prefix, true);
        if (!res || !res.keys)
            return {};
        const out = {};
        await Promise.all(res.keys.map(async (k) => {
            try {
                const r = await appStorage.get(k, true);
                if (r) {
                    const day = k.split(":").pop();
                    out[day] = JSON.parse(r.value);
                }
            }
            catch (_a) { }
        }));
        return out;
    }
    catch (_a) {
        return {};
    }
}
function StarMark({ size = 18, color = "#C89B3C" }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none" },
        React.createElement("path", { d: "M12 1L14.6 8.2L22 8.5L16.2 13.3L18.2 21L12 16.8L5.8 21L7.8 13.3L2 8.5L9.4 8.2L12 1Z", fill: color })));
}
function BoolToggle({ value, onChange, disabled }) {
    return (React.createElement("button", { type: "button", disabled: disabled, onClick: () => onChange(!value), className: "flex items-center justify-center w-11 h-11 rounded-xl border-2 transition-all shrink-0 shadow-sm", style: {
            borderColor: value ? "var(--theme-primary)" : "#D8DED3",
            background: value ? "var(--theme-primary)" : "#FFFFFF",
        } }, value ? React.createElement(Check, { size: 20, color: "#F4F7F1" }) : React.createElement(X, { size: 16, color: "#B9C2B2" })));
}
function CountStepper({ value, onChange, max, disabled }) {
    const v = Number(value) || 0;
    return (React.createElement("div", { className: "flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200" },
        React.createElement("button", { type: "button", disabled: disabled, onClick: () => onChange(Math.max(0, v - 1)), className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm", style: { borderColor: "#D8DED3", color: "#16302B" } }, "\u2212"),
        React.createElement("span", { className: "w-8 text-center font-bold text-sm", style: { fontFamily: "'IBM Plex Mono', monospace", color: "#16302B" } }, toBn(v)),
        React.createElement("button", { type: "button", disabled: disabled, onClick: () => onChange(Math.min(max, v + 1)), className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm", style: { borderColor: "#D8DED3", color: "#16302B" } }, "+")));
}
function NumberField({ value, onChange, disabled, target }) {
    return (React.createElement("div", { className: "flex items-center gap-1.5" },
        React.createElement("input", { type: "number", min: "0", inputMode: "decimal", disabled: disabled, value: value !== null && value !== void 0 ? value : "", onChange: (e) => onChange(e.target.value), placeholder: "\u09E6", className: "w-16 h-9 rounded-xl border px-2 text-right outline-none font-bold text-sm bg-slate-50 focus:bg-white transition-all", style: { borderColor: "#D8DED3", fontFamily: "'IBM Plex Mono', monospace", color: "#16302B" } }),
        target ? (React.createElement("span", { className: "text-xs font-semibold", style: { color: "#8A9A8F", fontFamily: "'IBM Plex Mono', monospace" } },
            "/",
            toBn(target))) : null));
}
function ProgressChart({ monthEntries, totalDays, member, allFields }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    useEffect(() => {
        if (!chartRef.current)
            return;
        const weekLabels = ["সপ্তাহ ১", "সপ্তাহ ২", "সপ্তাহ ৩", "সপ্তাহ ৪", "সপ্তাহ ৫"];
        const weekScores = [];
        for (let w = 0; w < 5; w++) {
            const startDay = w * 7 + 1;
            const endDay = Math.min(startDay + 6, totalDays);
            let sum = 0;
            let count = 0;
            if (startDay <= totalDays) {
                for (let d = startDay; d <= endDay; d++) {
                    const e = monthEntries[pad2(d)];
                    const s = dailyScore(e, member, allFields);
                    if (s !== null) {
                        sum += s;
                        count += 1;
                    }
                }
            }
            weekScores.push(count ? Math.round((sum / count) * 100) : 0);
        }
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        const ctx = chartRef.current.getContext("2d");
        const themePrimary = getThemeColor("#0E4B43");
        chartInstance.current = new Chart(ctx, {
            type: "line",
            data: {
                labels: weekLabels,
                datasets: [
                    {
                        label: "সাপ্তাহিক গড় স্কোর (%)",
                        data: weekScores,
                        borderColor: themePrimary,
                        backgroundColor: hexToRgba(themePrimary, 0.1),
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: "#C89B3C",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, max: 100, ticks: { stepSize: 25, font: { size: 10 } } },
                    x: { ticks: { font: { size: 10 } } }
                },
                plugins: {
                    legend: { display: false },
                },
            },
        });
        return () => {
            if (chartInstance.current)
                chartInstance.current.destroy();
        };
    }, [monthEntries, totalDays, member, allFields]);
    return (React.createElement("div", { className: "w-full h-32 mt-2" },
        React.createElement("canvas", { ref: chartRef })));
}
function App() {
    useFonts();
    const [themeColor, setThemeColor] = useThemeColor();
    const [members, setMembers] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [addingMember, setAddingMember] = useState(false);
    const [newName, setNewName] = useState("");
    const [newGender, setNewGender] = useState("male");
    const [customFields, setCustomFields] = useState([]);
    const [newCustomLabel, setNewCustomLabel] = useState("");
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [entry, setEntry] = useState({});
    const [saving, setSaving] = useState(false);
    const [savedTick, setSavedTick] = useState(false);
    const [monthCursor, setMonthCursor] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month0: d.getMonth() };
    });
    const [monthEntries, setMonthEntries] = useState({});
    const [monthRefreshKey, setMonthRefreshKey] = useState(0);
    const [printMode, setPrintMode] = useState(false);
    const [weekly, setWeekly] = useState({});
    const [weeklyRowCount, setWeeklyRowCount] = useState(1);
    const [savingWeekly, setSavingWeekly] = useState(false);
    const [weeklySavedTick, setWeeklySavedTick] = useState(false);
    const [meetingState, setMeetingState] = useState({
        rows: [{ id: "1", topic: "", decision: "", person: "" }]
    });
    const [savingMeeting, setSavingMeeting] = useState(false);
    const [meetingSavedTick, setMeetingSavedTick] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showFamilyCodeModal, setShowFamilyCodeModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [archiveYear, setArchiveYear] = useState(() => new Date().getFullYear());
    const [archiveMonth0, setArchiveMonth0] = useState(() => new Date().getMonth());
    const [customFamCodeInput, setCustomFamCodeInput] = useState("");
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [copiedCode, setCopiedCode] = useState(false);
    useEffect(() => {
        (async () => {
            const m = await loadMembers();
            setMembers(m);
            const cf = await loadCustomFields();
            setCustomFields(cf);
            let last = null;
            try {
                const r = await appStorage.get(`last-selected-member:${getFamilyCode()}`, false);
                last = r ? JSON.parse(r.value) : null;
            }
            catch (_a) { }
            if (last && m.find((x) => x.id === last)) {
                setSelectedId(last);
            }
            else if (m.length) {
                setSelectedId(m[0].id);
            }
            else {
                // No members yet — this is a first-time setup, prompt for name & gender right away
                setAddingMember(true);
            }
        })();
    }, []);
    const allFields = useMemo(() => {
        return [...DEFAULT_DEEN_FIELDS, ...DEFAULT_DUNIYA_FIELDS, ...customFields];
    }, [customFields]);
    const selectedMember = useMemo(() => (members || []).find((m) => m.id === selectedId) || null, [members, selectedId]);
    useEffect(() => {
        // Guard: on first render selectedId is still null (real value loads async).
        // Skip that null write so it never overwrites the previously saved
        // device-owner profile — otherwise every refresh would silently reset
        // to the first member in the family list.
        if (!selectedId)
            return;
        appStorage.set(`last-selected-member:${getFamilyCode()}`, JSON.stringify(selectedId), false).catch(() => { });
    }, [selectedId]);
    useEffect(() => {
        if (!selectedId)
            return;
        loadEntry(selectedId, dateKey(viewDate)).then((data) => {
            setEntry(data || {});
        });
    }, [selectedId, viewDate]);
    // Live-synced month entries: instead of a single collection-wide range
    // query (which can silently return nothing if the Firestore rules don't
    // permit listing/querying the collection, even though reading/writing an
    // individual day's document works fine), we subscribe to each day's own
    // document directly — the same access pattern already used successfully
    // for saving/loading a single day's entry. This way the calendar (and
    // the PDF, which reads this same state) always reflects the latest saved
    // data without requiring a manual refresh.
    useEffect(() => {
        if (!selectedId) {
            setMonthEntries({});
            return;
        }
        const year = monthCursor.year;
        const month0 = monthCursor.month0;
        const total = daysInMonth(year, month0);
        const colRef = db.collection(getCollectionName());
        const liveData = {};
        const unsubscribers = [];
        for (let d = 1; d <= total; d++) {
            const dayStr = pad2(d);
            const docId = `entry:${selectedId}:${year}-${pad2(month0 + 1)}-${dayStr}`;
            const unsub = colRef.doc(docId).onSnapshot((doc) => {
                if (doc.exists) {
                    try {
                        liveData[dayStr] = JSON.parse(doc.data().value);
                    }
                    catch (_a) {
                        delete liveData[dayStr];
                    }
                }
                else {
                    delete liveData[dayStr];
                }
                setMonthEntries(Object.assign({}, liveData));
            }, () => { });
            unsubscribers.push(unsub);
        }
        return () => { unsubscribers.forEach((u) => u()); };
    }, [selectedId, monthCursor, monthRefreshKey]);
    const refreshWeekly = useCallback(() => {
        if (!selectedId)
            return;
        loadWeekly(selectedId, monthCursor.year, monthCursor.month0).then((data) => {
            setWeekly(data);
            const maxPossible = getWeekRanges(daysInMonth(monthCursor.year, monthCursor.month0)).length;
            let highestFilled = 1;
            for (let w = 1; w <= maxPossible; w++) {
                const rec = data[w];
                if (rec && (rec.good || rec.gap || rec.plan))
                    highestFilled = w;
            }
            setWeeklyRowCount(Math.min(Math.max(highestFilled, 1), maxPossible));
        });
    }, [selectedId, monthCursor]);
    useEffect(() => {
        refreshWeekly();
    }, [refreshWeekly]);
    useEffect(() => {
        const docKey = meetingKey(monthCursor.year, monthCursor.month0);
        const docRef = db.collection(getCollectionName()).doc(docKey);
        const unsubscribe = docRef.onSnapshot((doc) => {
            if (doc.exists) {
                try {
                    const data = JSON.parse(doc.data().value);
                    setMeetingState(data);
                }
                catch (e) { }
            }
            else {
                setMeetingState({
                    rows: [
                        { id: "1", topic: "", decision: "", person: "" }
                    ]
                });
            }
        });
        return () => unsubscribe();
    }, [monthCursor]);
    async function handleExportData() {
        try {
            const snap = await db.collection(getCollectionName()).get();
            const exportObj = {};
            snap.docs.forEach((doc) => {
                exportObj[doc.id] = doc.data();
            });
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
            const downloadAnchor = document.createElement("a");
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `daily_task_backup_${getFamilyCode()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }
        catch (err) {
            alert("ডাটা এক্সপোর্ট করতে সমস্যা হয়েছে: " + err.message);
        }
    }
    async function handleImportData(e) {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = async (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    const batch = db.batch();
                    const colRef = db.collection(getCollectionName());
                    Object.keys(parsed).forEach((key) => {
                        const docRef = colRef.doc(key);
                        batch.set(docRef, parsed[key]);
                    });
                    await batch.commit();
                    alert("ডাটা সফলভাবে ইম্পোর্ট করা হয়েছে!");
                    window.location.reload();
                }
                catch (err) {
                    alert("ভুল ব্যাকআপ ফাইল: " + err.message);
                }
            };
        }
    }
    function handleCopyCode() {
        navigator.clipboard.writeText(getFamilyCode());
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    }
    function handleSaveCustomFamilyCode() {
        if (customFamCodeInput.trim()) {
            setFamilyCode(customFamCodeInput.trim());
        }
    }
    function handleGoToArchive() {
        setMonthCursor({ year: archiveYear, month0: archiveMonth0 });
        setViewDate(new Date(archiveYear, archiveMonth0, 1));
        setShowArchiveModal(false);
    }
    function handleSendFeedback() {
        if (!feedbackMsg.trim())
            return;
        const mailtoUrl = `mailto:cheletiboka@gmail.com?subject=Daily Task App Feedback (${getFamilyCode()})&body=${encodeURIComponent(feedbackMsg)}`;
        window.location.href = mailtoUrl;
        setFeedbackMsg("");
        setShowFeedbackModal(false);
    }
    function updateWeekly(weekIdx, field, value) {
        setWeekly((prev) => (Object.assign(Object.assign({}, prev), { [weekIdx]: Object.assign(Object.assign({}, (prev[weekIdx] || {})), { [field]: value }) })));
    }
    function addWeeklyRow() {
        const maxPossible = getWeekRanges(daysInMonth(monthCursor.year, monthCursor.month0)).length;
        setWeeklyRowCount((c) => Math.min(c + 1, maxPossible));
    }
    function addMeetingRow() {
        setMeetingState(prev => (Object.assign(Object.assign({}, prev), { rows: [...(prev.rows || []), { id: String(Date.now()), topic: "", decision: "", person: "" }] })));
    }
    function removeMeetingRow(idx) {
        setMeetingState(prev => {
            const nextRows = [...prev.rows];
            nextRows.splice(idx, 1);
            return Object.assign(Object.assign({}, prev), { rows: nextRows });
        });
    }
    function updateMeetingRow(idx, field, value) {
        setMeetingState(prev => {
            const nextRows = [...prev.rows];
            nextRows[idx] = Object.assign(Object.assign({}, nextRows[idx]), { [field]: value });
            return Object.assign(Object.assign({}, prev), { rows: nextRows });
        });
    }
    async function handleSaveWeekly() {
        if (!selectedId)
            return;
        setSavingWeekly(true);
        try {
            await saveWeekly(selectedId, monthCursor.year, monthCursor.month0, weekly);
            setWeeklySavedTick(true);
            setTimeout(() => setWeeklySavedTick(false), 1600);
        }
        catch (err) {
            alert("সাপ্তাহিক রিফ্লেকশন সেভ করতে সমস্যা হয়েছে: " + err.message);
        }
        finally {
            setSavingWeekly(false);
        }
    }
    async function handleSaveMeeting() {
        setSavingMeeting(true);
        try {
            await saveMeetingData(monthCursor.year, monthCursor.month0, meetingState);
            setMeetingSavedTick(true);
            setTimeout(() => setMeetingSavedTick(false), 1600);
        }
        catch (err) {
            alert("মাসিক সভা সেভ করতে সমস্যা হয়েছে: " + err.message);
        }
        finally {
            setSavingMeeting(false);
        }
    }
    async function handleAddCustomField() {
        if (!newCustomLabel.trim())
            return;
        const key = `custom_${Date.now()}`;
        const newField = { key, label: newCustomLabel.trim(), shortLabel: newCustomLabel.trim(), type: "bool", isCustom: true };
        const updated = [...customFields, newField];
        setCustomFields(updated);
        setNewCustomLabel("");
        setShowAddCustom(false);
        try {
            await saveCustomFields(updated);
        }
        catch (err) {
            alert("কাস্টম টাস্ক সিংক করতে সমস্যা হয়েছে: " + err.message);
        }
    }
    async function handleAddMember() {
        const name = newName.trim();
        if (!name)
            return;
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const next = [...(members || []), { id, name, gender: newGender }];
        setMembers(next);
        setSelectedId(id);
        setNewName("");
        setNewGender("male");
        setAddingMember(false);
        try {
            await saveMembers(next);
        }
        catch (err) {
            alert("সদস্য সিংক করতে সমস্যা হয়েছে: " + err.message);
        }
    }
    async function handleRemoveMember(m) {
        const ok = window.confirm(`আপনি কি নিশ্চিত "${m.name}" কে সদস্য তালিকা থেকে বাদ দিতে চান? এই সদস্যের নাম আর দেখা যাবে না, তবে পূর্বের সেভ করা ডাটা মুছে যাবে না।`);
        if (!ok)
            return;
        const next = (members || []).filter((x) => x.id !== m.id);
        setMembers(next);
        try {
            await saveMembers(next);
        }
        catch (err) {
            alert("সদস্য সিংক করতে সমস্যা হয়েছে: " + err.message);
        }
        if (selectedId === m.id) {
            setSelectedId(next.length ? next[0].id : null);
        }
    }
    function updateField(key, value) {
        setEntry((prev) => (Object.assign(Object.assign({}, prev), { [key]: value })));
    }
    async function handleSave() {
        if (!selectedId)
            return;
        setSaving(true);
        try {
            await saveEntry(selectedId, dateKey(viewDate), entry);
            setSavedTick(true);
            setTimeout(() => setSavedTick(false), 1600);
            setMonthRefreshKey((k) => k + 1);
        }
        catch (err) {
            alert("ডাটা সেভ করতে সমস্যা হয়েছে: " + err.message);
        }
        finally {
            setSaving(false);
        }
    }
    const streak = useMemo(() => calculateStreak(monthEntries, selectedMember, allFields, monthCursor.year, monthCursor.month0), [monthEntries, selectedMember, allFields, monthCursor]);
    const monthStats = useMemo(() => {
        const total = daysInMonth(monthCursor.year, monthCursor.month0);
        let filled = 0;
        let scoreSum = 0;
        for (let d = 1; d <= total; d++) {
            const e = monthEntries[pad2(d)];
            const s = dailyScore(e, selectedMember, allFields);
            if (s !== null) {
                filled += 1;
                scoreSum += s;
            }
        }
        const avg = filled ? scoreSum / filled : 0;
        return { total, filled, avgPct: Math.round(avg * 100) };
    }, [monthEntries, monthCursor, selectedMember, allFields]);
    if (members === null)
        return React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-[#F4F7F1]" },
            React.createElement(Loader2, { className: "animate-spin", color: "var(--theme-primary)", size: 32 }));
    if (printMode) {
        const total = monthStats.total;
        const rows = Array.from({ length: total }, (_, i) => i + 1);
        return (React.createElement("div", { style: { color: "#111", background: "#fff" } },
            React.createElement("style", null, `
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 3px 2px; font-size: 9px; text-align: center; vertical-align: middle; word-wrap: break-word; }
          th { background: var(--theme-primary) !important; color: #fff !important; font-weight: 600; font-size: 9px; height: 42px; }
          tr { height: 27px; }

          .meeting-table th { background: #f0f4f1 !important; color: #000 !important; font-size: 11px; font-weight: 700; height: 30px; border: 1px solid #333; }
          .meeting-table td { font-size: 10px; padding: 6px; border: 1px solid #333; text-align: left; }
          .meeting-table tr { page-break-inside: avoid; break-inside: avoid; }
        `),
            React.createElement("div", { className: "w-full mx-auto print-page", style: { minHeight: "270mm" } },
                React.createElement("div", { className: "flex items-center justify-between mb-2 no-print" },
                    React.createElement("button", { onClick: () => setPrintMode(false), className: "px-3 py-1.5 rounded-lg border text-sm font-semibold bg-white", style: { borderColor: "#D8DED3" } }, "\u2190 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8"),
                    React.createElement("button", { onClick: () => window.print(), className: "px-4 py-1.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2", style: { background: "var(--theme-primary)" } },
                        React.createElement(Printer, { size: 14 }),
                        " \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F / PDF \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 (\u09E8\u099F\u09BF \u09AA\u09C7\u099C)")),
                React.createElement("div", { style: { borderBottom: "2px solid var(--theme-primary)", paddingBottom: "4px", marginBottom: "6px" }, className: "flex justify-between items-end" },
                    React.createElement("div", null,
                        React.createElement("h1", { style: { fontFamily: "'Noto Serif Bengali', serif", fontSize: 15, fontWeight: 700, margin: 0, color: "var(--theme-primary)" } }, "\u09AE\u09BE\u09B8\u09BF\u0995 \u0986\u09AE\u09B2 \u0993 \u09AA\u09BE\u09B0\u09AB\u09B0\u09AE\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8 \u09B0\u09BF\u09AA\u09CB\u09B0\u09CD\u099F"),
                        React.createElement("p", { style: { fontSize: 9, margin: "2px 0 0 0", color: "#444" } },
                            "\u09AE\u09BE\u09B8: ",
                            React.createElement("b", null,
                                BN_MONTHS[monthCursor.month0],
                                " ",
                                toBn(monthCursor.year)),
                            " \u00A0|\u00A0 \u09B8\u09A6\u09B8\u09CD\u09AF: ",
                            React.createElement("b", null, selectedMember === null || selectedMember === void 0 ? void 0 : selectedMember.name),
                            " \u00A0|\u00A0 \u0995\u09CB\u09A1: ",
                            React.createElement("b", null, getFamilyCode()))),
                    React.createElement("div", { style: { fontSize: 9, textAlign: "right", color: "#333" } },
                        "\u09AA\u09C2\u09B0\u09A3 \u0995\u09B0\u09BE \u09A6\u09BF\u09A8: ",
                        React.createElement("b", null,
                            toBn(monthStats.filled),
                            "/",
                            toBn(total)),
                        " \u00A0|\u00A0 \u0997\u09A1\u09BC \u09B8\u09CD\u0995\u09CB\u09B0: ",
                        React.createElement("b", null,
                            toBn(monthStats.avgPct),
                            "%"))),
                React.createElement("table", { className: "print-daily-table" },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: { width: "26px" } }, "\u09A4\u09BE\u0982"),
                            allFields.map((f) => (React.createElement("th", { key: f.key }, f.shortLabel || f.label))),
                            React.createElement("th", { style: { width: "34px" } }, "\u09B8\u09CD\u0995\u09CB\u09B0"))),
                    React.createElement("tbody", null, rows.map((d) => {
                        const e = monthEntries[pad2(d)];
                        const s = dailyScore(e, selectedMember, allFields);
                        return (React.createElement("tr", { key: d },
                            React.createElement("td", { style: { fontWeight: 700, background: "#f0f4f1" } }, toBn(d)),
                            allFields.map((f) => {
                                if (!fieldApplies(f, selectedMember))
                                    return React.createElement("td", { key: f.key, style: { color: "#ccc" } }, "\u2014");
                                if (!e)
                                    return React.createElement("td", { key: f.key });
                                const v = e[f.key];
                                let disp = f.type === "bool" ? (v ? "✓" : "") : (v !== undefined && v !== "" ? toBn(v) : "");
                                return React.createElement("td", { key: f.key, style: { color: f.type === "bool" && v ? "var(--theme-primary)" : "#111", fontWeight: f.type === "bool" && v ? "bold" : "normal" } }, disp);
                            }),
                            React.createElement("td", { style: { fontWeight: 700, background: "#f0f4f1" } }, s === null ? "" : toBn(Math.round(s * 100)) + "%")));
                    })),
                    React.createElement("tfoot", null,
                        React.createElement("tr", { style: { background: "#E7EEE3", fontWeight: 700 } },
                            React.createElement("td", null, "%"),
                            allFields.map((f) => {
                                const pct = fieldPercent(f, monthEntries, total, selectedMember);
                                return React.createElement("td", { key: f.key }, pct === null ? "—" : toBn(pct) + "%");
                            }),
                            React.createElement("td", null,
                                toBn(monthStats.avgPct),
                                "%")))),
                React.createElement("div", { style: { fontSize: "8px", textTransform: "uppercase", color: "#888", textAlign: "right", marginTop: "4px" } }, "\u09AA\u09C3\u09B7\u09CD\u09A0\u09BE \u09E7")),
            React.createElement("div", { className: "page-break w-full mx-auto print-page", style: { paddingTop: "8mm" } },
                React.createElement("div", { style: { marginBottom: "15px" } },
                    React.createElement("h3", { style: { fontSize: "12px", fontWeight: "bold", margin: "0 0 6px 0", color: "var(--theme-primary)" } }, "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u09B0\u09BF\u09AB\u09CD\u09B2\u09C7\u0995\u09B6\u09A8 (Weekly Reflection)"),
                    React.createElement("table", { className: "meeting-table" },
                        React.createElement("thead", null,
                            React.createElement("tr", null,
                                React.createElement("th", { style: { width: "10%" } }, "\u09B8\u09AA\u09CD\u09A4\u09BE\u09B9"),
                                React.createElement("th", { style: { width: "30%", textAlign: "left", paddingLeft: "8px" } }, "\u09AF\u09BE \u09AD\u09BE\u09B2\u09CB \u09B9\u09AF\u09BC\u09C7\u099B\u09C7"),
                                React.createElement("th", { style: { width: "30%", textAlign: "left", paddingLeft: "8px" } }, "\u0995\u09CB\u09A5\u09BE\u09AF\u09BC \u0998\u09BE\u099F\u09A4\u09BF \u099B\u09BF\u09B2"),
                                React.createElement("th", { style: { width: "30%", textAlign: "left", paddingLeft: "8px" } }, "\u0986\u0997\u09BE\u09AE\u09C0 \u09AA\u09B0\u09BF\u0995\u09B2\u09CD\u09AA\u09A8\u09BE"))),
                        React.createElement("tbody", null, getWeekRanges(total).slice(0, weeklyRowCount).map(({ week: w, start, end }) => {
                            var _a, _b, _c;
                            return (React.createElement("tr", { key: w },
                                React.createElement("td", { style: { textAlign: "center", fontWeight: "bold" } },
                                    toBn(w),
                                    React.createElement("div", { style: { fontSize: "8px", fontWeight: 400, color: "#555" } },
                                        "(",
                                        toBn(start),
                                        "-",
                                        toBn(end),
                                        ")")),
                                React.createElement("td", { style: { verticalAlign: "top", whiteSpace: "pre-wrap" } }, ((_a = weekly[w]) === null || _a === void 0 ? void 0 : _a.good) || ""),
                                React.createElement("td", { style: { verticalAlign: "top", whiteSpace: "pre-wrap" } }, ((_b = weekly[w]) === null || _b === void 0 ? void 0 : _b.gap) || ""),
                                React.createElement("td", { style: { verticalAlign: "top", whiteSpace: "pre-wrap" } }, ((_c = weekly[w]) === null || _c === void 0 ? void 0 : _c.plan) || "")));
                        })))),
                React.createElement("div", { style: { textAlign: "center", marginBottom: "12px", position: "relative" } },
                    React.createElement("h2", { style: { fontFamily: "'Noto Serif Bengali', serif", fontSize: 20, fontWeight: 700, margin: 0, color: "#000" } }, "\u09AE\u09BE\u09B8\u09BF\u0995 \u09AA\u09BE\u09B0\u09BF\u09AC\u09BE\u09B0\u09BF\u0995 \u09B8\u09AD\u09BE \u0993 \u09B8\u09BF\u09A6\u09CD\u09A7\u09BE\u09A8\u09CD\u09A4"),
                    React.createElement("div", { style: { fontSize: 13, marginTop: "2px", color: "#333", fontWeight: "600" } },
                        BN_MONTHS[monthCursor.month0],
                        "'",
                        toBn(monthCursor.year)),
                    React.createElement("div", { style: { position: "absolute", right: "0", top: "5px", fontSize: "12px", fontWeight: "bold", color: "#111" } }, (() => { const t = new Date(); return `${toBn(t.getDate())} ${BN_MONTHS[t.getMonth()]}, ${toBn(t.getFullYear())}`; })())),
                React.createElement("table", { className: "meeting-table" },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: { width: "8%", textAlign: "center" } }, "\u0995\u09CD\u09B0\u09AE\u09BF\u0995"),
                            React.createElement("th", { style: { width: "25%", textAlign: "left", paddingLeft: "8px" } }, "\u09AC\u09BF\u09B7\u09AF\u09BC"),
                            React.createElement("th", { style: { width: "47%", textAlign: "left", paddingLeft: "8px" } }, "\u0995\u09BE\u09B0\u09CD\u09AF\u09AA\u09B0\u09BF\u09A7\u09BF/\u09B8\u09BF\u09A6\u09CD\u09A7\u09BE\u09A8\u09CD\u09A4"),
                            React.createElement("th", { style: { width: "20%", textAlign: "center" } }, "\u09AC\u09BE\u09B8\u09CD\u09A4\u09AC\u09BE\u09AF\u09BC\u09A8\u0995\u09BE\u09B0\u09C0"))),
                    React.createElement("tbody", null, (meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : [{}]).map((row, idx) => (React.createElement("tr", { key: idx, style: { height: "40px" } },
                        React.createElement("td", { style: { textAlign: "center", fontWeight: "bold" } }, toBn(idx + 1)),
                        React.createElement("td", { style: { fontWeight: "600", verticalAlign: "top", whiteSpace: "pre-wrap" } }, row.topic || ""),
                        React.createElement("td", { style: { verticalAlign: "top", whiteSpace: "pre-wrap" } }, row.decision || ""),
                        React.createElement("td", { style: { textAlign: "center", verticalAlign: "middle" } }, row.person || "")))))),
                React.createElement("div", { style: { fontSize: "8px", textTransform: "uppercase", color: "#888", textAlign: "right", marginTop: "10px" } }, "\u09AA\u09C3\u09B7\u09CD\u09A0\u09BE \u09E8"))));
    }
    const total = monthStats.total;
    const firstOfMonth = new Date(monthCursor.year, monthCursor.month0, 1);
    const leadBlanks = firstOfMonth.getDay();
    return (React.createElement("div", { className: "min-h-screen pb-20 bg-[#F4F7F1]" },
        React.createElement("div", { style: { background: "var(--theme-primary)" }, className: "px-5 pt-6 pb-9 shadow-md relative" },
            React.createElement("div", { className: "flex items-center justify-between" },
                React.createElement("div", { className: "flex items-center gap-2.5" },
                    React.createElement(StarMark, { size: 22 }),
                    React.createElement("div", null,
                        React.createElement("h1", { className: "text-xl font-bold tracking-tight", style: { fontFamily: "'Noto Serif Bengali', serif", color: "#F4F7F1" } }, "Daily Task"),
                        React.createElement("p", { className: "text-[10px] text-emerald-200/80 -mt-1 font-medium" }, "\u0986\u09AE\u09B2 \u0993 \u09AA\u09BE\u09B0\u09BF\u09AC\u09BE\u09B0\u09BF\u0995 \u099F\u09CD\u09B0\u09CD\u09AF\u09BE\u0995\u09BE\u09B0"))),
                React.createElement("div", { className: "relative" },
                    React.createElement("button", { onClick: () => setIsMenuOpen(!isMenuOpen), className: "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/15 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all shadow-sm active:scale-95" },
                        React.createElement(MenuIcon, { size: 16 }),
                        React.createElement("span", null, "\u09AE\u09C7\u09A8\u09C1"),
                        React.createElement(ChevronDown, { size: 14, className: `transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}` })),
                    isMenuOpen && (React.createElement(React.Fragment, null,
                        React.createElement("div", { className: "fixed inset-0 z-40", onClick: () => setIsMenuOpen(false) }),
                        React.createElement("div", { className: "absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-slate-800 text-xs transition-all" },
                            React.createElement("div", { className: "px-4 py-2 border-b border-slate-100 bg-slate-50/70" },
                                React.createElement("div", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider" }, "\u09AB\u09CD\u09AF\u09BE\u09AE\u09BF\u09B2\u09BF \u0995\u09CB\u09A1"),
                                React.createElement("div", { className: "font-bold text-emerald-900 text-sm flex items-center justify-between mt-0.5" },
                                    React.createElement("span", { className: "tracking-wide" }, getFamilyCode()),
                                    React.createElement("button", { onClick: () => { setShowFamilyCodeModal(true); setIsMenuOpen(false); }, className: "text-slate-500 hover:text-emerald-800 p-0.5", title: "\u09AB\u09CD\u09AF\u09BE\u09AE\u09BF\u09B2\u09BF \u0995\u09CB\u09A1 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09C1\u09A8" },
                                        React.createElement(EditIcon, { size: 12 })))),
                            React.createElement("div", { className: "py-1" },
                                React.createElement("div", { className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" },
                                    React.createElement(UsersIcon, { size: 12 }),
                                    " \u09B8\u09A6\u09B8\u09CD\u09AF\u09AC\u09C3\u09A8\u09CD\u09A6"),
                                React.createElement("div", { className: "max-h-36 overflow-y-auto custom-scrollbar px-2" }, members.map((m) => (React.createElement("div", { key: m.id, onClick: () => { setSelectedId(m.id); setIsMenuOpen(false); }, className: `flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer group ${m.id === selectedId ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-slate-50 text-slate-700"}` },
                                    React.createElement("span", { className: "flex items-center gap-2" },
                                        React.createElement(User, { size: 13 }),
                                        " ",
                                        m.name),
                                    React.createElement("span", { className: "flex items-center gap-1.5" },
                                        m.id === selectedId && React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-600" }),
                                        React.createElement("button", { onClick: (e) => { e.stopPropagation(); handleRemoveMember(m); }, className: "p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity", title: "\u09B8\u09A6\u09B8\u09CD\u09AF \u09AC\u09BE\u09A6 \u09A6\u09BF\u09A8" },
                                            React.createElement(Trash, { size: 12 }))))))),
                                !addingMember ? (React.createElement("button", { onClick: () => { setAddingMember(true); setIsMenuOpen(false); }, className: "w-full text-left px-4 py-1.5 text-emerald-800 font-bold hover:bg-slate-50 flex items-center gap-1.5 mt-1" },
                                    React.createElement(Plus, { size: 14 }),
                                    " \u09A8\u09A4\u09C1\u09A8 \u09B8\u09A6\u09B8\u09CD\u09AF \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8")) : null),
                            React.createElement("div", { className: "border-t border-slate-100 my-1" }),
                            React.createElement("div", { className: "py-1" },
                                React.createElement("div", { className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider" }, "\u09A5\u09BF\u09AE \u0995\u09BE\u09B2\u09BE\u09B0"),
                                React.createElement("div", { className: "flex items-center gap-2 px-4 py-1 flex-wrap" }, THEME_PRESETS.map((t) => (React.createElement("button", { key: t.id, type: "button", onClick: () => setThemeColor(t.color), title: t.name, className: "w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 border-2", style: { background: t.color, borderColor: themeColor === t.color ? "#16302B" : "transparent" } }, themeColor === t.color && React.createElement("span", { className: "text-white text-xs font-bold" }, "\u2713")))))),
                            React.createElement("div", { className: "border-t border-slate-100 my-1" }),
                            React.createElement("div", { className: "py-1" },
                                React.createElement("div", { className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider" }, "\u09A1\u09BE\u099F\u09BE \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09AE\u09C7\u09A8\u09CD\u099F"),
                                React.createElement("button", { onClick: () => { handleCopyCode(); }, className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700" },
                                    React.createElement("span", { className: "flex items-center gap-2" },
                                        React.createElement(CopyIcon, { size: 14 }),
                                        " \u09AB\u09CD\u09AF\u09BE\u09AE\u09BF\u09B2\u09BF \u0995\u09CB\u09A1 \u0995\u09AA\u09BF \u0995\u09B0\u09C1\u09A8"),
                                    copiedCode && React.createElement("span", { className: "text-[10px] text-emerald-600 font-bold" }, "\u0995\u09AA\u09BF \u09B9\u09DF\u09C7\u099B\u09C7!")),
                                React.createElement("button", { onClick: () => { handleExportData(); setIsMenuOpen(false); }, className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700" },
                                    React.createElement(DownloadIcon, { size: 14 }),
                                    " \u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA \u09AB\u09BE\u0987\u09B2 \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1"),
                                React.createElement("label", { className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer" },
                                    React.createElement(UploadIcon, { size: 14 }),
                                    " \u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA \u0987\u09AE\u09CD\u09AA\u09CB\u09B0\u09CD\u099F \u09AB\u09BE\u0987\u09B2",
                                    React.createElement("input", { type: "file", accept: ".json", onChange: (e) => { handleImportData(e); setIsMenuOpen(false); }, className: "hidden" })),
                                React.createElement("button", { onClick: () => { setArchiveYear(monthCursor.year); setArchiveMonth0(monthCursor.month0); setShowArchiveModal(true); setIsMenuOpen(false); }, className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700" },
                                    React.createElement(CalIcon, { size: 14 }),
                                    " \u0986\u09B0\u09CD\u0995\u09BE\u0987\u09AD \u09A6\u09C7\u0996\u09C1\u09A8 (\u09AE\u09BE\u09B8/\u09B8\u09BE\u09B2)")),
                            React.createElement("div", { className: "border-t border-slate-100 my-1" }),
                            React.createElement("div", { className: "py-1" },
                                React.createElement("button", { onClick: () => { setShowHelpModal(true); setIsMenuOpen(false); }, className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700" },
                                    React.createElement(HelpCircle, { size: 14 }),
                                    " \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u09C7\u09B0 \u09A8\u09BF\u09DF\u09AE\u09BE\u09AC\u09B2\u09C0"),
                                React.createElement("button", { onClick: () => { setShowFeedbackModal(true); setIsMenuOpen(false); }, className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium text-emerald-800" },
                                    React.createElement(MessageSquare, { size: 14 }),
                                    " \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u099C\u09BE\u09A8\u09BE\u09A8 (\u09AA\u09B0\u09BE\u09AE\u09B0\u09CD\u09B6)"))))))),
            React.createElement("div", { className: "flex items-center justify-between mt-4" },
                React.createElement("div", { className: "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm", style: { background: "#C89B3C", color: "#16302B" } },
                    React.createElement(User, { size: 13 }),
                    " ",
                    selectedMember ? selectedMember.name : "সদস্য বেছে নিন"),
                React.createElement("div", { className: "flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl shrink-0 border border-white/10" },
                    React.createElement("span", { className: "text-sm" }, "\uD83D\uDD25"),
                    React.createElement("span", { className: "text-xs font-bold text-white" },
                        toBn(streak),
                        " \u09A6\u09BF\u09A8"))),
            addingMember && (React.createElement("div", { className: "mt-3 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md" },
                members.length === 0 && (React.createElement("p", { className: "text-[11px] text-emerald-100 font-semibold px-1 mb-1.5" }, "\u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09A4\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09A8\u09BE\u09AE \u0993 \u099C\u09C7\u09A8\u09CD\u09A1\u09BE\u09B0 \u09A6\u09BF\u09AF\u09BC\u09C7 \u09A8\u09BF\u099C\u09C7\u0995\u09C7 \u098F\u0995\u099C\u09A8 \u09B8\u09A6\u09B8\u09CD\u09AF \u09B9\u09BF\u09B8\u09C7\u09AC\u09C7 \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8 \uD83D\uDC47")),
                React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("input", { value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "\u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09A8\u09BE\u09AE...", className: "flex-1 px-3 py-1.5 rounded-xl text-xs text-slate-900 outline-none font-medium" }),
                    React.createElement("select", { value: newGender, onChange: (e) => setNewGender(e.target.value), className: "px-2 py-1.5 rounded-xl text-xs text-slate-900 bg-white outline-none font-medium" },
                        React.createElement("option", { value: "male" }, "\u09AA\u09C1\u09B0\u09C1\u09B7"),
                        React.createElement("option", { value: "female" }, "\u09A8\u09BE\u09B0\u09C0")),
                    React.createElement("button", { onClick: handleAddMember, className: "px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C89B3C] text-[#16302B]" }, "\u09AF\u09CB\u0997"),
                    React.createElement("button", { onClick: () => setAddingMember(false), className: "p-1.5 text-white/80" },
                        React.createElement(X, { size: 16 })))))),
        React.createElement("div", { className: "max-w-2xl mx-auto" },
            React.createElement("div", { className: "px-5 mt-3" },
                React.createElement("div", { className: "bg-white rounded-2xl shadow-sm px-4 py-2.5 flex items-center justify-between border border-slate-200/80" },
                    React.createElement("button", { onClick: () => setViewDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; }), className: "w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-700" },
                        React.createElement(ChevronLeft, { size: 16 })),
                    React.createElement("div", { className: "font-bold text-sm text-slate-800 flex items-center gap-2" },
                        React.createElement(CalIcon, { size: 16, color: "var(--theme-primary)" }),
                        React.createElement("span", null,
                            toBn(viewDate.getDate()),
                            " ",
                            BN_MONTHS[viewDate.getMonth()],
                            " ",
                            toBn(viewDate.getFullYear()))),
                    React.createElement("button", { onClick: () => setViewDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; }), className: "w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-700" },
                        React.createElement(ChevronRight, { size: 16 })))),
            React.createElement("div", { className: "px-5 mt-5 space-y-4" },
                React.createElement(FieldGroup, { title: "\u09A6\u09C8\u09A8\u09A8\u09CD\u09A6\u09BF\u09A8 \u0986\u09AE\u09B2", fields: DEFAULT_DEEN_FIELDS, entry: entry, onChange: updateField, member: selectedMember }),
                React.createElement(FieldGroup, { title: "\u09AC\u09CD\u09AF\u0995\u09CD\u09A4\u09BF\u0997\u09A4 \u0993 \u09AA\u09BE\u09B0\u09BF\u09AC\u09BE\u09B0\u09BF\u0995 \u0985\u09AD\u09CD\u09AF\u09BE\u09B8", fields: DEFAULT_DUNIYA_FIELDS, entry: entry, onChange: updateField, member: selectedMember }),
                React.createElement("div", { className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80" },
                    React.createElement("div", { className: "flex items-center justify-between mb-3" },
                        React.createElement("h3", { className: "text-sm font-bold text-emerald-900" }, "\u0995\u09BE\u09B8\u09CD\u099F\u09AE \u099F\u09BE\u09B8\u09CD\u0995 (\u09AC\u09CD\u09AF\u0995\u09CD\u09A4\u09BF\u0997\u09A4 \u09B2\u0995\u09CD\u09B7\u09CD\u09AF)"),
                        React.createElement("button", { onClick: () => setShowAddCustom(true), className: "text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100" },
                            React.createElement(Plus, { size: 12 }),
                            " \u09A8\u09A4\u09C1\u09A8 \u099F\u09BE\u09B8\u09CD\u0995")),
                    customFields.length === 0 ? (React.createElement("p", { className: "text-xs text-slate-400 text-center py-2" }, "\u0995\u09CB\u09A8 \u0995\u09BE\u09B8\u09CD\u099F\u09AE \u099F\u09BE\u09B8\u09CD\u0995 \u09A8\u09C7\u0987\u0964 \u0989\u09AA\u09B0\u09C7 \u09AC\u09CB\u09A4\u09BE\u09AE\u09C7 \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C7 \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964")) : (customFields.map((f) => (React.createElement("div", { key: f.key, className: "flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0" },
                        React.createElement("span", { className: "text-sm font-medium text-slate-700" },
                            React.createElement(LabelText, { text: f.label })),
                        React.createElement(BoolToggle, { value: !!entry[f.key], onChange: (v) => updateField(f.key, v) })))))),
                React.createElement("div", { className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80" },
                    React.createElement("label", { className: "block text-sm font-bold text-slate-800 mb-2" }, "\u09A6\u09BF\u09A8\u09C7\u09B0 \u09A8\u09CB\u099F / \u0986\u09A4\u09CD\u09AE-\u09B8\u09AE\u09BE\u09B2\u09CB\u099A\u09A8\u09BE"),
                    React.createElement("textarea", { value: entry.note || "", onChange: (e) => updateField("note", e.target.value), rows: 2, placeholder: "\u0986\u099C\u0995\u09C7\u09B0 \u0985\u09A8\u09C1\u09AD\u09C2\u09A4\u09BF, \u0985\u09B0\u09CD\u099C\u09A8 \u09AC\u09BE \u09B6\u09C7\u0996\u09BE \u09AC\u09BF\u09B7\u09DF \u09B2\u09BF\u0996\u09C1\u09A8...", className: "w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-700 transition-all resize-none bg-slate-50/50 focus:bg-white" })),
                React.createElement("button", { onClick: handleSave, className: "w-full h-12 rounded-2xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]", style: { background: savedTick ? "#4C8C74" : "var(--theme-primary)" } }, saving ? React.createElement(Loader2, { className: "animate-spin", size: 18 }) : savedTick ? "সেভ হয়েছে!" : "আজকের ডাটা সেভ করুন")),
            React.createElement("div", { className: "px-5 mt-8" },
                React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h2", { className: "font-bold text-sm text-slate-800" }, "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u09B0\u09BF\u09AB\u09CD\u09B2\u09C7\u0995\u09B6\u09A8"),
                    weeklyRowCount < getWeekRanges(monthStats.total).length && (React.createElement("button", { onClick: addWeeklyRow, className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm" },
                        React.createElement(Plus, { size: 12 }),
                        " \u09B8\u09BE\u09B0\u09BF \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8"))),
                React.createElement("div", { className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4" },
                    React.createElement("div", { className: "overflow-x-auto custom-scrollbar" },
                        React.createElement("table", { className: "w-full border-collapse min-w-[560px]" },
                            React.createElement("thead", null,
                                React.createElement("tr", { className: "bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200" },
                                    React.createElement("th", { className: "py-2.5 px-2 border-r border-slate-200 text-center w-16" }, "\u09B8\u09AA\u09CD\u09A4\u09BE\u09B9"),
                                    React.createElement("th", { className: "py-2.5 px-3 border-r border-slate-200 text-left" }, "\u09AF\u09BE \u09AD\u09BE\u09B2\u09CB \u09B9\u09AF\u09BC\u09C7\u099B\u09C7"),
                                    React.createElement("th", { className: "py-2.5 px-3 border-r border-slate-200 text-left" }, "\u0995\u09CB\u09A5\u09BE\u09AF\u09BC \u0998\u09BE\u099F\u09A4\u09BF \u099B\u09BF\u09B2"),
                                    React.createElement("th", { className: "py-2.5 px-3 text-left" }, "\u0986\u0997\u09BE\u09AE\u09C0 \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u09AA\u09B0\u09BF\u0995\u09B2\u09CD\u09AA\u09A8\u09BE"))),
                            React.createElement("tbody", null, getWeekRanges(monthStats.total).slice(0, weeklyRowCount).map(({ week: w, start, end }) => {
                                var _a, _b, _c;
                                return (React.createElement("tr", { key: w, className: "border-b border-slate-200 hover:bg-slate-50/50" },
                                    React.createElement("td", { className: "py-2 px-1 border-r border-slate-200 text-center font-bold text-xs text-emerald-900 bg-slate-50/80" },
                                        "\u09B8\u09AA\u09CD\u09A4\u09BE\u09B9 ",
                                        toBn(w),
                                        React.createElement("div", { className: "text-[9px] font-semibold text-slate-400 mt-0.5" },
                                            "(",
                                            toBn(start),
                                            "-",
                                            toBn(end),
                                            ")")),
                                    React.createElement("td", { className: "p-1.5 border-r border-slate-200" },
                                        React.createElement("textarea", { value: ((_a = weekly[w]) === null || _a === void 0 ? void 0 : _a.good) || "", onChange: (e) => updateWeekly(w, "good", e.target.value), placeholder: "\u098F\u0987 \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7 \u09AF\u09BE \u09AD\u09BE\u09B2\u09CB \u09B9\u09AF\u09BC\u09C7\u099B\u09C7...", rows: 2, className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none" })),
                                    React.createElement("td", { className: "p-1.5 border-r border-slate-200" },
                                        React.createElement("textarea", { value: ((_b = weekly[w]) === null || _b === void 0 ? void 0 : _b.gap) || "", onChange: (e) => updateWeekly(w, "gap", e.target.value), placeholder: "\u0995\u09CB\u09A5\u09BE\u09AF\u09BC \u0998\u09BE\u099F\u09A4\u09BF \u099B\u09BF\u09B2...", rows: 2, className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none" })),
                                    React.createElement("td", { className: "p-1.5" },
                                        React.createElement("textarea", { value: ((_c = weekly[w]) === null || _c === void 0 ? void 0 : _c.plan) || "", onChange: (e) => updateWeekly(w, "plan", e.target.value), placeholder: "\u0986\u0997\u09BE\u09AE\u09C0 \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u09AA\u09B0\u09BF\u0995\u09B2\u09CD\u09AA\u09A8\u09BE...", rows: 2, className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none" }))));
                            })))),
                    React.createElement("button", { onClick: handleSaveWeekly, className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm" }, savingWeekly ? React.createElement(Loader2, { className: "animate-spin", size: 14 }) : weeklySavedTick ? "সেভ হয়েছে!" : "সাপ্তাহিক রিফ্লেকশন সেভ করুন"))),
            React.createElement("div", { className: "px-5 mt-8" },
                React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h2", { className: "font-bold flex items-center gap-1.5 text-sm text-slate-800" },
                        React.createElement(CalIcon, { size: 16, color: "var(--theme-primary)" }),
                        " \u09AE\u09BE\u09B8\u09BF\u0995 \u0993\u09AD\u09BE\u09B0\u09AD\u09BF\u0989"),
                    React.createElement("div", { className: "flex items-center gap-1.5" },
                        React.createElement("button", { onClick: () => setMonthRefreshKey((k) => k + 1), title: "\u0995\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09A1\u09BE\u09B0 \u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6 \u0995\u09B0\u09C1\u09A8", className: "w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-emerald-800 hover:bg-slate-50" },
                            React.createElement(RefreshIcon, { size: 13 })),
                        React.createElement("div", { className: "flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm" },
                            React.createElement("button", { onClick: () => setMonthCursor((c) => (c.month0 === 0 ? { year: c.year - 1, month0: 11 } : { year: c.year, month0: c.month0 - 1 })), className: "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100" },
                                React.createElement(ChevronLeft, { size: 14 })),
                            React.createElement("span", { className: "text-xs font-bold px-1 text-slate-700" },
                                BN_MONTHS[monthCursor.month0],
                                " ",
                                toBn(monthCursor.year)),
                            React.createElement("button", { onClick: () => setMonthCursor((c) => (c.month0 === 11 ? { year: c.year + 1, month0: 0 } : { year: c.year, month0: c.month0 + 1 })), className: "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100" },
                                React.createElement(ChevronRight, { size: 14 }))))),
                React.createElement("div", { className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80" },
                    React.createElement("div", { className: "flex items-center justify-between mb-3 pb-3 border-b border-slate-100" },
                        React.createElement("div", null,
                            React.createElement("div", { className: "text-[10px] text-slate-400 font-bold" }, "\u0997\u09A1\u09BC \u09B8\u09CD\u0995\u09CB\u09B0"),
                            React.createElement("div", { className: "text-xl font-bold text-emerald-950" },
                                toBn(monthStats.avgPct),
                                "%")),
                        React.createElement("div", null,
                            React.createElement("div", { className: "text-[10px] text-slate-400 font-bold" }, "\u09AA\u09C2\u09B0\u09A3 \u0995\u09B0\u09BE \u09A6\u09BF\u09A8"),
                            React.createElement("div", { className: "text-xl font-bold text-emerald-950" },
                                toBn(monthStats.filled),
                                "/",
                                toBn(total))),
                        React.createElement("button", { onClick: () => setPrintMode(true), className: "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-100 hover:bg-emerald-100 transition-all" },
                            React.createElement(Printer, { size: 13 }),
                            " PDF / \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F (\u09E8 \u09AA\u09C7\u099C)")),
                    React.createElement(ProgressChart, { monthEntries: monthEntries, totalDays: monthStats.total, member: selectedMember, allFields: allFields }),
                    React.createElement("div", { className: "mt-4" },
                        React.createElement("div", { className: "grid grid-cols-7 gap-1.5" },
                            BN_WEEKDAYS.map((w) => (React.createElement("div", { key: w, className: "text-center text-[9px] font-bold text-slate-400" }, w))),
                            Array.from({ length: leadBlanks }).map((_, i) => (React.createElement("div", { key: "b" + i }))),
                            Array.from({ length: total }, (_, i) => i + 1).map((d) => {
                                const e = monthEntries[pad2(d)];
                                const s = dailyScore(e, selectedMember, allFields);
                                return (React.createElement("button", { key: d, onClick: () => setViewDate(new Date(monthCursor.year, monthCursor.month0, d)), className: "h-7 w-full rounded-lg flex items-center justify-center text-[10px] font-bold transition-transform active:scale-90 shadow-sm", style: { background: scoreColor(s), color: s !== null && s >= 0.35 ? "#fff" : "#555" } }, toBn(d)));
                            }))))),
            React.createElement("div", { className: "px-5 mt-8" },
                React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("h2", { className: "font-bold text-sm text-slate-800" }, "\u09AE\u09BE\u09B8\u09BF\u0995 \u09AA\u09BE\u09B0\u09BF\u09AC\u09BE\u09B0\u09BF\u0995 \u09B8\u09AD\u09BE \u0993 \u09B8\u09BF\u09A6\u09CD\u09A7\u09BE\u09A8\u09CD\u09A4"),
                        React.createElement("span", { className: "text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold" }, "\u09B2\u09BE\u0987\u09AD \u09B8\u09BF\u0982\u0995")),
                    React.createElement("button", { onClick: addMeetingRow, className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm" },
                        React.createElement(Plus, { size: 12 }),
                        " \u09B8\u09BE\u09B0\u09BF \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8")),
                React.createElement("div", { className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4" },
                    React.createElement("div", { className: "pb-1" },
                        React.createElement("p", { className: "text-xs text-slate-500 font-medium" },
                            BN_MONTHS[monthCursor.month0],
                            "'",
                            toBn(monthCursor.year),
                            " \u2014 \u09B8\u09AD\u09BE\u09B0 \u09A4\u09BE\u09B0\u09BF\u0996 \u0985\u099F\u09CB\u09AE\u09C7\u099F\u09BF\u0995 \u0986\u099C\u0995\u09C7\u09B0 \u09A4\u09BE\u09B0\u09BF\u0996 (",
                            (() => { const t = new Date(); return `${toBn(t.getDate())} ${BN_MONTHS[t.getMonth()]}, ${toBn(t.getFullYear())}`; })(),
                            ") \u09B9\u09BF\u09B8\u09C7\u09AC\u09C7 \u09A6\u09C7\u0996\u09BE\u09AC\u09C7")),
                    React.createElement("div", { className: "overflow-x-auto custom-scrollbar" },
                        React.createElement("table", { className: "w-full border-collapse min-w-[500px]" },
                            React.createElement("thead", null,
                                React.createElement("tr", { className: "bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200" },
                                    React.createElement("th", { onClick: addMeetingRow, title: "\u09A8\u09A4\u09C1\u09A8 \u09B8\u09BE\u09B0\u09BF \u09AF\u09CB\u0997 \u0995\u09B0\u09A4\u09C7 \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C1\u09A8", className: "py-2.5 px-2 border-r border-slate-200 text-center w-12 cursor-pointer hover:bg-emerald-100 text-emerald-900 transition-colors select-none" }, "\u0995\u09CD\u09B0. \u271A"),
                                    React.createElement("th", { className: "py-2.5 px-3 border-r border-slate-200 text-left w-1/4" }, "\u09AC\u09BF\u09B7\u09AF\u09BC"),
                                    React.createElement("th", { className: "py-2.5 px-3 border-r border-slate-200 text-left" }, "\u0995\u09BE\u09B0\u09CD\u09AF\u09AA\u09B0\u09BF\u09A7\u09BF/\u09B8\u09BF\u09A6\u09CD\u09A7\u09BE\u09A8\u09CD\u09A4"),
                                    React.createElement("th", { className: "py-2.5 px-3 border-r border-slate-200 text-center w-1/4" }, "\u09AC\u09BE\u09B8\u09CD\u09A4\u09AC\u09BE\u09AF\u09BC\u09A8\u0995\u09BE\u09B0\u09C0"),
                                    React.createElement("th", { className: "py-2.5 px-1 text-center w-8" }))),
                            React.createElement("tbody", null, (meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : []).map((row, idx) => (React.createElement("tr", { key: row.id || idx, className: "border-b border-slate-200 hover:bg-slate-50/50" },
                                React.createElement("td", { className: "py-2 px-1 border-r border-slate-200 text-center font-bold text-xs text-slate-700 bg-slate-50/80" }, toBn(idx + 1)),
                                React.createElement("td", { className: "p-1.5 border-r border-slate-200" },
                                    React.createElement("textarea", { value: row.topic || "", onChange: (e) => updateMeetingRow(idx, "topic", e.target.value), placeholder: "\u09AC\u09BF\u09B7\u09AF\u09BC...", rows: 2, className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 font-semibold bg-white resize-none" })),
                                React.createElement("td", { className: "p-1.5 border-r border-slate-200" },
                                    React.createElement("textarea", { value: row.decision || "", onChange: (e) => updateMeetingRow(idx, "decision", e.target.value), placeholder: "\u0995\u09BE\u09B0\u09CD\u09AF\u09AA\u09B0\u09BF\u09A7\u09BF/\u09B8\u09BF\u09A6\u09CD\u09A7\u09BE\u09A8\u09CD\u09A4...", rows: 2, className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none" })),
                                React.createElement("td", { className: "p-1.5 border-r border-slate-200" },
                                    React.createElement("input", { type: "text", value: row.person || "", onChange: (e) => updateMeetingRow(idx, "person", e.target.value), placeholder: "\u09AC\u09BE\u09B8\u09CD\u09A4\u09AC\u09BE\u09AF\u09BC\u09A8\u0995\u09BE\u09B0\u09C0", className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 text-center font-medium bg-white" })),
                                React.createElement("td", { className: "p-1 text-center" }, meetingState.rows.length > 1 && (React.createElement("button", { onClick: () => removeMeetingRow(idx), className: "text-red-400 hover:text-red-600 p-1" },
                                    React.createElement(Trash, { size: 14 })))))))))),
                    React.createElement("button", { onClick: handleSaveMeeting, className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm" }, savingMeeting ? React.createElement(Loader2, { className: "animate-spin", size: 16 }) : meetingSavedTick ? "সেভ ও সিংক হয়েছে!" : "মাসিক সভা ও সিদ্ধান্ত সেভ করুন")))),
        showArchiveModal && (React.createElement("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50" },
            React.createElement("div", { className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100" },
                React.createElement("h3", { className: "font-bold text-sm mb-1 text-slate-800" }, "\u0986\u09B0\u09CD\u0995\u09BE\u0987\u09AD \u09A6\u09C7\u0996\u09C1\u09A8"),
                React.createElement("p", { className: "text-[11px] text-slate-500 mb-3" }, "\u09AF\u09C7 \u09AE\u09BE\u09B8 \u0993 \u09B8\u09BE\u09B2\u09C7\u09B0 \u09A1\u09BE\u099F\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u099A\u09BE\u09A8 \u09A4\u09BE \u09AC\u09C7\u099B\u09C7 \u09A8\u09BF\u09A8 \u2014 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09C7\u0987 \u09AE\u09BE\u09B8\u09C7\u09B0 \u09A6\u09C8\u09A8\u09BF\u0995 \u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF, \u09AE\u09BE\u09B8\u09BF\u0995 \u0993\u09AD\u09BE\u09B0\u09AD\u09BF\u0989 \u0993 \u09B8\u09AD\u09BE\u09B0 \u09A4\u09A5\u09CD\u09AF \u09A6\u09C7\u0996\u09BE \u09AF\u09BE\u09AC\u09C7\u0964"),
                React.createElement("div", { className: "flex gap-2 mb-4" },
                    React.createElement("select", { value: archiveMonth0, onChange: (e) => setArchiveMonth0(parseInt(e.target.value, 10)), className: "flex-1 h-10 border border-slate-200 rounded-xl px-2 text-xs outline-none font-bold text-emerald-900 focus:border-emerald-800 bg-white" }, BN_MONTHS.map((m, i) => (React.createElement("option", { key: i, value: i }, m)))),
                    React.createElement("select", { value: archiveYear, onChange: (e) => setArchiveYear(parseInt(e.target.value, 10)), className: "w-28 h-10 border border-slate-200 rounded-xl px-2 text-xs outline-none font-bold text-emerald-900 focus:border-emerald-800 bg-white" }, Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 6 + i).map((y) => (React.createElement("option", { key: y, value: y }, toBn(y)))))),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: handleGoToArchive, className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold" }, "\u09A6\u09C7\u0996\u09C1\u09A8"),
                    React.createElement("button", { onClick: () => setShowArchiveModal(false), className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold" }, "\u09AC\u09BE\u09A4\u09BF\u09B2"))))),
        showFamilyCodeModal && (React.createElement("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50" },
            React.createElement("div", { className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100" },
                React.createElement("h3", { className: "font-bold text-sm mb-1 text-slate-800" }, "\u0995\u09BE\u09B8\u09CD\u099F\u09AE \u09AB\u09CD\u09AF\u09BE\u09AE\u09BF\u09B2\u09BF \u0995\u09CB\u09A1 \u09B8\u09C7\u099F \u0995\u09B0\u09C1\u09A8"),
                React.createElement("p", { className: "text-[11px] text-slate-500 mb-3" }, "\u098F\u0995\u099F\u09BF \u0985\u09A8\u09A8\u09CD\u09AF \u0995\u09CB\u09A1 (\u09AF\u09C7\u09AE\u09A8: FAM-KHAN-2026) \u09A6\u09BF\u09A8 \u09AF\u09C7\u09A8 \u09AA\u09B0\u09BF\u09AC\u09BE\u09B0\u09C7\u09B0 \u0985\u09A8\u09CD\u09AF \u09B8\u09A6\u09B8\u09CD\u09AF\u09B0\u09BE \u098F\u099F\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C7 \u09A1\u09BE\u099F\u09BE \u09B8\u09BF\u0982\u0995 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964"),
                React.createElement("input", { value: customFamCodeInput, onChange: (e) => setCustomFamCodeInput(e.target.value), placeholder: "\u09AF\u09C7\u09AE\u09A8: FAM-KHAN-2026", className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-bold uppercase text-emerald-900 focus:border-emerald-800" }),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: handleSaveCustomFamilyCode, className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold" }, "\u09B8\u09C7\u09AD \u0993 \u09B8\u09BF\u0982\u0995 \u0995\u09B0\u09C1\u09A8"),
                    React.createElement("button", { onClick: () => setShowFamilyCodeModal(false), className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold" }, "\u09AC\u09BE\u09A4\u09BF\u09B2"))))),
        showAddCustom && (React.createElement("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50" },
            React.createElement("div", { className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100" },
                React.createElement("h3", { className: "font-bold text-sm mb-2 text-slate-800" }, "\u09A8\u09A4\u09C1\u09A8 \u0995\u09BE\u09B8\u09CD\u099F\u09AE \u099F\u09BE\u09B8\u09CD\u0995\u09C7\u09B0 \u09A8\u09BE\u09AE"),
                React.createElement("input", { value: newCustomLabel, onChange: (e) => setNewCustomLabel(e.target.value), placeholder: "\u09AF\u09C7\u09AE\u09A8: \u09E8 \u09B2\u09BF\u099F\u09BE\u09B0 \u09AA\u09BE\u09A8\u09BF \u09AA\u09BE\u09A8", className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-medium focus:border-emerald-800" }),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: handleAddCustomField, className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold" }, "\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8"),
                    React.createElement("button", { onClick: () => setShowAddCustom(false), className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold" }, "\u09AC\u09BE\u09A4\u09BF\u09B2"))))),
        showHelpModal && (React.createElement("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50" },
            React.createElement("div", { className: "bg-white rounded-3xl p-5 w-full max-w-md shadow-xl border border-slate-100 max-h-[80vh] overflow-y-auto custom-scrollbar" },
                React.createElement("div", { className: "flex items-center justify-between mb-3 border-b pb-2" },
                    React.createElement("h3", { className: "font-bold text-sm text-slate-800 flex items-center gap-2" },
                        React.createElement(HelpCircle, { size: 16, color: "var(--theme-primary)" }),
                        " \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u09C7\u09B0 \u09A8\u09BF\u09DF\u09AE\u09BE\u09AC\u09B2\u09C0"),
                    React.createElement("button", { onClick: () => setShowHelpModal(false) },
                        React.createElement(X, { size: 18, className: "text-slate-400" }))),
                React.createElement("div", { className: "text-xs text-slate-600 space-y-2.5 leading-relaxed font-medium" },
                    React.createElement("p", null, "\u09E7. \u0995\u09BE\u09B8\u09CD\u099F\u09AE \u09AB\u09CD\u09AF\u09BE\u09AE\u09BF\u09B2\u09BF \u0995\u09CB\u09A1 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C7 \u09AA\u09B0\u09BF\u09AC\u09BE\u09B0\u09C7\u09B0 \u09B8\u0995\u09B2 \u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09A1\u09BF\u09AD\u09BE\u0987\u09B8\u09C7 \u098F\u0995\u0987 \u0995\u09CB\u09A1 \u09AC\u09B8\u09BF\u09AF\u09BC\u09C7 \u09A1\u09BE\u099F\u09BE \u09B0\u09BF\u09AF\u09BC\u09C7\u09B2-\u099F\u09BE\u0987\u09AE\u09C7 \u09B8\u09BF\u0982\u0995 \u0995\u09B0\u09C1\u09A8\u0964"),
                    React.createElement("p", null, "\u09E8. \u09AA\u09CD\u09B0\u09A4\u09BF\u09A6\u09BF\u09A8\u09C7\u09B0 \u0986\u09AE\u09B2 \u0993 \u0995\u09BE\u099C\u0997\u09C1\u09B2\u09CB \u099F\u09BF\u0995 \u099A\u09BF\u09B9\u09CD\u09A8 \u09AC\u09BE \u09B8\u0982\u0996\u09CD\u09AF\u09BE \u09A6\u09BF\u09AF\u09BC\u09C7 \u09AA\u09C2\u09B0\u09A3 \u0995\u09B0\u09C1\u09A8\u0964 \"\u09B8\u09C7\u09AD\" \u09AC\u09BE\u099F\u09A8\u09C7 \u099A\u09BE\u09AA \u09A6\u09C7\u0993\u09AF\u09BC\u09BE\u09B0 \u09AA\u09B0 \u09B8\u09AC\u09C1\u099C \u099F\u09BF\u0995 (\u2713) \u09A6\u09C7\u0996\u09BE \u09AE\u09BE\u09A8\u09C7\u0987 \u09A1\u09BE\u099F\u09BE \u09B8\u09BF\u0982\u0995 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964"),
                    React.createElement("p", null, "\u09E9. \u09AE\u09BE\u09B8\u09C7\u09B0 \u09B6\u09C7\u09B7\u09C7 \u09A6\u09C8\u09A8\u09BF\u0995 \u09B0\u09BF\u09AA\u09CB\u09B0\u09CD\u099F, \u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u09B0\u09BF\u09AB\u09CD\u09B2\u09C7\u0995\u09B6\u09A8 \u098F\u09AC\u0982 \u09AA\u09BE\u09B0\u09BF\u09AC\u09BE\u09B0\u09BF\u0995 \u09B8\u09AD\u09BE\u09B0 \u0995\u09BE\u09B0\u09CD\u09AF\u09AA\u09B0\u09BF\u09A7\u09BF \u2014 \u09B8\u09AC\u0995\u09BF\u099B\u09C1 \u098F\u0995\u09B8\u09BE\u09A5\u09C7 \u09E8 \u09AA\u09C3\u09B7\u09CD\u09A0\u09BE\u09B0 PDF \u09AB\u09BE\u0987\u09B2 \u09B9\u09BF\u09B8\u09C7\u09AC\u09C7 \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F/\u09B8\u09C7\u09AD \u09A6\u09C7\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AC\u09C7\u0964"),
                    React.createElement("p", null, "\u09EA. \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u0995\u09AA\u09BF\u09B0 \u09AC\u09BE\u09AE \u09AA\u09BE\u09B6\u09C7 \u09AA\u09BE\u099E\u09CD\u099A \u09AE\u09BE\u09B0\u09CD\u099C\u09BF\u09A8 \u09B0\u09BE\u0996\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u09AF\u09BE \u09AB\u09BE\u0987\u09B2\u09C7 \u09AC\u09BE\u0987\u09A8\u09CD\u09A1\u09BF\u0982 \u0995\u09B0\u09BE\u09B0 \u0989\u09AA\u09AF\u09C1\u0995\u09CD\u09A4\u0964"),
                    React.createElement("p", null, "\u09EB. \u09AE\u09C7\u09A8\u09C1 \u09A5\u09C7\u0995\u09C7 \"\u098F\u0995\u09CD\u09B8\u09AA\u09CB\u09B0\u09CD\u099F\" \u0995\u09B0\u09C7 \u09AA\u09C1\u09B0\u09CB \u09AA\u09B0\u09BF\u09AC\u09BE\u09B0\u09C7\u09B0 \u09A1\u09BE\u099F\u09BE\u09B0 \u098F\u0995\u099F\u09BF \u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA (.json) \u09AB\u09BE\u0987\u09B2 \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u0995\u09B0\u09C7 \u09B0\u09BE\u0996\u09C1\u09A8\u0964 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8\u09C7 \u098F\u0995\u0987 \u09AE\u09C7\u09A8\u09C1 \u09A5\u09C7\u0995\u09C7 \"\u0987\u09AE\u09CD\u09AA\u09CB\u09B0\u09CD\u099F\" \u0995\u09B0\u09C7 \u09A4\u09BE \u09AB\u09BF\u09B0\u09BF\u09AF\u09BC\u09C7 \u0986\u09A8\u09BE \u09AF\u09BE\u09AC\u09C7\u0964"),
                    React.createElement("p", null, "\u09EC. \u09B8\u09C7\u09AD \u09AC\u09BE \u098F\u0995\u09CD\u09B8\u09AA\u09CB\u09B0\u09CD\u099F \u0995\u09B0\u09BE\u09B0 \u09B8\u09AE\u09AF\u09BC \"\u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\" \u099C\u09BE\u09A4\u09C0\u09AF\u09BC \u09AC\u09BE\u09B0\u09CD\u09A4\u09BE \u09A6\u09C7\u0996\u09BE\u09B2\u09C7 \u09B8\u09C7\u099F\u09BF \u09B8\u09BE\u09A7\u09BE\u09B0\u09A3\u09A4 \u0987\u09A8\u09CD\u099F\u09BE\u09B0\u09A8\u09C7\u099F \u09B8\u0982\u09AF\u09CB\u0997 \u09AC\u09BE \u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u099C \u09AA\u09BE\u09B0\u09AE\u09BF\u09B6\u09A8\u09C7\u09B0 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u2014 \u098F\u09AE\u09A8 \u09B9\u09B2\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8, \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09A5\u09BE\u0995\u09B2\u09C7 \u09AB\u09BF\u09A1\u09AC\u09CD\u09AF\u09BE\u0995 \u0985\u09AA\u09B6\u09A8\u09C7 \u099C\u09BE\u09A8\u09BE\u09A8\u0964")),
                React.createElement("button", { onClick: () => setShowHelpModal(false), className: "w-full mt-5 h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold" }, "\u09AC\u09C1\u099D\u09C7\u099B\u09BF")))),
        showFeedbackModal && (React.createElement("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50" },
            React.createElement("div", { className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                    React.createElement("h3", { className: "font-bold text-sm text-slate-800 flex items-center gap-2" },
                        React.createElement(MessageSquare, { size: 16, color: "var(--theme-primary)" }),
                        " \u09AA\u09B0\u09BE\u09AE\u09B0\u09CD\u09B6 \u099C\u09BE\u09A8\u09BE\u09A8"),
                    React.createElement("button", { onClick: () => setShowFeedbackModal(false) },
                        React.createElement(X, { size: 18, className: "text-slate-400" }))),
                React.createElement("p", { className: "text-[11px] text-slate-500 mb-3" }, "\u0986\u09AA\u09A8\u09BE\u09B0 \u09AE\u09A4\u09BE\u09AE\u09A4 \u09AC\u09BE \u09AA\u09B0\u09BE\u09AE\u09B0\u09CD\u09B6 \u09B2\u09BF\u0996\u09C1\u09A8\u0964 \u098F\u099F\u09BF \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09A1\u09C7\u09AD\u09C7\u09B2\u09AA\u09AE\u09C7\u09A8\u09CD\u099F \u099F\u09BF\u09AE\u09C7\u09B0 \u0995\u09BE\u099B\u09C7 \u099A\u09B2\u09C7 \u09AF\u09BE\u09AC\u09C7\u0964"),
                React.createElement("textarea", { value: feedbackMsg, onChange: (e) => setFeedbackMsg(e.target.value), rows: 4, placeholder: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09AE\u09C2\u09B2\u09CD\u09AF \u09AA\u09B0\u09BE\u09AE\u09B0\u09CD\u09B6 \u09B2\u09BF\u0996\u09C1\u09A8...", className: "w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-800 resize-none mb-3 bg-slate-50/50" }),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: handleSendFeedback, className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" },
                        React.createElement(MessageSquare, { size: 14 }),
                        " \u09AA\u09BE\u09A0\u09BF\u09DF\u09C7 \u09A6\u09BF\u09A8"),
                    React.createElement("button", { onClick: () => setShowFeedbackModal(false), className: "h-9 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold" }, "\u09AC\u09BE\u09A4\u09BF\u09B2")))))));
}
function FieldGroup({ title, fields, entry, onChange, member }) {
    return (React.createElement("div", { className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80" },
        React.createElement("h3", { className: "text-sm font-bold mb-3 text-emerald-950" }, title),
        React.createElement("div", { className: "space-y-3" }, fields.filter(f => fieldApplies(f, member)).map((f) => (React.createElement("div", { key: f.key, className: "flex items-center justify-between gap-3" },
            React.createElement("span", { className: "text-xs font-medium text-slate-700" },
                React.createElement(LabelText, { text: f.label })),
            f.type === "bool" && React.createElement(BoolToggle, { value: !!entry[f.key], onChange: (v) => onChange(f.key, v) }),
            f.type === "count" && React.createElement(CountStepper, { value: entry[f.key], max: f.max, onChange: (v) => onChange(f.key, v) }),
            f.type === "number" && React.createElement(NumberField, { value: entry[f.key], target: f.target, onChange: (v) => onChange(f.key, v) })))))));
}
const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(React.createElement(App, null));
