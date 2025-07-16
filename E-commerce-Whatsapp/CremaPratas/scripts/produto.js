import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
  authDomain: "cremapratas-e70b9.firebaseapp.com",
  projectId: "cremapratas-e70b9",
  storageBucket: "cremapratas-e70b9.appspot.com",
  messagingSenderId: "601950880055",
  appId: "1:601950880055:web:9660320d933ec2468adab2"
};

// Verifica se o Firebase já foi inicializado
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Elementos DOM
const searchInput = document.getElementById("search-input");
const categorySelect = document.getElementById("filter-category");
const mmInput = document.getElementById("filter-mm");
const cmInput = document.getElementById("filter-cm");
const productsList = document.getElementById("products-list");

let allProducts = [];

// Captura busca e categoria da URL
const params = new URLSearchParams(window.location.search);
const buscaURL = params.get("busca");
const categoriaURL = params.get("category");

if (buscaURL) {
  searchInput.value = decodeURIComponent(buscaURL);
}
if (categoriaURL) {
  categorySelect.value = categoriaURL;
}

// Função principal
async function fetchProducts() {
  const snapshot = await getDocs(collection(db, "products"));
  allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderProducts();
}

// Filtro e renderização
function renderProducts() {
  const termo = searchInput?.value?.trim().toLowerCase() || "";
  const categoria = categorySelect?.value?.trim().toLowerCase() || "";
  const filtroMM = mmInput?.value?.trim() || "";
  const filtroCM = cmInput?.value?.trim() || "";

  const filtrados = allProducts.filter(prod => {
    const nome = prod.name?.toLowerCase() || "";

    const nameMatch = nome.includes(termo);
    const categoryMatch = !categoria || (prod.category?.toLowerCase() === categoria);

    const mmMatch = !filtroMM || nome.includes(`${filtroMM}mm`);
    const cmMatch = !filtroCM || nome.includes(`${filtroCM}cm`);

    return nameMatch && categoryMatch && mmMatch && cmMatch;
  });

  productsList.innerHTML = '';

  if (filtrados.length === 0) {
    productsList.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  for (const prod of filtrados) {
    const card = document.createElement("div");
    card.style.background = "#222";
    card.style.padding = "1rem";
    card.style.borderRadius = "8px";
    card.innerHTML = `
      <img src="${prod.image}" style="width:100%; height:150px; object-fit:cover; border-radius: 6px;" />
      <h4>${prod.name}</h4>
      <p>R$ ${prod.price?.toFixed(2).replace('.', ',')}</p>
    `;
    productsList.appendChild(card);
  }
}

// Verifica se os elementos DOM existem antes de adicionar eventos
if (searchInput) {
  searchInput.addEventListener("input", renderProducts);
}
if (categorySelect) {
  categorySelect.addEventListener("change", renderProducts);
}
if (mmInput) {
  mmInput.addEventListener("input", renderProducts);
}
if (cmInput) {
  cmInput.addEventListener("input", renderProducts);
}

// Inicializar
fetchProducts();
