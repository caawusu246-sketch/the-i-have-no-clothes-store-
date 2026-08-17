const STORAGE_KEYS = {
  wardrobe: "ihncs_wardrobe",
  saved: "ihncs_saved",
  inspiration: "ihncs_inspiration"
};

const demoWardrobe = [
  { id: crypto.randomUUID(), name: "White Crop Top", category: "top", image: placeholder("White Top", "#e9e5df") },
  { id: crypto.randomUUID(), name: "Blue Baggy Jeans", category: "bottom", image: placeholder("Blue Jeans", "#b7c4d2") },
  { id: crypto.randomUUID(), name: "Black Oversized Blazer", category: "outerwear", image: placeholder("Black Blazer", "#4a4644") },
  { id: crypto.randomUUID(), name: "Black Sneakers", category: "shoes", image: placeholder("Sneakers", "#d7d0ca") },
  { id: crypto.randomUUID(), name: "Brown Shoulder Bag", category: "accessory", image: placeholder("Brown Bag", "#a47d5d") },
  { id: crypto.randomUUID(), name: "Little Black Dress", category: "dress", image: placeholder("Black Dress", "#302d2b") }
];

let wardrobe = load(STORAGE_KEYS.wardrobe, demoWardrobe).map(item => ({
  ...item, color: item.color || "Unknown", style: item.style || "Casual",
  season: item.season || "All year", favourite: Boolean(item.favourite)
}));
let savedLooks = load(STORAGE_KEYS.saved, []);
let inspiration = load(STORAGE_KEYS.inspiration, []);
let builderItems = [];
let currentFilter = "all";
let selectedMood = "happy";

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function placeholder(label, bg) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="${bg}"/>
      <text x="50%" y="48%" text-anchor="middle" font-family="Arial" font-size="32" fill="#554d47">${label}</text>
      <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="18" fill="#776e68">demo piece</text>
    </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function navigate(route) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  const target = document.getElementById(route);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.route === route);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
  if (route === "wardrobe") renderWardrobe();
  if (route === "builder") renderBuilder();
  if (route === "saved") renderSaved();
  if (route === "inspiration") renderInspiration();
}

document.addEventListener("click", event => {
  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) navigate(routeTarget.dataset.route);
});

document.getElementById("categoryFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  currentFilter = button.dataset.category;
  document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  renderWardrobe();
});

document.querySelectorAll(".mood-option").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mood-option").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    selectedMood = button.dataset.mood;
  });
});

const pieceModal = document.getElementById("pieceModal");
const pieceForm = document.getElementById("pieceForm");
document.getElementById("addPieceButton").addEventListener("click", () => {
  pieceModal.classList.add("open"); pieceModal.setAttribute("aria-hidden", "false");
});
document.getElementById("closePieceModal").addEventListener("click", closePieceModal);
pieceModal.addEventListener("click", event => { if (event.target === pieceModal) closePieceModal(); });
function closePieceModal() {
  pieceModal.classList.remove("open"); pieceModal.setAttribute("aria-hidden", "true");
}
pieceForm.addEventListener("submit", async event => {
  event.preventDefault();
  const file = document.getElementById("piecePhoto").files[0];
  if (!file) return;
  const item = {
    id: crypto.randomUUID(),
    name: document.getElementById("pieceName").value.trim(),
    category: document.getElementById("pieceCategory").value,
    color: document.getElementById("pieceColor").value.trim() || "Unknown",
    style: document.getElementById("pieceStyle").value,
    season: document.getElementById("pieceSeason").value,
    favourite: document.getElementById("pieceFavourite").checked,
    image: await fileToDataURL(file),
    createdAt: new Date().toISOString()
  };
  wardrobe.unshift(item); persist(STORAGE_KEYS.wardrobe, wardrobe);
  renderWardrobe(); updateStats(); pieceForm.reset(); closePieceModal();
  showToast(`${item.name} is officially in the store. 👗`);
});

document.getElementById("inspirationUpload").addEventListener("change", async event => {
  const files = [...event.target.files];
  for (const file of files) {
    const image = await fileToDataURL(file);
    inspiration.push({ id: crypto.randomUUID(), name: cleanFileName(file.name), image });
  }
  persist(STORAGE_KEYS.inspiration, inspiration);
  renderInspiration();
  showToast("Inspiration saved. Pinterest energy detected. 📌");
  event.target.value = "";
});

document.getElementById("generateButton").addEventListener("click", generateOutfit);

