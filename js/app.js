/* ===============================
   PERSONAL WARDROBE - CLEAN APP
================================ */

const STORAGE_KEYS = {
  wardrobe: "ihncs_wardrobe",
  saved: "ihncs_saved",
  inspiration: "ihncs_inspiration",
  avatar: "ihncs_avatar"
};

const CHRIS_API_URL = "http://localhost:3000/api/analyze-clothing";

const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".jfif",
  ".png",
  ".webp",
  ".gif"
];

/* ===============================
   HELPERS
================================ */

function placeholder(label, bg) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="${bg}"/>
      <text
        x="50%"
        y="48%"
        text-anchor="middle"
        font-family="Arial"
        font-size="32"
        fill="#554d47"
      >
        ${label}
      </text>
    </svg>
  `;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return map[char];
  });
}

function prettyCategory(category) {
  const categories = {
    top: "Top",
    bottom: "Bottom",
    dress: "Dress",
    outerwear: "Outerwear",
    shoes: "Shoes",
    accessory: "Accessory"
  };

  return categories[category] || category;
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, char =>
    char.toUpperCase()
  );
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function isSupportedImageFile(file) {
  if (!file) {
    return false;
  }

  return SUPPORTED_IMAGE_EXTENSIONS.some(extension =>
    String(file.name || "")
      .toLowerCase()
      .endsWith(extension)
  );
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("Could not read image"));
    };

    reader.readAsDataURL(file);
  });
}

function guessCategory(filename) {
  const name = String(filename || "").toLowerCase();

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
    /bag|purse|belt|hat|scarf|jewelry|jewellery|accessory/.test(name)
  ) {
    return "accessory";
  }

  return "top";
}

function cleanFileName(name) {
  return String(name || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeCategory(value) {
  const category = String(value || "")
    .trim()
    .toLowerCase();

  const map = {
    top: "top",
    tops: "top",

    bottom: "bottom",
    bottoms: "bottom",

    dress: "dress",
    dresses: "dress",

    outerwear: "outerwear",
    jacket: "outerwear",
    coat: "outerwear",
    blazer: "outerwear",

    shoes: "shoes",
    shoe: "shoes",
    sneakers: "shoes",
    sneaker: "shoes",

    accessory: "accessory",
    accessories: "accessory"
  };

  return map[category] || "top";
}

function normalizeStyle(value) {
  const style = String(value || "").toLowerCase();

  if (style.includes("street")) {
    return "Streetwear";
  }

  if (style.includes("minimal")) {
    return "Minimal";
  }

  if (style.includes("feminine")) {
    return "Feminine";
  }

  if (style.includes("edgy")) {
    return "Edgy";
  }

  if (
    style.includes("comfy") ||
    style.includes("comfort")
  ) {
    return "Comfy";
  }

  if (
    style.includes("smart") ||
    style.includes("formal")
  ) {
    return "Smart";
  }

  return "Casual";
}


/* ===============================
   DEMO WARDROBE
================================ */

const demoWardrobe = [
  {
    id: uid(),
    name: "White Crop Top",
    category: "top",
    image: placeholder("White Top", "#e9e5df")
  },

  {
    id: uid(),
    name: "Blue Baggy Jeans",
    category: "bottom",
    image: placeholder("Blue Jeans", "#b7c4d2")
  },

  {
    id: uid(),
    name: "Black Oversized Blazer",
    category: "outerwear",
    image: placeholder("Black Blazer", "#4a4644")
  },

  {
    id: uid(),
    name: "Black Sneakers",
    category: "shoes",
    image: placeholder("Sneakers", "#d7d0ca")
  },

  {
    id: uid(),
    name: "Brown Shoulder Bag",
    category: "accessory",
    image: placeholder("Brown Bag", "#a47d5d")
  },

  {
    id: uid(),
    name: "Little Black Dress",
    category: "dress",
    image: placeholder("Black Dress", "#302d2b")
  }
];


/* ===============================
   APP DATA
================================ */

let wardrobe = load(
  STORAGE_KEYS.wardrobe,
  demoWardrobe
).map(item => ({
  ...item,
  color: item.color || "Unknown",
  style: item.style || "Casual",
  season: item.season || "All year",
  favourite: Boolean(item.favourite)
}));

let savedLooks = load(
  STORAGE_KEYS.saved,
  []
);
let currentOutfitImage = null;
let inspiration = load(
  STORAGE_KEYS.inspiration,
  []
);

let avatar = load(
  STORAGE_KEYS.avatar,
  null
);
let avatarSettings =
  load(
    "avatarSettings",
    {
      gender: "female",
      bodySize: 3
    }
  );
let builderItems = [];

let currentFilter = "all";


/* ===============================
   NAVIGATION
================================ */

function navigate(route) {
  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove("active");
    });

  const target = document.getElementById(route);

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll(".nav-item")
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.route === route
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (route === "wardrobe") {
    renderWardrobe();
  }

  if (route === "builder") {
    renderBuilder();
    if (typeof renderBuilderAvatar === "function") {
  renderBuilderAvatar();
}
  }

  if (route === "saved") {
    renderSaved();
  }

  if (route === "inspiration") {
    renderInspiration();
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-route]");

  if (!button) {
    return;
  }

  event.preventDefault();

  navigate(button.dataset.route);
});


/* ===============================
   CATEGORY FILTERS
================================ */

const categoryFilters =
  document.getElementById("categoryFilters");

if (categoryFilters) {
  categoryFilters.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest("[data-category]");

      if (!button) {
        return;
      }

      currentFilter =
        button.dataset.category;

      document
        .querySelectorAll(".filter")
        .forEach(filter => {
          filter.classList.remove("active");
        });

      button.classList.add("active");

      renderWardrobe();
    }
  );
}


/* ===============================
   ADD CLOTHING MODAL
================================ */

const pieceModal =
  document.getElementById("pieceModal");

const pieceForm =
  document.getElementById("pieceForm");

const addPieceButton =
  document.getElementById("addPieceButton");

const closePieceModalButton =
  document.getElementById("closePieceModal");

function closePieceModal() {
  if (!pieceModal) {
    return;
  }

  pieceModal.classList.remove("open");

  pieceModal.setAttribute(
    "aria-hidden",
    "true"
  );
}

if (addPieceButton) {
  addPieceButton.addEventListener(
    "click",
    () => {
      if (!pieceModal) {
        return;
      }

      pieceModal.classList.add("open");

      pieceModal.setAttribute(
        "aria-hidden",
        "false"
      );
    }
  );
}

if (closePieceModalButton) {
  closePieceModalButton.addEventListener(
    "click",
    closePieceModal
  );
}

if (pieceModal) {
  pieceModal.addEventListener(
    "click",
    event => {
      if (event.target === pieceModal) {
        closePieceModal();
      }
    }
  );
}


/* ===============================
   ASK CHRIS
================================ */

const piecePhotoInput =
  document.getElementById("piecePhoto");

let askChrisButton = null;
let chrisStatus = null;

if (
  piecePhotoInput &&
  piecePhotoInput.parentElement
) {
  askChrisButton =
    document.createElement("button");

  askChrisButton.type = "button";

  askChrisButton.className =
    "primary-button";

  askChrisButton.textContent =
    "Ask Chris";

  askChrisButton.style.marginTop =
    "10px";

  chrisStatus =
    document.createElement("p");

  chrisStatus.style.marginTop =
    "8px";

  chrisStatus.style.fontSize =
    "14px";

  piecePhotoInput.parentElement.append(
    askChrisButton,
    chrisStatus
  );

  askChrisButton.addEventListener(
    "click",
    analyzeClothingWithChris
  );
}

async function analyzeClothingWithChris() {
  const file =
    piecePhotoInput?.files?.[0];

  if (!file) {
    if (chrisStatus) {
      chrisStatus.textContent =
        "Chris needs a photo first.";
    }

    return;
  }

  if (!isSupportedImageFile(file)) {
    if (chrisStatus) {
      chrisStatus.textContent =
        "Please choose a JPG, JPEG, PNG, WEBP or GIF image.";
    }

    return;
  }

  try {
    askChrisButton.disabled = true;

    askChrisButton.textContent =
      "Chris is investigating...";

    chrisStatus.textContent =
      "Examining the wardrobe evidence...";

    const image =
      await fileToDataURL(file);

    const response =
      await fetch(CHRIS_API_URL, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          image
        })
      });

    const data =
      await response.json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.details ||
        data.error ||
        "Chris could not analyse this image."
      );
    }

    const clothing =
      data.clothing || {};

    const name =
      document.getElementById("pieceName");

    const category =
      document.getElementById("pieceCategory");

    const color =
      document.getElementById("pieceColor");

    const style =
      document.getElementById("pieceStyle");

    const season =
      document.getElementById("pieceSeason");

    if (name) {
      name.value =
        String(clothing.name || "").trim();
    }

    if (category) {
      category.value =
        normalizeCategory(
          clothing.category
        );
    }

    if (color) {
      color.value =
        String(
          clothing.color ||
          clothing.colour ||
          ""
        ).trim();
    }

    if (style) {
      style.value =
        normalizeStyle(
          clothing.style
        );
    }

    chrisStatus.textContent =
      `Chris filled in "${
        clothing.name || "this piece"
      }".`;

    askChrisButton.textContent =
      "✓ Chris filled it in";

  } catch (error) {

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
  pieceForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const file =
        piecePhotoInput?.files?.[0];

      if (!file) {
        showToast(
          "Please choose a photo first."
        );

        return;
      }

      if (!isSupportedImageFile(file)) {
        showToast(
          "Please choose a supported image."
        );

        return;
      }

      try {
        const image =
          await fileToDataURL(file);

        const item = {
          id: uid(),

          name:
            document
              .getElementById("pieceName")
              ?.value
              .trim()
            ||
            cleanFileName(file.name)
            ||
            "New clothing piece",

          category:
            document
              .getElementById("pieceCategory")
              ?.value
            ||
            guessCategory(file.name),

          color:
            document
              .getElementById("pieceColor")
              ?.value
              .trim()
            ||
            "Unknown",

          style:
            document
              .getElementById("pieceStyle")
              ?.value
            ||
            "Casual",

          season:
            document
              .getElementById("pieceSeason")
              ?.value
            ||
            "All year",

          favourite:
            Boolean(
              document
                .getElementById("pieceFavourite")
                ?.checked
            ),

          image
        };

        wardrobe.unshift(item);

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
          `${item.name} added to the wardrobe.`
        );

      } catch (error) {
        showToast(
          "Could not save that clothing piece."
        );
      }
    }
  );
}


