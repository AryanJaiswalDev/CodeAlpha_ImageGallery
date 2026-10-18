// ---------------------------------------------------------------
// 1. IMAGE DATA (sample photos)
// To use your own fixed photos: put them in an "images" folder and set
// src to e.g. "images/photo1.jpg". Photos you upload from the page
// itself are added on top of this list.
// ---------------------------------------------------------------
const photo = (id) => ({
  thumb: `https://picsum.photos/id/${id}/600/450`,
  src:   `https://picsum.photos/id/${id}/1600/1100`
});

const images = [
  { ...photo(1015), title: "River Valley",     category: "Nature" },
  { ...photo(1018), title: "Mountain Range",   category: "Nature" },
  { ...photo(1039), title: "Waterfall Trail",  category: "Nature" },
  { ...photo(10),   title: "Forest Light",     category: "Nature" },
  { ...photo(1031), title: "City Streets",     category: "City" },
  { ...photo(1033), title: "Downtown Evening", category: "City" },
  { ...photo(1036), title: "Winter Morning",   category: "Travel" },
  { ...photo(1043), title: "Coastline",        category: "Travel" },
  { ...photo(1044), title: "Open Road",        category: "Travel" },
  { ...photo(1025), title: "Loyal Companion",  category: "Animals" },
  { ...photo(237),  title: "Puppy Portrait",   category: "Animals" },
  { ...photo(169),  title: "Quiet Window",     category: "City" }
];

// ---------------------------------------------------------------
// 2. ELEMENTS + STATE
// ---------------------------------------------------------------
const gallery  = document.getElementById("gallery");
const filters  = document.getElementById("filters");
const lightbox = document.getElementById("lightbox");
const lbImg    = document.getElementById("lb-img");
const lbTitle  = document.getElementById("lb-title");
const lbCount  = document.getElementById("lb-count");

const dropZone    = document.getElementById("drop-zone");
const fileInput   = document.getElementById("file-input");
const categoryBox = document.getElementById("upload-category");

let activeCategory = "All";
let visible = [...images];   // images currently shown (after filtering)
let current = 0;             // index inside `visible`

// ---------------------------------------------------------------
// 3. STORAGE (IndexedDB) - keeps uploaded photos after refresh
// ---------------------------------------------------------------
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("gallery-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbRun(mode, action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", mode);
    const req = action(tx.objectStore("photos"));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

const savePhoto   = (record) => dbRun("readwrite", (s) => s.put(record));
const deletePhoto = (id)     => dbRun("readwrite", (s) => s.delete(id));
const loadPhotos  = ()       => dbRun("readonly",  (s) => s.getAll());

// ---------------------------------------------------------------
// 4. FILTERS (categories)
// ---------------------------------------------------------------
function buildFilters() {
  const categories = ["All", ...new Set(images.map((img) => img.category))];
  if (!categories.includes(activeCategory)) activeCategory = "All";

  filters.innerHTML = "";
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (cat === activeCategory ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      activeCategory = cat;
      buildFilters();
      applyFilter();
    });
    filters.appendChild(btn);
  });
}

function applyFilter() {
  visible = activeCategory === "All"
    ? [...images]
    : images.filter((img) => img.category === activeCategory);
  renderGallery();
}