document.getElementById("clearBuilder").addEventListener("click", () => {
  builderItems = [];
  renderBuilder();
});

document.getElementById("saveBuilder").addEventListener("click", () => {
  if (!builderItems.length) {
    showToast("You need at least one piece. I can't save air.");
    return;
  }
  savedLooks.unshift({
    id: crypto.randomUUID(),
    name: "Manual Look",
    note: "Built manually by her. Chris has been informed.",
    items: builderItems.map(item => item.id),
    createdAt: new Date().toISOString()
  });
  persist(STORAGE_KEYS.saved, savedLooks);
  updateStats();
  showToast("Saved. This outfit has officially entered the archives. ❤️");
});

function renderWardrobe() {
  const grid = document.getElementById("wardrobeGrid");
  const empty = document.getElementById("emptyWardrobe");
  const filtered = currentFilter === "all"
    ? wardrobe
    : wardrobe.filter(item => item.category === currentFilter);

  grid.innerHTML = filtered.map(item => `
    <article class="clothing-card">
      <img class="clothing-image" src="${item.image}" alt="${escapeHTML(item.name)}">
      <div class="clothing-info">
        <button class="delete-piece" data-delete="${item.id}" title="Delete">×</button>
        <strong>${item.favourite ? '<span class="favourite-mark">♥</span> ' : ''}${escapeHTML(item.name)}</strong>
        <div class="meta-line">
          <span class="meta-pill">${prettyCategory(item.category)}</span>
          <span class="meta-pill">${escapeHTML(item.color || "Unknown")}</span>
          <span class="meta-pill">${escapeHTML(item.style || "Casual")}</span>
          <span class="meta-pill">${escapeHTML(item.season || "All year")}</span>
        </div>
      </div>
    </article>
  `).join("");

  empty.style.display = filtered.length ? "none" : "block";

  grid.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => {
      wardrobe = wardrobe.filter(item => item.id !== button.dataset.delete);
      persist(STORAGE_KEYS.wardrobe, wardrobe);
      renderWardrobe();
      updateStats();
    });
  });
}

function renderBuilder() {
  const slots = document.getElementById("builderSlots");
  const wardrobeGrid = document.getElementById("builderWardrobe");

  const slotCategories = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"];
  slots.innerHTML = slotCategories.map(category => {
    const item = builderItems.find(piece => piece.category === category);
    return item
      ? `<div class="builder-slot">
           <img src="${item.image}" alt="">
           <div><strong>${escapeHTML(item.name)}</strong><br><small>${prettyCategory(item.category)}</small></div>
         </div>`
      : `<div class="builder-slot empty">${prettyCategory(category)} — choose a piece</div>`;
  }).join("");

  wardrobeGrid.innerHTML = wardrobe.map(item => `
    <button class="mini-piece" data-builder-id="${item.id}">
      <img src="${item.image}" alt="">
      <span>${escapeHTML(item.name)}</span>
    </button>
  `).join("");

  wardrobeGrid.querySelectorAll("[data-builder-id]").forEach(button => {
    button.addEventListener("click", () => {
      const item = wardrobe.find(piece => piece.id === button.dataset.builderId);
      if (!item) return;

      builderItems = builderItems.filter(piece => piece.category !== item.category);
      builderItems.push(item);
      renderBuilder();
      showToast(`${item.name} added. Fashion science continues.`);
    });
  });
}