/* ===============================
   RENDER WARDROBE
================================ */

function renderWardrobe() {
  const grid =
    document.getElementById("wardrobeGrid");

  const empty =
    document.getElementById("emptyWardrobe");

  if (!grid) {
    return;
  }

  const items =
    currentFilter === "all"
      ? wardrobe
      : wardrobe.filter(
          item =>
            item.category === currentFilter
        );

  grid.innerHTML =
    items.map(item => `
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
            type="button"
          >
            ×
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
              ${escapeHTML(item.color)}
            </span>

            <span class="meta-pill">
              ${escapeHTML(item.style)}
            </span>

          </div>

        </div>

      </article>
    `).join("");

  if (empty) {
    empty.style.display =
      items.length
        ? "none"
        : "block";
  }

  grid
    .querySelectorAll("[data-delete]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {

          wardrobe =
            wardrobe.filter(
              item =>
                item.id !== button.dataset.delete
            );

          builderItems =
            builderItems.filter(
              item =>
                item.id !== button.dataset.delete
            );

          persist(
            STORAGE_KEYS.wardrobe,
            wardrobe
          );

          renderWardrobe();

          renderBuilder();

          updateStats();

          showToast(
            "Piece removed."
          );
        }
      );
    });
}


/* ===============================
   BUILDER HELPERS
================================ */

