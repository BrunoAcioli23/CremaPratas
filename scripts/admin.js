import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
    authDomain: "cremapratas-e70b9.firebaseapp.com",
    projectId: "cremapratas-e70b9",
    storageBucket: "cremapratas-e70b9.firebasestorage.app",
    messagingSenderId: "601950880055",
    appId: "1:601950880055:web:9660320d933ec2468adab2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- VARIÁVEIS GLOBAIS ---
let editingProductId = null;
let salesChartInstance = null; // Para guardar a instância do gráfico de vendas
let categoryChartInstance = null; // Para guardar a instância do gráfico de categorias

// --- ELEMENTOS DO DOM ---
const loginSection = document.getElementById('login-section');
const adminPanel = document.getElementById('admin-panel');
const productForm = document.getElementById('product-form');
const logoutBtn = document.getElementById('logout-btn');
const submitBtn = document.getElementById('submit-btn');
const productsTableBody = document.getElementById('products-table-body');
const messageArea = document.getElementById('message-area');

// --- FUNÇÕES ---

function showMessage(msg, type) {
    if (!messageArea) return;
    messageArea.textContent = msg;
    messageArea.className = type;
    messageArea.classList.remove('hidden');
    setTimeout(() => messageArea.classList.add('hidden'), 4000);
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(section => {
        if(section) section.classList.add('hidden');
    });
    const activeTab = document.getElementById(tab);
    if (activeTab) activeTab.classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
}

async function loadDashboard() {
    try {
        const productsSnapshot = await getDocs(collection(db, "products"));
        const products = productsSnapshot.docs.map(doc => doc.data());

        // Cálculos do Dashboard
        if(document.getElementById("total-products")) document.getElementById("total-products").textContent = products.length;
        if(document.getElementById("total-outofstock")) document.getElementById("total-outofstock").textContent = products.filter(p => (p.stock || 0) === 0).length;
        
        const totalStockValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || 0)), 0);
        if(document.getElementById("total-stock-value")) document.getElementById("total-stock-value").textContent = `R$ ${totalStockValue.toFixed(2).replace('.', ',')}`;

        // CORREÇÃO: Gráficos (destruir antes de recriar)
        if (salesChartInstance) salesChartInstance.destroy();
        if (categoryChartInstance) categoryChartInstance.destroy();

        // Gráfico de Vendas (exemplo simples)
        const salesCtx = document.getElementById('sales-chart')?.getContext('2d');
        if (salesCtx) {
            salesChartInstance = new Chart(salesCtx, {
                type: 'line',
                data: { labels: ['Jan', 'Fev', 'Mar'], datasets: [{ label: 'Vendas', data: [12, 19, 3], borderColor: '#f28e2c' }] },
            });
        }

        // Gráfico de Categorias
        const categoryCounts = products.reduce((acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
        }, {});
        const categoryCtx = document.getElementById('category-chart')?.getContext('2d');
        if (categoryCtx) {
            categoryChartInstance = new Chart(categoryCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(categoryCounts),
                    datasets: [{ data: Object.values(categoryCounts), backgroundColor: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'] }]
                }
            });
        }

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        showMessage('Erro ao carregar resumo do painel.', 'error');
    }
}