// ---------------------------------------------------------------
// 5. RENDER GRID
// ---------------------------------------------------------------
function renderGallery() {
  gallery.innerHTML = "";

  visible.forEach((img, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${Math.min(index, 12) * 0.05}s`;

    const pic = document.createElement("img");
    pic.src = img.thumb;
    pic.alt = img.title;
    pic.loading = "lazy";

    const overlay = document.createElement("span");
    overlay.className = "overlay";
    const name = document.createElement("strong");
    name.textContent = img.title;
    const cat = document.createElement("small");
    cat.textContent = img.category.toUpperCase();
    overlay.append(name, cat);

    const openBtn = document.createElement("button");
    openBtn.className = "card-open";
    openBtn.setAttribute("aria-label", `Open ${img.title}`);
    openBtn.addEventListener("click", () => openLightbox(index));

    card.append(pic, overlay, openBtn);

    // Delete button only for photos you uploaded
    if (img.uploadId) {
      const del = document.createElement("button");
      del.className = "card-delete";
      del.innerHTML = "&times;";
      del.setAttribute("aria-label", `Delete ${img.title}`);
      del.addEventListener("click", () => removeUpload(img));
      card.appendChild(del);
    }

    gallery.appendChild(card);
  });
}

// ---------------------------------------------------------------
// 6. UPLOAD IMAGES FROM YOUR DEVICE
// ---------------------------------------------------------------
function addUploadedImage(record) {
  const url = URL.createObjectURL(record.blob);
  images.unshift({
    thumb: url,
    src: url,
    title: record.title,
    category: record.category,
    uploadId: record.id
  });
}

async function handleFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;

  const category = categoryBox.value.trim() || "My Uploads";

  for (const file of files) {
    const record = {
      id: Date.now() + Math.random(),
      title: file.name.replace(/\.[^.]+$/, ""),
      category,
      blob: file
    };
    addUploadedImage(record);
    try { await savePhoto(record); } catch (e) { /* still works for this session */ }
  }

  activeCategory = category;
  buildFilters();
  applyFilter();
}

async function removeUpload(img) {
  if (!confirm(`Delete "${img.title}"?`)) return;
  const i = images.indexOf(img);
  if (i > -1) images.splice(i, 1);
  URL.revokeObjectURL(img.src);
  try { await deletePhoto(img.uploadId); } catch (e) {}
  buildFilters();
  applyFilter();
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  handleFiles(fileInput.files);
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  })
);
dropZone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

// ---------------------------------------------------------------
// 7. LIGHTBOX (open / close / next / prev)
// ---------------------------------------------------------------
function showImage() {
  const img = visible[current];
  lbImg.classList.add("fade");

  setTimeout(() => {
    lbImg.src = img.src;
    lbImg.alt = img.title;
    lbTitle.textContent = img.title;
    lbCount.textContent = `${current + 1} / ${visible.length}`;
    lbImg.classList.remove("fade");
  }, 150);
}

function openLightbox(index) {
  current = index;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  showImage();
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function nextImage() {
  current = (current + 1) % visible.length;
  showImage();
}

function prevImage() {
  current = (current - 1 + visible.length) % visible.length;
  showImage();
}

document.getElementById("lb-close").addEventListener("click", closeLightbox);
document.getElementById("lb-next").addEventListener("click", nextImage);
document.getElementById("lb-prev").addEventListener("click", prevImage);

// Click on dark background closes it
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

// Keyboard support
document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") nextImage();
  if (e.key === "ArrowLeft") prevImage();
});

// Swipe support for phones
let touchStartX = 0;
lightbox.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].clientX;
});
lightbox.addEventListener("touchend", (e) => {
  const diff = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(diff) > 50) diff < 0 ? nextImage() : prevImage();
});

// ---------------------------------------------------------------
// 8. IMAGE FILTER EFFECTS (bonus) - applied in the lightbox
// ---------------------------------------------------------------
const effects = {
  "Normal":    "none",
  "Grayscale": "grayscale(1)",
  "Sepia":     "sepia(0.9)",
  "Warm":      "sepia(0.35) saturate(1.4) hue-rotate(-10deg)",
  "Cool":      "saturate(1.2) hue-rotate(160deg) brightness(1.05)",
  "Blur":      "blur(4px)"
};

const effectsBox = document.getElementById("lb-effects");

Object.entries(effects).forEach(([name, css], i) => {
  const btn = document.createElement("button");
  btn.className = "effect-btn" + (i === 0 ? " active" : "");
  btn.textContent = name;
  btn.addEventListener("click", () => {
    lbImg.style.filter = css;
    document.querySelectorAll(".effect-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
  effectsBox.appendChild(btn);
});

// ---------------------------------------------------------------
// 9. START
// ---------------------------------------------------------------
async function init() {
  try {
    const saved = await loadPhotos();
    saved.sort((a, b) => a.id - b.id).forEach(addUploadedImage);
  } catch (e) {
    // IndexedDB unavailable (e.g. private mode): gallery still works
  }
  buildFilters();
  applyFilter();
}

init();