function getBuilderItem(category) {
  return builderItems.find(
    item =>
      item.category === category
  );
}

function clothingLayer(item, type) {
  return `
    <img
      class="character-clothing ${type}"
      src="${item.image}"
      alt="${escapeHTML(item.name)}"
    >
  `;
}


/* ===============================
   CHARACTER / AVATAR
================================ */

/* =========================================
   REAL VIRTUAL TRY-ON PREVIEW
========================================= */

const TRY_ON_API_URL =
  "http://localhost:3000/api/try-on";

let tryOnTimer = null;
let tryOnRequestNumber = 0;


function getBuilderItem(category) {

  return builderItems.find(
    item => item.category === category
  );

}


function getAvatarImage() {

  if (avatar?.image) {
    return avatar.image;
  }

  const characterAvatar =
    document.getElementById(
      "characterAvatar"
    );

  if (
    characterAvatar &&
    characterAvatar.src
  ) {
    return characterAvatar.src;
  }

  return null;

}


/* -----------------------------------------
   RENDER CHARACTER
----------------------------------------- */

function renderCharacter() {

  const characterAvatar =
    document.getElementById(
      "characterAvatar"
    );

  const defaultCharacter =
    document.getElementById(
      "defaultCharacter"
    );

  const outfitLayer =
    document.getElementById(
      "outfitLayer"
    );

  const message =
    document.getElementById(
      "characterEmptyMessage"
    );


  if (!characterAvatar) {
    return;
  }


  /* ---------------------------------------
     REMOVE OLD FLOATING CLOTHES
  --------------------------------------- */

  if (outfitLayer) {

    outfitLayer.innerHTML = "";

    outfitLayer.style.display =
      "none";

  }


  /* ---------------------------------------
     SHOW AVATAR
  --------------------------------------- */

  const avatarImage =
    getAvatarImage();


  if (avatarImage) {

    characterAvatar.src =
      avatarImage;

    characterAvatar.style.display =
      "block";

    if (defaultCharacter) {

      defaultCharacter.style.display =
        "none";

    }

  } else {

    characterAvatar.style.display =
      "none";

    if (defaultCharacter) {

      defaultCharacter.style.display =
        "block";

    }

  }


  /* ---------------------------------------
     EMPTY OUTFIT
  --------------------------------------- */

  if (!builderItems.length) {

    if (message) {

      message.style.display =
        "block";

      message.textContent =
        "Choose clothes to try them on.";

    }

    return;

  }


  if (message) {

    message.style.display =
      "block";

    message.textContent =
      "Creating your outfit...";

  }


  clearTimeout(
    tryOnTimer
  );


  tryOnTimer =
    setTimeout(
      renderVirtualTryOn,
      300
    );

}


