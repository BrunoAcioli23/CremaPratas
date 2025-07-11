// Importar todas as funções necessárias do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getFirestore, collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
    authDomain: "cremapratas-e70b9.firebaseapp.com",
    projectId: "cremapratas-e70b9",
    storageBucket: "cremapratas-e70b9.appspot.com",
    messagingSenderId: "601950880055",
    appId: "1:601950880055:web:9660320d933ec2468adab2",
    measurementId: "G-V31HKENBBY"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let currentUser = null;
const auth = getAuth();


import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Variáveis globais
let cart = [];
let favorites = [];
let allProducts = [];
let allLaunches = [];
let allSelected = [];

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await carregarCarrinhoEFavoritos();
  }
});

// Elementos do DOM
const cartBtn = document.getElementById('cart-btn');
const favoritesBtn = document.getElementById('favorites-btn');
const cartModal = document.getElementById('cart-modal');
const favoritesModal = document.getElementById('favorites-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');
const whatsappNumber = '5511942138664';

// Inicialização do Swiper de Banners
const bannerSwiper = new Swiper(".mySwiper", {
    pagination: { el: ".swiper-pagination", dynamicBullets: true },
    loop: true,
    autoplay: { delay: 3000, disableOnInteraction: false },
});

// --- FUNÇÕES PRINCIPAIS ---

// Função genérica e otimizada para buscar dados no Firestore
async function fetchData(collectionName, options = {}) {
    try {
        const { sortBy, sortDirection = 'desc', limitNumber, filterField, filterValue } = options;
        let q = collection(db, collectionName);
        
        if (filterField && filterValue!== undefined) {
            q = query(q, where(filterField, "==", filterValue));
        }
        if (sortBy) {
            q = query(q, orderBy(sortBy, sortDirection));
        }
        if (limitNumber) {
            q = query(q, limit(limitNumber));
        }

        const dataSnapshot = await getDocs(q);
        return dataSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error(`Erro ao buscar dados da coleção ${collectionName}: `, error);
        if (error.code === 'failed-precondition') {
            console.error("ERRO IMPORTANTE: Esta consulta requer um índice no Firestore. O Firebase geralmente fornece um link no erro para criá-lo com um clique. Verifique o console do navegador.");
        }
        return;
    }
}

// Função para criar o HTML de um card de produto (agora com tags de promoção)
function createProductCardHTML(product) {
    const isFavorite = favorites.some(fav => fav.id === product.id);
    let tagsHTML = '';
    if (product.stock === 0) {
        tagsHTML += `<span class="tag" style="background-color:#f44336;color:white;">ESGOTADO</span>`;
    }
    if (product.discountPercentage) {
        tagsHTML += `<span class="tag">${product.discountPercentage}% OFF</span>`;
    }
    if (product.hasFreeShipping) {
        tagsHTML += `<span class="tag">FRETE GRÁTIS</span>`;
    }

    return `
        <div class="product-card">
            <div class="product-image-wrapper">
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.onerror=null;this.src='https://placehold.co/400x400/1a1a1a/ffffff?text=Imagem+Inválida';">
                <div class="promo-tags">${tagsHTML}</div>
                <button class="favorite-btn" data-product-id="${product.id}"><i class="fa-${isFavorite? 'solid' : 'regular'} fa-heart"></i></button>
            </div>
            <div class="product-info">
<h3>${product.name || 'Nome indisponível'}</h3>
                <div class="product-pricing">
                    <span class="old-price">R$ ${(product.oldPrice || 0).toFixed(2).replace('.', ',')}</span>
                    <span class="current-price">R$ ${(product.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                ${product.stock > 0 
                ? `<button class="add-to-cart-btn">COMPRAR</button>` 
                : `<button class="add-to-cart-btn" disabled style="background-color:#555; cursor:not-allowed; opacity:0.6;">ESGOTADO</button>`}
            </div>
        </div>`;
}

