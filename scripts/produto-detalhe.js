import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
    authDomain: "cremapratas-e70b9.firebaseapp.com",
    projectId: "cremapratas-e70b9",
    storageBucket: "cremapratas-e70b9.appspot.com",
    messagingSenderId: "601950880055",
    appId: "1:601950880055:web:9660320d933ec2468adab2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Carrega produtos relacionados com base na categoria do produto atual.
 * @param {object} currentProduct - O produto principal que está sendo exibido.
 */
async function loadRelatedProducts(currentProduct) {
    if (!currentProduct || !currentProduct.category) return;
    
    const relatedGrid = document.getElementById('related-products-grid');
    relatedGrid.innerHTML = '<p>Carregando produtos relacionados...</p>';

    const q = query(
        collection(db, 'products'),
        where('category', '==', currentProduct.category),
        where('__name__', '!=', currentProduct.id),
        limit(4)
    );
    
    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            relatedGrid.innerHTML = '';
            return;
        }

        if (window.renderGrid) {
            const relatedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            window.renderGrid('related-products-grid', relatedProducts);
        } else {
            console.error("A função renderGrid não foi encontrada.");
        }

    } catch (error) {
        console.error("Erro ao carregar produtos relacionados:", error);
        relatedGrid.innerHTML = '<p>Não foi possível carregar os produtos relacionados.</p>';
    }
}

/**
 * Carrega os detalhes do produto com base no ID da URL e preenche a página.
 */
async function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        document.getElementById('product-detail-content').innerHTML = "<h1>Produto não encontrado.</h1><p>O link que você seguiu pode estar quebrado ou o produto foi removido.</p>";
        return;
    }

    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const product = { id: docSnap.id, ...docSnap.data() };
        
        document.title = product.name;
        document.getElementById('main-product-image').src = product.image;
        document.getElementById('main-product-image').alt = product.name;
        document.getElementById('breadcrumbs').textContent = `Início / ${product.category} / ${product.name}`;
        document.getElementById('product-name').textContent = product.name;
        document.getElementById('product-price').textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;

        const oldPriceEl = document.getElementById('product-old-price');
        if (product.oldPrice && product.oldPrice > 0) {
            oldPriceEl.textContent = `R$ ${product.oldPrice.toFixed(2).replace('.', ',')}`;
        } else {
            oldPriceEl.style.display = 'none';
        }

        // --- INÍCIO DA LÓGICA DA NOVA DESCRIÇÃO ---
        const descriptionContainer = document.getElementById('product-description');
        
        const captivatingText = product.description || `É só chegar com essa peça linda que todos vão te enxergar diferente!`;

        let technicalDetailsHTML = '<ul>';
        if (product.model) technicalDetailsHTML += `<li><strong>Modelo:</strong> ${product.model}</li>`;
        if (product.material) technicalDetailsHTML += `<li><strong>Teor:</strong> ${product.material}</li>`;
        if (product.weight) technicalDetailsHTML += `<li><strong>Peso Aproximado*:</strong> ${product.weight} gramas</li>`;
        if (product.length) technicalDetailsHTML += `<li><strong>Comprimento total:</strong> ${product.length} cm</li>`;
        technicalDetailsHTML += '</ul>';

        const warningText = `<p class="description-warning">*LEMBRANDO QUE TODOS OS NOSSOS PRODUTOS TÊM E PODE TER VARIAÇÕES NOS PESOS, PORTANTO OS PESOS SÃO APROXIMADOS.</p>`;
        
        descriptionContainer.innerHTML = `
            <div class="captivating-text">
                <p>Essa é a peça que estava faltando para complementar seu traje.</p>
                <p>Você quer causar no rolê?!</p>
                <p>${captivatingText}</p>
                <p>Crema Pratas, a loja que trabalha em cima do seu estilo.</p>
            </div>
            <div class="technical-details">
                ${technicalDetailsHTML}
            </div>
            ${warningText}
        `;
        // --- FIM DA LÓGICA DA NOVA DESCRIÇÃO ---
        
        const addToCartBtn = document.getElementById('add-to-cart-detail-btn');
        if (window.addToCart) {
            addToCartBtn.addEventListener('click', () => window.addToCart(product));
        }
        
        const addToFavoritesBtn = document.getElementById('add-to-favorites-detail-btn');
        if (window.toggleFavorite) {
            addToFavoritesBtn.addEventListener('click', () => window.toggleFavorite(product));
        }
        
        loadRelatedProducts(product);

    } else {
        document.getElementById('product-detail-content').innerHTML = "<h1>Produto não encontrado ou indisponível.</h1>";
    }
}

document.addEventListener('DOMContentLoaded', loadProductDetails);