function generateOutfit() {
  if (!wardrobe.length) {
    showToast("Your wardrobe is empty. Upload some clothes first.");
    return;
  }

  const occasion = document.getElementById("occasion").value;
  const style = document.getElementById("style").value;

  const top = pickByCategory("top");
  const bottom = pickByCategory("bottom");
  const dress = pickByCategory("dress");
  const outerwear = pickByCategory("outerwear");
  const shoes = pickByCategory("shoes");
  const accessory = pickByCategory("accessory");

  let items;
  if (dress && Math.random() > 0.45) {
    items = [dress, outerwear, shoes, accessory].filter(Boolean);
  } else {
    items = [top, bottom, outerwear, shoes, accessory].filter(Boolean);
  }

  const moodText = {
    happy: "You look like you're having a good day, so let's not waste it.",
    meh: "Okay. Minimal emotional effort, maximum visual result.",
    sad: "We're dressing the outside while the inside files a complaint.",
    mad: "The brief is: look incredible and do not speak to anyone.",
    cool: "Confidence levels have been unnecessarily increased.",
    tired: "Low battery, high outfit quality. That's the mission."
  }[selectedMood];

  const occasionText = {
    casual: "casual day",
    work: "work / university",
    date: "date night",
    dinner: "dinner",
    party: "party",
    holiday: "holiday",
    unknown: "mysterious plans"
  }[occasion];

  const styleText = style.replace("-", " ");

  document.getElementById("outfitResult").innerHTML = `
    <div class="generated-look">
      <span class="eyebrow">CHRIS AI'S DECISION</span>
      <h2>OUTFIT: ${titleCase(styleText)}</h2>
      <div class="ai-note">
        <strong>Chris:</strong> ${moodText}<br>
        For your <strong>${occasionText}</strong> with a <strong>${styleText}</strong> vibe.
        I have reviewed the evidence. You have clothes.
      </div>

      <div class="generated-items">
        ${items.map(item => `
          <div class="generated-item">
            <img src="${item.image}" alt="${escapeHTML(item.name)}">
            <div><strong>${escapeHTML(item.name)}</strong></div>
          </div>
        `).join("")}
      </div>

      <div class="builder-actions" style="margin-top:18px">
        <button class="primary-button" id="saveGenerated">Save this look ❤️</button>
        <button class="secondary-button" id="regenerate">Try again</button>
      </div>
    </div>
  `;

  document.getElementById("saveGenerated").addEventListener("click", () => {
    savedLooks.unshift({
      id: crypto.randomUUID(),
      name: `${titleCase(styleText)} Look`,
      note: `Generated for ${occasionText} • mood: ${selectedMood}`,
      items: items.map(item => item.id),
      createdAt: new Date().toISOString()
    });
    persist(STORAGE_KEYS.saved, savedLooks);
    updateStats();
    showToast("Saved. Chris is pretending this was a difficult decision. ❤️");
  });

  document.getElementById("regenerate").addEventListener("click", generateOutfit);
}

function pickByCategory(category) {
  const options = wardrobe.filter(item => item.category === category);
  if (!options.length) return null;
  return options[Math.floor(Math.random() * options.length)];
}

function renderSaved() {
  const grid = document.getElementById("savedGrid");
  const empty = document.getElementById("emptySaved");

  grid.innerHTML = savedLooks.map(look => {
    const items = look.items.map(id => wardrobe.find(item => item.id === id)).filter(Boolean);
    return `
      <article class="saved-card">
        <div class="generated-items">
          ${items.map(item => `
            <div class="generated-item">
              <img src="${item.image}" alt="">
            </div>
          `).join("")}
        </div>
        <div style="padding:14px">
          <strong>${escapeHTML(look.name)}</strong>
          <p style="color:var(--muted);font-size:13px;margin:7px 0 0">${escapeHTML(look.note)}</p>
        </div>
      </article>
    `;
  }).join("");

  empty.style.display = savedLooks.length ? "none" : "block";
}

function renderInspiration() {
  const grid = document.getElementById("inspirationGrid");
  const empty = document.getElementById("emptyInspiration");

  grid.innerHTML = inspiration.map(item => `
    <article class="inspiration-card">
      <img class="inspiration-image" src="${item.image}" alt="${escapeHTML(item.name)}">
      <div style="padding:12px">
        <strong>${escapeHTML(item.name)}</strong>
      </div>
    </article>
  `).join("");

  empty.style.display = inspiration.length ? "none" : "block";
}

function updateStats() {
  const count = category => wardrobe.filter(item => item.category === category).length;
  document.getElementById("topCount").textContent = count("top");
  document.getElementById("bottomCount").textContent = count("bottom");
  document.getElementById("shoeCount").textContent = count("shoes");
  document.getElementById("savedCount").textContent = savedLooks.length;
}

function guessCategory(filename) {
  const name = filename.toLowerCase();
  if (/shoe|sneaker|heel|boot|loafer|trainer/.test(name)) return "shoes";
  if (/dress|gown/.test(name)) return "dress";
  if (/jacket|coat|blazer|cardigan|hoodie/.test(name)) return "outerwear";
  if (/jean|pant|trouser|skirt|short/.test(name)) return "bottom";
  if (/bag|purse|belt|hat|scarf|jewelry|accessory/.test(name)) return "accessory";
  return "top";
}

function cleanFileName(filename) {
  return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function prettyCategory(category) {
  return {
    top: "Top",
    bottom: "Bottom",
    dress: "Dress",
    outerwear: "Outerwear",
    shoes: "Shoes",
    accessory: "Accessory"
  }[category] || category;
}

function titleCase(value) {
  return value.replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

updateStats();
renderWardrobe();