// Função para renderizar produtos em um carrossel (Swiper)
function renderCarousel(containerId, productsData, swiperConfig) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!productsData || productsData.length === 0) {
        container.innerHTML = `<p style="color: white; text-align: center; width: 100%;">Nenhum item encontrado.</p>`;
        return;
    }

    productsData.forEach(product => {
        const swiperSlide = document.createElement('div');
        swiperSlide.className = 'swiper-slide';
        swiperSlide.innerHTML = createProductCardHTML(product);
        
        swiperSlide.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(product));
        swiperSlide.querySelector('.favorite-btn').addEventListener('click', () => toggleFavorite(product));
        container.appendChild(swiperSlide);
    });
    
    new Swiper(swiperConfig.container, swiperConfig.options);
}

// Nova função para renderizar produtos em uma grade (Grid)
function renderGrid(containerId, productsData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!productsData || productsData.length === 0) {
        container.innerHTML = `<p style="color: white; text-align: center; width: 100%;">Nenhum item selecionado encontrado.</p>`;
        return;
    }

    productsData.forEach(product => {
        const gridItem = document.createElement('div');
        gridItem.innerHTML = createProductCardHTML(product);

        gridItem.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(product));
        gridItem.querySelector('.favorite-btn').addEventListener('click', () => toggleFavorite(product));
        container.appendChild(gridItem);
    });
}


// --- FUNÇÕES AUXILIARES (Carrinho, Favoritos, etc.) ---

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    cartItemsContainer.innerHTML = cart.length === 0? '<p>Seu carrinho está vazio.</p>' : '';
    if (cart.length > 0) {
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `<div class="item-details"><img src="${item.image}" alt="${item.name}"><div class="item-info"><h4>${item.name}</h4><p>R$ ${item.price.toFixed(2).replace('.', ',')}</p></div></div><div class="item-actions"><div class="quantity-control"><button class="quantity-change" data-product-id="${item.id}" data-change="-1">-</button><span>${item.quantity}</span><button class="quantity-change" data-product-id="${item.id}" data-change="1">+</button></div><button class="remove-btn remove-from-cart-btn" data-product-id="${item.id}"><i class="fa-solid fa-trash"></i></button></div>`;
            cartItemsContainer.appendChild(cartItem);
        });
    }
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.classList.toggle('hidden', totalItems === 0);
    document.querySelectorAll('.remove-from-cart-btn').forEach(btn => btn.addEventListener('click', (e) => removeFromCart(e.currentTarget.dataset.productId)));
    document.querySelectorAll('.quantity-change').forEach(btn => btn.addEventListener('click', (e) => updateQuantity(e.currentTarget.dataset.productId, parseInt(e.currentTarget.dataset.change))));
}

function renderFavorites() {
    const favoriteItemsContainer = document.getElementById('favorite-items');
    const favoritesCount = document.getElementById('favorites-count');
    favoriteItemsContainer.innerHTML = favorites.length === 0? '<p>Você ainda não favoritou nenhum item.</p>' : '';
    if (favorites.length > 0) {
        favorites.forEach(item => {
            const favoriteItem = document.createElement('div');
            favoriteItem.className = 'favorite-item';
            favoriteItem.innerHTML = `<div class="item-details"><img src="${item.image}" alt="${item.name}"><div class="item-info"><h4>${item.name}</h4><p>R$ ${item.price.toFixed(2).replace('.', ',')}</p></div></div><div class="item-actions"><button class="add-fav-to-cart-btn" data-product-id="${item.id}"><i class="fa-solid fa-cart-plus"></i></button><button class="remove-btn remove-from-favorites-btn" data-product-id="${item.id}"><i class="fa-solid fa-trash"></i></button></div>`;
            favoriteItemsContainer.appendChild(favoriteItem);
        });
    }
    favoritesCount.textContent = favorites.length;
    favoritesCount.classList.toggle('hidden', favorites.length === 0);
    document.querySelectorAll('.remove-from-favorites-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const product = favorites.find(p => p.id === e.currentTarget.dataset.productId);
        toggleFavorite(product);
    }));
    document.querySelectorAll('.add-fav-to-cart-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const product = favorites.find(p => p.id === e.currentTarget.dataset.productId);
        addToCart(product);
        toggleModal(favoritesModal, false);
        toggleModal(cartModal, true);
    }));
}

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

