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

// --- Firebase App Check (reCAPTCHA v3) ---
// Runs completely in the background — no puzzle, no visible UI for the user.
// Get your site key from: Firebase Console → App Check → Apps → your web app → reCAPTCHA v3
// (You must also register/enable App Check for Firestore in the console.)
firebase.appCheck().activate(
  new firebase.appCheck.ReCaptchaV3Provider("6LetBG8tAAAAAG8XPxIC3RIWkG9hPnCXY3ZCN4fz"),
  true // isTokenAutoRefreshEnabled
);

const db = firebase.firestore();
db.enablePersistence().catch(() => {});
const auth = firebase.auth();

// Feedback submission — powered by Web3Forms (no server/coding needed).
// 1. Go to https://web3forms.com and enter your email to get a free
//    "Access Key" (arrives instantly by email, no account required).
// 2. Paste that key below, replacing the placeholder text.
const WEB3FORMS_ACCESS_KEY = "4e0befa2-68c6-4c9e-92fb-ecffa3b4b2de";
// ভুল করে ভুল অক্ষর পড়া এড়াতে 0/O এবং 1/I বাদ দেওয়া হয়েছে
const FAMILY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateSecureCode(length) {
  const cryptoObj = window.crypto || window.msCrypto;
  let out = "";
  if (cryptoObj && cryptoObj.getRandomValues) {
    const arr = new Uint32Array(length);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < length; i++) out += FAMILY_CODE_CHARS[arr[i] % FAMILY_CODE_CHARS.length];
  } else {
    // পুরনো ব্রাউজারের জন্য fallback
    for (let i = 0; i < length; i++) out += FAMILY_CODE_CHARS[Math.floor(Math.random() * FAMILY_CODE_CHARS.length)];
  }
  return out;
}
function getFamilyCode() {
  let code = localStorage.getItem("family_code");
  if (!code) {
    // ৬ থেকে বাড়িয়ে ৯ ক্যারেক্টার করা হয়েছে — brute-force আরও কঠিন করতে
    code = "FAM-" + generateSecureCode(9);
    localStorage.setItem("family_code", code);
  }
  return code;
}
const FAMILY_CODE_MIN_LENGTH = 9;
const FAMILY_CODE_MAX_LENGTH = 30;
// শুধু যেসব ক্যারেক্টার Firestore-এর path/collection নাম ভাঙতে পারে বা কপি-পেস্টে সমস্যা করে,
// সেগুলোই বাদ: space, / (path separator), \ , ' এবং " (quoting সমস্যা এড়াতে)।
// বাকি সব ইংরেজি অক্ষর (ছোট/বড় হাতের), সংখ্যা এবং বিশেষ চিহ্ন (@#*!$%^&()_+= ইত্যাদি) allow।
const FAMILY_CODE_CHARSET_PATTERN = /^(?!\.+$)(?!__.*__$)[^\s/\\'"]+$/;
function isFamilyCodeCharsetValid(code) {
  return FAMILY_CODE_CHARSET_PATTERN.test(code);
}
function setFamilyCode(code) {
  if (!code || !code.trim()) return;
  const normalized = code.trim();
  if (normalized.length < FAMILY_CODE_MIN_LENGTH || normalized.length > FAMILY_CODE_MAX_LENGTH) {
    alert(`ফ্যামিলি কোড ${FAMILY_CODE_MIN_LENGTH} থেকে ${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`);
    return;
  }
  if (!isFamilyCodeCharsetValid(normalized)) {
    alert("ফ্যামিলি কোডে স্পেস, / (স্ল্যাশ), \\ (ব্যাকস্ল্যাশ), বা কোটেশন চিহ্ন ( ' \" ) ব্যবহার করা যাবে না।");
    return;
  }
  localStorage.setItem("family_code", normalized);
  localStorage.setItem("family_code_is_custom", "1");
  window.location.reload();
}
const getCollectionName = () => `data_${getFamilyCode()}`;
const appStorage = {
  async get(key, shared) {
    if (!shared) {
      const v = localStorage.getItem(key);
      return v !== null ? {
        key,
        value: v,
        shared
      } : null;
    }
    const doc = await db.collection(getCollectionName()).doc(key).get();
    if (!doc.exists) return null;
    return {
      key,
      value: doc.data().value,
      shared
    };
  },
  async set(key, value, shared) {
    if (!shared) {
      localStorage.setItem(key, value);
      return {
        key,
        value,
        shared
      };
    }
    await db.collection(getCollectionName()).doc(key).set({
      value,
      updatedAt: Date.now()
    });
    return {
      key,
      value,
      shared
    };
  },
  async delete(key, shared) {
    if (!shared) {
      localStorage.removeItem(key);
      return {
        key,
        deleted: true,
        shared
      };
    }
    await db.collection(getCollectionName()).doc(key).delete();
    return {
      key,
      deleted: true,
      shared
    };
  },
  async list(prefix, shared) {
    if (!shared) {
      const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
      return {
        keys,
        prefix,
        shared
      };
    }
    let q = db.collection(getCollectionName());
    if (prefix) {
      q = q.where(firebase.firestore.FieldPath.documentId(), ">=", prefix).where(firebase.firestore.FieldPath.documentId(), "<", prefix + "\uf8ff");
    }
    const snap = await q.get();
    const keys = snap.docs.map(d => d.id);
    return {
      keys,
      prefix,
      shared
    };
  }
};
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("dt-update-available"));
          }
        });
      });
    }).catch(() => {});
  });
}
const {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} = React;
function Icon({
  children,
  size = 18,
  color = "currentColor",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: style
  }, children);
}
function Plus({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }));
}
function ChevronLeft({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  }));
}
function ChevronRight({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "9 18 15 12 9 6"
  }));
}
function Printer({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 6 2 18 2 18 9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "14",
    width: "12",
    height: "8"
  }));
}
function Check({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }));
}
function X({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }));
}
function User({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  }));
}
function CalIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  }));
}
function DownloadIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "7 10 12 15 17 10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "15",
    x2: "12",
    y2: "3"
  }));
}
function UploadIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15"
  }));
}
function Trash({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3 6 5 6 21 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  }));
}
function MenuIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "6",
    x2: "21",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "18",
    x2: "21",
    y2: "18"
  }));
}
function CopyIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "13",
    height: "13",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
  }));
}
function HelpCircle({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  }));
}
function MessageSquare({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  }));
}
function UsersIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 21v-2a4 4 0 0 1 3-3.87"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "3.13",
    r: "3"
  }));
}
function ChevronDown({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }));
}
function EditIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
  }));
}
function InfoIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  }));
}
function RefreshIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "23 4 23 10 17 10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "1 20 1 14 7 14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
  }));
}
function Loader2({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "2",
    x2: "12",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12",
    y2: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4.93",
    y1: "4.93",
    x2: "7.76",
    y2: "7.76"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16.24",
    y1: "16.24",
    x2: "19.07",
    y2: "19.07"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "12",
    x2: "6",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "12",
    x2: "22",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4.93",
    y1: "19.07",
    x2: "7.76",
    y2: "16.24"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16.24",
    y1: "7.76",
    x2: "19.07",
    y2: "4.93"
  }));
}
function ClockIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 7 12 12 15 15"
  }));
}
function useFonts() {
  useEffect(() => {
    const id = "dt-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ---- Theme color (per-device display preference, kept in localStorage only) ----
const THEME_PRESETS = [{
  id: "green",
  name: "সবুজ (ডিফল্ট)",
  color: "#0E4B43"
}, {
  id: "pink",
  name: "পিংক",
  color: "#E0559A"
}, {
  id: "maroon",
  name: "মেরুন",
  color: "#9F1239"
}, {
  id: "purple",
  name: "বেগুনি",
  color: "#6D28D9"
}, {
  id: "blue",
  name: "নীল",
  color: "#1D4ED8"
}, {
  id: "teal",
  name: "টিল",
  color: "#0F766E"
}];
function hexToRgba(hex, alpha) {
  const h = (hex || "#0E4B43").replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const bigint = parseInt(full, 16);
  const r = bigint >> 16 & 255;
  const g = bigint >> 8 & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function getThemeColor(fallback) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--theme-primary").trim();
  return v || fallback;
}
function applyThemeColor(color) {
  document.documentElement.style.setProperty("--theme-primary", color);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}
function useThemeColor() {
  const [themeColor, setThemeColorState] = useState(() => {
    try {
      return localStorage.getItem("theme_color") || THEME_PRESETS[0].color;
    } catch {
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
    } catch {}
  }
  return [themeColor, setThemeColor];
}
const DEFAULT_DEEN_FIELDS = [{
  key: "fardPrayers",
  label: "ফরজ কাযা নামাজ (কয় ওয়াক্ত?)",
  shortLabel: "ফরজ কাযা",
  type: "count",
  max: 5,
  excusable: true
}, {
  key: "jamaat",
  label: "জামায়াতে নামাজ (কয় ওয়াক্ত?)",
  shortLabel: "জামায়াতে নামাজ",
  type: "count",
  max: 5,
  appliesTo: "male",
  excusable: true
}, {
  key: "sunnahNafl",
  label: "সুন্নত/নফল নামাজ",
  shortLabel: "সুন্নত/নফল",
  type: "bool",
  excusable: true
}, {
  key: "tahajjud",
  label: "সিয়াম (ফরজ/নফল) / তাহাজ্জুদ",
  shortLabel: "সিয়াম/তাহাজ্জুদ",
  type: "bool",
  excusable: true
}, {
  key: "morningEveningAzkar",
  label: "সকাল-সন্ধ্যার ও ঘুমানোর সময়ের আমল",
  shortLabel: "সকাল-সন্ধ্যার আমল",
  type: "bool"
}, {
  key: "dhikr",
  label: "ইস্তেগফার/যিকির/দরুদ শরীফ/দু'আ",
  shortLabel: "যিকির/দু'আ",
  type: "bool"
}, {
  key: "quranPages",
  label: "কুরআন/তাফসীর ও আরবি শেখা (পৃষ্ঠা)",
  shortLabel: "কুরআন",
  type: "number",
  target: 5
}, {
  key: "seerah",
  label: "সীরাত/জীবনী/ইতিহাস",
  shortLabel: "সীরাত",
  type: "bool"
}, {
  key: "selfStudy",
  label: "ইলম অর্জন/কোর্সের পড়া",
  shortLabel: "ইলম অর্জন",
  type: "bool"
}, {
  key: "taleem",
  label: "তালিম/পাঠচক্র",
  shortLabel: "তালিম",
  type: "bool"
}, {
  key: "dawah",
  label: "দ্বীনের দাওয়াত",
  shortLabel: " দাওয়াত",
  type: "bool"
}, {
  key: "sadaqah",
  label: "দান/সাদাকা/পরোপকার",
  shortLabel: "সাদাকা",
  type: "bool"
}];
const DEFAULT_DUNIYA_FIELDS = [{
  key: "earlyMorning",
  label: "ভোরের বরকতময় সময়কে কাজে লাগানো",
  shortLabel: "ভোরের সময়",
  type: "bool"
}, {
  key: "exercise",
  label: "ব্যায়াম/শরীরচর্চা",
  shortLabel: "ব্যায়াম",
  type: "bool"
}, {
  key: "healthyFood",
  label: "স্বাস্থ্যকর খাবার",
  shortLabel: "স্বাস্থ্যকর খাবার",
  type: "bool"
}, {
  key: "familyTime",
  label: "মা-বাবা, পরিবার ও আত্মীয়দের হক আদায়",
  shortLabel: "পারিবারিক সময়",
  type: "bool"
}, {
  key: "screenLimit",
  label: "সোশ্যাল মিডিয়া/মোবাইল সীমিত ব্যবহার",
  shortLabel: "সীমিত স্ক্রিন",
  type: "bool"
}, {
  key: "noLyingBackbitingPride",
  label: "মিথ্যা, গীবত ও অহংকার থেকে বেঁচে আছি?",
  shortLabel: "মিথ্যা, গীবত মুক্ত",
  type: "bool"
}, {
  key: "noHurtingOthers",
  label: "অন্যের হক নষ্ট/মনে কষ্ট না দেয়া",
  shortLabel: "সদাচরণ",
  type: "bool"
}, {
  key: "noProcrastination",
  label: "অলসতা/কাজ ফেলে না রাখা",
  shortLabel: "অলসতা মুক্ত",
  type: "bool"
}, {
  key: "phoneOffBy11",
  label: "ঘুমানোর অন্তত ১ ঘণ্টা আগে ফোন/ইন্টারনেট বন্ধ",
  shortLabel: "ঘুমের আগে ফোন বন্ধ",
  type: "bool"
}];
function fieldApplies(field, member) {
  if (!field.appliesTo) return true;
  if (!member || !member.gender) return true;
  return field.appliesTo === member.gender;
}
function isExcused(entry, key) {
  return !!(entry && entry.excused && entry.excused[key]);
}
// Shari'ah note: men have no valid excuse to skip qaza of obligatory (fard)
// prayers — they remain obligated to make them up later. So the "ওজর"
// (excuse) option is intentionally unavailable for fardPrayers when the
// member's gender is male, even though the field is otherwise excusable
// (e.g. for jamaat, sunnah/nafl, siyam/tahajjud, and for female members'
// fardPrayers during valid excuse periods).
function isFieldExcusable(field, member) {
  if (!field.excusable) return false;
  if (field.key === "fardPrayers" && member && member.gender === "male") return false;
  return true;
}
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toBn = n => String(n).replace(/[0-9]/g, d => BN_DIGITS[d]);

// Wraps any Bengali-digit run inside a label string in a distinct monospace,
// bold, emerald-colored span so numbers embedded mid-sentence (e.g. "১ ঘণ্টা")
// don't visually blend into the surrounding text at small font sizes.
function LabelText({
  text
}) {
  const parts = String(text ?? "").split(/([০-৯]+)/g);
  return parts.map((part, i) => /^[০-৯]+$/.test(part) ? /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      fontWeight: 700,
      color: "var(--theme-primary)"
    }
  }, part) : /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, part));
}
const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const BN_WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
const DAILY_INSPIRATIONS = [{
  type: "ayat",
  text: "তোমরা ভয় কর সেদিনকে, যেদিন এক ব্যক্তি থেকে অন্য ব্যক্তি বিন্দুমাত্র উপকৃত হবে না, কারও কাছ থেকে বিনিময় গৃহীত হবে না, কারও সুপারিশ ফলপ্রদ হবে না এবং তারা সাহায্যপ্রাপ্তও হবে না।",
  ref: "সূরা আল-বাকারাহ: ১২৩"
}, {
  type: "ayat",
  text: "হে মুমিনগণ! তোমরা ধৈর্য ও নামাজের মাধ্যমে সাহায্য প্রার্থনা কর। নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সাথে রয়েছেন।",
  ref: "সূরা আল-বাকারাহ: ১৫৩"
}, {
  type: "ayat",
  text: "এবং অবশ্যই আমি তোমাদেরকে পরীক্ষা করব কিছুটা ভয়, ক্ষুধা, মাল ও জানের ক্ষতি এবং ফল-ফসল বিনষ্টের মাধ্যমে। তবে সুসংবাদ দাও সবরকারীদের।",
  ref: "সূরা আল-বাকারাহ: ১৫৫"
}, {
  type: "ayat",
  text: "হে ঈমানদারগণ! তোমরা পরিপূর্ণভাবে ইসলামের অন্তর্ভুক্ত হয়ে যাও এবং শয়তানের পদাঙ্ক অনুসরণ করো না। নিশ্চিতরূপে সে তোমাদের প্রকাশ্য শত্রু।",
  ref: "সূরা আল-বাকারাহ: ২০৮"
}, {
  type: "ayat",
  text: "যাঁরা দাঁড়িয়ে, বসে ও শায়িত অবস্থায় আল্লাহকে স্মরণ করে এবং আসমান ও জমিন সৃষ্টির বিষয়ে চিন্তা-গবেষণা করে, (তারা বলে) পরওয়ারদেগার! এসব তুমি অনর্থক সৃষ্টি করোনি।",
  ref: "সূরা আল-ইমরান: ১৯১"
}, {
  type: "ayat",
  text: "আর এমন লোকদের জন্য কোনো ক্ষমা নেই, যারা মন্দ কাজ করতেই থাকে, এমনকি যখন তাদের কারো মাথার উপর মৃত্যু উপস্থিত হয়, তখন বলতে থাকে: আমি এখন তওবা করছি।",
  ref: "সূরা আন-নিসা: ১৮"
}, {
  type: "ayat",
  text: "যেগুলো সম্পর্কে তোমাদের নিষেধ করা হয়েছে যদি তোমরা সেসব বড় গুনাহগুলো থেকে বেঁচে থাকতে পার, তবে আমি তোমাদের ত্রুটি-বিচ্যুতিগুলো ক্ষমা করে দেব এবং সম্মানজনক স্থানে তোমাদের প্রবেশ করাব।",
  ref: "সূরা আন-নিসা: ৩১"
}, {
  type: "ayat",
  text: "যে লোক সৎকাজের জন্য কোনো সুপারিশ করবে, তা থেকে সেও একটি অংশ পাবে। আর যে লোক সুপারিশ করবে মন্দ কাজের জন্যে সে তার বোঝারও একটি অংশ পাবে।",
  ref: "সূরা আন-নিসা: ৮৫"
}, {
  type: "ayat",
  text: "পার্থিব জীবন ক্রীড়া ও কৌতুক ব্যতীত কিছুই নয়। পরকালের আবাস পরহেজগারদের জন্য শ্রেষ্ঠতর।",
  ref: "সূরা আল-আনআম: ৩২"
}, {
  type: "ayat",
  text: "তোমরা প্রকাশ্য ও প্রচ্ছন্ন গুনাহ পরিত্যাগ কর। নিশ্চয় যারা গুনাহ করেছে, তারা অতিসত্বর তাদের কৃতকর্মের শাস্তি পাবে।",
  ref: "সূরা আল-আনআম: ১২০"
}, {
  type: "ayat",
  text: "যে একটি সৎকর্ম করবে, সে তার দশগুণ পাবে এবং যে একটি মন্দ কাজ করবে, সে তার সমান শাস্তিই পাবে।",
  ref: "সূরা আল-আনআম: ১৬০"
}, {
  type: "ayat",
  text: "আপনি বলুন: আমার নামাজ, আমার কোরবানি এবং আমার জীবন ও মরণ বিশ্ব-প্রতিপালক আল্লাহরই জন্যে।",
  ref: "সূরা আল-আনআম: ১৬২"
}, {
  type: "ayat",
  text: "যারা ঈমানদার, তারা এমন যে, যখন আল্লাহর নাম নেওয়া হয় তখন তাদের অন্তর ভীত হয়ে পড়ে।",
  ref: "সূরা আল-আনফাল: ০২"
}, {
  type: "ayat",
  text: "অবশ্যই যেসব লোক আমার সাক্ষাৎ লাভের আশা রাখে না এবং পার্থিব জীবন নিয়েই উৎফুল্ল রয়েছে... এমন লোকদের ঠিকানা হলো আগুন।",
  ref: "সূরা ইউনুস: ০৭-০৮"
}, {
  type: "ayat",
  text: "মুমিনগণ সফলকাম হয়ে গেছে, যারা নিজেদের নামাজে বিনয়-নম্র; যারা অনর্থক কথাবার্তায় নির্লিপ্ত, যারা জাকাত দান করে থাকে।",
  ref: "সূরা আল-মুমিনুন: ১-৫"
}, {
  type: "ayat",
  text: "হে নবী! মুমিন পুরুষদের বলে দাও তারা যেন নিজেদের দৃষ্টি সংযত করে রাখে এবং নিজেদের লজ্জাস্থান সমূহের হেফাজত করে।",
  ref: "সূরা আন-নূর: ৩০"
}, {
  type: "ayat",
  text: "তোমাদের এ কী অবস্থা, প্রত্যেক উঁচু জায়গায় অনর্থক একটি ইমারত বানিয়ে ফেলেছ এবং বড় বড় প্রাসাদ নির্মাণ করছ, যেন তোমরা চিরকাল থাকবে?",
  ref: "সূরা আশ-শুআরা: ১২৮-১২৯"
}, {
  type: "ayat",
  text: "লোকেরা কি মনে করে রেখেছে, 'আমরা ঈমান এনেছি' কেবলমাত্র এ কথাটুকু বললেই তাদেরকে ছেড়ে দেয়া হবে, আর পরীক্ষা করা হবে না?",
  ref: "সূরা আল-আনকাবুত: ২-৩"
}, {
  type: "ayat",
  text: "নির্দেশ দিয়েছি যে, আমার প্রতি ও তোমার পিতা-মাতার প্রতি কৃতজ্ঞ হও। অবশেষে আমারই নিকট ফিরে আসতে হবে।",
  ref: "সূরা লোকমান: ১৪"
}, {
  type: "ayat",
  text: "বলুন, যারা জানে এবং যারা জানে না; তারা কি সমান হতে পারে? চিন্তাভাবনা কেবল তারাই করে, যারা বুদ্ধিমান।",
  ref: "সূরা আজ-জুমার: ০৯"
}, {
  type: "ayat",
  text: "মুমিনগণ, তোমরা অনেক ধারণা থেকে বেঁচে থাকো। নিশ্চয় কতক ধারণা গুনাহ এবং গোপনীয় বিষয় সন্ধান করো না।",
  ref: "সূরা আল-হুজরাত: ১২"
}, {
  type: "ayat",
  text: "মুমিনগণ! তোমরা আল্লাহ তাআলার কাছে তওবা কর; আন্তরিক তওবা।",
  ref: "সূরা আত-তাহরীম: ০৮"
}, {
  type: "hadith",
  text: "আল্লাহ যার মঙ্গল চান, তাকে দুঃখ-কষ্টে ফেলেন।",
  ref: "রিয়াদুস সালেহীন: ৪০; সহীহ বুখারী: ৫৬৪৫"
}, {
  type: "hadith",
  text: "দুটি কালেমা আছে, যেগুলো দয়াময়ের কাছে অতি প্রিয়, মুখে উচ্চারণ করা খুবই সহজ, দাঁড়িপাল্লায় অত্যন্ত ভারী: 'সুবহানাল্লাহি ওয়া বিহামদিহি সুবহানাল্লাহিল আজীম'।",
  ref: "সহীহ বুখারী: ৬৪৬"
}, {
  type: "hadith",
  text: "কুরআনের তিরিশ আয়াতবিশিষ্ট একটি সূরা এমন আছে, যা তার পাঠকারীর জন্য সুপারিশ করবে... সেটা হচ্ছে 'সূরা মুলক'।",
  ref: "আবু দাউদ: ১৪০০"
}, {
  type: "hadith",
  text: "গোটা দুনিয়াই সম্পদে পরিপূর্ণ। এর মধ্যে সবচেয়ে উত্তম সম্পদ হলো পুণ্যবতী স্ত্রী।",
  ref: "সহীহ মুসলিম; রিয়াদুস স্বা-লিহীন: ২৮৪"
}, {
  type: "hadith",
  text: "মুমিনদের মধ্যে সবার চেয়ে পূর্ণ মুমিন ঐ ব্যক্তি যে চরিত্রে সবার চেয়ে সুন্দর।",
  ref: "তিরমিযী; রিয়াদুস স্বা-লিহীন: ২৮৩"
}, {
  type: "hadith",
  text: "উত্তম স্ত্রী সে, যার প্রতি দৃষ্টিপাত করলে তোমাকে আনন্দিত করে, আদেশ করলে আনুগত্য করে, তুমি দূরে থাকলে তার নিজের ব্যাপারে এবং তোমার সম্পদের ব্যাপারে তোমার অধিকার রক্ষা করে।",
  ref: "তাফসীরে তবারী: ৯৩২৯; মুসনাদে ত্বয়ালিসী: ২৩২৫"
}, {
  type: "hadith",
  text: "যখনই কোনো পুরুষ কোনো মহিলার সাথে নির্জনতা অবলম্বন করে, তখনই শয়তান তাদের তৃতীয় সাথী হয়।",
  ref: "তিরমিযী: ৯৩৪"
}, {
  type: "hadith",
  text: "আমার গত হওয়ার পরে পুরুষের পক্ষে নারীর চেয়ে অধিক ক্ষতিকর কোনো ফিতনা অন্য কিছু ছেড়ে যাচ্ছি না।",
  ref: "সহীহ বুখারী: ৫০৯৬"
}, {
  type: "hadith",
  text: "নারীদের জন্য ঘরই উত্তম।",
  ref: "আবু দাউদ: ৫৭৬"
}, {
  type: "hadith",
  text: "হে নারীরা! তোমরা দান-সদকা কর। কারণ আমি অধিকাংশ জাহান্নামি দেখেছি তোমাদের নারীদেরকে... কারণ তোমরা স্বামীর প্রতি অকৃতজ্ঞতা প্রকাশ কর।",
  ref: "সহীহ বুখারী: ১/৪৪"
}, {
  type: "hadith",
  text: "নারী যখন পাঁচ ওয়াক্ত নামাজ আদায় করবে, রমজান মাসের রোজা রাখবে, নিজ লজ্জাস্থানের হেফাজত করবে এবং স্বামীর আনুগত্য করবে তখন তাকে বলা হবে, যে দরজা দিয়ে ইচ্ছা জান্নাতে প্রবেশ কর।",
  ref: "মুসনাদে আহমাদ: ১৬৬১"
}, {
  type: "hadith",
  text: "কেবলমাত্র দুটি বিষয়ে ঈর্ষা করা যায়: ১) ঐ ব্যক্তি যাকে আল্লাহ কুরআন শিক্ষা দিয়েছেন এবং সে দিবারাত্রি তা তিলাওয়াত ও আমল করে এবং ২) ঐ ব্যক্তি যাকে আল্লাহ সম্পদ দিয়েছেন এবং সে দিবারাত্রি তা দান করে।",
  ref: "সহীহ বুখারী: ৫০২৫; সহীহ মুসলিম: ৮১৫"
}, {
  type: "hadith",
  text: "দোজখীরা হলো: প্রত্যেক অহঙ্কারী, সীমালঙ্ঘনকারী, অবিনয়ী ও উদ্ধত লোক।",
  ref: "সহীহ বুখারী; সহীহ মুসলিম"
}, {
  type: "hadith",
  text: "চরম সর্বনাশ ঐ ব্যক্তির জন্য যে মানুষকে হাসানোর উদ্দেশ্যে মিথ্যা কথা বলে থাকে।",
  ref: "তিরমিযী: ২৩১৫"
}, {
  type: "hadith",
  text: "যে ব্যক্তি গণকের নিকট এসে কোনো বিষয়ে প্রশ্ন করে, তার চল্লিশ দিনের নামাজ কবুল করা হয় না।",
  ref: "সহীহ মুসলিম: ২২৩০"
}, {
  type: "hadith",
  text: "মানুষ দুনিয়াতে যে চরিত্রের মানুষকে ভালোবাসে, কিয়ামতে সে তারই সাথী হবে।",
  ref: "রিয়াদুস স্বা-লিহীন: ৩৭২"
}, {
  type: "hadith",
  text: "প্রকৃত বীর সে নয়, যে কাউকে কুস্তিতে হারিয়ে দেয়। বরং সেই আসল বীর, যে রাগের সময় নিজেকে নিয়ন্ত্রণ করতে পারে।",
  ref: "সহীহ বুখারী: ৬১১৪"
}, {
  type: "hadith",
  text: "যে ব্যক্তি চায় যে তার রিজিক প্রশস্ত হোক এবং আয়ু বৃদ্ধি হোক, সে যেন তার আত্মীয়তার সম্পর্ক অক্ষুণ্ণ রাখে।",
  ref: "সহীহ বুখারী: ২০৬৭"
}, {
  type: "quote",
  text: "হয়ত একটি ক্ষুদ্র কাজ অনেক বিশাল হয়ে যায় কাজটির পেছনে করা নিয়তের কারণে এবং হয়ত অনেক বড় একটা কাজ একদমই তুচ্ছ হয়ে যায় কাজটির পেছনে করা নিয়তের কারণে।",
  ref: "আবদুল্লাহ ইবনে মুবারাক (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "আল্লাহর ওপর নির্ভর করে আপনি যা-ই করবেন তা কখনই কঠিন হবে না, এবং আপনার নিজের ওপর নির্ভর করে আপনি যা-ই করবেন তা কখনই সহজ হবে না।",
  ref: "ইবনে আতাউল্লাহ আল-ইসকান্দারি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "একটি নোংরা পোশাকের জন্য সুগন্ধির চাইতে সাবানের প্রয়োজনীয়তা অনেক বেশি (তসবিহ পাঠের চেয়ে ইস্তিগফারের গুরুত্ব বোঝাতে)।",
  ref: "ইমাম ইবনে আল-জাওজি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "মুনাফিকের জ্ঞান তার কথাবার্তার মাঝে, মুমিনের জ্ঞান তার কাজের মাঝে।",
  ref: "আবদুল্লাহ ইবনে আল-মুতাজ"
}, {
  type: "quote",
  text: "নিজেকে যতই গভীর করে লক্ষ্য করবেন এবং বুঝতে পারবেন, ততই আপনি অন্যদের প্রতি কম বিচারপ্রবণ হবেন।",
  ref: "তারিক রামাদান"
}, {
  type: "quote",
  text: "নিজেকে জোর করে বিনয়ী করুন যতক্ষণ না পর্যন্ত তা আপনার সহজাত স্বভাব হিসেবে প্রতিষ্ঠিত হয়।",
  ref: "শাইখ হামজা ইউসুফ"
}, {
  type: "quote",
  text: "আধ্যাত্মিকতা অর্জনের ব্যাপারটাই হলো নিজের নফসের সাথে ক্রমাগত জিহাদ করা।",
  ref: "তারিক রামাদান"
}, {
  type: "quote",
  text: "আপনি যখন কাউকে সাহায্য করার সুযোগ পেয়ে থাকেন, তখন আনন্দিত হোন এইজন্য যে আল্লাহ ওই ব্যক্তির দু'আর সাড়া আপনার মাধ্যমেই দিচ্ছেন।",
  ref: "নুমান আলী খান"
}, {
  type: "quote",
  text: "একাকী হয়ে যাওয়ার অর্থ হলো তুমি খারাপ সঙ্গ পরিত্যাগ করেছ। কিন্তু একজন ভালো বন্ধু থাকা একাকীত্বের চাইতে উত্তম।",
  ref: "উমর ইবনুল খাত্তাব (রাদিয়াল্লাহু আনহু)"
}, {
  type: "quote",
  text: "নারীদের সীমাবদ্ধতাগুলোর ব্যাপারে ধৈর্য ধারণ করুন। দাম্পত্য জীবনকে ক্ষতিগ্রস্ত করে এমন ভুলগুলো ছাড়া অন্যগুলোকে উপেক্ষা করুন।",
  ref: "শাইখ সালিহ আল-ফাওজান"
}, {
  type: "quote",
  text: "নিজের দোষ-ত্রুটি যে অন্যদের চেয়ে ভালো জানে; তার জন্য রয়েছে সুসংবাদ।",
  ref: "ইবনে হাজম (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "যে কথা ভেবে আমার অন্তর প্রশান্ত হয় তা হলো আমার জন্য যা নির্ধারিত আছে তা কখনো আমাকে ছেড়ে যাবে না এবং যা কিছু আমার পাওয়া হয় না তা কখনো আমার জন্য নির্ধারিত ছিল না।",
  ref: "ইমাম শাফিঈ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "তাহাজ্জুদের সময়ে করা দু'আ হলো এমন একটি তীরের মতন যা লক্ষ্যভ্রষ্ট হয় না।",
  ref: "ইমাম শাফিঈ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "একজন বান্দার জন্য সবচেয়ে জঘন্য পাপগুলোর একটি হলো তার নিজের পাপকাজগুলোকে ছোট করে দেখা।",
  ref: "মুহাম্মাদ বিন আবু বকর আস-সিদ্দিক (রাদিয়াল্লাহু আনহু)"
}, {
  type: "quote",
  text: "ভরপেট খাওয়ার ব্যাপারে সতর্ক হোন কেননা এটা অন্তরকে কঠিন করে দেয়। মাত্রাতিরিক্ত হাসাহাসিতে অন্তর মরে যায়।",
  ref: "ইমাম সুফিয়ান আস-সাওরি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "আপনি যদি একটি জাতিকে কোনো রকম যুদ্ধ ছাড়াই ধ্বংস করে দিতে চান, তাহলে তাদের তরুণ প্রজন্মের মাঝে অশ্লীলতা আর ব্যভিচারের প্রচলনের ব্যবস্থা করে দিন।",
  ref: "সুলতান সালাহ আদ-দ্বীন ইউসুফ আইয়ুবী (রহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "সে কী পেল যে আল্লাহকে হারালো? সে কী হারালো যে আল্লাহকে পেল?",
  ref: "ইবনে আতাউল্লাহ আল-ইসকান্দারি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "ইমাম আহমাদকে তাঁর ছেলে প্রশ্ন করলেন, 'বাবা, আমরা কবে শান্তি পাবো?' তিনি উত্তর দিলেন, 'জান্নাতে আমাদের প্রথম পদচিহ্নটি রাখার মুহূর্তটি থেকেই'।",
  ref: "ইমাম আহমাদ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "অনেক মানুষ দেখেছি যাদের জড়িয়ে রাখার মতন কোনো কাপড় ছিল না, অনেক কাপড় দেখেছি যা তাদের জড়িয়ে রেখেছিল কিন্তু তারা মানুষ ছিল না।",
  ref: "জালালুদ্দিন রুমী (রাহিমাহুল্লাহ)"
}];
const AYAT_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "ayat");
const HADITH_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "hadith");
const QUOTE_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "quote");
const INSPIRATION_TYPE_CYCLE = [AYAT_LIST, HADITH_LIST, QUOTE_LIST];
function getDailyInspiration(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / 86400000);
  const typeList = INSPIRATION_TYPE_CYCLE[dayOfYear % 3];
  const idx = Math.floor(dayOfYear / 3) % typeList.length;
  return typeList[idx];
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatBnDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBn(d.getFullYear())}, ${toBn(hours)}:${toBn(minutes)} ${ampm}`;
}
function isFutureDate(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(d);
  compare.setHours(0, 0, 0, 0);
  return compare.getTime() > today.getTime();
}
function monthPrefix(year, month0) {
  return `${year}-${pad2(month0 + 1)}`;
}
function daysInMonth(year, month0) {
  return new Date(year, month0 + 1, 0).getDate();
}
function isLastDayOfMonth(d) {
  return d.getDate() === daysInMonth(d.getFullYear(), d.getMonth());
}

// Approximate Hijri (tabular Islamic calendar) conversion — accurate within ~1 day
// of moon-sighting-based calendars used locally; for general reference only.
const HIJRI_MONTHS_BN = ["মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি", "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান", "রমজান", "শাওয়াল", "জিলক্বদ", "জিলহজ্জ"];
function gregorianToJD(year, month, day) {
  return Math.floor(1461 * (year + 4800 + Math.floor((month - 14) / 12)) / 4) + Math.floor(367 * (month - 2 - 12 * Math.floor((month - 14) / 12)) / 12) - Math.floor(3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100) / 4) + day - 32075;
}
function islamicToJD(year, month, day) {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 1948440 - 1;
}
function getHijriDate(date) {
  const jd = gregorianToJD(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const adjustedJd = Math.floor(jd) + 0.5;
  const year = Math.floor((30 * (adjustedJd - 1948440) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((adjustedJd - (29 + islamicToJD(year, 1, 1))) / 29.5) + 1);
  const day = Math.floor(adjustedJd - islamicToJD(year, month, 1) + 1);
  return {
    day,
    month: HIJRI_MONTHS_BN[month - 1],
    year
  };
}
function dailyScore(entry, member, allFields) {
  if (!entry) return null;
  let sum = 0;
  let count = 0;
  for (const f of allFields) {
    if (!fieldApplies(f, member)) continue;
    if (isFieldExcusable(f, member) && isExcused(entry, f.key)) continue;
    count += 1;
    if (f.type === "bool") {
      sum += entry[f.key] ? 1 : 0;
    } else if (f.type === "count") {
      sum += Math.min(f.max, Number(entry[f.key]) || 0) / f.max;
    } else if (f.type === "number") {
      if (f.target) {
        sum += Math.min(f.target, Number(entry[f.key]) || 0) / f.target;
      } else {
        sum += Number(entry[f.key]) > 0 ? 1 : 0;
      }
    }
  }
  return count ? sum / count : null;
}
function scoreColor(score) {
  if (score === null || score === undefined) return "#E7EEE3";
  if (score >= 0.85) return "var(--theme-primary)";
  if (score >= 0.6) return "#4C8C74";
  if (score >= 0.35) return "#C89B3C";
  if (score > 0) return "#C1666B";
  return "#E7EEE3";
}
function fieldPercent(field, monthEntries, totalDays, member) {
  if (!fieldApplies(field, member)) return null;
  const excusableHere = isFieldExcusable(field, member);
  let effectiveDays = totalDays;
  if (excusableHere) {
    let excusedDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      if (isExcused(monthEntries[pad2(d)], field.key)) excusedDays += 1;
    }
    effectiveDays = totalDays - excusedDays;
  }
  if (effectiveDays <= 0) return null;
  let hit = 0;
  if (field.type === "count") {
    let sum = 0;
    for (let d = 1; d <= totalDays; d++) {
      const e = monthEntries[pad2(d)];
      if (excusableHere && isExcused(e, field.key)) continue;
      sum += Math.min(field.max, Number(e?.[field.key]) || 0);
    }
    return Math.round(sum / (effectiveDays * field.max) * 100);
  }
  if (field.type === "number" && field.target) {
    let sum = 0;
    for (let d = 1; d <= totalDays; d++) {
      const e = monthEntries[pad2(d)];
      sum += Math.min(field.target, Number(e?.[field.key]) || 0);
    }
    return Math.round(sum / (totalDays * field.target) * 100);
  }
  for (let d = 1; d <= totalDays; d++) {
    const e = monthEntries[pad2(d)];
    if (excusableHere && isExcused(e, field.key)) continue;
    if (!e) continue;
    if (field.type === "bool" && e[field.key]) hit += 1;
    if (field.type === "number" && !field.target && Number(e[field.key]) > 0) hit += 1;
  }
  return Math.round(hit / effectiveDays * 100);
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
    if (d.getFullYear() !== cursorYear || d.getMonth() !== cursorMonth0) break;
    const dayStr = pad2(d.getDate());
    const entry = monthEntries[dayStr];
    if (entry && dailyScore(entry, member, allFields) >= 0.5) {
      streak++;
    } else if (i > 0) {
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
    ranges.push({
      week: w,
      start,
      end
    });
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
  } catch {
    return {};
  }
}
async function saveWeekly(memberId, year, month0, data, ownerUid) {
  await db.collection(getCollectionName()).doc(weeklyKey(memberId, year, month0)).set({
    value: JSON.stringify(data),
    updatedAt: Date.now(),
    ownerUid: ownerUid ?? null
  }, {
    merge: true
  });
}
// --- Legacy (v1) member storage — single "members" doc holding a JSON array.
// Kept ONLY as a one-time migration source; do not write to it anymore.
async function loadLegacyMembers() {
  try {
    const res = await appStorage.get("members", true);
    return res ? JSON.parse(res.value) : [];
  } catch {
    return [];
  }
}

// --- Device-Claim member storage (v2) — one real Firestore document per
// member (doc id: "member:<id>") with plain top-level fields, so Firestore
// security rules can read `ownerUid` directly (rules cannot see inside a
// JSON-stringified "value" field, which is why v1's single array-doc
// couldn't support per-member ownership).
function memberDocId(id) {
  return `member:${id}`;
}
async function loadMembersV2() {
  try {
    const snap = await db.collection(getCollectionName()).where(firebase.firestore.FieldPath.documentId(), ">=", "member:").where(firebase.firestore.FieldPath.documentId(), "<", "member:\uf8ff").get();
    return snap.docs.map(d => ({
      id: d.id.slice("member:".length),
      ...d.data()
    }));
  } catch {
    return [];
  }
}
async function saveMemberDoc(member) {
  const {
    id,
    ...fields
  } = member;
  await db.collection(getCollectionName()).doc(memberDocId(id)).set(fields, {
    merge: true
  });
}
async function deleteMemberDoc(id) {
  await db.collection(getCollectionName()).doc(memberDocId(id)).delete();
}
async function claimMemberDoc(id, uid) {
  await db.collection(getCollectionName()).doc(memberDocId(id)).update({
    ownerUid: uid
  });
}
async function releaseMemberDoc(id) {
  await db.collection(getCollectionName()).doc(memberDocId(id)).update({
    ownerUid: null
  });
}
// One-time migration: if no v2 (member:*) docs exist yet but a legacy v1
// array-doc has members, copy each into its own v2 doc as "unclaimed"
// (ownerUid: null) — any device may claim them later from the member list.
// The legacy doc is left untouched (not deleted) as a safety net.
async function migrateMembersIfNeeded() {
  const v2 = await loadMembersV2();
  if (v2.length) return v2;
  const legacy = await loadLegacyMembers();
  if (!legacy.length) return [];
  const migrated = legacy.map(m => ({
    ...m,
    ownerUid: m.ownerUid ?? null,
    createdAt: m.createdAt || Date.now()
  }));
  try {
    await Promise.all(migrated.map(m => saveMemberDoc(m)));
  } catch {}
  return migrated;
}
async function loadCustomFields() {
  try {
    const res = await appStorage.get("custom_fields", true);
    return res ? JSON.parse(res.value) : [];
  } catch {
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
  } catch {
    return null;
  }
}
async function saveEntry(memberId, key, data, ownerUid) {
  // ownerUid is stamped from the member's CURRENT ownerUid at save time (not
  // the writer's own uid) so the entry stays consistent with claim state and
  // future Firestore rules can check request.auth.uid == resource.data.ownerUid
  // directly on this same document (no extra get() lookup needed).
  await db.collection(getCollectionName()).doc(entryDocId(memberId, key)).set({
    value: JSON.stringify(data),
    updatedAt: Date.now(),
    ownerUid: ownerUid ?? null
  }, {
    merge: true
  });
}
function entryDocId(memberId, key) {
  return `entry:${memberId}:${key}`;
}
// Edit History / Data Integrity: before overwriting a day's entry with a new
// edit, the previous saved version is archived into a "history" subcollection
// under that day's document. Only the last 5 versions are kept per day —
// older ones are pruned right after each push so the subcollection never
// grows unbounded.
async function pushEntryHistory(memberId, key, oldData) {
  try {
    const histRef = db.collection(getCollectionName()).doc(entryDocId(memberId, key)).collection("history");
    await histRef.add({
      value: JSON.stringify(oldData),
      editedAt: Date.now()
    });
    const snap = await histRef.orderBy("editedAt", "desc").get();
    if (snap.size > 5) {
      const excess = snap.docs.slice(5);
      const batch = db.batch();
      excess.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {
    // History is a best-effort convenience layer — a failure here should
    // never block the actual save of the day's entry.
  }
}
async function fetchEntryHistory(memberId, key) {
  try {
    const histRef = db.collection(getCollectionName()).doc(entryDocId(memberId, key)).collection("history");
    const snap = await histRef.orderBy("editedAt", "desc").limit(5).get();
    return snap.docs.map(d => ({
      id: d.id,
      editedAt: d.data().editedAt,
      value: d.data().value
    }));
  } catch {
    return [];
  }
}
// Note: month entries are no longer fetched with a one-off list+get batch
// (loadMonthEntries) — the live onSnapshot subscription in App's
// monthEntries effect replaced it, so that unused function was removed.
function StarMark({
  size = 18,
  color = "#C89B3C"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 1L14.6 8.2L22 8.5L16.2 13.3L18.2 21L12 16.8L5.8 21L7.8 13.3L2 8.5L9.4 8.2L12 1Z",
    fill: color
  }));
}
function BoolToggle({
  value,
  onChange,
  disabled
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(!value),
    className: "flex items-center justify-center w-11 h-11 rounded-xl border-2 transition-all shrink-0 shadow-sm",
    style: {
      borderColor: value ? "var(--theme-primary)" : "#D8DED3",
      background: value ? "var(--theme-primary)" : "#FFFFFF"
    }
  }, value ? /*#__PURE__*/React.createElement(Check, {
    size: 20,
    color: "#F4F7F1"
  }) : /*#__PURE__*/React.createElement(X, {
    size: 16,
    color: "#B9C2B2"
  }));
}
function CountStepper({
  value,
  onChange,
  max,
  disabled
}) {
  const v = Number(value) || 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(Math.max(0, v - 1)),
    className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "#16302B"
    }
  }, "−"), /*#__PURE__*/React.createElement("span", {
    className: "w-8 text-center font-bold text-sm",
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: "#16302B"
    }
  }, toBn(v)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(Math.min(max, v + 1)),
    className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "#16302B"
    }
  }, "+"));
}
function NumberField({
  value,
  onChange,
  disabled,
  target
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    inputMode: "decimal",
    disabled: disabled,
    value: value ?? "",
    onChange: e => onChange(e.target.value),
    placeholder: "০",
    className: "w-16 h-9 rounded-xl border px-2 text-right outline-none font-bold text-sm bg-slate-50 focus:bg-white transition-all",
    style: {
      borderColor: "#D8DED3",
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: "#16302B"
    }
  }), target ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold",
    style: {
      color: "#8A9A8F",
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
    }
  }, "/", toBn(target)) : null);
}
function ProgressChart({
  monthEntries,
  totalDays,
  member,
  allFields
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  useEffect(() => {
    if (!chartRef.current) return;
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
      weekScores.push(count ? Math.round(sum / count * 100) : 0);
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
        datasets: [{
          label: "সাপ্তাহিক গড় স্কোর (%)",
          data: weekScores,
          borderColor: themePrimary,
          backgroundColor: hexToRgba(themePrimary, 0.1),
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#C89B3C"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              font: {
                size: 10
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 10
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [monthEntries, totalDays, member, allFields]);
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full h-32 mt-2"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: chartRef
  }));
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
    return {
      year: d.getFullYear(),
      month0: d.getMonth()
    };
  });
  const [monthEntries, setMonthEntries] = useState({});
  const [monthRefreshKey, setMonthRefreshKey] = useState(0);
  const [printMode, setPrintMode] = useState(false);
  const [weekly, setWeekly] = useState({});
  const [weeklyRowCount, setWeeklyRowCount] = useState(1);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [weeklySavedTick, setWeeklySavedTick] = useState(false);
  const [meetingState, setMeetingState] = useState({
    rows: [{
      id: "1",
      topic: "",
      decision: "",
      person: ""
    }]
  });
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingSavedTick, setMeetingSavedTick] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFamilyCodeModal, setShowFamilyCodeModal] = useState(false);
  const [showGoogleAccountModal, setShowGoogleAccountModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveYear, setArchiveYear] = useState(() => new Date().getFullYear());
  const [archiveMonth0, setArchiveMonth0] = useState(() => new Date().getMonth());
  const [isCustomFamilyCode, setIsCustomFamilyCode] = useState(() => {
    try {
      return localStorage.getItem("family_code_is_custom") === "1";
    } catch {
      return false;
    }
  });
  const [showFamilyCodeInfoModal, setShowFamilyCodeInfoModal] = useState(false);
  const [showMemberInfoModal, setShowMemberInfoModal] = useState(false);
  const [showExcuseInfoModal, setShowExcuseInfoModal] = useState(false);
  const [showWeeklyInfoModal, setShowWeeklyInfoModal] = useState(false);
  const [showMeetingInfoModal, setShowMeetingInfoModal] = useState(false);
  const [customFamCodeInput, setCustomFamCodeInput] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // null | "sent" | "error"
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const originalEntryRef = useRef(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const touchStartXRef = useRef(null);
  function handleDateTouchStart(e) {
    touchStartXRef.current = e.touches[0].clientX;
  }
  function handleDateTouchEnd(e) {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) < 40) return; // ignore small taps/scrolls
    setViewDate(d => {
      const n = new Date(d);
      n.setDate(n.getDate() + (deltaX < 0 ? 1 : -1));
      return n;
    });
  }
  useEffect(() => {
    (async () => {
      const m = await migrateMembersIfNeeded();
      setMembers(m);
      const cf = await loadCustomFields();
      setCustomFields(cf);
      let last = null;
      try {
        const r = await appStorage.get(`last-selected-member:${getFamilyCode()}`, false);
        last = r ? JSON.parse(r.value) : null;
      } catch {}
      if (last && m.find(x => x.id === last)) {
        setSelectedId(last);
      } else if (m.length) {
        setSelectedId(m[0].id);
      } else {
        // No members yet — this is a first-time setup, prompt for name & gender right away
        setAddingMember(true);
      }
    })();
  }, []);
  const [recoveryMessage, setRecoveryMessage] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [weeklyReminderBanner, setWeeklyReminderBanner] = useState(false);
  const [monthlyReminderBanner, setMonthlyReminderBanner] = useState(false);
  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener("dt-update-available", handler);
    return () => window.removeEventListener("dt-update-available", handler);
  }, []);
  useEffect(() => {
    const lastActive = localStorage.getItem("last_active_date");
    const todayKey = dateKey(new Date());
    if (!lastActive) {
      // First-ever visit — just start tracking, don't show the message.
      localStorage.setItem("last_active_date", todayKey);
      return;
    }
    const gapDays = Math.round((new Date(todayKey) - new Date(lastActive)) / 86400000);
    const dismissedFor = localStorage.getItem("recovery_dismissed_on");
    if (gapDays >= 3 && dismissedFor !== todayKey) {
      setRecoveryMessage(true);
    }
  }, []);
  useEffect(() => {
    function checkReminders() {
      const now = new Date();
      const todayKey = dateKey(now);
      const hour = now.getHours();
      const weeklyDismissed = localStorage.getItem("weekly_reminder_dismissed_on");
      if (now.getDay() === 4 && hour >= 19 && weeklyDismissed !== todayKey) {
        setWeeklyReminderBanner(true);
      }
      const monthlyDismissed = localStorage.getItem("monthly_reminder_dismissed_on");
      if (isLastDayOfMonth(now) && hour >= 17 && monthlyDismissed !== todayKey) {
        setMonthlyReminderBanner(true);
      }
    }
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, []);
  function dismissWeeklyReminder() {
    localStorage.setItem("weekly_reminder_dismissed_on", dateKey(new Date()));
    setWeeklyReminderBanner(false);
  }
  function dismissMonthlyReminder() {
    localStorage.setItem("monthly_reminder_dismissed_on", dateKey(new Date()));
    setMonthlyReminderBanner(false);
  }
  const allFields = useMemo(() => {
    return [...DEFAULT_DEEN_FIELDS, ...DEFAULT_DUNIYA_FIELDS, ...customFields];
  }, [customFields]);
  const selectedMember = useMemo(() => (members || []).find(m => m.id === selectedId) || null, [members, selectedId]);
  // True when this member has been claimed ("দায়িত্ব নিন") by a different
  // Firebase Auth uid than the one this device is currently signed in as.
  // Unclaimed members (ownerUid null) are editable by anyone — that's the
  // "manual member, no phone of their own" case. Read access is never
  // restricted, only writing.
  const isLockedForThisDevice = !!(selectedMember && selectedMember.ownerUid && (!auth.currentUser || selectedMember.ownerUid !== auth.currentUser.uid));
  useEffect(() => {
    // Guard: on first render selectedId is still null (real value loads async).
    // Skip that null write so it never overwrites the previously saved
    // device-owner profile — otherwise every refresh would silently reset
    // to the first member in the family list.
    if (!selectedId) return;
    appStorage.set(`last-selected-member:${getFamilyCode()}`, JSON.stringify(selectedId), false).catch(() => {});
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    loadEntry(selectedId, dateKey(viewDate)).then(data => {
      setEntry(data || {});
      originalEntryRef.current = data || null;
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
      const unsub = colRef.doc(docId).onSnapshot(doc => {
        if (doc.exists) {
          try {
            liveData[dayStr] = JSON.parse(doc.data().value);
          } catch {
            delete liveData[dayStr];
          }
        } else {
          delete liveData[dayStr];
        }
        setMonthEntries({
          ...liveData
        });
      }, () => {});
      unsubscribers.push(unsub);
    }
    return () => {
      unsubscribers.forEach(u => u());
    };
  }, [selectedId, monthCursor, monthRefreshKey]);
  const refreshWeekly = useCallback(() => {
    if (!selectedId) return;
    loadWeekly(selectedId, monthCursor.year, monthCursor.month0).then(data => {
      setWeekly(data);
      const maxPossible = getWeekRanges(daysInMonth(monthCursor.year, monthCursor.month0)).length;
      let highestFilled = 1;
      for (let w = 1; w <= maxPossible; w++) {
        const rec = data[w];
        if (rec && (rec.good || rec.gap || rec.plan)) highestFilled = w;
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
    const unsubscribe = docRef.onSnapshot(doc => {
      if (doc.exists) {
        try {
          const data = JSON.parse(doc.data().value);
          setMeetingState(data);
        } catch (e) {}
      } else {
        setMeetingState({
          rows: [{
            id: "1",
            topic: "",
            decision: "",
            person: ""
          }]
        });
      }
    });
    return () => unsubscribe();
  }, [monthCursor]);
  async function handleExportData() {
    try {
      const snap = await db.collection(getCollectionName()).get();
      const exportObj = {};
      snap.docs.forEach(doc => {
        exportObj[doc.id] = doc.data();
      });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `daily_task_backup_${getFamilyCode()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("ডাটা এক্সপোর্ট করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleImportData(e) {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async event => {
        try {
          const parsed = JSON.parse(event.target.result);
          const batch = db.batch();
          const colRef = db.collection(getCollectionName());
          Object.keys(parsed).forEach(key => {
            const docRef = colRef.doc(key);
            batch.set(docRef, parsed[key]);
          });
          await batch.commit();
          alert("ডাটা সফলভাবে ইম্পোর্ট করা হয়েছে!");
          window.location.reload();
        } catch (err) {
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
  async function handleSaveCustomFamilyCode() {
    const code = customFamCodeInput.trim();
    if (!code) return;
    if (code.length < FAMILY_CODE_MIN_LENGTH) {
      window.alert(`কাস্টম ফ্যামিলি কোড কমপক্ষে ${FAMILY_CODE_MIN_LENGTH} ক্যারেক্টার হতে হবে।`);
      return;
    }
    if (!isFamilyCodeCharsetValid(code)) {
      window.alert("ফ্যামিলি কোডে স্পেস, / (স্ল্যাশ), \\ (ব্যাকস্ল্যাশ), বা কোটেশন চিহ্ন ( ' \" ) ব্যবহার করা যাবে না। বাকি ছোট/বড় হাতের অক্ষর, সংখ্যা ও বিশেষ চিহ্ন ব্যবহার করা যাবে।");
      return;
    }
    try {
      const doc = await db.collection(`data_${code}`).doc("members").get();
      const msg = doc.exists
        ? "এই কোডে আগের রেকর্ড পাওয়া গেছে — এতে সুইচ করলে সেই ডাটা ফিরে আসবে। এগিয়ে যাবেন?"
        : "এই কোডে কোনো পুরনো রেকর্ড নেই — এটি নতুন খালি ফ্যামিলি স্পেস হবে। এগিয়ে যাবেন?";
      if (!window.confirm(msg)) return;
    } catch {}
    setFamilyCode(code);
  }
  function handleGoToArchive() {
    setMonthCursor({
      year: archiveYear,
      month0: archiveMonth0
    });
    setViewDate(new Date(archiveYear, archiveMonth0, 1));
    setShowArchiveModal(false);
  }
  async function handleSendFeedback() {
    if (!feedbackMsg.trim() || feedbackSending) return;
    setFeedbackSending(true);
    setFeedbackStatus(null);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: "Daily Task App — নতুন পরামর্শ",
          message: feedbackMsg,
          family_code: getFamilyCode()
        })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Request failed");
      setFeedbackStatus("sent");
      setFeedbackMsg("");
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackStatus(null);
      }, 1200);
    } catch (err) {
      setFeedbackStatus("error");
    } finally {
      setFeedbackSending(false);
    }
  }
  function updateWeekly(weekIdx, field, value) {
    setWeekly(prev => ({
      ...prev,
      [weekIdx]: {
        ...(prev[weekIdx] || {}),
        [field]: value
      }
    }));
  }
  function addWeeklyRow() {
    const maxPossible = getWeekRanges(daysInMonth(monthCursor.year, monthCursor.month0)).length;
    setWeeklyRowCount(c => Math.min(c + 1, maxPossible));
  }
  function addMeetingRow() {
    setMeetingState(prev => ({
      ...prev,
      rows: [...(prev.rows || []), {
        id: String(Date.now()),
        topic: "",
        decision: "",
        person: ""
      }]
    }));
  }
  function removeMeetingRow(idx) {
    setMeetingState(prev => {
      const nextRows = [...prev.rows];
      nextRows.splice(idx, 1);
      return {
        ...prev,
        rows: nextRows
      };
    });
  }
  function updateMeetingRow(idx, field, value) {
    setMeetingState(prev => {
      const nextRows = [...prev.rows];
      nextRows[idx] = {
        ...nextRows[idx],
        [field]: value
      };
      return {
        ...prev,
        rows: nextRows
      };
    });
  }
  async function handleSaveWeekly() {
    if (!selectedId) return;
    if (isLockedForThisDevice) {
      alert("এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে এডিট করা যাবে না।");
      return;
    }
    setSavingWeekly(true);
    try {
      await saveWeekly(selectedId, monthCursor.year, monthCursor.month0, weekly, selectedMember?.ownerUid ?? null);
      setWeeklySavedTick(true);
      setTimeout(() => setWeeklySavedTick(false), 1600);
    } catch (err) {
      alert("সাপ্তাহিক রিফ্লেকশন সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSavingWeekly(false);
    }
  }
  async function handleSaveMeeting() {
    setSavingMeeting(true);
    try {
      await saveMeetingData(monthCursor.year, monthCursor.month0, meetingState);
      setMeetingSavedTick(true);
      setTimeout(() => setMeetingSavedTick(false), 1600);
    } catch (err) {
      alert("মাসিক সভা সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSavingMeeting(false);
    }
  }
  async function handleAddCustomField() {
    if (!newCustomLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    const newField = {
      key,
      label: newCustomLabel.trim(),
      shortLabel: newCustomLabel.trim(),
      type: "bool",
      isCustom: true
    };
    const updated = [...customFields, newField];
    setCustomFields(updated);
    setNewCustomLabel("");
    setShowAddCustom(false);
    try {
      await saveCustomFields(updated);
    } catch (err) {
      alert("কাস্টম টাস্ক সিংক করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleAddMember() {
    const name = newName.trim();
    if (!name) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Creating a member on this device claims it for the signed-in Google
    // account right away — that account's uid becomes the only one allowed
    // to edit this member's data (Device-Claim), until it's released.
    const newMember = {
      id,
      name,
      gender: newGender,
      ownerUid: auth.currentUser ? auth.currentUser.uid : null,
      createdAt: Date.now()
    };
    const next = [...(members || []), newMember];
    setMembers(next);
    setSelectedId(id);
    setNewName("");
    setNewGender("male");
    setAddingMember(false);
    try {
      await saveMemberDoc(newMember);
    } catch (err) {
      alert("সদস্য সিংক করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleRemoveMember(m) {
    const ok = window.confirm(`আপনি কি নিশ্চিত "${m.name}" কে সদস্য তালিকা থেকে বাদ দিতে চান? এই সদস্যের নাম আর দেখা যাবে না, তবে পূর্বের সেভ করা ডাটা মুছে যাবে না।`);
    if (!ok) return;
    const next = (members || []).filter(x => x.id !== m.id);
    setMembers(next);
    try {
      await deleteMemberDoc(m.id);
    } catch (err) {
      alert("সদস্য সিংক করতে সমস্যা হয়েছে: " + err.message);
    }
    if (selectedId === m.id) {
      setSelectedId(next.length ? next[0].id : null);
    }
  }
  async function handleClaimMember(m) {
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    if (!uid) return;
    try {
      await claimMemberDoc(m.id, uid);
      setMembers(prev => prev.map(x => x.id === m.id ? {
        ...x,
        ownerUid: uid
      } : x));
    } catch (err) {
      alert("দায়িত্ব নিতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleReleaseMember(m) {
    const ok = window.confirm(`"${m.name}"-এর দায়িত্ব ছেড়ে দিতে চান? এরপর যেকোনো সাইন-ইন করা ডিভাইস এই সদস্যের দায়িত্ব নিতে পারবে।`);
    if (!ok) return;
    try {
      await releaseMemberDoc(m.id);
      setMembers(prev => prev.map(x => x.id === m.id ? {
        ...x,
        ownerUid: null
      } : x));
    } catch (err) {
      alert("দায়িত্ব ছাড়তে সমস্যা হয়েছে: " + err.message);
    }
  }
  function updateField(key, value) {
    if (isFutureDate(viewDate) || isLockedForThisDevice) return;
    setEntry(prev => ({
      ...prev,
      [key]: value
    }));
  }
  function updateExcuse(key, value) {
    if (isFutureDate(viewDate) || isLockedForThisDevice) return;
    setEntry(prev => ({
      ...prev,
      excused: {
        ...(prev.excused || {}),
        [key]: value
      }
    }));
  }
  async function handleSave() {
    if (!selectedId || isFutureDate(viewDate)) return;
    if (isLockedForThisDevice) {
      alert("এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে এডিট করা যাবে না।");
      return;
    }
    setSaving(true);
    try {
      const key = dateKey(viewDate);
      if (originalEntryRef.current) {
        await pushEntryHistory(selectedId, key, originalEntryRef.current);
      }
      const toSave = {
        ...entry,
        lastEditedAt: Date.now()
      };
      await saveEntry(selectedId, key, toSave, selectedMember?.ownerUid ?? null);
      originalEntryRef.current = toSave;
      setEntry(toSave);
      localStorage.setItem("last_active_date", dateKey(new Date()));
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1600);
      setMonthRefreshKey(k => k + 1);
    } catch (err) {
      alert("ডাটা সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSaving(false);
    }
  }
  async function openHistoryModal() {
    if (!selectedId) return;
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const list = await fetchEntryHistory(selectedId, dateKey(viewDate));
      setHistoryList(list);
    } finally {
      setLoadingHistory(false);
    }
  }
  function restoreHistoryVersion(versionValue) {
    try {
      const restored = JSON.parse(versionValue);
      setEntry(restored);
      setShowHistoryModal(false);
    } catch {
      alert("এই সংস্করণটি পুনরুদ্ধার করতে সমস্যা হয়েছে।");
    }
  }
  const streak = useMemo(() => calculateStreak(monthEntries, selectedMember, allFields, monthCursor.year, monthCursor.month0), [monthEntries, selectedMember, allFields, monthCursor]);
  const [milestoneToast, setMilestoneToast] = useState(null);
  useEffect(() => {
    if (!selectedId || !streak) return;
    const MILESTONES = [7, 30, 100, 365];
    const hit = MILESTONES.find(m => streak === m);
    if (!hit) return;
    const seenKey = `milestone_seen_${selectedId}_${hit}`;
    if (localStorage.getItem(seenKey)) return;
    localStorage.setItem(seenKey, "1");
    setMilestoneToast(hit);
  }, [streak, selectedId]);
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
    return {
      total,
      filled,
      avgPct: Math.round(avg * 100)
    };
  }, [monthEntries, monthCursor, selectedMember, allFields]);
  if (members === null) return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex items-center justify-center bg-[#F4F7F1]"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    color: "var(--theme-primary)",
    size: 32
  }));
  if (printMode) {
    const total = monthStats.total;
    const rows = Array.from({
      length: total
    }, (_, i) => i + 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#111",
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("style", null, `
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 3px 2px; font-size: 9px; text-align: center; vertical-align: middle; word-wrap: break-word; }
          th { background: var(--theme-primary) !important; color: #fff !important; font-weight: 600; font-size: 7.5px; padding: 2px; height: 42px; }
          tr { height: 27px; }

          .meeting-table th { background: #f0f4f1 !important; color: #000 !important; font-size: 11px; font-weight: 700; height: 30px; border: 1px solid #333; }
          .meeting-table td { font-size: 10px; padding: 6px; border: 1px solid #333; text-align: left; }
          .meeting-table tr { page-break-inside: avoid; break-inside: avoid; }
        `), /*#__PURE__*/React.createElement("div", {
      className: "w-full mx-auto print-page",
      style: {
        minHeight: "270mm"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2 no-print"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setPrintMode(false),
      className: "px-3 py-1.5 rounded-lg border text-sm font-semibold bg-white",
      style: {
        borderColor: "#D8DED3"
      }
    }, "← ফিরে যান"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.print(),
      className: "px-4 py-1.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2",
      style: {
        background: "var(--theme-primary)"
      }
    }, /*#__PURE__*/React.createElement(Printer, {
      size: 14
    }), " প্রিন্ট / PDF ডাউনলোড (২টি পেজ)")), /*#__PURE__*/React.createElement("div", {
      style: {
        borderBottom: "2px solid var(--theme-primary)",
        paddingBottom: "4px",
        marginBottom: "6px"
      },
      className: "flex justify-between items-end"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "'Noto Serif Bengali', serif",
        fontSize: 15,
        fontWeight: 700,
        margin: 0,
        color: "var(--theme-primary)"
      }
    }, "মাসিক আমল ও পারফরম্যান্স রিপোর্ট"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 9,
        margin: "2px 0 0 0",
        color: "#444"
      }
    }, "মাস: ", /*#__PURE__*/React.createElement("b", null, BN_MONTHS[monthCursor.month0], " ", toBn(monthCursor.year)), " \xA0|\xA0 সদস্য: ", /*#__PURE__*/React.createElement("b", null, selectedMember?.name))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        textAlign: "right",
        color: "#333"
      }
    }, "পূরণ করা দিন: ", /*#__PURE__*/React.createElement("b", null, toBn(monthStats.filled), "/", toBn(total)), " \xA0|\xA0 গড় স্কোর: ", /*#__PURE__*/React.createElement("b", null, toBn(monthStats.avgPct), "%"))), /*#__PURE__*/React.createElement("table", {
      className: "print-daily-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "26px"
      }
    }, "তাং"), allFields.map(f => /*#__PURE__*/React.createElement("th", {
      key: f.key
    }, f.shortLabel || f.label)), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "34px"
      }
    }, "স্কোর"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(d => {
      const e = monthEntries[pad2(d)];
      const s = dailyScore(e, selectedMember, allFields);
      return /*#__PURE__*/React.createElement("tr", {
        key: d
      }, /*#__PURE__*/React.createElement("td", {
        style: {
          fontWeight: 700,
          background: "#f0f4f1"
        }
      }, toBn(d)), allFields.map(f => {
        if (!fieldApplies(f, selectedMember)) return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: "#ccc"
          }
        }, "—");
        if (isFieldExcusable(f, selectedMember) && isExcused(e, f.key)) return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: "#9A8A5C",
            fontStyle: "italic",
            fontSize: "7px"
          }
        }, "ওজর");
        if (!e) return /*#__PURE__*/React.createElement("td", {
          key: f.key
        });
        const v = e[f.key];
        let disp = f.type === "bool" ? v ? "✓" : "" : v !== undefined && v !== "" ? toBn(v) : "";
        return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: f.type === "bool" && v ? "var(--theme-primary)" : "#111",
            fontWeight: f.type === "bool" && v ? "bold" : "normal"
          }
        }, disp);
      }), /*#__PURE__*/React.createElement("td", {
        style: {
          fontWeight: 700,
          background: "#f0f4f1"
        }
      }, s === null ? "" : toBn(Math.round(s * 100)) + "%"));
    })), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        background: "#E7EEE3",
        fontWeight: 700
      }
    }, /*#__PURE__*/React.createElement("td", null, "%"), allFields.map(f => {
      const pct = fieldPercent(f, monthEntries, total, selectedMember);
      return /*#__PURE__*/React.createElement("td", {
        key: f.key
      }, pct === null ? "—" : toBn(pct) + "%");
    }), /*#__PURE__*/React.createElement("td", null, toBn(monthStats.avgPct), "%")))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        textTransform: "uppercase",
        color: "#888",
        textAlign: "right",
        marginTop: "4px"
      }
    }, "পৃষ্ঠা ১")), /*#__PURE__*/React.createElement("div", {
      className: "page-break w-full mx-auto print-page",
      style: {
        paddingTop: "8mm"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: "15px"
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        fontSize: "16px",
        fontFamily: "'Noto Serif Bengali', serif",
        fontWeight: "bold",
        margin: "0 0 6px 0",
        color: "var(--theme-primary)",
        textAlign: "center"
      }
    }, "সাপ্তাহিক রিফ্লেকশন (Weekly Reflection)"), /*#__PURE__*/React.createElement("table", {
      className: "meeting-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "10%"
      }
    }, "সপ্তাহ"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "যা ভালো হয়েছে"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "কোথায় ঘাটতি ছিল"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "আগামী পরিকল্পনা"))), /*#__PURE__*/React.createElement("tbody", null, getWeekRanges(total).slice(0, weeklyRowCount).map(({
      week: w,
      start,
      end
    }) => /*#__PURE__*/React.createElement("tr", {
      key: w
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        fontWeight: "bold"
      }
    }, toBn(w), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        fontWeight: 400,
        color: "#555"
      }
    }, "(", toBn(start), "-", toBn(end), ")")), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.good || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.gap || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.plan || "")))))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: "12px",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "'Noto Serif Bengali', serif",
        fontSize: 20,
        fontWeight: 700,
        margin: 0,
        color: "#000"
      }
    }, "মাসিক পারিবারিক সভা ও সিদ্ধান্ত"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        right: "0",
        top: "5px",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#111"
      }
    }, (() => {
      const t = new Date();
      return `${toBn(t.getDate())} ${BN_MONTHS[t.getMonth()]}, ${toBn(t.getFullYear())}`;
    })())), /*#__PURE__*/React.createElement("table", {
      className: "meeting-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "8%",
        textAlign: "center"
      }
    }, "ক্রমিক"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "25%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "বিষয়"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "47%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "কার্যপরিধি/সিদ্ধান্ত"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "20%",
        textAlign: "center"
      }
    }, "বাস্তবায়নকারী"))), /*#__PURE__*/React.createElement("tbody", null, (meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : [{}]).map((row, idx) => /*#__PURE__*/React.createElement("tr", {
      key: idx,
      style: {
        height: "40px"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        fontWeight: "bold"
      }
    }, toBn(idx + 1)), /*#__PURE__*/React.createElement("td", {
      style: {
        fontWeight: "600",
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, row.topic || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, row.decision || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        verticalAlign: "middle"
      }
    }, row.person || ""))))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        textTransform: "uppercase",
        color: "#888",
        textAlign: "right",
        marginTop: "10px"
      }
    }, "পৃষ্ঠা ২")));
  }
  const total = monthStats.total;
  const firstOfMonth = new Date(monthCursor.year, monthCursor.month0, 1);
  const leadBlanks = firstOfMonth.getDay();
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen pb-20 bg-[#F4F7F1]"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--theme-primary)"
    },
    className: "px-5 pt-6 pb-9 shadow-md relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement(StarMark, {
    size: 22
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold tracking-tight",
    style: {
      fontFamily: "'Noto Serif Bengali', serif",
      color: "#F4F7F1"
    }
  }, "Daily Task"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-emerald-200/80 -mt-1 font-medium"
  }, "আমল ও পারিবারিক ট্র্যাকার"))), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setIsMenuOpen(!isMenuOpen);
      setCodeRevealed(!isCustomFamilyCode);
    },
    className: "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/15 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all shadow-sm active:scale-95"
  }, /*#__PURE__*/React.createElement(MenuIcon, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "মেনু"), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 14,
    className: `transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`
  })), isMenuOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: () => setIsMenuOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-slate-800 text-xs transition-all"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2 border-b border-slate-100 bg-slate-50/70"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement("span", null, "ফ্যামিলি কাস্টম কোড"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setShowFamilyCodeInfoModal(true);
    },
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-emerald-900 text-sm flex items-center justify-between mt-1"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => isCustomFamilyCode && setCodeRevealed(v => !v),
    className: "inline-block" + (isCustomFamilyCode ? " cursor-pointer" : ""),
    title: isCustomFamilyCode ? codeRevealed ? "লুকাতে ট্যাপ করুন" : "দেখতে ট্যাপ করুন" : undefined
  }, /*#__PURE__*/React.createElement("span", {
    className: "tracking-wide select-none"
  }, isCustomFamilyCode && !codeRevealed ? "••••••••" : getFamilyCode())), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowFamilyCodeModal(true);
      setIsMenuOpen(false);
    },
    className: "text-slate-500 hover:text-emerald-800 shrink-0 ml-2",
    title: "ফ্যামিলি কোড পরিবর্তন করুন"
  }, /*#__PURE__*/React.createElement(EditIcon, {
    size: 13
  })))), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(UsersIcon, {
    size: 12
  }), " সদস্যবৃন্দ"), /*#__PURE__*/React.createElement("div", {
    className: "max-h-36 overflow-y-auto custom-scrollbar px-2"
  }, members.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    onClick: () => {
      setSelectedId(m.id);
      setIsMenuOpen(false);
    },
    className: `flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer group ${m.id === selectedId ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-slate-50 text-slate-700"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(User, {
    size: 13
  }), " ", m.name), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, m.id === selectedId && /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-600"
  }), !m.ownerUid ? /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleClaimMember(m);
    },
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0",
    title: "এই সদস্যের দায়িত্ব নিন"
  }, "দায়িত্ব নিন") : m.ownerUid === (auth.currentUser && auth.currentUser.uid) ? /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleReleaseMember(m);
    },
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0",
    title: "আপনার দায়িত্বে আছে — ছেড়ে দিতে ট্যাপ করুন"
  }, "আপনার") : /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleReleaseMember(m);
    },
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 shrink-0 flex items-center gap-0.5",
    title: "অন্য ডিভাইসের দায়িত্বে আছে — ছেড়ে দিতে ট্যাপ করুন"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 9
  }), " সংরক্ষিত"), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleRemoveMember(m);
    },
    className: "p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity",
    title: "সদস্য বাদ দিন"
  }, /*#__PURE__*/React.createElement(Trash, {
    size: 12
  })))))), !addingMember ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 mt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setAddingMember(true);
      setIsMenuOpen(false);
    },
    className: "flex-1 text-left px-4 py-1.5 text-emerald-800 font-bold hover:bg-slate-50 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 14
  }), " নতুন সদস্য যোগ করুন"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setShowMemberInfoModal(true);
    },
    className: "text-slate-400 hover:text-emerald-700 pr-3 shrink-0",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 14
  }))) : null), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
  }, "থিম কালার"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-4 py-1 flex-wrap"
  }, THEME_PRESETS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    type: "button",
    onClick: () => setThemeColor(t.color),
    title: t.name,
    className: "w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 border-2",
    style: {
      background: t.color,
      borderColor: themeColor === t.color ? "#16302B" : "transparent"
    }
  }, themeColor === t.color && /*#__PURE__*/React.createElement("span", {
    className: "text-white text-xs font-bold"
  }, "✓"))))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
  }, "ডাটা ম্যানেজমেন্ট"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      handleCopyCode();
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CopyIcon, {
    size: 14
  }), " ফ্যামিলি কোড কপি করুন"), copiedCode && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-emerald-600 font-bold"
  }, "কপি হয়েছে!")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      handleExportData();
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 14
  }), " ব্যাকআপ ফাইল ডাউনলোড"), /*#__PURE__*/React.createElement("label", {
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), " ব্যাকআপ ইম্পোর্ট ফাইল", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".json",
    onChange: e => {
      handleImportData(e);
      setIsMenuOpen(false);
    },
    className: "hidden"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setArchiveYear(monthCursor.year);
      setArchiveMonth0(monthCursor.month0);
      setShowArchiveModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 14
  }), " আর্কাইভ দেখুন (মাস/সাল)")), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowHelpModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 14
  }), " ব্যবহারের নিয়মাবলী"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium text-emerald-800"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 14
  }), " আমাদের জানান (পরামর্শ)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowGoogleAccountModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 14
  }), " Google অ্যাকাউন্ট (ঐচ্ছিক)"), isGoogleLinked() && /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-600"
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm",
    style: {
      background: "#C89B3C",
      color: "#16302B"
    }
  }, /*#__PURE__*/React.createElement(User, {
    size: 13
  }), " ", selectedMember ? selectedMember.name : "সদস্য বেছে নিন"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl shrink-0 border border-white/10"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "🔥"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-white"
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(streak)), " দিন"))), addingMember && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md"
  }, members.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-100 font-semibold px-1 mb-1.5"
  }, "শুরু করতে আপনার নাম ও জেন্ডার দিয়ে নিজেকে একজন সদস্য হিসেবে যোগ করুন 👇"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: newName,
    onChange: e => setNewName(e.target.value),
    placeholder: "সদস্যের নাম...",
    className: "flex-1 px-3 py-1.5 rounded-xl text-xs text-slate-900 outline-none font-medium"
  }), /*#__PURE__*/React.createElement("select", {
    value: newGender,
    onChange: e => setNewGender(e.target.value),
    className: "px-2 py-1.5 rounded-xl text-xs text-slate-900 bg-white outline-none font-medium"
  }, /*#__PURE__*/React.createElement("option", {
    value: "male"
  }, "পুরুষ"), /*#__PURE__*/React.createElement("option", {
    value: "female"
  }, "নারী")), /*#__PURE__*/React.createElement("button", {
    onClick: handleAddMember,
    className: "px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C89B3C] text-[#16302B]"
  }, "যোগ"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddingMember(false),
    className: "p-1.5 text-white/80"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl mx-auto"
  }, updateAvailable && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#C89B3C] rounded-2xl p-3.5 flex items-center gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "🔔"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-[#16302B]"
  }, "নতুন আপডেট এসেছে!"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#16302B]/80 mt-0.5"
  }, "নতুন ফিচার যুক্ত হয়েছে — রিফ্রেশ করে দেখুন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.location.reload(),
    className: "bg-[#16302B] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shrink-0"
  }, "রিফ্রেশ করুন"))), recoveryMessage && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-[#0E4B43] to-[#153f39] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🌱"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "আবার শুরু করুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-100/90 leading-relaxed mt-0.5"
  }, "আগের দিনগুলো নিয়ে ভাববেন না — আজ থেকেই নতুনভাবে শুরু করুন।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      localStorage.setItem("recovery_dismissed_on", dateKey(new Date()));
      setRecoveryMessage(false);
    },
    className: "text-emerald-200/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), weeklyReminderBanner && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#C0286B] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🗓️"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "সাপ্তাহিক রিফ্লেকশন করতে ভুলবেন না যেন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white/80 leading-relaxed mt-0.5"
  }, "এই সপ্তাহের ভালো-মন্দ ও পরিকল্পনা লিখে রাখুন — নিচে স্ক্রল করে পূরণ করতে পারবেন।")), /*#__PURE__*/React.createElement("button", {
    onClick: dismissWeeklyReminder,
    className: "text-white/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), monthlyReminderBanner && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#9F1239] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "👨‍👩‍👧‍👦"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "আজ মাসিক পারিবারিক পর্যালোচনার দিন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white/80 leading-relaxed mt-0.5"
  }, "পরিবারের সবাইকে নিয়ে বসুন এবং অগ্রগতি মূল্যায়ন করুন। সভা শেষে পিডিএফ ফাইল ডাউনলোড ও ডাটার ব্যাকআপ নিতে ভুলবেন না।")), /*#__PURE__*/React.createElement("button", {
    onClick: dismissMonthlyReminder,
    className: "text-white/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    onTouchStart: handleDateTouchStart,
    onTouchEnd: handleDateTouchEnd,
    className: "bg-white rounded-2xl shadow-sm px-4 py-2.5 flex items-center justify-between border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewDate(d => {
      const n = new Date(d);
      n.setDate(n.getDate() - 1);
      return n;
    }),
    className: "w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-700"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-sm text-slate-800 flex flex-col items-center gap-0.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace", fontWeight: 700 }
  }, toBn(viewDate.getDate())), " ", BN_MONTHS[viewDate.getMonth()], " ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace", fontWeight: 700 }
  }, toBn(viewDate.getFullYear())))), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-semibold text-slate-400"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
    }
  }, toBn(getHijriDate(viewDate).day)), " ", getHijriDate(viewDate).month, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
    }
  }, toBn(getHijriDate(viewDate).year)), " হিজরি")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewDate(d => {
      const n = new Date(d);
      n.setDate(n.getDate() + 1);
      return n;
    }),
    className: "w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-700"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, (() => {
    const insp = getDailyInspiration(viewDate);
    const tagLabel = insp.type === "ayat" ? "আয়াত" : insp.type === "hadith" ? "হাদীস" : "উক্তি";
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl p-4 shadow-sm",
      style: {
        background: "linear-gradient(135deg, var(--theme-primary), #153f39)"
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] font-bold mb-1.5",
      style: {
        color: "#C89B3C"
      }
    }, "✦ আজকের তাযকিরাহ · ", tagLabel), /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-white leading-relaxed"
    }, insp.text), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-emerald-200/70 mt-1.5 text-right"
    }, "— ", insp.ref));
  })()), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-5 space-y-4"
  }, /*#__PURE__*/React.createElement(FieldGroup, {
    title: "দৈনন্দিন আমল",
    fields: DEFAULT_DEEN_FIELDS,
    entry: entry,
    onChange: updateField,
    onToggleExcuse: updateExcuse,
    onInfoClick: () => setShowExcuseInfoModal(true),
    member: selectedMember,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice
  }), /*#__PURE__*/React.createElement(FieldGroup, {
    title: "ব্যক্তিগত ও পারিবারিক অভ্যাস",
    fields: DEFAULT_DUNIYA_FIELDS,
    entry: entry,
    onChange: updateField,
    member: selectedMember,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-emerald-900"
  }, "কাস্টম টাস্ক (ব্যক্তিগত লক্ষ্য)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddCustom(true),
    className: "text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " নতুন টাস্ক")), customFields.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 text-center py-2"
  }, "কোন কাস্টম টাস্ক নেই। উপরে বোতামে ক্লিক করে যোগ করুন।") : customFields.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    className: "flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0" + (isFutureDate(viewDate) || isLockedForThisDevice ? " opacity-40" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-slate-700"
  }, /*#__PURE__*/React.createElement(LabelText, {
    text: f.label
  })), /*#__PURE__*/React.createElement(BoolToggle, {
    value: !!entry[f.key],
    onChange: v => updateField(f.key, v),
    disabled: isFutureDate(viewDate) || isLockedForThisDevice
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold text-slate-800 mb-2"
  }, "দিনের নোট / আত্ম-সমালোচনা"), /*#__PURE__*/React.createElement("textarea", {
    value: entry.note || "",
    onChange: e => updateField("note", e.target.value),
    rows: 2,
    placeholder: "আজকের অনুভূতি, অর্জন বা শেখা বিষয় লিখুন...",
    disabled: isFutureDate(viewDate) || isLockedForThisDevice,
    className: "w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-700 transition-all resize-none bg-slate-50/50 focus:bg-white disabled:opacity-40"
  })), entry.lastEditedAt && !isFutureDate(viewDate) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 font-medium"
  }, "সর্বশেষ পরিবর্তন: ", formatBnDateTime(entry.lastEditedAt)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openHistoryModal,
    className: "flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950"
  }, /*#__PURE__*/React.createElement(ClockIcon, {
    size: 12
  }), " ইতিহাস দেখুন")), isFutureDate(viewDate) && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-xl py-2 px-3"
  }, "ভবিষ্যতের তারিখের জন্য আমল টিক দেওয়া যাবে না — আজকের তারিখে ফিরে যান।"), isLockedForThisDevice && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-center text-slate-600 bg-slate-100 border border-slate-200 rounded-xl py-2 px-3"
  }, "এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে শুধু দেখা যাবে, এডিট করা যাবে না।"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice,
    className: "w-full h-12 rounded-2xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100",
    style: {
      background: savedTick ? "#4C8C74" : "var(--theme-primary)"
    }
  }, saving ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 18
  }) : savedTick ? "সেভ হয়েছে!" : "আজকের ডাটা সেভ করুন")), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-sm text-slate-800"
  }, "সাপ্তাহিক রিফ্লেকশন"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowWeeklyInfoModal(true),
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), weeklyRowCount < getWeekRanges(monthStats.total).length && /*#__PURE__*/React.createElement("button", {
    onClick: addWeeklyRow,
    className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " সারি যোগ করুন")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse min-w-[560px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-2 border-r border-slate-200 text-center w-16"
  }, "সপ্তাহ"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "যা ভালো হয়েছে"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "কোথায় ঘাটতি ছিল"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 text-left"
  }, "আগামী সপ্তাহের পরিকল্পনা"))), /*#__PURE__*/React.createElement("tbody", null, getWeekRanges(monthStats.total).slice(0, weeklyRowCount).map(({
    week: w,
    start,
    end
  }) => /*#__PURE__*/React.createElement("tr", {
    key: w,
    className: "border-b border-slate-200 hover:bg-slate-50/50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-2 px-1 border-r border-slate-200 text-center font-bold text-xs text-emerald-900 bg-slate-50/80"
  }, "সপ্তাহ ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(w)), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] font-semibold text-slate-400 mt-0.5",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, "(", toBn(start), "-", toBn(end), ")")), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.good || "",
    onChange: e => updateWeekly(w, "good", e.target.value),
    placeholder: "এই সপ্তাহে যা ভালো হয়েছে...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.gap || "",
    onChange: e => updateWeekly(w, "gap", e.target.value),
    placeholder: "কোথায় ঘাটতি ছিল...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.plan || "",
    onChange: e => updateWeekly(w, "plan", e.target.value),
    placeholder: "আগামী সপ্তাহের পরিকল্পনা...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  }))))))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveWeekly,
    disabled: isLockedForThisDevice,
    className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
  }, savingWeekly ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : weeklySavedTick ? "সেভ হয়েছে!" : "সাপ্তাহিক রিফ্লেকশন সেভ করুন"))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold flex items-center gap-1.5 text-sm text-slate-800"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " মাসিক ওভারভিউ"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthRefreshKey(k => k + 1),
    title: "ক্যালেন্ডার রিফ্রেশ করুন",
    className: "w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-emerald-800 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement(RefreshIcon, {
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthCursor(c => c.month0 === 0 ? {
      year: c.year - 1,
      month0: 11
    } : {
      year: c.year,
      month0: c.month0 - 1
    }),
    className: "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold px-1 text-slate-700"
  }, BN_MONTHS[monthCursor.month0], " ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthCursor.year))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthCursor(c => c.month0 === 11 ? {
      year: c.year + 1,
      month0: 0
    } : {
      year: c.year,
      month0: c.month0 + 1
    }),
    className: "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: 14
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold"
  }, "গড় স্কোর"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-emerald-950",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthStats.avgPct), "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold"
  }, "পূরণ করা দিন"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-emerald-950",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthStats.filled), "/", toBn(total))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPrintMode(true),
    className: "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-100 hover:bg-emerald-100 transition-all"
  }, /*#__PURE__*/React.createElement(Printer, {
    size: 13
  }), " PDF / প্রিন্ট (২ পেজ)")), /*#__PURE__*/React.createElement(ProgressChart, {
    monthEntries: monthEntries,
    totalDays: monthStats.total,
    member: selectedMember,
    allFields: allFields
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-7 gap-1.5"
  }, BN_WEEKDAYS.map(w => /*#__PURE__*/React.createElement("div", {
    key: w,
    className: "text-center text-[9px] font-bold text-slate-400"
  }, w)), Array.from({
    length: leadBlanks
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: "b" + i
  })), Array.from({
    length: total
  }, (_, i) => i + 1).map(d => {
    const e = monthEntries[pad2(d)];
    const s = dailyScore(e, selectedMember, allFields);
    const cellDate = new Date(monthCursor.year, monthCursor.month0, d);
    return /*#__PURE__*/React.createElement("button", {
      key: d,
      onClick: () => setViewDate(cellDate),
      className: "h-7 w-full rounded-lg flex items-center justify-center text-[10px] font-bold transition-transform active:scale-90 shadow-sm",
      style: {
        background: scoreColor(s),
        color: s !== null && s >= 0.35 ? "#fff" : "#555",
        fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
      }
    }, toBn(d));
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-sm text-slate-800"
  }, "মাসিক পারিবারিক সভা ও সিদ্ধান্ত"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowMeetingInfoModal(true),
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold"
  }, "লাইভ সিংক")), /*#__PURE__*/React.createElement("button", {
    onClick: addMeetingRow,
    className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " সারি যোগ করুন")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pb-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 font-medium"
  }, BN_MONTHS[monthCursor.month0], "'", toBn(monthCursor.year), " — সভার তারিখ অটোমেটিক আজকের তারিখ (", (() => {
    const t = new Date();
    return `${toBn(t.getDate())} ${BN_MONTHS[t.getMonth()]}, ${toBn(t.getFullYear())}`;
  })(), ") হিসেবে দেখাবে")), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse min-w-[500px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    onClick: addMeetingRow,
    title: "নতুন সারি যোগ করতে ক্লিক করুন",
    className: "py-2.5 px-2 border-r border-slate-200 text-center w-12 cursor-pointer hover:bg-emerald-100 text-emerald-900 transition-colors select-none"
  }, "ক্র. ✚"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left w-1/4"
  }, "বিষয়"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "কার্যপরিধি/সিদ্ধান্ত"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-center w-1/4"
  }, "বাস্তবায়নকারী"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-1 text-center w-8"
  }))), /*#__PURE__*/React.createElement("tbody", null, (meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : []).map((row, idx) => /*#__PURE__*/React.createElement("tr", {
    key: row.id || idx,
    className: "border-b border-slate-200 hover:bg-slate-50/50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-2 px-1 border-r border-slate-200 text-center font-bold text-xs text-slate-700 bg-slate-50/80"
  }, toBn(idx + 1)), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: row.topic || "",
    onChange: e => updateMeetingRow(idx, "topic", e.target.value),
    placeholder: "বিষয়...",
    rows: 2,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 font-semibold bg-white resize-none"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: row.decision || "",
    onChange: e => updateMeetingRow(idx, "decision", e.target.value),
    placeholder: "কার্যপরিধি/সিদ্ধান্ত...",
    rows: 2,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: row.person || "",
    onChange: e => updateMeetingRow(idx, "person", e.target.value),
    placeholder: "বাস্তবায়নকারী",
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 text-center font-medium bg-white"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1 text-center"
  }, meetingState.rows.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => removeMeetingRow(idx),
    className: "text-red-400 hover:text-red-600 p-1"
  }, /*#__PURE__*/React.createElement(Trash, {
    size: 14
  })))))))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveMeeting,
    className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm"
  }, savingMeeting ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 16
  }) : meetingSavedTick ? "সেভ ও সিংক হয়েছে!" : "মাসিক সভা ও সিদ্ধান্ত সেভ করুন")))), showArchiveModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "আর্কাইভ দেখুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "যে মাস ও সালের ডাটা দেখতে চান তা বেছে নিন — সাথে সাথে সেই মাসের দৈনিক এন্ট্রি, মাসিক ওভারভিউ ও সভার তথ্য দেখা যাবে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("select", {
    value: archiveMonth0,
    onChange: e => setArchiveMonth0(parseInt(e.target.value, 10)),
    className: "flex-1 h-10 border border-slate-200 rounded-xl px-2 text-xs outline-none font-bold text-emerald-900 focus:border-emerald-800 bg-white"
  }, BN_MONTHS.map((m, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, m))), /*#__PURE__*/React.createElement("select", {
    value: archiveYear,
    onChange: e => setArchiveYear(parseInt(e.target.value, 10)),
    className: "w-28 h-10 border border-slate-200 rounded-xl px-2 text-xs outline-none font-bold text-emerald-900 focus:border-emerald-800 bg-white"
  }, Array.from({
    length: 8
  }, (_, i) => new Date().getFullYear() - 6 + i).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, toBn(y))))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleGoToArchive,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold"
  }, "দেখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowArchiveModal(false),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showFamilyCodeModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "কাস্টম ফ্যামিলি কোড সেট করুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "একটি অনন্য কোড দিন (যেমন: Fam-Khan-2026) যেন পরিবারের অন্য সদস্যরা এটি ব্যবহার করে ডাটা সিংক করতে পারে। ছোট/বড় হাতের ইংরেজি অক্ষর, সংখ্যা ও বিশেষ চিহ্ন ব্যবহার করা যাবে (space, /, \\, ' এবং \" ছাড়া), কমপক্ষে ৯ ক্যারেক্টার।"), /*#__PURE__*/React.createElement("input", {
    value: customFamCodeInput,
    onChange: e => setCustomFamCodeInput(e.target.value),
    placeholder: "যেমন: Fam-Khan-2026",
    maxLength: 30,
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-bold text-emerald-900 focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveCustomFamilyCode,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold"
  }, "সেভ ও সিংক করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowFamilyCodeModal(false),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showGoogleAccountModal && /*#__PURE__*/React.createElement(GoogleAccountModal, {
    onClose: () => setShowGoogleAccountModal(false)
  }), showFamilyCodeInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ফ্যামিলি কাস্টম কোড"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowFamilyCodeInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-3"
  }, "একটি ইউনিক ফ্যামিলি কোড তৈরি করুন (যেমন: Fam-Khan@2026)। পরিবারের সবাই একই কোড ব্যবহার করলে সবার ডাটা স্বয়ংক্রিয়ভাবে সিংক হবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800 mb-1.5"
  }, "নিয়ম:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-slate-600 leading-relaxed mb-3 space-y-1 list-disc pl-4"
  }, /*#__PURE__*/React.createElement("li", null, "কোড কমপক্ষে ৯ অক্ষরের হতে হবে।"), /*#__PURE__*/React.createElement("li", null, "ইংরেজি বড়/ছোট হাতের অক্ষর, সংখ্যা ও বিশেষ চিহ্ন ব্যবহার করা যাবে।"), /*#__PURE__*/React.createElement("li", null, "Space, / (স্ল্যাশ), \\ (ব্যাকস্ল্যাশ) এবং ' \" (কোটেশন চিহ্ন) ব্যবহার করা যাবে না।"), /*#__PURE__*/React.createElement("li", null, "কোডটি স্বয়ংক্রিয়ভাবে masked (••••) থাকবে — দেখতে চাইলে ডটের ওপর ট্যাপ করুন।")), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-amber-900 mb-1"
  }, "বিশেষ দ্রষ্টব্য:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-900/90 leading-relaxed"
  }, "ডাটা সিংক হওয়ার পর \"সদস্যবৃন্দ\" তালিকায় আপনার নাম দেখা যাবে — সেখানে আপনার নামের পাশে \"দায়িত্ব নিন\" বাটনে ট্যাপ করুন।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowFamilyCodeInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showMemberInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " তথ্য / নির্দেশনা"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMemberInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "যাদের নিজস্ব স্মার্টফোন নেই, শুধু তাদের নাম এখানে ম্যানুয়ালি যোগ করুন। তাদের আমল ও তথ্য এই ডিভাইস থেকেই সংরক্ষণ ও পরিচালনা করা যাবে।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMemberInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showExcuseInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ওজর কী?"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExcuseInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-3"
  }, "অসুস্থতা, সফর কিংবা নারীদের বিশেষ সময়ে কোনো আমল পূর্ণ করা সম্ভব না হলে পাশের \"ওজর\" বাটনে ট্যাপ করুন।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800 mb-1.5"
  }, "ওজর সিলেক্ট করলে যা হবে:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-slate-600 leading-relaxed mb-3 space-y-1 list-disc pl-4"
  }, /*#__PURE__*/React.createElement("li", null, "ইনপুট অপশনটি বন্ধ হয়ে যাবে।"), /*#__PURE__*/React.createElement("li", null, "সেদিনের দৈনিক স্কোর, স্ট্রীক (ধারাবাহিকতা), ক্যালেন্ডার, গ্রাফ ও রিপোর্টে আমলটি সেদিনের \"হিসাবের বাইরে\" থাকবে — অর্থাৎ নেগেটিভ বা মিসড হিসেবে গণ্য হবে না।")), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-amber-900 mb-1"
  }, "বিশেষ দ্রষ্টব্য:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-900/90 leading-relaxed mb-1.5"
  }, "১. পুরুষদের ক্ষেত্রে: ফরজ সালাতে \"ওজর\" প্রযোজ্য নয়। শরঈ বিধান অনুযায়ী অসুস্থতা বা সফরেও সাধ্যমতো ওয়াক্তেই ফরজ সালাত আদায় করতে হবে। ওয়াক্তে আদায় না হলে পরে তা কাযা আদায় করতে হবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-900/90 leading-relaxed"
  }, "২. নারীদের ক্ষেত্রে: কেবল হায়েজ ও নেফাস অবস্থায় ফরজ সালাতে \"ওজর\" প্রযোজ্য। এ সময়ের সালাত পরে কাযা করতে হয় না। তবে অসুস্থতা বা সফরের কারণে ফরজ সালাতে \"ওজর\" প্রযোজ্য নয়; সাধ্যমতো ওয়াক্তেই সালাত আদায় করতে হবে। ওয়াক্তে আদায় না হলে পরে তা কাযা আদায় করতে হবে।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExcuseInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showWeeklyInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " সাপ্তাহিক রিফ্লেকশন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowWeeklyInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "প্রতি সপ্তাহ শেষে নিজের আমল ও কাজের পর্যালোচনা করুন। এই সপ্তাহে কোন কাজগুলো ভালো হয়েছে এবং কোথায় আরও উন্নতি করা প্রয়োজন, তা এখানে সংক্ষিপ্ত নোট হিসেবে লিখে রাখুন। নতুন সপ্তাহ বা তথ্য যোগ করতে \"+ সারি যোগ করুন\" বোতামে ক্লিক করুন; এতে স্বয়ংক্রিয়ভাবে পরবর্তী ক্রমিক নম্বর যুক্ত হয়ে যাবে।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowWeeklyInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showMeetingInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " মাসিক পারিবারিক সভা"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMeetingInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "মাস শেষে পরিবারের সবাইকে নিয়ে বসুন এবং বিগত মাসের অগ্রগতি মূল্যায়ন করুন। নতুন বিষয় বা সিদ্ধান্ত যোগ করতে \"+ সারি যোগ করুন\" বোতামে ক্লিক করুন; এতে স্বয়ংক্রিয়ভাবে পরবর্তী ক্রমিক নম্বর যুক্ত হবে। সভায় আলোচিত গুরুত্বপূর্ণ বিষয় ও সিদ্ধান্তগুলো লিখুন এবং সভা শেষে চাইলে পিডিএফ ফাইল ডাউনলোড এবং ডাটা ব্যাকআপ করে রাখতে পারেন।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMeetingInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showAddCustom && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-2 text-slate-800"
  }, "নতুন কাস্টম টাস্কের নাম"), /*#__PURE__*/React.createElement("input", {
    value: newCustomLabel,
    onChange: e => setNewCustomLabel(e.target.value),
    placeholder: "যেমন: ২ লিটার পানি পান",
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-medium focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleAddCustomField,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold"
  }, "যোগ করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddCustom(false),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showHelpModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-md shadow-xl border border-slate-100 max-h-[80vh] overflow-y-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 border-b pb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ব্যবহারের নিয়মাবলী"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHelpModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600 space-y-2.5 leading-relaxed font-medium"
  }, /*#__PURE__*/React.createElement("p", null, "১. কাস্টম ফ্যামিলি কোড তৈরি করে পরিবারের সকল সদস্যের ডিভাইসে একই কোড বসিয়ে ডাটা রিয়েল-টাইমে সিংক করুন।"), /*#__PURE__*/React.createElement("p", null, "২. মাসের শেষে দৈনিক রিপোর্ট, সাপ্তাহিক রিফ্লেকশন এবং পারিবারিক সভার কার্যপরিধি — সবকিছু একসাথে ২ পৃষ্ঠার PDF ফাইল হিসেবে প্রিন্ট/সেভ দেওয়া যাবে।"), /*#__PURE__*/React.createElement("p", null, "৩. প্রিন্ট কপির বাম পাশে পাঞ্চ মার্জিন রাখা হয়েছে যা ফাইলে বাইন্ডিং করার উপযুক্ত।"), /*#__PURE__*/React.createElement("p", null, "৪. মেনু থেকে \"এক্সপোর্ট\" করে পুরো পরিবারের ডাটার একটি ব্যাকআপ (.json) ফাইল ডাউনলোড করে রাখুন। প্রয়োজনে একই মেনু থেকে \"ইম্পোর্ট\" করে তা ফিরিয়ে আনা যাবে।"), /*#__PURE__*/React.createElement("p", null, "৫. অ্যাপটির সকল ফিচার সঠিকভাবে ব্যবহার করতে বিভিন্ন অপশনের পাশে থাকা ⓘ (ইনফো) আইকনে ট্যাপ করে নির্দেশনাগুলো পড়ে নিন।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHelpModal(false),
    className: "w-full mt-5 h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showFeedbackModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 16,
    color: "var(--theme-primary)"
  }), " পরামর্শ জানান"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(false);
      setFeedbackStatus(null);
    }
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "আপনার মতামত বা পরামর্শ লিখুন। এটি সরাসরি Daily Task Team-এর কাছে চলে যাবে।"), /*#__PURE__*/React.createElement("textarea", {
    value: feedbackMsg,
    onChange: e => setFeedbackMsg(e.target.value),
    rows: 4,
    placeholder: "আপনার অমূল্য পরামর্শ লিখুন...",
    disabled: feedbackSending,
    className: "w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-800 resize-none mb-2 bg-slate-50/50 disabled:opacity-60"
  }), feedbackStatus === "error" && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-red-600 mb-2"
  }, "পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।"), feedbackStatus === "sent" && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-700 mb-2"
  }, "ধন্যবাদ! আপনার পরামর্শ পাঠানো হয়েছে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSendFeedback,
    disabled: feedbackSending || !feedbackMsg.trim(),
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
  }, feedbackSending ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : feedbackStatus === "sent" ? "পাঠানো হয়েছে!" : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 14
  }), " পাঠিয়ে দিন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(false);
      setFeedbackStatus(null);
    },
    className: "h-9 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showHistoryModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100 max-h-[75vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ClockIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " এন্ট্রি ইতিহাস"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHistoryModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "সর্বশেষ ৫টি পূর্ববর্তী সংস্করণ এখানে দেখা যাবে। পুনরুদ্ধার করলে সেই সংস্করণটি ফর্মে বসে যাবে — পরিবর্তন সংরক্ষণ করতে আবার \"সেভ করুন\" বাটনে চাপ দিতে হবে।"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-y-auto custom-scrollbar space-y-2 flex-1"
  }, loadingHistory ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center py-8"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    color: "var(--theme-primary)",
    size: 22
  })) : historyList.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 text-center py-6"
  }, "কোনো পূর্ববর্তী সংস্করণ নেই — এই দিনের এন্ট্রি এখনো এডিট করা হয়নি।") : historyList.map(h => /*#__PURE__*/React.createElement("div", {
    key: h.id,
    className: "flex items-center justify-between gap-2 border border-slate-200 rounded-xl p-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-slate-600"
  }, formatBnDateTime(h.editedAt)), /*#__PURE__*/React.createElement("button", {
    onClick: () => restoreHistoryVersion(h.value),
    className: "text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0"
  }, "পুনরুদ্ধার করুন")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHistoryModal(false),
    className: "w-full h-9 mt-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shrink-0"
  }, "বন্ধ করুন"))), milestoneToast && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-x-0 bottom-6 flex justify-center px-5 z-[60]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#16302B] text-white rounded-2xl shadow-xl px-5 py-4 max-w-sm w-full flex items-center gap-3 border border-[#C89B3C]/40"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "🎉"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold",
    style: {
      color: "#C89B3C"
    }
  }, "অভিনন্দন!"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-200 mt-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(milestoneToast)), " দিনের ধারাবাহিকতা পূর্ণ হয়েছে — মাশাআল্লাহ, চালিয়ে যান!")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMilestoneToast(null),
    className: "text-slate-400 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))));
}
function FieldGroup({
  title,
  fields,
  entry,
  onChange,
  onToggleExcuse,
  onInfoClick,
  member,
  disabled
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-emerald-950"
  }, title), onInfoClick && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onInfoClick,
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, fields.filter(f => fieldApplies(f, member)).map(f => {
    const fieldExcusable = isFieldExcusable(f, member);
    const excused = !!(fieldExcusable && isExcused(entry, f.key));
    const rowDisabled = disabled || excused;
    return /*#__PURE__*/React.createElement("div", {
      key: f.key,
      className: "flex items-center justify-between gap-3" + (disabled ? " opacity-40" : "")
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-medium text-slate-700"
    }, /*#__PURE__*/React.createElement(LabelText, {
      text: f.label
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, fieldExcusable && /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: disabled,
      onClick: () => onToggleExcuse(f.key, !excused),
      className: "px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 transition-all",
      style: excused ? {
        background: "#C89B3C",
        borderColor: "#C89B3C",
        color: "#16302B"
      } : {
        background: "#fff",
        borderColor: "#D8DED3",
        color: "#8A9A8F"
      }
    }, "ওজর"), f.type === "bool" && /*#__PURE__*/React.createElement(BoolToggle, {
      value: !!entry[f.key],
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled
    }), f.type === "count" && /*#__PURE__*/React.createElement(CountStepper, {
      value: entry[f.key],
      max: f.max,
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled
    }), f.type === "number" && /*#__PURE__*/React.createElement(NumberField, {
      value: entry[f.key],
      target: f.target,
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled
    })));
  })));
}
// --- Google Account Linking (fully optional) ---
// Default flow stays zero-login: every device auto-signs-in anonymously, no
// screen, no friction (see bottom of file). A person MAY optionally link
// their anonymous session to a real Google account from the menu. Linking
// (not switching) keeps the exact same Firebase Auth uid, so any members
// already claimed on this device stay claimed — nothing about existing data
// changes. The benefit of linking: that uid becomes tied to the Google
// account instead of this one device/browser cache, so signing in with the
// same Google account on a different device (or after clearing this
// device's cache) recovers the same identity — no re-claiming needed.
//
// Redirect-based flows survive a full page reload, so any pending
// action/result is remembered across that reload via localStorage.
const googleProvider = new firebase.auth.GoogleAuthProvider();
function isGoogleLinked() {
  return !!(auth.currentUser && auth.currentUser.providerData.some(p => p.providerId === "google.com"));
}
// Popup instead of redirect: a redirect round-trip depends on session/local
// storage surviving the navigation away to Google and back, which silently
// fails on browsers that partition storage for third-party contexts (this
// is now the default in Safari and increasingly Chrome/Firefox) — the
// classic symptom is "I picked my Google account, it came back, and
// nothing changed." Popup resolves the promise directly on this same page,
// so it doesn't depend on that storage round-trip surviving.
function linkGoogleAccount() {
  return auth.currentUser.linkWithPopup(googleProvider);
}
function recoverWithGoogleAccount() {
  return auth.signInWithPopup(googleProvider);
}
function unlinkGoogleAccount() {
  return auth.currentUser.unlink("google.com");
}
function signOutToFreshAnonymous() {
  return auth.signOut().then(() => auth.signInAnonymously());
}
function GoogleAccountModal({
  onClose
}) {
  const [linked, setLinked] = useState(isGoogleLinked());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    setLinked(isGoogleLinked());
  }, []);
  async function handleLink() {
    setBusy(true);
    setNotice(null);
    try {
      await linkGoogleAccount();
      setLinked(true);
      setNotice({
        type: "ok",
        text: "Google অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে!"
      });
    } catch (err) {
      if (err && err.code === "auth/popup-closed-by-user") {
        // ব্যবহারকারী নিজেই পপআপ বন্ধ করেছেন — কোনো বার্তা দরকার নেই
      } else if (err && err.code === "auth/credential-already-in-use") {
        setNotice({
          type: "error",
          text: "এই Google অ্যাকাউন্টটি ইতোমধ্যে অন্য একটি ডিভাইস/প্রোফাইলের সাথে যুক্ত আছে। এটির ডাটা ফিরে পেতে নিচের \"আগে যুক্ত করা একাউন্ট দিয়ে সাইন ইন করুন\" অপশনটি ব্যবহার করুন।"
        });
      } else {
        setNotice({
          type: "error",
          text: "সমস্যা হয়েছে: " + (err && (err.message || err.code))
        });
      }
    } finally {
      setBusy(false);
    }
  }
  async function handleRecover() {
    setBusy(true);
    setNotice(null);
    try {
      await recoverWithGoogleAccount();
      setLinked(true);
      setNotice({
        type: "ok",
        text: "Google অ্যাকাউন্ট দিয়ে সাইন ইন সফল হয়েছে — আগের ডাটা ফিরে এসেছে।"
      });
    } catch (err) {
      if (!err || err.code !== "auth/popup-closed-by-user") {
        setNotice({
          type: "error",
          text: "সমস্যা হয়েছে: " + (err && (err.message || err.code))
        });
      }
    } finally {
      setBusy(false);
    }
  }
  async function handleUnlink() {
    if (!window.confirm("Google অ্যাকাউন্টের সাথে সংযোগ বিচ্ছিন্ন করতে চান? এই ডিভাইসের ডাটা এখানেই থাকবে, শুধু অন্য ডিভাইস থেকে আর এই একাউন্ট দিয়ে ফিরে আসা যাবে না।")) return;
    setBusy(true);
    try {
      await unlinkGoogleAccount();
      setLinked(false);
    } catch (err) {
      setNotice({
        type: "error",
        text: "সংযোগ বিচ্ছিন্ন করতে সমস্যা হয়েছে: " + err.message
      });
    } finally {
      setBusy(false);
    }
  }
  async function handleSignOut() {
    if (!window.confirm("সাইন আউট করতে চান? সাইন আউটের পর এই ডিভাইসটি একটি নতুন, আলাদা (আনক্লেইমড) পরিচয়ে চলবে — আগে \"দায়িত্ব নেওয়া\" সদস্যদের এডিট-অধিকার এই ডিভাইসে আর থাকবে না, যতক্ষণ না আপনি একই Google অ্যাকাউন্ট দিয়ে আবার \"রিকভারি\" সাইন ইন করেন। এগিয়ে যাবেন?")) return;
    setBusy(true);
    try {
      await signOutToFreshAnonymous();
      onClose();
      window.location.reload();
    } catch (err) {
      setNotice({
        type: "error",
        text: "সাইন আউট করতে সমস্যা হয়েছে: " + err.message
      });
      setBusy(false);
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " Google অ্যাকাউন্ট (ঐচ্ছিক)"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), notice && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-3 " + (notice.type === "ok" ? "text-emerald-700" : "text-red-600")
  }, notice.text), linked ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-1"
  }, "এই ডিভাইস সংযুক্ত আছে:"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-emerald-900 mb-4"
  }, auth.currentUser && auth.currentUser.email), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSignOut,
    disabled: busy,
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-60"
  }, "সাইন আউট করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: handleUnlink,
    disabled: busy,
    className: "w-full h-9 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold disabled:opacity-60"
  }, "সংযোগ বিচ্ছিন্ন করুন (Unlink)"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-2"
  }, "Google অ্যাকাউন্টে সাইন ইন না করেও অ্যাপটি ব্যবহার করা যাবে। তবে সাইন ইন করলে নিম্নোক্ত সুবিধা পাওয়া যাবে:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-slate-600 leading-relaxed mb-4 space-y-1 list-disc pl-4"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", { className: "font-bold" }, "রিকভারি:"), " নতুন ফোনে বা ডাটা মুছে গেলে একই Google অ্যাকাউন্টে সাইন ইন করলেই সদস্যপদ স্বয়ংক্রিয়ভাবে ফিরে আসবে।"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", { className: "font-bold" }, "মাল্টি-ডিভাইস:"), " একই Google অ্যাকাউন্ট দিয়ে একাধিক ডিভাইস (ফোন, ট্যাব, কম্পিউটার) থেকে ব্যবহার করা যাবে।")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleLink,
    disabled: busy,
    className: "w-full h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-2"
  }, busy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : null, " Google দিয়ে সাইন ইন করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: handleRecover,
    disabled: busy,
    className: "w-full h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold disabled:opacity-60"
  }, "আগে যুক্ত করা একাউন্ট দিয়ে সাইন ইন করুন (রিকভারি)")))));
}
function mountApp() {
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container);
  root.render(/*#__PURE__*/React.createElement(App, null));
}

// --- Anonymous Authentication (background, no login UI) ---
// Zero-login by default: we wait for a signed-in (anonymous, or previously
// Google-linked) user before mounting so every Firestore call the app makes
// already has request.auth != null. getRedirectResult() is checked first so
// an optional Google link/recovery action (which reloads the page) can
// leave a result/notice behind for the Google Account modal to show.
let appMounted = false;
function bootOnce() {
  if (appMounted) return;
  appMounted = true;
  mountApp();
}
// Wait for Firebase to report the REAL restored session (anonymous,
// Google-linked, or none) before deciding whether a fresh anonymous
// sign-in is needed. The old code called signInAnonymously()
// unconditionally, in parallel with this restore — if it ran before the
// persisted (possibly Google-linked) user had finished loading, it could
// create a brand-new anonymous identity and silently throw away the link,
// which is exactly the "picked my Google account, it came back looking
// like before" symptom. Now we only sign in anonymously if, after
// Firebase reports its true state, there is genuinely no user yet.
const unsubscribeAuth = auth.onAuthStateChanged(user => {
  unsubscribeAuth();
  if (user) {
    bootOnce();
  } else {
    auth.signInAnonymously().catch(err => {
      console.error("Anonymous sign-in failed:", err);
    }).finally(() => {
      bootOnce(); // don't leave the user stuck on a blank screen
    });
  }
});