/* =========================================
   SEND AVATAR + CLOTHES TO TRY-ON
========================================= */

async function renderVirtualTryOn() {

  const characterAvatar =
    document.getElementById(
      "characterAvatar"
    );

  const message =
    document.getElementById(
      "characterEmptyMessage"
    );


  if (
    !characterAvatar ||
    !builderItems.length
  ) {
    return;
  }


  const avatarImage =
    getAvatarImage();


  if (!avatarImage) {

    if (message) {

      message.textContent =
        "Choose an avatar first.";

    }

    return;

  }


  const requestNumber =
    ++tryOnRequestNumber;


  try {

    characterAvatar.style.opacity =
      "0.45";


    if (message) {

      message.style.display =
        "block";

      message.textContent =
        "Trying on your outfit... ✨";

    }


    const clothing = {

      top:
        getBuilderItem("top")
          ?.image || null,

      bottom:
        getBuilderItem("bottom")
          ?.image || null,

      dress:
        getBuilderItem("dress")
          ?.image || null,

      outerwear:
        getBuilderItem("outerwear")
          ?.image || null,

      shoes:
        getBuilderItem("shoes")
          ?.image || null,

      accessory:
        getBuilderItem("accessory")
          ?.image || null

    };


    const response =
      await fetch(
        TRY_ON_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            avatar:
              avatarImage,
avatarSettings: avatarSettings,
            clothing,

            items:
              builderItems.map(
                item => ({

                  name:
                    item.name,

                  category:
                    item.category,

                  image:
                    item.image

                })
              )

          })

        }
      );


    let data = {};


    try {

      data =
        await response.json();

    } catch {

      data = {};

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Could not create the outfit preview."
      );

    }


    /* Ignore old requests */

    if (
      requestNumber !==
      tryOnRequestNumber
    ) {
      return;
    }


    const renderedImage =
    data.image ||
    data.output ||
    data.result;

if (!renderedImage) {
    throw new Error(
        "The try-on server did not return an image."
    );
}

currentOutfitImage = renderedImage;

