import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
  authDomain: "cremapratas-e70b9.firebaseapp.com",
  projectId: "cremapratas-e70b9",
  storageBucket: "cremapratas-e70b9.appspot.com",
  messagingSenderId: "601950880055",
  appId: "1:601950880055:web:9660320d933ec2468adab2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const searchInput = document.getElementById("search-input");
const categorySelect = document.getElementById("filter-category");
const mmInput = document.getElementById("filter-mm");
const cmInput = document.getElementById("filter-cm");
const productsList = document.getElementById("products-list");

let allProducts = [];

async function fetchProducts() {
    const snapshot = await getDocs(collection(db, "products"));
    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts();
}

function renderProducts() {
    const term = searchInput.value.toLowerCase();
    const category = categorySelect.value;
    const mm = mmInput.value;
    const cm = cmInput.value;

    const filtered = allProducts.filter(prod => {
        const nameMatch = prod.name?.toLowerCase().includes(term);
        const categoryMatch = !category || prod.category === category;
        const mmMatch = !mm || (prod.mm && prod.mm.toString() === mm);
        const cmMatch = !cm || (prod.cm && prod.cm.toString() === cm);
        return nameMatch && categoryMatch && mmMatch && cmMatch;
    });

    productsList.innerHTML = '';

    if (filtered.length === 0) {
        productsList.innerHTML = "<p>Nenhum produto encontrado.</p>";
        return;
    }

    for (const prod of filtered) {
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

searchInput.addEventListener("input", renderProducts);
categorySelect.addEventListener("change", renderProducts);
mmInput.addEventListener("input", renderProducts);
cmInput.addEventListener("input", renderProducts);

fetchProducts();