async function carregarCarrinhoEFavoritos() {
  if (!currentUser) return;

  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    cart = userData.cart || [];
    favorites = userData.favorites || [];

    renderCart();
    renderFavorites();
  } catch (err) {
    console.error("Erro ao carregar dados do usuário:", err);
  }
}

async function salvarDadosDoUsuario() {
  if (!currentUser) return;

  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, {
      cart,
      favorites
    }, { merge: true });
  } catch (err) {
    console.error("Erro ao salvar dados do usuário:", err);
  }
}


function addToCart(product) {
  const existingItem = cart.find(item => item.id === product.id);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  renderCart();
  salvarDadosDoUsuario();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  renderCart();
  salvarDadosDoUsuario();
}

function updateQuantity(productId, change) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      renderCart();
    }
    salvarDadosDoUsuario();
  }
}

function toggleFavorite(product) {
    const existingIndex = favorites.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.push(product);
    }

    // 1. Recria os carrosséis para atualizar os ícones de coração na página
    const productSwiperConfig = { container: '.product-swiper', options: { slidesPerView: 1, spaceBetween: 30, navigation: { nextEl: ".product-swiper .swiper-button-next", prevEl: ".product-swiper .swiper-button-prev" }, breakpoints: { 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } } } };
    const releasesSwiperConfig = { container: '.releases-swiper', options: { slidesPerView: 1, spaceBetween: 30, navigation: { nextEl: ".releases-swiper .swiper-button-next", prevEl: ".releases-swiper .swiper-button-prev" }, breakpoints: { 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } } } };
    
    if (document.getElementById('product-list')) {
        renderCarousel('product-list', allProducts, productSwiperConfig);
    }
    if (document.getElementById('releases-list')) {
        renderCarousel('releases-list', allLaunches, releasesSwiperConfig);
    }
    if (document.getElementById('selected-products-grid')) {
        renderGrid('selected-products-grid', allSelected);
    }

    // 2. Garante que o modal de favoritos seja sempre atualizado
    renderFavorites();

    // 3. Salva os dados no Firestore
    salvarDadosDoUsuario();
}

function toggleModal(modalElement, show) {
  if (!modalElement) return;
  if (show) {
    modalElement.classList.add('visible');
  } else {
    modalElement.classList.remove('visible');
  }
}

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  const cartBtn = document.getElementById('cart-btn');
  const cartModal = document.getElementById('cart-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');

  const favoritesBtn = document.getElementById('favorites-btn');
  const favoritesModal = document.getElementById('favorites-modal');
  const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');

  if (cartBtn && cartModal && closeModalBtn) {
    cartBtn.addEventListener('click', () => {
      renderCart();
      toggleModal(cartModal, true);
    });

    closeModalBtn.addEventListener('click', () => toggleModal(cartModal, false));
    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) toggleModal(cartModal, false);
    });
  }

  if (favoritesBtn && favoritesModal && closeFavoritesModalBtn) {
    favoritesBtn.addEventListener('click', () => {
      renderFavorites();
      toggleModal(favoritesModal, true);
    });

    closeFavoritesModalBtn.addEventListener('click', () => toggleModal(favoritesModal, false));
    favoritesModal.addEventListener('click', (e) => {
      if (e.target === favoritesModal) toggleModal(favoritesModal, false);
    });
  }
});

closeFavoritesModalBtn.addEventListener('click', () => toggleModal(favoritesModal, false));
cartModal.addEventListener('click', (e) => { if (e.target === cartModal) toggleModal(cartModal, false); });