async function loadProducts() {
    if (!productsTableBody) return;
    productsTableBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    try {
        const snapshot = await getDocs(collection(db, "products"));
        productsTableBody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const id = docSnap.id;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${product.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td>${product.name}</td>
                <td>R$ ${product.price.toFixed(2).replace('.', ',')}</td>
                <td>${product.stock || 0}</td>
                <td>
                    <button class="btn btn-primary edit-btn" data-id="${id}">Editar</button>
                    <button class="btn btn-danger delete-btn" data-id="${id}">Excluir</button>
                </td>
            `;
            productsTableBody.appendChild(row);
        });
    } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        productsTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar produtos.</td></tr>';
    }
}

async function editProduct(productId) {
    try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
            return showMessage("Produto não encontrado.", "error");
        }
        const data = productSnap.data();
        editingProductId = productId;

        document.getElementById("product-name").value = data.name || "";
        document.getElementById("product-cost").value = data.cost || 0;
        document.getElementById("product-price").value = data.price || 0;
        document.getElementById("product-old-price").value = data.oldPrice || 0;
        document.getElementById("product-stock").value = data.stock || 0;
        document.getElementById("product-category").value = data.category || "";
        document.getElementById("product-is-selected").checked = data.isSelected || false;
        
        document.querySelectorAll('input[name="terms"]').forEach(input => {
            input.checked = data.terms?.includes(input.value) || false;
        });
        
        if (data.gender) {
            document.querySelector(`input[name="gender"][value="${data.gender}"]`).checked = true;
        } else {
            document.querySelector(`input[name="gender"][value="unissex"]`).checked = true;
        }

        showTab('admin-panel');
        submitBtn.textContent = "Salvar Alterações";
        document.getElementById("product-image").required = false;

    } catch (err) {
        console.error("Erro ao carregar produto para edição:", err);
        showMessage("Erro ao carregar produto.", "error");
    }
}

async function deleteProduct(productId) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
        await deleteDoc(doc(db, "products", productId));
        showMessage("Produto excluído com sucesso.", "success");
        loadProducts();
    } catch (error) {
        console.error("Erro ao excluir produto:", error);
        showMessage("Erro ao excluir produto.", "error");
    }
}

// --- EVENT LISTENERS ---

if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        try {
            const imageFile = document.getElementById('product-image').files[0];
            let imageUrl;

            const productData = {
                name: document.getElementById('product-name').value,
                cost: parseFloat(document.getElementById("product-cost").value),
                price: parseFloat(document.getElementById('product-price').value),
                oldPrice: parseFloat(document.getElementById('product-old-price').value) || 0,
                stock: parseInt(document.getElementById('product-stock').value),
                category: document.getElementById('product-category').value,
                isSelected: document.getElementById('product-is-selected').checked,
                terms: Array.from(document.querySelectorAll('input[name="terms"]:checked')).map(el => el.value),
                gender: document.querySelector('input[name="gender"]:checked').value,
            };

            if (editingProductId) {
                const productRef = doc(db, "products", editingProductId);
                const productSnap = await getDoc(productRef);
                imageUrl = productSnap.data().image;
            }

            if (imageFile) {
                const storageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            if (!imageUrl && !editingProductId) {
                throw new Error("A imagem do produto é obrigatória ao criar um novo produto.");
            }
            
            if (imageUrl) {
                productData.image = imageUrl;
            }

            if (editingProductId) {
                productData.updatedAt = serverTimestamp();
                const productRef = doc(db, "products", editingProductId);
                await updateDoc(productRef, productData);
                showMessage("Produto atualizado com sucesso!", "success");
            } else {
                productData.createdAt = serverTimestamp();
                await addDoc(collection(db, "products"), productData);
                showMessage("Produto cadastrado com sucesso!", "success");
            }

            productForm.reset();
            document.querySelector('input[name="gender"][value="unissex"]').checked = true;
            editingProductId = null;
            loadProducts();
            showTab('products-panel');

        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            showMessage(`Erro: ${error.message}`, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Cadastrar Produto";
        }
    });
}

document.addEventListener('click', (e) => {
    if (e.target.matches('.edit-btn')) editProduct(e.target.dataset.id);
    if (e.target.matches('.delete-btn')) deleteProduct(e.target.dataset.id);
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            showMessage(`Erro no login: ${error.message}`, 'error');
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}

// --- INICIALIZAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
            if(loginSection) loginSection.classList.add('hidden');
            if(document.getElementById('admin-tabs')) document.getElementById('admin-tabs').classList.remove('hidden');
            
            showTab('dashboard');
            loadProducts();
            loadDashboard();
        } else {
            showMessage('Acesso negado. Você não é um administrador.', 'error');
            signOut(auth);
        }
    } else {
        if(loginSection) loginSection.classList.remove('hidden');
        if(document.getElementById('admin-tabs')) document.getElementById('admin-tabs').classList.add('hidden');
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    }
});