characterAvatar.src = renderedImage;
characterAvatar.style.display = "block";
characterAvatar.style.opacity = "1";

    /* -------------------------------------
       THIS IS THE IMPORTANT PART

       The avatar image is replaced with
       ONE rendered image.

       No clothing squares.
    ------------------------------------- */

    characterAvatar.src =
      renderedImage;

    characterAvatar.style.display =
      "block";

    characterAvatar.style.opacity =
      "1";


    if (message) {

      message.style.display =
        "none";

    }


    showToast(
      "Outfit ready ✨"
    );


  } catch (error) {

    console.error(
      "Virtual try-on error:",
      error
    );


    characterAvatar.style.opacity =
      "1";


    if (message) {

      message.style.display =
        "block";

      message.textContent =
        "Could not create the outfit preview.";

    }


    showToast(
      "Try-on preview needs the try-on server running."
    );

  }

}


/* ===============================
   RENDER BUILDER
================================ */

function renderBuilder() {

  const slots =
    document.getElementById(
      "builderSlots"
    );

  const grid =
    document.getElementById(
      "builderWardrobe"
    );

  if (!slots || !grid) {
    return;
  }

  const categories = [
    "top",
    "bottom",
    "dress",
    "outerwear",
    "shoes",
    "accessory"
  ];

  slots.innerHTML =
    categories.map(category => {

      const item =
        getBuilderItem(category);

      if (item) {
        return `
          <div class="builder-slot">

            <img
              src="${item.image}"
              alt="${escapeHTML(item.name)}"
            >

            <div>

              <strong>
                ${escapeHTML(item.name)}
              </strong>

              <br>

              <small>
                ${prettyCategory(category)}
              </small>

            </div>

          </div>
        `;
      }

      return `
        <div class="builder-slot empty">

          ${prettyCategory(category)}
          — choose a piece

        </div>
      `;

    }).join("");

  grid.innerHTML =
    wardrobe.map(item => `
      <button
        class="mini-piece"
        type="button"
        data-builder-id="${item.id}"
      >

        <img
          src="${item.image}"
          alt="${escapeHTML(item.name)}"
        >

        <span>
          ${escapeHTML(item.name)}
        </span>

      </button>
    `).join("");

  grid
    .querySelectorAll(
      "[data-builder-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const item =
            wardrobe.find(
              piece =>
                piece.id ===
                button.dataset.builderId
            );

          if (!item) {
            return;
          }

          builderItems =
            builderItems.filter(
              piece =>
                piece.category !==
                item.category
            );

          builderItems.push(item);

          renderBuilder();

          renderCharacter();

          showToast(
            `${item.name} added to your look ✨`
          );
        }
      );

    });

  renderCharacter();
}


/* ===============================
   RANDOM OUTFIT
================================ */

function pickByCategory(category) {

  const items =
    wardrobe.filter(
      item =>
        item.category === category
    );

  if (!items.length) {
    return null;
  }

  return items[
    Math.floor(
      Math.random() *
      items.length
    )
  ];
}

function createRandomOutfit() {

  if (!wardrobe.length) {
    showToast(
      "Add some clothes first."
    );

    return;
  }

  const dress =
    pickByCategory("dress");

  if (
    dress &&
    Math.random() > 0.5
  ) {

    builderItems = [
      dress,
      pickByCategory("outerwear"),
      pickByCategory("shoes"),
      pickByCategory("accessory")
    ].filter(Boolean);

  } else {

    builderItems = [
      pickByCategory("top"),
      pickByCategory("bottom"),
      pickByCategory("outerwear"),
      pickByCategory("shoes"),
      pickByCategory("accessory")
    ].filter(Boolean);
  }

  renderBuilder();

  showToast(
    "Chris has made a random decision ✨"
  );
}


/* ===============================
   CLEAR BUILDER
================================ */

document
  .getElementById("clearBuilder")
  ?.addEventListener(
    "click",
    () => {

      builderItems = [];

      renderBuilder();

      showToast(
        "Outfit cleared."
      );
    }
  );


/* ===============================
   RANDOM BUTTON
================================ */

document
  .getElementById("randomOutfitButton")
  ?.addEventListener(
    "click",
    createRandomOutfit
  );