document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (cart.length === 0) {
        console.log('Carrinho vazio!');
        return;
    }

    let message = 'Olá! Gostaria de fazer um pedido com os seguintes itens:\n\n';
    let total = 0;

    const orderItems = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        message += `*${item.name}* (${item.quantity}x) - R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
        return {
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
        };
    });


    message += `\n*Total do Pedido: R$ ${total.toFixed(2).replace('.', ',')}*`;

    // 📥 Salvar pedido no Firestore
    try {
        // Objeto que será salvo no banco de dados
        await addDoc(collection(db, 'orders'), {
            userId: currentUser.uid, // <<-- ADICIONE ESTA LINHA
            items: orderItems,
            total,
            status: 'aberto',
            createdAt: serverTimestamp()
        });
        console.log('Pedido salvo no Firestore com ID do usuário');
    } catch (error) {
        console.error('Erro ao salvar pedido:', error);
    }

    // Enviar para o WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    // Limpar o carrinho local
    cart = [];
    renderCart();
});


// --- INICIALIZAÇÃO DO SITE ---
async function init() {
    // Configurações dos carrosséis
    const productSwiperConfig = { container: '.product-swiper', options: { slidesPerView: 1, spaceBetween: 30, navigation: { nextEl: ".product-swiper.swiper-button-next", prevEl: ".product-swiper.swiper-button-prev" }, breakpoints: { 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } } } };
    const releasesSwiperConfig = { container: '.releases-swiper', options: { slidesPerView: 1, spaceBetween: 30, navigation: { nextEl: ".releases-swiper.swiper-button-next", prevEl: ".releases-swiper.swiper-button-prev" }, breakpoints: { 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } } } };

    // Busca todos os dados em paralelo para otimizar o carregamento
    const [productsData, launchesData, selectedData] = await Promise.all([
    fetchData('products', { sortBy: 'sold', sortDirection: 'desc', limitNumber: 10 }),
    fetchData('products', { sortBy: 'createdAt', sortDirection: 'desc', limitNumber: 10 }),
    fetchData('products', { filterField: 'isSelected', filterValue: true })
    ]);

    allProducts = productsData;
    allLaunches = launchesData;
    allSelected = selectedData;

    // Renderiza cada seção com seus respectivos dados
    renderCarousel('product-list', allProducts, productSwiperConfig);
    renderCarousel('releases-list', allLaunches, releasesSwiperConfig);
    renderGrid('selected-products-grid', allSelected);
}

// Inicia o site
document.addEventListener('DOMContentLoaded', init);

  // ADICIONE ESTE NOVO BLOCO NO LUGAR DO ANTIGO

// Lógica para o menu Hambúrguer (Mobile)
const hamburgerBtn = document.getElementById('hamburger-btn');
const mainNav = document.getElementById('main-nav');

hamburgerBtn.addEventListener('click', () => {
    mainNav.classList.toggle('active');
});

// Lógica para AMBOS os submenus de Categoria (Desktop e Mobile)
const allCategoryBtns = document.querySelectorAll(".categories-btn");
const allSubmenus = document.querySelectorAll('.submenu');

allCategoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Impede que o clique se propague para o 'window'

        // Encontra o submenu específico deste botão
        const targetSubmenu = btn.nextElementSibling;

        // Fecha outros submenus que possam estar abertos
        allSubmenus.forEach(submenu => {
            if (submenu !== targetSubmenu) {
                submenu.classList.remove('active');
            }
        });

        // Abre ou fecha o submenu clicado
        if (targetSubmenu && targetSubmenu.classList.contains('submenu')) {
            targetSubmenu.classList.toggle('active');
        }
    });
});

// Fecha os submenus se o usuário clicar fora deles
window.addEventListener('click', (e) => {
    // Verifica se o clique não foi dentro de um .submenu-container
    if (!e.target.closest('.submenu-container')) {
        allSubmenus.forEach(submenu => {
            submenu.classList.remove('active');
        });
    }
});

        // Lógica de envio do formulário de cadastro de produtos
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(productForm);
            const productData = {
                name: formData.get('name'),
                price: parseFloat(formData.get('price')),
                oldPrice: parseFloat(formData.get('oldPrice')),
                image: formData.get('image'),
                terms: formData.getAll('terms'),
                timestamp: serverTimestamp()
            };

            try {
                await addDoc(collection(db, 'products'), productData);
                showMessage('Produto cadastrado com sucesso!', 'success');
                productForm.reset();
            } catch (error) {
                showMessage('Erro ao cadastrar produto: ' + error.message, 'error');
            }
        });
        }

        // Página de produtos.html
if (window.location.pathname.includes("produtos.html")) {
  document.addEventListener("DOMContentLoaded", async () => {
    const produtosGrid = document.getElementById("produtos-grid");
    const searchInput = document.getElementById("global-search") || document.getElementById("search-input") || document.getElementById("search-input-header");
    const params = new URLSearchParams(window.location.search);
    
    const filtros = { categorias: [], mm: [], cm: [], busca: "" };

    // CAPTURAR BUSCA DA URL
    const categoriaUrl = params.get("category");
    const buscaUrl = params.get("busca");

    if (categoriaUrl) filtros.categorias = [categoriaUrl];
    if (buscaUrl) {
      filtros.busca = decodeURIComponent(buscaUrl).toLowerCase();
      if (searchInput) searchInput.value = filtros.busca;
    }

    let produtos = [];

    try {
      const snapshot = await getDocs(collection(db, "products"));
      produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      produtosGrid.innerHTML = `<p style="color:white;">Erro ao carregar produtos.</p>`;
      return;
    }

    const aplicarFiltros = () => {
      let filtrados = [...produtos];

      // Filtro de Categoria (continua igual)
      if (filtros.categorias.length > 0) {
        filtrados = filtrados.filter(p => filtros.categorias.includes(p.category));
      }

      // --- LÓGICA CORRIGIDA ABAIXO ---

      // Filtro de Espessura (mm) - Buscando no nome do produto
      if (filtros.mm.length > 0) {
        filtrados = filtrados.filter(p => 
          filtros.mm.some(val => p.name.toLowerCase().includes(val.toLowerCase()))
        );
      }

      // Filtro de Comprimento (cm) - Buscando no nome do produto
      if (filtros.cm.length > 0) {
        filtrados = filtrados.filter(p => 
          filtros.cm.some(val => p.name.toLowerCase().includes(val.toLowerCase()))
        );
      }
      
      // --- FIM DA LÓGICA CORRIGIDA ---

      // Filtro de Busca (continua igual)
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase();
        filtrados = filtrados.filter(p => p.name?.toLowerCase().includes(termo));
      }

      renderGrid("produtos-grid", filtrados);
    };

    aplicarFiltros(); 

    // Event Listeners dos Filtros (o resto do código continua igual)
    document.querySelectorAll(".filtro-categoria").forEach(input => {
      input.addEventListener("change", () => {
        const categoriasSelecionadas = Array.from(document.querySelectorAll(".filtro-categoria:checked")).map(i => i.value);
        // Atualiza a URL sem recarregar a página
        const url = new URL(window.location);
        if (categoriasSelecionadas.length > 0) {
            url.searchParams.set('category', categoriasSelecionadas.join(','));
        } else {
            url.searchParams.delete('category');
        }
        history.pushState({}, '', url);

        filtros.categorias = categoriasSelecionadas;
        aplicarFiltros();
      });
      // Marca os checkboxes com base na URL inicial
      if (filtros.categorias.includes(input.value)) {
        input.checked = true;
      }
    });

    document.querySelectorAll(".filtro-mm").forEach(input => {
      input.addEventListener("change", () => {
        filtros.mm = Array.from(document.querySelectorAll(".filtro-mm:checked")).map(i => i.value);
        aplicarFiltros();
      });
    });

    document.querySelectorAll(".filtro-cm").forEach(input => {
      input.addEventListener("change", () => {
        filtros.cm = Array.from(document.querySelectorAll(".filtro-cm:checked")).map(i => i.value);
        aplicarFiltros();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", e => {
        filtros.busca = e.target.value.toLowerCase();
        aplicarFiltros();
      });
    }
  });
}

const searchForm = document.getElementById("search-form");

if (searchForm && searchInput) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const termo = searchInput.value.trim();
    if (termo) {
      const encoded = encodeURIComponent(termo);
      window.location.href = `produtos.html?busca=${encoded}`;
    }
  });
}
