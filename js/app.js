const STORAGE_KEYS = {
  wardrobe: "ihncs_wardrobe",
  saved: "ihncs_saved",
  inspiration: "ihncs_inspiration"
};

const demoWardrobe = [
  {
    id: crypto.randomUUID(),
    name: "White Crop Top",
    category: "top",
    image: placeholder("White Top", "#e9e5df")
  },
  {
    id: crypto.randomUUID(),
    name: "Blue Baggy Jeans",
    category: "bottom",
    image: placeholder("Blue Jeans", "#b7c4d2")
  },
  {
    id: crypto.randomUUID(),
    name: "Black Oversized Blazer",
    category: "outerwear",
    image: placeholder("Black Blazer", "#4a4644")
  },
  {
    id: crypto.randomUUID(),
    name: "Black Sneakers",
    category: "shoes",
    image: placeholder("Sneakers", "#d7d0ca")
  },
  {
    id: crypto.randomUUID(),
    name: "Brown Shoulder Bag",
    category: "accessory",
    image: placeholder("Brown Bag", "#a47d5d")
  },
  {
    id: crypto.randomUUID(),
    name: "Little Black Dress",
    category: "dress",
    image: placeholder("Black Dress", "#302d2b")
  }
];

let wardrobe = load(STORAGE_KEYS.wardrobe, demoWardrobe).map(item => ({
  ...item,
  color: item.color || "Unknown",
  style: item.style || "Casual",
  season: item.season || "All year",
  favourite: Boolean(item.favourite)
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
      <text x="50%" y="48%" text-anchor="middle"
        font-family="Arial" font-size="32" fill="#554d47">${label}</text>
      <text x="50%" y="55%" text-anchor="middle"
        font-family="Arial" font-size="18" fill="#776e68">demo piece</text>
    </svg>
  `;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function navigate(route) {
  document
    .querySelectorAll(".page")
    .forEach(page => page.classList.remove("active"));

  const target = document.getElementById(route);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.route === route);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (route === "wardrobe") renderWardrobe();
  if (route === "builder") renderBuilder();
  if (route === "saved") renderSaved();
  if (route === "inspiration") renderInspiration();
}

document.addEventListener("click", event => {
  const routeTarget = event.target.closest("[data-route]");

  if (routeTarget) {
    navigate(routeTarget.dataset.route);
  }
});

/* ===============================
   CATEGORY FILTERS
================================ */

const categoryFilters = document.getElementById("categoryFilters");

if (categoryFilters) {
  categoryFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");

    if (!button) return;

    currentFilter = button.dataset.category;

    document
      .querySelectorAll(".filter")
      .forEach(b => b.classList.remove("active"));

    button.classList.add("active");

    renderWardrobe();
  });
}

/* ===============================
   MOOD
================================ */

document.querySelectorAll(".mood-option").forEach(button => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".mood-option")
      .forEach(b => b.classList.remove("selected"));

    button.classList.add("selected");

    selectedMood = button.dataset.mood;
  });
});

/* ===============================
   ADD PIECE MODAL
================================ */

const pieceModal = document.getElementById("pieceModal");
const pieceForm = document.getElementById("pieceForm");
const addPieceButton = document.getElementById("addPieceButton");
const closePieceModalButton = document.getElementById("closePieceModal");

if (addPieceButton) {
  addPieceButton.addEventListener("click", () => {
    pieceModal.classList.add("open");
    pieceModal.setAttribute("aria-hidden", "false");
  });
}

if (closePieceModalButton) {
  closePieceModalButton.addEventListener("click", closePieceModal);
}

if (pieceModal) {
  pieceModal.addEventListener("click", event => {
    if (event.target === pieceModal) {
      closePieceModal();
    }
  });
}

function closePieceModal() {
  if (!pieceModal) return;

  pieceModal.classList.remove("open");
  pieceModal.setAttribute("aria-hidden", "true");
}

/* ===============================
   CHRIS AI
================================ */

const piecePhotoInput = document.getElementById("piecePhoto");

let askChrisButton = null;
let chrisStatus = null;

if (piecePhotoInput && piecePhotoInput.parentElement) {
  askChrisButton = document.createElement("button");

  askChrisButton.type = "button";
  askChrisButton.className = "primary-button";
  askChrisButton.textContent = "Ask Chris";
  askChrisButton.style.marginTop = "10px";

  chrisStatus = document.createElement("p");

  chrisStatus.style.marginTop = "8px";
  chrisStatus.style.fontSize = "14px";

  piecePhotoInput.parentElement.appendChild(askChrisButton);
  piecePhotoInput.parentElement.appendChild(chrisStatus);

  askChrisButton.addEventListener("click", analyzeClothingWithChris);
}

async function analyzeClothingWithChris() {
  const file = piecePhotoInput.files[0];

  if (!file) {
    chrisStatus.textContent =
      "Chris needs a photo first, babe.";
    return;
  }

  try {
    askChrisButton.disabled = true;
    askChrisButton.textContent = "Chris is investigating...";
    chrisStatus.textContent =
      "Examining the wardrobe evidence...";

    const image = await fileToDataURL(file);

    const response = await fetch(
      "http://localhost:3000/api/analyze-clothing",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.details ||
        data.error ||
        "Chris could not analyze that piece."
      );
    }

    const clothing = data.clothing || {};

    /* -------------------------------
       NAME
    -------------------------------- */

    const nameInput = document.getElementById("pieceName");

    if (nameInput) {
      nameInput.value = clothing.name || "";
    }

    /* -------------------------------
       CATEGORY
    -------------------------------- */

    const categoryMap = {
      top: "top",
      bottom: "bottom",
      dress: "dress",
      outerwear: "outerwear",
      shoes: "shoes",
      accessory: "accessory"
    };

    const categoryInput =
      document.getElementById("pieceCategory");

    if (categoryInput) {
      categoryInput.value =
        categoryMap[String(clothing.category || "").toLowerCase()] ||
        "top";
    }

    /* -------------------------------
       COLOUR
    -------------------------------- */

    const colorInput =
      document.getElementById("pieceColor");

    if (colorInput) {
      colorInput.value = clothing.color || "";
    }

    /* -------------------------------
       STYLE
    -------------------------------- */

    const styleInput =
      document.getElementById("pieceStyle");

    if (styleInput) {
      const styleText =
        String(clothing.style || "").toLowerCase();

      let wardrobeStyle = "Casual";

      if (styleText.includes("street")) {
        wardrobeStyle = "Streetwear";
      } else if (styleText.includes("minimal")) {
        wardrobeStyle = "Minimal";
      } else if (styleText.includes("feminine")) {
        wardrobeStyle = "Feminine";
      } else if (styleText.includes("edgy")) {
        wardrobeStyle = "Edgy";
      } else if (
        styleText.includes("comfy") ||
        styleText.includes("comfort")
      ) {
        wardrobeStyle = "Comfy";
      } else if (
        styleText.includes("smart") ||
        styleText.includes("formal")
      ) {
        wardrobeStyle = "Smart";
      }

      styleInput.value = wardrobeStyle;
    }

    /* -------------------------------
       SEASON
    -------------------------------- */

    const seasonInput =
      document.getElementById("pieceSeason");

    if (seasonInput) {
      const season =
        clothing.season || "All year";

      const availableOptions =
        Array.from(seasonInput.options)
          .map(option => option.value);

      if (availableOptions.includes(season)) {
        seasonInput.value = season;
      } else {
        const matchingOption =
          availableOptions.find(option =>
            option.toLowerCase() ===
            String(season).toLowerCase()
          );

        if (matchingOption) {
          seasonInput.value = matchingOption;
        }
      }
    }

    chrisStatus.textContent =
      `Chris says: "${clothing.name || "this piece"}" — ` +
      `${clothing.confidence || 0}% confidence. ` +
      `You can edit anything before saving.`;

    askChrisButton.textContent =
      "Chris filled it in";

  } catch (error) {
    console.error("Chris AI error:", error);

    chrisStatus.textContent =
      `Chris had a wardrobe emergency: ${error.message}`;

    askChrisButton.textContent =
      "Ask Chris";

  } finally {
    askChrisButton.disabled = false;
  }
}

/* ===============================
   SAVE NEW CLOTHING PIECE
================================ */

if (pieceForm) {
  pieceForm.addEventListener("submit", async event => {
    event.preventDefault();

    const photoInput =
      document.getElementById("piecePhoto");

    const nameInput =
      document.getElementById("pieceName");

    const categoryInput =
      document.getElementById("pieceCategory");

    const colorInput =
      document.getElementById("pieceColor");

    const styleInput =
      document.getElementById("pieceStyle");

    const seasonInput =
      document.getElementById("pieceSeason");

    const favouriteInput =
      document.getElementById("pieceFavourite");

    const file = photoInput
      ? photoInput.files[0]
      : null;

    if (!file) {
      showToast("Please choose a photo first.");
      return;
    }

    try {
      const image = await fileToDataURL(file);

      const newPiece = {
        id: crypto.randomUUID(),
        name:
          nameInput?.value.trim() ||
          cleanFileName(file.name) ||
          "New clothing piece",

        category:
          categoryInput?.value ||
          guessCategory(file.name),

        color:
          colorInput?.value.trim() ||
          "Unknown",

        style:
          styleInput?.value ||
          "Casual",

        season:
          seasonInput?.value ||
          "All year",

        favourite:
          Boolean(favouriteInput?.checked),

        image
      };

      wardrobe.unshift(newPiece);

      persist(
        STORAGE_KEYS.wardrobe,
        wardrobe
      );

      renderWardrobe();
      updateStats();
      closePieceModal();

      pieceForm.reset();

      if (chrisStatus) {
        chrisStatus.textContent = "";
      }

      if (askChrisButton) {
        askChrisButton.textContent =
          "Ask Chris";
      }

      showToast(
        `${newPiece.name} added to the wardrobe. Chris approves.`
      );

    } catch (error) {
      console.error(
        "Could not save clothing piece:",
        error
      );

      showToast(
        "Chris tripped over a hanger. Try again."
      );
    }
  });
}

/* ===============================
   WARDROBE
================================ */

function renderWardrobe() {
  const grid =
    document.getElementById("wardrobeGrid");

  const empty =
    document.getElementById("emptyWardrobe");

  if (!grid || !empty) return;

  const filtered =
    currentFilter === "all"
      ? wardrobe
      : wardrobe.filter(
          item => item.category === currentFilter
        );

  grid.innerHTML = filtered
    .map(item => `
      <article class="clothing-card">
        <img
          class="clothing-image"
          src="${item.image}"
          alt="${escapeHTML(item.name)}"
        >

        <div class="clothing-info">

          <button
            class="delete-piece"
            data-delete="${item.id}"
            title="Delete"
          >
            X
          </button>

          <strong>
            ${
              item.favourite
                ? '<span class="favourite-mark">♥</span> '
                : ""
            }

            ${escapeHTML(item.name)}
          </strong>

          <div class="meta-line">

            <span class="meta-pill">
              ${prettyCategory(item.category)}
            </span>

            <span class="meta-pill">
              ${escapeHTML(item.color || "Unknown")}
            </span>

            <span class="meta-pill">
              ${escapeHTML(item.style || "Casual")}
            </span>

            <span class="meta-pill">
              ${escapeHTML(item.season || "All year")}
            </span>

          </div>

        </div>
      </article>
    `)
    .join("");

  empty.style.display =
    filtered.length ? "none" : "block";

  grid
    .querySelectorAll("[data-delete]")
    .forEach(button => {
      button.addEventListener("click", () => {

        wardrobe =
          wardrobe.filter(
            item =>
              item.id !== button.dataset.delete
          );

        persist(
          STORAGE_KEYS.wardrobe,
          wardrobe
        );

        renderWardrobe();
        updateStats();

        showToast("Piece removed.");
      });
    });
}

/* ===============================
   OUTFIT BUILDER
================================ */

function renderBuilder() {
  const slots =
    document.getElementById("builderSlots");

  const wardrobeGrid =
    document.getElementById("builderWardrobe");

  if (!slots || !wardrobeGrid) return;

  const slotCategories = [
    "top",
    "bottom",
    "dress",
    "outerwear",
    "shoes",
    "accessory"
  ];

  slots.innerHTML =
    slotCategories
      .map(category => {

        const item =
          builderItems.find(
            piece => piece.category === category
          );

        return item
          ? `
            <div class="builder-slot">
              <img src="${item.image}" alt="">
              <div>
                <strong>
                  ${escapeHTML(item.name)}
                </strong>
                <br>
                <small>
                  ${prettyCategory(item.category)}
                </small>
              </div>
            </div>
          `
          : `
            <div class="builder-slot empty">
              ${prettyCategory(category)}
              — choose a piece
            </div>
          `;
      })
      .join("");

  wardrobeGrid.innerHTML =
    wardrobe
      .map(item => `
        <button
          class="mini-piece"
          data-builder-id="${item.id}"
        >
          <img
            src="${item.image}"
            alt=""
          >

          <span>
            ${escapeHTML(item.name)}
          </span>
        </button>
      `)
      .join("");

  wardrobeGrid
    .querySelectorAll("[data-builder-id]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const item =
          wardrobe.find(
            piece =>
              piece.id === button.dataset.builderId
          );

        if (!item) return;

        builderItems =
          builderItems.filter(
            piece =>
              piece.category !== item.category
          );

        builderItems.push(item);

        renderBuilder();

        showToast(
          `${item.name} added. Fashion science continues.`
        );
      });
    });
}

/* ===============================
   OUTFIT GENERATOR
================================ */

function generateOutfit() {
  if (!wardrobe.length) {
    showToast(
      "Your wardrobe is empty. Upload some clothes first."
    );
    return;
  }

  const occasion =
    document.getElementById("occasion").value;

  const style =
    document.getElementById("style").value;

  const top = pickByCategory("top");
  const bottom = pickByCategory("bottom");
  const dress = pickByCategory("dress");
  const outerwear = pickByCategory("outerwear");
  const shoes = pickByCategory("shoes");
  const accessory = pickByCategory("accessory");

  let items;

  if (dress && Math.random() > 0.45) {
    items = [
      dress,
      outerwear,
      shoes,
      accessory
    ].filter(Boolean);
  } else {
    items = [
      top,
      bottom,
      outerwear,
      shoes,
      accessory
    ].filter(Boolean);
  }

  const moodText = {
    happy:
      "You look like you're having a good day, so let's not waste it.",

    meh:
      "Okay. Minimal emotional effort, maximum visual result.",

    sad:
      "We're dressing the outside while the inside files a complaint.",

    mad:
      "The brief is: look incredible and do not speak to anyone.",

    cool:
      "Confidence levels have been unnecessarily increased.",

    tired:
      "Low battery, high outfit quality. That's the mission."
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

  const styleText =
    style.replace("-", " ");

  const outfitResult =
    document.getElementById("outfitResult");

  if (!outfitResult) return;

  outfitResult.innerHTML = `
    <div class="generated-look">

      <span class="eyebrow">
        CHRIS AI'S DECISION
      </span>

      <h2>
        OUTFIT: ${titleCase(styleText)}
      </h2>

      <div class="ai-note">

        <strong>Chris:</strong>
        ${moodText}

        <br>

        For your
        <strong>${occasionText}</strong>
        with a
        <strong>${styleText}</strong>
        vibe.

        I have reviewed the evidence.

        You have clothes.

      </div>

      <div class="generated-items">

        ${items
          .map(
            item => `
              <div class="generated-item">

                <img
                  src="${item.image}"
                  alt="${escapeHTML(item.name)}"
                >

                <div>
                  <strong>
                    ${escapeHTML(item.name)}
                  </strong>
                </div>

              </div>
            `
          )
          .join("")}

      </div>

      <div
        class="builder-actions"
        style="margin-top:18px"
      >

        <button
          class="primary-button"
          id="saveGenerated"
        >
          Save this look
        </button>

        <button
          class="secondary-button"
          id="regenerate"
        >
          Try again
        </button>

      </div>

    </div>
  `;

  document
    .getElementById("saveGenerated")
    .addEventListener("click", () => {

      savedLooks.unshift({
        id: crypto.randomUUID(),

        name:
          `${titleCase(styleText)} Look`,

        note:
          `Generated for ${occasionText} - mood: ${selectedMood}`,

        items:
          items.map(item => item.id),

        createdAt:
          new Date().toISOString()
      });

      persist(
        STORAGE_KEYS.saved,
        savedLooks
      );

      updateStats();

      showToast(
        "Saved. Chris is pretending this was a difficult decision."
      );
    });

  document
    .getElementById("regenerate")
    .addEventListener(
      "click",
      generateOutfit
    );
}

/* ===============================
   PICK RANDOM PIECE
================================ */

function pickByCategory(category) {
  const options =
    wardrobe.filter(
      item => item.category === category
    );

  if (!options.length) return null;

  return options[
    Math.floor(
      Math.random() * options.length
    )
  ];
}

/* ===============================
   SAVED LOOKS
================================ */

function renderSaved() {
  const grid =
    document.getElementById("savedGrid");

  const empty =
    document.getElementById("emptySaved");

  if (!grid || !empty) return;

  grid.innerHTML =
    savedLooks
      .map(look => {

        const items =
          look.items
            .map(
              id =>
                wardrobe.find(
                  item => item.id === id
                )
            )
            .filter(Boolean);

        return `
          <article class="saved-card">

            <div class="generated-items">

              ${items
                .map(
                  item => `
                    <div class="generated-item">
                      <img
                        src="${item.image}"
                        alt=""
                      >
                    </div>
                  `
                )
                .join("")}

            </div>

            <div style="padding:14px">

              <strong>
                ${escapeHTML(look.name)}
              </strong>

              <p
                style="
                  color:var(--muted);
                  font-size:13px;
                  margin:7px 0 0
                "
              >
                ${escapeHTML(look.note)}
              </p>

            </div>

          </article>
        `;
      })
      .join("");

  empty.style.display =
    savedLooks.length
      ? "none"
      : "block";
}

/* ===============================
   INSPIRATION
================================ */

function renderInspiration() {
  const grid =
    document.getElementById("inspirationGrid");

  const empty =
    document.getElementById("emptyInspiration");

  if (!grid || !empty) return;

  grid.innerHTML =
    inspiration
      .map(
        item => `
          <article class="inspiration-card">

            <img
              class="inspiration-image"
              src="${item.image}"
              alt="${escapeHTML(item.name)}"
            >

            <div style="padding:12px">

              <strong>
                ${escapeHTML(item.name)}
              </strong>

            </div>

          </article>
        `
      )
      .join("");

  empty.style.display =
    inspiration.length
      ? "none"
      : "block";
}

/* ===============================
   STATS
================================ */

function updateStats() {
  const count =
    category =>
      wardrobe.filter(
        item =>
          item.category === category
      ).length;

  const topCount =
    document.getElementById("topCount");

  const bottomCount =
    document.getElementById("bottomCount");

  const shoeCount =
    document.getElementById("shoeCount");

  const savedCount =
    document.getElementById("savedCount");

  if (topCount) {
    topCount.textContent =
      count("top");
  }

  if (bottomCount) {
    bottomCount.textContent =
      count("bottom");
  }

  if (shoeCount) {
    shoeCount.textContent =
      count("shoes");
  }

  if (savedCount) {
    savedCount.textContent =
      savedLooks.length;
  }
}

/* ===============================
   FILE HELPERS
================================ */

function guessCategory(filename) {
  const name =
    filename.toLowerCase();

  if (
    /shoe|sneaker|heel|boot|loafer|trainer/.test(name)
  ) {
    return "shoes";
  }

  if (/dress|gown/.test(name)) {
    return "dress";
  }

  if (
    /jacket|coat|blazer|cardigan|hoodie/.test(name)
  ) {
    return "outerwear";
  }

  if (
    /jean|pant|trouser|skirt|short/.test(name)
  ) {
    return "bottom";
  }

  if (
    /bag|purse|belt|hat|scarf|jewelry|accessory/.test(name)
  ) {
    return "accessory";
  }

  return "top";
}

function cleanFileName(filename) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(
      /\b\w/g,
      c => c.toUpperCase()
    );
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
  return String(value)
    .replace(
      /\b\w/g,
      c => c.toUpperCase()
    );
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}

function fileToDataURL(file) {
  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(reader.result);

      reader.onerror =
        reject;

      reader.readAsDataURL(file);
    }
  );
}

/* ===============================
   START APP
================================ */

updateStats();
renderWardrobe();