/* ===============================
   SAVE BUILDER OUTFIT
================================ */

document
  .getElementById("saveBuilder")
  ?.addEventListener(
    "click",
    () => {

      if (!builderItems.length) {
        showToast(
          "Choose some clothes first."
        );

        return;
      }

      savedLooks.unshift({
    id: uid(),

    name: "My Outfit",

    note: builderItems
        .map(item => item.name)
        .join(" + "),

    // Save the ACTUAL generated character wearing the outfit
    image: currentOutfitImage,

    items: builderItems.map(item => ({
        ...item
    })),

    createdAt: new Date().toISOString()
});

      persist(
        STORAGE_KEYS.saved,
        savedLooks
      );

      updateStats();

      showToast(
        "Outfit saved ✨"
      );
    }
  );


/* ===============================
   GENERATED OUTFIT
================================ */

function generateOutfit() {

  if (!wardrobe.length) {
    showToast(
      "Your wardrobe is empty."
    );

    return;
  }

  const occasion =
    document
      .getElementById("occasion")
      ?.value ||
    "casual";

  const style =
    document
      .getElementById("style")
      ?.value ||
    "casual";

  const dress =
    pickByCategory("dress");

  let items;

  if (
    dress &&
    Math.random() > 0.45
  ) {

    items = [
      dress,
      pickByCategory("outerwear"),
      pickByCategory("shoes"),
      pickByCategory("accessory")
    ].filter(Boolean);

  } else {

    items = [
      pickByCategory("top"),
      pickByCategory("bottom"),
      pickByCategory("outerwear"),
      pickByCategory("shoes"),
      pickByCategory("accessory")
    ].filter(Boolean);
  }

  const result =
    document.getElementById(
      "outfitResult"
    );

  if (!result) {
    return;
  }

  result.innerHTML = `
    <div class="generated-look">

      <span class="eyebrow">
        CHRIS AI'S DECISION
      </span>

      <h2>
        OUTFIT:
        ${titleCase(
          style.replace("-", " ")
        )}
      </h2>

      <div class="generated-items">

        ${items.map(item => `
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
        `).join("")}

      </div>

      <div
        class="builder-actions"
        style="margin-top:18px"
      >

        <button
          class="primary-button"
          id="saveGenerated"
          type="button"
        >
          Save this look
        </button>

        <button
          class="secondary-button"
          id="regenerate"
          type="button"
        >
          Try again
        </button>

      </div>

    </div>
  `;

  document
    .getElementById("saveGenerated")
    ?.addEventListener(
      "click",
      () => {

        savedLooks.unshift({
          id: uid(),

          name:
            `${titleCase(
              style.replace("-", " ")
            )} Look`,

          note:
            `Generated for ${occasion}`,

          items:
            items.map(
              item => item.id
            ),

          createdAt:
            new Date().toISOString()
        });

        persist(
          STORAGE_KEYS.saved,
          savedLooks
        );

        updateStats();

        showToast(
          "Saved."
        );
      }
    );

  document
    .getElementById("regenerate")
    ?.addEventListener(
      "click",
      generateOutfit
    );
}

document
  .getElementById("generateOutfit")
  ?.addEventListener(
    "click",
    generateOutfit
  );


/* ===============================
   SAVED OUTFITS
================================ */

function renderSaved() {

  const grid =
    document.getElementById(
      "savedGrid"
    );

  const empty =
    document.getElementById(
      "emptySaved"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML =
    savedLooks.map(look => {

      const items =
        look.items
          .map(id =>
            wardrobe.find(
              item =>
                item.id === id
            )
          )
          .filter(Boolean);

      return `
        <article class="saved-card">

          ${look.image ? `
    <div class="saved-outfit-image">
        <img
            src="${look.image}"
            alt="${escapeHTML(look.name)}"
        >
    </div>
` : `
    <div class="generated-items">
        ${items.map(item => `
            <div class="generated-item">
                <img
                    src="${item.image}"
                    alt="${escapeHTML(item.name)}"
                >
            </div>
        `).join("")}
    </div>
`}

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
              ${escapeHTML(
                look.note || ""
              )}
            </p>

          </div>

        </article>
      `;

    }).join("");

  if (empty) {
    empty.style.display =
      savedLooks.length
        ? "none"
        : "block";
  }
}


/* ===============================
   INSPIRATION
================================ */

function renderInspiration() {

  const grid =
    document.getElementById(
      "inspirationGrid"
    );

  const empty =
    document.getElementById(
      "emptyInspiration"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML =
    inspiration.map(item => `
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
    `).join("");

  if (empty) {
    empty.style.display =
      inspiration.length
        ? "none"
        : "block";
  }
}


/* ===============================
   STATS
================================ */

function updateStats() {

  const count = category =>
    wardrobe.filter(
      item =>
        item.category === category
    ).length;

  const stats = {
    topCount:
      count("top"),

    bottomCount:
      count("bottom"),

    shoeCount:
      count("shoes"),

    savedCount:
      savedLooks.length
  };

  Object.entries(stats).forEach(
    ([id, value]) => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = value;
      }

    }
  );
}


/* ===============================
   START APP
================================ */

updateStats();

renderWardrobe();

renderBuilder();

renderSaved();

renderCharacter();
/* =================================
   AVATAR UPLOAD
================================= */

document.addEventListener("DOMContentLoaded", () => {

  const avatarUpload = document.getElementById("avatarUpload");

  if (!avatarUpload) {
    console.log("avatarUpload input not found");
    return;
  }

  avatarUpload.addEventListener("change", async (event) => {

    const file = event.target.files[0];

    if (!file) return;

    try {

      const image = await fileToDataURL(file);

      avatar = {
        image: image,
        name: "My Avatar"
      };

      persist(
        STORAGE_KEYS.avatar,
        avatar
      );

      console.log("Avatar saved!");

      /* Update the Builder */

if (typeof renderBuilderAvatar === "function") {
  renderBuilderAvatar();
}

if (typeof renderCharacter === "function") {
  renderCharacter();
}

      if (typeof render === "function") {
        render();
      }

      event.target.value = "";

      showToast("Avatar changed! ✨");

    } catch (error) {

      console.error("Avatar upload failed:", error);

      showToast("Could not upload avatar.");

    }

  });

});/* =========================================
   AVATAR SETTINGS
========================================= */

const genderButtons =
  document.querySelectorAll(
    ".gender-button"
  );

const bodySizeInput =
  document.getElementById(
    "bodySize"
  );

const bodySizeLabel =
  document.getElementById(
    "bodySizeLabel"
  );


const bodySizeNames = {
  1: "Very slim",
  2: "Slim",
  3: "Medium",
  4: "Curvy",
  5: "Plus size"
};


/* -----------------------------------------
   SET INITIAL VALUES
----------------------------------------- */

function renderAvatarSettings() {

  genderButtons.forEach(
    button => {

      button.classList.toggle(
        "active",
        button.dataset.gender ===
        avatarSettings.gender
      );

    }
  );


  if (bodySizeInput) {

    bodySizeInput.value =
      avatarSettings.bodySize;

  }


  if (bodySizeLabel) {

    bodySizeLabel.textContent =
      bodySizeNames[
        avatarSettings.bodySize
      ] || "Medium";

  }

}


/* -----------------------------------------
   CHANGE GENDER
----------------------------------------- */

genderButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        avatarSettings.gender =
          button.dataset.gender;

        persist(
          "avatarSettings",
          avatarSettings
        );

        renderAvatarSettings();

        showToast(
          `Avatar set to ${avatarSettings.gender}.`
        );

      }
    );

  }
);


/* -----------------------------------------
   CHANGE BODY SIZE
----------------------------------------- */

if (bodySizeInput) {

  bodySizeInput.addEventListener(
    "input",
    () => {

      avatarSettings.bodySize =
        Number(
          bodySizeInput.value
        );

      if (bodySizeLabel) {

        bodySizeLabel.textContent =
          bodySizeNames[
            avatarSettings.bodySize
          ];

      }

      persist(
        "avatarSettings",
        avatarSettings
      );

    }
  );


  bodySizeInput.addEventListener(
    "change",
    () => {

      if (
        typeof renderCharacter ===
        "function"
      ) {

        renderCharacter();

      }

      showToast(
        "Body size updated ✨"
      );

    }
  );

}


renderAvatarSettings();